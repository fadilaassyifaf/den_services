'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id:       number;
  nik:      string;
  username: string;
  name:     string;
  email:    string;
  role:     'admin' | 'superuser' | 'user' | 'guest';
}

export interface UserModule {
  id:           number;
  module_name:  string;
  module_group: string;
}

interface AuthState {
  user:            AuthUser | null;
  modules:         UserModule[];
  loading:         boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  hasAccess:   (moduleGroup: string) => boolean;
  logout:      () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

// ─── Konstanta ────────────────────────────────────────────────────────────────

// Role yang punya akses penuh ke semua halaman termasuk /admin
const SUPERUSER_ROLES: AuthUser['role'][] = ['admin', 'superuser'];

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [state, setState] = useState<AuthState>({
    user:            null,
    modules:         [],
    loading:         true,
    isAuthenticated: false,
  });

  const fetchAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/validate-token', {
        credentials: 'include',
        cache:       'no-store',
      });

      if (!res.ok) {
        setState({ user: null, modules: [], loading: false, isAuthenticated: false });
        return;
      }

      const data = await res.json();

      if (!data.valid) {
        setState({ user: null, modules: [], loading: false, isAuthenticated: false });
        return;
      }

      setState({
        user:            data.user,
        modules:         data.modules ?? [],
        loading:         false,
        isAuthenticated: true,
      });
    } catch {
      setState({ user: null, modules: [], loading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    fetchAuth();
  }, [fetchAuth]);

  const hasAccess = useCallback(
    (moduleGroup: string): boolean => {
      if (!state.user) return false;

      // Superuser roles: akses ke semua halaman tanpa cek module
      if (SUPERUSER_ROLES.includes(state.user.role)) return true;

      // Guard khusus halaman 'admin': HANYA bisa diakses superuser roles
      // User biasa tidak bisa masuk walau punya module apapun
      if (moduleGroup === 'admin') return false;

      // Module-based access untuk halaman non-admin
      return state.modules.some((m) => m.module_group === moduleGroup);
    },
    [state.user, state.modules]
  );

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      setState({ user: null, modules: [], loading: false, isAuthenticated: false });
      router.push('/login');
    }
  }, [router]);

  const refreshAuth = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    await fetchAuth();
  }, [fetchAuth]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, hasAccess, logout, refreshAuth }),
    [state, hasAccess, logout, refreshAuth]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>');
  return ctx;
}