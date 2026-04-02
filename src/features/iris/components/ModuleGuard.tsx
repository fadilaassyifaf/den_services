'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useModuleAccess } from '@/shared/hooks/useModuleAccess';
import { useAuth } from '@/shared/hooks/useAuth';

interface ModuleGuardProps {
  children: React.ReactNode;
  endpoint: string;
}

export default function ModuleGuard({ children, endpoint }: ModuleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth(true);
  const { hasAccess, loading: moduleLoading } = useModuleAccess();

  useEffect(() => {
    if (authLoading || moduleLoading) return;
    if (!user) return;

    // Admin bypass semua pengecekan
    if (user.role === 'admin') return;

    // Cek akses modul
    if (!hasAccess(endpoint)) {
      router.replace('/unauthorized');
    }
  }, [authLoading, moduleLoading, user, hasAccess, endpoint]);

  // Loading state
  if (authLoading || moduleLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="animate-spin w-8 h-8 text-[#11499E]"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <div className="text-[#11499E] font-medium">Checking Access...</div>
        </div>
      </div>
    );
  }

  // Tidak punya akses
  if (!authLoading && !moduleLoading && user?.role !== 'admin' && !hasAccess(endpoint)) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#11499E] mb-2">Access Denied</h2>
          <p className="text-[#1E99D5] text-sm mb-6">
            You don't have permission to access this module.
          </p>
          <button
            onClick={() => router.push('/home')}
            className="w-full py-2.5 bg-[#11499E] text-white rounded-xl text-sm font-semibold hover:bg-[#0d3a7d] transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}