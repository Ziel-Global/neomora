import React, { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin as adminLoginApi, subadminLogin as subadminLoginApi } from '@/api/authApi';

export type UserRole = 'admin' | 'subadmin' | 'guest';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  [key: string]: unknown;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Role to login route mapping
const roleLoginRoutes: Record<UserRole, string> = {
  admin: '/login/admin',
  subadmin: '/login/staff',
  guest: '/login/participant',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('ems_user');
    return stored ? JSON.parse(stored) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('ems_token');
  });

  const login = useCallback(async (email: string, password: string, role: UserRole): Promise<boolean> => {
    try {
      let response;
      if (role === 'subadmin') {
        response = await subadminLoginApi(email, password);
      } else {
        response = await adminLoginApi(email, password);
      }

      const loggedInUser: User = {
        id: response.user?.id || '',
        email: response.user?.email || email,
        name: response.user?.name || email,
        role: role,
        ...response.user,
      };

      const authToken = response.token;

      setUser(loggedInUser);
      setToken(authToken);
      localStorage.setItem('ems_user', JSON.stringify(loggedInUser));
      localStorage.setItem('ems_token', authToken);

      return true;
    } catch (error: any) {
      console.error('Login failed:', error?.response?.data || error.message);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    const currentRole = user?.role;
    setUser(null);
    setToken(null);
    localStorage.removeItem('ems_user');
    localStorage.removeItem('ems_token');

    if (currentRole) {
      const loginRoute = roleLoginRoutes[currentRole];
      navigate(loginRoute);
    } else {
      navigate('/');
    }
  }, [user, navigate]);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user && !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
