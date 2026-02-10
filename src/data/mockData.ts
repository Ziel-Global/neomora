// Types
export type UserRole = 'guest' | 'subadmin' | 'admin';
export type ParticipantRole = 'VVIP' | 'VIP' | 'Athlete' | 'Official' | 'Judge' | 'Media' | 'Fan';
export type RSVPStatus = 'Invited' | 'Yes' | 'No' | 'Maybe';
export type RegistrationStatus = 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Update Requested';
export type DocumentType = 'Passport' | 'Photo' | 'ID' | 'Visa Form' | 'Consent';
export type DocumentStatus = 'Pending' | 'Verified' | 'Rejected';
export type TravelStatus = 'Not Required' | 'Requested' | 'Proposed' | 'Approved' | 'Ticketed' | 'Changed';
export type AccommodationStatus = 'Pending' | 'Allocated' | 'Confirmed' | 'Checked-In';
export type VisaStatus = 'Not Required' | 'Docs Pending' | 'Ready' | 'Submitted' | 'Approved' | 'Rejected';
export type BadgeStatus = 'Pending' | 'Ready' | 'Printed' | 'Collected' | 'Revoked';
export type EventStatus = 'Draft' | 'Published' | 'Ongoing' | 'Closed';

export interface Event {
  id: string;
  name: string;
  theme: string;
  startDate: string;
  endDate: string;
  city: string;
  venues: string[];
  status: EventStatus;
  participantCount: number;
}

export interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string;
  passportNumber: string;
  organization: string;
  jobTitle?: string;
  role: ParticipantRole;
  dietaryNotes: string;
  accessibilityNeeds: string;
  registrationDate: string;
  avatar?: string;
}

export interface RSVP {
  participantId: string;
  eventId: string;
  status: RSVPStatus;
  respondedAt: string | null;
  guestCount: number;
  notes: string;
}

export interface Registration {
  participantId: string;
  eventId: string;
  registrationId: string;
  status: RegistrationStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

export interface Document {
  id: string;
  participantId: string;
  type: DocumentType;
  fileName: string;
  uploadedAt: string;
  verificationStatus: DocumentStatus;
  notes: string;
}

export interface TravelBooking {
  id: string;
  participantId: string;
  originCity: string;
  preferredDates: string;
  status: TravelStatus;
  pnr: string | null;
  airline: string | null;
  itinerary: { from: string; to: string; flightNumber: string; departAt: string; arriveAt: string }[];
}

export interface Accommodation {
  id: string;
  participantId: string;
  hotelId: string;
  hotelName: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  status: AccommodationStatus;
  roommates: string[];
}

export interface VisaCase {
  id: string;
  participantId: string;
  nationality: string;
  requiredDocs: string[];
  status: VisaStatus;
  submissionBatch: string | null;
  slaDueDate: string | null;
}

export interface Badge {
  id: string;
  participantId: string;
  zoneId: 'A' | 'B' | 'C';
  qrCode: string;
  status: BadgeStatus;
  printedAt: string | null;
  collectedAt: string | null;
}

export interface Hotel {
  id: string;
  name: string;
  city: string;
  roomTypes: string[];
  capacity: number;
  contact: string;
}

export interface Campaign {
  id: string;
  name: string;
  eventId: string;
  audienceSize: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  rsvpYes: number;
  rsvpNo: number;
  rsvpMaybe: number;
  createdAt: string;
  status: 'Draft' | 'Scheduled' | 'Sent' | 'Completed';
}

// Mock Events
export const events: Event[] = [
  {
    id: 'evt-001',
    name: 'Global Sports Championship 2024',
    theme: 'Excellence in Motion',
    startDate: '2024-08-15',
    endDate: '2024-08-25',
    city: 'Dubai, UAE',
    venues: ['Dubai Sports City Arena', 'Palm Jumeirah Stadium', 'Dubai Marina Convention Center'],
    status: 'Published',
    participantCount: 2847,
  },
  {
    id: 'evt-002',
    name: 'International Tech Summit',
    theme: 'Innovate Tomorrow',
    startDate: '2024-09-10',
    endDate: '2024-09-12',
    city: 'Singapore',
    venues: ['Marina Bay Sands Expo', 'Sands Theatre'],
    status: 'Draft',
    participantCount: 0,
  },
];

// Mock Participants (15 with varied data)
export const participants: Participant[] = [
  {
    id: 'p-001',
    firstName: 'Sarah',
    lastName: 'Mitchell',
    email: 'sarah.mitchell@olympics.org',
    phone: '+1 (555) 123-4567',
    nationality: 'USA',
    passportNumber: 'US123456789',
    organization: 'US Olympic Committee',
    jobTitle: 'Professional Athlete',
    role: 'Athlete',
    dietaryNotes: 'Vegetarian',
    accessibilityNeeds: '',
    registrationDate: '2024-01-15',
  },
  {
    id: 'p-002',
    firstName: 'Mohammed',
    lastName: 'Al-Rashid',
    email: 'm.alrashid@uae.gov',
    phone: '+971 50 123 4567',
    nationality: 'UAE',
    passportNumber: 'AE987654321',
    organization: 'UAE Sports Council',
    jobTitle: 'Director General',
    role: 'VVIP',
    dietaryNotes: 'Halal',
    accessibilityNeeds: '',
    registrationDate: '2024-01-10',
  },
  {
    id: 'p-003',
    firstName: 'Priya',
    lastName: 'Sharma',
    email: 'priya.sharma@indiansports.in',
    phone: '+91 98765 43210',
    nationality: 'India',
    passportNumber: 'IN456789123',
    organization: 'Indian Athletics Federation',
    jobTitle: 'Technical Official',
    role: 'Official',
    dietaryNotes: 'Vegetarian, No onion/garlic',
    accessibilityNeeds: '',
    registrationDate: '2024-01-20',
  },
  {
    id: 'p-004',
    firstName: 'James',
    lastName: 'Thompson',
    email: 'j.thompson@bbc.co.uk',
    phone: '+44 20 7946 0958',
    nationality: 'UK',
    passportNumber: 'UK789123456',
    organization: 'BBC Sports',
    jobTitle: 'Sports Correspondent',
    role: 'Media',
    dietaryNotes: '',
    accessibilityNeeds: '',
    registrationDate: '2024-01-25',
  },
  {
    id: 'p-005',
    firstName: 'Yuki',
    lastName: 'Tanaka',
    email: 'y.tanaka@joc.jp',
    phone: '+81 3 1234 5678',
    nationality: 'Japan',
    passportNumber: 'JP321654987',
    organization: 'Japanese Olympic Committee',
    jobTitle: 'International Judge',
    role: 'Judge',
    dietaryNotes: '',
    accessibilityNeeds: '',
    registrationDate: '2024-02-01',
  },
  {
    id: 'p-006',
    firstName: 'Hans',
    lastName: 'Mueller',
    email: 'h.mueller@dosb.de',
    phone: '+49 69 1234 5678',
    nationality: 'Germany',
    passportNumber: 'DE654987321',
    organization: 'German Olympic Sports Confederation',
    jobTitle: 'Vice President',
    role: 'VIP',
    dietaryNotes: '',
    accessibilityNeeds: 'Wheelchair accessible',
    registrationDate: '2024-02-05',
  },
  {
    id: 'p-007',
    firstName: 'Fatima',
    lastName: 'Khan',
    email: 'f.khan@pcb.pk',
    phone: '+92 300 123 4567',
    nationality: 'Pakistan',
    passportNumber: 'PK147258369',
    organization: 'Pakistan Sports Board',
    jobTitle: 'National Team Member',
    role: 'Athlete',
    dietaryNotes: 'Halal',
    accessibilityNeeds: '',
    registrationDate: '2024-02-08',
  },
  {
    id: 'p-008',
    firstName: 'Carlos',
    lastName: 'Rodriguez',
    email: 'c.rodriguez@espn.com',
    phone: '+1 (305) 555-7890',
    nationality: 'USA',
    passportNumber: 'US987654321',
    organization: 'ESPN',
    jobTitle: 'Senior Reporter',
    role: 'Media',
    dietaryNotes: '',
    accessibilityNeeds: '',
    registrationDate: '2024-02-10',
  },
  {
    id: 'p-009',
    firstName: 'Emma',
    lastName: 'Wilson',
    email: 'e.wilson@olympics.org',
    phone: '+44 161 555 1234',
    nationality: 'UK',
    passportNumber: 'UK456123789',
    organization: 'International Olympic Committee',
    jobTitle: 'Coordination Officer',
    role: 'Official',
    dietaryNotes: 'Gluten-free',
    accessibilityNeeds: '',
    registrationDate: '2024-02-12',
  },
  {
    id: 'p-010',
    firstName: 'Ahmed',
    lastName: 'Hassan',
    email: 'a.hassan@egyptsports.eg',
    phone: '+20 100 123 4567',
    nationality: 'UAE',
    passportNumber: 'AE369258147',
    organization: 'Egypt Sports Federation',
    jobTitle: 'Professional Athlete',
    role: 'Athlete',
    dietaryNotes: 'Halal',
    accessibilityNeeds: '',
    registrationDate: '2024-02-15',
  },
  {
    id: 'p-011',
    firstName: 'Lisa',
    lastName: 'Chen',
    email: 'l.chen@cctv.cn',
    phone: '+86 138 1234 5678',
    nationality: 'Japan',
    passportNumber: 'JP951753842',
    organization: 'CCTV Sports',
    jobTitle: 'Broadcast Journalist',
    role: 'Media',
    dietaryNotes: '',
    accessibilityNeeds: '',
    registrationDate: '2024-02-18',
  },
  {
    id: 'p-012',
    firstName: 'Michael',
    lastName: 'Brown',
    email: 'm.brown@fanclub.com',
    phone: '+1 (212) 555-4321',
    nationality: 'USA',
    passportNumber: 'US753951842',
    organization: 'Sports Fan Club International',
    jobTitle: 'Fan Club President',
    role: 'Fan',
    dietaryNotes: '',
    accessibilityNeeds: '',
    registrationDate: '2024-02-20',
  },
  {
    id: 'p-013',
    firstName: 'Anna',
    lastName: 'Kowalski',
    email: 'a.kowalski@pkol.pl',
    phone: '+48 22 123 4567',
    nationality: 'Germany',
    passportNumber: 'DE159753468',
    organization: 'Polish Olympic Committee',
    jobTitle: 'Certified Judge',
    role: 'Judge',
    dietaryNotes: '',
    accessibilityNeeds: '',
    registrationDate: '2024-02-22',
  },
  {
    id: 'p-014',
    firstName: 'Raj',
    lastName: 'Patel',
    email: 'r.patel@sportsauthority.in',
    phone: '+91 98123 45678',
    nationality: 'India',
    passportNumber: 'IN357159468',
    organization: 'Sports Authority of India',
    jobTitle: 'Executive Director',
    role: 'VIP',
    dietaryNotes: 'Vegetarian',
    accessibilityNeeds: '',
    registrationDate: '2024-02-25',
  },
  {
    id: 'p-015',
    firstName: 'Sophie',
    lastName: 'Martin',
    email: 's.martin@cnosf.fr',
    phone: '+33 1 40 78 29 00',
    nationality: 'UK',
    passportNumber: 'UK852456963',
    organization: 'French National Olympic Committee',
    jobTitle: 'International Relations Officer',
    role: 'Official',
    dietaryNotes: '',
    accessibilityNeeds: 'Hearing assistance required',
    registrationDate: '2024-02-28',
  },
  // Arabic Participants (12 participants with Arabic names)
  {
    id: 'p-ar-001',
    firstName: 'محمد',
    lastName: 'عبد الله',
    email: 'mohammad.abdullah@uae.gov',
    phone: '+971 50 234 5678',
    nationality: 'UAE',
    passportNumber: 'AE112233445',
    organization: 'الاتحاد الرياضي الإماراتي',
    jobTitle: 'رئيس اللجنة',
    role: 'VVIP',
    dietaryNotes: 'حلال',
    accessibilityNeeds: '',
    registrationDate: '2024-03-01',
  },
  {
    id: 'p-ar-002',
    firstName: 'أحمد',
    lastName: 'علي',
    email: 'ahmad.ali@qatar.qa',
    phone: '+974 5512 3456',
    nationality: 'Qatar',
    passportNumber: 'QA223344556',
    organization: 'اللجنة الأولمبية القطرية',
    jobTitle: 'نائب الرئيس',
    role: 'VIP',
    dietaryNotes: 'حلال',
    accessibilityNeeds: '',
    registrationDate: '2024-03-02',
  },
  {
    id: 'p-ar-003',
    firstName: 'عمر',
    lastName: 'خالد',
    email: 'omar.khaled@sa.gov',
    phone: '+966 50 123 4567',
    nationality: 'Saudi Arabia',
    passportNumber: 'SA334455667',
    organization: 'وزارة الرياضة السعودية',
    jobTitle: 'مدير العلاقات الدولية',
    role: 'Official',
    dietaryNotes: 'حلال',
    accessibilityNeeds: '',
    registrationDate: '2024-03-03',
  },
  {
    id: 'p-ar-004',
    firstName: 'يوسف',
    lastName: 'عبد الرحمن',
    email: 'youssef.abdulrahman@kw.gov',
    phone: '+965 6612 3456',
    nationality: 'Kuwait',
    passportNumber: 'KW445566778',
    organization: 'الاتحاد الكويتي للرياضة',
    jobTitle: 'رياضي محترف',
    role: 'Athlete',
    dietaryNotes: 'حلال',
    accessibilityNeeds: '',
    registrationDate: '2024-03-04',
  },
  {
    id: 'p-ar-005',
    firstName: 'علي',
    lastName: 'حسن',
    email: 'ali.hassan@bh.gov',
    phone: '+973 3312 3456',
    nationality: 'Bahrain',
    passportNumber: 'BH556677889',
    organization: 'اللجنة الأولمبية البحرينية',
    jobTitle: 'حكم دولي',
    role: 'Judge',
    dietaryNotes: 'حلال',
    accessibilityNeeds: '',
    registrationDate: '2024-03-05',
  },
  {
    id: 'p-ar-006',
    firstName: 'إبراهيم',
    lastName: 'صالح',
    email: 'ibrahim.saleh@om.gov',
    phone: '+968 9912 3456',
    nationality: 'Oman',
    passportNumber: 'OM667788990',
    organization: 'وزارة الشؤون الرياضية العمانية',
    jobTitle: 'مدير البرامج الرياضية',
    role: 'Official',
    dietaryNotes: 'حلال',
    accessibilityNeeds: '',
    registrationDate: '2024-03-06',
  },
  {
    id: 'p-ar-007',
    firstName: 'عبد الله',
    lastName: 'محمد',
    email: 'abdullah.mohammad@jo.gov',
    phone: '+962 79 123 4567',
    nationality: 'Jordan',
    passportNumber: 'JO778899001',
    organization: 'اللجنة الأولمبية الأردنية',
    jobTitle: 'لاعب منتخب',
    role: 'Athlete',
    dietaryNotes: 'حلال',
    accessibilityNeeds: '',
    registrationDate: '2024-03-07',
  },
  {
    id: 'p-ar-008',
    firstName: 'خالد',
    lastName: 'ناصر',
    email: 'khaled.nasser@eg.gov',
    phone: '+20 100 234 5678',
    nationality: 'Egypt',
    passportNumber: 'EG889900112',
    organization: 'اتحاد الألعاب الرياضية المصري',
    jobTitle: 'صحفي رياضي',
    role: 'Media',
    dietaryNotes: 'حلال',
    accessibilityNeeds: '',
    registrationDate: '2024-03-08',
  },
  {
    id: 'p-ar-009',
    firstName: 'حسين',
    lastName: 'فهد',
    email: 'hussein.fahd@lb.gov',
    phone: '+961 3 123 456',
    nationality: 'Lebanon',
    passportNumber: 'LB990011223',
    organization: 'اللجنة الأولمبية اللبنانية',
    jobTitle: 'رئيس مجلس الإدارة',
    role: 'VIP',
    dietaryNotes: 'حلال',
    accessibilityNeeds: '',
    registrationDate: '2024-03-09',
  },
  {
    id: 'p-ar-010',
    firstName: 'سلمان',
    lastName: 'عبد العزيز',
    email: 'salman.abdulaziz@iq.gov',
    phone: '+964 770 123 4567',
    nationality: 'Iraq',
    passportNumber: 'IQ001122334',
    organization: 'الاتحاد العراقي للرياضة',
    jobTitle: 'كابتن الفريق',
    role: 'Athlete',
    dietaryNotes: 'حلال',
    accessibilityNeeds: '',
    registrationDate: '2024-03-10',
  },
  {
    id: 'p-ar-011',
    firstName: 'طارق',
    lastName: 'سعيد',
    email: 'tarek.saeed@ma.gov',
    phone: '+212 6 12 34 56 78',
    nationality: 'Morocco',
    passportNumber: 'MA112233445',
    organization: 'اللجنة الأولمبية المغربية',
    jobTitle: 'حكم معتمد',
    role: 'Judge',
    dietaryNotes: 'حلال',
    accessibilityNeeds: '',
    registrationDate: '2024-03-11',
  },
  {
    id: 'p-ar-012',
    firstName: 'أنس',
    lastName: 'عبد الكريم',
    email: 'anas.abdulkareem@tn.gov',
    phone: '+216 20 123 456',
    nationality: 'Tunisia',
    passportNumber: 'TN223344556',
    organization: 'الاتحاد التونسي للرياضة',
    jobTitle: 'مشجع',
    role: 'Fan',
    dietaryNotes: 'حلال',
    accessibilityNeeds: '',
    registrationDate: '2024-03-12',
  },
];

// Mock RSVPs - 5 Yes, 3 Maybe, 2 No, 5 Invited + Arabic participants
export const rsvps: RSVP[] = [
  { participantId: 'p-001', eventId: 'evt-001', status: 'Yes', respondedAt: '2024-01-16', guestCount: 0, notes: '' },
  { participantId: 'p-002', eventId: 'evt-001', status: 'Yes', respondedAt: '2024-01-11', guestCount: 2, notes: 'VIP guests' },
  { participantId: 'p-003', eventId: 'evt-001', status: 'Yes', respondedAt: '2024-01-21', guestCount: 0, notes: '' },
  { participantId: 'p-004', eventId: 'evt-001', status: 'Yes', respondedAt: '2024-01-26', guestCount: 1, notes: 'Camera crew' },
  { participantId: 'p-005', eventId: 'evt-001', status: 'Yes', respondedAt: '2024-02-02', guestCount: 0, notes: '' },
  { participantId: 'p-006', eventId: 'evt-001', status: 'Maybe', respondedAt: '2024-02-06', guestCount: 0, notes: 'Awaiting schedule confirmation' },
  { participantId: 'p-007', eventId: 'evt-001', status: 'Maybe', respondedAt: '2024-02-09', guestCount: 0, notes: 'Visa processing' },
  { participantId: 'p-008', eventId: 'evt-001', status: 'Maybe', respondedAt: '2024-02-11', guestCount: 0, notes: 'Budget approval pending' },
  { participantId: 'p-009', eventId: 'evt-001', status: 'No', respondedAt: '2024-02-13', guestCount: 0, notes: 'Schedule conflict' },
  { participantId: 'p-010', eventId: 'evt-001', status: 'No', respondedAt: '2024-02-16', guestCount: 0, notes: 'Unable to attend' },
  { participantId: 'p-011', eventId: 'evt-001', status: 'Invited', respondedAt: null, guestCount: 0, notes: '' },
  { participantId: 'p-012', eventId: 'evt-001', status: 'Invited', respondedAt: null, guestCount: 0, notes: '' },
  { participantId: 'p-013', eventId: 'evt-001', status: 'Invited', respondedAt: null, guestCount: 0, notes: '' },
  { participantId: 'p-014', eventId: 'evt-001', status: 'Invited', respondedAt: null, guestCount: 0, notes: '' },
  { participantId: 'p-015', eventId: 'evt-001', status: 'Invited', respondedAt: null, guestCount: 0, notes: '' },
  // Arabic participants RSVPs
  { participantId: 'p-ar-001', eventId: 'evt-001', status: 'Yes', respondedAt: '2024-03-02', guestCount: 3, notes: 'ضيوف كبار الشخصيات' },
  { participantId: 'p-ar-002', eventId: 'evt-001', status: 'Yes', respondedAt: '2024-03-03', guestCount: 1, notes: '' },
  { participantId: 'p-ar-003', eventId: 'evt-001', status: 'Yes', respondedAt: '2024-03-04', guestCount: 0, notes: '' },
  { participantId: 'p-ar-004', eventId: 'evt-001', status: 'Maybe', respondedAt: '2024-03-05', guestCount: 0, notes: 'في انتظار موافقة السفر' },
  { participantId: 'p-ar-005', eventId: 'evt-001', status: 'Maybe', respondedAt: '2024-03-06', guestCount: 0, notes: 'جدولة معلقة' },
  { participantId: 'p-ar-006', eventId: 'evt-001', status: 'No', respondedAt: '2024-03-07', guestCount: 0, notes: 'تعارض في المواعيد' },
  { participantId: 'p-ar-007', eventId: 'evt-001', status: 'Invited', respondedAt: null, guestCount: 0, notes: '' },
  { participantId: 'p-ar-008', eventId: 'evt-001', status: 'Invited', respondedAt: null, guestCount: 0, notes: '' },
  { participantId: 'p-ar-009', eventId: 'evt-001', status: 'Invited', respondedAt: null, guestCount: 0, notes: '' },
  { participantId: 'p-ar-010', eventId: 'evt-001', status: 'Yes', respondedAt: '2024-03-11', guestCount: 0, notes: '' },
  { participantId: 'p-ar-011', eventId: 'evt-001', status: 'Yes', respondedAt: '2024-03-12', guestCount: 0, notes: '' },
  { participantId: 'p-ar-012', eventId: 'evt-001', status: 'Invited', respondedAt: null, guestCount: 0, notes: '' },
];

// Mock Registrations - 4 Approved, 3 Under Review, 3 Submitted, 2 Rejected, 3 Draft + Arabic participants
export const registrations: Registration[] = [
  { participantId: 'p-001', eventId: 'evt-001', registrationId: 'REG-2024-001', status: 'Approved', submittedAt: '2024-01-17', reviewedAt: '2024-01-18', rejectionReason: null },
  { participantId: 'p-002', eventId: 'evt-001', registrationId: 'REG-2024-002', status: 'Approved', submittedAt: '2024-01-12', reviewedAt: '2024-01-13', rejectionReason: null },
  { participantId: 'p-003', eventId: 'evt-001', registrationId: 'REG-2024-003', status: 'Approved', submittedAt: '2024-01-22', reviewedAt: '2024-01-24', rejectionReason: null },
  { participantId: 'p-004', eventId: 'evt-001', registrationId: 'REG-2024-004', status: 'Approved', submittedAt: '2024-01-27', reviewedAt: '2024-01-28', rejectionReason: null },
  { participantId: 'p-005', eventId: 'evt-001', registrationId: 'REG-2024-005', status: 'Under Review', submittedAt: '2024-02-03', reviewedAt: null, rejectionReason: null },
  { participantId: 'p-006', eventId: 'evt-001', registrationId: 'REG-2024-006', status: 'Under Review', submittedAt: '2024-02-07', reviewedAt: null, rejectionReason: null },
  { participantId: 'p-007', eventId: 'evt-001', registrationId: 'REG-2024-007', status: 'Under Review', submittedAt: '2024-02-10', reviewedAt: null, rejectionReason: null },
  { participantId: 'p-008', eventId: 'evt-001', registrationId: 'REG-2024-008', status: 'Submitted', submittedAt: '2024-02-12', reviewedAt: null, rejectionReason: null },
  { participantId: 'p-009', eventId: 'evt-001', registrationId: 'REG-2024-009', status: 'Submitted', submittedAt: '2024-02-14', reviewedAt: null, rejectionReason: null },
  { participantId: 'p-010', eventId: 'evt-001', registrationId: 'REG-2024-010', status: 'Submitted', submittedAt: '2024-02-17', reviewedAt: null, rejectionReason: null },
  { participantId: 'p-011', eventId: 'evt-001', registrationId: 'REG-2024-011', status: 'Rejected', submittedAt: '2024-02-19', reviewedAt: '2024-02-20', rejectionReason: 'Incomplete passport information' },
  { participantId: 'p-012', eventId: 'evt-001', registrationId: 'REG-2024-012', status: 'Rejected', submittedAt: '2024-02-21', reviewedAt: '2024-02-22', rejectionReason: 'Photo does not meet requirements' },
  { participantId: 'p-013', eventId: 'evt-001', registrationId: 'REG-2024-013', status: 'Draft', submittedAt: null, reviewedAt: null, rejectionReason: null },
  { participantId: 'p-014', eventId: 'evt-001', registrationId: 'REG-2024-014', status: 'Draft', submittedAt: null, reviewedAt: null, rejectionReason: null },
  { participantId: 'p-015', eventId: 'evt-001', registrationId: 'REG-2024-015', status: 'Draft', submittedAt: null, reviewedAt: null, rejectionReason: null },
  // Arabic participants registrations
  { participantId: 'p-ar-001', eventId: 'evt-001', registrationId: 'REG-2024-AR001', status: 'Approved', submittedAt: '2024-03-03', reviewedAt: '2024-03-04', rejectionReason: null },
  { participantId: 'p-ar-002', eventId: 'evt-001', registrationId: 'REG-2024-AR002', status: 'Approved', submittedAt: '2024-03-04', reviewedAt: '2024-03-05', rejectionReason: null },
  { participantId: 'p-ar-003', eventId: 'evt-001', registrationId: 'REG-2024-AR003', status: 'Approved', submittedAt: '2024-03-05', reviewedAt: '2024-03-06', rejectionReason: null },
  { participantId: 'p-ar-004', eventId: 'evt-001', registrationId: 'REG-2024-AR004', status: 'Under Review', submittedAt: '2024-03-06', reviewedAt: null, rejectionReason: null },
  { participantId: 'p-ar-005', eventId: 'evt-001', registrationId: 'REG-2024-AR005', status: 'Under Review', submittedAt: '2024-03-07', reviewedAt: null, rejectionReason: null },
  { participantId: 'p-ar-006', eventId: 'evt-001', registrationId: 'REG-2024-AR006', status: 'Submitted', submittedAt: '2024-03-08', reviewedAt: null, rejectionReason: null },
  { participantId: 'p-ar-007', eventId: 'evt-001', registrationId: 'REG-2024-AR007', status: 'Submitted', submittedAt: '2024-03-09', reviewedAt: null, rejectionReason: null },
  { participantId: 'p-ar-008', eventId: 'evt-001', registrationId: 'REG-2024-AR008', status: 'Draft', submittedAt: null, reviewedAt: null, rejectionReason: null },
  { participantId: 'p-ar-009', eventId: 'evt-001', registrationId: 'REG-2024-AR009', status: 'Draft', submittedAt: null, reviewedAt: null, rejectionReason: null },
  { participantId: 'p-ar-010', eventId: 'evt-001', registrationId: 'REG-2024-AR010', status: 'Approved', submittedAt: '2024-03-12', reviewedAt: '2024-03-13', rejectionReason: null },
  { participantId: 'p-ar-011', eventId: 'evt-001', registrationId: 'REG-2024-AR011', status: 'Approved', submittedAt: '2024-03-13', reviewedAt: '2024-03-14', rejectionReason: null },
  { participantId: 'p-ar-012', eventId: 'evt-001', registrationId: 'REG-2024-AR012', status: 'Rejected', submittedAt: '2024-03-14', reviewedAt: '2024-03-15', rejectionReason: 'معلومات جواز السفر غير مكتملة' },
];

// Mock Documents - 4 missing passport scans, 2 with rejected photos
export const documents: Document[] = [
  { id: 'd-001', participantId: 'p-001', type: 'Passport', fileName: 'passport_mitchell.pdf', uploadedAt: '2024-01-17', verificationStatus: 'Verified', notes: '' },
  { id: 'd-002', participantId: 'p-001', type: 'Photo', fileName: 'photo_mitchell.jpg', uploadedAt: '2024-01-17', verificationStatus: 'Verified', notes: '' },
  { id: 'd-003', participantId: 'p-002', type: 'Passport', fileName: 'passport_alrashid.pdf', uploadedAt: '2024-01-12', verificationStatus: 'Verified', notes: '' },
  { id: 'd-004', participantId: 'p-002', type: 'Photo', fileName: 'photo_alrashid.jpg', uploadedAt: '2024-01-12', verificationStatus: 'Verified', notes: '' },
  { id: 'd-005', participantId: 'p-003', type: 'Passport', fileName: 'passport_sharma.pdf', uploadedAt: '2024-01-22', verificationStatus: 'Verified', notes: '' },
  { id: 'd-006', participantId: 'p-003', type: 'Photo', fileName: 'photo_sharma.jpg', uploadedAt: '2024-01-22', verificationStatus: 'Verified', notes: '' },
  { id: 'd-007', participantId: 'p-004', type: 'Passport', fileName: 'passport_thompson.pdf', uploadedAt: '2024-01-27', verificationStatus: 'Verified', notes: '' },
  { id: 'd-008', participantId: 'p-004', type: 'Photo', fileName: 'photo_thompson.jpg', uploadedAt: '2024-01-27', verificationStatus: 'Verified', notes: '' },
  { id: 'd-009', participantId: 'p-005', type: 'Passport', fileName: 'passport_tanaka.pdf', uploadedAt: '2024-02-03', verificationStatus: 'Pending', notes: '' },
  { id: 'd-010', participantId: 'p-005', type: 'Photo', fileName: 'photo_tanaka.jpg', uploadedAt: '2024-02-03', verificationStatus: 'Verified', notes: '' },
  { id: 'd-011', participantId: 'p-006', type: 'Photo', fileName: 'photo_mueller.jpg', uploadedAt: '2024-02-07', verificationStatus: 'Rejected', notes: 'Photo background not white' },
  { id: 'd-012', participantId: 'p-007', type: 'Passport', fileName: 'passport_khan.pdf', uploadedAt: '2024-02-10', verificationStatus: 'Pending', notes: '' },
  { id: 'd-013', participantId: 'p-007', type: 'Photo', fileName: 'photo_khan.jpg', uploadedAt: '2024-02-10', verificationStatus: 'Verified', notes: '' },
  { id: 'd-014', participantId: 'p-008', type: 'Photo', fileName: 'photo_rodriguez.jpg', uploadedAt: '2024-02-12', verificationStatus: 'Rejected', notes: 'Image resolution too low' },
  // p-009, p-010, p-011, p-012 missing passport scans
];

// Mock Travel Bookings - 5 requests (2 Ticketed, 2 Approved, 1 Proposed)
export const travelBookings: TravelBooking[] = [
  {
    id: 't-001',
    participantId: 'p-001',
    originCity: 'Los Angeles, USA',
    preferredDates: '2024-08-13 to 2024-08-26',
    status: 'Ticketed',
    pnr: 'ABC123',
    airline: 'Emirates',
    itinerary: [
      { from: 'LAX', to: 'DXB', flightNumber: 'EK216', departAt: '2024-08-13 23:45', arriveAt: '2024-08-14 22:30' },
      { from: 'DXB', to: 'LAX', flightNumber: 'EK215', departAt: '2024-08-26 02:15', arriveAt: '2024-08-26 08:45' },
    ],
  },
  {
    id: 't-002',
    participantId: 'p-003',
    originCity: 'Mumbai, India',
    preferredDates: '2024-08-14 to 2024-08-26',
    status: 'Ticketed',
    pnr: 'DEF456',
    airline: 'Emirates',
    itinerary: [
      { from: 'BOM', to: 'DXB', flightNumber: 'EK501', departAt: '2024-08-14 04:00', arriveAt: '2024-08-14 05:30' },
      { from: 'DXB', to: 'BOM', flightNumber: 'EK500', departAt: '2024-08-26 10:00', arriveAt: '2024-08-26 14:55' },
    ],
  },
  {
    id: 't-003',
    participantId: 'p-004',
    originCity: 'London, UK',
    preferredDates: '2024-08-14 to 2024-08-25',
    status: 'Approved',
    pnr: null,
    airline: 'British Airways',
    itinerary: [
      { from: 'LHR', to: 'DXB', flightNumber: 'BA107', departAt: '2024-08-14 09:00', arriveAt: '2024-08-14 19:30' },
      { from: 'DXB', to: 'LHR', flightNumber: 'BA106', departAt: '2024-08-25 21:00', arriveAt: '2024-08-26 01:30' },
    ],
  },
  {
    id: 't-004',
    participantId: 'p-005',
    originCity: 'Tokyo, Japan',
    preferredDates: '2024-08-13 to 2024-08-26',
    status: 'Approved',
    pnr: null,
    airline: 'Japan Airlines',
    itinerary: [
      { from: 'NRT', to: 'DXB', flightNumber: 'JL737', departAt: '2024-08-13 21:30', arriveAt: '2024-08-14 03:45' },
      { from: 'DXB', to: 'NRT', flightNumber: 'JL738', departAt: '2024-08-26 05:00', arriveAt: '2024-08-26 17:30' },
    ],
  },
  {
    id: 't-005',
    participantId: 'p-007',
    originCity: 'Karachi, Pakistan',
    preferredDates: '2024-08-14 to 2024-08-26',
    status: 'Proposed',
    pnr: null,
    airline: 'Pakistan International Airlines',
    itinerary: [
      { from: 'KHI', to: 'DXB', flightNumber: 'PK203', departAt: '2024-08-14 08:00', arriveAt: '2024-08-14 09:30' },
      { from: 'DXB', to: 'KHI', flightNumber: 'PK204', departAt: '2024-08-26 14:00', arriveAt: '2024-08-26 17:00' },
    ],
  },
];

// Mock Hotels
export const hotels: Hotel[] = [
  { id: 'h-001', name: 'Atlantis The Palm', city: 'Dubai', roomTypes: ['Standard', 'Deluxe', 'Suite'], capacity: 500, contact: '+971 4 426 2000' },
  { id: 'h-002', name: 'Jumeirah Beach Hotel', city: 'Dubai', roomTypes: ['Standard', 'Deluxe', 'Ocean View'], capacity: 350, contact: '+971 4 348 0000' },
  { id: 'h-003', name: 'Burj Al Arab', city: 'Dubai', roomTypes: ['Deluxe Suite', 'Presidential Suite'], capacity: 100, contact: '+971 4 301 7777' },
];

// Mock Accommodations - 7 allocated, 3 confirmed, 2 checked-in
export const accommodations: Accommodation[] = [
  { id: 'a-001', participantId: 'p-001', hotelId: 'h-001', hotelName: 'Atlantis The Palm', roomNumber: '1201', checkIn: '2024-08-14', checkOut: '2024-08-26', status: 'Checked-In', roommates: [] },
  { id: 'a-002', participantId: 'p-002', hotelId: 'h-003', hotelName: 'Burj Al Arab', roomNumber: 'PS-01', checkIn: '2024-08-14', checkOut: '2024-08-26', status: 'Checked-In', roommates: [] },
  { id: 'a-003', participantId: 'p-003', hotelId: 'h-001', hotelName: 'Atlantis The Palm', roomNumber: '1202', checkIn: '2024-08-14', checkOut: '2024-08-26', status: 'Confirmed', roommates: [] },
  { id: 'a-004', participantId: 'p-004', hotelId: 'h-002', hotelName: 'Jumeirah Beach Hotel', roomNumber: '805', checkIn: '2024-08-14', checkOut: '2024-08-25', status: 'Confirmed', roommates: [] },
  { id: 'a-005', participantId: 'p-005', hotelId: 'h-001', hotelName: 'Atlantis The Palm', roomNumber: '1203', checkIn: '2024-08-14', checkOut: '2024-08-26', status: 'Confirmed', roommates: [] },
  { id: 'a-006', participantId: 'p-006', hotelId: 'h-002', hotelName: 'Jumeirah Beach Hotel', roomNumber: '806', checkIn: '2024-08-14', checkOut: '2024-08-26', status: 'Allocated', roommates: [] },
  { id: 'a-007', participantId: 'p-007', hotelId: 'h-001', hotelName: 'Atlantis The Palm', roomNumber: '1204', checkIn: '2024-08-14', checkOut: '2024-08-26', status: 'Allocated', roommates: ['p-010'] },
  { id: 'a-008', participantId: 'p-008', hotelId: 'h-002', hotelName: 'Jumeirah Beach Hotel', roomNumber: '807', checkIn: '2024-08-14', checkOut: '2024-08-26', status: 'Allocated', roommates: [] },
  { id: 'a-009', participantId: 'p-009', hotelId: 'h-001', hotelName: 'Atlantis The Palm', roomNumber: '1205', checkIn: '2024-08-14', checkOut: '2024-08-26', status: 'Allocated', roommates: [] },
  { id: 'a-010', participantId: 'p-010', hotelId: 'h-001', hotelName: 'Atlantis The Palm', roomNumber: '1204', checkIn: '2024-08-14', checkOut: '2024-08-26', status: 'Allocated', roommates: ['p-007'] },
  { id: 'a-011', participantId: 'p-011', hotelId: 'h-002', hotelName: 'Jumeirah Beach Hotel', roomNumber: '808', checkIn: '2024-08-14', checkOut: '2024-08-26', status: 'Allocated', roommates: [] },
  { id: 'a-012', participantId: 'p-012', hotelId: 'h-001', hotelName: 'Atlantis The Palm', roomNumber: '1206', checkIn: '2024-08-14', checkOut: '2024-08-26', status: 'Allocated', roommates: [] },
];

// Mock Visa Cases - 6 cases (2 Approved, 2 Submitted, 2 Docs Pending)
export const visaCases: VisaCase[] = [
  { id: 'v-001', participantId: 'p-003', nationality: 'India', requiredDocs: ['Passport', 'Photo', 'Invitation Letter', 'Bank Statement'], status: 'Approved', submissionBatch: 'BATCH-2024-001', slaDueDate: '2024-07-15' },
  { id: 'v-002', participantId: 'p-005', nationality: 'Japan', requiredDocs: ['Passport', 'Photo', 'Invitation Letter'], status: 'Approved', submissionBatch: 'BATCH-2024-001', slaDueDate: '2024-07-15' },
  { id: 'v-003', participantId: 'p-007', nationality: 'Pakistan', requiredDocs: ['Passport', 'Photo', 'Invitation Letter', 'Bank Statement', 'Employment Letter'], status: 'Submitted', submissionBatch: 'BATCH-2024-002', slaDueDate: '2024-07-30' },
  { id: 'v-004', participantId: 'p-013', nationality: 'Germany', requiredDocs: ['Passport', 'Photo'], status: 'Submitted', submissionBatch: 'BATCH-2024-002', slaDueDate: '2024-07-30' },
  { id: 'v-005', participantId: 'p-014', nationality: 'India', requiredDocs: ['Passport', 'Photo', 'Invitation Letter', 'Bank Statement'], status: 'Docs Pending', submissionBatch: null, slaDueDate: '2024-08-01' },
  { id: 'v-006', participantId: 'p-011', nationality: 'Japan', requiredDocs: ['Passport', 'Photo', 'Invitation Letter'], status: 'Docs Pending', submissionBatch: null, slaDueDate: '2024-08-01' },
];

// Mock Badges - 5 Printed, 3 Ready, 4 Pending
export const badges: Badge[] = [
  { id: 'b-001', participantId: 'p-001', zoneId: 'A', qrCode: 'QR-001-A', status: 'Printed', printedAt: '2024-08-10', collectedAt: null },
  { id: 'b-002', participantId: 'p-002', zoneId: 'A', qrCode: 'QR-002-A', status: 'Printed', printedAt: '2024-08-10', collectedAt: null },
  { id: 'b-003', participantId: 'p-003', zoneId: 'B', qrCode: 'QR-003-B', status: 'Printed', printedAt: '2024-08-10', collectedAt: null },
  { id: 'b-004', participantId: 'p-004', zoneId: 'B', qrCode: 'QR-004-B', status: 'Printed', printedAt: '2024-08-10', collectedAt: null },
  { id: 'b-005', participantId: 'p-005', zoneId: 'B', qrCode: 'QR-005-B', status: 'Printed', printedAt: '2024-08-10', collectedAt: null },
  { id: 'b-006', participantId: 'p-006', zoneId: 'B', qrCode: 'QR-006-B', status: 'Ready', printedAt: null, collectedAt: null },
  { id: 'b-007', participantId: 'p-007', zoneId: 'C', qrCode: 'QR-007-C', status: 'Ready', printedAt: null, collectedAt: null },
  { id: 'b-008', participantId: 'p-008', zoneId: 'B', qrCode: 'QR-008-B', status: 'Ready', printedAt: null, collectedAt: null },
  { id: 'b-009', participantId: 'p-009', zoneId: 'B', qrCode: 'QR-009-B', status: 'Pending', printedAt: null, collectedAt: null },
  { id: 'b-010', participantId: 'p-010', zoneId: 'C', qrCode: 'QR-010-C', status: 'Pending', printedAt: null, collectedAt: null },
  { id: 'b-011', participantId: 'p-011', zoneId: 'B', qrCode: 'QR-011-B', status: 'Pending', printedAt: null, collectedAt: null },
  { id: 'b-012', participantId: 'p-012', zoneId: 'C', qrCode: 'QR-012-C', status: 'Pending', printedAt: null, collectedAt: null },
];

// Mock Campaigns
export const campaigns: Campaign[] = [
  { id: 'c-001', name: 'Initial Invite Wave', eventId: 'evt-001', audienceSize: 500, sentCount: 495, deliveredCount: 490, failedCount: 5, rsvpYes: 312, rsvpNo: 45, rsvpMaybe: 67, createdAt: '2024-01-05', status: 'Completed' },
  { id: 'c-002', name: 'VIP Exclusive Invite', eventId: 'evt-001', audienceSize: 50, sentCount: 50, deliveredCount: 50, failedCount: 0, rsvpYes: 42, rsvpNo: 3, rsvpMaybe: 5, createdAt: '2024-01-10', status: 'Completed' },
  { id: 'c-003', name: 'Media Outreach', eventId: 'evt-001', audienceSize: 200, sentCount: 198, deliveredCount: 195, failedCount: 3, rsvpYes: 156, rsvpNo: 12, rsvpMaybe: 15, createdAt: '2024-01-20', status: 'Completed' },
  { id: 'c-004', name: 'Follow-up Reminder', eventId: 'evt-001', audienceSize: 76, sentCount: 0, deliveredCount: 0, failedCount: 0, rsvpYes: 0, rsvpNo: 0, rsvpMaybe: 0, createdAt: '2024-02-28', status: 'Scheduled' },
];

// Dashboard statistics helper
export const getDashboardStats = () => {
  const rsvpYes = rsvps.filter(r => r.status === 'Yes').length;
  const rsvpNo = rsvps.filter(r => r.status === 'No').length;
  const rsvpMaybe = rsvps.filter(r => r.status === 'Maybe').length;
  const rsvpPending = rsvps.filter(r => r.status === 'Invited').length;

  const regApproved = registrations.filter(r => r.status === 'Approved').length;
  const regPending = registrations.filter(r => ['Submitted', 'Under Review'].includes(r.status)).length;
  const regRejected = registrations.filter(r => r.status === 'Rejected').length;

  const visaApproved = visaCases.filter(v => v.status === 'Approved').length;
  const visaPending = visaCases.filter(v => ['Docs Pending', 'Submitted', 'Ready'].includes(v.status)).length;

  const travelTicketed = travelBookings.filter(t => t.status === 'Ticketed').length;
  const travelPending = travelBookings.filter(t => ['Requested', 'Proposed', 'Approved'].includes(t.status)).length;

  const accomAllocated = accommodations.filter(a => ['Allocated', 'Confirmed', 'Checked-In'].includes(a.status)).length;

  const badgesPrinted = badges.filter(b => b.status === 'Printed').length;
  const badgesReady = badges.filter(b => b.status === 'Ready').length;

  return {
    invited: participants.length,
    rsvpYes,
    rsvpNo,
    rsvpMaybe,
    rsvpPending,
    registered: regApproved + regPending,
    regApproved,
    regPending,
    regRejected,
    visaApproved,
    visaPending,
    travelTicketed,
    travelPending,
    accomAllocated,
    badgesPrinted,
    badgesReady,
    badgesPending: badges.filter(b => b.status === 'Pending').length,
  };
};

// Get participant with all related data
export const getParticipantDetails = (participantId: string) => {
  const participant = participants.find(p => p.id === participantId);
  if (!participant) return null;

  return {
    participant,
    rsvp: rsvps.find(r => r.participantId === participantId),
    registration: registrations.find(r => r.participantId === participantId),
    documents: documents.filter(d => d.participantId === participantId),
    travel: travelBookings.find(t => t.participantId === participantId),
    accommodation: accommodations.find(a => a.participantId === participantId),
    visa: visaCases.find(v => v.participantId === participantId),
    badge: badges.find(b => b.participantId === participantId),
  };
};
