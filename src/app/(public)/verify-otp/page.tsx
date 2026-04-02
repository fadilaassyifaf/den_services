// app/verify-otp/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/features/iris/components/Logo';

export default function VerifyOTPPage() {
  const router = useRouter();
  const [otp, setOtp] = useState(['', '', '', '']);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    const resetEmail = localStorage.getItem('reset_email');
    if (!resetEmail) {
      router.push('/forgot-password');
      return;
    }
    setEmail(resetEmail);
  }, [router]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 3) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleResend = async () => {
    setTimer(30);
    setCanResend(false);
    setError('');
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch {
      setError('Failed to resend OTP');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const otpCode = otp.join('');
    if (otpCode.length !== 4) {
      setError('Please enter 4-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otpCode }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Invalid OTP');
        setLoading(false);
        return;
      }
      localStorage.setItem('verified_otp', otpCode);
      router.push('/reset-password');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-white overflow-hidden flex flex-col">

      {/* ✅ Logo - absolute top left sama seperti login & forgot-password */}
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

            {/* ✅ Back Button - lingkaran putih, arrow biru */}
            <button
              onClick={() => router.push('/forgot-password')}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-6 hover:bg-gray-100 transition"
            >
              <svg className="w-5 h-5 text-[#11499E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Header */}
            <h1 className="text-white text-3xl font-bold text-center mb-2">Verify email address</h1>
            <p className="text-white/80 text-center text-sm mb-8">
              verify code sent to{' '}
              <span className="text-[#1E99D5] font-medium">{email}</span>
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* OTP Boxes */}
              <div className="flex justify-center gap-4">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-16 h-16 text-center text-2xl font-bold bg-white rounded-xl text-[#1E99D5] outline-none focus:ring-2 focus:ring-[#1E99D5] border-2 border-transparent focus:border-[#1E99D5] transition-all"
                  />
                ))}
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-400/50 text-red-100 px-3 py-2 rounded-lg text-xs text-center">
                  {error}
                </div>
              )}

              {/* Confirm Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-[#1E99D5] hover:bg-[#1787c2] active:bg-[#1575a8] text-white font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? 'Verifying...' : 'Confirm Code'}
              </button>

              {/* Timer & Resend */}
              <div className="flex items-center justify-center gap-3 text-sm">
                <span className="text-white/80">
                  {`00:${timer.toString().padStart(2, '0')}`}
                </span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={!canResend}
                  className={`font-medium transition ${
                    canResend
                      ? 'text-[#1E99D5] hover:text-blue-300 cursor-pointer'
                      : 'text-white/40 cursor-not-allowed'
                  }`}
                >
                  Resend confirmation code
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}