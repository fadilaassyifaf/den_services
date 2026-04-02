'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import Header from '@/features/iris/components/Header';
import Sidebar from '@/features/iris/components/Sidebar';
import HistoryPanel from '@/features/iris/components/HistoryPanel';
import ProgressLog, { ActiveTask } from '@/features/iris/components/ProgressLog';
import { BoqIntersiteTask } from '@features/iris/sub-features/report/utils/boq-intersite-task-manager';

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

export default function Page() {
  const { user, loading } = useAuth(true);

  const [iplFile, setIplFile] = useState<File | null>(null);
  const [operator, setOperator] = useState('xl');
  const [separator, setSeparator] = useState(';');
  const [programName, setProgramName] = useState('');
  const [intervalPoleM, setIntervalPoleM] = useState('80');
  const [cablePercentage, setCablePercentage] = useState('10');
  const [cableMultiplier, setCableMultiplier] = useState('1');
  const [sclcEnabled, setSclcEnabled] = useState('false');
  const [deviceInSite, setDeviceInSite] = useState('OTB');
  const [deviceInBranch, setDeviceInBranch] = useState('ODP');
  const [connectorInSite, setConnectorInSite] = useState('SC');
  const [connectorInBranch, setConnectorInBranch] = useState('SC');
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const iplFileRef = useRef<HTMLInputElement>(null);
  const taskManagerRef = useRef<BoqIntersiteTask | null>(null);

  useEffect(() => {
    taskManagerRef.current = new BoqIntersiteTask();
    return () => { taskManagerRef.current?.cancelPolling(); };
  }, []);

  useEffect(() => {
    const handleTaskError = (event: Event) => {
      const e = event as CustomEvent<{ error: string }>;
      setError(e.detail?.error || 'Task failed');
      setExecuting(false);
    };
    const handleTaskCompleted = (event: Event) => {
      const e = event as CustomEvent<{ task_id: string; download_url: string; filename: string }>;
      setExecuting(false);
      setSuccess(`Task completed! File ready: ${e.detail?.filename || 'result.zip'}`);
      if (taskManagerRef.current && e.detail?.download_url)
        taskManagerRef.current.downloadFile(e.detail.download_url, e.detail.filename);
    };
    window.addEventListener('taskError', handleTaskError);
    window.addEventListener('taskCompleted', handleTaskCompleted);
    return () => {
      window.removeEventListener('taskError', handleTaskError);
      window.removeEventListener('taskCompleted', handleTaskCompleted);
    };
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

    if (!iplFile) { setError('IPL file (.kmz or .kml) is required'); return; }
    if (iplFile.size > 100_000_000) { setError('File too large. Maximum size is 100MB'); return; }
    if (!taskManagerRef.current) { setError('Task manager not initialized. Please refresh.'); return; }

    setExecuting(true);

    const formData = new FormData();
    formData.append('ipl_file', iplFile);
    formData.append('operator', operator);
    formData.append('separator', separator);
    formData.append('program_name', programName);
    formData.append('interval_pole_m', intervalPoleM);
    formData.append('cable_percentage', cablePercentage);
    formData.append('cable_multiplier', cableMultiplier);
    formData.append('sclc_enabled', sclcEnabled);
    formData.append('device_in_site', deviceInSite);
    formData.append('device_in_branch', deviceInBranch);
    formData.append('connector_in_site', connectorInSite);
    formData.append('connector_in_branch', connectorInBranch);

    try {
      const result = await taskManagerRef.current.submitTask(formData);

      if (result?.success) {
        const newTask: ActiveTask = {
          task_id: result.task_id!,
          task_name: 'BOQ Intersite',
          filename: iplFile.name,
          status: 'processing',
          progress: 0,
          logs: [{ timestamp: new Date().toISOString(), message: 'Task submitted to backend, initializing...', level: 'info' }],
          created_at: new Date().toISOString(),
          user_nik: user?.nik || 'unknown',
        };
        if ((window as any).__progressLogAddTask) (window as any).__progressLogAddTask(newTask);
        setSuccess('Task submitted successfully! Processing in background...');
        setIplFile(null);
        if (iplFileRef.current) iplFileRef.current.value = '';
      } else {
        setError(result?.error || 'Failed to submit task');
        setExecuting(false);
      }
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to connect to backend service.'));
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
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <Header user={user} />
      <div className="flex flex-1 overflow-hidden gap-3 p-3">
        <Sidebar activeMenu="BoQ Intersite Route" />

        <div className="flex-1 overflow-y-auto border border-gray-200 bg-white relative" style={{ borderRadius: '14px' }}>

          <div className="sticky top-0 z-10 bg-white px-5 pt-5 pb-4 border-b border-gray-100">
            <h1 className="text-xl font-bold text-[#11499E] mb-0.5">BOQ Intersite</h1>
            <p className="text-[#1E99D5] text-xs m-0">Create BOQ Report based on Implementation KMZ</p>
          </div>

          <div className="p-5">
            <form onSubmit={handleExecute}>

              {/* Upload + Notes */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div
                  onClick={() => iplFileRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-[#11499E] transition ${iplFile ? 'border-[#11499E] bg-blue-50' : 'border-gray-300'}`}
                >
                  <svg className="w-6 h-6 text-[#11499E] mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-xs font-medium text-gray-700 text-center">
                    {iplFile ? <span className="text-[#11499E] font-semibold">{iplFile.name}</span> : 'Upload IPL file'}
                  </p>
                  <p className="text-[10px] text-gray-400">(.kmz, .kml)</p>
                  {iplFile && <p className="text-[9px] text-gray-500 mt-1">{(iplFile.size / 1024 / 1024).toFixed(2)} MB</p>}
                  <input ref={iplFileRef} type="file" accept=".kmz,.kml" className="hidden"
                    onChange={(e) => setIplFile(e.target.files?.[0] || null)} />
                </div>

                <div>
                  <p className="text-xs font-bold text-[#11499E] mb-1.5">Notes:</p>
                  <ul className="text-[10px] text-[#11499E] space-y-0.5 list-disc list-inside mb-3">
                    <li>KMZ must contain <strong>Connection, Route, FO Hub, Site List, Route Backbone, Route Akses, Pole Eksisting, FO Existing</strong>.</li>
                    <li>Make sure design follows DEN intersite standard.</li>
                    <li>BOQ report will be generated automatically.</li>
                    <li>SCLC enabled will add SCLC calculation to BOQ.</li>
                  </ul>
                  <p className="text-[10px] font-semibold text-[#11499E] mb-1">Input KMZ Sample</p>
                  <button
                    type="button"
                    onClick={() => window.open('http://10.83.10.16:8000/template/BOQ_Design_Sample.kmz', '_blank')}
                    className="w-full px-3 py-1.5 bg-[#1E99D5] text-white text-xs rounded-lg hover:bg-[#1a88bd] transition font-medium flex items-center justify-center"
                  >
                    Download Sample
                  </button>
                </div>
              </div>

              {/* Parameters */}
              <div className="grid grid-cols-2 gap-3 mb-5">

                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-[#11499E] mb-1.5">
                    Operator
                    <span className="text-gray-400 text-[10px] cursor-help" title="Operator to generate BoQ report">ⓘ</span>
                  </label>
                  <select
                    value={operator}
                    onChange={(e) => {
                      setOperator(e.target.value);
                      if (e.target.value === 'ioh') setSeparator('-');
                      else if (e.target.value === 'xl') setSeparator(';');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] bg-white text-[#11499E]"
                  >
                    <option value="xl">xl</option>
                    <option value="ioh">ioh</option>
                    <option value="surge">surge</option>
                    <option value="tsel">tsel</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-[#11499E] mb-1.5">
                    Separator
                    <span className="text-gray-400 text-[10px] cursor-help" title="Separator for segment near end and far end">ⓘ</span>
                  </label>
                  <select
                    value={separator}
                    onChange={(e) => setSeparator(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] bg-white text-[#11499E]"
                  >
                    <option value=";">;</option>
                    <option value="-">-</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="flex items-center gap-1 text-xs font-medium text-[#11499E] mb-1.5">
                    Program Name
                    <span className="text-gray-400 text-[10px] cursor-help" title="Program name to write into BOQ">ⓘ</span>
                  </label>
                  <input
                    type="text"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    placeholder="Enter project name..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] text-[#11499E]"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-[#11499E] mb-1.5">
                    Interval Pole (m)
                    <span className="text-gray-400 text-[10px] cursor-help" title="Interval between pole in meters">ⓘ</span>
                  </label>
                  <input
                    type="number"
                    value={intervalPoleM}
                    onChange={(e) => setIntervalPoleM(e.target.value)}
                    placeholder="80"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] text-[#11499E]"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-[#11499E] mb-1.5">
                    Cable Percentage (%)
                    <span className="text-gray-400 text-[10px] cursor-help" title="Cable percentage to calculate FO cable distance">ⓘ</span>
                  </label>
                  <input
                    type="number"
                    value={cablePercentage}
                    onChange={(e) => setCablePercentage(e.target.value)}
                    placeholder="10"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] text-[#11499E]"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-[#11499E] mb-1.5">
                    Cable Multiplier
                    <span className="text-gray-400 text-[10px] cursor-help" title="Multiplier for calculate FO cable distance">ⓘ</span>
                  </label>
                  <input
                    type="number"
                    value={cableMultiplier}
                    onChange={(e) => setCableMultiplier(e.target.value)}
                    placeholder="1"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] text-[#11499E]"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-[#11499E] mb-1.5">
                    SCLC Enabled
                    <span className="text-gray-400 text-[10px] cursor-help" title="Enable SCLC calculation in BOQ">ⓘ</span>
                  </label>
                  <select
                    value={sclcEnabled}
                    onChange={(e) => setSclcEnabled(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] bg-white text-[#11499E]"
                  >
                    <option value="false">False</option>
                    <option value="true">True</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-[#11499E] mb-1.5">
                    Device in Site
                    <span className="text-gray-400 text-[10px] cursor-help" title="Device to place in site if BOQ is True">ⓘ</span>
                  </label>
                  <select
                    value={deviceInSite}
                    onChange={(e) => setDeviceInSite(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] bg-white text-[#11499E]"
                  >
                    <option value="OTB">OTB</option>
                    <option value="ODP">ODP</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-[#11499E] mb-1.5">
                    Device in Branch
                    <span className="text-gray-400 text-[10px] cursor-help" title="Device to place in branch">ⓘ</span>
                  </label>
                  <input
                    type="text"
                    value={deviceInBranch}
                    onChange={(e) => setDeviceInBranch(e.target.value)}
                    placeholder="ODP"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] text-[#11499E]"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-[#11499E] mb-1.5">
                    Connector in Site
                    <span className="text-gray-400 text-[10px] cursor-help" title="Connector to used in site">ⓘ</span>
                  </label>
                  <input
                    type="text"
                    value={connectorInSite}
                    onChange={(e) => setConnectorInSite(e.target.value)}
                    placeholder="SC"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] text-[#11499E]"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-[#11499E] mb-1.5">
                    Connector in Branch
                    <span className="text-gray-400 text-[10px] cursor-help" title="Connector to used in branch">ⓘ</span>
                  </label>
                  <input
                    type="text"
                    value={connectorInBranch}
                    onChange={(e) => setConnectorInBranch(e.target.value)}
                    placeholder="SC"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#11499E] text-[#11499E]"
                  />
                </div>

              </div>

              {error && (
                <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-start gap-2">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="mb-3 px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs flex items-start gap-2">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{success}</span>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={executing}
                  className="px-10 py-2 bg-[#11499E] text-white font-semibold rounded-xl hover:bg-[#0d3a7d] transition disabled:opacity-60 disabled:cursor-not-allowed text-sm shadow-sm"
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

            </form>
          </div>
        </div>

        <div className="w-80 flex flex-col gap-3 overflow-y-auto">
          <ProgressLog userNik={user.nik} />
          <HistoryPanel userNik={user.nik} />
        </div>
      </div>
    </div>
  );
}