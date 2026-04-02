export interface LogEntry {
  timestamp: string;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
}

export interface TaskStatus {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  logs?: LogEntry[];
  current_step?: string;
  message?: string;
  result?: {
    download_url?: string;
    output_file?: string;
  };
}

export interface TaskSubmitResponse {
  task_id: string;
  task_status_url: string;
}

function extractErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    if (typeof e.message === 'string') return e.message;
    if (typeof e.detail === 'string') return e.detail;
    if (typeof e.error === 'string') return e.error;
    try { return JSON.stringify(error); } catch { return fallback; }
  }
  return fallback;
}

export class DrmIntersiteTask {
  private API_BASE_URL = '/api/iris';
  private POLL_INTERVAL = 3000;
  private currentTaskId: string | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private abortController: AbortController | null = null;

  constructor(apiBaseUrl?: string) {
    if (apiBaseUrl) this.API_BASE_URL = apiBaseUrl;
  }

  async submitTask(formData: FormData): Promise<{
    success: boolean;
    task_id?: string;
    error?: string;
    message?: string;
  }> {
    try {
      this.cancelPolling();
      this.currentTaskId = null;
      this.abortController = new AbortController();

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const submitUrl = `${baseUrl}${this.API_BASE_URL}/drm-intersite`;

      console.log('📤 Submitting task to:', submitUrl);

      const response = await fetch(submitUrl, {
        method: 'POST',
        body: formData,
        signal: this.abortController.signal,
      });

      let rawBody: string;
      try { rawBody = await response.text(); } catch { throw new Error('Failed to read response body'); }

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        if (rawBody) {
          try {
            const parsed = JSON.parse(rawBody);
            errorMessage =
              typeof parsed.detail === 'string' ? parsed.detail :
              typeof parsed.error === 'string' ? parsed.error :
              typeof parsed.message === 'string' ? parsed.message :
              Array.isArray(parsed.detail) ? parsed.detail.map((d: any) => d.msg).join(', ') :
              rawBody;
          } catch { errorMessage = rawBody; }
        }
        throw new Error(errorMessage);
      }

      let data: TaskSubmitResponse;
      try { data = JSON.parse(rawBody); } catch { throw new Error('Invalid JSON response from server'); }

      if (!data.task_id) throw new Error('No task_id received from server');

      this.currentTaskId = data.task_id;
      console.log('✅ Task submitted, task_id:', this.currentTaskId);

      this.startPolling();

      return { success: true, task_id: data.task_id, message: 'Task submitted successfully' };

    } catch (error: unknown) {
      this.cancelPolling();
      this.currentTaskId = null;
      if (error instanceof Error && error.name === 'AbortError') return { success: false, error: 'Request cancelled' };
      const errorMessage = extractErrorMessage(error, 'Failed to submit task');
      console.error('❌ Submit error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  private startPolling() {
    if (this.pollingInterval) { clearInterval(this.pollingInterval); this.pollingInterval = null; }
    if (!this.currentTaskId) return;
    this.pollTaskStatus();
    this.pollingInterval = setInterval(() => this.pollTaskStatus(), this.POLL_INTERVAL);
  }

  private async pollTaskStatus() {
    if (!this.currentTaskId) { this.cancelPolling(); return; }
    const taskId = this.currentTaskId;

    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const statusUrl = `${baseUrl}${this.API_BASE_URL}/tasks/status/${taskId}`;

      const response = await fetch(statusUrl, {
        method: 'GET',
        headers: { Accept: 'application/json, application/zip' },
      });

      const contentType = response.headers.get('Content-Type') || '';

      if (contentType.includes('application/zip')) {
        await this.handleTaskComplete(response, statusUrl);
        return;
      }

      let rawBody: string;
      try { rawBody = await response.text(); } catch { throw new Error('Failed to read status response body'); }

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        if (rawBody) {
          try {
            const parsed = JSON.parse(rawBody);
            errorMessage =
              typeof parsed.detail === 'string' ? parsed.detail :
              typeof parsed.error === 'string' ? parsed.error :
              Array.isArray(parsed.detail) ? parsed.detail.map((d: any) => d.msg).join(', ') :
              rawBody;
          } catch { errorMessage = rawBody; }
        }
        throw new Error(errorMessage);
      }

      let raw: any;
      try { raw = JSON.parse(rawBody); } catch { throw new Error('Invalid JSON from status endpoint'); }

      const statusMap: Record<string, TaskStatus['status']> = {
        PENDING: 'pending', PROGRESS: 'processing', SUCCESS: 'completed', FAILURE: 'failed',
        pending: 'pending', processing: 'processing', completed: 'completed', failed: 'failed',
      };
      const normalizedStatus: TaskStatus['status'] = statusMap[raw.status] ?? 'processing';

      let infoMessage = '';
      if (typeof raw.info === 'string') infoMessage = raw.info;
      else if (raw.info && typeof raw.info === 'object') infoMessage = raw.info.status || raw.info.message || JSON.stringify(raw.info);
      else if (typeof raw.message === 'string') infoMessage = raw.message;

      const progress =
        typeof raw.info?.progress === 'number' ? raw.info.progress :
        normalizedStatus === 'completed' ? 100 :
        normalizedStatus === 'pending' ? 0 :
        raw.progress ?? 0;

      const logLevel: LogEntry['level'] =
        normalizedStatus === 'failed' ? 'error' :
        normalizedStatus === 'completed' ? 'success' : 'info';

      const data: TaskStatus = {
        task_id: raw.task_id || taskId,
        status: normalizedStatus,
        progress,
        logs: infoMessage ? [{ timestamp: new Date().toISOString(), message: infoMessage, level: logLevel }] : [],
        current_step: infoMessage,
        message: infoMessage,
      };

      this.updateUI(data);

      if (normalizedStatus === 'completed' || normalizedStatus === 'failed') {
        this.cancelPolling();
        if (normalizedStatus === 'failed') this.handleError(infoMessage || 'Task failed on backend');
        else this.notifyTaskCompleted(statusUrl);
      }

    } catch (error: unknown) {
      const errorMessage = extractErrorMessage(error, 'Polling failed');
      console.error('❌ Polling error:', errorMessage);
      this.cancelPolling();
      this.currentTaskId = null;
      this.handleError(errorMessage);
    }
  }

  private async handleTaskComplete(response: Response, downloadUrl: string) {
    try {
      this.cancelPolling();
      const contentDisposition = response.headers.get('Content-Disposition') || '';
      let filename = 'drm_intersite_result.zip';
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) filename = filenameMatch[1].replace(/['"]/g, '');

      this.updateUI({
        task_id: this.currentTaskId!,
        status: 'completed',
        progress: 100,
        logs: [{ timestamp: new Date().toISOString(), message: `Task completed! File: ${filename}`, level: 'success' }],
        result: { download_url: downloadUrl, output_file: filename },
      });

      this.notifyTaskCompleted(downloadUrl, filename);
    } catch (error: unknown) {
      this.handleError(extractErrorMessage(error, 'Failed to process completed task'));
    }
  }

  private notifyTaskCompleted(downloadUrl: string, filename?: string) {
    window.dispatchEvent(new CustomEvent('taskCompleted', {
      detail: { task_id: this.currentTaskId, download_url: downloadUrl, filename: filename || 'drm_intersite_result.zip' },
    }));
  }

  private updateUI(data: TaskStatus) {
    window.dispatchEvent(new CustomEvent('taskStatusUpdate', {
      detail: {
        task_id: data.task_id || this.currentTaskId,
        status: data.status || 'processing',
        progress: data.progress ?? 0,
        logs: data.logs || [],
        current_step: data.current_step || '',
        message: data.message || '',
        download_url: data.result?.download_url,
        output_file: data.result?.output_file,
      },
    }));
  }

  private handleError(errorMessage: string) {
    window.dispatchEvent(new CustomEvent('taskError', { detail: { error: errorMessage } }));
  }

  cancelPolling() {
    if (this.pollingInterval) { clearInterval(this.pollingInterval); this.pollingInterval = null; }
    if (this.abortController) { this.abortController.abort(); this.abortController = null; }
  }

  reset() { this.cancelPolling(); this.currentTaskId = null; }

  getCurrentTaskId(): string | null { return this.currentTaskId; }

  async downloadFile(url: string, filename?: string): Promise<boolean> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename || url.split('/').pop() || 'drm_intersite_result.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      return true;
    } catch (error: unknown) {
      this.handleError(extractErrorMessage(error, 'Failed to download file'));
      return false;
    }
  }
}