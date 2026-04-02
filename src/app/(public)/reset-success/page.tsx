// app/reset-success/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import Logo from '@/features/iris/components/Logo';

export default function ResetSuccessPage() {
  const router = useRouter();

  return (
    <div className="h-screen bg-white overflow-hidden flex flex-col">

      {/* Logo - sama seperti OTP page */}
      <div className="absolute top-5 left-6 z-10">
        <div className="scale-[0.55] origin-top-left">
          <Logo />
        </div>
      </div>

      {/* Center Content */}
      <div className="flex h-full items-center justify-center">
        <div className="w-full max-w-sm px-4">

          {/* Card */}
          <div className="bg-[#11499E] rounded-2xl p-8 md:p-10 shadow-2xl">

            {/* Back Button - lingkaran putih, arrow biru */}
            <button
              onClick={() => router.push('/login')}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-6 hover:bg-gray-100 transition"
            >
              <svg className="w-5 h-5 text-[#11499E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Success Text */}
            <h1 className="text-white text-3xl font-bold text-center mb-12">
              Reset Password<br />Success!
            </h1>

            {/* Login Button */}
            <button
              onClick={() => router.push('/login')}
              className="w-full py-2.5 rounded-xl bg-[#1E99D5] hover:bg-[#1787c2] active:bg-[#1575a8] text-white font-semibold text-sm transition-all shadow-lg"
            >
              Login
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}