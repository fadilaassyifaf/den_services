'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import Header from '@/features/iris/components/Header';
import Sidebar from '@/features/iris/components/Sidebar';
import HistoryPanel from '@/features/iris/components/HistoryPanel';
import ProgressLog from '@/features/iris/components/ProgressLog';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://10.89.12.54:8000';

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

// Parse Content-Disposition — handle both standard and RFC 5987 (filename*=utf-8'')
function parseFilename(contentDisposition: string, fallback: string): string {
  const rfc5987 = contentDisposition.match(/filename\*=utf-8''([^;]+)/i);
  if (rfc5987) return decodeURIComponent(rfc5987[1]);
  const standard = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
  if (standard) return standard[1].replace(/['"]/g, '');
  return fallback;
}

// ── Read Me Modal ──────────────────────────────────────────────────────────────
function ReadMeModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: '85vh' }}>
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
            Generate a complete <span className="font-semibold text-[#11499E]">Bill of Quantities (BOQ)</span> report
            and cost estimates from your implementation KMZ file. Includes itemized material lists,
            equipment inventory, and cost breakdown by section.
          </p>

          <div>
            <p className="text-xs font-bold text-[#11499E] mb-2 uppercase tracking-wide">Required KMZ Folders</p>
            <div className="grid grid-cols-2 gap-1.5">
              {['Connection', 'Route', 'FO Hub', 'Site List', 'Route Backbone', 'Route Akses', 'Pole Eksisting', 'FO Existing'].map((folder) => (
                <div key={folder} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                  <span className="text-[10px] font-bold text-[#11499E] font-mono">{folder}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-[#11499E] mb-2 uppercase tracking-wide">Output (ZIP)</p>
            <div className="space-y-1.5">
              {[
                'Excel BOQ spreadsheet with itemized costs',
                'Material and equipment lists',
                'Installation requirements',
                'Cost breakdown by section',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-xs text-gray-600">
                  <svg className="w-3.5 h-3.5 text-[#1E99D5] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs font-semibold text-amber-700 mb-1">Important Notes</p>
            <ul className="text-[10px] text-amber-700 space-y-1 list-disc list-inside">
              <li>At least one device type (site or branch) must be set</li>
              <li>BOQ values depend on correct implementation geometry</li>
              <li>Costs are calculated per operator specifications</li>
              <li>SCLC enabled adds SC/LC connector calculation to BOQ</li>
            </ul>
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

// ── Field wrapper ──────────────────────────────────────────────────────────────
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
export default function BoqIntersitePage() {
  const { user, loading } = useAuth(true);

  const [iplFile, setIplFile] = useState<File | null>(null);
  const [operator, setOperator] = useState('xl');
  const [separator, setSeparator] = useState(';');
  const [programName, setProgramName] = useState('Intersite FO');
  const [intervalPoleM, setIntervalPoleM] = useState('80');
  const [cablePercentage, setCablePercentage] = useState('10');
  const [cableMultiplier, setCableMultiplier] = useState('1');
  const [deviceInSite, setDeviceInSite] = useState('OTB');
  const [deviceInBranch, setDeviceInBranch] = useState('ODP');
  const [sclcEnabled, setSclcEnabled] = useState(false);
  const [connectorInSite, setConnectorInSite] = useState('SC');
  const [connectorInBranch, setConnectorInBranch] = useState('SC');
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [historyTrigger, setHistoryTrigger] = useState(0);
  const [showReadMe, setShowReadMe] = useState(false);

  const iplFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error || success) {
      const t = setTimeout(() => { setError(''); setSuccess(''); }, 7000);
      return () => clearTimeout(t);
    }
  }, [error, success]);

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!iplFile) { setError('IPL file (.kmz or .kml) is required'); return; }
    if (iplFile.size > 100_000_000) { setError('File too large. Maximum size is 100MB'); return; }
    if (!operator) { setError('Operator is required'); return; }
    if (!separator) { setError('Separator is required'); return; }
    if (!deviceInSite && !deviceInBranch) { setError('At least one device type (site or branch) must be set'); return; }

    setExecuting(true);

    const formData = new FormData();
    formData.append('ipl_file', iplFile);
    formData.append('operator', operator);
    formData.append('separator', separator);
    if (programName.trim()) formData.append('program_name', programName.trim());
    formData.append('interval_pole_m', intervalPoleM);
    formData.append('cable_percentage', cablePercentage);
    formData.append('cable_multiplier', cableMultiplier);
    formData.append('device_in_site', deviceInSite);
    formData.append('device_in_branch', deviceInBranch);
    formData.append('sclc_enabled', String(sclcEnabled));
    formData.append('connector_in_site', connectorInSite);
    formData.append('connector_in_branch', connectorInBranch);

    try {
      const response = await fetch('/api/iris/boq-intersite', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        setError(extractErrorMessage(data, `Request failed with status ${response.status}`));
        return;
      }

      // Backend returns ZIP directly — auto-download
      const contentDisposition = response.headers.get('Content-Disposition') ?? '';
      const filename = parseFilename(
        contentDisposition,
        `BOQ_${iplFile.name.replace(/\.[^.]+$/, '')}.zip`
      );

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(`BOQ report generated: ${filename}`);
      setIplFile(null);
      if (iplFileRef.current) iplFileRef.current.value = '';
      setHistoryTrigger(prev => prev + 1);

    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to connect to backend.'));
    } finally {
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
          <Sidebar activeMenu="BoQ Intersite Route" />

          {/* Main content card */}
          <div className="flex-1 border border-gray-200 bg-white relative flex flex-col" style={{ borderRadius: '14px' }}>

            {/* Page Header */}
            <div className="bg-white px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0 flex items-start justify-between" style={{ borderRadius: '14px 14px 0 0' }}>
              <div>
                <h1 className="text-xl font-bold text-[#11499E] mb-0.5">BOQ Intersite</h1>
                <p className="text-[#1E99D5] text-xs">Generate Bill of Quantities report from implementation KMZ file.</p>
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
                  onClick={() => iplFileRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#11499E] transition min-h-[180px] mb-6
                    ${iplFile ? 'border-[#11499E] bg-blue-50' : 'border-gray-300 bg-white'}`}
                >
                  <svg className="w-8 h-8 text-[#11499E] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {iplFile ? (
                    <>
                      <p className="text-xs font-semibold text-[#11499E] text-center px-4 truncate max-w-full">{iplFile.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{(iplFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-gray-600">Upload implementation file</p>
                      <p className="text-xs font-medium text-gray-600">(DEN intersite KMZ format)</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">(.kmz, .kml)</p>
                    </>
                  )}
                  <input ref={iplFileRef} type="file" accept=".kmz,.kml" className="hidden"
                    onChange={(e) => setIplFile(e.target.files?.[0] || null)} />
                </div>

                {/* Parameters grid */}
                <div className="grid grid-cols-2 gap-3 mb-3">

                  {/* Row 1 — Operator + Separator */}
                  <Field label="Operator" hint="Operator to generate BOQ report based on" required>
                    <select value={operator} onChange={(e) => { setOperator(e.target.value); setSeparator(';'); }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] bg-white text-[#11499E]">
                      <option value="xl">XL</option>
                      <option value="ioh">IOH</option>
                      <option value="surge">SURGE</option>
                      <option value="tsel">TSEL</option>
                    </select>
                  </Field>

                  <Field label="Separator" hint="Segment endpoint separator" required>
                    <select value={separator} onChange={(e) => setSeparator(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] bg-white text-[#11499E]">
                      <option value=";">; (semicolon)</option>
                      <option value="-">- (dash)</option>
                    </select>
                  </Field>

                  {/* Row 2 — Program Name (full width) */}
                  <div className="col-span-2">
                    <Field label="Program Name" hint="Program identifier written into BOQ report">
                      <input type="text" value={programName} onChange={(e) => setProgramName(e.target.value)}
                        placeholder="Intersite FO"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] text-[#11499E]" />
                    </Field>
                  </div>

                  {/* Row 3 — Numeric params */}
                  <Field label="Interval Pole (m)" hint="Distance between poles in meters">
                    <input type="number" value={intervalPoleM} onChange={(e) => setIntervalPoleM(e.target.value)}
                      min="1" placeholder="80"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] text-[#11499E]" />
                  </Field>

                  <Field label="Cable Percentage (%)" hint="Extra cable percentage for FO distance calculation">
                    <input type="number" value={cablePercentage} onChange={(e) => setCablePercentage(e.target.value)}
                      min="0" max="100" placeholder="10"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] text-[#11499E]" />
                  </Field>

                  <Field label="Cable Multiplier" hint="Distance multiplier for FO cable calculation">
                    <input type="number" value={cableMultiplier} onChange={(e) => setCableMultiplier(e.target.value)}
                      min="1" step="1" placeholder="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] text-[#11499E]" />
                  </Field>

                  {/* SCLC toggle */}
                  <Field label="SCLC Enabled" hint="Enable SC/LC connector calculation in BOQ">
                    <select value={String(sclcEnabled)} onChange={(e) => setSclcEnabled(e.target.value === 'true')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] bg-white text-[#11499E]">
                      <option value="false">False</option>
                      <option value="true">True</option>
                    </select>
                  </Field>

                  {/* Device section */}
                  <Field label="Device in Site" hint="Equipment type at site locations" required>
                    <select value={deviceInSite} onChange={(e) => setDeviceInSite(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] bg-white text-[#11499E]">
                      <option value="OTB">OTB — Optical Terminal Box</option>
                      <option value="ODP">ODP — Optical Distribution Point</option>
                      <option value="NONE">NONE</option>
                    </select>
                  </Field>

                  <Field label="Device in Branch" hint="Equipment type at branch locations" required>
                    <select value={deviceInBranch} onChange={(e) => setDeviceInBranch(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] bg-white text-[#11499E]">
                      <option value="ODP">ODP — Optical Distribution Point</option>
                      <option value="OTB">OTB — Optical Terminal Box</option>
                      <option value="NONE">NONE</option>
                    </select>
                  </Field>

                  {/* Connector section — only shown when SCLC enabled */}
                  {sclcEnabled && (
                    <>
                      <Field label="Connector in Site" hint="Connector type used at site locations">
                        <select value={connectorInSite} onChange={(e) => setConnectorInSite(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] bg-white text-[#11499E]">
                          <option value="SC">SC</option>
                          <option value="FC">FC</option>
                        </select>
                      </Field>

                      <Field label="Connector in Branch" hint="Connector type used at branch locations">
                        <select value={connectorInBranch} onChange={(e) => setConnectorInBranch(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] bg-white text-[#11499E]">
                          <option value="SC">SC</option>
                          <option value="FC">FC</option>
                        </select>
                      </Field>
                    </>
                  )}

                  {/* Messages */}
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

                  <div className="col-span-2 flex justify-end mt-2">
                    <button type="submit" disabled={executing}
                      className="px-10 h-8 flex items-center justify-center bg-[#11499E] text-white font-semibold rounded-xl hover:bg-[#0d3a7d] transition disabled:opacity-60 disabled:cursor-not-allowed text-sm shadow-sm">
                      {executing ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Generating...
                        </span>
                      ) : 'Execute'}
                    </button>
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
