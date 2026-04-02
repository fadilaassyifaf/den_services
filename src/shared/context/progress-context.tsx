'use client';

/**
 * PROGRESS CONTEXT (REBUILT)
 * Path: src/shared/context/progress-context.tsx
 */

import React, { createContext, useContext, useCallback, type ReactNode } from 'react';
import { useTaskStore } from '@/core/store/task-store';
import type { ActiveTask, LogEntry, NormalizedTaskStatus } from '@/core/types/task.types';

interface ProgressContextValue {
  tasks: ActiveTask[];
  addTask: (task: ActiveTask) => void;
  updateTask: (taskId: string, updates: Partial<ActiveTask>) => void;
  appendLog: (taskId: string, log: LogEntry) => void;
  applyStatusUpdate: (update: NormalizedTaskStatus) => void;
  removeTask: (taskId: string) => void;
  completeTask: (taskId: string, downloadUrl?: string, outputFile?: string) => void;
  failTask: (taskId: string, errorMessage: string) => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const store = useTaskStore();

  const addTask = useCallback((task: ActiveTask) => store.addTask(task), []); // eslint-disable-line
  const updateTask = useCallback((taskId: string, updates: Partial<ActiveTask>) => store.updateTask(taskId, updates), []); // eslint-disable-line
  const appendLog = useCallback((taskId: string, log: LogEntry) => store.appendLog(taskId, log), []); // eslint-disable-line
  const applyStatusUpdate = useCallback((update: NormalizedTaskStatus) => store.applyStatusUpdate(update), []); // eslint-disable-line
  const removeTask = useCallback((taskId: string) => store.removeTask(taskId), []); // eslint-disable-line
  const completeTask = useCallback((taskId: string, downloadUrl?: string, outputFile?: string) => store.completeTask(taskId, downloadUrl, outputFile), []); // eslint-disable-line
  const failTask = useCallback((taskId: string, errorMessage: string) => store.failTask(taskId, errorMessage), []); // eslint-disable-line

  return (
    <ProgressContext.Provider value={{
      tasks: store.tasks,
      addTask, updateTask, appendLog,
      applyStatusUpdate, removeTask,
      completeTask, failTask,
    }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) {
    throw new Error(
      '[useProgress] Must be used inside <ProgressProvider>. ' +
      'Tambahkan ProgressProvider di src/app/(protected)/iris/layout.tsx'
    );
  }
  return ctx;
}

export default ProgressContext;