// Additional mock data for expanded modules

export type TransportStatus = 'Planned' | 'Assigned' | 'Notified' | 'Completed';
export type NotificationStatus = 'Unread' | 'Read';
export type EquipmentStatus = 'Declared' | 'In Transit' | 'Cleared' | 'Stored' | 'Deployed' | 'Returned' | 'Customs Hold' | 'Damaged' | 'Lost';

export interface TransportRoute {
  id: string;
  name: string;
  from: string;
  to: string;
  type: 'Airport Pickup' | 'Hotel Transfer' | 'Venue Shuttle' | 'Airport Dropoff';
  estimatedDuration: string;
}

export interface TransportManifest {
  id: string;
  routeId: string;
  date: string;
  time: string;
  vehicleType: string;
  vehicleId: string;
  driverName: string;
  driverPhone: string;
  participantIds: string[];
  status: TransportStatus;
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  createdAt: string;
  status: NotificationStatus;
  link?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  timestamp: string;
  ipAddress: string;
}

export interface Equipment {
  id: string;
  name: string;
  serialNumber: string;
  ownerId: string;
  ownerName: string;
  category: string;
  customsStatus: EquipmentStatus;
  carnetNumber: string | null;
  declaredValue: number;
  timeline: { status: EquipmentStatus; date: string; notes: string }[];
}

export interface VenueZone {
  id: string;
  name: string;
  venue: string;
  maxCapacity: number;
  warningThreshold: number;
  criticalThreshold: number;
  currentOccupancy: number;
}

export interface AccessZone {
  id: string;
  code: 'A' | 'B' | 'C';
  name: string;
  description: string;
  allowedRoles: string[];
  areas: string[];
}

export interface BadgeTemplate {
  id: string;
  name: string;
  zoneId: 'A' | 'B' | 'C';
  backgroundColor: string;
  textColor: string;
  fields: string[];
}

export interface VisaRequirement {
  id: string;
  country: string;
  visaRequired: boolean;
  requiredDocs: string[];
  processingDays: number;
  notes: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  type: 'invitation' | 'reminder' | 'confirmation' | 'update';
  subject: string;
  body: string;
  variables: string[];
}

// Transport Routes
export const transportRoutes: TransportRoute[] = [
  { id: 'tr-001', name: 'DXB Airport to Atlantis', from: 'Dubai International Airport', to: 'Atlantis The Palm', type: 'Airport Pickup', estimatedDuration: '45 min' },
  { id: 'tr-002', name: 'DXB Airport to Jumeirah Beach', from: 'Dubai International Airport', to: 'Jumeirah Beach Hotel', type: 'Airport Pickup', estimatedDuration: '35 min' },
  { id: 'tr-003', name: 'Atlantis to Sports City Arena', from: 'Atlantis The Palm', to: 'Dubai Sports City Arena', type: 'Venue Shuttle', estimatedDuration: '30 min' },
  { id: 'tr-004', name: 'Jumeirah to Sports City Arena', from: 'Jumeirah Beach Hotel', to: 'Dubai Sports City Arena', type: 'Venue Shuttle', estimatedDuration: '25 min' },
  { id: 'tr-005', name: 'Atlantis to DXB Airport', from: 'Atlantis The Palm', to: 'Dubai International Airport', type: 'Airport Dropoff', estimatedDuration: '45 min' },
];

// Transport Manifests
export const transportManifests: TransportManifest[] = [
  { id: 'tm-001', routeId: 'tr-001', date: '2024-08-14', time: '23:30', vehicleType: 'Luxury Bus', vehicleId: 'VH-101', driverName: 'Ahmed Mohammed', driverPhone: '+971 50 111 2222', participantIds: ['p-001', 'p-003', 'p-005'], status: 'Completed' },
  { id: 'tm-002', routeId: 'tr-002', date: '2024-08-14', time: '20:00', vehicleType: 'Mercedes Sprinter', vehicleId: 'VH-102', driverName: 'Rashid Ali', driverPhone: '+971 50 333 4444', participantIds: ['p-004'], status: 'Completed' },
  { id: 'tm-003', routeId: 'tr-003', date: '2024-08-15', time: '08:00', vehicleType: 'Luxury Bus', vehicleId: 'VH-101', driverName: 'Ahmed Mohammed', driverPhone: '+971 50 111 2222', participantIds: ['p-001', 'p-002', 'p-003', 'p-005', 'p-007'], status: 'Notified' },
  { id: 'tm-004', routeId: 'tr-004', date: '2024-08-15', time: '08:15', vehicleType: 'Mercedes Sprinter', vehicleId: 'VH-103', driverName: 'Khalid Hassan', driverPhone: '+971 50 555 6666', participantIds: ['p-004', 'p-006', 'p-008'], status: 'Assigned' },
  { id: 'tm-005', routeId: 'tr-005', date: '2024-08-26', time: '06:00', vehicleType: 'Luxury Bus', vehicleId: 'VH-101', driverName: 'Ahmed Mohammed', driverPhone: '+971 50 111 2222', participantIds: ['p-001', 'p-003', 'p-005', 'p-007'], status: 'Planned' },
];

// Notifications
export const notifications: Notification[] = [
  { id: 'n-001', type: 'warning', title: 'Visa SLA Breach', message: 'Visa case for Raj Patel is approaching deadline', createdAt: '2024-02-28T14:30:00', status: 'Unread', link: '/admin/visas' },
  { id: 'n-002', type: 'error', title: 'Document Rejected', message: 'Photo upload for Hans Mueller was rejected', createdAt: '2024-02-28T12:15:00', status: 'Unread', link: '/admin/participants/p-006' },
  { id: 'n-003', type: 'success', title: 'Travel Ticketed', message: 'Flight tickets issued for Sarah Mitchell', createdAt: '2024-02-28T10:00:00', status: 'Read', link: '/admin/travel' },
  { id: 'n-004', type: 'info', title: 'New Registration', message: 'Sophie Martin submitted registration', createdAt: '2024-02-27T16:45:00', status: 'Read' },
  { id: 'n-005', type: 'warning', title: 'Capacity Warning', message: 'Zone A approaching 80% capacity', createdAt: '2024-02-27T14:20:00', status: 'Read', link: '/admin/crowd' },
  { id: 'n-006', type: 'info', title: 'Badge Ready', message: '8 new badges are ready for printing', createdAt: '2024-02-27T11:00:00', status: 'Read', link: '/admin/accreditation' },
  { id: 'n-007', type: 'success', title: 'Campaign Completed', message: 'VIP Exclusive Invite campaign completed', createdAt: '2024-02-26T18:00:00', status: 'Read' },
  { id: 'n-008', type: 'error', title: 'Equipment Hold', message: 'Camera equipment held at customs', createdAt: '2024-02-26T09:30:00', status: 'Unread', link: '/admin/equipment' },
];

// Audit Logs
export const auditLogs: AuditLog[] = [
  { id: 'al-001', userId: 'admin-001', userName: 'Admin User', action: 'UPDATE', entity: 'Registration', entityId: 'REG-2024-001', details: 'Status changed from Under Review to Approved', timestamp: '2024-02-28T15:45:00', ipAddress: '192.168.1.100' },
  { id: 'al-002', userId: 'admin-001', userName: 'Admin User', action: 'CREATE', entity: 'Campaign', entityId: 'c-004', details: 'Created Follow-up Reminder campaign', timestamp: '2024-02-28T14:30:00', ipAddress: '192.168.1.100' },
  { id: 'al-003', userId: 'subadmin-001', userName: 'Operations Staff', action: 'UPDATE', entity: 'Document', entityId: 'd-011', details: 'Document verification status set to Rejected', timestamp: '2024-02-28T12:15:00', ipAddress: '192.168.1.101' },
  { id: 'al-004', userId: 'admin-001', userName: 'Admin User', action: 'UPDATE', entity: 'TravelBooking', entityId: 't-001', details: 'Status changed from Approved to Ticketed', timestamp: '2024-02-28T10:00:00', ipAddress: '192.168.1.100' },
  { id: 'al-005', userId: 'subadmin-002', userName: 'Badge Operator', action: 'UPDATE', entity: 'Badge', entityId: 'b-001', details: 'Badge status changed to Printed', timestamp: '2024-02-27T16:00:00', ipAddress: '192.168.1.102' },
  { id: 'al-006', userId: 'admin-001', userName: 'Admin User', action: 'DELETE', entity: 'Participant', entityId: 'p-099', details: 'Participant record deleted', timestamp: '2024-02-27T14:00:00', ipAddress: '192.168.1.100' },
  { id: 'al-007', userId: 'subadmin-001', userName: 'Operations Staff', action: 'CREATE', entity: 'Accommodation', entityId: 'a-012', details: 'Room allocation created for Michael Brown', timestamp: '2024-02-27T11:30:00', ipAddress: '192.168.1.101' },
  { id: 'al-008', userId: 'admin-001', userName: 'Admin User', action: 'UPDATE', entity: 'Event', entityId: 'evt-001', details: 'Event status changed from Draft to Published', timestamp: '2024-02-26T09:00:00', ipAddress: '192.168.1.100' },
];

// Equipment
export const equipment: Equipment[] = [
  { id: 'eq-001', name: 'Professional Camera Kit', serialNumber: 'CAM-2024-001', ownerId: 'p-004', ownerName: 'James Thompson', category: 'Broadcasting', customsStatus: 'Deployed', carnetNumber: 'ATA-UK-12345', declaredValue: 45000, timeline: [
    { status: 'Declared', date: '2024-07-15', notes: 'Equipment declared for entry' },
    { status: 'In Transit', date: '2024-07-20', notes: 'Shipped via DHL' },
    { status: 'Cleared', date: '2024-08-01', notes: 'Customs clearance complete' },
    { status: 'Stored', date: '2024-08-02', notes: 'Equipment in venue storage' },
    { status: 'Deployed', date: '2024-08-14', notes: 'Distributed to owner' },
  ]},
  { id: 'eq-002', name: 'Sports Equipment - Javelin Set', serialNumber: 'ATH-2024-001', ownerId: 'p-001', ownerName: 'Sarah Mitchell', category: 'Athletics', customsStatus: 'Deployed', carnetNumber: null, declaredValue: 2500, timeline: [
    { status: 'Declared', date: '2024-07-20', notes: 'Equipment declared' },
    { status: 'Cleared', date: '2024-08-10', notes: 'No carnet required' },
    { status: 'Deployed', date: '2024-08-14', notes: 'With athlete' },
  ]},
  { id: 'eq-003', name: 'Audio Recording Equipment', serialNumber: 'AUD-2024-001', ownerId: 'p-008', ownerName: 'Carlos Rodriguez', category: 'Broadcasting', customsStatus: 'Customs Hold', carnetNumber: 'ATA-US-67890', declaredValue: 15000, timeline: [
    { status: 'Declared', date: '2024-07-25', notes: 'Equipment declared' },
    { status: 'In Transit', date: '2024-08-01', notes: 'Shipped via FedEx' },
    { status: 'Customs Hold', date: '2024-08-05', notes: 'Additional documentation required' },
  ]},
  { id: 'eq-004', name: 'Medical Kit', serialNumber: 'MED-2024-001', ownerId: 'p-003', ownerName: 'Priya Sharma', category: 'Medical', customsStatus: 'Stored', carnetNumber: null, declaredValue: 5000, timeline: [
    { status: 'Declared', date: '2024-07-22', notes: 'Medical supplies declared' },
    { status: 'Cleared', date: '2024-08-08', notes: 'Cleared with medical permit' },
    { status: 'Stored', date: '2024-08-10', notes: 'In venue medical center' },
  ]},
];

// Venue Zones for crowd management
export const venueZones: VenueZone[] = [
  { id: 'vz-001', name: 'Main Arena Floor', venue: 'Dubai Sports City Arena', maxCapacity: 5000, warningThreshold: 4000, criticalThreshold: 4500, currentOccupancy: 3850 },
  { id: 'vz-002', name: 'East Stand', venue: 'Dubai Sports City Arena', maxCapacity: 8000, warningThreshold: 6400, criticalThreshold: 7200, currentOccupancy: 7100 },
  { id: 'vz-003', name: 'West Stand', venue: 'Dubai Sports City Arena', maxCapacity: 8000, warningThreshold: 6400, criticalThreshold: 7200, currentOccupancy: 5200 },
  { id: 'vz-004', name: 'VIP Lounge', venue: 'Dubai Sports City Arena', maxCapacity: 500, warningThreshold: 400, criticalThreshold: 450, currentOccupancy: 420 },
  { id: 'vz-005', name: 'Media Center', venue: 'Dubai Sports City Arena', maxCapacity: 300, warningThreshold: 240, criticalThreshold: 270, currentOccupancy: 180 },
  { id: 'vz-006', name: 'Athletes Village', venue: 'Palm Jumeirah Stadium', maxCapacity: 1000, warningThreshold: 800, criticalThreshold: 900, currentOccupancy: 650 },
];

// Access Zones for accreditation
export const accessZones: AccessZone[] = [
  { id: 'az-A', code: 'A', name: 'All Access', description: 'Full access to all areas including restricted zones', allowedRoles: ['VVIP', 'VIP'], areas: ['Main Arena', 'VIP Lounge', 'Media Center', 'Athletes Zone', 'Backstage', 'Press Room'] },
  { id: 'az-B', code: 'B', name: 'Competition Zone', description: 'Access to competition and designated areas', allowedRoles: ['Athlete', 'Official', 'Judge', 'Media'], areas: ['Main Arena', 'Athletes Zone', 'Press Room', 'Media Center'] },
  { id: 'az-C', code: 'C', name: 'General Access', description: 'Access to public areas only', allowedRoles: ['Fan'], areas: ['Main Arena (Spectator)', 'Public Concourse'] },
];

// Badge Templates
export const badgeTemplates: BadgeTemplate[] = [
  { id: 'bt-001', name: 'All Access Badge', zoneId: 'A', backgroundColor: '#1e3a5f', textColor: '#ffffff', fields: ['Name', 'Organization', 'Role', 'QR Code'] },
  { id: 'bt-002', name: 'Competition Badge', zoneId: 'B', backgroundColor: '#16a34a', textColor: '#ffffff', fields: ['Name', 'Organization', 'Role', 'Country', 'QR Code'] },
  { id: 'bt-003', name: 'General Badge', zoneId: 'C', backgroundColor: '#6b7280', textColor: '#ffffff', fields: ['Name', 'QR Code'] },
];

// Visa Requirements by country
export const visaRequirements: VisaRequirement[] = [
  { id: 'vr-001', country: 'USA', visaRequired: false, requiredDocs: ['Passport'], processingDays: 0, notes: 'Visa on arrival available' },
  { id: 'vr-002', country: 'UK', visaRequired: false, requiredDocs: ['Passport'], processingDays: 0, notes: 'Visa on arrival available' },
  { id: 'vr-003', country: 'UAE', visaRequired: false, requiredDocs: ['Emirates ID'], processingDays: 0, notes: 'Domestic' },
  { id: 'vr-004', country: 'India', visaRequired: true, requiredDocs: ['Passport', 'Photo', 'Invitation Letter', 'Bank Statement'], processingDays: 14, notes: 'Apply via VFS Global' },
  { id: 'vr-005', country: 'Pakistan', visaRequired: true, requiredDocs: ['Passport', 'Photo', 'Invitation Letter', 'Bank Statement', 'Employment Letter'], processingDays: 21, notes: 'Additional security clearance required' },
  { id: 'vr-006', country: 'Japan', visaRequired: true, requiredDocs: ['Passport', 'Photo', 'Invitation Letter'], processingDays: 7, notes: 'Fast-track processing available' },
  { id: 'vr-007', country: 'Germany', visaRequired: false, requiredDocs: ['Passport', 'Photo'], processingDays: 0, notes: 'Pre-registration recommended' },
];

// Email Templates
export const emailTemplates: EmailTemplate[] = [
  { id: 'et-001', name: 'Event Invitation', type: 'invitation', subject: 'You\'re Invited: {{eventName}}', body: 'Dear {{firstName}},\n\nWe are pleased to invite you to {{eventName}} taking place in {{eventCity}} from {{startDate}} to {{endDate}}.\n\nPlease RSVP using the link below:\n{{rsvpLink}}\n\nBest regards,\nEvent Team', variables: ['firstName', 'eventName', 'eventCity', 'startDate', 'endDate', 'rsvpLink'] },
  { id: 'et-002', name: 'RSVP Reminder', type: 'reminder', subject: 'Reminder: Please RSVP for {{eventName}}', body: 'Dear {{firstName}},\n\nThis is a friendly reminder to RSVP for {{eventName}}.\n\nThe deadline for response is {{deadline}}.\n\n{{rsvpLink}}\n\nBest regards,\nEvent Team', variables: ['firstName', 'eventName', 'deadline', 'rsvpLink'] },
  { id: 'et-003', name: 'Registration Confirmation', type: 'confirmation', subject: 'Registration Confirmed: {{eventName}}', body: 'Dear {{firstName}},\n\nYour registration for {{eventName}} has been confirmed.\n\nYour Registration ID: {{registrationId}}\n\nNext steps:\n1. Complete document upload\n2. Await visa processing (if applicable)\n3. Confirm travel arrangements\n\nBest regards,\nEvent Team', variables: ['firstName', 'eventName', 'registrationId'] },
  { id: 'et-004', name: 'Travel Details', type: 'update', subject: 'Your Travel Itinerary for {{eventName}}', body: 'Dear {{firstName}},\n\nYour travel arrangements have been confirmed:\n\nFlight: {{flightDetails}}\nPNR: {{pnr}}\n\nPickup: {{pickupDetails}}\nHotel: {{hotelName}}\n\nBest regards,\nEvent Team', variables: ['firstName', 'eventName', 'flightDetails', 'pnr', 'pickupDetails', 'hotelName'] },
];

// Helper to get stats for each module
export const getModuleStats = () => ({
  transport: {
    planned: transportManifests.filter(m => m.status === 'Planned').length,
    assigned: transportManifests.filter(m => m.status === 'Assigned').length,
    notified: transportManifests.filter(m => m.status === 'Notified').length,
    completed: transportManifests.filter(m => m.status === 'Completed').length,
  },
  notifications: {
    unread: notifications.filter(n => n.status === 'Unread').length,
    total: notifications.length,
  },
  equipment: {
    deployed: equipment.filter(e => e.customsStatus === 'Deployed').length,
    inTransit: equipment.filter(e => e.customsStatus === 'In Transit').length,
    hold: equipment.filter(e => e.customsStatus === 'Customs Hold').length,
    total: equipment.length,
  },
  crowd: {
    warning: venueZones.filter(z => z.currentOccupancy >= z.warningThreshold && z.currentOccupancy < z.criticalThreshold).length,
    critical: venueZones.filter(z => z.currentOccupancy >= z.criticalThreshold).length,
    normal: venueZones.filter(z => z.currentOccupancy < z.warningThreshold).length,
  },
});
