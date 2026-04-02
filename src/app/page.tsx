// app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Cek apakah user sudah login
    const token = localStorage.getItem('token');
    
    if (token) {
      // Jika sudah login, redirect ke home
      router.push('/home');
    } else {
      // Jika belum login, redirect ke login
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-600">Redirecting...</div>
    </div>
  );
}