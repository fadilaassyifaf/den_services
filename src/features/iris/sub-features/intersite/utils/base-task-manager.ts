/**
 * Path: src/core/managers/base-task-manager.ts
 */

import { useTaskStore } from '@/core/store/task-store';
import type {
  TaskSubmitResult,
  TaskSubmitResponse,
  TaskStatusResponse,
  NormalizedTaskStatus,
  HistoryDBPayload,
  LogEntry,
  TaskStatusState,
} from '@/core/types/task.types';
import { CELERY_STATUS_MAP } from '@/core/types/task.types';

// ── Helper ────────────────────────────────────────────────────────────────────

function extractErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    if (typeof e.message === 'string') return e.message;
    if (typeof e.detail  === 'string') return e.detail;
    if (typeof e.error   === 'string') return e.error;
    if (Array.isArray(e.detail)) {
      return (e.detail as Array<{ msg?: string }>)
        .map((d) => d.msg ?? String(d)).join(', ');
    }
    try { return JSON.stringify(error); } catch { return fallback; }
  }
  return fallback;
}

// ── Type untuk response FastAPI yang actual ───────────────────────────────────

interface CeleryProgressObject {
  current: number;
  total:   number;
  percent: number;
}

interface CeleryInfoObject {
  state?:    string;
  status?:   string;    // pesan teks progress dari FastAPI
  message?:  string;
  ts?:       number;
  // Pola A: progress sebagai object { current, total, percent }
  progress?: CeleryProgressObject | number;
  // Pola B: current + total di root info
  current?:  number;
  total?:    number;
}

// ── Abstract Base ─────────────────────────────────────────────────────────────

export abstract class BaseTaskManager {
  protected abstract readonly taskName:        string;
  protected abstract readonly apiPath:         string;
  protected abstract readonly defaultFilename: string;

  protected readonly API_BASE_URL    = '/api/iris';
  protected readonly POLL_INTERVAL   = 3000;
  protected readonly MAX_POLL_ERRORS = 5;

  private currentTaskId:   string | null                        = null;
  private pollTimeout:     ReturnType<typeof setTimeout> | null = null;
  private abortController: AbortController | null               = null;
  private pollErrorCount                                        = 0;
  private isPolling                                             = false;

  protected userNik:  string = '';
  protected fileName: string = '';

  // ─── SUBMIT ──────────────────────────────────────────────────────────────

  async submitTask(
    formData: FormData,
    userNik:  string,
    fileName: string,
  ): Promise<TaskSubmitResult> {
    this.userNik  = userNik;
    this.fileName = fileName;

    try {
      this.cancelPolling();
      this.pollErrorCount  = 0;
      this.abortController = new AbortController();

      const url = `${window.location.origin}${this.apiPath}`;
      console.log(`[${this.taskName}] Submitting to:`, url);

      const response = await fetch(url, {
        method:      'POST',
        body:        formData,
        credentials: 'include',
        signal:      this.abortController.signal,
      });

      const rawBody = await response.text().catch(() => {
        throw new Error('Failed to read response body');
      });

      if (!response.ok) {
        let msg = `HTTP ${response.status}: ${response.statusText}`;
        if (rawBody) {
          try { msg = extractErrorMessage(JSON.parse(rawBody), msg); }
          catch { msg = rawBody || msg; }
        }
        throw new Error(msg);
      }

      let data: TaskSubmitResponse;
      try { data = JSON.parse(rawBody); }
      catch { throw new Error('Invalid JSON response dari server'); }

      // support celery_task_id atau task_id
      const taskId = (data as Record<string, unknown>).celery_task_id as string
        || data.task_id;
      if (!taskId) throw new Error('Tidak ada task_id dari server.');

      this.currentTaskId = taskId;
      console.log(`[${this.taskName}] Task submitted:`, taskId);

      await this.saveToHistory({
        user_nik:  this.userNik,
        task_name: this.taskName,
        filename:  this.fileName,
        status:    'processing',
        progress:  0,
        file_url:  null,
      });

      this.startPolling();

      return { success: true, task_id: taskId, message: 'Task berhasil dikirim' };

    } catch (error: unknown) {
      this.cancelPolling();

      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Request dibatalkan' };
      }

      const msg = extractErrorMessage(error, 'Gagal submit task');
      console.error(`[${this.taskName}] Submit error:`, msg);
      return { success: false, error: msg };
    }
  }

  // ─── POLLING ─────────────────────────────────────────────────────────────

  private startPolling(): void {
    if (!this.currentTaskId) return;
    console.log(`[${this.taskName}] Start polling:`, this.currentTaskId);
    this.scheduleNextPoll(0);
  }

  private scheduleNextPoll(delay = this.POLL_INTERVAL): void {
    if (!this.currentTaskId) return;
    this.pollTimeout = setTimeout(() => void this.pollTaskStatus(), delay);
  }

  private async pollTaskStatus(): Promise<void> {
    if (this.isPolling || !this.currentTaskId) return;

    this.isPolling = true;
    const taskId   = this.currentTaskId;

    try {
      const url = `${window.location.origin}${this.API_BASE_URL}/tasks/status/${taskId}`;
      console.log(`[${this.taskName}] Polling:`, url);

      const response = await fetch(url, {
        method:      'GET',
        credentials: 'include',
        headers:     { Accept: 'application/json, application/zip' },
      });

      const contentType = response.headers.get('Content-Type') || '';

      // SUCCESS = backend return ZIP langsung
      if (contentType.includes('application/zip')) {
        await this.handleZipResponse(response, taskId);
        return;
      }

      const rawBody = await response.text();

      if (!response.ok) {
        let msg = `HTTP ${response.status}`;
        try { msg = extractErrorMessage(JSON.parse(rawBody), msg); } catch {}
        throw new Error(msg);
      }

      const raw: TaskStatusResponse = JSON.parse(rawBody);
      this.pollErrorCount = 0;

      // Debug — aktifkan saat butuh troubleshoot:
      // console.log(`[${this.taskName}] Raw response:`, JSON.stringify(raw, null, 2));

      const normalized = this.normalizeStatus(raw, taskId);
      useTaskStore.getState().applyStatusUpdate(normalized);

      if (normalized.status === 'completed' || normalized.status === 'failed') {
        this.cancelPolling();
        await this.onTaskFinished(normalized);
        return;
      }

      this.scheduleNextPoll();

    } catch (error: unknown) {
      this.pollErrorCount++;
      const msg = extractErrorMessage(error, 'Polling error');
      console.error(`[${this.taskName}] Poll error #${this.pollErrorCount}:`, msg);

      if (this.pollErrorCount >= this.MAX_POLL_ERRORS) {
        this.cancelPolling();
        useTaskStore.getState().failTask(taskId, `Gagal poll setelah ${this.MAX_POLL_ERRORS}x: ${msg}`);
        return;
      }

      this.scheduleNextPoll();

    } finally {
      this.isPolling = false;
    }
  }

  // ─── NORMALIZE STATUS ─────────────────────────────────────────────────────
  //
  // FastAPI response shape yang di-handle:
  //
  // PROGRESS:
  // {
  //   "task_id": "xxx",
  //   "status": "PROGRESS",
  //   "info": {
  //     "state": "PROGRESS",
  //     "status": "Process Fix Route for TBG-xxx completed.",  ← pesan teks
  //     "ts": 1776070025.023648,
  //     "progress": {
  //       "current": 6,
  //       "total": 55,
  //       "percent": 10.91     ← ini yang kita ambil
  //     }
  //   }
  // }
  //
  // SUCCESS:
  // { "task_id": "xxx", "status": "SUCCESS", "result": { ... } }
  //
  // FAILURE:
  // { "task_id": "xxx", "status": "FAILURE", "error": "..." }

  private normalizeStatus(
    raw: TaskStatusResponse,
    taskId: string,
  ): NormalizedTaskStatus {

    let status: TaskStatusState = CELERY_STATUS_MAP[raw.status] ?? 'processing';

    // ── Progress ────────────────────────────────────────────────────────────
    let progress = 0;

    if (status === 'completed') {
      progress = 100;

    } else if (status === 'pending') {
      progress = 0;

    } else if (typeof raw.info === 'object' && raw.info !== null) {
      const info = raw.info as CeleryInfoObject;

      if (typeof info.progress === 'object' && info.progress !== null) {
        // ✅ Pola A — FastAPI actual:
        // info.progress = { current: 6, total: 55, percent: 10.91 }
        const prog = info.progress as CeleryProgressObject;

        if (typeof prog.percent === 'number') {
          // Gunakan percent langsung — paling akurat
          progress = Math.min(100, Math.max(0, Math.round(prog.percent)));

        } else if (
          typeof prog.current === 'number' &&
          typeof prog.total   === 'number' &&
          prog.total > 0
        ) {
          // Fallback: hitung dari current/total jika percent tidak ada
          progress = Math.min(
            100,
            Math.round((prog.current / prog.total) * 100)
          );
        }

      } else if (typeof info.progress === 'number') {
        // Pola B — info.progress langsung number (0-100)
        progress = Math.min(100, Math.max(0, Math.round(info.progress)));

      } else if (
        typeof info.current === 'number' &&
        typeof info.total   === 'number' &&
        info.total > 0
      ) {
        // Pola C — current + total di root info (bukan nested)
        progress = Math.min(
          100,
          Math.round((info.current / info.total) * 100)
        );
      }

    } else if (typeof raw.progress === 'number') {
      // Pola D — progress di root JSON response
      progress = Math.min(100, Math.max(0, Math.round(raw.progress)));
    }

    // ── Message (teks log untuk activity feed) ───────────────────────────────
    let message = '';

    if (typeof raw.info === 'string') {
      message = raw.info;

    } else if (raw.info && typeof raw.info === 'object') {
      const info = raw.info as CeleryInfoObject;
      // Prioritas: status > message (keduanya bisa berisi teks progress)
      message =
        (typeof info.status  === 'string' && info.status  ? info.status  : '') ||
        (typeof info.message === 'string' && info.message ? info.message : '');
    }

    if (!message && raw.error) {
      message = typeof raw.error === 'string' ? raw.error : JSON.stringify(raw.error);
    }
    if (!message && raw.exc_message) {
      message = raw.exc_message;
    }

    // Fallback message jika tidak ada teks sama sekali
    if (!message && status === 'processing') {
      const info = typeof raw.info === 'object' && raw.info !== null
        ? raw.info as CeleryInfoObject
        : null;
      const prog = info?.progress;
      if (prog && typeof prog === 'object') {
        const p = prog as CeleryProgressObject;
        message = `Processing... step ${p.current} of ${p.total} (${Math.round(p.percent)}%)`;
      }
    }

    // ── Result (untuk download setelah selesai) ──────────────────────────────
    const resultObj =
      raw.result && typeof raw.result === 'object'
        ? (raw.result as Record<string, unknown>)
        : null;

    const downloadUrl = resultObj?.download_url as string | undefined;
    const outputFile  = (resultObj?.output_file || resultObj?.filename) as string | undefined;

    // ── Detect error messages disguised as PROGRESS ──────────────────────────
    // Some backends return PROGRESS status with error messages in info.status
    // instead of properly returning FAILURE status.
    if (status === 'processing' && message) {
      const lower = message.toLowerCase();
      const isErrorMsg =
        lower.includes('missing columns') ||
        lower.includes('missing required') ||
        lower.includes('keyerror') ||
        lower.includes('valueerror') ||
        lower.includes('typeerror') ||
        lower.includes('attributeerror') ||
        lower.includes('exception') ||
        lower.includes('traceback') ||
        /\berror\b/.test(lower) ||
        /\bfailed\b/.test(lower) ||
        /\bgagal\b/.test(lower);

      if (isErrorMsg) {
        status = 'failed';
      }
    }

    // ── Build log entry ──────────────────────────────────────────────────────
    const logs: LogEntry[] = message
      ? [{
          timestamp: new Date().toISOString(),
          message,
          level:
            status === 'failed'    ? 'error'   :
            status === 'completed' ? 'success'  :
            'info',
        }]
      : [];

    return {
      task_id:      raw.task_id || taskId,
      status,
      progress,
      logs,
      current_step: message,
      message,
      download_url: downloadUrl,
      output_file:  outputFile,
    };
  }

  // ─── HANDLE ZIP RESPONSE ─────────────────────────────────────────────────

  private async handleZipResponse(response: Response, taskId: string): Promise<void> {
    this.cancelPolling();

    try {
      const blob = await response.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');

      a.href     = url;
      a.download = this.defaultFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      console.log(`[${this.taskName}] ZIP downloaded:`, this.defaultFilename);

      useTaskStore.getState().completeTask(taskId, undefined, this.defaultFilename);

      await this.saveToHistory({
        user_nik:  this.userNik,
        task_name: this.taskName,
        filename:  this.defaultFilename,
        status:    'completed',
        progress:  100,
        file_url:  null,
      });

    } catch (err) {
      console.error(`[${this.taskName}] ZIP download error:`, err);
      useTaskStore.getState().failTask(taskId, 'Gagal download file hasil');
    }
  }

  // ─── HANDLE FINISH (JSON SUCCESS/FAILURE) ────────────────────────────────

  private async onTaskFinished(normalized: NormalizedTaskStatus): Promise<void> {
    const { status, task_id, download_url, output_file, message } = normalized;

    if (status === 'completed') {
      useTaskStore.getState().completeTask(task_id, download_url, output_file);
      await this.saveToHistory({
        user_nik:  this.userNik,
        task_name: this.taskName,
        filename:  output_file || this.fileName,
        status:    'completed',
        progress:  100,
        file_url:  download_url || null,
      });

    } else if (status === 'failed') {
      useTaskStore.getState().failTask(task_id, message || 'Task gagal');
      await this.saveToHistory({
        user_nik:  this.userNik,
        task_name: this.taskName,
        filename:  this.fileName,
        status:    'failed',
        progress:  0,
        file_url:  null,
      });
    }
  }

  // ─── SAVE TO HISTORY ─────────────────────────────────────────────────────

  private async saveToHistory(payload: HistoryDBPayload): Promise<void> {
    try {
      await fetch(`${window.location.origin}/api/auth/history`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify(payload),
      });
    } catch (err) {
      console.error(`[${this.taskName}] History save error:`, err);
    }
  }

  // ─── CANCEL POLLING ──────────────────────────────────────────────────────

  cancelPolling(): void {
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.currentTaskId = null;
    this.isPolling     = false;
    console.log(`[${this.taskName}] Polling cancelled.`);
  }
}