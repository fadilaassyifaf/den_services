import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  nik: string;
  username: string;
  name: string;
  role: string;
}

export function useAuth(requireAuth: boolean = true) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/validate-token', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          if (requireAuth) router.push('/login');
          else setLoading(false);
          return;
        }

        const data = await response.json();

        if (!data.valid) {
          if (requireAuth) router.push('/login');
          else setLoading(false);
          return;
        }

        setUser(data.user);
        setLoading(false);

        if (!requireAuth && window.location.pathname === '/login') {
          router.push('/home');
        }

      } catch (error) {
        console.error('Auth check error:', error);
        setLoading(false);
        if (requireAuth) router.push('/login');
      }
    }

    checkAuth();
  }, [requireAuth, router]);

  return { user, loading };
}

export function useLogout() {
  const router = useRouter();

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      router.push('/login');
    }
  };

  return { logout };
}