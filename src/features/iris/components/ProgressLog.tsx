'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useProgress } from '@/shared/context/progress-context';

export interface LogEntry {
  timestamp: string;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
}

export interface ActiveTask {
  task_id: string;
  task_name: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  logs: LogEntry[];
  created_at: string;
  user_nik: string;
  download_url?: string;
  output_file?: string;
}

interface ProgressLogProps {
  userNik: string;
  onTasksChange?: (tasks: ActiveTask[]) => void;
}

export default function ProgressLog({ userNik, onTasksChange }: ProgressLogProps) {
  const { tasks: activeTasks, removeTask } = useProgress();
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [manuallyCollapsed, setManuallyCollapsed] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<string | null>(null);
  const logEndRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const userTasks = useMemo(() => {
    return activeTasks.filter(t => t.user_nik === userNik);
  }, [activeTasks, userNik]);

  useEffect(() => {
    if (onTasksChange) onTasksChange(userTasks);
  }, [userTasks]); // eslint-disable-line

  useEffect(() => {
    const processingTask = userTasks.find(t => t.status === 'processing');
    if (processingTask && !manuallyCollapsed.has(processingTask.task_id)) {
      if (expandedTask !== processingTask.task_id) setExpandedTask(processingTask.task_id);
    }
  }, [userTasks, manuallyCollapsed, expandedTask]);

  useEffect(() => {
    setManuallyCollapsed(prev => {
      const activeIds = new Set(userTasks.map(t => t.task_id));
      let hasChanges = false;
      const next = new Set(prev);
      for (const id of prev) {
        if (!activeIds.has(id)) { next.delete(id); hasChanges = true; }
      }
      return hasChanges ? next : prev;
    });
  }, [userTasks]);

  useEffect(() => {
    userTasks.forEach(task => {
      if (expandedTask === task.task_id) {
        const el = logEndRefs.current[task.task_id];
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }, [userTasks, expandedTask]);

  const handleToggle = (taskId: string, isExpanded: boolean) => {
    if (isExpanded) {
      setExpandedTask(null);
      setManuallyCollapsed(prev => new Set(prev).add(taskId));
    } else {
      setExpandedTask(taskId);
      setManuallyCollapsed(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const handleDownload = async (task: ActiveTask) => {
    if (!task.download_url) return;
    setDownloading(task.task_id);
    try {
      const proxyUrl = `/api/iris/files/download?path=${encodeURIComponent(task.download_url)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(error || `HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = task.output_file || 'result.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setDownloading(null);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getConfig = (status: ActiveTask['status']) => {
    switch (status) {
      case 'completed': return {
        card: 'bg-white border-[#1E99D5]/25',
        dot: 'bg-[#1E99D5]',
        ping: false,
        badge: 'bg-[#1E99D5]/15 text-[#1E99D5] border-[#1E99D5]/30',
        badgeText: 'Completed',
        bar: 'bg-[#1E99D5]',
        label: 'text-[#1E99D5]',
        accent: 'border-l-4 border-l-[#1E99D5]',
      };
      case 'processing': return {
        card: 'bg-white border-[#11499E]/20',
        dot: 'bg-[#11499E]',
        ping: true,
        badge: 'bg-[#11499E]/10 text-[#11499E] border-[#11499E]/25',
        badgeText: 'Processing',
        bar: 'bg-[#11499E]',
        label: 'text-[#11499E]',
        accent: 'border-l-4 border-l-[#11499E]',
      };
      case 'pending': return {
        card: 'bg-white border-gray-200',
        dot: 'bg-gray-400',
        ping: false,
        badge: 'bg-gray-100 text-gray-500 border-gray-300',
        badgeText: 'Queued',
        bar: 'bg-gray-300',
        label: 'text-gray-500',
        accent: 'border-l-4 border-l-gray-300',
      };
      case 'failed': return {
        card: 'bg-white border-red-200',
        dot: 'bg-red-500',
        ping: false,
        badge: 'bg-red-50 text-red-600 border-red-200',
        badgeText: 'Failed',
        bar: 'bg-red-500',
        label: 'text-red-600',
        accent: 'border-l-4 border-l-red-400',
      };
    }
  };

  if (userTasks.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">

      {/* Section header */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-[#11499E] rounded-full" />
          <span className="text-xs font-bold text-[#11499E] uppercase tracking-wider">
            Active Progress
          </span>
        </div>
        <span className="text-[10px] font-bold text-[#11499E] bg-[#11499E]/10 px-2 py-0.5 rounded-full">
          {userTasks.length}
        </span>
      </div>

      {userTasks.map(task => {
        const isExpanded = expandedTask === task.task_id;
        const cfg = getConfig(task.status);
        const progressValue = task.status === 'pending' ? 0 : task.progress;

        return (
          <div
            key={task.task_id}
            className={`border rounded-xl overflow-hidden transition-all duration-200 shadow-sm ${cfg.card}`}
          >
            {/* Header */}
            <div className="px-3 pt-3 pb-2 flex items-start gap-2.5">

              {/* Status dot */}
              <div className="relative flex-shrink-0 mt-1.5">
                {cfg.ping && (
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.dot} opacity-50`} />
                )}
                <span className={`relative flex h-3 w-3 rounded-full ${cfg.dot}`} />
              </div>

              {/* Task info */}
              <button
                className="flex-1 min-w-0 text-left"
                onClick={() => handleToggle(task.task_id, isExpanded)}
              >
                <p className="text-xs font-bold text-gray-800 leading-tight mb-1">
                  {task.task_name}
                </p>
                <p className="text-[10px] text-gray-500 truncate">
                  {task.filename}
                </p>
              </button>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleToggle(task.task_id, isExpanded)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  title={isExpanded ? 'Collapse' : 'Show log'}
                >
                  <svg
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => removeTask(task.task_id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 transition-colors group"
                  title="Dismiss"
                >
                  <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Progress section */}
            <div className="px-3 pb-3">
              <div className="flex items-center justify-between mb-1.5">
                {task.status === 'processing' ? (
                  <span className={`text-[11px] font-semibold ${cfg.label} flex items-center gap-1.5`}>
                    <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sedang berjalan...
                  </span>
                ) : task.status === 'pending' ? (
                  <span className={`text-[11px] font-semibold ${cfg.label}`}>Menunggu antrian</span>
                ) : task.status === 'failed' ? (
                  <span className={`text-[11px] font-semibold ${cfg.label}`}>Gagal</span>
                ) : (
                  <span className={`text-[11px] font-semibold ${cfg.label}`}>✓ Selesai</span>
                )}
                <span className={`text-xs font-bold ${cfg.label}`}>
                  {progressValue}%
                </span>
              </div>

              {/* Progress track */}
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                {task.status === 'processing' && progressValue === 0 ? (
                  <div className="h-full w-full relative overflow-hidden rounded-full">
                    <div
                      className={`h-full w-1/3 rounded-full ${cfg.bar}`}
                      style={{ animation: 'shimmer 1.5s ease-in-out infinite' }}
                    />
                  </div>
                ) : (
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${cfg.bar} ${task.status === 'pending' ? 'opacity-30' : ''}`}
                    style={{ width: `${progressValue}%` }}
                  />
                )}
              </div>
            </div>

            {/* Activity feed (expanded) */}
            {isExpanded && (
              <div className="mx-3 mb-3 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">

                {/* Feed header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white">
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Log Aktivitas</span>
                  </div>
                  <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                    {task.logs?.length || 0} event
                  </span>
                </div>

                {/* Feed entries */}
                <div className="h-44 overflow-y-auto px-3 py-2.5 space-y-2.5
                  [&::-webkit-scrollbar]:w-1.5
                  [&::-webkit-scrollbar-track]:bg-transparent
                  [&::-webkit-scrollbar-thumb]:bg-gray-300
                  [&::-webkit-scrollbar-thumb]:rounded-full">

                  {!task.logs || task.logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                        <svg className="w-4.5 h-4.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-xs text-gray-400 text-center">
                        {task.status === 'pending' ? 'Menunggu worker...' : 'Memulai proses...'}
                      </p>
                    </div>
                  ) : (
                    task.logs.map((log, idx) => {
                      const isLast = idx === task.logs.length - 1;
                      const isSuccess = log.level === 'success';
                      const isError = log.level === 'error';
                      const isWarning = log.level === 'warning';

                      return (
                        <div key={idx} className="flex items-start gap-2.5">
                          <div className="flex flex-col items-center flex-shrink-0 mt-0.5">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
                              ${isSuccess ? 'bg-[#1E99D5]/15' : isError ? 'bg-red-100' : isWarning ? 'bg-amber-100' : 'bg-gray-100'}`}>
                              {isSuccess ? (
                                <svg className="w-2.5 h-2.5 text-[#1E99D5]" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : isError ? (
                                <svg className="w-2.5 h-2.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              ) : isWarning ? (
                                <svg className="w-2.5 h-2.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                              )}
                            </div>
                            {!isLast && <div className="w-px h-2.5 bg-gray-200 mt-0.5" />}
                          </div>

                          <div className="flex-1 min-w-0 pb-0.5">
                            <p className={`text-[11px] leading-relaxed font-medium break-words
                              ${isSuccess ? 'text-[#11499E]' : isError ? 'text-red-600' : isWarning ? 'text-amber-700' : 'text-gray-600'}`}>
                              {log.message}
                            </p>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {formatTime(log.timestamp)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {task.status === 'processing' && (
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-[#11499E]/10 flex items-center justify-center flex-shrink-0">
                        <svg className="animate-spin w-2.5 h-2.5 text-[#11499E]" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                      <div className="flex gap-1 items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#11499E]/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-[#11499E]/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-[#11499E]/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}

                  <div ref={el => { logEndRefs.current[task.task_id] = el; }} />
                </div>
              </div>
            )}

            {/* Download button */}
            {task.status === 'completed' && task.download_url && (
              <div className="px-3 pb-3">
                <button
                  onClick={() => handleDownload(task)}
                  disabled={downloading === task.task_id}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold
                    text-[#1E99D5] bg-[#1E99D5]/8 hover:bg-[#1E99D5]/15 border border-[#1E99D5]/20
                    transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {downloading === task.task_id ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Mengunduh file...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Unduh Hasil
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Failed message */}
            {task.status === 'failed' && (
              <div className="mx-3 mb-3 flex items-start gap-2.5 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-px" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-xs font-bold text-red-600">Proses Gagal</p>
                  <p className="text-[11px] text-red-500 mt-0.5 break-words leading-relaxed">
                    {task.logs?.[task.logs.length - 1]?.message || 'Terjadi kesalahan saat memproses.'}
                  </p>
                </div>
              </div>
            )}

            {/* Pending badge */}
            {task.status === 'pending' && (
              <div className="mx-3 mb-3 flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <p className="text-[11px] text-gray-500 font-medium">
                  Menunggu — akan mulai otomatis setelah task selesai
                </p>
              </div>
            )}

          </div>
        );
      })}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}