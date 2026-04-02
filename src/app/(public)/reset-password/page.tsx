// app/reset-password/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/features/iris/components/Logo';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumbers = (newPassword.match(/\d/g) || []).length >= 2;
  const hasMinLength = newPassword.length >= 8;

  useEffect(() => {
    const resetEmail = localStorage.getItem('reset_email');
    const verifiedOtp = localStorage.getItem('verified_otp');
    if (!resetEmail || !verifiedOtp) {
      router.push('/forgot-password');
      return;
    }
    setEmail(resetEmail);
    setOtp(verifiedOtp);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!hasUppercase || !hasNumbers || !hasMinLength) {
      setError('Password does not meet requirements');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to reset password');
        setLoading(false);
        return;
      }
      localStorage.removeItem('reset_email');
      localStorage.removeItem('verified_otp');
      router.push('/reset-success');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const CheckItem = ({ valid, text }: { valid: boolean; text: string }) => (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all border-2 ${
        valid
          ? 'bg-green-400 border-green-400'
          : 'bg-transparent border-white'
      }`}>
        {valid && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className={`text-xs transition-all ${valid ? 'text-green-400' : 'text-white'}`}>
        {text}
      </span>
    </div>
  );

  return (
    <div className="h-screen bg-white overflow-hidden flex flex-col">

      {/* Logo - absolute top left */}
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

            {/* Back Button */}
            <button
              onClick={() => router.push('/verify-otp')}
              className="w-8 h-8 bg-white rounded-full flex items-center justify-center mb-5 hover:bg-gray-100 transition"
            >
              <svg className="w-4 h-4 text-[#11499E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Header */}
            <h1 className="text-white text-2xl font-bold text-center mb-1">New Password</h1>
            <p className="text-white/80 text-center text-xs mb-5">
              Plase write your new password
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">

              <div>
                <label className="text-white font-semibold text-xs block mb-1">Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder=""
                  className="w-full px-4 py-2.5 rounded-xl bg-white text-gray-800 text-sm placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#1E99D5] transition-all"
                />
              </div>

              <div>
                <label className="text-white font-semibold text-xs block mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder=""
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
                className="w-full py-2.5 rounded-xl bg-[#1E99D5] hover:bg-[#1787c2] active:bg-[#1575a8] text-white font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? 'Resetting...' : 'Confirm'}
              </button>

              {/* Password Requirements */}
              <div className="pt-1 space-y-1.5">
                <p className="text-white text-xs">Your new password must include:</p>
                <CheckItem valid={hasUppercase} text="At least 1 uppercase letter" />
                <CheckItem valid={hasNumbers} text="At least 2 numbers" />
                <CheckItem valid={hasMinLength} text="At least 8 characters" />
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}