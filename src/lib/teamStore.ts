// Team and Delegation Store for Manager Portal
import { ParticipantRole } from '@/data/mockData';
import { DELEGATION_CATEGORY_LABELS } from '@/lib/delegationCategories';

// ============= TYPES =============

export interface SportCategory {
  id: string;
  name: string;
  subCategories: string[];
}

export interface TeamMember {
  id: string;
  teamId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  sportCategory: string;
  subCategory: string;
  role: string; // e.g., Athlete, Coach, Medical Staff, Official
  emergencyContact: string;
  emergencyPhone: string;
  dietaryRequirements: string;
  medicalConditions: string;
  photo?: string; // Base64 or reference
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  documents?: {
    type: string;
    fileName: string;
    fileData?: string;
    uploadedAt: string;
    status: 'Pending' | 'Verified' | 'Rejected';
    notes?: string;
  }[];
  // Travel preferences
  travelPreferences?: {
    needsVisa: boolean;
    needsAccommodation: boolean;
    needsTransport: boolean;
    originCity?: string;
    departureAirport?: string;
    preferredArrivalDate?: string;
    preferredDepartureDate?: string;
    seatPreference?: 'Window' | 'Aisle' | 'No Preference';
    mealPreference?: string;
    specialRequirements?: string;
  };
  // Registration status
  registrationStatus?: 'Not Registered' | 'Pending' | 'Submitted' | 'Approved';
  registrationId?: string;
  createdAt: string;
  updatedAt: string;
}

// A delegation for a team-based/hybrid event declares how many teams it will
// bring and, per team-slot, the expected category breakdown (e.g. "Team 1:
// 11 Athletes, 2 Coaches"). A Team binds to a slot via Team.expectedTeamIndex
// (the array index here).
export interface ExpectedTeamSlot {
  name?: string;
  memberCounts: Record<string, number>;
}

export interface Team {
  id: string;
  managerId: string;
  delegationId?: string | null;
  name: string;
  country: string;
  sportCategory: string;
  subCategory?: string;
  eventId?: string;
  memberCount: number;
  expectedTeamIndex?: number;
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';
  createdAt: string;
  updatedAt: string;
}

export interface Delegation {
  id: string;
  managerId: string;
  country: string;
  eventId: string;
  teamIds: string[];
  totalMembers: number;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Update Requested' | 'Roster Submitted';
  serverDelegationId?: string;
  rejectionReason?: string;
  reviewMessage?: string;
  expectedTeams?: ExpectedTeamSlot[];
  reviewedAt?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============= SPORT CATEGORIES =============

export const SPORT_CATEGORIES: SportCategory[] = [
  {
    id: 'athletics',
    name: 'Athletics',
    subCategories: ['Track', 'Field', 'Marathon', 'Race Walking']
  },
  {
    id: 'football',
    name: 'Football',
    subCategories: ['Men', 'Women', 'Youth']
  },
  {
    id: 'basketball',
    name: 'Basketball',
    subCategories: ['Men', 'Women', '3x3']
  },
  {
    id: 'swimming',
    name: 'Swimming',
    subCategories: ['Pool', 'Open Water', 'Diving', 'Synchronized']
  },
  {
    id: 'volleyball',
    name: 'Volleyball',
    subCategories: ['Indoor Men', 'Indoor Women', 'Beach']
  },
  {
    id: 'tennis',
    name: 'Tennis',
    subCategories: ['Singles', 'Doubles', 'Mixed Doubles']
  },
  {
    id: 'gymnastics',
    name: 'Gymnastics',
    subCategories: ['Artistic', 'Rhythmic', 'Trampoline']
  },
  {
    id: 'combat',
    name: 'Combat Sports',
    subCategories: ['Boxing', 'Wrestling', 'Judo', 'Taekwondo', 'Karate']
  },
  {
    id: 'equestrian',
    name: 'Equestrian',
    subCategories: ['Dressage', 'Jumping', 'Eventing']
  },
  {
    id: 'esports',
    name: 'Esports',
    subCategories: ['PC', 'Console', 'Mobile']
  },
];

export const TEAM_ROLES = DELEGATION_CATEGORY_LABELS;

// ============= STORE KEYS =============

const KEYS = {
  TEAMS: 'ems_teams',
  TEAM_MEMBERS: 'ems_team_members',
  DELEGATIONS: 'ems_delegations',
};

// ============= UTILITY =============

const generateId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const now = (): string => new Date().toISOString();

const getItem = <T>(key: string): T[] => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const setItem = <T>(key: string, data: T[]): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

// ============= TEAM STORE =============

export const teamStore = {
  getAll: (): Team[] => getItem<Team>(KEYS.TEAMS),

  getById: (id: string): Team | undefined => {
    return teamStore.getAll().find(t => t.id === id);
  },

  getByManager: (managerId: string): Team[] => {
    return teamStore.getAll().filter(t => t.managerId === managerId);
  },

  create: (team: Omit<Team, 'id' | 'memberCount' | 'status' | 'createdAt' | 'updatedAt'>): Team => {
    const newTeam: Team = {
      ...team,
      id: generateId('team'),
      memberCount: 0,
      status: 'Draft',
      createdAt: now(),
      updatedAt: now(),
    };
    const teams = teamStore.getAll();
    teams.push(newTeam);
    setItem(KEYS.TEAMS, teams);
    return newTeam;
  },

  update: (id: string, updates: Partial<Team>): Team | null => {
    const teams = teamStore.getAll();
    const index = teams.findIndex(t => t.id === id);
    if (index === -1) return null;
    teams[index] = { ...teams[index], ...updates, updatedAt: now() };
    setItem(KEYS.TEAMS, teams);
    return teams[index];
  },

  delete: (id: string): boolean => {
    const teams = teamStore.getAll();
    const filtered = teams.filter(t => t.id !== id);
    if (filtered.length === teams.length) return false;
    setItem(KEYS.TEAMS, filtered);
    // Also delete all members of this team
    const members = teamMemberStore.getAll().filter(m => m.teamId !== id);
    setItem(KEYS.TEAM_MEMBERS, members);
    return true;
  },

  updateMemberCount: (teamId: string): void => {
    const count = teamMemberStore.getByTeam(teamId).length;
    teamStore.update(teamId, { memberCount: count });
  },
};

// ============= TEAM MEMBER STORE =============

export const teamMemberStore = {
  getAll: (): TeamMember[] => getItem<TeamMember>(KEYS.TEAM_MEMBERS),

  getById: (id: string): TeamMember | undefined => {
    return teamMemberStore.getAll().find(m => m.id === id);
  },

  getByTeam: (teamId: string): TeamMember[] => {
    return teamMemberStore.getAll().filter(m => m.teamId === teamId);
  },

  getByManager: (managerId: string): TeamMember[] => {
    const teams = teamStore.getByManager(managerId);
    const teamIds = teams.map(t => t.id);
    return teamMemberStore.getAll().filter(m => teamIds.includes(m.teamId));
  },

  create: (member: Omit<TeamMember, 'id' | 'status' | 'createdAt' | 'updatedAt'>): TeamMember => {
    const newMember: TeamMember = {
      ...member,
      id: generateId('mbr'),
      status: 'Draft',
      createdAt: now(),
      updatedAt: now(),
    };
    const members = teamMemberStore.getAll();
    members.push(newMember);
    setItem(KEYS.TEAM_MEMBERS, members);
    teamStore.updateMemberCount(member.teamId);
    return newMember;
  },

  update: (id: string, updates: Partial<TeamMember>): TeamMember | null => {
    const members = teamMemberStore.getAll();
    const index = members.findIndex(m => m.id === id);
    if (index === -1) return null;
    members[index] = { ...members[index], ...updates, updatedAt: now() };
    setItem(KEYS.TEAM_MEMBERS, members);
    return members[index];
  },

  delete: (id: string): boolean => {
    const members = teamMemberStore.getAll();
    const member = members.find(m => m.id === id);
    if (!member) return false;
    const filtered = members.filter(m => m.id !== id);
    setItem(KEYS.TEAM_MEMBERS, filtered);
    teamStore.updateMemberCount(member.teamId);
    return true;
  },

  bulkCreate: (membersList: Omit<TeamMember, 'id' | 'status' | 'createdAt' | 'updatedAt'>[]): TeamMember[] => {
    const created: TeamMember[] = [];
    const members = teamMemberStore.getAll();
    const teamsToUpdate = new Set<string>();

    for (const m of membersList) {
      const newMember: TeamMember = {
        ...m,
        id: generateId('mbr'),
        status: 'Draft',
        createdAt: now(),
        updatedAt: now(),
      };
      members.push(newMember);
      created.push(newMember);
      teamsToUpdate.add(m.teamId);
    }

    setItem(KEYS.TEAM_MEMBERS, members);
    teamsToUpdate.forEach(teamId => teamStore.updateMemberCount(teamId));
    return created;
  },
};

// ============= DELEGATION STORE =============

export const delegationStore = {
  getAll: (): Delegation[] => getItem<Delegation>(KEYS.DELEGATIONS),

  getById: (id: string): Delegation | undefined => {
    return delegationStore.getAll().find(d => d.id === id);
  },

  getByManager: (managerId: string): Delegation[] => {
    return delegationStore.getAll().filter(d => d.managerId === managerId);
  },

  create: (delegation: Omit<Delegation, 'id' | 'totalMembers' | 'status' | 'createdAt' | 'updatedAt'>): Delegation => {
    // Calculate total members from teams
    let totalMembers = 0;
    for (const teamId of delegation.teamIds) {
      totalMembers += teamMemberStore.getByTeam(teamId).length;
    }

    const newDelegation: Delegation = {
      ...delegation,
      id: generateId('del'),
      totalMembers,
      status: 'Draft',
      createdAt: now(),
      updatedAt: now(),
    };
    const delegations = delegationStore.getAll();
    delegations.push(newDelegation);
    setItem(KEYS.DELEGATIONS, delegations);
    return newDelegation;
  },

  update: (id: string, updates: Partial<Delegation>): Delegation | null => {
    const delegations = delegationStore.getAll();
    const index = delegations.findIndex(d => d.id === id);
    if (index === -1) return null;
    delegations[index] = { ...delegations[index], ...updates, updatedAt: now() };
    setItem(KEYS.DELEGATIONS, delegations);
    return delegations[index];
  },

  upsert: (delegation: Delegation): Delegation => {
    const delegations = delegationStore.getAll();
    const index = delegations.findIndex(d => d.id === delegation.id);
    const nextDelegation = { ...delegation, updatedAt: delegation.updatedAt || now() };
    if (index === -1) {
      delegations.push(nextDelegation);
    } else {
      delegations[index] = nextDelegation;
    }
    setItem(KEYS.DELEGATIONS, delegations);
    return nextDelegation;
  },

  submit: (id: string): Delegation | null => {
    return delegationStore.update(id, {
      status: 'Submitted',
      submittedAt: now(),
    });
  },

  delete: (id: string): boolean => {
    const delegations = delegationStore.getAll();
    const filtered = delegations.filter(d => d.id !== id);
    if (filtered.length === delegations.length) return false;
    setItem(KEYS.DELEGATIONS, filtered);
    return true;
  },
};