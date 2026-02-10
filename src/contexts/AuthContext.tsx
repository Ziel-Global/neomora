import React, { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '@/data/mockData';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo
const mockUsers: Record<UserRole, User> = {
  admin: {
    id: 'admin-001',
    email: 'admin@eventems.com',
    name: 'John Admin',
    role: 'admin',
  },
  subadmin: {
    id: 'subadmin-001',
    email: 'ops@eventems.com',
    name: 'Sarah Operations',
    role: 'subadmin',
  },
  guest: {
    id: 'guest-001',
    email: 'guest@email.com',
    name: 'Guest User',
    role: 'guest',
  },
};

// Role to login route mapping
const roleLoginRoutes: Record<UserRole, string> = {
  admin: '/login/admin',
  subadmin: '/login/staff',
  guest: '/login/participant',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('ems_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (email: string, password: string, role: UserRole): Promise<boolean> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Demo: Accept any password for mock users
    const mockUser = mockUsers[role];
    if (mockUser) {
      // Create user with provided email if different from mock
      const loggedInUser = {
        ...mockUser,
        email: email || mockUser.email,
      };
      setUser(loggedInUser);
      localStorage.setItem('ems_user', JSON.stringify(loggedInUser));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    const currentRole = user?.role;
    setUser(null);
    localStorage.removeItem('ems_user');
    
    // Return the appropriate login route based on role
    if (currentRole) {
      const loginRoute = roleLoginRoutes[currentRole];
      window.location.href = loginRoute;
    } else {
      window.location.href = '/';
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
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
