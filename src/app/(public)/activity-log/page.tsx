'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import Header from '@/features/iris/components/Header';

// Pastikan string diparsing sebagai UTC — PostgreSQL mengembalikan tanpa 'Z'
const toUTC = (iso: string) =>
  iso.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(iso) ? iso : `${iso}Z`;

// ── Types ──────────────────────────────────────────────────────────────────────

interface ActivityLog {
  id:               number;
  user_id:          number;
  username:         string;
  fullname:         string;
  service_name:     string;
  service_router:   string;
  status:           string;

  // File input
  upload_file:      string;
  upload_file_path: string | null;
  upload_extension: string | null;

  // File output
  result_path:      string | null;
  result_filename:  string | null;
  result_extension: string | null;

  processing_time:  number | null;
  created_at:       string;
  updated_at:       string;
  module_id:        number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { dot: string; badge: string; label: string }> = {
  completed:  { dot: 'bg-[#1E99D5]', badge: 'bg-[#1E99D5]/10 text-[#1E99D5] border-[#1E99D5]/20', label: 'Completed'  },
  success:    { dot: 'bg-[#1E99D5]', badge: 'bg-[#1E99D5]/10 text-[#1E99D5] border-[#1E99D5]/20', label: 'Completed'  },
  processing: { dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-600 border-amber-200',          label: 'Processing' },
  failed:     { dot: 'bg-red-400',   badge: 'bg-red-50 text-red-500 border-red-100',                label: 'Failed'     },
  pending:    { dot: 'bg-gray-300',  badge: 'bg-gray-50 text-gray-500 border-gray-200',             label: 'Queued'     },
};

// Extension → warna badge file
const EXT_COLOR: Record<string, string> = {
  zip:     'bg-yellow-50 text-yellow-700 border-yellow-200',
  xlsx:    'bg-green-50 text-green-700 border-green-200',
  csv:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  pdf:     'bg-red-50 text-red-600 border-red-200',
  json:    'bg-purple-50 text-purple-700 border-purple-200',
  png:     'bg-pink-50 text-pink-600 border-pink-200',
  jpg:     'bg-pink-50 text-pink-600 border-pink-200',
  kmz:     'bg-blue-50 text-blue-700 border-blue-200',
  parquet: 'bg-purple-50 text-purple-700 border-purple-200',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function extractFilename(path: string): string {
  if (!path) return '—';
  const parts = path.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || path;
}

function FileChip({
  filename,
  extension,
  fullPath,
}: {
  filename:  string | null;
  extension: string | null;
  fullPath:  string | null;
}) {
  if (!filename && !fullPath) {
    return <span className="text-[10px] text-gray-300">—</span>;
  }

  const displayName = filename || extractFilename(fullPath ?? '');
  const ext         = (extension ?? displayName.split('.').pop() ?? '').toLowerCase();
  const colorClass  = EXT_COLOR[ext] ?? 'bg-gray-50 text-gray-600 border-gray-200';

  return (
    <span
      title={fullPath ?? filename ?? ''}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono font-medium max-w-[140px] truncate cursor-default ${colorClass}`}
    >
      {ext && (
        <span className="font-bold uppercase text-[9px] flex-shrink-0">{ext}</span>
      )}
      <span className="truncate">{displayName}</span>
    </span>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ActivityLogPage() {
  const { user, loading: authLoading } = useAuth(true);

  const [logs, setLogs]                   = useState<ActivityLog[]>([]);
  const [loading, setLoading]             = useState(true);
  const [searchName, setSearchName]       = useState('');
  const [searchService, setSearchService] = useState('');
  const [filterStatus, setFilterStatus]   = useState('all');
  const [sortOrder, setSortOrder]         = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage]     = useState(1);
  const logsPerPage = 10;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/activity-log');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching activity log:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) fetchLogs();
  }, [authLoading, user, fetchLogs]);

  // ── Filter + Sort ──────────────────────────────────────────────────────────

  const filtered = logs
    .filter((log) => {
      const matchName =
        searchName === '' ||
        log.fullname.toLowerCase().includes(searchName.toLowerCase()) ||
        log.username.toLowerCase().includes(searchName.toLowerCase());
      const matchService =
        searchService === '' ||
        log.service_name.toLowerCase().includes(searchService.toLowerCase());
      const matchStatus =
        filterStatus === 'all' || log.status.toLowerCase() === filterStatus;
      return matchName && matchService && matchStatus;
    })
    .sort((a, b) => {
      const diff = new Date(toUTC(a.created_at)).getTime() - new Date(toUTC(b.created_at)).getTime();
      return sortOrder === 'desc' ? -diff : diff;
    });

  const totalPages = Math.ceil(filtered.length / logsPerPage);
  const paginated  = filtered.slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage);

  // ── Formatters ─────────────────────────────────────────────────────────────

  const formatDate = (iso: string) =>
    new Date(toUTC(iso)).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatTime = (iso: string) =>
    new Date(toUTC(iso)).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  // ── Download handler ───────────────────────────────────────────────────────

  const handleDownload = async (filePath: string, filename: string) => {
    try {
      const proxyUrl = `/api/iris/files/download?path=${encodeURIComponent(filePath)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const a    = document.createElement('a');
      a.href     = window.URL.createObjectURL(blob);
      a.download = filename || 'result';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(a.href);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = {
    total:      logs.length,
    completed:  logs.filter((l) => l.status === 'completed' || l.status === 'success').length,
    processing: logs.filter((l) => l.status === 'processing').length,
    failed:     logs.filter((l) => l.status === 'failed').length,
  };

  // ── Auth guard ─────────────────────────────────────────────────────────────

  if (authLoading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <svg className="animate-spin w-8 h-8 text-[#11499E]" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>
  );

  if (!user) return null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen bg-[#F0F4FA] flex flex-col overflow-hidden">
      <Header user={user} />

      <div className="flex flex-1 overflow-hidden gap-4 p-4 max-w-[1600px] mx-auto w-full">

        {/* ── LEFT SIDEBAR ───────────────────────────────────────────── */}
        <div className="w-48 flex-shrink-0 flex flex-col gap-3">

          {/* User Card */}
          <div className="p-4 bg-[#11499E] rounded-2xl shadow-sm relative overflow-hidden flex items-center justify-center" style={{ minHeight: 160 }}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-bl-full pointer-events-none" />
            <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-white/5 rounded-tr-full pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center text-center gap-2 w-full">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <span className="text-white font-bold text-xl">{user.name.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">{user.name}</p>
                <p className="text-blue-200 text-[11px] mt-0.5">@{user.username}</p>
              </div>
              <span className="px-2 py-0.5 bg-white/20 text-white rounded-full text-[10px] font-semibold uppercase tracking-wide">
                {user.role}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Total',      value: stats.total,      color: 'text-[#11499E]' },
              { label: 'Done',       value: stats.completed,  color: 'text-[#1E99D5]' },
              { label: 'Processing', value: stats.processing, color: 'text-amber-500'  },
              { label: 'Failed',     value: stats.failed,     color: 'text-red-400'    },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-2.5 text-center">
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-gray-500 font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filter Status */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex-1 flex flex-col min-h-0">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex-shrink-0">Filter Status</p>
            <div className="flex flex-col gap-1 flex-1 overflow-y-auto min-h-0 pr-1 sidebar-scrollbar">
              {['all', 'completed', 'processing', 'failed'].map((s) => (
                <button
                  key={s}
                  onClick={() => { setFilterStatus(s); setCurrentPage(1); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between flex-shrink-0 ${
                    filterStatus === s
                      ? 'bg-[#11499E] text-white shadow-sm'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span>{s === 'all' ? 'All Status' : STATUS_CONFIG[s]?.label || s}</span>
                  {s !== 'all' && (
                    <span className={`text-[10px] font-bold tabular-nums ${filterStatus === s ? 'text-white/70' : 'text-gray-400'}`}>
                      {logs.filter((l) => l.status === s || (s === 'completed' && l.status === 'success')).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── MAIN TABLE ─────────────────────────────────────────────── */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col border border-gray-200/60 min-w-0">

          {/* Table Header bar */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
            <div>
              <h1 className="text-[#11499E] font-bold text-lg">Activity Log</h1>
              <p className="text-[#1E99D5] text-xs mt-0.5">
                All user task history ({filtered.length} records)
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Search Name */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name"
                  value={searchName}
                  onChange={(e) => { setSearchName(e.target.value); setCurrentPage(1); }}
                  className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-gray-50 focus:bg-white text-[#11499E] placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#11499E]/20 focus:border-[#11499E] transition-all w-40"
                />
                <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              {/* Search Tool */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by tool"
                  value={searchService}
                  onChange={(e) => { setSearchService(e.target.value); setCurrentPage(1); }}
                  className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-gray-50 focus:bg-white text-[#11499E] placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#11499E]/20 focus:border-[#11499E] transition-all w-40"
                />
                <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {/* Refresh */}
              <button
                onClick={fetchLogs}
                disabled={loading}
                className="p-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition disabled:opacity-50"
                title="Refresh"
              >
                <svg className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Column Headers */}
          <div className="flex-shrink-0 bg-gray-50/70 border-b border-gray-100">
            <div className="flex items-center px-5 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              <div className="w-[170px] flex-shrink-0">User</div>
              <div className="w-[170px] flex-shrink-0">Tools</div>
              <div className="w-[160px] flex-shrink-0">File Input</div>
              <div className="w-[200px] flex-shrink-0">File Output</div>
              <div className="w-[110px] flex-shrink-0">Status</div>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => { setSortOrder((s) => s === 'desc' ? 'asc' : 'desc'); setCurrentPage(1); }}
                  className="flex items-center gap-1 hover:text-[#11499E] transition-colors"
                >
                  <span>Date</span>
                  <svg
                    className={`w-3 h-3 transition-all ${sortOrder === 'asc' ? 'text-[#11499E] rotate-180' : 'text-gray-300'}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Rows */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center px-5 py-3 border-b border-gray-50 animate-pulse">
                  <div className="w-[170px] flex-shrink-0 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex-shrink-0" />
                    <div className="space-y-1 flex-1">
                      <div className="h-2.5 bg-gray-100 rounded w-20" />
                      <div className="h-2 bg-gray-100 rounded w-14" />
                    </div>
                  </div>
                  <div className="w-[170px] flex-shrink-0"><div className="h-2.5 bg-gray-100 rounded w-24" /></div>
                  <div className="w-[160px] flex-shrink-0"><div className="h-5 bg-gray-100 rounded w-24" /></div>
                  <div className="w-[200px] flex-shrink-0"><div className="h-5 bg-gray-100 rounded w-32" /></div>
                  <div className="w-[110px] flex-shrink-0"><div className="h-5 bg-gray-100 rounded-full w-20" /></div>
                  <div className="flex-1 min-w-0"><div className="h-2.5 bg-gray-100 rounded w-16" /></div>
                </div>
              ))
            ) : paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-500">No activity found</p>
                <p className="text-xs text-gray-400">Try adjusting your search or filter</p>
              </div>
            ) : (
              paginated.map((log, idx) => {
                const cfg = STATUS_CONFIG[log.status.toLowerCase()] ?? STATUS_CONFIG.pending;
                return (
                  <div
                    key={log.id}
                    className={`flex items-center px-5 py-2.5 border-b border-gray-50 hover:bg-blue-50/30 transition-colors ${
                      idx % 2 !== 0 ? 'bg-gray-50/20' : ''
                    }`}
                  >
                    {/* User */}
                    <div className="w-[170px] flex-shrink-0 flex items-center gap-2.5 pr-4">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#11499E] to-[#1E99D5] flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-white text-[11px] font-bold">
                          {log.fullname.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-700 truncate">{log.fullname}</p>
                        <p className="text-[10px] text-gray-400 truncate">@{log.username}</p>
                      </div>
                    </div>

                    {/* Tool */}
                    <div className="w-[170px] flex-shrink-0 pr-4 min-w-0">
                      <p className="text-xs font-medium text-[#11499E] truncate">{log.service_name}</p>
                      <p className="text-[10px] text-gray-400 font-mono truncate">{log.service_router}</p>
                    </div>

                    {/* File Input */}
                    <div className="w-[160px] flex-shrink-0 pr-4">
                      <FileChip
                        filename={log.upload_file || null}
                        extension={log.upload_extension}
                        fullPath={log.upload_file_path}
                      />
                    </div>

                    {/* File Output + Download */}
                    <div className="w-[200px] flex-shrink-0 pr-4 flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <FileChip
                          filename={log.result_filename}
                          extension={log.result_extension}
                          fullPath={log.result_path}
                        />
                      </div>
                      {log.result_path && log.status === 'completed' && (
                        <button
                          onClick={() => handleDownload(
                            log.result_path!,
                            log.result_filename ?? extractFilename(log.result_path!)
                          )}
                          className="flex-shrink-0 p-1.5 text-[#1E99D5] hover:bg-[#1E99D5]/10 rounded-lg transition-colors"
                          title="Download"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Status */}
                    <div className="w-[110px] flex-shrink-0 pr-4">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${cfg.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot} ${log.status === 'processing' ? 'animate-pulse' : ''}`} />
                        {cfg.label}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-600">{formatDate(log.created_at)}</p>
                      <p className="text-[10px] text-gray-400">{formatTime(log.created_at)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-white flex-shrink-0">
              <span className="text-xs text-gray-500">
                Showing {(currentPage - 1) * logsPerPage + 1}–{Math.min(currentPage * logsPerPage, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 text-xs font-semibold border border-gray-200 text-[#11499E] rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
                >
                  Prev
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p = i + 1;
                  if (totalPages > 5) {
                    if (currentPage <= 3) p = i + 1;
                    else if (currentPage >= totalPages - 2) p = totalPages - 4 + i;
                    else p = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-7 h-7 text-xs font-bold rounded-lg transition ${
                        currentPage === p ? 'bg-[#11499E] text-white' : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 text-xs font-semibold border border-gray-200 text-[#11499E] rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}