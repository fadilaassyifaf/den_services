'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/shared/context/AuthContext';
import Header from '@/features/iris/components/Header';
import ModuleGuard from '@/features/iris/components/ModuleGuard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Module {
  id: number;
  module_name: string;
}

interface User {
  id: number;   // ← tambah ini
  nik: string;
  email: string;
  name: string;
  role: string;
  modules: Module[];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccessManagementPage() {
  const { user: currentUser, loading: authLoading } = useAuthContext();

  const [users, setUsers] = useState<User[]>([]);
  const [allModules, setAllModules] = useState<Module[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 8;

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/users', { credentials: 'include' });
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch (err) {
      console.error('[AccessManagement] fetchUsers:', err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  const fetchModules = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/modules', { credentials: 'include' });
      const data = await res.json();
      setAllModules(data.modules ?? []);
    } catch (err) {
      console.error('[AccessManagement] fetchModules:', err);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !currentUser) return;
    fetchUsers();
    fetchModules();
  }, [authLoading, currentUser, fetchUsers, fetchModules]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleUpdateModules = async (nik: string, moduleIds: number[]) => {
    try {
      const res = await fetch(`/api/auth/users/${nik}/modules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ moduleIds }),
      });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error('[AccessManagement] handleUpdateModules:', err);
    }
  };

  const handleDeleteUser = async (nik: string) => {
    if (!confirm(`Are you sure you want to DELETE user: ${nik}?`)) return;
    try {
      const res = await fetch(`/api/auth/users/${nik}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error('[AccessManagement] handleDeleteUser:', err);
    }
  };

  // ── Derived state ──────────────────────────────────────────────────────────

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.nik.includes(searchTerm) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const indexOfFirst = (currentPage - 1) * usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirst, indexOfFirst + usersPerPage);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ModuleGuard moduleGroup="admin">
      <div className="h-screen bg-[#F8FAFC] flex flex-col overflow-hidden">
        <Header user={currentUser} />

        <div className="flex flex-1 overflow-hidden gap-5 p-5 max-w-[1600px] mx-auto w-full">

          {/* LEFT: User Info Card */}
          <div className="w-64 flex-shrink-0 flex flex-col justify-between p-6 bg-[#11499E] rounded-3xl shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-bl-full pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white opacity-5 rounded-tr-full pointer-events-none" />
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <div className="relative z-10">
              <p className="inline-block px-2.5 py-1 bg-white/20 text-white rounded-lg text-xs font-medium tracking-wide uppercase mb-3">
                {currentUser?.role}
              </p>
              <h2 className="text-white text-3xl font-bold leading-tight mb-4 tracking-tight">
                {currentUser?.name}
              </h2>
              <div className="border-t border-white/20 pt-4 space-y-1.5">
                <p className="text-blue-100 text-sm flex items-center gap-2">
                  <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                  {currentUser?.nik}
                </p>
                <p className="text-blue-100 text-sm flex items-center gap-2 truncate">
                  <svg className="w-4 h-4 opacity-70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {currentUser?.email}
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: Table */}
          <div className="flex-1 bg-white rounded-3xl shadow-sm overflow-hidden flex flex-col border border-gray-200/60">

            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h1 className="text-[#11499E] font-bold text-lg">Team Members</h1>
                <p className="text-[#1E99D5] text-xs mt-0.5">
                  Manage users, roles, and module access ({filteredUsers.length} total)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white text-[#11499E] placeholder-[#1E99D5]/70 outline-none focus:ring-2 focus:ring-[#11499E]/20 focus:border-[#11499E] transition-all w-64"
                  />
                  <svg className="w-4 h-4 text-[#1E99D5] absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#11499E] text-white text-sm font-semibold rounded-xl hover:bg-[#0d3a7d] shadow-sm transition active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Add User
                </button>
              </div>
            </div>

            <div
              className="grid text-xs font-bold text-[#1E99D5] uppercase tracking-wider px-6 py-3 border-b border-gray-100 bg-gray-50/50"
              style={{ gridTemplateColumns: '2.2fr 0.8fr 1fr 1.5fr 2fr 0.8fr' }}
            >
              <span>User Details</span>
              <span>Role</span>
              <span>NIK</span>
              <span>Email</span>
              <span>Modules Access</span>
              <span className="text-right pr-2">Action</span>
            </div>

            <div className="flex-1 overflow-y-auto pb-36">
              {dataLoading ? (
                <div className="flex items-center justify-center h-full">
                  <svg className="animate-spin w-6 h-6 text-[#11499E]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              ) : currentUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[#1E99D5]">
                  <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-sm font-medium text-[#11499E]">No users found</p>
                  <p className="text-xs">Try adjusting your search criteria</p>
                </div>
              ) : (
                currentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="grid items-center px-6 py-3 border-b border-gray-50 hover:bg-blue-50/30 transition-colors"
                    style={{ gridTemplateColumns: '2.2fr 0.8fr 1fr 1.5fr 2fr 0.8fr' }}
                  >
                    <div className="flex items-center gap-3 pr-4">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#11499E] to-[#1E99D5] flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-white text-sm font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#11499E] truncate">{user.name}</p>
                        <p className="text-xs text-[#1E99D5] truncate">
                          @{user.name.toLowerCase().replace(/\s+/g, '').substring(0, 10)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.role === 'admin' ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                        {user.role}
                      </span>
                    </div>

                    <span className="text-sm text-[#1E99D5] font-mono">{user.nik}</span>
                    <span className="text-sm text-[#1E99D5] truncate pr-4">{user.email}</span>

                    <div className="pr-4">
                      <ModuleSelector
                        user={user}
                        allModules={allModules}
                        onUpdate={handleUpdateModules}
                      />
                    </div>

                    <div className="flex items-center gap-2 justify-end pr-2">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="p-1.5 text-[#1E99D5] hover:text-[#11499E] hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit User"
                      >
                        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {currentUser?.nik !== user.nik && (
                        <button
                          onClick={() => handleDeleteUser(user.nik)}
                          className="p-1.5 text-[#1E99D5] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete User"
                        >
                          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
                <span className="text-xs text-[#1E99D5] font-medium">
                  Showing {indexOfFirst + 1}–{Math.min(indexOfFirst + usersPerPage, filteredUsers.length)} of {filteredUsers.length}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-xs font-semibold border border-gray-200 text-[#11499E] rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
                  >Prev</button>
                  <div className="flex items-center gap-1 px-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-7 h-7 text-xs font-bold rounded-md transition ${
                            currentPage === pageNum
                              ? 'bg-[#11499E] text-white shadow-sm'
                              : 'text-[#1E99D5] hover:bg-gray-100'
                          }`}
                        >{pageNum}</button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-xs font-semibold border border-gray-200 text-[#11499E] rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
                  >Next</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {showAddModal && (
          <AddUserModal
            allModules={allModules}
            onClose={() => setShowAddModal(false)}
            onSuccess={() => { setShowAddModal(false); fetchUsers(); }}
          />
        )}

        {editingUser && (
          <EditUserModal
            user={editingUser}
            allModules={allModules}
            onClose={() => setEditingUser(null)}
            onSuccess={() => { setEditingUser(null); fetchUsers(); }}
          />
        )}
      </div>
    </ModuleGuard>
  );
}

// ─── Module Selector ──────────────────────────────────────────────────────────

function ModuleSelector({ user, allModules, onUpdate }: {
  user: User;
  allModules: Module[];
  onUpdate: (nik: string, moduleIds: number[]) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedModules, setSelectedModules] = useState<number[]>(
    user.modules.map((m) => m.id)
  );

  const handleToggle = (moduleId: number) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
  };

  const handleSave = () => {
    onUpdate(user.nik, selectedModules);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div
        className="flex flex-wrap items-center gap-1.5 cursor-pointer group/module"
        onClick={() => setIsEditing(true)}
      >
        {user.modules.length > 0 ? (
          <>
            {user.modules.slice(0, 2).map((m) => (
              <span key={m.id} className="px-2 py-0.5 bg-blue-50 text-[#11499E] border border-blue-100/50 rounded text-[10px] font-semibold whitespace-nowrap">
                {m.module_name}
              </span>
            ))}
            {user.modules.length > 2 && (
              <span className="px-2 py-0.5 bg-gray-100 text-[#1E99D5] rounded text-[10px] font-bold">
                +{user.modules.length - 2}
              </span>
            )}
          </>
        ) : (
          <span className="text-[#1E99D5] text-xs italic">No access</span>
        )}
        <div className="opacity-0 group-hover/module:opacity-100 transition-opacity p-0.5 text-[#1E99D5] bg-gray-100 rounded">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="fixed inset-0 z-40" onClick={() => setIsEditing(false)} />
      <div className="absolute top-full mt-2 -left-2 bg-white border border-gray-200 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] p-3 w-60 z-50">
        <p className="text-xs font-bold text-[#11499E] mb-2 border-b border-gray-100 pb-2">Edit Access</p>
        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {allModules.map((m) => (
            <label key={m.id} className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 p-1.5 rounded-md transition-colors">
              <input
                type="checkbox"
                checked={selectedModules.includes(m.id)}
                onChange={() => handleToggle(m.id)}
                className="w-3.5 h-3.5 text-[#11499E] border-gray-300 rounded focus:ring-[#11499E] cursor-pointer"
              />
              <span className="text-xs font-medium text-[#11499E]">{m.module_name}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2 mt-3 pt-2">
          <button
            onClick={handleSave}
            className="flex-1 py-1.5 bg-[#11499E] text-white rounded-lg text-xs font-semibold hover:bg-[#0d3a7d] shadow-sm transition"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add User Modal ───────────────────────────────────────────────────────────

function AddUserModal({ allModules, onClose, onSuccess }: {
  allModules: Module[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    nik: '', email: '', name: '', password: '', role: 'user',
  });
  const [selectedModules, setSelectedModules] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...formData, moduleIds: selectedModules }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      onSuccess();
    } catch {
      setError('Failed to create user');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#11499E]">Add New User</h2>
            <p className="text-xs text-[#1E99D5] mt-0.5">Register a new team member</p>
          </div>
          <button onClick={onClose} className="p-2 text-[#1E99D5] hover:text-[#11499E] hover:bg-gray-200/50 rounded-full transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          <form id="add-user-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#11499E] mb-1.5 uppercase tracking-wide">Full Name</label>
                <input type="text" placeholder="John Doe" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-[#11499E] placeholder-[#1E99D5]/50 outline-none focus:bg-white focus:ring-2 focus:ring-[#11499E]/20 focus:border-[#11499E] transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#11499E] mb-1.5 uppercase tracking-wide">NIK</label>
                <input type="text" placeholder="e.g. 123456" value={formData.nik} onChange={(e) => setFormData({ ...formData, nik: e.target.value })} required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-[#11499E] placeholder-[#1E99D5]/50 outline-none focus:bg-white focus:ring-2 focus:ring-[#11499E]/20 focus:border-[#11499E] transition-all" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#11499E] mb-1.5 uppercase tracking-wide">Email</label>
                <input type="email" placeholder="john@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-[#11499E] placeholder-[#1E99D5]/50 outline-none focus:bg-white focus:ring-2 focus:ring-[#11499E]/20 focus:border-[#11499E] transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#11499E] mb-1.5 uppercase tracking-wide">Role</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-[#11499E] outline-none focus:bg-white focus:ring-2 focus:ring-[#11499E]/20 focus:border-[#11499E] transition-all appearance-none cursor-pointer">
                  <option value="user">Standard User</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#11499E] mb-1.5 uppercase tracking-wide">Initial Password</label>
              <input type="password" placeholder="Min. 8 characters" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-[#11499E] placeholder-[#1E99D5]/50 outline-none focus:bg-white focus:ring-2 focus:ring-[#11499E]/20 focus:border-[#11499E] transition-all" />
            </div>
            <div className="pt-2">
              <label className="flex items-center justify-between text-xs font-bold text-[#11499E] mb-2 uppercase tracking-wide border-b border-gray-100 pb-2">
                <span>Module Permissions</span>
                <span className="text-[#1E99D5] font-normal normal-case">{selectedModules.length} selected</span>
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                {allModules.map((m) => (
                  <label key={m.id} className={`flex items-center gap-3 cursor-pointer p-2.5 rounded-xl border transition-all ${selectedModules.includes(m.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:border-blue-100'}`}>
                    <input type="checkbox" checked={selectedModules.includes(m.id)} onChange={(e) => { if (e.target.checked) setSelectedModules([...selectedModules, m.id]); else setSelectedModules(selectedModules.filter((id) => id !== m.id)); }} className="w-4 h-4 text-[#11499E] border-gray-300 rounded focus:ring-[#11499E]" />
                    <span className={`text-xs font-semibold ${selectedModules.includes(m.id) ? 'text-[#11499E]' : 'text-[#1E99D5]'}`}>{m.module_name}</span>
                  </label>
                ))}
              </div>
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
                <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-red-600 text-xs font-medium">{error}</p>
              </div>
            )}
          </form>
        </div>
        <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-semibold text-[#11499E] hover:bg-gray-200/50 rounded-xl transition">Cancel</button>
          <button form="add-user-form" type="submit" disabled={loading} className="px-8 py-2.5 bg-[#11499E] text-white rounded-xl text-sm font-bold hover:bg-[#0d3a7d] shadow-sm disabled:opacity-50 flex items-center gap-2 transition">
            {loading ? (<><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Saving...</>) : 'Save User'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────

function EditUserModal({ user, allModules, onClose, onSuccess }: {
  user: User;
  allModules: Module[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: user.name, email: user.email, role: user.role, password: '',
  });
  const [selectedModules, setSelectedModules] = useState<number[]>(
    user.modules.map((m) => m.id)
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Step 4 nanti: ini akan diganti satu request atomic
      const updateData: Record<string, string> = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
      };
      if (formData.password) updateData.password = formData.password;

      const res = await fetch(`/api/auth/users/${user.nik}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        setLoading(false);
        return;
      }

      await fetch(`/api/auth/users/${user.nik}/modules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ moduleIds: selectedModules }),
      });

      onSuccess();
    } catch {
      setError('Failed to update user');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#11499E]">Edit User Profile</h2>
            <p className="text-xs text-[#1E99D5] mt-0.5">Update details for <span className="font-semibold text-[#11499E]">{user.name}</span></p>
          </div>
          <button onClick={onClose} className="p-2 text-[#1E99D5] hover:text-[#11499E] hover:bg-gray-200/50 rounded-full transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#11499E] mb-1.5 uppercase tracking-wide">Employee NIK</label>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl">
                <svg className="w-4 h-4 text-[#1E99D5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                <span className="text-sm font-mono text-[#1E99D5]">{user.nik}</span>
              </div>
              <p className="text-[10px] text-[#1E99D5] mt-1 ml-1">NIK cannot be changed.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#11499E] mb-1.5 uppercase tracking-wide">Full Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-[#11499E] outline-none focus:bg-white focus:ring-2 focus:ring-[#11499E]/20 focus:border-[#11499E] transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#11499E] mb-1.5 uppercase tracking-wide">Role</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-[#11499E] outline-none focus:bg-white focus:ring-2 focus:ring-[#11499E]/20 focus:border-[#11499E] transition-all appearance-none cursor-pointer">
                  <option value="user">Standard User</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#11499E] mb-1.5 uppercase tracking-wide">Email Address</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-[#11499E] outline-none focus:bg-white focus:ring-2 focus:ring-[#11499E]/20 focus:border-[#11499E] transition-all" />
            </div>
            <div>
              <label className="flex items-center justify-between text-xs font-bold text-[#11499E] mb-1.5 uppercase tracking-wide">
                New Password
                <span className="text-[10px] font-normal normal-case text-[#1E99D5] bg-gray-100 px-2 py-0.5 rounded">Optional</span>
              </label>
              <input type="password" placeholder="Leave blank to keep current" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-[#11499E] placeholder-[#1E99D5]/50 outline-none focus:bg-white focus:ring-2 focus:ring-[#11499E]/20 focus:border-[#11499E] transition-all" />
            </div>
            <div className="pt-2 border-t border-gray-100">
              <label className="flex items-center justify-between text-xs font-bold text-[#11499E] mb-3 uppercase tracking-wide">
                <span>Module Permissions</span>
                <span className="text-[#11499E] font-bold normal-case bg-blue-50 px-2 py-0.5 rounded">{selectedModules.length} selected</span>
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                {allModules.map((m) => (
                  <label key={m.id} className={`flex items-center gap-3 cursor-pointer p-2.5 rounded-xl border transition-all ${selectedModules.includes(m.id) ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-200 hover:border-blue-100'}`}>
                    <input type="checkbox" checked={selectedModules.includes(m.id)} onChange={(e) => { if (e.target.checked) setSelectedModules([...selectedModules, m.id]); else setSelectedModules(selectedModules.filter((id) => id !== m.id)); }} className="w-4 h-4 text-[#11499E] border-gray-300 rounded focus:ring-[#11499E]" />
                    <span className={`text-xs font-semibold ${selectedModules.includes(m.id) ? 'text-[#11499E]' : 'text-[#1E99D5]'}`}>{m.module_name}</span>
                  </label>
                ))}
              </div>
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
                <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-red-600 text-xs font-medium">{error}</p>
              </div>
            )}
          </form>
        </div>
        <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-semibold text-[#11499E] hover:bg-gray-200/50 rounded-xl transition">Cancel</button>
          <button form="edit-user-form" type="submit" disabled={loading} className="px-8 py-2.5 bg-[#11499E] text-white rounded-xl text-sm font-bold hover:bg-[#0d3a7d] shadow-sm disabled:opacity-50 flex items-center gap-2 transition">
            {loading ? (<><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Updating...</>) : 'Update Details'}
          </button>
        </div>
      </div>
    </div>
  );
}