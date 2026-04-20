'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Logo from './Logo';
import { useLogout } from '@/shared/hooks/useAuth';
import { AuthUser } from '@/shared/context/AuthContext';

interface HeaderProps {
  user: AuthUser | null;
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter();
  const { logout } = useLogout();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showBurger, setShowBurger] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (burgerRef.current && !burgerRef.current.contains(event.target as Node)) {
        setShowBurger(false);
        setExpandedMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setShowDropdown(false);
    await logout();
  };

  const navigate = (path: string) => {
    setShowBurger(false);
    setExpandedMenu(null);
    router.push(path);
  };

  const burgerMenus = [
    {
      key: 'network-planning',
      label: 'Network Planning',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
      items: [
        { label: 'Intersite', path: '/iris/fixroute-ring' },
        { label: 'Report', path: '/iris/drm-intersite' },
        { label: 'Graphopper', path: '/fttx-design?tab=graphopper' },
        { label: 'FWA', path: '/fttx-design?tab=fwa' },
        { label: 'FTTH', path: '/fttx-design?tab=ftth' },
      ],
    },
    {
      key: 'utils',
      label: 'Utils',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      items: [
        { label: 'Get Homepass', path: '/utils/get-homepass' },
        { label: 'Fiber Utilization', path: '/utils/fiber-utilization' },
        { label: 'POI Remark', path: '/utils/poi-remark' },
        { label: 'Intersite Takeout Ring', path: '/utils/intersite-takeout-ring' },
        { label: 'Intersite Take Out Segment', path: '/utils/intersite-takeout-segment' },
      ],
    },
  ];

  const isAdminOrSuperuser = user?.role === 'admin' || user?.role === 'superuser';

  return (
    <header className="border-b border-gray-200 px-6 py-2 flex-shrink-0 bg-white">
      <div className="flex items-center justify-between h-10">

        {/* Logo */}
        <div
          className="scale-[0.6] origin-left cursor-pointer"
          onClick={() => router.push('/home')}
        >
          <Logo />
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">

          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">

            {/* Home */}
            <button
              onClick={() => router.push('/home')}
              className="px-3 py-1 bg-[#11499E] text-white text-xs rounded-md hover:bg-[#0d3a7d] transition font-medium"
            >
              Home
            </button>

            {/* Dashboard */}
            <button
              onClick={() => router.push('http://localhost:3003')}
              className="px-3 py-1 text-xs text-[#11499E] rounded-md hover:bg-gray-200 transition font-medium"
            >
              Dashboard
            </button>

            {/* Hamburger */}
            <div className="relative" ref={burgerRef}>
              <button
                onClick={() => { setShowBurger(!showBurger); setExpandedMenu(null); }}
                className="px-2 py-1 rounded-md hover:bg-gray-200 transition"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {showBurger && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                  <p className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Modules
                  </p>

                  {burgerMenus.map((menu) => (
                    <div key={menu.key}>
                      <button
                        onClick={() => setExpandedMenu(expandedMenu === menu.key ? null : menu.key)}
                        className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50 transition group"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-[#11499E]">{menu.icon}</span>
                          <span className="text-sm font-semibold text-gray-700 group-hover:text-[#11499E]">
                            {menu.label}
                          </span>
                        </div>
                        <svg
                          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${expandedMenu === menu.key ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {expandedMenu === menu.key && (
                        <div className="bg-gray-50 border-t border-b border-gray-100">
                          {menu.items.map((item) => (
                            <button
                              key={item.label}
                              onClick={() => navigate(item.path)}
                              className="w-full px-4 py-2 pl-10 flex items-center gap-2 hover:bg-blue-50 transition text-left group"
                            >
                              <div className="w-1 h-1 rounded-full bg-gray-300 group-hover:bg-[#11499E] flex-shrink-0" />
                              <span className="text-xs text-gray-600 group-hover:text-[#11499E] font-medium">
                                {item.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* My Profile */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="px-3 py-1 bg-[#11499E] text-white text-xs rounded-md hover:bg-[#0d3a7d] transition font-medium"
            >
              My Profile
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">

                {/* User info */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                  <p className="text-xs text-gray-500">@{user?.username}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    isAdminOrSuperuser
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {user?.role}
                  </span>
                </div>

                {/* Menu section */}
                <div className="px-4 py-1.5">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Menu</p>
                </div>

                {/* Activity Log */}
                <button
                  onClick={() => { setShowDropdown(false); router.push('/activity-log'); }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Activity Log
                </button>

                {/* Access Management — admin & superuser only */}
                {isAdminOrSuperuser && (
                  <button
                    onClick={() => { setShowDropdown(false); router.push('/access-management'); }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Access Management
                  </button>
                )}

                <div className="border-t border-gray-100 my-1" />

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>

              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}