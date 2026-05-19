import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useManagerSession } from '@/contexts/ManagerSessionContext';
import { teamMemberStore, teamStore, TeamMember } from '@/lib/teamStore';
import {
  eventStore,
  participantStore,
  registrationStore,
  travelStore,
  generateRegistrationId
} from '@/lib/emsStore';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Upload, FileText, Plane, Hotel, CreditCard, Check, User, X } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

const AIRPORTS = [
  { code: 'RUH', name: 'Riyadh (King Khalid)' },
  { code: 'JED', name: 'Jeddah (King Abdulaziz)' },
  { code: 'DXB', name: 'Dubai International' },
  { code: 'DOH', name: 'Doha (Hamad)' },
  { code: 'CAI', name: 'Cairo International' },
  { code: 'LHR', name: 'London Heathrow' },
  { code: 'CDG', name: 'Paris Charles de Gaulle' },
  { code: 'FRA', name: 'Frankfurt' },
  { code: 'JFK', name: 'New York JFK' },
];

interface DocumentUpload {
  type: string;
  fileName: string;
  fileData?: string;
  uploadedAt: string;
  status: 'Pending' | 'Verified' | 'Rejected';
}

const REQUIRED_DOCUMENTS = ['Passport', 'Photo', 'Medical Certificate'];

const MEMBER_DOCS_KEY = 'ems_member_documents';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const RegisterMemberPage: React.FC = () => {
  const { manager } = useManagerSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const eventId = searchParams.get('eventId');

  const [member, setMember] = useState<TeamMember | null>(null);
  const [event, setEvent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('travel');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Travel preferences state
  const [travelPrefs, setTravelPrefs] = useState({
    needsVisa: false,
    needsAccommodation: true,
    needsTransport: true,
    originCity: '',
    departureAirport: '',
    preferredArrivalDate: '',
    preferredDepartureDate: '',
    seatPreference: 'No Preference' as 'Window' | 'Aisle' | 'No Preference',
    mealPreference: '',
    specialRequirements: '',
  });

  // Documents state
  const [documents, setDocuments] = useState<DocumentUpload[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  useEffect(() => {
    if (email && manager) {
      // Find the team member by email
      const allMembers = teamMemberStore.getByManager(manager.id);
      const found = allMembers.find(m => m.email.toLowerCase() === email.toLowerCase());

      if (found) {
        setMember(found);
        // Load existing travel preferences if any (from bulk set or previous entry)
        if (found.travelPreferences) {
          setTravelPrefs({
            needsVisa: found.travelPreferences.needsVisa ?? false,
            needsAccommodation: found.travelPreferences.needsAccommodation ?? true,
            needsTransport: found.travelPreferences.needsTransport ?? true,
            originCity: found.travelPreferences.originCity || '',
            departureAirport: found.travelPreferences.departureAirport || '',
            preferredArrivalDate: found.travelPreferences.preferredArrivalDate || '',
            preferredDepartureDate: found.travelPreferences.preferredDepartureDate || '',
            seatPreference: found.travelPreferences.seatPreference || 'No Preference',
            mealPreference: found.travelPreferences.mealPreference || '',
            specialRequirements: found.travelPreferences.specialRequirements || '',
          });
        }
        // Load existing documents
        if (found.documents) {
          setDocuments(found.documents);
        }
      } else {
        // Check if participant exists but not in our teams
        const participant = participantStore.getByEmail(email);
        if (participant) {
          // Create a virtual member representation
          setMember({
            id: participant.id,
            teamId: '',
            firstName: participant.firstName,
            lastName: participant.lastName,
            email: participant.email,
            phone: participant.phone,
            nationality: participant.nationality,
            passportNumber: participant.passportNumber || '',
            passportExpiry: participant.passportExpiry || '',
            dateOfBirth: '',
            gender: 'Male',
            sportCategory: '',
            subCategory: '',
            role: participant.role,
            emergencyContact: participant.emergencyContact || '',
            emergencyPhone: '',
            dietaryRequirements: participant.dietaryNotes,
            medicalConditions: '',
            status: 'Draft',
            createdAt: participant.createdAt,
            updatedAt: participant.updatedAt,
          });
        }
      }
    }

    if (eventId) {
      const e = eventStore.getById(eventId);
      setEvent(e);
    }
  }, [email, eventId, manager]);

  const handleFileUpload = async (docType: string, file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large. Maximum size is 2MB.');
      return;
    }

    setUploadingDoc(docType);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileData = e.target?.result as string;

        // Create document entry
        const newDoc: DocumentUpload = {
          type: docType,
          fileName: file.name,
          fileData,
          uploadedAt: new Date().toISOString(),
          status: 'Pending',
        };

        setDocuments(prev => {
          // Replace if exists, otherwise add
          const filtered = prev.filter(d => d.type !== docType);
          return [...filtered, newDoc];
        });

        toast.success(`${docType} uploaded successfully`);
        setUploadingDoc(null);
      };
      reader.onerror = () => {
        toast.error('Failed to read file');
        setUploadingDoc(null);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to upload document');
      setUploadingDoc(null);
    }
  };

  const getDocumentStatus = (docType: string) => {
    const doc = documents.find(d => d.type === docType);
    return doc ? doc : null;
  };

  const calculateProgress = () => {
    let completed = 0;
    const total = 3; // Travel, Documents, Confirmation

    // Travel preferences filled
    if (travelPrefs.needsTransport && travelPrefs.originCity && travelPrefs.departureAirport) {
      completed++;
    } else if (!travelPrefs.needsTransport) {
      completed++;
    }

    // Documents uploaded
    const uploadedDocs = REQUIRED_DOCUMENTS.filter(dt => getDocumentStatus(dt));
    if (uploadedDocs.length >= 2) {
      completed++;
    }

    // Ready for submission
    if (completed === 2) {
      completed++;
    }

    return Math.round((completed / total) * 100);
  };

  const handleSubmitRegistration = async () => {
    if (!member || !event) {
      toast.error('Missing member or event information');
      return;
    }

    setIsSubmitting(true);

    try {
      // Update team member with travel preferences and documents
      if (member.teamId) {
        teamMemberStore.update(member.id, {
          travelPreferences: travelPrefs,
          documents: documents,
          registrationStatus: 'Submitted',
        });
      }

      // Find or get participant
      let participant = participantStore.getByEmail(member.email);

      if (!participant) {
        // Create participant from team member data
        participant = participantStore.create({
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          phone: member.phone,
          nationality: member.nationality,
          passportNumber: member.passportNumber,
          passportExpiry: member.passportExpiry,
          organization: `${member.nationality} Delegation`,
          jobTitle: member.role,
          role: member.role === 'Athlete' ? 'Athlete' : 'Official',
          dietaryNotes: member.dietaryRequirements,
          accessibilityNeeds: '',
          emergencyContact: member.emergencyContact,
        });
      }

      // Create registration
      const registration = registrationStore.create({
        eventId: event.id,
        participantId: participant.id,
        status: 'Submitted',
        formData: {
          needsVisa: travelPrefs.needsVisa,
          needsAccommodation: travelPrefs.needsAccommodation,
          needsTransport: travelPrefs.needsTransport,
          arrivalDate: travelPrefs.preferredArrivalDate,
          departureDate: travelPrefs.preferredDepartureDate,
          dietaryRequirements: member.dietaryRequirements,
          agreeTerms: true,
        },
        documents: documents.map(d => ({
          type: d.type as any,
          fileName: d.fileName,
          uploadedAt: d.uploadedAt,
          status: d.status,
        })),
        submittedAt: new Date().toISOString(),
        reviewedAt: null,
      });

      // Create travel booking if needed
      if (travelPrefs.needsTransport) {
        travelStore.create({
          participantId: participant.id,
          registrationId: registration.id,
          originCity: travelPrefs.originCity,
          departureAirport: travelPrefs.departureAirport,
          preferredDates: `${travelPrefs.preferredArrivalDate} to ${travelPrefs.preferredDepartureDate}`,
          preferredDepartureDate: travelPrefs.preferredArrivalDate,
          preferredReturnDate: travelPrefs.preferredDepartureDate,
          status: 'Requested',
          pnr: null,
          ticketNumber: null,
          airline: null,
          seatNumber: null,
          cabinClass: null,
          baggageAllowance: null,
          seatPreference: travelPrefs.seatPreference,
          mealPreference: travelPrefs.mealPreference,
          specialRequirements: travelPrefs.specialRequirements,
          emergencyContact: member.emergencyContact,
          emergencyPhone: member.emergencyPhone,
          rejectionReason: null,
          approvalComments: null,
          requestedAt: new Date().toISOString(),
          approvedAt: null,
          ticketedAt: null,
          itinerary: [],
        });
      }

      toast.success('Registration submitted successfully!');
      navigate('/manager/registrations');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Failed to submit registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!member || !event) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/manager/invitations')}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Invitations
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">Member or event not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/manager/invitations')}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Register Member</h1>
        <p className="text-muted-foreground mt-1">
          Complete registration for {member.firstName} {member.lastName}
        </p>
      </div>

      {/* Member & Event Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Member Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="font-medium">{member.firstName} {member.lastName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{member.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Passport</p>
                <p className="font-medium font-mono">{member.passportNumber || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Role</p>
                <p className="font-medium">{member.role || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Event Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Event</p>
                <p className="font-medium">{event.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Location</p>
                <p className="font-medium">{event.city}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Start Date</p>
                <p className="font-medium">{new Date(event.startDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">End Date</p>
                <p className="font-medium">{new Date(event.endDate).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Registration Progress</span>
            <span className="text-sm text-muted-foreground">{calculateProgress()}%</span>
          </div>
          <Progress value={calculateProgress()} className="h-2" />
        </CardContent>
      </Card>

      {/* Registration Form Tabs */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="travel" className="flex items-center gap-2">
                <Plane className="h-4 w-4" />
                Travel
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="confirm" className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Confirm
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent>
            {/* Travel Preferences Tab */}
            <TabsContent value="travel" className="space-y-6 mt-0">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Travel & Logistics</h3>

                <div className="flex flex-col gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="needsTransport"
                      checked={travelPrefs.needsTransport}
                      onCheckedChange={(checked) =>
                        setTravelPrefs(prev => ({ ...prev, needsTransport: !!checked }))
                      }
                    />
                    <Label htmlFor="needsTransport">Requires Air Travel Arrangement</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="needsAccommodation"
                      checked={travelPrefs.needsAccommodation}
                      onCheckedChange={(checked) =>
                        setTravelPrefs(prev => ({ ...prev, needsAccommodation: !!checked }))
                      }
                    />
                    <Label htmlFor="needsAccommodation">Requires Accommodation</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="needsVisa"
                      checked={travelPrefs.needsVisa}
                      onCheckedChange={(checked) =>
                        setTravelPrefs(prev => ({ ...prev, needsVisa: !!checked }))
                      }
                    />
                    <Label htmlFor="needsVisa">Requires Visa Assistance</Label>
                  </div>
                </div>

                {travelPrefs.needsTransport && (
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Plane className="h-4 w-4" />
                      Flight Preferences
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Origin City *</Label>
                        <Input
                          value={travelPrefs.originCity}
                          onChange={(e) => setTravelPrefs(prev => ({ ...prev, originCity: e.target.value }))}
                          placeholder="e.g., London, Dubai"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Departure Airport *</Label>
                        <Select
                          value={travelPrefs.departureAirport}
                          onValueChange={(v) => setTravelPrefs(prev => ({ ...prev, departureAirport: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select airport" />
                          </SelectTrigger>
                          <SelectContent>
                            {AIRPORTS.map(a => (
                              <SelectItem key={a.code} value={a.code}>
                                {a.code} - {a.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Preferred Arrival Date</Label>
                        <Input
                          type="date"
                          value={travelPrefs.preferredArrivalDate}
                          onChange={(e) => setTravelPrefs(prev => ({ ...prev, preferredArrivalDate: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Preferred Departure Date</Label>
                        <Input
                          type="date"
                          value={travelPrefs.preferredDepartureDate}
                          onChange={(e) => setTravelPrefs(prev => ({ ...prev, preferredDepartureDate: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Seat Preference</Label>
                        <Select
                          value={travelPrefs.seatPreference}
                          onValueChange={(v: any) => setTravelPrefs(prev => ({ ...prev, seatPreference: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Window">Window</SelectItem>
                            <SelectItem value="Aisle">Aisle</SelectItem>
                            <SelectItem value="No Preference">No Preference</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Meal Preference</Label>
                        <Input
                          value={travelPrefs.mealPreference}
                          onChange={(e) => setTravelPrefs(prev => ({ ...prev, mealPreference: e.target.value }))}
                          placeholder="e.g., Halal, Vegetarian"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Special Requirements</Label>
                      <Textarea
                        value={travelPrefs.specialRequirements}
                        onChange={(e) => setTravelPrefs(prev => ({ ...prev, specialRequirements: e.target.value }))}
                        placeholder="Any special assistance, medical equipment, etc."
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <Button onClick={() => setActiveTab('documents')}>
                    Next: Documents
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-6 mt-0">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Required Documents</h3>
                <p className="text-sm text-muted-foreground">
                  Upload the required documents for this registration. Maximum file size: 2MB.
                </p>

                <div className="space-y-3">
                  {REQUIRED_DOCUMENTS.map(docType => {
                    const existingDoc = getDocumentStatus(docType);
                    return (
                      <div key={docType} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{docType}</p>
                            {existingDoc ? (
                              <p className="text-sm text-muted-foreground">{existingDoc.fileName}</p>
                            ) : (
                              <p className="text-sm text-muted-foreground">Not uploaded</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {existingDoc && (
                            <Check className="h-5 w-5 text-status-success" />
                          )}
                          <Button
                            variant={existingDoc ? 'outline' : 'default'}
                            size="sm"
                            disabled={uploadingDoc === docType}
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*,.pdf';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) handleFileUpload(docType, file);
                              };
                              input.click();
                            }}
                          >
                            {uploadingDoc === docType ? (
                              'Uploading...'
                            ) : existingDoc ? (
                              'Replace'
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-1" />
                                Upload
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Optional Documents */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Additional Documents (Optional)</h4>
                  <div className="flex items-center justify-between p-4 border rounded-lg border-dashed">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Insurance Certificate</p>
                        {getDocumentStatus('Insurance') ? (
                          <p className="text-sm text-muted-foreground">{getDocumentStatus('Insurance')?.fileName}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground">Optional</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*,.pdf';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) handleFileUpload('Insurance', file);
                        };
                        input.click();
                      }}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Upload
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setActiveTab('travel')}>
                    Previous
                  </Button>
                  <Button onClick={() => setActiveTab('confirm')}>
                    Next: Confirm
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Confirmation Tab */}
            <TabsContent value="confirm" className="space-y-6 mt-0">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Review & Submit</h3>
                <p className="text-sm text-muted-foreground">
                  Please review the registration details before submitting.
                </p>

                {/* Summary */}
                <div className="space-y-4">
                  <Card className="bg-muted/30">
                    <CardContent className="pt-6">
                      <h4 className="font-medium mb-3">Travel & Logistics</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          {travelPrefs.needsTransport ? (
                            <Check className="h-4 w-4 text-status-success" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span>Air Travel</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {travelPrefs.needsAccommodation ? (
                            <Check className="h-4 w-4 text-status-success" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span>Accommodation</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {travelPrefs.needsVisa ? (
                            <Check className="h-4 w-4 text-status-success" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span>Visa Assistance</span>
                        </div>
                      </div>
                      {travelPrefs.needsTransport && (
                        <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">From</p>
                            <p className="font-medium">{travelPrefs.originCity} ({travelPrefs.departureAirport})</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Arrival Date</p>
                            <p className="font-medium">{travelPrefs.preferredArrivalDate || 'Not specified'}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/30">
                    <CardContent className="pt-6">
                      <h4 className="font-medium mb-3">Documents ({documents.length} uploaded)</h4>
                      <div className="space-y-2">
                        {REQUIRED_DOCUMENTS.map(docType => {
                          const doc = getDocumentStatus(docType);
                          return (
                            <div key={docType} className="flex items-center gap-2 text-sm">
                              {doc ? (
                                <Check className="h-4 w-4 text-status-success" />
                              ) : (
                                <X className="h-4 w-4 text-status-error" />
                              )}
                              <span>{docType}</span>
                              {doc && <span className="text-muted-foreground">({doc.fileName})</span>}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setActiveTab('documents')}>
                    Previous
                  </Button>
                  <Button onClick={handleSubmitRegistration} disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Registration'}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default RegisterMemberPage;