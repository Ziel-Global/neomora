import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { participantStore, EMSParticipant, initializeStore } from '@/lib/emsStore';
import { teamMemberStore, TeamMember } from '@/lib/teamStore';

// Extended participant that may include team member info
export interface ParticipantWithTeamInfo extends EMSParticipant {
  isTeamMember?: boolean;
  teamMemberId?: string;
  teamId?: string;
  sportCategory?: string;
}

interface ParticipantSessionContextType {
  participant: ParticipantWithTeamInfo | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string) => boolean;
  logout: () => void;
  isTeamMember: boolean;
  teamMemberData: TeamMember | null;
}

const ParticipantSessionContext = createContext<ParticipantSessionContextType | undefined>(undefined);

const SESSION_KEY = 'ems_participant_session';

export const ParticipantSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [participant, setParticipant] = useState<ParticipantWithTeamInfo | null>(null);
  const [teamMemberData, setTeamMemberData] = useState<TeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const findAndSetUser = (email: string): boolean => {
    // First check if participant exists
    const foundParticipant = participantStore.getByEmail(email.trim());
    if (foundParticipant) {
      // Check if this participant is linked to a team member
      const allMembers = teamMemberStore.getAll();
      const linkedMember = allMembers.find(m => m.email.toLowerCase() === email.toLowerCase());
      
      if (linkedMember) {
        setParticipant({
          ...foundParticipant,
          isTeamMember: true,
          teamMemberId: linkedMember.id,
          teamId: linkedMember.teamId,
          sportCategory: linkedMember.sportCategory,
        });
        setTeamMemberData(linkedMember);
      } else {
        setParticipant(foundParticipant);
        setTeamMemberData(null);
      }
      return true;
    }
    
    // If no participant, check if this is an approved team member
    const allMembers = teamMemberStore.getAll();
    const member = allMembers.find(m => 
      m.email.toLowerCase() === email.toLowerCase() && 
      m.status === 'Approved'
    );
    
    if (member) {
      // Create a virtual participant from team member data
      const virtualParticipant: ParticipantWithTeamInfo = {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
        nationality: member.nationality,
        passportNumber: member.passportNumber,
        passportExpiry: member.passportExpiry,
        organization: member.nationality + ' Delegation',
        jobTitle: member.role,
        role: member.role === 'Athlete' ? 'Athlete' : 'Official',
        dietaryNotes: member.dietaryRequirements || '',
        accessibilityNeeds: '',
        emergencyContact: member.emergencyContact,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
        isTeamMember: true,
        teamMemberId: member.id,
        teamId: member.teamId,
        sportCategory: member.sportCategory,
      };
      setParticipant(virtualParticipant);
      setTeamMemberData(member);
      return true;
    }
    
    return false;
  };

  useEffect(() => {
    initializeStore();
    // Restore session from localStorage
    const storedEmail = localStorage.getItem(SESSION_KEY);
    if (storedEmail) {
      const found = findAndSetUser(storedEmail);
      if (!found) {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((email: string): boolean => {
    const found = findAndSetUser(email.trim());
    if (found && participant) {
      localStorage.setItem(SESSION_KEY, email.trim());
      return true;
    }
    // Re-check after setting state (for initial login)
    const p = participantStore.getByEmail(email.trim());
    const m = teamMemberStore.getAll().find(m => 
      m.email.toLowerCase() === email.toLowerCase() && 
      m.status === 'Approved'
    );
    if (p || m) {
      findAndSetUser(email.trim());
      localStorage.setItem(SESSION_KEY, email.trim());
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setParticipant(null);
    setTeamMemberData(null);
    localStorage.removeItem(SESSION_KEY);
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
