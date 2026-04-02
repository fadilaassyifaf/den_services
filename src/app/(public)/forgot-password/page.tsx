// app/forgot-password/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/features/iris/components/Logo';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send OTP');
        setLoading(false);
        return;
      }

      localStorage.setItem('reset_email', email);
      router.push('/verify-otp');
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-white overflow-hidden flex flex-col">

      {/* Logo - absolute top left sama seperti login */}
      <div className="absolute top-5 left-6 z-10">
        <div className="scale-[0.55] origin-top-left">
          <Logo />
        </div>
      </div>

      {/* Center Content */}
      <div className="flex h-full items-center justify-center">
        <div className="w-full max-w-lg px-4">

          {/* Card */}
          <div className="bg-[#11499E] rounded-2xl p-8 md:p-10 shadow-2xl">

            {/* Back Button - di dalam card, lingkaran putih */}
            <button
              onClick={() => router.push('/login')}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-6 hover:bg-gray-100 transition"
            >
              <svg className="w-5 h-5 text-[#11499E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Header */}
            <h1 className="text-white text-3xl font-bold text-center mb-3">Forgot Password?</h1>
            <p className="text-white/80 text-center text-sm mb-8">
              Please write your email to receive a confirmation<br />
              code to set a new password
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-white font-semibold text-xs block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your Email or User ID"
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
                {loading ? 'Sending...' : 'Confirm Email'}
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}