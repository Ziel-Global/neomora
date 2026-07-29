import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { teamManagerLogin as teamManagerLoginApi } from '@/api/authApi';

export interface TeamManager {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  organization: string;
  federation?: string;
  createdAt: string;
  [key: string]: unknown;
}

interface ManagerSessionContextType {
  manager: TeamManager | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<TeamManager | null>;
  logout: () => void;
  updateManager: (updates: Partial<TeamManager>) => void;
}

const ManagerSessionContext = createContext<ManagerSessionContextType | undefined>(undefined);

export const MANAGER_SESSION_KEY = 'ems_manager_session';
export const MANAGER_TOKEN_KEY = 'ems_manager_token';

const buildManagerSession = (
  user: Record<string, unknown> | undefined,
  email: string,
): TeamManager => ({
  id: String(user?.id || user?._id || ''),
  firstName: (user?.firstName as string) || (user?.name as string)?.split(' ')[0] || '',
  lastName: (user?.lastName as string) || (user?.name as string)?.split(' ').slice(1).join(' ') || '',
  email: (user?.email as string) || email,
  phone: (user?.phone as string) || '',
  country: (user?.country as string) || '',
  organization: (user?.organization as string) || '',
  federation: (user?.federation as string) || undefined,
  createdAt: (user?.createdAt as string) || new Date().toISOString(),
  ...user,
});

const readStoredManager = (): TeamManager | null => {
  try {
    const stored = localStorage.getItem(MANAGER_SESSION_KEY);
    const token = localStorage.getItem(MANAGER_TOKEN_KEY);

    if (!stored || !token) {
      if (stored && !token) localStorage.removeItem(MANAGER_SESSION_KEY);
      if (!stored && token) localStorage.removeItem(MANAGER_TOKEN_KEY);
      return null;
    }

    return JSON.parse(stored) as TeamManager;
  } catch {
    localStorage.removeItem(MANAGER_SESSION_KEY);
    localStorage.removeItem(MANAGER_TOKEN_KEY);
    return null;
  }
};

const persistManagerSession = (managerData: TeamManager, token?: string) => {
  localStorage.setItem(MANAGER_SESSION_KEY, JSON.stringify(managerData));
  if (token) {
    localStorage.setItem(MANAGER_TOKEN_KEY, token);
  }
};

export const ManagerSessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [manager, setManager] = useState<TeamManager | null>(() => readStoredManager());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restored = readStoredManager();
    setManager(restored);
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<TeamManager | null> => {
    try {
      const response = await teamManagerLoginApi(email, password);
      const token = response.token;

      if (!token) {
        console.error('Manager login succeeded but no token was returned');
        return null;
      }

      const managerData = buildManagerSession(response.user as Record<string, unknown>, email);
      setManager(managerData);
      persistManagerSession(managerData, token);

      return managerData;
    } catch (error: any) {
      console.error('Manager login failed:', error?.response?.data || error.message);
      return null;
    }
  };

  const logout = useCallback(() => {
    setManager(null);
    localStorage.removeItem(MANAGER_SESSION_KEY);
    localStorage.removeItem(MANAGER_TOKEN_KEY);
  }, []);

  const updateManager = useCallback((updates: Partial<TeamManager>) => {
    setManager(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      localStorage.setItem(MANAGER_SESSION_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <ManagerSessionContext.Provider
      value={{
        manager,
        isAuthenticated: !!manager,
        isLoading,
        login,
        logout,
        updateManager,
      }}
    >
      {children}
    </ManagerSessionContext.Provider>
  );
};

export const useManagerSession = () => {
  const context = useContext(ManagerSessionContext);
  if (!context) {
    throw new Error('useManagerSession must be used within a ManagerSessionProvider');
  }
  return context;
};
