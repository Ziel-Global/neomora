 import React from 'react';
 import { Outlet, Navigate } from 'react-router-dom';
 import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
 import { ManagerSidebar } from './ManagerSidebar';
 import { useManagerSession } from '@/contexts/ManagerSessionContext';
 
 export const ManagerLayout: React.FC = () => {
   const { isAuthenticated, manager } = useManagerSession();
 
   if (!isAuthenticated) {
     return <Navigate to="/login/manager" replace />;
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