'use client';

import { useState, ReactNode } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import Header from '@/features/iris/components/Header';
import ModuleGuard from '@/features/iris/components/ModuleGuard';
import { useRouter } from 'next/navigation';
import { 
  CircleDot, 
  BrainCircuit, 
  Cpu, 
  GitMerge, 
  Pentagon, 
  Network, 
  FileOutput, 
  ClipboardList, 
  Calculator,
  Zap,
  Boxes,
  MapPin
} from 'lucide-react';

type TabType = 'intersite' | 'report' | 'graphopper' | 'fwa' | 'ftth';

interface DesignCard {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
}

export default function FTTXDesignPage() {
  const router = useRouter();
  const { user, loading } = useAuth(true);
  const [activeTab, setActiveTab] = useState<TabType>('intersite');

  const intersiteDesigns: DesignCard[] = [
    { id: 'insert-ring', title: 'Insert Ring', description: 'Create Intersite design based on Insert Algorithm.', icon: <CircleDot className="w-5 h-5 text-blue-600" /> },
    { id: 'supervised-algorithm', title: 'Supervised Algorithm', description: 'Create Intersite design based on Supervised Algorithm.', icon: <BrainCircuit className="w-5 h-5 text-indigo-600" /> },
    { id: 'unsupervised-algorithm', title: 'Unsupervised Algorithm', description: 'clustering based on our service.', icon: <Cpu className="w-5 h-5 text-purple-600" /> },
    { id: 'fixroute-ring', title: 'Fixroute Ring', description: 'Create Intersite design based on Fix Route Algorithm.', icon: <GitMerge className="w-5 h-5 text-cyan-600" /> },
    { id: 'polygon-intersite', title: 'Polygon Intersite', description: 'Create Intersite design Polygon Based.', icon: <Pentagon className="w-5 h-5 text-emerald-600" /> },
    { id: 'topology-intersite', title: 'Topology Intersite', description: 'Create Intersite design Topology Based.', icon: <Network className="w-5 h-5 text-orange-600" /> },
    { id: 'implementation-intersite', title: 'Implementation Intersite', description: 'Implementation KMZ with BOQ Report.', icon: <MapPin className="w-5 h-5 text-rose-600" /> },
        { id: 'short-mmp', title: 'Short MMP', description: 'Generate a concise MMP for intersite fiber projects.', icon: <MapPin className="w-5 h-5 text-rose-600" /> },
  ];

  const reportDesigns: DesignCard[] = [
    { id: 'drm-intersite', title: 'DRM Intersite', description: 'Create DRM Report based on Design KMZ.', icon: <FileOutput className="w-5 h-5 text-blue-500" /> },
    { id: 'boq-intersite', title: 'BoQ Intersite', description: 'Create BOQ Report based on Implementation KMZ.', icon: <ClipboardList className="w-5 h-5 text-emerald-500" /> },
  ];

  const graphopperDesigns: DesignCard[] = [
    { id: 'graphopper', title: 'Graphopper', description: 'Coming soon.', icon: <Zap className="w-5 h-5 text-yellow-500" /> },
  ];

  const fwaDesigns: DesignCard[] = [
    { id: 'fwa', title: 'FWA', description: 'Coming soon.', icon: <Boxes className="w-5 h-5 text-pink-500" /> },
  ];

  const ftthDesigns: DesignCard[] = [
    { id: 'ftth', title: 'FTTH', description: 'Coming soon.', icon: <Calculator className="w-5 h-5 text-slate-500" /> },
  ];

  const getActiveDesigns = () => {
    switch (activeTab) {
      case 'intersite': return intersiteDesigns;
      case 'report': return reportDesigns;
      case 'graphopper': return graphopperDesigns;
      case 'fwa': return fwaDesigns;
      case 'ftth': return ftthDesigns;
      default: return intersiteDesigns;
    }
  };

  const handleCardClick = (design: DesignCard) => {
    const routes: Record<string, string> = {
      'insert-ring': '/iris/insert-ring',
      'supervised-algorithm': '/iris/supervised-algorithm',
      'unsupervised-algorithm': '/iris/unsupervised-algorithm',
      'fixroute-ring': '/iris/fixroute-ring',
      'polygon-intersite': '/iris/polygon-intersite',
      'topology-intersite': '/iris/topology-intersite',
      'implementation-intersite': '/iris/implementation-intersite',
      'drm-intersite': '/iris/drm-intersite',
      'boq-intersite': '/iris/boq-intersite',
    };

    if (routes[design.id]) {
      router.push(routes[design.id]);
    } else {
      alert(`${design.title} - Coming soon!`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-[#11499E] font-medium animate-pulse tracking-widest uppercase text-xs">Loading System...</div>
      </div>
    );
  }

  if (!user) return null;

  const tabs: { key: TabType; label: string }[] = [
    { key: 'intersite', label: 'Intersite' },
    { key: 'report', label: 'Report' },
    { key: 'graphopper', label: 'Graphopper' },
    { key: 'fwa', label: 'FWA' },
    { key: 'ftth', label: 'FTTH' },
  ];

  return (
    <ModuleGuard moduleGroup="intersite">
      <div className="h-screen bg-white flex flex-col overflow-hidden antialiased">
        <Header user={user} />

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="max-w-4xl w-full mx-auto px-6 flex flex-col h-full overflow-hidden">

            {/* Title Section */}
            <div className="pt-12 pb-4 flex-shrink-0 flex justify-center">
              <div className="text-center">
                <h1 className="text-5xl font-bold text-[#11499E] leading-none mb-1 tracking-tighter">
                  Network Planning
                </h1>
                <div className="flex items-baseline gap-2 justify-center">
                  <span className="text-2xl font-medium text-[#11499E]">design</span>
                  <span className="text-4xl font-bold text-[#11499E]">Engineering</span>
                  <span className="text-4xl font-bold text-[#1E99D5]">API</span>
                  <span className="text-4xl font-bold text-[#11499E]">services</span>
                </div>
              </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex justify-center mb-4 flex-shrink-0">
              <div className="flex bg-gray-50 p-1 rounded-full border border-gray-200">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-6 py-1.5 text-xs font-bold rounded-full transition-all duration-200 ${
                      activeTab === tab.key
                        ? 'bg-[#11499E] text-white shadow-lg'
                        : 'text-gray-500 hover:text-[#11499E]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cards Grid */}
            <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pb-6">
                {getActiveDesigns().map((design) => (
                  <button
                    key={design.id}
                    onClick={() => handleCardClick(design)}
                    className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center text-center hover:border-[#11499E] hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 group relative overflow-hidden h-[130px] justify-center"
                  >
                    <div className="mb-2 p-2 bg-gray-50 rounded-xl group-hover:bg-blue-50 transition-colors duration-300">
                      {design.icon}
                    </div>

                    <h3 className="text-xs font-bold text-gray-800 mb-1 leading-tight group-hover:text-[#11499E] transition-colors">
                      {design.title}
                    </h3>
                    <p className="text-[10px] text-gray-400 leading-relaxed line-clamp-2 px-2">
                      {design.description}
                    </p>

                    <div className="absolute bottom-0 left-0 w-full h-1 bg-[#11499E] transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  </button>
                ))}
              </div>
            </div>

          </div>
        </main>
      </div>
    </ModuleGuard>
  );
}