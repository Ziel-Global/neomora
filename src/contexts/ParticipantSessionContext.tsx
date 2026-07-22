import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { participantLogin as participantLoginApi } from '@/api/authApi';
import { getMyParticipantProfile, resolveParticipantIdentityIds } from '@/api/participantApi';

export interface ParticipantWithTeamInfo {
  id: string;
  participantId?: string;
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

const buildParticipantSession = (
  user: Record<string, unknown> | undefined,
  email: string,
  profileId?: string,
): ParticipantWithTeamInfo => {
  const nestedParticipant =
    user?.participant && typeof user.participant === 'object'
      ? (user.participant as Record<string, unknown>)
      : null;

  const participantRecordId =
    profileId ||
    nestedParticipant?.id ||
    nestedParticipant?._id ||
    user?.participantId ||
    user?.participant_id ||
    user?.id ||
    '';

  return {
    ...user,
    id: String(participantRecordId),
    participantId: String(participantRecordId),
    userId: user?.id ? String(user.id) : undefined,
    firstName: (user?.firstName as string) || (user?.name as string)?.split(' ')[0] || '',
    lastName: (user?.lastName as string) || (user?.name as string)?.split(' ').slice(1).join(' ') || '',
    email: (user?.email as string) || email,
    phone: (user?.phone as string) || '',
    nationality: (user?.nationality as string) || '',
    passportNumber: (user?.passportNumber as string) || '',
    organization: (user?.organization as string) || '',
    jobTitle: (user?.jobTitle as string) || '',
    role: (user?.role as string) || 'participant',
    dietaryNotes: (user?.dietaryNotes as string) || '',
    accessibilityNeeds: (user?.accessibilityNeeds as string) || '',
    createdAt: (user?.createdAt as string) || new Date().toISOString(),
  };
};

const persistParticipantSession = (participantData: ParticipantWithTeamInfo) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(participantData));
};

export const ParticipantSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [participant, setParticipant] = useState<ParticipantWithTeamInfo | null>(null);
  const [teamMemberData, setTeamMemberData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const storedSession = localStorage.getItem(SESSION_KEY);
      const token = localStorage.getItem(PARTICIPANT_TOKEN_KEY);

      let parsedSession: ParticipantWithTeamInfo | null = null;
      if (storedSession) {
        try {
          parsedSession = JSON.parse(storedSession);
          setParticipant(parsedSession);
        } catch {
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(PARTICIPANT_TOKEN_KEY);
        }
      }

      if (token) {
        try {
          const sessionHasRecordId = Boolean(parsedSession?.participantId || parsedSession?.id);
          if (!sessionHasRecordId) {
            const resolvedIds = await resolveParticipantIdentityIds(parsedSession, { allowNetwork: true });
            const profile = await getMyParticipantProfile();
            const recordId = profile?.id || resolvedIds[0];
            if (recordId) {
              setParticipant(prev => {
                const next = buildParticipantSession(
                  { ...(prev || parsedSession || {}), email: prev?.email || parsedSession?.email || profile?.email || '' },
                  prev?.email || parsedSession?.email || profile?.email || '',
                  recordId,
                );
                persistParticipantSession(next);
                return next;
              });
            }
          }
        } catch {
          // keep stored session
        }
      }

      setIsLoading(false);
    };

    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await participantLoginApi(email, password);
      localStorage.setItem(PARTICIPANT_TOKEN_KEY, response.token);

      let profileId: string | undefined;
      const authUserId = response.user?.id ? String(response.user.id) : undefined;
      try {
        const profile = await getMyParticipantProfile();
        profileId = profile?.id;
        if (!profileId || (authUserId && profileId === authUserId)) {
          const resolvedIds = await resolveParticipantIdentityIds({ ...response.user, email, participant: response.participant });
          profileId = resolvedIds.find(id => authUserId && id !== authUserId) || resolvedIds[0] || profileId;
        }
      } catch {
        profileId = undefined;
      }

      const participantData = buildParticipantSession(
        { ...response.user, participant: response.participant || response.user?.participant },
        email,
        profileId,
      );
      setParticipant(participantData);
      setTeamMemberData(null);
      persistParticipantSession(participantData);
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
