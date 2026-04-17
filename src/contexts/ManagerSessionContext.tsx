import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  login: (email: string, password: string) => Promise<TeamManager | null>;
  logout: () => void;
}

const ManagerSessionContext = createContext<ManagerSessionContextType | undefined>(undefined);

const MANAGER_SESSION_KEY = 'ems_manager_session';
const MANAGER_TOKEN_KEY = 'ems_manager_token';

export const ManagerSessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [manager, setManager] = useState<TeamManager | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(MANAGER_SESSION_KEY);
    if (stored) {
      try {
        setManager(JSON.parse(stored));
      } catch {
        localStorage.removeItem(MANAGER_SESSION_KEY);
        localStorage.removeItem(MANAGER_TOKEN_KEY);
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<TeamManager | null> => {
    try {
      const response = await teamManagerLoginApi(email, password);

      const managerData: TeamManager = {
        id: response.user?.id || '',
        firstName: response.user?.name?.split(' ')[0] || '',
        lastName: response.user?.name?.split(' ').slice(1).join(' ') || '',
        email: response.user?.email || email,
        phone: '',
        country: '',
        organization: '',
        createdAt: new Date().toISOString(),
        ...response.user,
      };

      setManager(managerData);
      localStorage.setItem(MANAGER_SESSION_KEY, JSON.stringify(managerData));
      localStorage.setItem(MANAGER_TOKEN_KEY, response.token);

      return managerData;
    } catch (error: any) {
      console.error('Manager login failed:', error?.response?.data || error.message);
      return null;
    }
  };

  const logout = () => {
    setManager(null);
    localStorage.removeItem(MANAGER_SESSION_KEY);
    localStorage.removeItem(MANAGER_TOKEN_KEY);
  };

  return (
    <ManagerSessionContext.Provider value={{ manager, isAuthenticated: !!manager, login, logout }}>
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