/**
 * Path: src/core/types/task.types.ts
 */

export interface LogEntry {
  timestamp: string;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
}

export interface ActiveTask {
  task_id: string;
  task_name: string;
  filename: string;
  status: TaskStatusState;
  progress: number;
  logs: LogEntry[];
  created_at: string;
  user_nik: string;
  download_url?: string;
  output_file?: string;
}

export type TaskStatusState = 'pending' | 'processing' | 'completed' | 'failed';
export type CeleryStatusRaw =
  | 'PENDING'
  | 'STARTED'
  | 'PROGRESS'
  | 'RETRY'
  | 'REVOKED'
  | 'SUCCESS'
  | 'FAILURE';

export interface TaskSubmitResponse {
  task_id: string;
  task_status_url?: string;
}

export interface RawTaskSubmitResponse {
  celery_task_id: string;
  task_status_url: string;
}

export interface TaskStatusResponse {
  task_id: string;
  status: CeleryStatusRaw;
  info?: {
    progress?: number;   // pola 1: 0-100 langsung
    current?: number;    // pola 2: current/total
    total?: number;
    status?: string;
    message?: string;
    [key: string]: unknown;
  } | string;
  result?: {
    download_url?: string;
    output_file?: string;
    filename?: string;
    [key: string]: unknown;
  } | string | null;
  error?: string | unknown;
  exc_message?: string;
  progress?: number;     // pola 3: progress di root
}

export interface NormalizedTaskStatus {
  task_id: string;
  status: TaskStatusState;
  progress: number;
  logs: LogEntry[];
  current_step: string;
  message: string;
  download_url?: string;
  output_file?: string;
}

export interface TaskSubmitResult {
  success: boolean;
  task_id?: string;
  error?: string;
  message?: string;
}

export interface HistoryDBPayload {
  user_nik: string;
  task_name: string;
  filename: string;
  status: TaskStatusState;
  progress: number;
  file_url: string | null;
}

export const CELERY_STATUS_MAP: Record<string, TaskStatusState> = {
  PENDING:    'pending',
  STARTED:    'processing',
  PROGRESS:   'processing',
  RETRY:      'processing',
  REVOKED:    'failed',
  SUCCESS:    'completed',
  FAILURE:    'failed',
  // lowercase alias
  pending:    'pending',
  processing: 'processing',
  completed:  'completed',
  failed:     'failed',
};