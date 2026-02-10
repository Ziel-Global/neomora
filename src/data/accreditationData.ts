// Accreditation Module Data Types and Mock Data

export type AccreditationCategoryCode = 'ATH' | 'OFF' | 'VIP' | 'VVIP' | 'MED' | 'WRK' | 'CON' | 'FAN';

export type AccreditationProfileStatus = 
  | 'Pending Review'    // Awaiting accreditation team review
  | 'Under Review'      // Currently being reviewed
  | 'Security Check'    // Undergoing security verification
  | 'Approved'          // Approved for badge production
  | 'Rejected'          // Rejected, not eligible
  | 'On Hold';          // Temporarily held

export type BadgeProductionStatus = 
  | 'Not Ready'         // Profile not yet approved
  | 'Queued'            // In production queue
  | 'Printing'          // Currently being printed
  | 'Printed'           // Badge printed
  | 'Quality Check'     // Quality verification
  | 'Ready';            // Ready for distribution

export type BadgeDistributionStatus =
  | 'Not Distributed'   // Badge not yet distributed
  | 'Assigned'          // Assigned to collection point
  | 'Collected'         // Participant collected badge
  | 'Activated';        // Badge activated in access system

export interface AccreditationCategory {
  id: string;
  code: AccreditationCategoryCode;
  name: string;
  description: string;
  color: string;
  textColor: string;
  allowedZones: string[];
  priority: number; // Higher = more access
}

export interface AccessZoneDefinition {
  id: string;
  code: string;
  name: string;
  venue: string;
  description: string;
  isRestricted: boolean;
  maxCapacity: number;
}

export interface AccreditationProfile {
  id: string;
  participantId: string;
  registrationId: string;
  eventId: string;
  categoryId: string;
  status: AccreditationProfileStatus;
  profileData: {
    firstName: string;
    lastName: string;
    photo?: string;
    passportNumber?: string;
    nationality: string;
    organization: string;
    role: string;
  };
  securityCheck: {
    required: boolean;
    status: 'Pending' | 'Passed' | 'Failed' | 'Not Required';
    checkedAt?: string;
    checkedBy?: string;
    notes?: string;
  };
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BadgeRecord {
  id: string;
  profileId: string;
  participantId: string;
  qrCode: string;
  badgeNumber: string;
  categoryId: string;
  zoneAccess: string[];
  validFrom: string;
  validTo: string;
  productionStatus: BadgeProductionStatus;
  distributionStatus: BadgeDistributionStatus;
  collectionPoint?: string;
  printedAt?: string;
  printedBy?: string;
  collectedAt?: string;
  activatedAt?: string;
  isDigital: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionPoint {
  id: string;
  name: string;
  venue: string;
  location: string;
  operatingHours: string;
  isActive: boolean;
}

// Accreditation Categories
export const accreditationCategories: AccreditationCategory[] = [
  {
    id: 'cat-vvip',
    code: 'VVIP',
    name: 'VVIP',
    description: 'Very Very Important Persons - Full unrestricted access',
    color: '#7c3aed',
    textColor: '#ffffff',
    allowedZones: ['all'],
    priority: 100,
  },
  {
    id: 'cat-vip',
    code: 'VIP',
    name: 'VIP',
    description: 'Very Important Persons - VIP areas and competition zones',
    color: '#1e3a5f',
    textColor: '#ffffff',
    allowedZones: ['vip-lounge', 'main-arena', 'press-room', 'hospitality'],
    priority: 80,
  },
  {
    id: 'cat-ath',
    code: 'ATH',
    name: 'Athlete',
    description: 'Competition athletes and team members',
    color: '#16a34a',
    textColor: '#ffffff',
    allowedZones: ['athletes-village', 'competition-zone', 'warm-up', 'medical', 'main-arena'],
    priority: 70,
  },
  {
    id: 'cat-off',
    code: 'OFF',
    name: 'Official',
    description: 'Technical officials, referees, and judges',
    color: '#0891b2',
    textColor: '#ffffff',
    allowedZones: ['competition-zone', 'officials-room', 'main-arena', 'technical-area'],
    priority: 60,
  },
  {
    id: 'cat-med',
    code: 'MED',
    name: 'Media',
    description: 'Press, broadcasters, and media personnel',
    color: '#ea580c',
    textColor: '#ffffff',
    allowedZones: ['media-center', 'press-room', 'mixed-zone', 'main-arena-media'],
    priority: 50,
  },
  {
    id: 'cat-wrk',
    code: 'WRK',
    name: 'Workforce',
    description: 'Event staff and volunteers',
    color: '#6366f1',
    textColor: '#ffffff',
    allowedZones: ['staff-areas', 'back-of-house', 'assigned-zone'],
    priority: 30,
  },
  {
    id: 'cat-con',
    code: 'CON',
    name: 'Contractor',
    description: 'External contractors and service providers',
    color: '#64748b',
    textColor: '#ffffff',
    allowedZones: ['back-of-house', 'service-areas'],
    priority: 20,
  },
  {
    id: 'cat-fan',
    code: 'FAN',
    name: 'Spectator',
    description: 'General public and spectators',
    color: '#94a3b8',
    textColor: '#000000',
    allowedZones: ['public-areas', 'spectator-stands'],
    priority: 10,
  },
];

// Access Zones
export const accessZoneDefinitions: AccessZoneDefinition[] = [
  { id: 'zone-all', code: 'ALL', name: 'All Access', venue: 'All Venues', description: 'Unrestricted access to all areas', isRestricted: true, maxCapacity: 50 },
  { id: 'zone-vip', code: 'VIP', name: 'VIP Lounge', venue: 'Dubai Sports City Arena', description: 'VIP hospitality and lounge areas', isRestricted: true, maxCapacity: 500 },
  { id: 'zone-comp', code: 'COMP', name: 'Competition Zone', venue: 'Dubai Sports City Arena', description: 'Field of play and technical areas', isRestricted: true, maxCapacity: 200 },
  { id: 'zone-ath', code: 'ATH', name: 'Athletes Village', venue: 'Palm Jumeirah Stadium', description: 'Athlete accommodation and training', isRestricted: true, maxCapacity: 1000 },
  { id: 'zone-media', code: 'MED', name: 'Media Center', venue: 'Dubai Sports City Arena', description: 'Press workroom and broadcast areas', isRestricted: true, maxCapacity: 300 },
  { id: 'zone-mixed', code: 'MIX', name: 'Mixed Zone', venue: 'Dubai Sports City Arena', description: 'Post-event interview area', isRestricted: true, maxCapacity: 100 },
  { id: 'zone-boh', code: 'BOH', name: 'Back of House', venue: 'All Venues', description: 'Staff and service areas', isRestricted: false, maxCapacity: 500 },
  { id: 'zone-public', code: 'PUB', name: 'Public Areas', venue: 'All Venues', description: 'General access spectator areas', isRestricted: false, maxCapacity: 50000 },
];

// Collection Points
export const collectionPoints: CollectionPoint[] = [
  { id: 'cp-main', name: 'Main Accreditation Center', venue: 'Dubai Sports City Arena', location: 'Gate A - Ground Floor', operatingHours: '08:00 - 20:00', isActive: true },
  { id: 'cp-hotel', name: 'Hotel Desk - Atlantis', venue: 'Atlantis The Palm', location: 'Lobby Concierge', operatingHours: '09:00 - 18:00', isActive: true },
  { id: 'cp-airport', name: 'Airport Welcome Desk', venue: 'Dubai International Airport', location: 'Terminal 3 - Arrivals', operatingHours: '24 Hours', isActive: true },
  { id: 'cp-media', name: 'Media Center Desk', venue: 'Dubai Sports City Arena', location: 'Media Center Entrance', operatingHours: '07:00 - 22:00', isActive: true },
];

// Role to Category mapping
export const roleToCategoryMap: Record<string, AccreditationCategoryCode> = {
  'VVIP': 'VVIP',
  'VIP': 'VIP',
  'Athlete': 'ATH',
  'Official': 'OFF',
  'Judge': 'OFF',
  'Media': 'MED',
  'Fan': 'FAN',
};

// Generate QR Code (mock)
export const generateQRCode = (): string => {
  return `QR-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
};

// Generate Badge Number
export const generateBadgeNumber = (categoryCode: string): string => {
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${categoryCode}-${num}`;
};
