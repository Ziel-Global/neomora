import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Globe, Briefcase, FileText, Check, ChevronLeft, ChevronRight, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useParticipantSession } from '@/contexts/ParticipantSessionContext';
import {
  participantStore,
  registrationStore,
  eventStore,
  travelStore,
  visaStore,
  invitationStore,
  initializeStore,
  EMSParticipant,
} from '@/lib/emsStore';
import { ParticipantRole } from '@/data/mockData';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plane, MapPin, Calendar } from 'lucide-react';
import { createRegistration, submitFinalRegistration, getMyRegistrations } from '@/api/registrationApi';
import { getEvents } from '@/api/eventApi';
import { getInvitationById, Invitation } from '@/api/invitationApi';

const REGISTRATION_IDS_KEY = 'ems_my_registration_ids';
const INVITATION_REGISTRATIONS_KEY = 'ems_invitation_registrations';

const saveInvitationRegistration = (invitationId: string, registrationId: string) => {
  const map: Record<string, string> = JSON.parse(localStorage.getItem(INVITATION_REGISTRATIONS_KEY) || '{}');
  map[invitationId] = registrationId;
  localStorage.setItem(INVITATION_REGISTRATIONS_KEY, JSON.stringify(map));
};

const getInvitationRegistrationMap = (): Record<string, string> =>
  JSON.parse(localStorage.getItem(INVITATION_REGISTRATIONS_KEY) || '{}');

const hasExistingInvitationRegistration = async (
  invitationId: string,
  eventId?: string,
): Promise<boolean> => {
  if (getInvitationRegistrationMap()[invitationId]) return true;

  const registrations = await getMyRegistrations().catch(() => []);
  return registrations.some(reg => {
    const regInvitationId = reg.invitationId || reg.invitation_id;
    if (regInvitationId && String(regInvitationId) === invitationId) return true;
    if (!eventId) return false;
    const regEventId = reg.eventId || (reg as any).event?.id;
    return regEventId === eventId;
  });
};

const steps = [
  { id: 1, title: 'Select Event', icon: Calendar },
  { id: 2, title: 'Personal Info', icon: User },
  { id: 3, title: 'Professional', icon: Briefcase },
  { id: 4, title: 'Travel & Visa', icon: Globe },
  { id: 5, title: 'Documents', icon: FileText },
  { id: 6, title: 'Review', icon: Check },
];

// Document storage key for dedicated file storage
const REG_DOCS_KEY = 'ems_registration_documents';

const storeDocumentFile = (docId: string, fileData: string): boolean => {
  try {
    const stored = localStorage.getItem(REG_DOCS_KEY);
    const docs = stored ? JSON.parse(stored) : {};
    docs[docId] = fileData;
    localStorage.setItem(REG_DOCS_KEY, JSON.stringify(docs));
    return true;
  } catch (e) {
    if (e instanceof Error && e.name === 'QuotaExceededError') {
      toast.error('Storage full. Please clear browser data or use smaller files.');
    }
    return false;
  }
};

interface UploadedDoc {
  type: 'Passport' | 'Photo' | 'ID' | 'Visa Form' | 'Consent' | 'Press Credentials';
  fileName: string;
  fileData: string; // Base64 for demo
  docId: string; // Reference ID for storage
}

const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhone = (phone: string) => {
  return phone.replace(/[^0-9]/g, '').length >= 10;
};

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isPastDate = (value: string) => Boolean(value) && value < getLocalDateString();

interface FormErrors {
  [key: string]: string;
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Add useLocation import
  const { participant: sessionParticipant, login } = useParticipantSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitationId, setInvitationId] = useState<string | null>(null);
  const [isInvitationLocked, setIsInvitationLocked] = useState(false);
  const [lockedEvent, setLockedEvent] = useState<any | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [availableEvents, setAvailableEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  // ... formData state ...
  const [formData, setFormData] = useState({
    eventId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nationality: '',
    passportNumber: '',
    organization: '',
    jobTitle: '',
    role: '' as ParticipantRole | '',
    arrivalDate: '',
    departureDate: '',
    needsVisa: false,
    needsAccommodation: false,
    needsTransport: false,
    dietaryRequirements: '',
    emergencyContact: '',
    agreeTerms: false,
    // Travel preferences (when needsTransport is checked)
    originCity: '',
    departureAirport: '',
    seatPreference: 'No Preference' as 'Window' | 'Aisle' | 'Middle' | 'No Preference',
    mealPreference: 'حلال / Halal',
    specialRequirements: '',
    travelEmergencyContact: '',
    travelEmergencyPhone: '',
  });

  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);

  // ... refs ...
  const passportInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const pressInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initializeStore();

    const searchParams = new URLSearchParams(location.search);
    const invId = searchParams.get('invitationId');
    const urlEventId = searchParams.get('eventId');

    const applySessionPrefill = () => {
      if (!sessionParticipant) return;
      setFormData(prev => ({
        ...prev,
        firstName: sessionParticipant.firstName,
        lastName: sessionParticipant.lastName,
        email: sessionParticipant.email,
        phone: sessionParticipant.phone || '',
        nationality: sessionParticipant.nationality || '',
        passportNumber: sessionParticipant.passportNumber || '',
        organization: sessionParticipant.organization || '',
        jobTitle: sessionParticipant.jobTitle || '',
        role: (sessionParticipant.role as any) || '',
        emergencyContact: sessionParticipant.emergencyContact || '',
        dietaryRequirements: sessionParticipant.dietaryNotes || '',
      }));
    };

    const loadRegistrationContext = async () => {
      setIsLoadingEvents(true);
      let resolvedEventId = urlEventId || '';
      let invitationEvent: any = null;

      try {
        if (invId) {
          setInvitationId(invId);

          let invitation: Invitation | null = invitationStore.getById(invId) as Invitation | null;
          if (!invitation) {
            invitation = await getInvitationById(invId).catch(() => null);
          }

          if (invitation) {
            resolvedEventId =
              invitation.eventId ||
              invitation.event?.id ||
              invitation.campaign?.eventId ||
              invitation.campaign?.event?.id ||
              urlEventId ||
              '';
            invitationEvent = invitation.event || invitation.campaign?.event || null;

            if (invitation.participantId) {
              const invParticipant = participantStore.getById(invitation.participantId);
              if (invParticipant) {
                setFormData(prev => ({
                  ...prev,
                  eventId: resolvedEventId,
                  firstName: invParticipant.firstName,
                  lastName: invParticipant.lastName,
                  email: invParticipant.email,
                  phone: invParticipant.phone || '',
                  nationality: invParticipant.nationality || '',
                  passportNumber: invParticipant.passportNumber || '',
                  organization: invParticipant.organization || '',
                  jobTitle: invParticipant.jobTitle || '',
                  role: invParticipant.role || '',
                  dietaryRequirements: invParticipant.dietaryNotes || invParticipant.dietaryNotes || '',
                }));
              }
            }
          }
        }

        const fetchedEvents = await getEvents().catch(() => eventStore.getAll());
        let events = Array.isArray(fetchedEvents) ? fetchedEvents : eventStore.getAll();

        if (invId && resolvedEventId) {
          const alreadyRegistered = await hasExistingInvitationRegistration(invId, resolvedEventId);
          if (alreadyRegistered) {
            toast.info('You have already registered for this invitation.');
            navigate('/portal/registrations');
            return;
          }

          const matchedEvent =
            events.find(evt => evt.id === resolvedEventId) ||
            invitationEvent ||
            { id: resolvedEventId, name: invitationEvent?.name || 'Invited Event' };

          setLockedEvent(matchedEvent);
          setAvailableEvents([matchedEvent]);
          setIsInvitationLocked(true);
          setFormData(prev => ({ ...prev, eventId: resolvedEventId }));
          setCurrentStep(2);
        } else {
          setLockedEvent(null);
          setAvailableEvents(events);
          setIsInvitationLocked(false);
        }
      } catch (err) {
        console.error('Failed to load registration context:', err);
        setAvailableEvents(eventStore.getAll());
      } finally {
        setIsLoadingEvents(false);
      }

      applySessionPrefill();
    };

    loadRegistrationContext();
  }, [sessionParticipant, location.search]);

  // Validation function
  const validateField = (field: string, value: any): string => {
    switch (field) {
      case 'eventId':
        return !value || value.trim() === '' ? 'Please select an event' : '';
      case 'firstName':
        return !value || value.trim() === '' ? 'First name is required' : '';
      case 'lastName':
        return !value || value.trim() === '' ? 'Last name is required' : '';
      case 'email':
        if (!value || value.trim() === '') return 'Email is required';
        if (!isValidEmail(value)) return 'Please enter a valid email address';
        return '';
      case 'phone':
        if (!value || value.trim() === '') return 'Phone number is required';
        if (!isValidPhone(value)) return 'Phone number must be at least 10 digits';
        return '';
      case 'nationality':
        return !value || value.trim() === '' ? 'Nationality is required' : '';
      case 'passportNumber':
        return !value || value.trim() === '' ? 'Passport/ID number is required' : '';
      case 'organization':
        return !value || value.trim() === '' ? 'Organization is required' : '';
      case 'jobTitle':
        return !value || value.trim() === '' ? 'Job title is required' : '';
      case 'role':
        return !value || value.trim() === '' ? 'Participant role is required' : '';
      case 'originCity':
        if (formData.needsTransport && (!value || value.trim() === '')) {
          return 'Origin city is required when transport is needed';
        }
        return '';
      case 'departureAirport':
        if (formData.needsTransport && (!value || value.trim() === '')) {
          return 'Departure airport is required when transport is needed';
        }
        return '';
      case 'travelEmergencyContact':
        if (formData.needsTransport && (!value || value.trim() === '')) {
          return 'Emergency contact name is required for travel';
        }
        return '';
      case 'travelEmergencyPhone':
        if (formData.needsTransport) {
          if (!value || value.trim() === '') return 'Emergency contact phone is required for travel';
          if (!isValidPhone(value)) return 'Phone number must be at least 10 digits';
        }
        return '';
      default:
        return '';
    }
  };

  // Validate all fields on current step
  const validateCurrentStep = (): boolean => {
    const newErrors: FormErrors = {};
    let fieldsToValidate: string[] = [];

    switch (currentStep) {
      case 1:
        fieldsToValidate = ['eventId'];
        break;
      case 2:
        fieldsToValidate = ['firstName', 'lastName', 'email', 'phone', 'nationality', 'passportNumber'];
        break;
      case 3:
        fieldsToValidate = ['organization', 'jobTitle', 'role'];
        break;
      case 4:
        fieldsToValidate = [];
        if (formData.needsTransport) {
          fieldsToValidate = ['originCity', 'departureAirport', 'travelEmergencyContact', 'travelEmergencyPhone'];
        }
        break;
      case 5:
      case 6:
        // No required validations for documents and review
        break;
    }

    fieldsToValidate.forEach(field => {
      const error = validateField(field, (formData as any)[field]);
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ... updateField, nextStep, prevStep, handleFileUpload, removeDoc, getDocByType ... Use original code

  const updateField = (field: string, value: any) => {
    if ((field === 'arrivalDate' || field === 'departureDate') && typeof value === 'string' && value && isPastDate(value)) {
      toast.error('Past dates cannot be selected');
      return;
    }

    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      if (field === 'arrivalDate' && value && prev.departureDate && prev.departureDate < value) {
        newData.departureDate = '';
      }

      if (field === 'departureDate' && value && prev.arrivalDate && value < prev.arrivalDate) {
        newData.departureDate = prev.arrivalDate;
      }

      // Auto-update visa assistance based on nationality
      if (field === 'nationality') {
        const exemptNationalities = ['UAE', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'UK', 'USA', 'Japan', 'South Korea', 'Singapore', 'Malaysia'];
        const isExempt = exemptNationalities.some(n => n.toLowerCase() === value.toLowerCase());
        newData.needsVisa = !isExempt;
      }

      return newData;
    });

    // Mark field as touched
    setTouched(prev => ({ ...prev, [field]: true }));

    // Validate field and update errors
    const error = validateField(field, value);
    setErrors(prev => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[field] = error;
      } else {
        delete newErrors[field];
      }
      return newErrors;
    });
  };

  const nextStep = () => {
    // Mark all fields on current step as touched
    let fieldsToTouch: string[] = [];
    switch (currentStep) {
      case 1:
        fieldsToTouch = ['eventId'];
        break;
      case 2:
        fieldsToTouch = ['firstName', 'lastName', 'email', 'phone', 'nationality', 'passportNumber'];
        break;
      case 3:
        fieldsToTouch = ['organization', 'jobTitle', 'role'];
        break;
      case 4:
        if (formData.needsTransport) {
          fieldsToTouch = ['originCity', 'departureAirport', 'travelEmergencyContact', 'travelEmergencyPhone'];
        }
        break;
    }

    const newTouched = { ...touched };
    fieldsToTouch.forEach(field => {
      newTouched[field] = true;
    });
    setTouched(newTouched);

    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, 6));
    } else {
      // Show specific error message based on missing fields
      const stepErrors = getStepErrors(currentStep);
      if (stepErrors.length > 0) {
        toast.error(stepErrors[0]); // Show first error as toast
      }
    }
  };

  // Helper to check step errors before they exist in state
  const getStepErrors = (stepNumber: number): string[] => {
    const stepErrors: string[] = [];
    let fieldsToCheck: string[] = [];

    switch (stepNumber) {
      case 1:
        fieldsToCheck = ['eventId'];
        break;
      case 2:
        fieldsToCheck = ['firstName', 'lastName', 'email', 'phone', 'nationality', 'passportNumber'];
        break;
      case 3:
        fieldsToCheck = ['organization', 'jobTitle', 'role'];
        break;
      case 4:
        if (formData.needsTransport) {
          fieldsToCheck = ['originCity', 'departureAirport', 'travelEmergencyContact', 'travelEmergencyPhone'];
        }
        break;
    }

    fieldsToCheck.forEach(field => {
      const error = validateField(field, (formData as any)[field]);
      if (error) {
        stepErrors.push(error);
      }
    });

    return stepErrors;
  };

  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, isInvitationLocked ? 2 : 1));

  const handleFileUpload = (type: UploadedDoc['type'], file: File) => {
    // Limit to 2MB to avoid quota issues
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const fileData = reader.result as string;
      const docId = `reg-${type.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;

      // Store file data to dedicated storage
      const stored = storeDocumentFile(docId, fileData);
      if (!stored) {
        toast.error('Failed to store document');
        return;
      }

      // Remove existing doc of same type
      setUploadedDocs(prev => [
        ...prev.filter(d => d.type !== type),
        { type, fileName: file.name, fileData, docId }
      ]);
      toast.success(`${type} uploaded successfully`);
    };
    reader.readAsDataURL(file);
  };

  const removeDoc = (type: UploadedDoc['type']) => {
    setUploadedDocs(prev => prev.filter(d => d.type !== type));
  };

  const getDocByType = (type: UploadedDoc['type']) => {
    return uploadedDocs.find(d => d.type === type);
  };

  const handleSubmit = async () => {
    // Check terms agreement first
    if (!formData.agreeTerms) {
      toast.error('Please agree to the terms and conditions');
      return;
    }

    setIsSubmitting(true);

    try {
      const eventId = formData.eventId;
      if (!eventId) {
        toast.error('Please select an event to register for');
        setIsSubmitting(false);
        return;
      }

      // Create FormData for multipart/form-data submission
      const registrationFormData = new FormData();

      // Add basic fields
      registrationFormData.append('eventId', eventId);
      registrationFormData.append('firstName', formData.firstName);
      registrationFormData.append('lastName', formData.lastName);
      registrationFormData.append('email', formData.email);
      registrationFormData.append('phone', formData.phone);
      registrationFormData.append('nationality', formData.nationality);
      registrationFormData.append('passportNumber', formData.passportNumber);
      registrationFormData.append('organization', formData.organization);
      registrationFormData.append('jobTitle', formData.jobTitle);
      registrationFormData.append('participantRole', formData.role);

      // Add travel and service preferences
      registrationFormData.append('arrivalDate', formData.arrivalDate);
      registrationFormData.append('departureDate', formData.departureDate);
      registrationFormData.append('needsVisa', String(formData.needsVisa));
      registrationFormData.append('needsAccommodation', String(formData.needsAccommodation));
      registrationFormData.append('needsTransport', String(formData.needsTransport));

      // Add travel preferences if applicable
      if (formData.needsTransport) {
        registrationFormData.append('originCity', formData.originCity);
        registrationFormData.append('departureAirport', formData.departureAirport);
        registrationFormData.append('seatPreference', formData.seatPreference);
        registrationFormData.append('mealPreference', formData.mealPreference);
        registrationFormData.append('specialRequirements', formData.specialRequirements);
        registrationFormData.append('travelEmergencyContactName', formData.travelEmergencyContact);
        registrationFormData.append('travelEmergencyContactPhone', formData.travelEmergencyPhone);
      }

      // Add other fields
      registrationFormData.append('dietaryRequirements', formData.dietaryRequirements);
      registrationFormData.append('emergencyContact', formData.emergencyContact);
      registrationFormData.append('agreeTerms', String(formData.agreeTerms));
      if (invitationId) {
        registrationFormData.append('invitationId', invitationId);
      }

      // Add uploaded files
      uploadedDocs.forEach((doc) => {
        if (doc.type === 'Passport') {
          registrationFormData.append('passportCopy', doc.fileData as any);
        } else if (doc.type === 'Photo') {
          registrationFormData.append('profilePhoto', doc.fileData as any);
        }
      });

      // Call API to create registration
      const response = await createRegistration(registrationFormData);

      // Submit the registration immediately after creation using the reference ID
      const targetId = response.registrationId || response.id;
      if (targetId) {
        await submitFinalRegistration(targetId);

        // Save registration UUID to localStorage for portal Registrations page
        const regId = response.id;
        if (regId) {
          const savedIds: string[] = JSON.parse(localStorage.getItem(REGISTRATION_IDS_KEY) || '[]');
          if (!savedIds.includes(regId)) {
            savedIds.push(regId);
            localStorage.setItem(REGISTRATION_IDS_KEY, JSON.stringify(savedIds));
          }
          if (invitationId) {
            saveInvitationRegistration(invitationId, regId);
          }
        }
      }

      // Also store locally for offline support
      const participant = participantStore.create({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        nationality: formData.nationality,
        passportNumber: formData.passportNumber,
        organization: formData.organization,
        jobTitle: formData.jobTitle,
        role: (formData.role || 'Attendee') as ParticipantRole,
        dietaryNotes: formData.dietaryRequirements,
        accessibilityNeeds: '',
        emergencyContact: formData.emergencyContact,
      });

      // Log participant in
      login(formData.email, '');

      toast.success('Registration submitted successfully!');
      navigate('/my-status');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Registration error:', error);
      toast.error('Failed to submit registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="eventId">Select Event *</Label>
              {isLoadingEvents ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading events...
                </div>
              ) : isInvitationLocked && lockedEvent ? (
                <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
                  <p className="font-medium">{lockedEvent.name || lockedEvent.title || 'Invited Event'}</p>
                  {lockedEvent.city && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {lockedEvent.city}
                    </p>
                  )}
                  {(lockedEvent.startDate || lockedEvent.start_date) && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {lockedEvent.startDate || lockedEvent.start_date}
                      {(lockedEvent.endDate || lockedEvent.end_date) &&
                        ` - ${lockedEvent.endDate || lockedEvent.end_date}`}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    This event was selected from your invitation and cannot be changed.
                  </p>
                </div>
              ) : availableEvents.length === 0 ? (
                <p className="text-sm text-destructive">No events available at the moment.</p>
              ) : (
                <Select value={formData.eventId} onValueChange={(v) => updateField('eventId', v)}>
                  <SelectTrigger className={cn(touched.eventId && errors.eventId && "border-red-500")}>
                    <SelectValue placeholder="Choose an event to register for" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEvents.map(evt => (
                      <SelectItem key={evt.id} value={evt.id}>
                        {evt.name || evt.title || 'Unnamed Event'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {touched.eventId && errors.eventId && (
                <p className="text-sm text-red-500">{errors.eventId}</p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  onBlur={() => setTouched(prev => ({ ...prev, firstName: true }))}
                  placeholder="Enter first name"
                  className={cn(touched.firstName && errors.firstName && "border-red-500")}
                />
                {touched.firstName && errors.firstName && (
                  <p className="text-sm text-red-500">{errors.firstName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  onBlur={() => setTouched(prev => ({ ...prev, lastName: true }))}
                  placeholder="Enter last name"
                  className={cn(touched.lastName && errors.lastName && "border-red-500")}
                />
                {touched.lastName && errors.lastName && (
                  <p className="text-sm text-red-500">{errors.lastName}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                placeholder="your@email.com"
                disabled={!!sessionParticipant}
                className={cn(touched.email && errors.email && "border-red-500")}
              />
              {touched.email && errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
              {sessionParticipant && (
                <p className="text-xs text-muted-foreground">Email cannot be changed for logged-in users</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  updateField('phone', value);
                }}
                onBlur={() => setTouched(prev => ({ ...prev, phone: true }))}
                placeholder="1234567890"
                className={cn(touched.phone && errors.phone && "border-red-500")}
              />
              {touched.phone && errors.phone && (
                <p className="text-sm text-red-500">{errors.phone}</p>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nationality">Nationality *</Label>
                <Select value={formData.nationality} onValueChange={(v) => updateField('nationality', v)}>
                  <SelectTrigger className={cn(touched.nationality && errors.nationality && "border-red-500")}>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UAE">United Arab Emirates</SelectItem>
                    <SelectItem value="Saudi Arabia">Saudi Arabia</SelectItem>
                    <SelectItem value="Qatar">Qatar</SelectItem>
                    <SelectItem value="Kuwait">Kuwait</SelectItem>
                    <SelectItem value="Bahrain">Bahrain</SelectItem>
                    <SelectItem value="Oman">Oman</SelectItem>
                    <SelectItem value="Jordan">Jordan</SelectItem>
                    <SelectItem value="Egypt">Egypt</SelectItem>
                    <SelectItem value="Lebanon">Lebanon</SelectItem>
                    <SelectItem value="Iraq">Iraq</SelectItem>
                    <SelectItem value="Morocco">Morocco</SelectItem>
                    <SelectItem value="Tunisia">Tunisia</SelectItem>
                    <SelectItem value="Pakistan">Pakistan</SelectItem>
                    <SelectItem value="USA">United States</SelectItem>
                    <SelectItem value="UK">United Kingdom</SelectItem>
                    <SelectItem value="India">India</SelectItem>
                    <SelectItem value="Germany">Germany</SelectItem>
                    <SelectItem value="France">France</SelectItem>
                    <SelectItem value="Japan">Japan</SelectItem>
                    <SelectItem value="China">China</SelectItem>
                    <SelectItem value="South Korea">South Korea</SelectItem>
                    <SelectItem value="Singapore">Singapore</SelectItem>
                    <SelectItem value="Malaysia">Malaysia</SelectItem>
                  </SelectContent>
                </Select>
                {touched.nationality && errors.nationality && (
                  <p className="text-sm text-red-500">{errors.nationality}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="passportNumber">Passport/ID Number *</Label>
                <Input
                  id="passportNumber"
                  value={formData.passportNumber}
                  onChange={(e) => updateField('passportNumber', e.target.value.toUpperCase())}
                  onBlur={() => setTouched(prev => ({ ...prev, passportNumber: true }))}
                  placeholder="Enter passport or ID number"
                  className={cn(touched.passportNumber && errors.passportNumber && "border-red-500")}
                />
                {touched.passportNumber && errors.passportNumber && (
                  <p className="text-sm text-red-500">{errors.passportNumber}</p>
                )}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organization">Organization *</Label>
              <Input
                id="organization"
                value={formData.organization}
                onChange={(e) => updateField('organization', e.target.value)}
                onBlur={() => setTouched(prev => ({ ...prev, organization: true }))}
                placeholder="Company or organization name"
                className={cn(touched.organization && errors.organization && "border-red-500")}
              />
              {touched.organization && errors.organization && (
                <p className="text-sm text-red-500">{errors.organization}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title *</Label>
              <Input
                id="jobTitle"
                value={formData.jobTitle}
                onChange={(e) => updateField('jobTitle', e.target.value)}
                onBlur={() => setTouched(prev => ({ ...prev, jobTitle: true }))}
                placeholder="Your position"
                className={cn(touched.jobTitle && errors.jobTitle && "border-red-500")}
              />
              {touched.jobTitle && errors.jobTitle && (
                <p className="text-sm text-red-500">{errors.jobTitle}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Participant Role *</Label>
              <Select value={formData.role} onValueChange={(v) => updateField('role', v)}>
                <SelectTrigger className={cn(touched.role && errors.role && "border-red-500")}>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Athlete">Athlete</SelectItem>
                  <SelectItem value="Official">Official</SelectItem>
                  <SelectItem value="Media">Media</SelectItem>
                  <SelectItem value="VIP">VIP Guest</SelectItem>
                  <SelectItem value="Staff">Staff</SelectItem>
                  <SelectItem value="Vendor">Vendor</SelectItem>
                </SelectContent>
              </Select>
              {touched.role && errors.role && (
                <p className="text-sm text-red-500">{errors.role}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency">Emergency Contact Number</Label>
              <Input
                id="emergency"
                value={formData.emergencyContact}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  updateField('emergencyContact', value);
                }}
                placeholder="1234567890"
              />
            </div>
          </div>
        );

      case 4:
        {
          const todayMinDate = getLocalDateString();
          const departureMinDate =
            formData.arrivalDate && formData.arrivalDate > todayMinDate
              ? formData.arrivalDate
              : todayMinDate;

        return (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="arrival">Preferred Arrival Date</Label>
                <Input
                  id="arrival"
                  type="date"
                  min={todayMinDate}
                  value={formData.arrivalDate}
                  onChange={(e) => updateField('arrivalDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="departure">Preferred Departure Date</Label>
                <Input
                  id="departure"
                  type="date"
                  min={departureMinDate}
                  value={formData.departureDate}
                  onChange={(e) => updateField('departureDate', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Services Required</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="accommodation"
                    checked={formData.needsAccommodation}
                    onCheckedChange={(v) => updateField('needsAccommodation', v)}
                  />
                  <Label htmlFor="accommodation" className="font-normal">I need accommodation</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="transport"
                    checked={formData.needsTransport}
                    onCheckedChange={(v) => updateField('needsTransport', v)}
                  />
                  <Label htmlFor="transport" className="font-normal">I need airport transfers</Label>
                </div>
              </div>
            </div>

            {/* Travel Preferences Section - shown when needsTransport is checked */}
            {formData.needsTransport && (
              <div className="space-y-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
                <h3 className="font-medium flex items-center gap-2">
                  <Plane className="h-4 w-4 text-primary" />
                  Air Travel Preferences
                </h3>
                <p className="text-sm text-muted-foreground">
                  Please provide your travel preferences so we can arrange your flights.
                </p>

                {/* Origin Details */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="originCity">Origin City *</Label>
                    <Input
                      id="originCity"
                      placeholder="e.g., القاهرة / Cairo"
                      value={formData.originCity}
                      onChange={(e) => updateField('originCity', e.target.value)}
                      onBlur={() => setTouched(prev => ({ ...prev, originCity: true }))}
                      className={cn(touched.originCity && errors.originCity && "border-red-500")}
                    />
                    {touched.originCity && errors.originCity && (
                      <p className="text-sm text-red-500">{errors.originCity}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="departureAirport">Departure Airport *</Label>
                    <Select
                      value={formData.departureAirport}
                      onValueChange={(v) => updateField('departureAirport', v)}
                    >
                      <SelectTrigger className={cn(touched.departureAirport && errors.departureAirport && "border-red-500")}>
                        <SelectValue placeholder="Select airport" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DXB">DXB - دبي / Dubai</SelectItem>
                        <SelectItem value="DOH">DOH - الدوحة / Doha</SelectItem>
                        <SelectItem value="RUH">RUH - الرياض / Riyadh</SelectItem>
                        <SelectItem value="JED">JED - جدة / Jeddah</SelectItem>
                        <SelectItem value="KWI">KWI - الكويت / Kuwait</SelectItem>
                        <SelectItem value="BAH">BAH - البحرين / Bahrain</SelectItem>
                        <SelectItem value="MCT">MCT - مسقط / Muscat</SelectItem>
                        <SelectItem value="AMM">AMM - عمّان / Amman</SelectItem>
                        <SelectItem value="CAI">CAI - القاهرة / Cairo</SelectItem>
                        <SelectItem value="BEY">BEY - بيروت / Beirut</SelectItem>
                        <SelectItem value="KHI">KHI - كراتشي / Karachi</SelectItem>
                        <SelectItem value="LHR">LHR - London Heathrow</SelectItem>
                        <SelectItem value="JFK">JFK - New York</SelectItem>
                        <SelectItem value="CDG">CDG - Paris</SelectItem>
                        <SelectItem value="FRA">FRA - Frankfurt</SelectItem>
                      </SelectContent>
                    </Select>
                    {touched.departureAirport && errors.departureAirport && (
                      <p className="text-sm text-red-500">{errors.departureAirport}</p>
                    )}
                  </div>
                </div>

                {/* Seat & Meal Preferences */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Seat Preference</Label>
                    <RadioGroup
                      value={formData.seatPreference}
                      onValueChange={(v: 'Window' | 'Aisle' | 'Middle' | 'No Preference') =>
                        updateField('seatPreference', v)
                      }
                      className="flex flex-wrap gap-3"
                    >
                      {['Window', 'Aisle', 'Middle', 'No Preference'].map((opt) => (
                        <div key={opt} className="flex items-center space-x-1">
                          <RadioGroupItem value={opt} id={`seat-${opt}`} />
                          <Label htmlFor={`seat-${opt}`} className="text-sm cursor-pointer">{opt}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mealPreference">Meal Preference</Label>
                    <Select
                      value={formData.mealPreference}
                      onValueChange={(v) => updateField('mealPreference', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="حلال / Halal">حلال / Halal</SelectItem>
                        <SelectItem value="Vegetarian">Vegetarian</SelectItem>
                        <SelectItem value="Vegan">Vegan</SelectItem>
                        <SelectItem value="Gluten-Free">Gluten-Free</SelectItem>
                        <SelectItem value="No Special Meal">No Special Meal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Special Requirements */}
                <div className="space-y-2">
                  <Label htmlFor="specialRequirements">Special Requirements</Label>
                  <Textarea
                    id="specialRequirements"
                    placeholder="Wheelchair assistance, medical needs, sports equipment, etc."
                    value={formData.specialRequirements}
                    onChange={(e) => updateField('specialRequirements', e.target.value)}
                    rows={2}
                  />
                </div>

                {/* Travel Emergency Contact */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="travelEmergencyContact">Emergency Contact Name *</Label>
                    <Input
                      id="travelEmergencyContact"
                      placeholder="Full name"
                      value={formData.travelEmergencyContact}
                      onChange={(e) => updateField('travelEmergencyContact', e.target.value)}
                      onBlur={() => setTouched(prev => ({ ...prev, travelEmergencyContact: true }))}
                      className={cn(touched.travelEmergencyContact && errors.travelEmergencyContact && "border-red-500")}
                    />
                    {touched.travelEmergencyContact && errors.travelEmergencyContact && (
                      <p className="text-sm text-red-500">{errors.travelEmergencyContact}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="travelEmergencyPhone">Emergency Contact Phone *</Label>
                    <Input
                      id="travelEmergencyPhone"
                      placeholder="1234567890"
                      value={formData.travelEmergencyPhone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        updateField('travelEmergencyPhone', value);
                      }}
                      onBlur={() => setTouched(prev => ({ ...prev, travelEmergencyPhone: true }))}
                      className={cn(touched.travelEmergencyPhone && errors.travelEmergencyPhone && "border-red-500")}
                    />
                    {touched.travelEmergencyPhone && errors.travelEmergencyPhone && (
                      <p className="text-sm text-red-500">{errors.travelEmergencyPhone}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="dietary">Dietary Requirements</Label>
              <Textarea
                id="dietary"
                value={formData.dietaryRequirements}
                onChange={(e) => updateField('dietaryRequirements', e.target.value)}
                placeholder="Any allergies or dietary restrictions..."
                rows={3}
              />
            </div>
          </div>
        );
        }

      case 5:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please upload the following documents. Accepted formats: PDF, JPG, PNG (max 5MB each).
            </p>
            <div className="space-y-4">
              {/* Passport Copy */}
              <div>
                <input
                  ref={passportInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload('Passport', file);
                  }}
                />
                {getDocByType('Passport') ? (
                  <div className="border-2 rounded-lg p-4 flex items-center justify-between bg-status-success-bg border-status-success/30">
                    <div className="flex items-center gap-3">
                      <FileText className="h-6 w-6 text-status-success" />
                      <div>
                        <p className="font-medium">Passport Copy</p>
                        <p className="text-sm text-muted-foreground">{getDocByType('Passport')!.fileName}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeDoc('Passport')}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => passportInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="font-medium">Passport Copy</p>
                    <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                  </div>
                )}
              </div>

              {/* Profile Photo for Badge/Accreditation */}
              <div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload('Photo', file);
                  }}
                />
                {getDocByType('Photo') ? (
                  <div className="border-2 rounded-lg p-4 bg-status-success-bg border-status-success/30">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium">Profile Photo</p>
                        <p className="text-sm text-muted-foreground">{getDocByType('Photo')!.fileName}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeDoc('Photo')}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {/* Photo Preview */}
                    <div className="flex justify-center">
                      <img
                        src={getDocByType('Photo')!.fileData}
                        alt="Profile preview"
                        className="w-32 h-40 object-cover rounded-lg border-2 border-white shadow-md"
                      />
                    </div>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      This photo will appear on your accreditation badge
                    </p>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <User className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="font-medium">Profile Photo *</p>
                    <p className="text-sm text-muted-foreground">This will be used on your accreditation badge</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG or PNG, passport-style photo recommended</p>
                  </div>
                )}
              </div>

              {/* Press Credentials (Media only) */}
              {formData.role === 'Media' && (
                <div>
                  <input
                    ref={pressInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload('Press Credentials', file);
                    }}
                  />
                  {getDocByType('Press Credentials') ? (
                    <div className="border-2 rounded-lg p-4 flex items-center justify-between bg-status-success-bg border-status-success/30">
                      <div className="flex items-center gap-3">
                        <FileText className="h-6 w-6 text-status-success" />
                        <div>
                          <p className="font-medium">Press Credentials</p>
                          <p className="text-sm text-muted-foreground">{getDocByType('Press Credentials')!.fileName}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeDoc('Press Credentials')}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => pressInputRef.current?.click()}
                    >
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="font-medium">Press Credentials</p>
                      <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {uploadedDocs.length > 0 && (
              <p className="text-sm text-status-success">
                {uploadedDocs.length} document(s) uploaded
              </p>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h3 className="font-medium">Event</h3>
              <div className="text-sm">
                <span className="text-muted-foreground">Selected Event:</span>{' '}
                {lockedEvent?.name || lockedEvent?.title || availableEvents.find(e => e.id === formData.eventId)?.name || availableEvents.find(e => e.id === formData.eventId)?.title || 'N/A'}
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h3 className="font-medium">Personal Information</h3>
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Name:</span> {formData.firstName} {formData.lastName}</div>
                <div><span className="text-muted-foreground">Email:</span> {formData.email}</div>
                <div><span className="text-muted-foreground">Phone:</span> {formData.phone}</div>
                <div><span className="text-muted-foreground">Nationality:</span> {formData.nationality}</div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h3 className="font-medium">Professional Details</h3>
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Organization:</span> {formData.organization}</div>
                <div><span className="text-muted-foreground">Title:</span> {formData.jobTitle}</div>
                <div><span className="text-muted-foreground">Role:</span> {formData.role}</div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h3 className="font-medium">Travel & Services</h3>
              <div className="text-sm space-y-1">
                {formData.arrivalDate && <div><span className="text-muted-foreground">Arrival:</span> {formData.arrivalDate}</div>}
                {formData.departureDate && <div><span className="text-muted-foreground">Departure:</span> {formData.departureDate}</div>}
                <div className="flex gap-2 mt-2">
                  {formData.needsVisa && <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded">Visa Assistance</span>}
                  {formData.needsAccommodation && <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded">Accommodation</span>}
                  {formData.needsTransport && <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded">Transfers</span>}
                </div>
              </div>
            </div>

            {uploadedDocs.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h3 className="font-medium">Uploaded Documents</h3>
                <div className="space-y-1">
                  {uploadedDocs.map((doc) => (
                    <div key={doc.type} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-status-success" />
                      <span>{doc.type}: {doc.fileName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 p-4 border rounded-lg">
              <Checkbox
                id="terms"
                checked={formData.agreeTerms}
                onCheckedChange={(v) => updateField('agreeTerms', v)}
              />
              <Label htmlFor="terms" className="font-normal text-sm leading-relaxed">
                I confirm that the information provided is accurate and I agree to the event's terms and conditions and privacy policy.
              </Label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const events = eventStore.getAll();
  const event = events.length > 0 ? events[0] : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Event Header */}
        <div className="text-center mb-8">
          {/* <h1 className="text-2xl font-bold">{event?.name || 'Event Registration'}</h1> */}
          <p className="text-muted-foreground">Registration Form</p>
        </div>

        {/* Progress Steps with Error Indicators */}
        <div className="flex justify-between mb-8">
          {steps.map((step) => {
            const stepErrors = getStepErrors(step.id);
            const hasErrors = stepErrors.length > 0;

            return (
              <div key={step.id} className="flex flex-col items-center gap-2">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-colors relative",
                  currentStep >= step.id
                    ? hasErrors
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}>
                  <step.icon className="h-5 w-5" />
                  {hasErrors && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-medium">
                      {stepErrors.length}
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-xs hidden sm:block",
                  hasErrors ? "text-destructive font-medium" : currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep - 1].title}</CardTitle>
          </CardHeader>
          <CardContent>
            {renderStep()}

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1 || (isInvitationLocked && currentStep === 2)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              {currentStep < 6 ? (
                <Button onClick={nextStep}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!formData.agreeTerms || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Registration'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;




