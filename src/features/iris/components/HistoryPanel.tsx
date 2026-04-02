'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ProcessingLog {
  id: number;
  task_name: string;
  filename: string;
  status: string;
  file_url: string | null;
  processing_time: number | null;
  created_at: string;
}

interface HistoryPanelProps {
  userNik: string;
  refreshTrigger?: number;
}

export default function HistoryPanel({ userNik, refreshTrigger = 0 }: HistoryPanelProps) {
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ProcessingLog | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async () => {
    if (!userNik) return;
    setLoadingLogs(true);
    try {
      const response = await fetch(`/api/auth/history?nik=${userNik}`);
      if (!response.ok) throw new Error('Failed to fetch history');
      const data = await response.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading history:', error);
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }, [userNik]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, refreshTrigger]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return { dot: 'bg-[#1E99D5]', text: 'text-[#1E99D5]', badge: 'bg-blue-50 text-[#1E99D5]', label: 'Done' };
      case 'processing': return { dot: 'bg-amber-400', text: 'text-amber-500', badge: 'bg-amber-50 text-amber-500', label: 'Running' };
      case 'pending':    return { dot: 'bg-gray-300',  text: 'text-gray-400',  badge: 'bg-gray-50 text-gray-400',  label: 'Queued' };
      case 'failed':     return { dot: 'bg-red-400',   text: 'text-red-500',   badge: 'bg-red-50 text-red-500',   label: 'Failed' };
      default:           return { dot: 'bg-gray-300',  text: 'text-gray-400',  badge: 'bg-gray-50 text-gray-400',  label: status };
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  const formatTime = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const handleDownload = async (fileUrl: string, filename: string) => {
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('HTTP error');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'download.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleSelect = (log: ProcessingLog) => {
    setSelectedLog(log);
    setIsOpen(false);
  };

  const completedCount = logs.filter(l => l.status.toLowerCase() === 'completed').length;
  const processingCount = logs.filter(l => l.status.toLowerCase() === 'processing').length;

  return (
    <div className="flex flex-col bg-white border border-gray-100 overflow-visible" style={{ borderRadius: '14px' }}>

      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between flex-shrink-0">
        <div>
          <h2 className="text-sm font-bold text-[#11499E] leading-tight">Task History</h2>
          <p className="text-[10px] text-gray-400 mt-0.5">Your recent executions</p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loadingLogs}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <svg
            className={`w-3.5 h-3.5 text-gray-400 ${loadingLogs ? 'animate-spin' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Stats summary */}
      {logs.length > 0 && (
        <div className="mx-3 mb-3 flex gap-2">
          <div className="flex-1 bg-blue-50 rounded-lg px-2.5 py-1.5 text-center">
            <p className="text-[11px] font-bold text-[#11499E]">{logs.length}</p>
            <p className="text-[9px] text-[#1E99D5]">Total</p>
          </div>
          <div className="flex-1 bg-green-50 rounded-lg px-2.5 py-1.5 text-center">
            <p className="text-[11px] font-bold text-emerald-600">{completedCount}</p>
            <p className="text-[9px] text-emerald-400">Done</p>
          </div>
          {processingCount > 0 && (
            <div className="flex-1 bg-amber-50 rounded-lg px-2.5 py-1.5 text-center">
              <p className="text-[11px] font-bold text-amber-500">{processingCount}</p>
              <p className="text-[9px] text-amber-400">Running</p>
            </div>
          )}
        </div>
      )}

      {/* Dropdown trigger */}
      <div className="mx-3 mb-3 relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(prev => !prev)}
          disabled={loadingLogs}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all text-xs
            ${isOpen
              ? 'border-[#11499E] bg-blue-50 ring-2 ring-[#11499E]/10'
              : 'border-gray-200 bg-gray-50 hover:border-[#11499E]/40 hover:bg-white'
            }
            disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {loadingLogs ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5 text-[#11499E] flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-gray-400">Loading...</span>
              </>
            ) : selectedLog ? (
              <>
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusConfig(selectedLog.status).dot}`} />
                <span className="text-[#11499E] font-medium truncate">{selectedLog.task_name || selectedLog.filename}</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="text-gray-400">
                  {logs.length === 0 ? 'No history yet' : `Select a task (${logs.length})`}
                </span>
              </>
            )}
          </div>
          <svg
            className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown list */}
        {isOpen && logs.length > 0 && (
          <div
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden"
            style={{ maxHeight: '220px' }}
          >
            <div className="overflow-y-auto" style={{ maxHeight: '220px', scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}>
              {logs.map((log, idx) => {
                const cfg = getStatusConfig(log.status);
                const isSelected = selectedLog?.id === log.id;
                return (
                  <button
                    key={log.id}
                    onClick={() => handleSelect(log)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors
                      ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
                      ${idx !== logs.length - 1 ? 'border-b border-gray-50' : ''}
                    `}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] font-medium truncate ${isSelected ? 'text-[#11499E]' : 'text-gray-700'}`}>
                        {log.task_name || log.filename}
                      </p>
                      <p className="text-[9px] text-gray-400 mt-0.5">
                        {formatDate(log.created_at)} · {formatTime(log.created_at)}
                      </p>
                    </div>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0 ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selected task detail card */}
      {selectedLog && (() => {
        const cfg = getStatusConfig(selectedLog.status);
        return (
          <div className="mx-3 mb-3 border border-gray-100 rounded-xl overflow-hidden bg-gray-50/50">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-white">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                <span className="text-[11px] font-semibold text-[#11499E] truncate">
                  {selectedLog.task_name || selectedLog.filename}
                </span>
              </div>
              <button onClick={() => setSelectedLog(null)}
                className="p-0.5 rounded hover:bg-gray-100 transition flex-shrink-0 ml-1">
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-3 py-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-gray-400 uppercase tracking-wider font-medium">Status</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${cfg.badge}`}>{cfg.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-gray-400 uppercase tracking-wider font-medium">Date</span>
                <span className="text-[10px] text-gray-600">{formatDate(selectedLog.created_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-gray-400 uppercase tracking-wider font-medium">Time</span>
                <span className="text-[10px] text-gray-600">{formatTime(selectedLog.created_at)}</span>
              </div>
              {selectedLog.processing_time != null && (
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-gray-400 uppercase tracking-wider font-medium">Duration</span>
                  <span className="text-[10px] text-gray-600">{selectedLog.processing_time}s</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-gray-400 uppercase tracking-wider font-medium">File</span>
                <span className="text-[10px] text-gray-600 truncate max-w-[120px]" title={selectedLog.filename}>
                  {selectedLog.filename}
                </span>
              </div>
            </div>

            {selectedLog.status.toLowerCase() === 'completed' && selectedLog.file_url && (
              <div className="px-3 pb-3">
                <button
                  onClick={() => selectedLog.file_url && handleDownload(selectedLog.file_url, selectedLog.filename)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#1E99D5] text-white text-[10px] font-semibold rounded-lg hover:bg-[#1a88bd] transition"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Result
                </button>
              </div>
            )}
          </div>
        );
      })()}

    </div>
  );
}