'use client';

import { useAuth } from '@/shared/hooks/useAuth';
import Header from '@/features/iris/components/Header';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth(true);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-[#164194] font-medium animate-pulse tracking-widest uppercase text-xs">Loading System...</div>
      </div>
    );
  }

  if (!user) return null;

  const tools = [
    {
      title: 'Network Monitoring',
      description: 'Real-time capacity, availability, and operational status.',
      onClick: () => router.push('http://localhost:3002'),
    },
    {
      title: 'Network Planning',
      description: 'Infrastructure layouts and strategic route planning.',
      onClick: () => router.push('/fttx-design'),
    },
    {
      title: 'Utils',
      description: 'Advanced tools for data processing and engineering.',
      onClick: () => alert('Coming soon!'),
    },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans antialiased overflow-hidden">
      <Header user={user} />

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-10 md:px-20 flex items-center justify-between py-12 gap-10">

        {/* === LEFT: Branding === */}
        <div className="flex-[1.2] flex flex-col justify-center select-none relative">
          <div className="relative inline-block group">
            
            {/* Main Typography Layer */}
            <div className="relative z-10 flex flex-col">
              <div className="flex items-end">
                {/* DESIGN */}
                <h1 className="font-black text-[#164194] tracking-tighter leading-[1]" 
                    style={{ fontSize: 'clamp(4rem, 7vw, 7.5rem)' }}>
                  Design
                </h1>
                
                {/* Refined Circle "and" - Tetap dengan posisi overlap yang pas */}
                <div className="relative ml-[-15px] z-[-1] translate-y-12 md:translate-y-14 transition-transform duration-500 group-hover:scale-105">
                  <div className="w-[100px] h-[100px] md:w-[145px] md:h-[145px] bg-[#299CDB] rounded-full flex items-center justify-center relative shadow-xl shadow-blue-200/40">
                    <span className="text-white font-bold italic text-3xl md:text-5xl mt-1 mr-1 tracking-tight">
                      and
                    </span>
                    <div className="absolute top-[22%] right-[24%] w-3 h-3 md:w-5 md:h-5 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* ENGINEERING - Jarak diatur agar seimbang dengan and-circle */}
              <h1 className="font-black text-[#164194] tracking-tighter leading-[0.9] mt-6 md:mt-2" 
                  style={{ fontSize: 'clamp(4rem, 7.5vw, 8.5rem)' }}>
                Engineering
              </h1>
            </div>

            {/* Integrated Hub - Diletakkan tepat di bawah Engineering dengan margin yang bersih */}
            <div className="mt-14 md:mt-2 flex items-center gap-3 ml-38">
              <span className="font-bold text-[#299CDB] tracking-[0.02em] uppercase" 
                    style={{ fontSize: 'clamp(1.2rem, 2.2vw, 2.2rem)' }}>
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

        {/* === RIGHT: Available Tools Panel === */}
        <div className="flex-1 max-w-[560px] bg-[#164194] rounded-[3rem] p-10 md:p-12 shadow-[0_20px_50px_rgba(22,65,148,0.2)]">
          {/* Header Available Tools: Garis biru di samping sudah dihapus */}
          <h2 className="font-bold text-white mb-10 text-2xl md:text-3xl tracking-tight">
            Available Tools
          </h2>

          <div className="grid grid-cols-3 gap-3">
            {tools.map((tool, i) => (
              <div
                key={i}
                onClick={tool.onClick}
                className="group bg-[#F4F7FF] hover:bg-white rounded-[1.8rem] p-5 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 border border-transparent hover:border-blue-50"
                style={{ minHeight: '230px' }}
              >
                <div className="space-y-3">
                  <h3 className="font-bold text-[#164194] leading-[1.2] text-[13px] md:text-[15px] tracking-tight transition-colors group-hover:text-[#299CDB]">
                    {tool.title.replace('\n', ' ')}
                  </h3>
                  <p className="text-[#164194]/60 text-[10px] md:text-[11px] leading-relaxed font-medium">
                    {tool.description}
                  </p>
                </div>

                <div className="flex justify-end">
                  <div className="w-8 h-8 rounded-full bg-[#164194] group-hover:bg-[#299CDB] flex items-center justify-center transition-all duration-300 shadow-md group-hover:rotate-[-45deg]">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}