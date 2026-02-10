 import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
 
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
 }
 
 interface ManagerSessionContextType {
   manager: TeamManager | null;
   isAuthenticated: boolean;
   login: (email: string) => TeamManager | null;
   logout: () => void;
 }
 
 const ManagerSessionContext = createContext<ManagerSessionContextType | undefined>(undefined);
 
 const MANAGER_SESSION_KEY = 'ems_manager_session';
 const MANAGERS_KEY = 'ems_team_managers';
 
 export const ManagerSessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
   const [manager, setManager] = useState<TeamManager | null>(null);
 
   useEffect(() => {
     const stored = localStorage.getItem(MANAGER_SESSION_KEY);
     if (stored) {
       try {
         setManager(JSON.parse(stored));
       } catch {
         localStorage.removeItem(MANAGER_SESSION_KEY);
       }
     }
   }, []);
 
   const login = (email: string): TeamManager | null => {
     const managersData = localStorage.getItem(MANAGERS_KEY);
     const managers: TeamManager[] = managersData ? JSON.parse(managersData) : [];
     const found = managers.find(m => m.email.toLowerCase() === email.toLowerCase());
     
     if (found) {
       setManager(found);
       localStorage.setItem(MANAGER_SESSION_KEY, JSON.stringify(found));
       return found;
     }
     return null;
   };
 
   const logout = () => {
     setManager(null);
     localStorage.removeItem(MANAGER_SESSION_KEY);
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