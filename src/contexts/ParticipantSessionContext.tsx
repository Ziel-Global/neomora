import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { participantLogin as participantLoginApi } from '@/api/authApi';

export interface ParticipantWithTeamInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string;
  passportNumber: string;
  passportExpiry?: string;
  organization: string;
  jobTitle: string;
  role: string;
  dietaryNotes: string;
  accessibilityNeeds: string;
  emergencyContact?: string;
  createdAt: string;
  updatedAt?: string;
  isTeamMember?: boolean;
  teamMemberId?: string;
  teamId?: string;
  sportCategory?: string;
  [key: string]: unknown;
}

interface ParticipantSessionContextType {
  participant: ParticipantWithTeamInfo | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isTeamMember: boolean;
  teamMemberData: any | null;
}

const ParticipantSessionContext = createContext<ParticipantSessionContextType | undefined>(undefined);

const SESSION_KEY = 'ems_participant_session';
const PARTICIPANT_TOKEN_KEY = 'ems_participant_token';

export const ParticipantSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [participant, setParticipant] = useState<ParticipantWithTeamInfo | null>(null);
  const [teamMemberData, setTeamMemberData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage
    const storedSession = localStorage.getItem(SESSION_KEY);
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession);
        setParticipant(parsed);
      } catch {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(PARTICIPANT_TOKEN_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await participantLoginApi(email, password);

      const participantData: ParticipantWithTeamInfo = {
        id: response.user?.id || '',
        firstName: response.user?.name?.split(' ')[0] || '',
        lastName: response.user?.name?.split(' ').slice(1).join(' ') || '',
        email: response.user?.email || email,
        phone: '',
        nationality: '',
        passportNumber: '',
        organization: '',
        jobTitle: '',
        role: response.user?.role || 'participant',
        dietaryNotes: '',
        accessibilityNeeds: '',
        createdAt: new Date().toISOString(),
        ...response.user,
      };

      setParticipant(participantData);
      setTeamMemberData(null);
      localStorage.setItem(SESSION_KEY, JSON.stringify(participantData));
      localStorage.setItem(PARTICIPANT_TOKEN_KEY, response.token);

      return true;
    } catch (error: any) {
      console.error('Participant login failed:', error?.response?.data || error.message);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setParticipant(null);
    setTeamMemberData(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(PARTICIPANT_TOKEN_KEY);
  }, []);

  const isTeamMember = !!participant?.isTeamMember;

  return (
    <ParticipantSessionContext.Provider value={{
      participant,
      isLoggedIn: !!participant,
      isLoading,
      login,
      logout,
      isTeamMember,
      teamMemberData,
    }}>
      {children}
    </ParticipantSessionContext.Provider>
  );
};

export const useParticipantSession = () => {
  const context = useContext(ParticipantSessionContext);
  if (!context) {
    throw new Error('useParticipantSession must be used within a ParticipantSessionProvider');
  }
  return context;
};
