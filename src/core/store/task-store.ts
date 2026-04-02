/**
 * ZUSTAND TASK STORE
 * Path: src/core/store/task-store.ts
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ActiveTask, LogEntry, TaskStatusState, NormalizedTaskStatus } from '@/core/types/task.types';

interface TaskStore {
  tasks: ActiveTask[];
  addTask: (task: ActiveTask) => void;
  updateTask: (taskId: string, updates: Partial<ActiveTask>) => void;
  appendLog: (taskId: string, log: LogEntry) => void;
  applyStatusUpdate: (update: NormalizedTaskStatus) => void;
  removeTask: (taskId: string) => void;
  completeTask: (taskId: string, downloadUrl?: string, outputFile?: string) => void;
  failTask: (taskId: string, errorMessage: string) => void;
  clearAll: () => void;
  getTasksByUser: (userNik: string) => ActiveTask[];
  hasActiveTask: (userNik: string) => boolean;
}

export const useTaskStore = create<TaskStore>()(
  devtools(
    (set, get) => ({
      tasks: [],

      addTask: (task) => {
        set((state) => {
          const exists = state.tasks.some((t) => t.task_id === task.task_id);
          if (exists) {
            console.warn(`[TaskStore] Task ${task.task_id} already exists, skipping`);
            return state;
          }
          return { tasks: [...state.tasks, task] };
        }, false, 'addTask');
      },

      updateTask: (taskId, updates) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.task_id === taskId ? { ...t, ...updates } : t
          ),
        }), false, 'updateTask');
      },

      appendLog: (taskId, log) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.task_id === taskId
              ? {
                  ...t,
                  logs: [
                    ...t.logs,
                    ...(t.logs.some(
                      (l) => l.message === log.message && l.timestamp === log.timestamp
                    ) ? [] : [log]),
                  ],
                }
              : t
          ),
        }), false, 'appendLog');
      },

      applyStatusUpdate: (update) => {
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.task_id !== update.task_id) return t;
            const updatedLogs: LogEntry[] = update.logs.length > 0
              ? [
                  ...t.logs,
                  ...update.logs.filter(
                    (newLog) =>
                      !t.logs.some(
                        (existing) =>
                          existing.message === newLog.message &&
                          existing.timestamp === newLog.timestamp
                      )
                  ),
                ]
              : t.logs;
            return {
              ...t,
              status: update.status,
              progress: update.progress,
              logs: updatedLogs,
              download_url: update.download_url ?? t.download_url,
              output_file: update.output_file ?? t.output_file,
            };
          }),
        }), false, 'applyStatusUpdate');
      },

      removeTask: (taskId) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.task_id !== taskId),
        }), false, 'removeTask');
      },

      completeTask: (taskId, downloadUrl, outputFile) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.task_id === taskId
              ? {
                  ...t,
                  status: 'completed' as TaskStatusState,
                  progress: 100,
                  download_url: downloadUrl ?? t.download_url,
                  output_file: outputFile ?? t.output_file,
                  logs: [
                    ...t.logs,
                    {
                      timestamp: new Date().toISOString(),
                      message: `Task completed successfully${outputFile ? `: ${outputFile}` : ''}`,
                      level: 'success' as const,
                    },
                  ],
                }
              : t
          ),
        }), false, 'completeTask');
      },

      failTask: (taskId, errorMessage) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.task_id === taskId
              ? {
                  ...t,
                  status: 'failed' as TaskStatusState,
                  logs: [
                    ...t.logs,
                    {
                      timestamp: new Date().toISOString(),
                      message: errorMessage,
                      level: 'error' as const,
                    },
                  ],
                }
              : t
          ),
        }), false, 'failTask');
      },

      clearAll: () => {
        set({ tasks: [] }, false, 'clearAll');
      },

      getTasksByUser: (userNik) => {
        return get().tasks.filter((t) => t.user_nik === userNik);
      },

      hasActiveTask: (userNik) => {
        return get().tasks.some(
          (t) =>
            t.user_nik === userNik &&
            (t.status === 'processing' || t.status === 'pending')
        );
      },
    }),
    { name: 'TaskStore' }
  )
);

export const selectUserTasks = (userNik: string) => (state: TaskStore) =>
  state.tasks.filter((t) => t.user_nik === userNik);

export const selectActiveCount = (userNik: string) => (state: TaskStore) =>
  state.tasks.filter(
    (t) =>
      t.user_nik === userNik &&
      (t.status === 'processing' || t.status === 'pending')
  ).length;