'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  activeMenu: string;
  onMenuClick?: (item: string) => void;
}

const menuItems: Record<string, string[]> = {
  Intersite: [
    'Insert Ring',
    'Supervised Algorithm',
    'Unsupervised Algorithm',
    'Fixroute Ring',
    'Polygon Intersite',
    'Topology Intersite',
    'Implementation Intersite',
  ],
  Report: ['Drm Intersite Route', 'BoQ Intersite Route', 'BoQ Mmp Route'],
  Other: ['Coming Soon'],
};

const routes: Record<string, string> = {
  'Insert Ring': '/iris/insert-ring',
  'Supervised Algorithm': '/iris/supervised-algorithm',
  'Unsupervised Algorithm': '/iris/unsupervised-algorithm',
  'Fixroute Ring': '/iris/fixroute-ring',
  'Polygon Intersite': '/iris/polygon-intersite',
  'Topology Intersite': '/iris/topology-intersite',
  'Implementation Intersite': '/iris/implementation-intersite',
  'Drm Intersite Route': '/iris/drm-intersite',
  'BoQ Intersite Route': '/iris/boq-intersite',
  'BoQ Mmp Route': '/iris/boq-mmp',
  'Custom Design': '/iris/custom-design',
};

function getCategoryOfMenu(activeMenu: string): string | null {
  for (const [category, items] of Object.entries(menuItems)) {
    if ((items as string[]).includes(activeMenu)) return category;
  }
  return null;
}

export default function Sidebar({ activeMenu, onMenuClick }: SidebarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const [expandedMenus, setExpandedMenus] = useState<string[]>(() => {
    if (typeof window === 'undefined') return ['Intersite'];
    try {
      const saved = localStorage.getItem('sidebarExpanded');
      if (saved) return JSON.parse(saved);
    } catch {}
    const activeCategory = getCategoryOfMenu(activeMenu);
    return activeCategory ? [activeCategory] : ['Intersite'];
  });

  useEffect(() => {
    try {
      localStorage.setItem('sidebarExpanded', JSON.stringify(expandedMenus));
    } catch {}
  }, [expandedMenus]);

  useEffect(() => {
    const activeCategory = getCategoryOfMenu(activeMenu);
    if (activeCategory && !expandedMenus.includes(activeCategory)) {
      setExpandedMenus(prev => [...prev, activeCategory]);
    }
  }, [activeMenu]);

  const toggleMenu = (menu: string) => {
    setExpandedMenus(prev =>
      prev.includes(menu) ? prev.filter(m => m !== menu) : [...prev, menu]
    );
  };

  const handleMenuClick = (item: string) => {
    if (onMenuClick) onMenuClick(item);
    if (routes[item]) router.push(routes[item]);
  };

  const filteredMenuItems =
    searchQuery.trim() === ''
      ? menuItems
      : Object.fromEntries(
          Object.entries(menuItems)
            .map(([cat, items]) => [
              cat,
              items.filter(item =>
                item.toLowerCase().includes(searchQuery.toLowerCase())
              ),
            ])
            .filter(([, items]) => (items as string[]).length > 0)
        );

  return (
    <>
      <style>{`
        .sidebar-scrollbar::-webkit-scrollbar { width: 4px; }
        .sidebar-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 4px; }

        .menu-collapse {
          display: grid;
          grid-template-rows: 0fr;
          opacity: 0;
          transition: grid-template-rows 0.35s cubic-bezier(0.4,0,0.2,1),
                      opacity 0.3s ease;
        }
        .menu-collapse.open {
          grid-template-rows: 1fr;
          opacity: 1;
        }
        .menu-collapse > div { overflow: hidden; }

        .cat-btn { transition: background 0.2s ease; }
        .cat-btn:hover { background: #f0f4ff !important; }

        .sub-item {
          transition: color 0.2s ease, padding-left 0.2s ease, background 0.15s ease;
          border-radius: 6px;
        }
        .sub-item:hover {
          padding-left: 14px !important;
          background: rgba(255,255,255,0.08);
        }
      `}</style>

      <div
        className="w-48 bg-[#11499E] flex flex-col flex-shrink-0 overflow-hidden"
        style={{ borderRadius: '14px' }}
      >
        <div className="p-4 flex flex-col h-full overflow-hidden">

          {/* Search */}
          <div className="relative mb-4 mt-2 flex-shrink-0">
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                if (e.target.value) setExpandedMenus(Object.keys(menuItems));
                else {
                  try {
                    const saved = localStorage.getItem('sidebarExpanded');
                    if (saved) setExpandedMenus(JSON.parse(saved));
                  } catch {
                    const activeCategory = getCategoryOfMenu(activeMenu);
                    setExpandedMenus(activeCategory ? [activeCategory] : ['Intersite']);
                  }
                }
              }}
              className="w-full px-3 py-1.5 pr-8 rounded-md text-xs bg-white text-gray-800 placeholder-gray-400 outline-none"
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute right-2.5 top-1.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Menu */}
          <div className="flex-1 overflow-y-auto pr-1 sidebar-scrollbar">
            {Object.entries(filteredMenuItems).map(([category, items]) => {
              const isOpen = expandedMenus.includes(category);
              return (
                <div key={category} className="mb-2">
                  <button
                    onClick={() => toggleMenu(category)}
                    className="cat-btn w-full flex items-center justify-between px-3 py-1.5 bg-white rounded-md text-[#11499E] font-semibold text-xs"
                  >
                    {category}
                    <span className="text-[#11499E] font-bold text-sm leading-none">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>

                  <div className={`menu-collapse ${isOpen ? 'open' : ''}`}>
                    <div>
                      <div className="mt-1 ml-1 mr-1">
                        {(items as string[]).map(item => (
                          <button
                            key={item}
                            onClick={() => handleMenuClick(item)}
                            className={`sub-item w-full text-left px-3 py-1.5 text-xs border-b border-white/20 ${
                              activeMenu === item
                                ? 'text-white font-semibold'
                                : 'text-blue-200 hover:text-white'
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </>
  );
}