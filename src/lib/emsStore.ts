// EMS localStorage State Management
// Provides CRUD operations for all modules with full SRS status flows

import { ParticipantRole } from '@/data/mockData';

// ============= STATUS ENUMS (per SRS) =============

export type InvitationStatus =
  | 'Pending'      // Created, not yet sent
  | 'Delivered'    // Sent to recipient
  | 'Opened'       // Recipient viewed
  | 'Accepted'     // RSVP Yes
  | 'Declined'     // RSVP No
  | 'Maybe'        // RSVP Maybe
  | 'Expired';     // Past deadline

export type RegistrationStatus =
  | 'Draft'           // Started, not submitted
  | 'Submitted'       // Submitted for review
  | 'Under Review'    // Being reviewed
  | 'Approved'        // Approved
  | 'Rejected'        // Rejected
  | 'Update Requested'; // Needs updates

export type EventStatus = 'Draft' | 'Published' | 'Ongoing' | 'Closed';

export type CampaignStatus = 'Draft' | 'Scheduled' | 'Sending' | 'Sent' | 'Completed';

export type VisaStatus =
  | 'Not Required'
  | 'Pending Docs'   // Participant needs to upload
  | 'Reviewing'      // Admin is reviewing docs
  | 'Ready'          // Ready for submission to authority
  | 'Submitted'      // Submitted to government/provider
  | 'Approved'       // Visa granted
  | 'Rejected'       // Visa denied
  | 'More Info';     // Admin requested more info

// Import types from accreditation data to avoid duplication
import { AccreditationProfile, BadgeRecord, accreditationCategories, roleToCategoryMap, generateQRCode, generateBadgeNumber } from '@/data/accreditationData';
export type { AccreditationProfile, BadgeRecord };

// ============= INTERFACES =============

export interface EMSEvent {
  id: string;
  name: string;
  theme: string;
  startDate: string;
  endDate: string;
  city: string;
  venues: string[];
  status: EventStatus;
  clientGroups: ParticipantRole[];
  logo?: string; // base64 data URL or external URL
  // Team-based event fields
  eventType?: 'individual' | 'team-based' | 'hybrid';
  sportCategories?: {
    id: string;
    name: string;
    subCategories: string[];
  }[];
  allowTeamRegistration?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EMSParticipant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string; // 'male' | 'female' | 'other'
  nationality: string;
  passportNumber?: string;
  passportExpiry?: string;
  organization: string;
  jobTitle?: string;
  role: ParticipantRole;
  dietaryNotes: string;
  accessibilityNeeds: string;
  emergencyContact?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EMSInvitationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  language: string;
  variables: string[];
  createdAt: string;
}

export interface EMSInvitation {
  id: string;
  eventId: string;
  participantId: string;
  participantEmail?: string;
  managerId?: string;
  managerEmail?: string;
  delegationId?: string;
  recipientType?: 'participant' | 'manager';
  templateId: string;
  campaignId: string;
  token: string; // Unique RSVP link token
  status: InvitationStatus;
  rsvpDeadline: string;
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  respondedAt: string | null;
  dietaryNotes?: string;
  guestCount: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface EMSCampaign {
  id: string;
  name: string;
  eventId: string;
  templateId: string;
  targetRoles: ParticipantRole[];
  targetNationalities: string[];
  targetDelegationIds?: string[];
  targetManagerIds?: string[];
  rsvpDeadline: string;
  scheduledAt: string | null;
  sentAt: string | null;
  status: CampaignStatus;
  stats: {
    audienceSize: number;
    sentCount: number;
    deliveredCount: number;
    openedCount: number;
    acceptedCount: number;
    declinedCount: number;
    maybeCount: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface EMSRegistration {
  id: string;
  registrationId: string; // Human-readable ID like REG-2024-001
  eventId: string;
  participantId: string;
  invitationId?: string; // If came from invitation
  status: RegistrationStatus;
  formData: {
    needsVisa: boolean;
    needsAccommodation: boolean;
    needsTransport: boolean;
    arrivalDate?: string;
    departureDate?: string;
    dietaryRequirements?: string;
    agreeTerms: boolean;
  };
  documents: {
    type: 'Passport' | 'Photo' | 'ID' | 'Visa Form' | 'Consent' | 'Press Credentials';
    fileName: string;
    fileData?: string; // Base64 data for local storage viewing
    uploadedAt: string;
    status: 'Pending' | 'Verified' | 'Rejected';
    notes?: string;
  }[];
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy?: string;
  rejectionReason?: string;
  delegationId?: string;
  teamId?: string;
  country?: string;
  participant?: any;
  team?: any;
  delegation?: any;
  createdAt: string;
  updatedAt: string;
}

export interface VisaDocument {
  type: string; // Passport, Photo, Invitation Letter, etc.
  fileName: string;
  fileData?: string;
  uploadedAt: string;
  status: 'Pending' | 'Verified' | 'Rejected';
  notes?: string;
}

export interface EMSVisaApplication {
  id: string;
  participantId: string;
  eventId: string;
  status: VisaStatus;
  nationality: string;
  passportNumber?: string;
  passportExpiry: string;
  requiredDocuments: string[]; // List of required document types
  uploadedDocuments: VisaDocument[];
  submissionBatch?: string;
  visaNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  rejectionReason?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============= STORE KEYS =============

const KEYS = {
  EVENTS: 'ems_events',
  PARTICIPANTS: 'ems_participants',
  INVITATION_TEMPLATES: 'ems_invitation_templates',
  INVITATIONS: 'ems_invitations',
  CAMPAIGNS: 'ems_campaigns',
  REGISTRATIONS: 'ems_registrations',
  TRAVEL_BOOKINGS: 'ems_travel_bookings',
  ACCOMMODATIONS: 'ems_accommodations',
  HOTELS: 'ems_hotels',
  VISAS: 'ems_visas',
  TRANSPORT_ROUTES: 'ems_transport_routes',
  TRANSPORT_TRIPS: 'ems_transport_trips',
  VEHICLES: 'ems_vehicles',
  TRANSPORT_PLANS: 'ems_transport_plans',
  ACCRED_PROFILES: 'ems_accreditation_profiles',
  ACCRED_BADGES: 'ems_accreditation_badges',
};

// ============= TRAVEL BOOKING INTERFACE =============

export type TravelBookingStatus = 'Not Required' | 'Requested' | 'Proposed' | 'Approved' | 'Ticketed' | 'Changed' | 'Rejected';

export interface EMSTravelBooking {
  id: string;
  participantId: string;
  registrationId: string;
  originCity: string;
  departureAirport: string | null;
  preferredDates: string;
  preferredDepartureDate: string | null;
  preferredReturnDate: string | null;
  status: TravelBookingStatus;
  pnr: string | null;
  ticketNumber: string | null;
  airline: string | null;
  seatNumber: string | null;
  cabinClass: 'Economy' | 'Business' | 'First' | null;
  baggageAllowance: string | null;
  seatPreference: 'Window' | 'Aisle' | 'Middle' | 'No Preference' | null;
  mealPreference: string | null;
  specialRequirements: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  rejectionReason: string | null;
  approvalComments: string | null;
  requestedAt: string | null;
  approvedAt: string | null;
  ticketedAt: string | null;
  itinerary: {
    from: string;
    to: string;
    flightNumber: string;
    departAt: string;
    arriveAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

// ============= UTILITY FUNCTIONS =============

export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const generateToken = (): string => {
  return Math.random().toString(36).substr(2, 16) + Math.random().toString(36).substr(2, 16);
};

export const generateRegistrationId = (): string => {
  const year = new Date().getFullYear();
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `REG-${year}-${num}`;
};

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

const now = (): string => new Date().toISOString();

// ============= EVENT STORE =============

export const eventStore = {
  getAll: (): EMSEvent[] => getItem<EMSEvent>(KEYS.EVENTS),

  getById: (id: string): EMSEvent | undefined => {
    return eventStore.getAll().find(e => e.id === id);
  },

  create: (event: Omit<EMSEvent, 'id' | 'createdAt' | 'updatedAt'>): EMSEvent => {
    const newEvent: EMSEvent = {
      ...event,
      id: generateId('evt'),
      createdAt: now(),
      updatedAt: now(),
    };
    const events = eventStore.getAll();
    events.push(newEvent);
    setItem(KEYS.EVENTS, events);
    return newEvent;
  },

  update: (id: string, updates: Partial<EMSEvent>): EMSEvent | null => {
    const events = eventStore.getAll();
    const index = events.findIndex(e => e.id === id);
    if (index === -1) return null;
    events[index] = { ...events[index], ...updates, updatedAt: now() };
    setItem(KEYS.EVENTS, events);
    return events[index];
  },

  delete: (id: string): boolean => {
    const events = eventStore.getAll();
    const filtered = events.filter(e => e.id !== id);
    if (filtered.length === events.length) return false;
    setItem(KEYS.EVENTS, filtered);
    return true;
  },
};

// ============= PARTICIPANT STORE =============

export const participantStore = {
  getAll: (): EMSParticipant[] => getItem<EMSParticipant>(KEYS.PARTICIPANTS),

  getById: (id: string): EMSParticipant | undefined => {
    return participantStore.getAll().find(p => p.id === id);
  },

  getByEmail: (email: string): EMSParticipant | undefined => {
    return participantStore.getAll().find(p => p.email.toLowerCase() === email.toLowerCase());
  },

  create: (participant: Omit<EMSParticipant, 'id' | 'createdAt' | 'updatedAt'>): EMSParticipant => {
    const newParticipant: EMSParticipant = {
      ...participant,
      id: generateId('p'),
      createdAt: now(),
      updatedAt: now(),
    };
    const participants = participantStore.getAll();
    participants.push(newParticipant);
    setItem(KEYS.PARTICIPANTS, participants);
    return newParticipant;
  },

  update: (id: string, updates: Partial<EMSParticipant>): EMSParticipant | null => {
    const participants = participantStore.getAll();
    const index = participants.findIndex(p => p.id === id);
    if (index === -1) return null;
    participants[index] = { ...participants[index], ...updates, updatedAt: now() };
    setItem(KEYS.PARTICIPANTS, participants);
    return participants[index];
  },

  delete: (id: string): boolean => {
    const participants = participantStore.getAll();
    const filtered = participants.filter(p => p.id !== id);
    if (filtered.length === participants.length) return false;
    setItem(KEYS.PARTICIPANTS, filtered);
    return true;
  },

  bulkCreate: (list: Omit<EMSParticipant, 'id' | 'createdAt' | 'updatedAt'>[]): EMSParticipant[] => {
    const created: EMSParticipant[] = [];
    const participants = participantStore.getAll();

    for (const p of list) {
      const newP: EMSParticipant = {
        ...p,
        id: generateId('p'),
        createdAt: now(),
        updatedAt: now(),
      };
      participants.push(newP);
      created.push(newP);
    }

    setItem(KEYS.PARTICIPANTS, participants);
    return created;
  },
};

// ============= INVITATION TEMPLATE STORE =============

export const templateStore = {
  getAll: (): EMSInvitationTemplate[] => getItem<EMSInvitationTemplate>(KEYS.INVITATION_TEMPLATES),

  getById: (id: string): EMSInvitationTemplate | undefined => {
    return templateStore.getAll().find(t => t.id === id);
  },

  create: (template: Omit<EMSInvitationTemplate, 'id' | 'createdAt'>): EMSInvitationTemplate => {
    const newTemplate: EMSInvitationTemplate = {
      ...template,
      id: generateId('tpl'),
      createdAt: now(),
    };
    const templates = templateStore.getAll();
    templates.push(newTemplate);
    setItem(KEYS.INVITATION_TEMPLATES, templates);
    return newTemplate;
  },

  delete: (id: string): boolean => {
    const templates = templateStore.getAll();
    const filtered = templates.filter(t => t.id !== id);
    if (filtered.length === templates.length) return false;
    setItem(KEYS.INVITATION_TEMPLATES, filtered);
    return true;
  },

  // Seed default templates if none exist
  seedDefaults: (): void => {
    if (templateStore.getAll().length === 0) {
      templateStore.create({
        name: 'Standard Event Invitation',
        subject: 'You\'re Invited: {{eventName}}',
        body: 'Dear {{firstName}},\n\nWe are pleased to invite you to {{eventName}} taking place in {{eventCity}} from {{startDate}} to {{endDate}}.\n\nPlease RSVP using the link below by {{rsvpDeadline}}.\n\nBest regards,\nEvent Team',
        language: 'English',
        variables: ['firstName', 'eventName', 'eventCity', 'startDate', 'endDate', 'rsvpDeadline'],
      });
      templateStore.create({
        name: 'VIP Exclusive Invitation',
        subject: 'Exclusive VIP Invitation: {{eventName}}',
        body: 'Dear {{firstName}},\n\nAs a distinguished guest, we cordially invite you to {{eventName}}.\n\nYour VIP status entitles you to exclusive benefits including priority seating and dedicated concierge service.\n\nPlease confirm your attendance by {{rsvpDeadline}}.\n\nWith warm regards,\nEvent Team',
        language: 'English',
        variables: ['firstName', 'eventName', 'rsvpDeadline'],
      });
    }
  },
};

// ============= CAMPAIGN STORE =============

export const campaignStore = {
  getAll: (): EMSCampaign[] => getItem<EMSCampaign>(KEYS.CAMPAIGNS),

  getById: (id: string): EMSCampaign | undefined => {
    return campaignStore.getAll().find(c => c.id === id);
  },

  getByEvent: (eventId: string): EMSCampaign[] => {
    return campaignStore.getAll().filter(c => c.eventId === eventId);
  },

  create: (campaign: Omit<EMSCampaign, 'id' | 'createdAt' | 'updatedAt' | 'stats'>): EMSCampaign => {
    const newCampaign: EMSCampaign = {
      ...campaign,
      id: generateId('cmp'),
      stats: {
        audienceSize: 0,
        sentCount: 0,
        deliveredCount: 0,
        openedCount: 0,
        acceptedCount: 0,
        declinedCount: 0,
        maybeCount: 0,
      },
      createdAt: now(),
      updatedAt: now(),
    };
    const campaigns = campaignStore.getAll();
    campaigns.push(newCampaign);
    setItem(KEYS.CAMPAIGNS, campaigns);
    return newCampaign;
  },

  createWithId: (id: string, campaign: Omit<EMSCampaign, 'id' | 'createdAt' | 'updatedAt' | 'stats'>): EMSCampaign => {
    const newCampaign: EMSCampaign = {
      ...campaign,
      id,
      stats: {
        audienceSize: 0,
        sentCount: 0,
        deliveredCount: 0,
        openedCount: 0,
        acceptedCount: 0,
        declinedCount: 0,
        maybeCount: 0,
      },
      createdAt: now(),
      updatedAt: now(),
    };

    const campaigns = campaignStore.getAll();
    const index = campaigns.findIndex(c => c.id === id);
    if (index >= 0) {
      campaigns[index] = newCampaign;
    } else {
      campaigns.push(newCampaign);
    }
    setItem(KEYS.CAMPAIGNS, campaigns);
    return newCampaign;
  },

  update: (id: string, updates: Partial<EMSCampaign>): EMSCampaign | null => {
    const campaigns = campaignStore.getAll();
    const index = campaigns.findIndex(c => c.id === id);
    if (index === -1) return null;
    campaigns[index] = { ...campaigns[index], ...updates, updatedAt: now() };
    setItem(KEYS.CAMPAIGNS, campaigns);
    return campaigns[index];
  },

  rekey: (oldId: string, newId: string): EMSCampaign | null => {
    if (oldId === newId) {
      return campaignStore.getById(oldId) || null;
    }

    const campaigns = campaignStore.getAll();
    const index = campaigns.findIndex(c => c.id === oldId);
    if (index === -1) return null;

    const existing = campaigns[index];
    const updatedCampaign = { ...existing, id: newId, updatedAt: now() };

    const duplicateIndex = campaigns.findIndex(c => c.id === newId);
    if (duplicateIndex >= 0) {
      campaigns[duplicateIndex] = updatedCampaign;
      campaigns.splice(index, 1);
    } else {
      campaigns[index] = updatedCampaign;
    }

    setItem(KEYS.CAMPAIGNS, campaigns);
    return updatedCampaign;
  },

  updateStats: (id: string): void => {
    const invitations = invitationStore.getByCampaign(id);
    const stats = {
      audienceSize: invitations.length,
      sentCount: invitations.filter(i => i.sentAt).length,
      deliveredCount: invitations.filter(i => i.deliveredAt).length,
      openedCount: invitations.filter(i => i.openedAt).length,
      acceptedCount: invitations.filter(i => i.status === 'Accepted').length,
      declinedCount: invitations.filter(i => i.status === 'Declined').length,
      maybeCount: invitations.filter(i => i.status === 'Maybe').length,
    };
    campaignStore.update(id, { stats });
  },

  delete: (id: string): boolean => {
    const campaigns = campaignStore.getAll();
    const filtered = campaigns.filter(c => c.id !== id);
    if (filtered.length === campaigns.length) return false;
    setItem(KEYS.CAMPAIGNS, filtered);
    return true;
  },
};

// ============= INVITATION STORE =============

export const invitationStore = {
  getAll: (): EMSInvitation[] => getItem<EMSInvitation>(KEYS.INVITATIONS),

  getById: (id: string): EMSInvitation | undefined => {
    return invitationStore.getAll().find(i => i.id === id);
  },

  getByToken: (token: string): EMSInvitation | undefined => {
    return invitationStore.getAll().find(i => i.token === token);
  },

  getByParticipant: (participantId: string): EMSInvitation[] => {
    return invitationStore.getAll().filter(i => i.participantId === participantId);
  },

  getByManager: (managerId: string): EMSInvitation[] => {
    return invitationStore.getAll().filter(i => i.managerId === managerId);
  },

  getByCampaign: (campaignId: string): EMSInvitation[] => {
    return invitationStore.getAll().filter(i => i.campaignId === campaignId);
  },

  getByEvent: (eventId: string): EMSInvitation[] => {
    return invitationStore.getAll().filter(i => i.eventId === eventId);
  },

  create: (invitation: Omit<EMSInvitation, 'id' | 'token' | 'createdAt' | 'updatedAt'>): EMSInvitation => {
    const newInvitation: EMSInvitation = {
      ...invitation,
      id: generateId('inv'),
      token: generateToken(),
      createdAt: now(),
      updatedAt: now(),
    };
    const invitations = invitationStore.getAll();
    invitations.push(newInvitation);
    setItem(KEYS.INVITATIONS, invitations);
    return newInvitation;
  },

  update: (id: string, updates: Partial<EMSInvitation>): EMSInvitation | null => {
    const invitations = invitationStore.getAll();
    const index = invitations.findIndex(i => i.id === id);
    if (index === -1) return null;
    invitations[index] = { ...invitations[index], ...updates, updatedAt: now() };
    setItem(KEYS.INVITATIONS, invitations);
    return invitations[index];
  },

  upsert: (invitation: Partial<EMSInvitation> & { id: string }): EMSInvitation => {
    const invitations = invitationStore.getAll();
    const index = invitations.findIndex(i => i.id === invitation.id);
    const nextInvitation: EMSInvitation = {
      id: invitation.id,
      eventId: invitation.eventId || '',
      participantId: invitation.participantId || '',
      participantEmail: invitation.participantEmail,
      managerId: invitation.managerId,
      managerEmail: invitation.managerEmail,
      delegationId: invitation.delegationId,
      recipientType: invitation.recipientType || (invitation.managerId ? 'manager' : 'participant'),
      templateId: invitation.templateId || '',
      campaignId: invitation.campaignId || '',
      token: invitation.token || generateToken(),
      status: invitation.status || 'Pending',
      rsvpDeadline: invitation.rsvpDeadline || '',
      sentAt: invitation.sentAt || null,
      deliveredAt: invitation.deliveredAt || null,
      openedAt: invitation.openedAt || null,
      respondedAt: invitation.respondedAt || null,
      guestCount: invitation.guestCount || 0,
      notes: invitation.notes || '',
      createdAt: invitation.createdAt || now(),
      updatedAt: now(),
    };
    if (index === -1) {
      invitations.push(nextInvitation);
    } else {
      invitations[index] = { ...invitations[index], ...nextInvitation };
    }
    setItem(KEYS.INVITATIONS, invitations);
    return invitations[index];
  },

  rekeyCampaign: (oldCampaignId: string, newCampaignId: string): number => {
    if (oldCampaignId === newCampaignId) return invitationStore.getByCampaign(newCampaignId).length;

    const invitations = invitationStore.getAll();
    let updatedCount = 0;

    for (let index = 0; index < invitations.length; index++) {
      if (invitations[index].campaignId === oldCampaignId) {
        invitations[index] = {
          ...invitations[index],
          campaignId: newCampaignId,
          updatedAt: now(),
        };
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      setItem(KEYS.INVITATIONS, invitations);
    }

    return updatedCount;
  },

  // Status transition methods
  markDelivered: (id: string): EMSInvitation | null => {
    return invitationStore.update(id, { status: 'Delivered', deliveredAt: now() });
  },

  markOpened: (id: string): EMSInvitation | null => {
    const inv = invitationStore.getById(id);
    if (!inv) return null;
    // Only update if not already responded
    if (['Pending', 'Delivered'].includes(inv.status)) {
      return invitationStore.update(id, { status: 'Opened', openedAt: now() });
    }
    return inv;
  },

  respond: (id: string, response: 'Accepted' | 'Declined' | 'Maybe', dietaryNotes?: string, guestCount?: number): EMSInvitation | null => {
    return invitationStore.update(id, {
      status: response,
      respondedAt: now(),
      dietaryNotes,
      guestCount: guestCount || 0,
    });
  },

  // Bulk create invitations for a campaign
  bulkCreateForCampaign: (
    campaignId: string,
    eventId: string,
    templateId: string,
    participantIds: string[],
    rsvpDeadline: string,
    participantEmailMap?: Record<string, string>
  ): EMSInvitation[] => {
    const created: EMSInvitation[] = [];

    for (const participantId of participantIds) {
      const inv = invitationStore.create({
        eventId,
        participantId,
        participantEmail: participantEmailMap?.[participantId],
        templateId,
        campaignId,
        status: 'Pending',
        rsvpDeadline,
        sentAt: null,
        deliveredAt: null,
        openedAt: null,
        respondedAt: null,
        guestCount: 0,
        notes: '',
      });
      created.push(inv);
    }

    return created;
  },

  bulkCreateForManagers: (
    campaignId: string,
    eventId: string,
    templateId: string,
    targets: { managerId: string; managerEmail?: string; delegationId?: string; delegationName?: string }[],
    rsvpDeadline: string,
  ): EMSInvitation[] => {
    const existing = invitationStore.getByCampaign(campaignId);
    const existingManagerIds = new Set(
      existing
        .filter(inv => inv.recipientType === 'manager' && inv.managerId)
        .map(inv => inv.managerId as string)
    );

    const created: EMSInvitation[] = [];

    for (const target of targets) {
      if (existingManagerIds.has(target.managerId)) continue;

      const inv = invitationStore.create({
        eventId,
        participantId: '',
        managerId: target.managerId,
        managerEmail: target.managerEmail,
        delegationId: target.delegationId,
        recipientType: 'manager',
        templateId,
        campaignId,
        status: 'Pending',
        rsvpDeadline,
        sentAt: null,
        deliveredAt: null,
        openedAt: null,
        respondedAt: null,
        guestCount: 0,
        notes: target.delegationName ? `${target.delegationName} Delegation` : '',
      });
      created.push(inv);
    }

    return created;
  },

  // Send all pending invitations in a campaign
  sendCampaign: (campaignId: string): number => {
    const invitations = invitationStore.getByCampaign(campaignId);
    let sentCount = 0;

    for (const inv of invitations) {
      if (inv.status === 'Pending') {
        invitationStore.update(inv.id, {
          status: 'Delivered',
          sentAt: now(),
          deliveredAt: now(), // Simulate immediate delivery
        });
        sentCount++;
      }
    }

    // Update campaign stats and status
    campaignStore.update(campaignId, {
      status: 'Sent',
      sentAt: now()
    });
    campaignStore.updateStats(campaignId);

    return sentCount;
  },

  delete: (id: string): boolean => {
    const invitations = invitationStore.getAll();
    const filtered = invitations.filter(i => i.id !== id);
    if (filtered.length === invitations.length) return false;
    setItem(KEYS.INVITATIONS, filtered);
    return true;
  },
};

// ============= REGISTRATION STORE =============

export const registrationStore = {
  getAll: (): EMSRegistration[] => getItem<EMSRegistration>(KEYS.REGISTRATIONS),

  getById: (id: string): EMSRegistration | undefined => {
    return registrationStore.getAll().find(r => r.id === id);
  },

  getByRegistrationId: (regId: string): EMSRegistration | undefined => {
    return registrationStore.getAll().find(r => r.registrationId === regId);
  },

  getByParticipant: (participantId: string): EMSRegistration[] => {
    return registrationStore.getAll().filter(r => r.participantId === participantId);
  },

  getByEvent: (eventId: string): EMSRegistration[] => {
    return registrationStore.getAll().filter(r => r.eventId === eventId);
  },

  getByInvitation: (invitationId: string): EMSRegistration | undefined => {
    return registrationStore.getAll().find(r => r.invitationId === invitationId);
  },

  create: (registration: Omit<EMSRegistration, 'id' | 'registrationId' | 'createdAt' | 'updatedAt'>): EMSRegistration => {
    const newRegistration: EMSRegistration = {
      ...registration,
      id: generateId('reg'),
      registrationId: generateRegistrationId(),
      createdAt: now(),
      updatedAt: now(),
    };
    const registrations = registrationStore.getAll();
    registrations.push(newRegistration);
    setItem(KEYS.REGISTRATIONS, registrations);
    return newRegistration;
  },

  update: (id: string, updates: Partial<EMSRegistration>): EMSRegistration | null => {
    const registrations = registrationStore.getAll();
    const index = registrations.findIndex(r => r.id === id);
    if (index === -1) return null;
    registrations[index] = { ...registrations[index], ...updates, updatedAt: now() };
    setItem(KEYS.REGISTRATIONS, registrations);
    return registrations[index];
  },

  upsert: (registration: EMSRegistration): EMSRegistration => {
    const registrations = registrationStore.getAll();
    const id = registration.id || generateId('reg');
    const index = registrations.findIndex(r => r.id === id);
    const nextRegistration = {
      ...registration,
      id,
      registrationId: registration.registrationId || generateRegistrationId(),
      createdAt: registration.createdAt || now(),
      updatedAt: now(),
    };
    if (index === -1) {
      registrations.push(nextRegistration);
    } else {
      registrations[index] = { ...registrations[index], ...nextRegistration };
    }
    setItem(KEYS.REGISTRATIONS, registrations);
    return nextRegistration;
  },

  // Status transition methods
  submit: (id: string): EMSRegistration | null => {
    return registrationStore.update(id, { status: 'Submitted', submittedAt: now() });
  },

  startReview: (id: string): EMSRegistration | null => {
    return registrationStore.update(id, { status: 'Under Review' });
  },

  approve: (id: string, reviewedBy: string): EMSRegistration | null => {
    return registrationStore.update(id, {
      status: 'Approved',
      reviewedAt: now(),
      reviewedBy,
    });
  },

  reject: (id: string, reviewedBy: string, reason: string): EMSRegistration | null => {
    return registrationStore.update(id, {
      status: 'Rejected',
      reviewedAt: now(),
      reviewedBy,
      rejectionReason: reason,
    });
  },

  requestUpdate: (id: string, reviewedBy: string, reason: string): EMSRegistration | null => {
    return registrationStore.update(id, {
      status: 'Update Requested',
      reviewedBy,
      rejectionReason: reason,
    });
  },

  addDocument: (id: string, doc: EMSRegistration['documents'][0]): EMSRegistration | null => {
    const reg = registrationStore.getById(id);
    if (!reg) return null;
    const documents = [...reg.documents, doc];
    return registrationStore.update(id, { documents });
  },

  updateDocument: (id: string, docIndex: number, updates: Partial<EMSRegistration['documents'][0]>): EMSRegistration | null => {
    const reg = registrationStore.getById(id);
    if (!reg || !reg.documents[docIndex]) return null;
    const documents = [...reg.documents];
    documents[docIndex] = { ...documents[docIndex], ...updates };
    return registrationStore.update(id, { documents });
  },

  // Create registration from accepted invitation
  createFromInvitation: (invitationId: string): EMSRegistration | null => {
    const invitation = invitationStore.getById(invitationId);
    if (!invitation || invitation.status !== 'Accepted') return null;

    // Check if registration already exists
    const existing = registrationStore.getByInvitation(invitationId);
    if (existing) return existing;

    return registrationStore.create({
      eventId: invitation.eventId,
      participantId: invitation.participantId,
      invitationId,
      status: 'Draft',
      formData: {
        needsVisa: false,
        needsAccommodation: false,
        needsTransport: false,
        agreeTerms: false,
      },
      documents: [],
      submittedAt: null,
      reviewedAt: null,
    });
  },

  delete: (id: string): boolean => {
    const registrations = registrationStore.getAll();
    const filtered = registrations.filter(r => r.id !== id);
    if (filtered.length === registrations.length) return false;
    setItem(KEYS.REGISTRATIONS, filtered);
    return true;
  },
};

// ============= TRAVEL BOOKING STORE =============

// Sample routes for auto-generation based on nationality
const routesByNationality: Record<string, { airport: string; city: string; airline: string }> = {
  'UAE': { airport: 'DXB', city: 'دبي', airline: 'Emirates' },
  'Qatar': { airport: 'DOH', city: 'الدوحة', airline: 'Qatar Airways' },
  'Saudi Arabia': { airport: 'RUH', city: 'الرياض', airline: 'Saudia' },
  'Kuwait': { airport: 'KWI', city: 'الكويت', airline: 'Kuwait Airways' },
  'Bahrain': { airport: 'BAH', city: 'البحرين', airline: 'Gulf Air' },
  'Oman': { airport: 'MCT', city: 'مسقط', airline: 'Oman Air' },
  'Jordan': { airport: 'AMM', city: 'عمّان', airline: 'Royal Jordanian' },
  'Egypt': { airport: 'CAI', city: 'القاهرة', airline: 'EgyptAir' },
  'Lebanon': { airport: 'BEY', city: 'بيروت', airline: 'Middle East Airlines' },
  'Iraq': { airport: 'BGW', city: 'بغداد', airline: 'Iraqi Airways' },
  'Morocco': { airport: 'CMN', city: 'الدار البيضاء', airline: 'Royal Air Maroc' },
  'Tunisia': { airport: 'TUN', city: 'تونس', airline: 'Tunisair' },
  'Pakistan': { airport: 'KHI', city: 'كراتشي', airline: 'Pakistan International Airlines' },
  'USA': { airport: 'LAX', city: 'Los Angeles', airline: 'Emirates' },
  'UK': { airport: 'LHR', city: 'London', airline: 'British Airways' },
  'India': { airport: 'BOM', city: 'Mumbai', airline: 'Emirates' },
  'Japan': { airport: 'NRT', city: 'Tokyo', airline: 'Japan Airlines' },
};

const generateFlightNumber = (airline: string): string => {
  const prefix = airline.split(' ')[0].substring(0, 2).toUpperCase();
  const num = Math.floor(Math.random() * 900) + 100;
  return `${prefix}${num}`;
};

const generatePNR = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const generateTicketNumber = (): string => {
  return `${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000000000) + 1000000000}`;
};

export const travelStore = {
  getAll: (): EMSTravelBooking[] => getItem<EMSTravelBooking>(KEYS.TRAVEL_BOOKINGS),

  getById: (id: string): EMSTravelBooking | undefined => {
    return travelStore.getAll().find(t => t.id === id);
  },

  getByParticipant: (participantId: string): EMSTravelBooking[] => {
    return travelStore.getAll().filter(t => t.participantId === participantId);
  },

  getByRegistration: (registrationId: string): EMSTravelBooking | undefined => {
    return travelStore.getAll().find(t => t.registrationId === registrationId);
  },

  create: (booking: Omit<EMSTravelBooking, 'id' | 'createdAt' | 'updatedAt'>): EMSTravelBooking => {
    const newBooking: EMSTravelBooking = {
      ...booking,
      id: generateId('trv'),
      createdAt: now(),
      updatedAt: now(),
    };
    const bookings = travelStore.getAll();
    bookings.push(newBooking);
    setItem(KEYS.TRAVEL_BOOKINGS, bookings);
    return newBooking;
  },

  update: (id: string, updates: Partial<EMSTravelBooking>): EMSTravelBooking | null => {
    const bookings = travelStore.getAll();
    const index = bookings.findIndex(t => t.id === id);
    if (index === -1) return null;
    bookings[index] = { ...bookings[index], ...updates, updatedAt: now() };
    setItem(KEYS.TRAVEL_BOOKINGS, bookings);
    return bookings[index];
  },

  // Auto-generate itinerary when registration is approved
  generateForApprovedRegistration: (registrationId: string): EMSTravelBooking | null => {
    const registration = registrationStore.getById(registrationId);
    if (!registration || registration.status !== 'Approved') return null;
    if (!registration.formData.needsTransport) return null;

    // Check if already exists
    const existing = travelStore.getByRegistration(registrationId);
    if (existing) return existing;

    const participant = participantStore.getById(registration.participantId);
    if (!participant) return null;

    // Get route based on nationality
    const route = routesByNationality[participant.nationality] || {
      airport: 'JFK',
      city: participant.nationality || 'International',
      airline: 'Emirates',
    };

    const eventDestination = 'DXB'; // Default event destination (Dubai)
    const flightNumber1 = generateFlightNumber(route.airline);
    const flightNumber2 = generateFlightNumber(route.airline);

    // Generate dates based on registration preferences
    const arrivalDate = registration.formData.arrivalDate || '2024-08-14';
    const departureDate = registration.formData.departureDate || '2024-08-26';

    const isVIP = participant.role === 'VVIP' || participant.role === 'VIP';

    return travelStore.create({
      participantId: participant.id,
      registrationId,
      originCity: route.city,
      departureAirport: route.airport,
      preferredDates: `${arrivalDate} to ${departureDate}`,
      preferredDepartureDate: arrivalDate,
      preferredReturnDate: departureDate,
      status: 'Ticketed',
      pnr: generatePNR(),
      ticketNumber: generateTicketNumber(),
      airline: route.airline,
      seatNumber: isVIP ? `${Math.floor(Math.random() * 3) + 1}A` : `${Math.floor(Math.random() * 30) + 10}${['A', 'B', 'C', 'D', 'E', 'F'][Math.floor(Math.random() * 6)]}`,
      cabinClass: isVIP ? 'Business' : 'Economy',
      baggageAllowance: isVIP ? '40 kg' : '23 kg',
      seatPreference: null,
      mealPreference: 'حلال / Halal',
      specialRequirements: null,
      emergencyContact: null,
      emergencyPhone: null,
      rejectionReason: null,
      approvalComments: null,
      requestedAt: now(),
      approvedAt: now(),
      ticketedAt: now(),
      itinerary: [
        {
          from: route.airport,
          to: eventDestination,
          flightNumber: flightNumber1,
          departAt: `${arrivalDate} 08:00`,
          arriveAt: `${arrivalDate} 14:30`,
        },
        {
          from: eventDestination,
          to: route.airport,
          flightNumber: flightNumber2,
          departAt: `${departureDate} 22:00`,
          arriveAt: `${departureDate} 04:30`,
        },
      ],
    });
  },

  // Create a travel request from participant preferences
  createRequest: (
    participantId: string,
    registrationId: string,
    preferences: {
      originCity: string;
      departureAirport: string;
      preferredDepartureDate: string;
      preferredReturnDate: string;
      seatPreference: 'Window' | 'Aisle' | 'Middle' | 'No Preference';
      mealPreference: string;
      specialRequirements: string;
      emergencyContact: string;
      emergencyPhone: string;
    }
  ): EMSTravelBooking => {
    return travelStore.create({
      participantId,
      registrationId,
      originCity: preferences.originCity,
      departureAirport: preferences.departureAirport,
      preferredDates: `${preferences.preferredDepartureDate} to ${preferences.preferredReturnDate}`,
      preferredDepartureDate: preferences.preferredDepartureDate,
      preferredReturnDate: preferences.preferredReturnDate,
      status: 'Requested',
      pnr: null,
      ticketNumber: null,
      airline: null,
      seatNumber: null,
      cabinClass: null,
      baggageAllowance: null,
      seatPreference: preferences.seatPreference,
      mealPreference: preferences.mealPreference,
      specialRequirements: preferences.specialRequirements || null,
      emergencyContact: preferences.emergencyContact,
      emergencyPhone: preferences.emergencyPhone,
      rejectionReason: null,
      approvalComments: null,
      requestedAt: now(),
      approvedAt: null,
      ticketedAt: null,
      itinerary: [],
    });
  },

  // Approve a travel request
  approve: (id: string, comments?: string): EMSTravelBooking | null => {
    return travelStore.update(id, {
      status: 'Approved',
      approvalComments: comments || null,
      approvedAt: now(),
    });
  },

  // Reject a travel request
  reject: (id: string, reason: string): EMSTravelBooking | null => {
    return travelStore.update(id, {
      status: 'Rejected',
      rejectionReason: reason,
    });
  },

  // Book flight and issue ticket
  bookFlight: (
    id: string,
    flightDetails: {
      airline: string;
      flightNumber: string;
      from: string;
      to: string;
      departureDate: string;
      departureTime: string;
      arrivalTime: string;
      returnFlightNumber: string;
      returnDepartureDate: string;
      returnDepartureTime: string;
      returnArrivalTime: string;
      cabinClass: 'Economy' | 'Business' | 'First';
      seatNumber: string;
    }
  ): EMSTravelBooking | null => {
    const booking = travelStore.getById(id);
    if (!booking) return null;

    const participant = participantStore.getById(booking.participantId);
    const isVIP = participant?.role === 'VVIP' || participant?.role === 'VIP';

    const updated = travelStore.update(id, {
      status: 'Ticketed',
      pnr: generatePNR(),
      ticketNumber: generateTicketNumber(),
      airline: flightDetails.airline,
      seatNumber: flightDetails.seatNumber || (isVIP ? '1A' : '15A'),
      cabinClass: flightDetails.cabinClass,
      baggageAllowance: isVIP ? '40 kg' : '23 kg',
      ticketedAt: now(),
      itinerary: [
        {
          from: flightDetails.from,
          to: flightDetails.to,
          flightNumber: flightDetails.flightNumber,
          departAt: `${flightDetails.departureDate} ${flightDetails.departureTime}`,
          arriveAt: `${flightDetails.departureDate} ${flightDetails.arrivalTime}`,
        },
        {
          from: flightDetails.to,
          to: flightDetails.from,
          flightNumber: flightDetails.returnFlightNumber,
          departAt: `${flightDetails.returnDepartureDate} ${flightDetails.returnDepartureTime || '22:00'}`,
          arriveAt: `${flightDetails.returnDepartureDate} ${flightDetails.returnArrivalTime || '04:30'}`,
        },
      ],
    });

    // Sync accommodation dates if allocation exists
    if (updated && booking.participantId) {
      accommodationStore.syncWithTravel(booking.participantId);
    }

    return updated;
  },

  delete: (id: string): boolean => {
    const bookings = travelStore.getAll();
    const filtered = bookings.filter(t => t.id !== id);
    if (filtered.length === bookings.length) return false;
    setItem(KEYS.TRAVEL_BOOKINGS, filtered);
    return true;
  },
};

// ============= ACCOMMODATION INTERFACES =============

export type AccommodationStatus =
  | 'Not Eligible'
  | 'Provisional'
  | 'Confirmed'
  | 'Checked-In'
  | 'Checked-Out'
  | 'Cancelled';

export interface EMSHotel {
  id: string;
  name: string;
  city: string;
  address?: string;
  roomTypes: string[];
  capacity: number;
  contact: string;
  email?: string;
  category: 'Standard' | 'Deluxe' | 'VIP' | 'VVIP';
  amenities?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EMSAccommodation {
  id: string;
  participantId: string;
  registrationId: string;
  hotelId: string;
  hotelName: string;
  roomType: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  status: AccommodationStatus;
  roommates: string[];
  gender: 'Male' | 'Female' | 'Other';
  specialRequests?: string;
  hotelAddress?: string;
  instructions?: string;
  confirmationNumber?: string;
  allocatedAt: string;
  confirmedAt?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  allocatedBy?: string;
  confirmedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============= HOTEL STORE =============

const defaultHotels: Omit<EMSHotel, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Atlantis The Palm',
    city: 'Dubai',
    roomTypes: ['Standard', 'Deluxe', 'Suite', 'Presidential Suite'],
    capacity: 500,
    contact: '+971 4 426 2000',
    category: 'VIP',
    amenities: ['Pool', 'Spa', 'Gym', 'Beach Access', 'Concierge']
  },
  {
    name: 'Jumeirah Beach Hotel',
    city: 'Dubai',
    roomTypes: ['Standard', 'Deluxe', 'Ocean View', 'Suite'],
    capacity: 350,
    contact: '+971 4 348 0000',
    category: 'Deluxe',
    amenities: ['Pool', 'Beach Access', 'Restaurant', 'Gym']
  },
  {
    name: 'Burj Al Arab',
    city: 'Dubai',
    roomTypes: ['Deluxe Suite', 'Presidential Suite', 'Royal Suite'],
    capacity: 100,
    contact: '+971 4 301 7777',
    category: 'VVIP',
    amenities: ['Butler Service', 'Helipad', 'Private Beach', 'Spa', 'Fine Dining']
  },
  {
    name: 'Marriott Dubai',
    city: 'Dubai',
    roomTypes: ['Standard', 'Deluxe', 'Executive'],
    capacity: 400,
    contact: '+971 4 222 7100',
    category: 'Standard',
    amenities: ['Pool', 'Gym', 'Business Center', 'Restaurant']
  },
];

export const hotelStore = {
  getAll: (): EMSHotel[] => getItem<EMSHotel>(KEYS.HOTELS),

  getById: (id: string): EMSHotel | undefined => {
    return hotelStore.getAll().find(h => h.id === id);
  },

  create: (hotel: Omit<EMSHotel, 'id' | 'createdAt' | 'updatedAt'>): EMSHotel => {
    const newHotel: EMSHotel = {
      ...hotel,
      id: generateId('htl'),
      createdAt: now(),
      updatedAt: now(),
    };
    const hotels = hotelStore.getAll();
    hotels.push(newHotel);
    setItem(KEYS.HOTELS, hotels);
    return newHotel;
  },

  update: (id: string, updates: Partial<EMSHotel>): EMSHotel | null => {
    const hotels = hotelStore.getAll();
    const index = hotels.findIndex(h => h.id === id);
    if (index === -1) return null;
    hotels[index] = { ...hotels[index], ...updates, updatedAt: now() };
    setItem(KEYS.HOTELS, hotels);
    return hotels[index];
  },

  delete: (id: string): boolean => {
    const hotels = hotelStore.getAll();
    const filtered = hotels.filter(h => h.id !== id);
    if (filtered.length === hotels.length) return false;
    setItem(KEYS.HOTELS, filtered);
    return true;
  },

  seedDefaults: (): void => {
    if (hotelStore.getAll().length === 0) {
      for (const hotel of defaultHotels) {
        hotelStore.create(hotel);
      }
    }
  },

  getOccupancy: (hotelId: string): { occupants: number; capacity: number; percent: number } => {
    const hotel = hotelStore.getById(hotelId);
    const allocations = accommodationStore.getAll().filter(
      a => a.hotelId === hotelId && a.status !== 'Cancelled' && a.status !== 'Checked-Out'
    );
    const capacity = hotel?.capacity || 0;
    const occupants = allocations.length;
    return {
      occupants,
      capacity,
      percent: capacity > 0 ? Math.round((occupants / capacity) * 100) : 0
    };
  },
};

// ============= ACCOMMODATION STORE =============

const generateConfirmationNumber = (): string => {
  const prefix = 'CONF';
  const num = Math.floor(Math.random() * 900000) + 100000;
  return `${prefix}-${num}`;
};

export const accommodationStore = {
  getAll: (): EMSAccommodation[] => getItem<EMSAccommodation>(KEYS.ACCOMMODATIONS),

  getById: (id: string): EMSAccommodation | undefined => {
    return accommodationStore.getAll().find(a => a.id === id);
  },

  getByParticipant: (participantId: string): EMSAccommodation | undefined => {
    return accommodationStore.getAll().find(a => a.participantId === participantId && a.status !== 'Cancelled');
  },

  getByRegistration: (registrationId: string): EMSAccommodation | undefined => {
    return accommodationStore.getAll().find(a => a.registrationId === registrationId && a.status !== 'Cancelled');
  },

  getByHotel: (hotelId: string): EMSAccommodation[] => {
    return accommodationStore.getAll().filter(a => a.hotelId === hotelId && a.status !== 'Cancelled');
  },

  getByStatus: (status: AccommodationStatus): EMSAccommodation[] => {
    return accommodationStore.getAll().filter(a => a.status === status);
  },

  create: (accommodation: Omit<EMSAccommodation, 'id' | 'allocatedAt' | 'createdAt' | 'updatedAt'>): EMSAccommodation => {
    const newAccommodation: EMSAccommodation = {
      ...accommodation,
      id: generateId('acc'),
      allocatedAt: now(),
      createdAt: now(),
      updatedAt: now(),
    };
    const accommodations = accommodationStore.getAll();
    accommodations.push(newAccommodation);
    setItem(KEYS.ACCOMMODATIONS, accommodations);
    return newAccommodation;
  },

  update: (id: string, updates: Partial<EMSAccommodation>): EMSAccommodation | null => {
    const accommodations = accommodationStore.getAll();
    const index = accommodations.findIndex(a => a.id === id);
    if (index === -1) return null;
    accommodations[index] = { ...accommodations[index], ...updates, updatedAt: now() };
    setItem(KEYS.ACCOMMODATIONS, accommodations);
    return accommodations[index];
  },

  // Status transition methods
  confirm: (id: string, confirmedBy?: string, confirmationNumber?: string): EMSAccommodation | null => {
    return accommodationStore.update(id, {
      status: 'Confirmed',
      confirmedAt: now(),
      confirmedBy,
      confirmationNumber: confirmationNumber || generateConfirmationNumber(),
    });
  },

  checkIn: (id: string): EMSAccommodation | null => {
    return accommodationStore.update(id, {
      status: 'Checked-In',
      checkedInAt: now(),
    });
  },

  checkOut: (id: string): EMSAccommodation | null => {
    return accommodationStore.update(id, {
      status: 'Checked-Out',
      checkedOutAt: now(),
    });
  },

  cancel: (id: string, reason?: string): EMSAccommodation | null => {
    return accommodationStore.update(id, {
      status: 'Cancelled',
      notes: reason,
    });
  },

  // Bulk operations
  confirmAll: (ids: string[], confirmedBy?: string): number => {
    let count = 0;
    for (const id of ids) {
      if (accommodationStore.confirm(id, confirmedBy)) {
        count++;
      }
    }
    return count;
  },

  // Check if participant is eligible for accommodation
  checkEligibility: (participantId: string): {
    eligible: boolean;
    reason: string;
    checkIn?: string;
    checkOut?: string;
    travelStatus?: string;
  } => {
    const registrations = registrationStore.getByParticipant(participantId);
    const registration = registrations.find(r => r.status === 'Approved');

    if (!registration) {
      return { eligible: false, reason: 'No approved registration found' };
    }

    if (!registration.formData.needsAccommodation) {
      return { eligible: false, reason: 'Participant did not request accommodation' };
    }

    // Check for existing allocation
    const existing = accommodationStore.getByParticipant(participantId);
    if (existing) {
      return { eligible: false, reason: 'Participant already has an active accommodation allocation' };
    }

    // Check travel status - need ticketed travel for dates
    const travel = travelStore.getByParticipant(participantId)[0];
    if (!travel) {
      return { eligible: false, reason: 'No travel request found - travel must be booked first' };
    }

    if (travel.status !== 'Ticketed') {
      return {
        eligible: false,
        reason: `Travel status is "${travel.status}" - must be Ticketed to allocate accommodation`,
        travelStatus: travel.status
      };
    }

    // Get dates from ticketed travel itinerary
    const arrivalFlight = travel.itinerary[0];
    const departureFlight = travel.itinerary[travel.itinerary.length - 1];

    if (!arrivalFlight || !departureFlight) {
      return { eligible: false, reason: 'Travel itinerary is incomplete - no flight details found' };
    }

    // Extract dates from itinerary (format: "YYYY-MM-DD HH:MM")
    const checkIn = arrivalFlight.arriveAt.split(' ')[0];
    const checkOut = departureFlight.departAt.split(' ')[0];

    return {
      eligible: true,
      reason: 'Participant is eligible for accommodation',
      checkIn,
      checkOut,
      travelStatus: travel.status
    };
  },

  // Get travel-derived dates for a participant
  getTravelDates: (participantId: string): { checkIn: string; checkOut: string; nights: number } | null => {
    const travel = travelStore.getByParticipant(participantId)[0];
    if (!travel || travel.status !== 'Ticketed' || travel.itinerary.length < 2) {
      return null;
    }

    const arrivalFlight = travel.itinerary[0];
    const departureFlight = travel.itinerary[travel.itinerary.length - 1];

    const checkIn = arrivalFlight.arriveAt.split(' ')[0];
    const checkOut = departureFlight.departAt.split(' ')[0];

    // Calculate nights
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    return { checkIn, checkOut, nights };
  },

  // Sync accommodation dates with travel (when travel changes)
  syncWithTravel: (participantId: string): EMSAccommodation | null => {
    const accommodation = accommodationStore.getByParticipant(participantId);
    if (!accommodation) return null;

    const travelDates = accommodationStore.getTravelDates(participantId);
    if (!travelDates) return null;

    return accommodationStore.update(accommodation.id, {
      checkIn: travelDates.checkIn,
      checkOut: travelDates.checkOut,
    });
  },

  // Auto-generate accommodation when travel is ticketed
  generateForTicketedTravel: (participantId: string): EMSAccommodation | null => {
    const eligibility = accommodationStore.checkEligibility(participantId);
    if (!eligibility.eligible || !eligibility.checkIn || !eligibility.checkOut) {
      return null;
    }

    const registrations = registrationStore.getByParticipant(participantId);
    const registration = registrations.find(r => r.status === 'Approved');
    if (!registration) return null;

    const participant = participantStore.getById(participantId);
    if (!participant) return null;

    // Match hotel based on participant role
    const hotels = hotelStore.getAll();
    let hotel: EMSHotel | undefined;

    if (participant.role === 'VVIP') {
      hotel = hotels.find(h => h.category === 'VVIP') || hotels.find(h => h.category === 'VIP');
    } else if (participant.role === 'VIP') {
      hotel = hotels.find(h => h.category === 'VIP') || hotels.find(h => h.category === 'Deluxe');
    } else {
      hotel = hotels.find(h => h.category === 'Standard') || hotels.find(h => h.category === 'Deluxe');
    }

    if (!hotel) hotel = hotels[0];
    if (!hotel) return null;

    // Generate room number
    const roomPrefix = hotel.category === 'VVIP' ? 'PS' : hotel.category === 'VIP' ? 'S' : '';
    const roomNum = Math.floor(Math.random() * 900) + 100;
    const roomNumber = roomPrefix ? `${roomPrefix}-${roomNum}` : `${roomNum}`;

    // Select room type based on role
    const roomType = participant.role === 'VVIP' || participant.role === 'VIP'
      ? hotel.roomTypes.find(t => t.toLowerCase().includes('suite')) || hotel.roomTypes[hotel.roomTypes.length - 1]
      : hotel.roomTypes[0];

    return accommodationStore.create({
      participantId: participant.id,
      registrationId: registration.id,
      hotelId: hotel.id,
      hotelName: hotel.name,
      roomType,
      roomNumber,
      checkIn: eligibility.checkIn,
      checkOut: eligibility.checkOut,
      status: 'Provisional',
      roommates: [],
      gender: 'Other',
    });
  },

  // Legacy method - now delegates to new logic
  generateForApprovedRegistration: (registrationId: string): EMSAccommodation | null => {
    const registration = registrationStore.getById(registrationId);
    if (!registration) return null;
    return accommodationStore.generateForTicketedTravel(registration.participantId);
  },

  // Statistics
  getStats: () => {
    const accommodations = accommodationStore.getAll();
    return {
      total: accommodations.length,
      provisional: accommodations.filter(a => a.status === 'Provisional').length,
      confirmed: accommodations.filter(a => a.status === 'Confirmed').length,
      checkedIn: accommodations.filter(a => a.status === 'Checked-In').length,
      checkedOut: accommodations.filter(a => a.status === 'Checked-Out').length,
      cancelled: accommodations.filter(a => a.status === 'Cancelled').length,
    };
  },

  delete: (id: string): boolean => {
    const accommodations = accommodationStore.getAll();
    const filtered = accommodations.filter(a => a.id !== id);
    if (filtered.length === accommodations.length) return false;
    setItem(KEYS.ACCOMMODATIONS, filtered);
    return true;
  },
};

// ============= ARABIC DUMMY DATA =============

const arabicParticipantsData: Omit<EMSParticipant, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    firstName: 'محمد',
    lastName: 'عبد الله',
    email: 'mohammad.abdullah@uae.gov',
    phone: '+971 50 234 5678',
    nationality: 'UAE',
    passportNumber: 'AE112233445',
    organization: 'الاتحاد الرياضي الإماراتي',
    role: 'VVIP',
    gender: 'male',
    dietaryNotes: 'حلال',
    accessibilityNeeds: '',
  },
  {
    firstName: 'أحمد',
    lastName: 'علي',
    email: 'ahmad.ali@qatar.qa',
    phone: '+974 5512 3456',
    nationality: 'Qatar',
    passportNumber: 'QA223344556',
    organization: 'اللجنة الأولمبية القطرية',
    role: 'VIP',
    gender: 'male',
    dietaryNotes: 'حلال',
    accessibilityNeeds: '',
  },
  {
    firstName: 'عمر',
    lastName: 'خالد',
    email: 'omar.khaled@sa.gov',
    phone: '+966 50 123 4567',
    nationality: 'Saudi Arabia',
    passportNumber: 'SA334455667',
    organization: 'وزارة الرياضة السعودية',
    role: 'Official',
    gender: 'male',
    dietaryNotes: 'حلال',
    accessibilityNeeds: '',
  },
  {
    firstName: 'يوسف',
    lastName: 'عبد الرحمن',
    email: 'youssef.abdulrahman@kw.gov',
    phone: '+965 6612 3456',
    nationality: 'Kuwait',
    passportNumber: 'KW445566778',
    organization: 'الاتحاد الكويتي للرياضة',
    role: 'Athlete',
    gender: 'male',
    dietaryNotes: 'حلال',
    accessibilityNeeds: '',
  },
  {
    firstName: 'علي',
    lastName: 'حسن',
    email: 'ali.hassan@bh.gov',
    phone: '+973 3312 3456',
    nationality: 'Bahrain',
    passportNumber: 'BH556677889',
    organization: 'اللجنة الأولمبية البحرينية',
    role: 'Judge',
    gender: 'male',
    dietaryNotes: 'حلال',
    accessibilityNeeds: '',
  },
  {
    firstName: 'إبراهيم',
    lastName: 'صالح',
    email: 'ibrahim.saleh@om.gov',
    phone: '+968 9912 3456',
    nationality: 'Oman',
    passportNumber: 'OM667788990',
    organization: 'وزارة الشؤون الرياضية العمانية',
    role: 'Official',
    gender: 'male',
    dietaryNotes: 'حلال',
    accessibilityNeeds: '',
  },
  {
    firstName: 'عبد الله',
    lastName: 'محمد',
    email: 'abdullah.mohammad@jo.gov',
    phone: '+962 79 123 4567',
    nationality: 'Jordan',
    passportNumber: 'JO778899001',
    organization: 'اللجنة الأولمبية الأردنية',
    role: 'Athlete',
    gender: 'male',
    dietaryNotes: 'حلال',
    accessibilityNeeds: '',
  },
  {
    firstName: 'خالد',
    lastName: 'ناصر',
    email: 'khaled.nasser@eg.gov',
    phone: '+20 100 234 5678',
    nationality: 'Egypt',
    passportNumber: 'EG889900112',
    organization: 'اتحاد الألعاب الرياضية المصري',
    role: 'Media',
    gender: 'male',
    dietaryNotes: 'حلال',
    accessibilityNeeds: '',
  },
  {
    firstName: 'حسين',
    lastName: 'فهد',
    email: 'hussein.fahd@lb.gov',
    phone: '+961 3 123 456',
    nationality: 'Lebanon',
    passportNumber: 'LB990011223',
    organization: 'اللجنة الأولمبية اللبنانية',
    role: 'VIP',
    gender: 'male',
    dietaryNotes: 'حلال',
    accessibilityNeeds: '',
  },
  {
    firstName: 'سلمان',
    lastName: 'عبد العزيز',
    email: 'salman.abdulaziz@iq.gov',
    phone: '+964 770 123 4567',
    nationality: 'Iraq',
    passportNumber: 'IQ001122334',
    organization: 'الاتحاد العراقي للرياضة',
    role: 'Athlete',
    gender: 'male',
    dietaryNotes: 'حلال',
    accessibilityNeeds: '',
  },
  {
    firstName: 'طارق',
    lastName: 'سعيد',
    email: 'tarek.saeed@ma.gov',
    phone: '+212 6 12 34 56 78',
    nationality: 'Morocco',
    passportNumber: 'MA112233445',
    organization: 'اللجنة الأولمبية المغربية',
    role: 'Judge',
    gender: 'male',
    dietaryNotes: 'حلال',
    accessibilityNeeds: '',
  },
  {
    firstName: 'أنس',
    lastName: 'عبد الكريم',
    email: 'anas.abdulkareem@tn.gov',
    phone: '+216 20 123 456',
    nationality: 'Tunisia',
    passportNumber: 'TN223344556',
    organization: 'الاتحاد التونسي للرياضة',
    role: 'Fan',
    gender: 'male',
    dietaryNotes: 'حلال',
    accessibilityNeeds: '',
  },
];

// Seed Arabic participants if they don't exist
export const seedArabicParticipants = (): void => {
  const existing = participantStore.getAll();
  const arabicEmails = arabicParticipantsData.map(p => p.email.toLowerCase());
  const alreadySeeded = existing.some(p => arabicEmails.includes(p.email.toLowerCase()));

  if (!alreadySeeded) {
    participantStore.bulkCreate(arabicParticipantsData);
  }
};

// ============= STORE INITIALIZATION =============

export const initializeStore = (): void => {
  // Seed default templates
  templateStore.seedDefaults();
  // Seed Arabic participants
  seedArabicParticipants();
  // Seed default hotels
  hotelStore.seedDefaults();
  // Seed transport routes and vehicles
  transportRouteStore.seedDefaults();
  vehicleStore.seedDefaults();
};

// ============= STORE RESET =============

export const resetStore = (): void => {
  Object.values(KEYS).forEach(key => localStorage.removeItem(key));
  initializeStore();
};

// ============= DASHBOARD STATS =============

export const getDashboardStats = () => {
  const events = eventStore.getAll();
  const participants = participantStore.getAll();
  const invitations = invitationStore.getAll();
  const registrations = registrationStore.getAll();
  const campaigns = campaignStore.getAll();

  return {
    events: {
      total: events.length,
      published: events.filter(e => e.status === 'Published').length,
      ongoing: events.filter(e => e.status === 'Ongoing').length,
    },
    participants: {
      total: participants.length,
    },
    invitations: {
      total: invitations.length,
      pending: invitations.filter(i => i.status === 'Pending').length,
      delivered: invitations.filter(i => i.status === 'Delivered').length,
      opened: invitations.filter(i => i.status === 'Opened').length,
      accepted: invitations.filter(i => i.status === 'Accepted').length,
      declined: invitations.filter(i => i.status === 'Declined').length,
      maybe: invitations.filter(i => i.status === 'Maybe').length,
    },
    registrations: {
      total: registrations.length,
      draft: registrations.filter(r => r.status === 'Draft').length,
      submitted: registrations.filter(r => r.status === 'Submitted').length,
      underReview: registrations.filter(r => r.status === 'Under Review').length,
      approved: registrations.filter(r => r.status === 'Approved').length,
      rejected: registrations.filter(r => r.status === 'Rejected').length,
    },
    campaigns: {
      total: campaigns.length,
      sent: campaigns.filter(c => c.status === 'Sent' || c.status === 'Completed').length,
    },
  };
};

// ============= VISA STORE =============

export const visaStore = {
  getAll: (): EMSVisaApplication[] => getItem<EMSVisaApplication>(KEYS.VISAS),

  getById: (id: string): EMSVisaApplication | undefined => {
    return visaStore.getAll().find(v => v.id === id);
  },

  getByParticipant: (participantId: string): EMSVisaApplication | undefined => {
    return visaStore.getAll().find(v => v.participantId === participantId);
  },

  create: (application: Omit<EMSVisaApplication, 'id' | 'createdAt' | 'updatedAt'>): EMSVisaApplication => {
    const newApplication: EMSVisaApplication = {
      ...application,
      id: generateId('visa'),
      createdAt: now(),
      updatedAt: now(),
    };
    const applications = visaStore.getAll();
    applications.push(newApplication);
    setItem(KEYS.VISAS, applications);
    return newApplication;
  },

  update: (id: string, updates: Partial<EMSVisaApplication>): EMSVisaApplication | null => {
    const applications = visaStore.getAll();
    const index = applications.findIndex(v => v.id === id);
    if (index === -1) return null;

    let finalUpdates = { ...updates };

    // Auto-verify all docs if overall status becomes Approved
    if (updates.status === 'Approved') {
      const currentApp = applications[index];
      const verifiedDocs = currentApp.uploadedDocuments.map(doc => ({
        ...doc,
        status: 'Verified' as const
      }));
      finalUpdates = { ...finalUpdates, uploadedDocuments: verifiedDocs };
    }

    applications[index] = { ...applications[index], ...finalUpdates, updatedAt: now() };
    setItem(KEYS.VISAS, applications);
    return applications[index];
  },

  // Helper to determine requirements based on nationality/role
  checkRequirement: (participantId: string): EMSVisaApplication => {
    const participant = participantStore.getById(participantId);
    if (!participant) throw new Error('Participant not found');

    const existing = visaStore.getByParticipant(participantId);
    if (existing) return existing;

    // Logic: 
    // Exempt: UAE, GCC, UK, USA, Japan, etc.
    const exemptNationalities = ['UAE', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'UK', 'USA', 'Japan', 'South Korea', 'Singapore', 'Malaysia'];

    // Check if participant nationality is in exempt list (case insensitive)
    const isExempt = exemptNationalities.some(n => n.toLowerCase() === participant.nationality.toLowerCase());

    const status: VisaStatus = isExempt ? 'Not Required' : 'Pending Docs';
    const requiredDocs: string[] = isExempt ? [] : ['Passport Scan', 'Passport Photo', 'Invitation Letter'];

    // Additional docs for some countries
    if (['Iraq', 'Yemen', 'Syria', 'Libya'].includes(participant.nationality)) {
      requiredDocs.push('Security Clearance Form');
    }

    return visaStore.create({
      participantId: participant.id,
      eventId: 'evt-1', // Defaulting to first event
      status,
      nationality: participant.nationality,
      passportNumber: participant.passportNumber,
      passportExpiry: participant.passportExpiry || '',
      requiredDocuments: requiredDocs,
      uploadedDocuments: [],
    });
  },

  addDocument: (id: string, doc: VisaDocument): EMSVisaApplication | null => {
    const app = visaStore.getById(id);
    if (!app) return null;

    // Remove existing doc of same type if exists (replace)
    const otherDocs = app.uploadedDocuments.filter(d => d.type !== doc.type);
    const newDocs = [...otherDocs, doc];

    // Auto-update status if all docs are present
    const allPresent = app.requiredDocuments.every(req => newDocs.some(d => d.type === req));
    let newStatus = app.status;
    if (allPresent && app.status === 'Pending Docs') {
      newStatus = 'Reviewing';
    }

    return visaStore.update(id, {
      uploadedDocuments: newDocs,
      status: newStatus
    });
  },

  verifyDocument: (id: string, fileName: string, status: 'Verified' | 'Rejected', notes?: string): EMSVisaApplication | null => {
    const app = visaStore.getById(id);
    if (!app) return null;

    const newDocs = app.uploadedDocuments.map(doc => {
      if (doc.fileName === fileName) {
        return { ...doc, status, notes };
      }
      return doc;
    });

    // If any rejected, status might need to go back to Pending Docs or More Info
    let newStatus = app.status;
    if (status === 'Rejected') {
      newStatus = 'More Info';
    }

    return visaStore.update(id, { uploadedDocuments: newDocs, status: newStatus });
  },

  delete: (id: string): boolean => {
    const applications = visaStore.getAll();
    const filtered = applications.filter(v => v.id !== id);
    if (filtered.length === applications.length) return false;
    setItem(KEYS.VISAS, filtered);
    return true;
  },
};

// ============= TRANSPORTATION INTERFACES =============

export type TransportTripStatus = 'Planned' | 'Assigned' | 'Notified' | 'Active' | 'Completed' | 'Cancelled';
export type TransportTripType = 'Airport Pickup' | 'Airport Dropoff' | 'Hotel-Venue Shuttle' | 'Daily Shuttle' | 'Custom';

// Transport policy by client group
export interface TransportPolicy {
  role: ParticipantRole;
  vehicleType: 'Sedan' | 'SUV' | 'Mercedes Sprinter' | 'Luxury Bus' | 'Coach';
  priority: number; // 1 = highest (VVIP), 5 = lowest
  bufferMinutes: number; // Time buffer before pickup
  allowSharedVehicle: boolean;
}

export const transportPolicies: TransportPolicy[] = [
  { role: 'VVIP', vehicleType: 'Sedan', priority: 1, bufferMinutes: 90, allowSharedVehicle: false },
  { role: 'VIP', vehicleType: 'SUV', priority: 2, bufferMinutes: 60, allowSharedVehicle: false },
  { role: 'Official', vehicleType: 'SUV', priority: 2, bufferMinutes: 45, allowSharedVehicle: true },
  { role: 'Media', vehicleType: 'Mercedes Sprinter', priority: 3, bufferMinutes: 30, allowSharedVehicle: true },
  { role: 'Judge', vehicleType: 'Mercedes Sprinter', priority: 3, bufferMinutes: 30, allowSharedVehicle: true },
  { role: 'Athlete', vehicleType: 'Luxury Bus', priority: 4, bufferMinutes: 30, allowSharedVehicle: true },
  { role: 'Fan', vehicleType: 'Luxury Bus', priority: 5, bufferMinutes: 20, allowSharedVehicle: true },
];

export const getTransportPolicy = (role: ParticipantRole): TransportPolicy => {
  return transportPolicies.find(p => p.role === role) ||
    { role, vehicleType: 'Luxury Bus', priority: 5, bufferMinutes: 20, allowSharedVehicle: true };
};

export interface EMSTransportRoute {
  id: string;
  name: string;
  from: string;
  fromType: 'Airport' | 'Hotel' | 'Venue' | 'Other';
  to: string;
  toType: 'Airport' | 'Hotel' | 'Venue' | 'Other';
  type: TransportTripType;
  estimatedDuration: number; // minutes
  distance?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EMSVehicle {
  id: string;
  type: 'Luxury Bus' | 'Mercedes Sprinter' | 'Sedan' | 'SUV' | 'Minivan' | 'Coach';
  plateNumber: string;
  capacity: number;
  driverName: string;
  driverPhone: string;
  status: 'Available' | 'In Use' | 'Maintenance';
  features?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EMSTransportTrip {
  id: string;
  routeId: string;
  routeName: string;
  type: TransportTripType;
  eventId?: string; // Link to specific event
  date: string;
  pickupTime: string;
  estimatedArrival: string;
  vehicleId: string | null;
  vehicleType: string;
  vehiclePlate: string | null;
  driverName: string | null;
  driverPhone: string | null;
  capacity: number;
  participantIds: string[];
  status: TransportTripStatus;
  pickupLocation: string;
  dropoffLocation: string;
  linkedFlightNumber?: string; // Link to flight for airport transfers
  linkedHotelId?: string; // Link to hotel for pickup/dropoff
  priority: number; // Based on participant roles
  notes?: string;
  coordinatorNotes?: string;
  actualDeparture?: string;
  actualArrival?: string;
  noShows: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EMSTransportAssignment {
  participantId: string;
  tripId: string;
  pickupTime: string;
  pickupLocation: string;
  status: 'Assigned' | 'Notified' | 'Boarded' | 'Completed' | 'No-Show';
}

// Transport eligibility check result
export interface TransportEligibility {
  eligible: boolean;
  reason: string;
  hasTicketedTravel: boolean;
  hasConfirmedAccommodation: boolean;
  travelDetails?: {
    arrivalDate: string;
    arrivalTime: string;
    departureDate: string;
    departureTime: string;
    arrivalFlightNumber: string;
    departureFlightNumber: string;
  };
  accommodationDetails?: {
    hotelName: string;
    hotelId: string;
    checkIn: string;
    checkOut: string;
  };
}

// Transport Plan for centralized management
export interface EMSTransportPlan {
  id: string;
  name: string;
  eventId?: string;
  date: string;
  type: 'Airport Arrivals' | 'Airport Departures' | 'Venue Shuttles' | 'Custom';
  status: 'Draft' | 'Generated' | 'Assigned' | 'Published';
  participantGroups: TransportGroup[];
  totalParticipants: number;
  totalTrips: number;
  generatedTripIds: string[];
  createdAt: string;
  updatedAt: string;
}

// Grouping for shared transport
export interface TransportGroup {
  id: string;
  name: string;
  roles: ParticipantRole[];
  hotelId?: string;
  hotelName?: string;
  timeWindow: { start: string; end: string }; // e.g., "14:00" to "15:00"
  vehicleType: string;
  participantIds: string[];
  assignedTripId?: string;
  priority: number;
}

// Batch assignment result
export interface BatchAssignmentResult {
  success: boolean;
  tripsCreated: number;
  participantsAssigned: number;
  groupsProcessed: number;
  errors: string[];
}

// ============= DEFAULT ROUTES =============

const defaultRoutes: Omit<EMSTransportRoute, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'DXB Airport to Atlantis',
    from: 'Dubai International Airport (DXB)',
    fromType: 'Airport',
    to: 'Atlantis The Palm',
    toType: 'Hotel',
    type: 'Airport Pickup',
    estimatedDuration: 45,
    distance: '35 km',
  },
  {
    name: 'DXB Airport to Jumeirah Beach',
    from: 'Dubai International Airport (DXB)',
    fromType: 'Airport',
    to: 'Jumeirah Beach Hotel',
    toType: 'Hotel',
    type: 'Airport Pickup',
    estimatedDuration: 35,
    distance: '28 km',
  },
  {
    name: 'Atlantis to Sports City Arena',
    from: 'Atlantis The Palm',
    fromType: 'Hotel',
    to: 'Dubai Sports City Arena',
    toType: 'Venue',
    type: 'Hotel-Venue Shuttle',
    estimatedDuration: 30,
    distance: '25 km',
  },
  {
    name: 'Jumeirah to Sports City Arena',
    from: 'Jumeirah Beach Hotel',
    fromType: 'Hotel',
    to: 'Dubai Sports City Arena',
    toType: 'Venue',
    type: 'Hotel-Venue Shuttle',
    estimatedDuration: 25,
    distance: '22 km',
  },
  {
    name: 'Atlantis to DXB Airport',
    from: 'Atlantis The Palm',
    fromType: 'Hotel',
    to: 'Dubai International Airport (DXB)',
    toType: 'Airport',
    type: 'Airport Dropoff',
    estimatedDuration: 45,
    distance: '35 km',
  },
  {
    name: 'Jumeirah to DXB Airport',
    from: 'Jumeirah Beach Hotel',
    fromType: 'Hotel',
    to: 'Dubai International Airport (DXB)',
    toType: 'Airport',
    type: 'Airport Dropoff',
    estimatedDuration: 40,
    distance: '30 km',
  },
];

const defaultVehicles: Omit<EMSVehicle, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { type: 'Luxury Bus', plateNumber: 'DXB-VH-101', capacity: 45, driverName: 'Ahmed Mohammed', driverPhone: '+971 50 111 2222', status: 'Available', features: ['WiFi', 'AC', 'USB Charging'] },
  { type: 'Mercedes Sprinter', plateNumber: 'DXB-VH-102', capacity: 15, driverName: 'Rashid Ali', driverPhone: '+971 50 333 4444', status: 'Available', features: ['AC', 'Leather Seats'] },
  { type: 'Mercedes Sprinter', plateNumber: 'DXB-VH-103', capacity: 15, driverName: 'Khalid Hassan', driverPhone: '+971 50 555 6666', status: 'Available', features: ['AC', 'Leather Seats'] },
  { type: 'Sedan', plateNumber: 'DXB-VH-201', capacity: 3, driverName: 'Saeed Abdullah', driverPhone: '+971 50 777 8888', status: 'Available', features: ['VIP', 'Leather', 'Privacy Glass'] },
  { type: 'SUV', plateNumber: 'DXB-VH-202', capacity: 6, driverName: 'Omar Faisal', driverPhone: '+971 50 999 0000', status: 'Available', features: ['VIP', 'Luxury'] },
];

// ============= TRANSPORT ROUTE STORE =============

export const transportRouteStore = {
  getAll: (): EMSTransportRoute[] => getItem<EMSTransportRoute>(KEYS.TRANSPORT_ROUTES),

  getById: (id: string): EMSTransportRoute | undefined => {
    return transportRouteStore.getAll().find(r => r.id === id);
  },

  create: (route: Omit<EMSTransportRoute, 'id' | 'createdAt' | 'updatedAt'>): EMSTransportRoute => {
    const newRoute: EMSTransportRoute = {
      ...route,
      id: generateId('route'),
      createdAt: now(),
      updatedAt: now(),
    };
    const routes = transportRouteStore.getAll();
    routes.push(newRoute);
    setItem(KEYS.TRANSPORT_ROUTES, routes);
    return newRoute;
  },

  update: (id: string, updates: Partial<EMSTransportRoute>): EMSTransportRoute | null => {
    const routes = transportRouteStore.getAll();
    const index = routes.findIndex(r => r.id === id);
    if (index === -1) return null;
    routes[index] = { ...routes[index], ...updates, updatedAt: now() };
    setItem(KEYS.TRANSPORT_ROUTES, routes);
    return routes[index];
  },

  delete: (id: string): boolean => {
    const routes = transportRouteStore.getAll();
    const filtered = routes.filter(r => r.id !== id);
    if (filtered.length === routes.length) return false;
    setItem(KEYS.TRANSPORT_ROUTES, filtered);
    return true;
  },

  seedDefaults: (): void => {
    if (transportRouteStore.getAll().length === 0) {
      for (const route of defaultRoutes) {
        transportRouteStore.create(route);
      }
    }
  },
};

// ============= VEHICLE STORE =============

export const vehicleStore = {
  getAll: (): EMSVehicle[] => getItem<EMSVehicle>(KEYS.VEHICLES),

  getById: (id: string): EMSVehicle | undefined => {
    return vehicleStore.getAll().find(v => v.id === id);
  },

  getAvailable: (): EMSVehicle[] => {
    return vehicleStore.getAll().filter(v => v.status === 'Available');
  },

  create: (vehicle: Omit<EMSVehicle, 'id' | 'createdAt' | 'updatedAt'>): EMSVehicle => {
    const newVehicle: EMSVehicle = {
      ...vehicle,
      id: generateId('vh'),
      createdAt: now(),
      updatedAt: now(),
    };
    const vehicles = vehicleStore.getAll();
    vehicles.push(newVehicle);
    setItem(KEYS.VEHICLES, vehicles);
    return newVehicle;
  },

  update: (id: string, updates: Partial<EMSVehicle>): EMSVehicle | null => {
    const vehicles = vehicleStore.getAll();
    const index = vehicles.findIndex(v => v.id === id);
    if (index === -1) return null;
    vehicles[index] = { ...vehicles[index], ...updates, updatedAt: now() };
    setItem(KEYS.VEHICLES, vehicles);
    return vehicles[index];
  },

  delete: (id: string): boolean => {
    const vehicles = vehicleStore.getAll();
    const filtered = vehicles.filter(v => v.id !== id);
    if (filtered.length === vehicles.length) return false;
    setItem(KEYS.VEHICLES, filtered);
    return true;
  },

  seedDefaults: (): void => {
    if (vehicleStore.getAll().length === 0) {
      for (const vehicle of defaultVehicles) {
        vehicleStore.create(vehicle);
      }
    }
  },
};

// ============= TRANSPORT TRIP STORE =============

export const transportTripStore = {
  getAll: (): EMSTransportTrip[] => getItem<EMSTransportTrip>(KEYS.TRANSPORT_TRIPS),

  getById: (id: string): EMSTransportTrip | undefined => {
    return transportTripStore.getAll().find(t => t.id === id);
  },

  getByDate: (date: string): EMSTransportTrip[] => {
    return transportTripStore.getAll().filter(t => t.date === date);
  },

  getByParticipant: (participantId: string): EMSTransportTrip[] => {
    return transportTripStore.getAll().filter(t =>
      t.participantIds.includes(participantId) && t.status !== 'Cancelled'
    );
  },

  getByStatus: (status: TransportTripStatus): EMSTransportTrip[] => {
    return transportTripStore.getAll().filter(t => t.status === status);
  },

  getByEvent: (eventId: string): EMSTransportTrip[] => {
    return transportTripStore.getAll().filter(t => t.eventId === eventId);
  },

  // Check if a participant is eligible for transport
  checkEligibility: (participantId: string): TransportEligibility => {
    const participant = participantStore.getById(participantId);
    if (!participant) {
      return { eligible: false, reason: 'Participant not found', hasTicketedTravel: false, hasConfirmedAccommodation: false };
    }

    // Check registration
    const registrations = registrationStore.getByParticipant(participantId);
    const approvedReg = registrations.find(r => r.status === 'Approved' && r.formData.needsTransport);
    if (!approvedReg) {
      return { eligible: false, reason: 'No approved registration with transport needs', hasTicketedTravel: false, hasConfirmedAccommodation: false };
    }

    // Check travel status
    const travel = travelStore.getByParticipant(participantId)[0];
    const hasTicketedTravel = travel?.status === 'Ticketed' && travel.itinerary.length >= 2;

    // Check accommodation status
    const accommodation = accommodationStore.getByParticipant(participantId);
    const hasConfirmedAccommodation = accommodation?.status === 'Confirmed' || accommodation?.status === 'Checked-In';

    if (!hasTicketedTravel) {
      return {
        eligible: false,
        reason: 'Flight must be ticketed before transport can be arranged',
        hasTicketedTravel: false,
        hasConfirmedAccommodation: !!hasConfirmedAccommodation
      };
    }

    if (!hasConfirmedAccommodation) {
      return {
        eligible: false,
        reason: 'Accommodation must be confirmed for transport planning',
        hasTicketedTravel: true,
        hasConfirmedAccommodation: false
      };
    }

    // Extract travel details
    const arrivalFlight = travel.itinerary[0];
    const departureFlight = travel.itinerary[travel.itinerary.length - 1];

    return {
      eligible: true,
      reason: 'Eligible for transport',
      hasTicketedTravel: true,
      hasConfirmedAccommodation: true,
      travelDetails: {
        arrivalDate: arrivalFlight.arriveAt.split(' ')[0],
        arrivalTime: arrivalFlight.arriveAt.split(' ')[1] || '14:00',
        departureDate: departureFlight.departAt.split(' ')[0],
        departureTime: departureFlight.departAt.split(' ')[1] || '22:00',
        arrivalFlightNumber: arrivalFlight.flightNumber,
        departureFlightNumber: departureFlight.flightNumber,
      },
      accommodationDetails: {
        hotelName: accommodation!.hotelName,
        hotelId: accommodation!.hotelId,
        checkIn: accommodation!.checkIn,
        checkOut: accommodation!.checkOut,
      },
    };
  },

  // Get all eligible participants for transport generation
  getEligibleParticipants: (): { participant: EMSParticipant; eligibility: TransportEligibility }[] => {
    const participants = participantStore.getAll();
    const eligible: { participant: EMSParticipant; eligibility: TransportEligibility }[] = [];

    for (const p of participants) {
      const eligibility = transportTripStore.checkEligibility(p.id);
      if (eligibility.eligible) {
        eligible.push({ participant: p, eligibility });
      }
    }

    return eligible;
  },

  create: (trip: Omit<EMSTransportTrip, 'id' | 'createdAt' | 'updatedAt'>): EMSTransportTrip => {
    const newTrip: EMSTransportTrip = {
      ...trip,
      id: generateId('trip'),
      createdAt: now(),
      updatedAt: now(),
    };
    const trips = transportTripStore.getAll();
    trips.push(newTrip);
    setItem(KEYS.TRANSPORT_TRIPS, trips);
    return newTrip;
  },

  update: (id: string, updates: Partial<EMSTransportTrip>): EMSTransportTrip | null => {
    const trips = transportTripStore.getAll();
    const index = trips.findIndex(t => t.id === id);
    if (index === -1) return null;
    trips[index] = { ...trips[index], ...updates, updatedAt: now() };
    setItem(KEYS.TRANSPORT_TRIPS, trips);
    return trips[index];
  },

  // Status transitions
  assignVehicle: (tripId: string, vehicleId: string): EMSTransportTrip | null => {
    const vehicle = vehicleStore.getById(vehicleId);
    if (!vehicle) return null;

    return transportTripStore.update(tripId, {
      status: 'Assigned',
      vehicleId,
      vehiclePlate: vehicle.plateNumber,
      driverName: vehicle.driverName,
      driverPhone: vehicle.driverPhone,
      capacity: vehicle.capacity,
    });
  },

  notifyPassengers: (tripId: string): EMSTransportTrip | null => {
    return transportTripStore.update(tripId, { status: 'Notified' });
  },

  startTrip: (tripId: string): EMSTransportTrip | null => {
    return transportTripStore.update(tripId, {
      status: 'Active',
      actualDeparture: now(),
    });
  },

  completeTrip: (tripId: string): EMSTransportTrip | null => {
    return transportTripStore.update(tripId, {
      status: 'Completed',
      actualArrival: now(),
    });
  },

  cancelTrip: (tripId: string, reason?: string): EMSTransportTrip | null => {
    return transportTripStore.update(tripId, {
      status: 'Cancelled',
      notes: reason,
    });
  },

  markNoShow: (tripId: string, participantId: string): EMSTransportTrip | null => {
    const trip = transportTripStore.getById(tripId);
    if (!trip) return null;

    const noShows = [...trip.noShows];
    if (!noShows.includes(participantId)) {
      noShows.push(participantId);
    }
    return transportTripStore.update(tripId, { noShows });
  },

  addPassenger: (tripId: string, participantId: string): EMSTransportTrip | null => {
    const trip = transportTripStore.getById(tripId);
    if (!trip) return null;
    if (trip.participantIds.includes(participantId)) return trip;
    if (trip.participantIds.length >= trip.capacity) return null;

    return transportTripStore.update(tripId, {
      participantIds: [...trip.participantIds, participantId],
    });
  },

  removePassenger: (tripId: string, participantId: string): EMSTransportTrip | null => {
    const trip = transportTripStore.getById(tripId);
    if (!trip) return null;

    return transportTripStore.update(tripId, {
      participantIds: trip.participantIds.filter(id => id !== participantId),
    });
  },

  // Auto-generate trips when travel is ticketed
  generateAirportTransfers: (participantId: string): { pickup: EMSTransportTrip | null; dropoff: EMSTransportTrip | null } => {
    const travel = travelStore.getByParticipant(participantId)[0];
    if (!travel || travel.status !== 'Ticketed' || travel.itinerary.length < 2) {
      return { pickup: null, dropoff: null };
    }

    const accommodation = accommodationStore.getByParticipant(participantId);
    if (!accommodation) {
      return { pickup: null, dropoff: null };
    }

    const hotel = hotelStore.getById(accommodation.hotelId);
    const hotelName = hotel?.name || accommodation.hotelName;

    // Get arrival and departure from itinerary
    const arrivalFlight = travel.itinerary[0];
    const departureFlight = travel.itinerary[travel.itinerary.length - 1];

    const arrivalDate = arrivalFlight.arriveAt.split(' ')[0];
    const arrivalTime = arrivalFlight.arriveAt.split(' ')[1] || '14:00';
    const departureDate = departureFlight.departAt.split(' ')[0];
    const departureTime = departureFlight.departAt.split(' ')[1] || '22:00';

    // Find or create pickup route
    let pickupRoute = transportRouteStore.getAll().find(r =>
      r.type === 'Airport Pickup' && r.to.toLowerCase().includes(hotelName.toLowerCase().split(' ')[0])
    );
    if (!pickupRoute) {
      pickupRoute = transportRouteStore.getAll().find(r => r.type === 'Airport Pickup');
    }

    // Find or create dropoff route
    let dropoffRoute = transportRouteStore.getAll().find(r =>
      r.type === 'Airport Dropoff' && r.from.toLowerCase().includes(hotelName.toLowerCase().split(' ')[0])
    );
    if (!dropoffRoute) {
      dropoffRoute = transportRouteStore.getAll().find(r => r.type === 'Airport Dropoff');
    }

    // Check for existing trips
    const existingTrips = transportTripStore.getByParticipant(participantId);
    const hasPickup = existingTrips.some(t => t.type === 'Airport Pickup' && t.date === arrivalDate);
    const hasDropoff = existingTrips.some(t => t.type === 'Airport Dropoff' && t.date === departureDate);

    let pickup: EMSTransportTrip | null = null;
    let dropoff: EMSTransportTrip | null = null;

    // Calculate pickup time (30 min after flight arrival for customs/baggage)
    const calculatePickupTime = (flightArrival: string): string => {
      const [hours, minutes] = flightArrival.split(':').map(Number);
      const pickupMinutes = minutes + 30;
      const newHours = hours + Math.floor(pickupMinutes / 60);
      const newMinutes = pickupMinutes % 60;
      return `${String(newHours % 24).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
    };

    // Calculate dropoff pickup time (3 hours before flight)
    const calculateDropoffPickupTime = (flightDeparture: string): string => {
      const [hours, minutes] = flightDeparture.split(':').map(Number);
      let newHours = hours - 3;
      if (newHours < 0) newHours += 24;
      return `${String(newHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    // Get participant's priority based on role
    const participant = participantStore.getById(participantId);
    const policy = getTransportPolicy(participant?.role || 'Fan');

    if (!hasPickup && pickupRoute) {
      const pickupTime = calculatePickupTime(arrivalTime);
      pickup = transportTripStore.create({
        routeId: pickupRoute.id,
        routeName: pickupRoute.name,
        type: 'Airport Pickup',
        date: arrivalDate,
        pickupTime,
        estimatedArrival: `${String(parseInt(pickupTime.split(':')[0]) + Math.floor(pickupRoute.estimatedDuration / 60)).padStart(2, '0')}:${String((parseInt(pickupTime.split(':')[1]) + pickupRoute.estimatedDuration % 60) % 60).padStart(2, '0')}`,
        vehicleId: null,
        vehicleType: policy.vehicleType,
        vehiclePlate: null,
        driverName: null,
        driverPhone: null,
        capacity: policy.vehicleType === 'Luxury Bus' ? 45 : policy.vehicleType === 'Sedan' ? 3 : policy.vehicleType === 'SUV' ? 6 : 15,
        participantIds: [participantId],
        status: 'Planned',
        pickupLocation: pickupRoute.from,
        dropoffLocation: hotelName,
        linkedFlightNumber: travel.itinerary[0]?.flightNumber,
        linkedHotelId: accommodation?.hotelId,
        priority: policy.priority,
        noShows: [],
      });
    }

    if (!hasDropoff && dropoffRoute) {
      const pickupTime = calculateDropoffPickupTime(departureTime);
      dropoff = transportTripStore.create({
        routeId: dropoffRoute.id,
        routeName: dropoffRoute.name,
        type: 'Airport Dropoff',
        date: departureDate,
        pickupTime,
        estimatedArrival: departureTime,
        vehicleId: null,
        vehicleType: policy.vehicleType,
        vehiclePlate: null,
        driverName: null,
        driverPhone: null,
        capacity: policy.vehicleType === 'Luxury Bus' ? 45 : policy.vehicleType === 'Sedan' ? 3 : policy.vehicleType === 'SUV' ? 6 : 15,
        participantIds: [participantId],
        status: 'Planned',
        pickupLocation: hotelName,
        dropoffLocation: dropoffRoute.to,
        linkedFlightNumber: travel.itinerary[travel.itinerary.length - 1]?.flightNumber,
        linkedHotelId: accommodation?.hotelId,
        priority: policy.priority,
        noShows: [],
      });
    }

    return { pickup, dropoff };
  },

  // Sync transport when travel changes
  syncWithTravel: (participantId: string): void => {
    const travel = travelStore.getByParticipant(participantId)[0];
    if (!travel || travel.status !== 'Ticketed') return;

    const trips = transportTripStore.getByParticipant(participantId);

    // Update pickup date/time based on arrival
    const arrivalFlight = travel.itinerary[0];
    if (arrivalFlight) {
      const arrivalDate = arrivalFlight.arriveAt.split(' ')[0];
      const pickupTrip = trips.find(t => t.type === 'Airport Pickup');
      if (pickupTrip && pickupTrip.date !== arrivalDate) {
        const arrivalTime = arrivalFlight.arriveAt.split(' ')[1] || '14:00';
        const [hours, minutes] = arrivalTime.split(':').map(Number);
        const pickupTime = `${String(hours).padStart(2, '0')}:${String((minutes + 30) % 60).padStart(2, '0')}`;
        transportTripStore.update(pickupTrip.id, { date: arrivalDate, pickupTime });
      }
    }

    // Update dropoff date/time based on departure
    const departureFlight = travel.itinerary[travel.itinerary.length - 1];
    if (departureFlight) {
      const departureDate = departureFlight.departAt.split(' ')[0];
      const dropoffTrip = trips.find(t => t.type === 'Airport Dropoff');
      if (dropoffTrip && dropoffTrip.date !== departureDate) {
        const departureTime = departureFlight.departAt.split(' ')[1] || '22:00';
        const [hours] = departureTime.split(':').map(Number);
        const pickupTime = `${String((hours - 3 + 24) % 24).padStart(2, '0')}:00`;
        transportTripStore.update(dropoffTrip.id, { date: departureDate, pickupTime });
      }
    }
  },

  getStats: () => {
    const trips = transportTripStore.getAll();
    return {
      total: trips.length,
      planned: trips.filter(t => t.status === 'Planned').length,
      assigned: trips.filter(t => t.status === 'Assigned').length,
      notified: trips.filter(t => t.status === 'Notified').length,
      active: trips.filter(t => t.status === 'Active').length,
      completed: trips.filter(t => t.status === 'Completed').length,
      cancelled: trips.filter(t => t.status === 'Cancelled').length,
    };
  },

  delete: (id: string): boolean => {
    const trips = transportTripStore.getAll();
    const filtered = trips.filter(t => t.id !== id);
    if (filtered.length === trips.length) return false;
    setItem(KEYS.TRANSPORT_TRIPS, filtered);
    return true;
  },

  // Batch create trips for a transport plan with automatic grouping
  batchCreateFromGroups: (groups: TransportGroup[], date: string, type: TransportTripType): { trips: EMSTransportTrip[]; errors: string[] } => {
    const createdTrips: EMSTransportTrip[] = [];
    const errors: string[] = [];

    for (const group of groups) {
      if (group.participantIds.length === 0) continue;

      // Find or create route
      let route = transportRouteStore.getAll().find(r => r.type === type);
      if (!route && type === 'Airport Pickup') {
        route = transportRouteStore.getAll().find(r => r.type === 'Airport Pickup');
      }

      if (!route) {
        errors.push(`No route found for type ${type}`);
        continue;
      }

      // Calculate capacity based on vehicle type
      const capacity = group.vehicleType === 'Luxury Bus' ? 45 :
        group.vehicleType === 'Mercedes Sprinter' ? 15 :
          group.vehicleType === 'SUV' ? 6 :
            group.vehicleType === 'Sedan' ? 3 : 15;

      // Split into multiple trips if needed
      const participantChunks: string[][] = [];
      for (let i = 0; i < group.participantIds.length; i += capacity) {
        participantChunks.push(group.participantIds.slice(i, i + capacity));
      }

      for (let chunkIndex = 0; chunkIndex < participantChunks.length; chunkIndex++) {
        const chunk = participantChunks[chunkIndex];
        const pickupTime = group.timeWindow.start;

        // Calculate estimated arrival
        const [hours, minutes] = pickupTime.split(':').map(Number);
        const arrivalMinutes = hours * 60 + minutes + route.estimatedDuration;
        const estArrival = `${String(Math.floor(arrivalMinutes / 60) % 24).padStart(2, '0')}:${String(arrivalMinutes % 60).padStart(2, '0')}`;

        const trip = transportTripStore.create({
          routeId: route.id,
          routeName: `${group.name}${participantChunks.length > 1 ? ` (${chunkIndex + 1}/${participantChunks.length})` : ''}`,
          type,
          date,
          pickupTime,
          estimatedArrival: estArrival,
          vehicleId: null,
          vehicleType: group.vehicleType,
          vehiclePlate: null,
          driverName: null,
          driverPhone: null,
          capacity,
          participantIds: chunk,
          status: 'Planned',
          pickupLocation: route.from,
          dropoffLocation: group.hotelName || route.to,
          linkedHotelId: group.hotelId,
          priority: group.priority,
          noShows: [],
        });

        createdTrips.push(trip);
      }
    }

    return { trips: createdTrips, errors };
  },

  // Batch assign vehicles to trips based on vehicle type and availability
  batchAssignVehicles: (tripIds: string[]): { assigned: number; failed: number } => {
    let assigned = 0;
    let failed = 0;

    // Sort trips by priority (lower = more important)
    const tripsToAssign = tripIds
      .map(id => transportTripStore.getById(id))
      .filter((t): t is EMSTransportTrip => !!t && t.status === 'Planned')
      .sort((a, b) => a.priority - b.priority);

    // Track vehicle assignments by date/time to avoid double booking
    const vehicleSchedule: Map<string, { start: number; end: number }[]> = new Map();

    for (const trip of tripsToAssign) {
      // Find available vehicle matching type
      const availableVehicles = vehicleStore.getAll().filter(v => {
        if (v.status !== 'Available') return false;

        // Check if vehicle type matches or is suitable
        const matchesType = v.type === trip.vehicleType ||
          (trip.vehicleType === 'Mercedes Sprinter' && (v.type === 'Luxury Bus' || v.type === 'Coach')) ||
          (trip.vehicleType === 'SUV' && v.type === 'Sedan');

        if (!matchesType) return false;

        // Check time conflicts for this date
        const scheduleKey = `${v.id}-${trip.date}`;
        const existingSchedule = vehicleSchedule.get(scheduleKey) || [];
        const [tripHours, tripMinutes] = trip.pickupTime.split(':').map(Number);
        const tripStart = tripHours * 60 + tripMinutes;
        const route = transportRouteStore.getById(trip.routeId);
        const tripEnd = tripStart + (route?.estimatedDuration || 60);

        // Check for overlaps
        for (const slot of existingSchedule) {
          if (!(tripEnd <= slot.start || tripStart >= slot.end)) {
            return false; // Overlap exists
          }
        }

        return true;
      });

      if (availableVehicles.length > 0) {
        const vehicle = availableVehicles[0];
        transportTripStore.assignVehicle(trip.id, vehicle.id);

        // Record this assignment in schedule
        const [tripHours, tripMinutes] = trip.pickupTime.split(':').map(Number);
        const tripStart = tripHours * 60 + tripMinutes;
        const route = transportRouteStore.getById(trip.routeId);
        const tripEnd = tripStart + (route?.estimatedDuration || 60);

        const scheduleKey = `${vehicle.id}-${trip.date}`;
        const existingSchedule = vehicleSchedule.get(scheduleKey) || [];
        existingSchedule.push({ start: tripStart, end: tripEnd });
        vehicleSchedule.set(scheduleKey, existingSchedule);

        assigned++;
      } else {
        failed++;
      }
    }

    return { assigned, failed };
  },

  // Batch notify all assigned trips
  batchNotify: (tripIds: string[]): number => {
    let notified = 0;
    for (const id of tripIds) {
      const trip = transportTripStore.getById(id);
      if (trip && trip.status === 'Assigned') {
        transportTripStore.notifyPassengers(id);
        notified++;
      }
    }
    return notified;
  },
};

// ============= TRANSPORT PLAN STORE =============

export const transportPlanStore = {
  getAll: (): EMSTransportPlan[] => getItem<EMSTransportPlan>(KEYS.TRANSPORT_PLANS),

  getById: (id: string): EMSTransportPlan | undefined => {
    return transportPlanStore.getAll().find(p => p.id === id);
  },

  create: (plan: Omit<EMSTransportPlan, 'id' | 'createdAt' | 'updatedAt'>): EMSTransportPlan => {
    const newPlan: EMSTransportPlan = {
      ...plan,
      id: generateId('plan'),
      createdAt: now(),
      updatedAt: now(),
    };
    const plans = transportPlanStore.getAll();
    plans.push(newPlan);
    setItem(KEYS.TRANSPORT_PLANS, plans);
    return newPlan;
  },

  update: (id: string, updates: Partial<EMSTransportPlan>): EMSTransportPlan | null => {
    const plans = transportPlanStore.getAll();
    const index = plans.findIndex(p => p.id === id);
    if (index === -1) return null;
    plans[index] = { ...plans[index], ...updates, updatedAt: now() };
    setItem(KEYS.TRANSPORT_PLANS, plans);
    return plans[index];
  },

  delete: (id: string): boolean => {
    const plans = transportPlanStore.getAll();
    const filtered = plans.filter(p => p.id !== id);
    if (filtered.length === plans.length) return false;
    setItem(KEYS.TRANSPORT_PLANS, filtered);
    return true;
  },

  // Generate groups for arrivals based on flight times, roles, and hotels
  generateArrivalGroups: (date: string): TransportGroup[] => {
    const eligible = transportTripStore.getEligibleParticipants();
    const arrivalParticipants = eligible.filter(({ eligibility }) =>
      eligibility.travelDetails?.arrivalDate === date
    );

    if (arrivalParticipants.length === 0) return [];

    // Group by: time window (1-hour blocks) + hotel + priority tier
    const groups: Map<string, TransportGroup> = new Map();

    for (const { participant, eligibility } of arrivalParticipants) {
      const arrivalTime = eligibility.travelDetails!.arrivalTime;
      const [hours] = arrivalTime.split(':').map(Number);

      // Round to 1-hour windows with 30-min buffer for customs
      const pickupHour = hours + 1; // 1 hour after arrival for customs/baggage
      const timeWindowStart = `${String(pickupHour).padStart(2, '0')}:00`;
      const timeWindowEnd = `${String(pickupHour + 1).padStart(2, '0')}:00`;

      const policy = getTransportPolicy(participant.role);
      const hotelId = eligibility.accommodationDetails?.hotelId || 'unknown';
      const hotelName = eligibility.accommodationDetails?.hotelName || 'Hotel';

      // VIPs get exclusive transport (by role), others get grouped by hotel
      const groupKey = policy.priority <= 2
        ? `${participant.role}-${timeWindowStart}-${hotelId}`
        : `shared-${timeWindowStart}-${hotelId}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          id: generateId('grp'),
          name: policy.priority <= 2
            ? `${participant.role} - ${timeWindowStart}`
            : `${hotelName} Shuttle - ${timeWindowStart}`,
          roles: [participant.role],
          hotelId,
          hotelName,
          timeWindow: { start: timeWindowStart, end: timeWindowEnd },
          vehicleType: policy.vehicleType,
          participantIds: [],
          priority: policy.priority,
        });
      }

      const group = groups.get(groupKey)!;
      group.participantIds.push(participant.id);
      if (!group.roles.includes(participant.role)) {
        group.roles.push(participant.role);
      }
    }

    return Array.from(groups.values()).sort((a, b) => a.priority - b.priority);
  },

  // Generate groups for departures based on flight times
  generateDepartureGroups: (date: string): TransportGroup[] => {
    const eligible = transportTripStore.getEligibleParticipants();
    const departureParticipants = eligible.filter(({ eligibility }) =>
      eligibility.travelDetails?.departureDate === date
    );

    if (departureParticipants.length === 0) return [];

    // Group by: time window + hotel + priority tier
    const groups: Map<string, TransportGroup> = new Map();

    for (const { participant, eligibility } of departureParticipants) {
      const departureTime = eligibility.travelDetails!.departureTime;
      const [hours] = departureTime.split(':').map(Number);

      // 3 hours before flight for airport drop-off
      const pickupHour = (hours - 3 + 24) % 24;
      const timeWindowStart = `${String(pickupHour).padStart(2, '0')}:00`;
      const timeWindowEnd = `${String(pickupHour + 1).padStart(2, '0')}:00`;

      const policy = getTransportPolicy(participant.role);
      const hotelId = eligibility.accommodationDetails?.hotelId || 'unknown';
      const hotelName = eligibility.accommodationDetails?.hotelName || 'Hotel';

      const groupKey = policy.priority <= 2
        ? `${participant.role}-${timeWindowStart}-${hotelId}`
        : `shared-${timeWindowStart}-${hotelId}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          id: generateId('grp'),
          name: policy.priority <= 2
            ? `${participant.role} Departure - ${timeWindowStart}`
            : `${hotelName} Airport Shuttle - ${timeWindowStart}`,
          roles: [participant.role],
          hotelId,
          hotelName,
          timeWindow: { start: timeWindowStart, end: timeWindowEnd },
          vehicleType: policy.vehicleType,
          participantIds: [],
          priority: policy.priority,
        });
      }

      const group = groups.get(groupKey)!;
      group.participantIds.push(participant.id);
      if (!group.roles.includes(participant.role)) {
        group.roles.push(participant.role);
      }
    }

    return Array.from(groups.values()).sort((a, b) => a.priority - b.priority);
  },

  // Execute full plan: generate groups → create trips → assign vehicles
  executePlan: (planId: string): BatchAssignmentResult => {
    const plan = transportPlanStore.getById(planId);
    if (!plan) {
      return { success: false, tripsCreated: 0, participantsAssigned: 0, groupsProcessed: 0, errors: ['Plan not found'] };
    }

    const type: TransportTripType = plan.type === 'Airport Arrivals' ? 'Airport Pickup' :
      plan.type === 'Airport Departures' ? 'Airport Dropoff' :
        'Hotel-Venue Shuttle';

    // Create trips from groups
    const { trips, errors } = transportTripStore.batchCreateFromGroups(plan.participantGroups, plan.date, type);

    // Assign vehicles
    const tripIds = trips.map(t => t.id);
    const { assigned, failed } = transportTripStore.batchAssignVehicles(tripIds);

    // Update plan
    transportPlanStore.update(planId, {
      status: 'Assigned',
      generatedTripIds: tripIds,
      totalTrips: trips.length,
      totalParticipants: plan.participantGroups.reduce((sum, g) => sum + g.participantIds.length, 0),
    });

    return {
      success: errors.length === 0 && failed === 0,
      tripsCreated: trips.length,
      participantsAssigned: plan.participantGroups.reduce((sum, g) => sum + g.participantIds.length, 0),
      groupsProcessed: plan.participantGroups.length,
      errors: [...errors, ...(failed > 0 ? [`${failed} trips could not be assigned vehicles`] : [])],
    };
  },

  // Publish plan: notify all participants
  publishPlan: (planId: string): number => {
    const plan = transportPlanStore.getById(planId);
    if (!plan) return 0;

    const notified = transportTripStore.batchNotify(plan.generatedTripIds);
    transportPlanStore.update(planId, { status: 'Published' });
    return notified;
  },
};

// ============= ACCREDITATION STORE =============

export const accreditationStore = {
  getProfiles: (): AccreditationProfile[] => getItem<AccreditationProfile>(KEYS.ACCRED_PROFILES),

  getBadges: (): BadgeRecord[] => getItem<BadgeRecord>(KEYS.ACCRED_BADGES),

  getProfileById: (id: string): AccreditationProfile | undefined => {
    return accreditationStore.getProfiles().find(p => p.id === id);
  },

  getBadgeById: (id: string): BadgeRecord | undefined => {
    return accreditationStore.getBadges().find(b => b.id === id);
  },

  getProfilesByParticipant: (participantId: string): AccreditationProfile[] => {
    return accreditationStore.getProfiles().filter(p => p.participantId === participantId);
  },

  getBadgesByProfile: (profileId: string): BadgeRecord[] => {
    return accreditationStore.getBadges().filter(b => b.profileId === profileId);
  },

  updateProfile: (id: string, updates: Partial<AccreditationProfile>): AccreditationProfile | null => {
    const profiles = accreditationStore.getProfiles();
    const index = profiles.findIndex(p => p.id === id);
    if (index === -1) return null;
    profiles[index] = { ...profiles[index], ...updates, updatedAt: now() };
    setItem(KEYS.ACCRED_PROFILES, profiles);
    return profiles[index];
  },

  updateBadge: (id: string, updates: Partial<BadgeRecord>): BadgeRecord | null => {
    const badges = accreditationStore.getBadges();
    const index = badges.findIndex(b => b.id === id);
    if (index === -1) return null;
    badges[index] = { ...badges[index], ...updates, updatedAt: now() };
    setItem(KEYS.ACCRED_BADGES, badges);
    return badges[index];
  },

  createBadge: (badge: BadgeRecord): void => {
    const badges = accreditationStore.getBadges();
    badges.push(badge);
    setItem(KEYS.ACCRED_BADGES, badges);
  },

  saveProfiles: (profiles: AccreditationProfile[]): void => {
    setItem(KEYS.ACCRED_PROFILES, profiles);
  },

  saveBadges: (badges: BadgeRecord[]): void => {
    setItem(KEYS.ACCRED_BADGES, badges);
  },

  // Sync logic moved from Accreditation.tsx
  syncFromRegistrations: (): { count: number, profiles: AccreditationProfile[] } => {
    const allRegistrations = registrationStore.getAll();
    const registrations = allRegistrations.filter(r => r.status === 'Approved');
    const existingProfiles = accreditationStore.getProfiles();
    const existingProfileRegIds = new Set(existingProfiles.map(p => p.registrationId));

    let newCount = 0;
    const newProfiles = [...existingProfiles];

    registrations.forEach((reg, index) => {
      if (existingProfileRegIds.has(reg.id)) {
        return;
      }

      const participant = participantStore.getById(reg.participantId);
      if (!participant) {
        return;
      }

      const categoryCode = roleToCategoryMap[participant.role] || 'FAN';
      const category = accreditationCategories.find(c => c.code === categoryCode);

      const photoDoc = reg.documents?.find((d: any) => d.type === 'Photo');
      const photoDocId = photoDoc?.fileData;

      const profile: AccreditationProfile = {
        id: `accred-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        participantId: participant.id,
        registrationId: reg.id,
        eventId: reg.eventId,
        categoryId: category?.id || 'cat-fan',
        status: 'Pending Review',
        profileData: {
          firstName: participant.firstName,
          lastName: participant.lastName,
          photo: photoDocId,
          passportNumber: participant.passportNumber,
          nationality: participant.nationality,
          organization: participant.organization,
          role: participant.role,
        },
        securityCheck: {
          required: ['VVIP', 'VIP', 'Media'].includes(participant.role),
          status: ['VVIP', 'VIP', 'Media'].includes(participant.role) ? 'Pending' : 'Not Required',
        },
        createdAt: now(),
        updatedAt: now(),
      };

      newProfiles.push(profile);
      newCount++;
    });

    if (newCount > 0) {
      setItem(KEYS.ACCRED_PROFILES, newProfiles);
    }

    return { count: newCount, profiles: newProfiles };
  },

  // Helper to create a badge for a profile
  createBadgeForProfile: (profile: AccreditationProfile): BadgeRecord | null => {
    const category = accreditationCategories.find(c => c.id === profile.categoryId);
    if (!category) return null;

    const newBadge: BadgeRecord = {
      id: `badge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      profileId: profile.id,
      participantId: profile.participantId,
      qrCode: generateQRCode(),
      badgeNumber: generateBadgeNumber(category.code),
      categoryId: profile.categoryId,
      zoneAccess: category.allowedZones,
      validFrom: now(),
      validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      productionStatus: 'Queued',
      distributionStatus: 'Not Distributed',
      isDigital: false,
      createdAt: now(),
      updatedAt: now(),
    };

    const badges = accreditationStore.getBadges();
    badges.push(newBadge);
    setItem(KEYS.ACCRED_BADGES, badges);

    return newBadge;
  }
};

