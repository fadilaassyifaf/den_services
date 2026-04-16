'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import Header from '@/features/iris/components/Header';
import Sidebar from '@/features/iris/components/Sidebar';
import HistoryPanel from '@/features/iris/components/HistoryPanel';
import ProgressLog from '@/features/iris/components/ProgressLog';
import { useProgress } from '@/shared/context/progress-context';
import { ImplementationIntersiteTask } from '@features/iris/sub-features/intersite/utils/implementation-intersite-task-manager';
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

// ── Read Me Modal ──────────────────────────────────────────────────────────────
function ReadMeModal({ onClose }: { onClose: () => void }) {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://10.89.12.54:8000';
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
            Transform your finalized fiber design into a detailed implementation package. The system automatically
            calculates cable BOQ, classifies route types, and specifies equipment requirements for procurement
            and installation teams — including{' '}
            <span className="font-semibold text-[#11499E]">OTB</span> and{' '}
            <span className="font-semibold text-[#11499E]">ODP</span> placement.
          </p>

          <div>
            <p className="text-xs font-bold text-[#11499E] mb-2 uppercase tracking-wide">Input Requirements</p>
            <div className="space-y-2">
              {[
                { sheet: 'Design File', desc: 'Upload your design in DEN intersite KMZ format (must include point and line geometries).' },
                { sheet: 'Device Config', desc: 'Define equipment at specific locations: OTB (Optical Terminal Box / Termination), ODP (Optical Distribution Point / Branch & Splice), or NONE (no device required).' },
              ].map(({ sheet, desc }) => (
                <div key={sheet} className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                  <span className="text-xs font-bold text-[#11499E] bg-white px-2 py-0.5 rounded-lg border border-blue-100 flex-shrink-0 font-mono">{sheet}</span>
                  <span className="text-xs text-gray-600">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-[#11499E] mb-2 uppercase tracking-wide">Task States</p>
            <div className="space-y-1.5">
              {[
                { state: 'PENDING',   color: 'bg-yellow-100 text-yellow-700 border-yellow-200', desc: 'Parsing design file' },
                { state: 'PROGRESS',  color: 'bg-blue-100 text-blue-700 border-blue-200',       desc: 'Computing BOQ and generating materials' },
                { state: 'SUCCESS',   color: 'bg-green-100 text-green-700 border-green-200',    desc: 'Implementation plan complete with BOQ' },
                { state: 'FAILURE',   color: 'bg-red-100 text-red-700 border-red-200',          desc: 'Design parsing or BOQ calculation failed' },
              ].map(({ state, color, desc }) => (
                <div key={state} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex-shrink-0 font-mono ${color}`}>{state}</span>
                  <span className="text-xs text-gray-600">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-[#11499E] mb-2 uppercase tracking-wide">Design Template</p>
            <button
              type="button"
              onClick={() => window.open(`${BACKEND_URL}/template/BOQ_Design_Sample.kmz`, '_blank')}
              className="w-full px-4 py-2.5 bg-[#1E99D5] text-white text-sm rounded-xl hover:bg-[#1a88bd] transition font-semibold flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Design Sample
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
export default function ImplementationIntersitePage() {
  const { user, loading } = useAuth(true);
  const { addTask } = useProgress(); // ✅ Ganti (window as any).__progressLogAddTask

  const [designFile, setDesignFile] = useState<File | null>(null);
  const [program, setProgram] = useState('Implementation');
  const [operator, setOperator] = useState('ioh');
  const [separator, setSeparator] = useState(';');
  const [deviceInSite, setDeviceInSite] = useState('OTB');
  const [deviceInBranch, setDeviceInBranch] = useState('ODP');
  const [iplRoute, setIplRoute] = useState('existing_fiber');
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [historyTrigger, setHistoryTrigger] = useState(0);
  const [showReadMe, setShowReadMe] = useState(false);

  const designFileRef = useRef<HTMLInputElement>(null);
  const taskManagerRef = useRef<ImplementationIntersiteTask | null>(null);

  useEffect(() => {
    taskManagerRef.current = new ImplementationIntersiteTask();
    return () => { taskManagerRef.current?.cancelPolling(); };
  }, []);

  useEffect(() => {
    if (error || success) {
      const t = setTimeout(() => { setError(''); setSuccess(''); }, 7000);
      return () => clearTimeout(t);
    }
  }, [error, success]);

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!designFile) { setError('Design file (.kmz or .kml) is required'); return; }
    if (designFile.size > 50_000_000) { setError('File too large. Maximum size is 50MB'); return; }
    if (!operator) { setError('Operator is required'); return; }
    if (!separator) { setError('Separator is required'); return; }
    if (!deviceInSite) { setError('Device in Site is required'); return; }
    if (!deviceInBranch) { setError('Device in Branch is required'); return; }
    if (!iplRoute) { setError('IPL Route is required'); return; }
    if (!taskManagerRef.current) { setError('Task manager not initialized. Refresh halaman.'); return; }

    setExecuting(true);

    const formData = new FormData();
    formData.append('design_file', designFile);
    formData.append('program', program);
    formData.append('operator', operator);
    formData.append('separator', separator);
    formData.append('device_in_site', deviceInSite);
    formData.append('device_in_branch', deviceInBranch);
    formData.append('ipl_route', iplRoute);

    try {
      const result = await taskManagerRef.current.submitTask(formData, user?.nik || 'unknown', designFile.name);

      if (result?.success && result.task_id) {
        const newTask: ActiveTask = {
          task_id: result.task_id,
          task_name: 'Implementation Intersite',
          filename: designFile.name,
          status: 'processing',
          progress: 0,
          logs: [{ timestamp: new Date().toISOString(), message: 'Task submitted, initializing...', level: 'info' }],
          created_at: new Date().toISOString(),
          user_nik: user?.nik || 'unknown',
        };
        addTask(newTask); // ✅ Konsisten dengan Fix Route
        setSuccess('Task submitted! Processing in background...');
        setExecuting(false);
        setDesignFile(null);
        setHistoryTrigger(prev => prev + 1);
        if (designFileRef.current) designFileRef.current.value = '';
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

      {showReadMe && <ReadMeModal onClose={() => setShowReadMe(false)} />}

      <div className="h-screen bg-white flex flex-col overflow-hidden">
        <Header user={user} />
        <div className="flex flex-1 overflow-hidden gap-3 p-3">
          <Sidebar activeMenu="Implementation Intersite" />

          {/* Main content card */}
          <div className="flex-1 border border-gray-200 bg-white relative flex flex-col" style={{ borderRadius: '14px' }}>

            {/* Page Header */}
            <div className="bg-white px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0 flex items-start justify-between" style={{ borderRadius: '14px 14px 0 0' }}>
              <div>
                <h1 className="text-xl font-bold text-[#11499E] mb-0.5">Implementation & BOQ Generator</h1>
                <p className="text-[#1E99D5] text-xs">Convert KMZ designs into ready-to-build plans and Bill of Quantities.</p>
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

                {/* Upload box */}
                <div
                  onClick={() => designFileRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#11499E] transition min-h-[200px] mb-6
                    ${designFile ? 'border-[#11499E] bg-blue-50' : 'border-gray-300 bg-white'}`}
                >
                  <svg className="w-8 h-8 text-[#11499E] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {designFile ? (
                    <>
                      <p className="text-xs font-semibold text-[#11499E] text-center px-4 truncate max-w-full">{designFile.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{(designFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-gray-600">Upload design file</p>
                      <p className="text-xs font-medium text-gray-600">(DEN intersite KMZ format)</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">(.kmz, .kml)</p>
                    </>
                  )}
                  <input ref={designFileRef} type="file" accept=".kmz,.kml" className="hidden"
                    onChange={(e) => setDesignFile(e.target.files?.[0] || null)} />
                </div>

                {/* Parameters grid */}
                <div className="flex flex-col gap-2 mb-3">
                  <div className="grid grid-cols-2 gap-3">

                    <Field label="Program" hint="Program name for BOQ identification">
                      <input
                        type="text" value={program} onChange={(e) => setProgram(e.target.value)}
                        placeholder="Implementation"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] text-[#11499E]"
                      />
                    </Field>

                    <Field label="Operator" hint="Operator (XL, IOH, SURGE, TSEL)" required>
                      <select
                        value={operator}
                        onChange={(e) => {
                          setOperator(e.target.value);
                          if (e.target.value === 'xl') setSeparator(';');
                          else setSeparator(';');
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] bg-white text-[#11499E]"
                      >
                        <option value="">Select Operator</option>
                        <option value="ioh">IOH</option>
                        <option value="xl">XL</option>
                        <option value="surge">SURGE</option>
                        <option value="tsel">TSEL</option>
                      </select>
                    </Field>

                    <Field label="Separator" hint="Segment endpoint separator" required>
                      <select
                        value={separator} onChange={(e) => setSeparator(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] bg-white text-[#11499E]"
                      >
                        <option value="">Select Separator</option>
                        <option value=";">; (semicolon)</option>
                        <option value="-">- (dash)</option>
                      </select>
                    </Field>

                    <Field label="IPL Route" hint="Route classification strategy" required>
                      <select
                        value={iplRoute} onChange={(e) => setIplRoute(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] bg-white text-[#11499E]"
                      >
                        <option value="">Select Route Classification</option>
                        <option value="existing_fiber">existing_fiber</option>
                        <option value="surge_763">surge_763</option>
                      </select>
                    </Field>

                    <Field label="Device in Site" hint="Device type at sites (OTB/ODP/NONE)" required>
                      <select
                        value={deviceInSite} onChange={(e) => setDeviceInSite(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] bg-white text-[#11499E]"
                      >
                        <option value="">Select Device</option>
                        <option value="OTB">OTB — Optical Terminal Box</option>
                        <option value="ODP">ODP — Optical Distribution Point</option>
                        <option value="NONE">NONE</option>
                      </select>
                    </Field>

                    <Field label="Device in Branch" hint="Device type at branches (ODP/OTB/NONE)" required>
                      <select
                        value={deviceInBranch} onChange={(e) => setDeviceInBranch(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] bg-white text-[#11499E]"
                      >
                        <option value="">Select Device</option>
                        <option value="ODP">ODP — Optical Distribution Point</option>
                        <option value="OTB">OTB — Optical Terminal Box</option>
                        <option value="NONE">NONE</option>
                      </select>
                    </Field>

                    {/* Error / Success — col-span-2 agar full lebar grid ✅ */}
                    {error && (
                      <div className="col-span-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-start gap-2">
                        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span>{error}</span>
                      </div>
                    )}
                    {success && (
                      <div className="col-span-2 px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs flex items-start gap-2">
                        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>{success}</span>
                      </div>
                    )}

                    {/* Execute Button */}
                    <div className="flex justify-end mt-2">
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