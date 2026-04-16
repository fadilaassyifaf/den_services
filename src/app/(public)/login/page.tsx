'use client';

import { useState } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { useAuth } from '@/shared/hooks/useAuth';
import { useAuthContext } from '@/shared/context/AuthContext';
import Logo from '@/features/iris/components/Logo';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { loading: authLoading } = useAuth(false);
  const { refreshAuth } = useAuthContext();
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRedirectingAfterLogin, setIsRedirectingAfterLogin] = useState(false);

  useEffect(() => {
    router.prefetch('/home');
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validation = loginSchema.safeParse(formData);
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    setLoading(true);
    setIsRedirectingAfterLogin(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // pastikan cookie diterima
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || data.message || 'Incorrect username or password!');
        return;
      }

      // HAPUS: sessionStorage.setItem('token', data.token)
      // HAPUS: sessionStorage.setItem('user', JSON.stringify(data.user))
      // Cookie sudah di-set otomatis oleh server — tidak perlu simpan apapun di sini

      await refreshAuth();
      router.replace('/home');

    } catch (err) {
      console.error('Login error:', err);
      setError('Something went wrong. Please try again.');
      setIsRedirectingAfterLogin(false);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  if (authLoading && !isRedirectingAfterLogin) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-[#11499E] font-medium">Loading...</div>
      </div>
    );
  }

  // Seluruh JSX di bawah tidak ada perubahan sama sekali
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <div className="absolute top-5 left-6 z-10">
        <div className="scale-[0.55] origin-top-left">
          <Logo />
        </div>
      </div>
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-8 md:px-16 flex items-center gap-54 py-10 min-h-screen">
        <div className="flex-1 flex flex-col justify-center select-none relative">
          <div className="relative inline-block group">
            <div className="relative z-10 flex flex-col">
              <div className="flex items-end">
                <h1
                  className="font-black text-[#164194] tracking-tighter leading-[1]"
                  style={{ fontSize: 'clamp(4rem, 7vw, 7.5rem)' }}
                >
                  Design
                </h1>
                <div className="relative ml-[-15px] z-[-1] translate-y-12 md:translate-y-14 transition-transform duration-500 group-hover:scale-105">
                  <div className="w-[100px] h-[100px] md:w-[145px] md:h-[145px] bg-[#299CDB] rounded-full flex items-center justify-center relative shadow-xl shadow-blue-200/40">
                    <span className="text-white font-bold italic text-3xl md:text-5xl mt-1 mr-1 tracking-tight">
                      and
                    </span>
                    <div className="absolute top-[22%] right-[24%] w-3 h-3 md:w-5 md:h-5 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
              <h1
                className="font-black text-[#164194] tracking-tighter leading-[0.9] mt-6 md:mt-2"
                style={{ fontSize: 'clamp(4rem, 7.5vw, 8.5rem)' }}
              >
                Engineering
              </h1>
            </div>
            <div className="mt-14 md:mt-2 flex items-center gap-3 ml-38">
              <span
                className="font-bold text-[#299CDB] tracking-[0.02em] uppercase"
                style={{ fontSize: 'clamp(1.2rem, 2.2vw, 2.2rem)' }}
              >
                Integrated Hub
              </span>
              <div className="flex gap-2.5 mt-1">
                <div className="w-2.5 h-2.5 bg-[#299CDB] rounded-full"></div>
                <div className="w-2.5 h-2.5 bg-[#299CDB] rounded-full opacity-50"></div>
                <div className="w-2.5 h-2.5 bg-[#299CDB] rounded-full opacity-20"></div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div
            className="bg-[#11499E] flex items-start justify-center shadow-2xl"
            style={{
              width: '420px',
              height: '560px',
              borderRadius: '0 0 25px 25px',
              marginTop: '-40px',
            }}
          >
            <div className="w-full px-10 pt-48">
              <div className="mb-6">
                <h1 className="text-white font-bold leading-tight text-3xl">
                  Welcome!
                </h1>
                <p className="text-white/80 text-sm mt-1">
                  Please enter your details.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label htmlFor="username" className="text-white font-semibold text-xs block mb-1">
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    autoComplete="username"
                    placeholder="Enter your Username"
                    className="w-full px-4 py-2.5 rounded-xl bg-white text-gray-800 text-sm placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#1E99D5] transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="text-white font-semibold text-xs block mb-1">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your Password"
                    className="w-full px-4 py-2.5 rounded-xl bg-white text-gray-800 text-sm placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#1E99D5] transition-all"
                  />
                </div>
                {error && (
                  <div className="bg-red-500/20 border border-red-400/50 text-red-100 px-3 py-2 rounded-lg text-xs">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 mt-1 rounded-xl bg-[#1E99D5] hover:bg-[#1787c2] active:bg-[#1575a8] text-white font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>
                <div className="text-center pt-1">
                  <Link
                    href="/forgot-password"
                    className="text-white/60 hover:text-white font-medium text-xs transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}