import { useState, useEffect } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';

interface Module {
  id: number;
  module_name: string;
  endpoint: string;
}

interface UseModuleAccessReturn {
  modules: Module[];
  hasAccess: (endpoint: string) => boolean;
  loading: boolean;
}

export function useModuleAccess(): UseModuleAccessReturn {
  const { user, loading: authLoading } = useAuth(false);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    if (user.role === 'admin') { setLoading(false); return; }

    fetchModules();
  }, [user, authLoading]);

  const fetchModules = async () => {
    try {
      const response = await fetch(`/api/auth/modules?nik=${user?.nik}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        setFetchFailed(true);
        setLoading(false);
        return;
      }

      const contentType = response.headers.get('Content-Type') || '';
      if (!contentType.includes('application/json')) {
        setFetchFailed(true);
        setLoading(false);
        return;
      }

      const data = await response.json();
      setModules(data.modules || []);
      setFetchFailed(false);
    } catch (error) {
      console.warn('[ModuleAccess] Fetch error:', error);
      setFetchFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const hasAccess = (endpoint: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (fetchFailed) return false;
    if (loading) return false;
    return modules.some(m => m.endpoint === endpoint);
  };

  return { modules, hasAccess, loading };
}