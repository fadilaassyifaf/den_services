'use client';

import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/shared/hooks/useAuth';
import Header from '@/features/iris/components/Header';
import Sidebar from '@/features/iris/components/Sidebar';
import HistoryPanel from '@/features/iris/components/HistoryPanel';
import ProgressLog from '@/features/iris/components/ProgressLog';
import { useProgress } from '@/shared/context/progress-context';
import { FixRouteTask } from '@features/iris/sub-features/intersite/utils/fix-route-task-manager';
import type { ActiveTask } from '@/core/types/task.types';

function extractErrorMessage(err: unknown, fallback = 'An error occurred'): string {
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    if (typeof e.message === 'string') return e.message;
    if (typeof e.detail === 'string') return e.detail;
    if (typeof e.error === 'string') return e.error;
    try { return JSON.stringify(err); } catch { return fallback; }
  }
  return fallback;
}

// ── Excel Preview Modal ────────────────────────────────────────────────────────
interface SheetData {
  name: string;
  headers: string[];
  rows: string[][];
}

function ExcelPreviewModal({ file, onClose }: { file: File; onClose: () => void }) {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const parsed: SheetData[] = workbook.SheetNames.map((name: string) => {
          const ws = workbook.Sheets[name];
          const json: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          const headers = (json[0] || []).map(String);
          const rows = json.slice(1).map(row =>
            headers.map((_, i) => String((row as any)[i] ?? ''))
          );
          return { name, headers, rows };
        });
        setSheets(parsed);
        setLoading(false);
      } catch {
        setError('Gagal membaca file Excel');
        setLoading(false);
      }
    };
    reader.onerror = () => { setError('Gagal membaca file'); setLoading(false); };
    reader.readAsArrayBuffer(file);
  }, [file]);

  const current = sheets[activeSheet];
  const PREVIEW_ROWS = 50;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: '85vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-[#11499E]">Preview File Excel</h2>
            <p className="text-xs text-gray-400 mt-0.5">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {sheets.length > 1 && (
          <div className="flex gap-1 px-6 pt-3 pb-0 border-b border-gray-100 flex-shrink-0 overflow-x-auto">
            {sheets.map((s, i) => (
              <button key={i} onClick={() => setActiveSheet(i)}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-lg border-b-2 transition whitespace-nowrap ${
                  activeSheet === i ? 'border-[#11499E] text-[#11499E] bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {s.name}
              </button>
            ))}
          </div>
        )}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex items-center justify-center h-48 gap-3">
              <svg className="animate-spin w-6 h-6 text-[#11499E]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm text-gray-500">Membaca file...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-48 gap-2 text-red-500">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          ) : current ? (
            <>
              <div className="flex items-center gap-4 px-6 py-2.5 bg-gray-50 border-b border-gray-100 flex-shrink-0">
                <span className="text-[11px] text-gray-500"><span className="font-semibold text-[#11499E]">{current.rows.length}</span> rows</span>
                <span className="text-[11px] text-gray-500"><span className="font-semibold text-[#11499E]">{current.headers.length}</span> columns</span>
                {current.rows.length > PREVIEW_ROWS && (
                  <span className="text-[11px] text-amber-500 font-medium">Menampilkan {PREVIEW_ROWS} dari {current.rows.length} baris</span>
                )}
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className="bg-[#11499E] text-white px-3 py-2 text-center font-semibold border-r border-blue-400 w-10 sticky left-0">#</th>
                      {current.headers.map((h, i) => (
                        <th key={i} className="bg-[#11499E] text-white px-4 py-2 text-left font-semibold whitespace-nowrap border-r border-blue-400 last:border-r-0">
                          {h || `Col ${i + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {current.rows.slice(0, PREVIEW_ROWS).map((row, ri) => (
                      <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                        <td className="px-3 py-2 text-center text-gray-400 font-mono border-r border-gray-100 sticky left-0 bg-inherit">{ri + 1}</td>
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-4 py-2 text-gray-600 border-r border-gray-100 last:border-r-0 max-w-[200px] truncate" title={cell}>
                            {cell || <span className="text-gray-300">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Sheet kosong</div>
          )}
        </div>
        <div className="px-6 py-3 border-t border-gray-100 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2 bg-[#11499E] text-white text-sm font-semibold rounded-xl hover:bg-[#0d3a7d] transition">Tutup</button>
        </div>
      </div>
    </div>
  );
}

// ── Read Me Modal ──────────────────────────────────────────────────────────────
function ReadMeModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: '80vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#11499E] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-[#11499E]">How it Works</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <p className="text-sm text-gray-600 leading-relaxed">
            The system validates your <span className="font-semibold text-[#11499E]">NE (Network Equipment)</span> and{' '}
            <span className="font-semibold text-[#11499E]">FE (Far Equipment)</span> endpoints to design the most
            efficient fiber ring routes. It automatically identifies{' '}
            <span className="font-semibold text-[#11499E]">SPOF (Single Point of Failure)</span> segments and generates
            a complete design output for your project.
          </p>
          <div>
            <p className="text-xs font-bold text-[#11499E] mb-2 uppercase tracking-wide">Required Excel Columns</p>
            <p className="text-xs text-gray-500 mb-3">Ensure your upload includes these specific headers:</p>
            <div className="space-y-2">
              {[
                { col: 'NE_ID', desc: 'Unique identifier for the Network Equipment.' },
                { col: 'FE_ID', desc: 'Unique identifier for the Far Equipment.' },
                { col: 'ring_name', desc: 'The designated name or ID for the specific ring.' },
              ].map(({ col, desc }) => (
                <div key={col} className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                  <span className="text-xs font-bold text-[#11499E] bg-white px-2 py-0.5 rounded-lg border border-blue-100 flex-shrink-0 font-mono">{col}</span>
                  <span className="text-xs text-gray-600">{desc}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-[#11499E] mb-2 uppercase tracking-wide">Template</p>
            <button
              type="button"
              onClick={() => window.open('http://10.89.12.54:8000/template/intersite/Template_Fixed_Route.xlsx', '_blank')}
              className="w-full px-4 py-2.5 bg-[#1E99D5] text-white text-sm rounded-xl hover:bg-[#1a88bd] transition font-semibold flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Template
            </button>
          </div>
        </div>
        <div className="px-6 py-3 border-t border-gray-100 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2 bg-[#11499E] text-white text-sm font-semibold rounded-xl hover:bg-[#0d3a7d] transition">Tutup</button>
        </div>
      </div>
    </div>
  );
}

// ── Field wrapper with label + hint ───────────────────────────────────────────
function Field({ label, hint, required, children }: {
  label: string;
  hint: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#11499E] leading-tight">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </p>
      <p className="text-[10px] text-[#1E99D5] mb-1.5">{hint}</p>
      {children}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Page() {
  const { user, loading } = useAuth(true);
  const { addTask } = useProgress();

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [spofThreshold, setSpofThreshold] = useState('');
  const [spofThresholdError, setSpofThresholdError] = useState('');
  const [program, setProgram] = useState('');
  const [operator, setOperator] = useState('');
  const [separator, setSeparator] = useState('');
  const [routePreference, setRoutePreference] = useState('');
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [historyTrigger, setHistoryTrigger] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [showReadMe, setShowReadMe] = useState(false);

  const excelFileRef = useRef<HTMLInputElement>(null);
  const taskManagerRef = useRef<FixRouteTask | null>(null);

  useEffect(() => {
    taskManagerRef.current = new FixRouteTask();
    return () => { taskManagerRef.current?.cancelPolling(); };
  }, []);

  useEffect(() => {
    if (error || success) {
      const t = setTimeout(() => { setError(''); setSuccess(''); }, 7000);
      return () => clearTimeout(t);
    }
  }, [error, success]);

  const handleIntegerInput = (value: string, setter: (v: string) => void, errorSetter: (e: string) => void) => {
    if (value === '') { setter(''); errorSetter('This field is required'); return; }
    if (!/^\d+$/.test(value)) { errorSetter('Only whole numbers are allowed'); setter(value.replace(/[^\d]/g, '')); return; }
    setter(value); errorSetter('');
  };

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!excelFile) { setError('Excel file (.xlsx) is required'); return; }
    if (excelFile.size > 50_000_000) { setError('File terlalu besar. Maksimal 50MB'); return; }
    let hasFieldError = false;
    if (!spofThreshold) { setSpofThresholdError('SPOF Threshold is required'); hasFieldError = true; }
    if (spofThresholdError) hasFieldError = true;
    if (hasFieldError) return;
    if (!taskManagerRef.current) { setError('Task manager not initialized. Refresh halaman.'); return; }
    setExecuting(true);
    const formData = new FormData();
    formData.append('excel_file', excelFile);
    formData.append('spof_threshold', String(parseInt(spofThreshold, 10)));
    formData.append('program', program);
    formData.append('operator', operator);
    formData.append('separator', separator);
    formData.append('route_preference', routePreference);
    try {
      const result = await taskManagerRef.current.submitTask(formData, user?.nik || 'unknown', excelFile.name);
      if (result?.success && result.task_id) {
        const newTask: ActiveTask = {
          task_id: result.task_id,
          task_name: 'Fixroute Ring',
          filename: excelFile.name,
          status: 'processing',
          progress: 0,
          logs: [{ timestamp: new Date().toISOString(), message: 'Task submitted, initializing...', level: 'info' }],
          created_at: new Date().toISOString(),
          user_nik: user?.nik || 'unknown',
        };
        addTask(newTask);
        setSuccess('Task submitted! Processing in background...');
        setExecuting(false);
        setExcelFile(null);
        setHistoryTrigger(prev => prev + 1);
        if (excelFileRef.current) excelFileRef.current.value = '';
      } else {
        setError(result?.error || 'Failed to submit task');
        setExecuting(false);
      }
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to connect to backend.'));
      setExecuting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <svg className="animate-spin w-8 h-8 text-[#11499E]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <div className="text-[#11499E] font-medium">Loading...</div>
      </div>
    </div>
  );

  if (!user) return null;

  return (
    <>
      <style>{`
        .minimal-scroll::-webkit-scrollbar { width: 4px; }
        .minimal-scroll::-webkit-scrollbar-track { background: transparent; }
        .minimal-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
        .minimal-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .minimal-scroll { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
      `}</style>

      {showPreview && excelFile && <ExcelPreviewModal file={excelFile} onClose={() => setShowPreview(false)} />}
      {showReadMe && <ReadMeModal onClose={() => setShowReadMe(false)} />}

      <div className="h-screen bg-white flex flex-col overflow-hidden">
        <Header user={user} />
        <div className="flex flex-1 overflow-hidden gap-3 p-3">
          <Sidebar activeMenu="Fixroute Ring" />

          {/* Main content card */}
          <div className="flex-1 border border-gray-200 bg-white relative flex flex-col" style={{ borderRadius: '14px' }}>

            {/* Page Header */}
            <div className="bg-white px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0 flex items-start justify-between" style={{ borderRadius: '14px 14px 0 0' }}>
              <div>
                <h1 className="text-xl font-bold text-[#11499E] mb-0.5">Fixroute Ring</h1>
                <p className="text-[#1E99D5] text-xs">Design fiber rings by fixing and optimizing routes between specified endpoints.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowReadMe(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#1E99D5] text-white text-xs font-semibold rounded-xl hover:bg-[#0d3a7d] transition flex-shrink-0"
              >
                Read Me
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto minimal-scroll px-5 pt-4 pb-5">
              <form onSubmit={handleExecute}>

                  {/* ── LEFT: Upload ── */}
                  <div className="flex flex-col gap-3">

                    {/* Upload box */}
                    <div
                      onClick={() => excelFileRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#11499E] transition min-h-[200px] mb-6
                        ${excelFile ? 'border-[#11499E] bg-blue-50' : 'border-gray-300 bg-white'}`}
                    >
                      <svg className="w-8 h-8 text-[#11499E] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      {excelFile ? (
                        <>
                          <p className="text-xs font-semibold text-[#11499E] text-center px-4 truncate max-w-full">{excelFile.name}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{(excelFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setShowPreview(true); }}
                            className="mt-2 flex items-center gap-1 px-3 py-1 border border-[#1E99D5] text-[#1E99D5] text-[10px] font-medium rounded-lg hover:bg-[#1E99D5]/10 transition"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Preview Data
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="text-xs font-medium text-gray-600">Upload your site list </p>
                          <p className="text-xs font-medium text-gray-600">(Excel file with NE/FE endpoints and ring info) </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">(.xlsx)</p>
                        </>
                      )}
                      <input ref={excelFileRef} type="file" accept=".xlsx,.xls" className="hidden"
                        onChange={(e) => setExcelFile(e.target.files?.[0] || null)} />
                    </div>
                  </div>
                  
                {/* ── Two-column layout ── */}
                <div className="flex flex-col gap-2 mb-3">

                  {/* ── RIGHT: Form inputs ── */}
                  <div className="grid grid-cols-2 gap-3">

                    {/* SPOF Threshold */}
                    <Field label="SPOF Threshold" hint="SPOF threshold (meters)" required>
                      <input
                        type="text" inputMode="numeric" pattern="\d*" value={spofThreshold}
                        onChange={(e) => handleIntegerInput(e.target.value, setSpofThreshold, setSpofThresholdError)}
                        placeholder="Input Value"
                        className={`w-full px-3 py-2 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] text-[#11499E]
                          ${spofThresholdError ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                      />
                      {spofThresholdError && (
                        <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                          <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          {spofThresholdError}
                        </p>
                      )}
                    </Field>

                    {/* Program */}
                    <Field label="Program" hint="Program name for identification">
                      <input
                        type="text" value={program} onChange={(e) => setProgram(e.target.value)}
                        placeholder="Type Here"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] text-[#11499E]"
                      />
                    </Field>

                    {/* Operator */}
                    <Field label="Operator" hint="Telecom operator">
                      <select
                        value={operator} onChange={(e) => setOperator(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] bg-white text-[#11499E]"
                      >
                        <option value="">Select Operator</option>
                        <option value="ioh">ioh</option>
                        <option value="xl">xl</option>
                        <option value="surge">surge</option>
                        <option value="tsel">tsel</option>
                      </select>
                    </Field>

                    {/* Separator */}
                    <Field label="Separator" hint="Segment endpoint separator">
                      <select
                        value={separator} onChange={(e) => setSeparator(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] bg-white text-[#11499E]"
                      >
                        <option value="">Select Separator</option>
                        <option value=";">;</option>
                        <option value="-">-</option>
                      </select>
                    </Field>

                    {/* Route Preferences */}
                    <Field label="Route Preferences" hint="Route optimization strategy">
                      <select
                        value={routePreference} onChange={(e) => setRoutePreference(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] bg-white text-[#11499E]"
                      >
                        <option value="">Select Route Preference</option>
                        <option value="existing_fiber">existing_fiber</option>
                        <option value="weighted_road">weighted_road</option>
                        <option value="shortest_route">shortest_route</option>
                        <option value="surge_763">surge_763</option>
                      </select>
                    </Field>

                    {/* Error / Success */}
                    {error && (
                      <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-start gap-2">
                        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span>{error}</span>
                      </div>
                    )}
                    {success && (
                      <div className="px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs flex items-start gap-2">
                        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>{success}</span>
                      </div>
                    )}

                    {/* Execute — sejajar dengan Download Template di kiri */}
                    <div className="flex justify-end items-end mt-5">
                      <button
                        type="submit" disabled={executing}
                        className="px-10 h-8 flex items-center justify-center bg-[#11499E] text-white font-semibold rounded-xl hover:bg-[#0d3a7d] transition disabled:opacity-60 disabled:cursor-not-allowed text-sm shadow-sm"
                      >
                        {executing ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Executing...
                          </span>
                        ) : 'Execute'}
                      </button>
                    </div>

                  </div>
                  {/* ── end RIGHT ── */}
                </div>
              </form>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="w-64 flex flex-col gap-3 overflow-y-auto minimal-scroll">
            <HistoryPanel userNik={user.nik} refreshTrigger={historyTrigger} />
            <ProgressLog userNik={user.nik} />
          </div>
        </div>
      </div>
    </>
  );
}