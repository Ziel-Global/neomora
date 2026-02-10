import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { SubAdminSidebar } from './SubAdminSidebar';
import { useAuth } from '@/contexts/AuthContext';

export const SubAdminLayout: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Allow both subadmin and admin roles
  if (user?.role !== 'subadmin' && user?.role !== 'admin') {
    return <Navigate to="/my-status" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <SubAdminSidebar />
      <main className="lg:pl-64 pt-16 lg:pt-0">
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
