'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/shared/context/AuthContext';

export function useAuth(requireAuth: boolean = true) {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuthContext();

  useEffect(() => {
    if (loading) return;

    if (requireAuth && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!requireAuth && isAuthenticated) {
      router.push('/home');
    }
  }, [loading, isAuthenticated, requireAuth, router]);

  return { user, loading };
}

export function useLogout() {
  const { logout } = useAuthContext();
  return { logout };
}