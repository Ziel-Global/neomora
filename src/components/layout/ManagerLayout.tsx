import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { ManagerSidebar } from './ManagerSidebar';
import { useManagerSession } from '@/contexts/ManagerSessionContext';
import { Loader2 } from 'lucide-react';

export const ManagerLayout: React.FC = () => {
  const { isAuthenticated, manager, isLoading } = useManagerSession();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login/manager', { state: { from: location }, replace: true });
    }
  }, [isLoading, isAuthenticated, navigate, location]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ManagerSidebar />
        <SidebarInset className="flex-1">
          <header className="h-14 border-b flex items-center px-4 gap-4 bg-background">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Team Manager Portal</h1>
            </div>
            {manager && (
              <div className="text-sm text-muted-foreground">
                {manager.organization} • {manager.country}
              </div>
            )}
          </header>
          <main className="p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
