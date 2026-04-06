'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  nik: string;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest' | 'superuser';
}

export interface UserModule {
  id: number;
  module_name: string;
  module_group: string;
}

interface AuthState {
  user: AuthUser | null;
  modules: UserModule[];
  loading: boolean;
  isAuthenticated: boolean;
}

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: ('admin' | 'user' | 'guest' | 'superuser')[];
}

interface AuthContextValue extends AuthState {
  hasAccess: (moduleGroup: string) => boolean;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    modules: [],
    loading: true,
    isAuthenticated: false,
  });

  const fetchAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/validate-token', {
        credentials: 'include',
        cache: 'no-store',
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
        user: data.user,
        modules: data.modules ?? [],
        loading: false,
        isAuthenticated: true,
      });
    } catch {
      setState({ user: null, modules: [], loading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    fetchAuth();
  }, [fetchAuth]);

  // User punya akses ke halaman jika memiliki minimal 1 module dalam group tersebut
  const hasAccess = useCallback(
    (moduleGroup: string): boolean => {
      if (!state.user) return false;
      if (state.user.role === 'admin') return true;
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

  return (
    <AuthContext.Provider value={{ ...state, hasAccess, logout, refreshAuth }}>
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