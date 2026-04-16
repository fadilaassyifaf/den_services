'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/shared/context/AuthContext';
import Header from '@/features/iris/components/Header';
import ModuleGuard from '@/features/iris/components/ModuleGuard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Module {
  id:           number;
  module_name:  string;
  module_group: string;
}

interface User {
  id:         number;
  nik:        string;
  email:      string;
  name:       string;
  role:       string;
  department: string;
  modules:    Module[];
}

// Group modules by module_group for tree structure
interface ModuleGroup {
  group: string;
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
      <div className="h-screen bg-[#F0F4FA] flex flex-col overflow-hidden">
        <Header user={currentUser} />

        <div className="flex flex-1 overflow-hidden gap-4 p-4 max-w-[1600px] mx-auto w-full">

          {/* LEFT: User Info Card */}
          <div className="w-48 flex-shrink-0 flex flex-col gap-3">
            <div className="p-4 bg-[#11499E] rounded-2xl shadow-sm relative overflow-hidden flex items-center justify-center" style={{ minHeight: 160 }}>
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-bl-full pointer-events-none" />
              <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-white/5 rounded-tr-full pointer-events-none" />
              <div className="relative z-10 flex flex-col items-center text-center gap-2 w-full">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">{currentUser?.name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-white font-bold text-sm leading-tight">{currentUser?.name}</p>
                  <p className="text-blue-200 text-[11px] mt-0.5">@{currentUser?.nik}</p>
                </div>
                <span className="px-2 py-0.5 bg-white/20 text-white rounded-full text-[10px] font-semibold uppercase tracking-wide">
                  {currentUser?.role}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex-1 flex flex-col">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Quick Stats</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-600">Total Users</span>
                  <span className="text-sm font-bold text-[#11499E]">{users.length}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-600">Admins</span>
                  <span className="text-sm font-bold text-purple-600">{users.filter(u => u.role === 'admin').length}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-600">Users</span>
                  <span className="text-sm font-bold text-emerald-600">{users.filter(u => u.role === 'user').length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Table */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col border border-gray-200/60 min-w-0">

            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h1 className="text-[#11499E] font-bold text-lg">Access Management</h1>
                <p className="text-[#1E99D5] text-xs mt-0.5">
                  Manage users and module permissions ({filteredUsers.length} users)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search users"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-gray-50 focus:bg-white text-[#11499E] placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#11499E]/20 focus:border-[#11499E] transition-all w-48"
                  />
                  <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#11499E] text-white text-xs font-semibold rounded-xl hover:bg-[#0d3a7d] shadow-sm transition active:scale-95"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Add User
                </button>
              </div>
            </div>

            <div className="flex-shrink-0 bg-gray-50/70 border-b border-gray-100">
              <div className="flex items-center px-5 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <div className="w-[200px] flex-shrink-0">User</div>
                <div className="w-[100px] flex-shrink-0">Role</div>
                <div className="w-[120px] flex-shrink-0">NIK</div>
                <div className="w-[180px] flex-shrink-0">Email</div>
                <div className="flex-1 min-w-0">Module Access</div>
                <div className="w-[80px] flex-shrink-0 text-right pr-2">Action</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {dataLoading ? (
                <div className="flex items-center justify-center h-full">
                  <svg className="animate-spin w-8 h-8 text-[#11499E]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              ) : currentUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-500">No users found</p>
                  <p className="text-xs text-gray-400">Try adjusting your search</p>
                </div>
              ) : (
                currentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center px-5 py-2.5 border-b border-gray-50 hover:bg-blue-50/30 transition-colors"
                  >
                    {/* User */}
                    <div className="w-[200px] flex-shrink-0 flex items-center gap-2.5 pr-4">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#11499E] to-[#1E99D5] flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-white text-[11px] font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-700 truncate">{user.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">@{user.nik}</p>
                      </div>
                    </div>

                    {/* Role */}
                    <div className="w-[100px] flex-shrink-0 pr-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.role === 'admin' ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                        {user.role}
                      </span>
                    </div>

                    {/* NIK */}
                    <div className="w-[120px] flex-shrink-0 pr-4">
                      <span className="text-xs text-gray-600 font-mono">{user.nik}</span>
                    </div>

                    {/* Email */}
                    <div className="w-[180px] flex-shrink-0 pr-4">
                      <span className="text-xs text-gray-600 truncate block">{user.email}</span>
                    </div>

                    {/* Module Access */}
                    <div className="flex-1 min-w-0 pr-4">
                      <ModuleSelector
                        user={user}
                        allModules={allModules}
                        onUpdate={handleUpdateModules}
                      />
                    </div>

                    {/* Actions */}
                    <div className="w-[80px] flex-shrink-0 flex items-center gap-1 justify-end pr-2">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="p-1.5 text-[#1E99D5] hover:text-[#11499E] hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {currentUser?.nik !== user.nik && (
                        <button
                          onClick={() => handleDeleteUser(user.nik)}
                          className="p-1.5 text-[#1E99D5] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
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
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-white flex-shrink-0">
                <span className="text-xs text-gray-500">
                  Showing {indexOfFirst + 1}–{Math.min(indexOfFirst + usersPerPage, filteredUsers.length)} of {filteredUsers.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 text-xs font-semibold border border-gray-200 text-[#11499E] rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
                  >Prev</button>
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
                      >{p}</button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1 text-xs font-semibold border border-gray-200 text-[#11499E] rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
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

// ── Module Selector dengan Tree Structure ─────────────────────────────────────

function ModuleSelector({ user, allModules, onUpdate }: {
  user:       User;
  allModules: Module[];
  onUpdate:   (nik: string, moduleIds: number[]) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedModules, setSelectedModules] = useState<number[]>(
    user.modules.map((m) => m.id)
  );

  // Group modules by module_group
  const moduleGroups: ModuleGroup[] = allModules.reduce((acc, module) => {
    const existing = acc.find(g => g.group === module.module_group);
    if (existing) {
      existing.modules.push(module);
    } else {
      acc.push({ group: module.module_group, modules: [module] });
    }
    return acc;
  }, [] as ModuleGroup[]);

  const handleToggleModule = (moduleId: number) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleToggleGroup = (group: ModuleGroup) => {
    const groupModuleIds = group.modules.map(m => m.id);
    const allSelected = groupModuleIds.every(id => selectedModules.includes(id));
    
    if (allSelected) {
      // Uncheck all
      setSelectedModules(prev => prev.filter(id => !groupModuleIds.includes(id)));
    } else {
      // Check all
      setSelectedModules(prev => [...new Set([...prev, ...groupModuleIds])]);
    }
  };

  const handleSave = () => {
    onUpdate(user.nik, selectedModules);
    setIsEditing(false);
  };

  if (!isEditing) {
    const uniqueGroups = Array.from(
      new Map(user.modules.map((m) => [m.module_group, m])).values()
    );

    return (
      <div
        className="flex flex-wrap items-center gap-1 cursor-pointer group/module"
        onClick={() => setIsEditing(true)}
      >
        {uniqueGroups.length > 0 ? (
          <>
            {uniqueGroups.slice(0, 2).map((m) => (
              <span
                key={m.id}
                title={`${m.module_group}: ${user.modules.filter(mod => mod.module_group === m.module_group).map(mod => mod.module_name).join(', ')}`}
                className="px-2 py-0.5 bg-blue-50 text-[#11499E] border border-blue-100/50 rounded text-[10px] font-semibold whitespace-nowrap"
              >
                {m.module_group}
              </span>
            ))}
            {uniqueGroups.length > 2 && (
              <span className="px-2 py-0.5 bg-gray-100 text-[#1E99D5] rounded text-[10px] font-bold">
                +{uniqueGroups.length - 2}
              </span>
            )}
          </>
        ) : (
          <span className="text-[#1E99D5] text-xs italic">No access</span>
        )}
        <div className="opacity-0 group-hover/module:opacity-100 transition-opacity p-0.5 text-[#1E99D5] bg-gray-100 rounded">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="fixed inset-0 z-40" onClick={() => setIsEditing(false)} />
      <div className="absolute top-full mt-2 -left-2 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-72 z-50 max-h-96 overflow-y-auto">
        <p className="text-xs font-bold text-[#11499E] mb-2 pb-2 border-b border-gray-100 flex items-center justify-between">
          <span>Edit Module Access</span>
          <span className="text-[10px] text-[#1E99D5] font-normal">{selectedModules.length} selected</span>
        </p>
        
        <div className="space-y-2">
          {moduleGroups.map((group) => {
            const groupModuleIds = group.modules.map(m => m.id);
            const allSelected = groupModuleIds.every(id => selectedModules.includes(id));
            const someSelected = groupModuleIds.some(id => selectedModules.includes(id)) && !allSelected;
            
            return (
              <div key={group.group} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Group Header */}
                <label
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 border-b border-gray-100 transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    handleToggleGroup(group);
                  }}
                >
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={() => handleToggleGroup(group)}
                    className="w-3.5 h-3.5 text-[#11499E] border-gray-300 rounded focus:ring-[#11499E] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-[#11499E] flex-1">{group.group}</span>
                  <span className="text-[10px] text-gray-400">{group.modules.length} modules</span>
                </label>
                
                {/* Group Modules */}
                <div className="pl-6 py-1 bg-gray-50/50">
                  {group.modules.map((module) => (
                    <label
                      key={module.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-white p-1.5 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedModules.includes(module.id)}
                        onChange={() => handleToggleModule(module.id)}
                        className="w-3 h-3 text-[#11499E] border-gray-300 rounded focus:ring-[#11499E] cursor-pointer"
                      />
                      <span className="text-[11px] text-gray-600 truncate">{module.module_name}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={() => setIsEditing(false)}
            className="flex-1 py-1.5 border border-gray-200 text-[#1E99D5] rounded-lg text-xs font-semibold hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-1.5 bg-[#11499E] text-white rounded-lg text-xs font-semibold hover:bg-[#0d3a7d] shadow-sm transition"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add User Modal dengan Tree Structure ─────────────────────────────────────

function AddUserModal({ allModules, onClose, onSuccess }: {
  allModules: Module[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const DEPARTMENTS = [
    'FTTX Design',
    'Tower and Power Engineering',
    'Transmission and Enterprise Last Mile Engineering',
    'Market Insight and Data Engineering',
  ];

  const [formData, setFormData] = useState({
    username: '', nik: '', email: '', name: '', password: '', role: 'user', department: '',
  });
  const [selectedModules, setSelectedModules] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Group modules by module_group
  const moduleGroups: ModuleGroup[] = allModules.reduce((acc, module) => {
    const existing = acc.find(g => g.group === module.module_group);
    if (existing) {
      existing.modules.push(module);
    } else {
      acc.push({ group: module.module_group, modules: [module] });
    }
    return acc;
  }, [] as ModuleGroup[]);

  const handleToggleModule = (moduleId: number) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleToggleGroup = (group: ModuleGroup) => {
    const groupModuleIds = group.modules.map(m => m.id);
    const allSelected = groupModuleIds.every(id => selectedModules.includes(id));
    
    if (allSelected) {
      setSelectedModules(prev => prev.filter(id => !groupModuleIds.includes(id)));
    } else {
      setSelectedModules(prev => [...new Set([...prev, ...groupModuleIds])]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.department) { setError('Department is required'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...formData, moduleIds: selectedModules }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to create user'); setLoading(false); return; }
      onSuccess();
    } catch {
      setError('Failed to create user');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#11499E] to-[#1E99D5] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">Add New User</h2>
            <p className="text-blue-100 text-xs mt-0.5">Create a new team member account</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          <form id="add-user-form" onSubmit={handleSubmit} className="space-y-4">
            
            {/* User Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 outline-none focus:bg-white focus:ring-2 focus:ring-[#11499E]/20 focus:border-[#11499E] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Username</label>
                <input
                  type="text"
                  placeholder="e.g. johndoe"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 outline-none focus:bg-white focus:ring-2 focus:ring-[#11499E]/20 focus:border-[#11499E] transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">NIK</label>
                <input
                  type="text"
                  placeholder="e.g. 123456"
                  value={formData.nik}
                  onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 outline-none focus:bg-white focus:ring-2 focus:ring-[#11499E]/20 focus:border-[#11499E] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 outline-none focus:bg-white focus:ring-2 focus:ring-[#11499E]/20 focus:border-[#11499E] transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Department</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none focus:bg-white focus:ring-2 focus:ring-[#11499E]/20 focus:border-[#11499E] transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>Select department</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none focus:bg-white focus:ring-2 focus:ring-[#11499E]/20 focus:border-[#11499E] transition-all appearance-none cursor-pointer"
                >
                  <option value="user">Standard User</option>
                  <option value="guest">Guest</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Initial Password</label>
              <input
                type="password"
                placeholder="Min. 8 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 outline-none focus:bg-white focus:ring-2 focus:ring-[#11499E]/20 focus:border-[#11499E] transition-all"
              />
            </div>

            {/* Module Permissions - Tree Structure */}
            <div className="pt-3 border-t border-gray-100">
              <label className="flex items-center justify-between text-xs font-bold text-gray-600 mb-3 uppercase tracking-wide">
                <span>Module Permissions</span>
                <span className="text-[#1E99D5] font-bold normal-case bg-blue-50 px-2 py-0.5 rounded">
                  {selectedModules.length} selected
                </span>
              </label>
              
              <div className="space-y-2 max-h-72 overflow-y-auto pr-2 border border-gray-200 rounded-xl p-3 bg-gray-50">
                {moduleGroups.map((group) => {
                  const groupModuleIds = group.modules.map(m => m.id);
                  const allSelected = groupModuleIds.every(id => selectedModules.includes(id));
                  const someSelected = groupModuleIds.some(id => selectedModules.includes(id)) && !allSelected;
                  
                  return (
                    <div key={group.group} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                      {/* Group Header */}
                      <label
                        className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 px-3 py-2.5 border-b border-gray-100 transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          handleToggleGroup(group);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someSelected;
                          }}
                          onChange={() => handleToggleGroup(group)}
                          className="w-4 h-4 text-[#11499E] border-gray-300 rounded focus:ring-[#11499E] cursor-pointer"
                        />
                        <span className="text-xs font-bold text-[#11499E] flex-1">{group.group}</span>
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                          {group.modules.filter(m => selectedModules.includes(m.id)).length}/{group.modules.length}
                        </span>
                      </label>
                      
                      {/* Group Modules */}
                      <div className="pl-8 pr-3 py-2 space-y-1 bg-gray-50/50">
                        {group.modules.map((module) => (
                          <label
                            key={module.id}
                            className="flex items-center gap-2.5 cursor-pointer hover:bg-white px-2 py-1.5 rounded transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedModules.includes(module.id)}
                              onChange={() => handleToggleModule(module.id)}
                              className="w-3.5 h-3.5 text-[#11499E] border-gray-300 rounded focus:ring-[#11499E] cursor-pointer"
                            />
                            <span className="text-xs text-gray-600">{module.module_name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-600 text-xs font-medium">{error}</p>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition"
          >
            Cancel
          </button>
          <button 
            form="add-user-form" 
            type="submit" 
            disabled={loading} 
            className="px-6 py-2 bg-[#11499E] text-white rounded-xl text-sm font-bold hover:bg-[#0d3a7d] shadow-sm disabled:opacity-50 flex items-center gap-2 transition"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create User
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit User Modal dengan Tree Structure ────────────────────────────────────

function EditUserModal({ user, allModules, onClose, onSuccess }: {
  user: User;
  allModules: Module[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: user.name,
    role: user.role,
    password: '',
  });
  const [selectedModules, setSelectedModules] = useState<number[]>(
    user.modules.map((m) => m.id)
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Group modules by module_group
  const moduleGroups: ModuleGroup[] = allModules.reduce((acc, module) => {
    const existing = acc.find(g => g.group === module.module_group);
    if (existing) {
      existing.modules.push(module);
    } else {
      acc.push({ group: module.module_group, modules: [module] });
    }
    return acc;
  }, [] as ModuleGroup[]);

  const handleToggleModule = (moduleId: number) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleToggleGroup = (group: ModuleGroup) => {
    const groupModuleIds = group.modules.map(m => m.id);
    const allSelected = groupModuleIds.every(id => selectedModules.includes(id));
    
    if (allSelected) {
      setSelectedModules(prev => prev.filter(id => !groupModuleIds.includes(id)));
    } else {
      setSelectedModules(prev => [...new Set([...prev, ...groupModuleIds])]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Step 1: Update user info via FastAPI
      const res = await fetch(`/api/auth/users/${user.nik}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          password: formData.password,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to update user');
        setLoading(false);
        return;
      }

      // Step 2: Update module assignments
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
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#11499E] to-[#1E99D5] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">Edit User</h2>
            <p className="text-blue-100 text-xs mt-0.5">Update details for <span className="font-semibold">{user.name}</span></p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-4">
            
            {/* NIK (Read-only) */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Employee NIK</label>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-sm font-mono text-gray-600">{user.nik}</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1 ml-1">NIK cannot be changed</p>
            </div>

            {/* Read-only info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Email</label>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl">
                  <span className="text-sm text-gray-500 truncate">{user.email}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 ml-1">Cannot be changed here</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Department</label>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl">
                  <span className="text-sm text-gray-500 truncate">{user.department || '—'}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 ml-1">Cannot be changed here</p>
              </div>
            </div>

            {/* Editable fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none focus:bg-white focus:ring-2 focus:ring-[#11499E]/20 focus:border-[#11499E] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none focus:bg-white focus:ring-2 focus:ring-[#11499E]/20 focus:border-[#11499E] transition-all appearance-none cursor-pointer"
                >
                  <option value="user">Standard User</option>
                  <option value="guest">Guest</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">New Password</label>
              <input
                type="password"
                placeholder="Enter new password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 outline-none focus:bg-white focus:ring-2 focus:ring-[#11499E]/20 focus:border-[#11499E] transition-all"
              />
              <p className="text-[10px] text-gray-400 mt-1 ml-1">Required to save changes</p>
            </div>

            {/* Module Permissions - Tree Structure */}
            <div className="pt-3 border-t border-gray-100">
              <label className="flex items-center justify-between text-xs font-bold text-gray-600 mb-3 uppercase tracking-wide">
                <span>Module Permissions</span>
                <span className="text-[#11499E] font-bold normal-case bg-blue-50 px-2 py-0.5 rounded">
                  {selectedModules.length} selected
                </span>
              </label>
              
              <div className="space-y-2 max-h-72 overflow-y-auto pr-2 border border-gray-200 rounded-xl p-3 bg-gray-50">
                {moduleGroups.map((group) => {
                  const groupModuleIds = group.modules.map(m => m.id);
                  const allSelected = groupModuleIds.every(id => selectedModules.includes(id));
                  const someSelected = groupModuleIds.some(id => selectedModules.includes(id)) && !allSelected;
                  
                  return (
                    <div key={group.group} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                      {/* Group Header */}
                      <label
                        className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 px-3 py-2.5 border-b border-gray-100 transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          handleToggleGroup(group);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someSelected;
                          }}
                          onChange={() => handleToggleGroup(group)}
                          className="w-4 h-4 text-[#11499E] border-gray-300 rounded focus:ring-[#11499E] cursor-pointer"
                        />
                        <span className="text-xs font-bold text-[#11499E] flex-1">{group.group}</span>
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                          {group.modules.filter(m => selectedModules.includes(m.id)).length}/{group.modules.length}
                        </span>
                      </label>
                      
                      {/* Group Modules */}
                      <div className="pl-8 pr-3 py-2 space-y-1 bg-gray-50/50">
                        {group.modules.map((module) => (
                          <label
                            key={module.id}
                            className="flex items-center gap-2.5 cursor-pointer hover:bg-white px-2 py-1.5 rounded transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedModules.includes(module.id)}
                              onChange={() => handleToggleModule(module.id)}
                              className="w-3.5 h-3.5 text-[#11499E] border-gray-300 rounded focus:ring-[#11499E] cursor-pointer"
                            />
                            <span className="text-xs text-gray-600">{module.module_name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-600 text-xs font-medium">{error}</p>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition"
          >
            Cancel
          </button>
          <button 
            form="edit-user-form" 
            type="submit" 
            disabled={loading} 
            className="px-6 py-2 bg-[#11499E] text-white rounded-xl text-sm font-bold hover:bg-[#0d3a7d] shadow-sm disabled:opacity-50 flex items-center gap-2 transition"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Updating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}