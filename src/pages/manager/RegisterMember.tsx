import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Upload, FileText, Plane, Check, User, X, Loader2, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { getTeamById, listTeamMembers, updateTeamMember } from '@/api/teamApi';
import { getTeamRegistrations, updateRegistrationForm, uploadRegistrationDocuments } from '@/api/registrationApi';

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

const RegisterMemberPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const membershipId = searchParams.get('membershipId');
  const teamId = searchParams.get('teamId');

  const [activeTab, setActiveTab] = useState('personal');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const [personal, setPersonal] = useState({
    phone: '', nationality: '', passportNumber: '', passportExpiry: '',
    organization: '', jobTitle: '', dietaryNotes: '', accessibilityNeeds: '',
    emergencyContact: '', emergencyPhone: '',
  });

  const [travel, setTravel] = useState({
    needsVisa: false, needsAccommodation: false, needsTransport: false,
    arrivalDate: '', departureDate: '',
    originCity: '', departureAirport: '', seatPreference: 'No Preference' as 'Window' | 'Aisle' | 'No Preference',
    mealPreference: '', specialRequirements: '',
    travelEmergencyContact: '', travelEmergencyPhone: '',
    dietaryRequirements: '', medicalConditions: '',
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['manager', 'registerMember', membershipId, teamId],
    queryFn: async () => {
      const [teamData, members, registrations] = await Promise.all([
        getTeamById(teamId as string).catch(() => null),
        listTeamMembers(teamId as string),
        getTeamRegistrations(teamId as string).catch(() => []),
      ]);

      const found = (members || []).find((m: any) => String(m.id) === String(membershipId));
      const participantIdForReg = found?.participant?.id;
      const reg = (registrations || []).find((r: any) =>
        String(r.participant?.id || r.participantId) === String(participantIdForReg),
      );

      return { team: teamData, member: found || null, registration: reg || null };
    },
    enabled: !!membershipId && !!teamId,
  });

  const team = data?.team ?? null;
  const member = data?.member ?? null;
  const registration = data?.registration ?? null;

  useEffect(() => {
    if (error) {
      console.error('Failed to load member registration:', error);
      toast.error('Failed to load member details');
    }
  }, [error]);

  // Only hydrate the form once per member — a background refetch (e.g. after a
  // document upload) must never clobber in-progress, unsaved personal/travel edits.
  const hydratedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!member) return;
    const key = `${membershipId}:${teamId}`;
    if (hydratedKeyRef.current === key) return;
    hydratedKeyRef.current = key;

    const p = member.participant || {};
    setPersonal({
      phone: p.phone || '',
      nationality: p.nationality || '',
      passportNumber: p.passportNumber || '',
      passportExpiry: p.passportExpiry || '',
      organization: p.organization || '',
      jobTitle: p.jobTitle || '',
      dietaryNotes: p.dietaryNotes || '',
      accessibilityNeeds: p.accessibilityNeeds || '',
      emergencyContact: p.emergencyContact || '',
      emergencyPhone: p.emergencyPhone || '',
    });
    const booking = registration?.travelBooking || {};
    setTravel({
      needsVisa: Boolean(member.needsVisa || registration?.needsVisa),
      needsAccommodation: Boolean(member.needsAccommodation || registration?.needsAccommodation),
      needsTransport: Boolean(member.needsTransport || registration?.needsTransport),
      arrivalDate: registration?.arrivalDate || '',
      departureDate: registration?.departureDate || '',
      originCity: member.originCity || booking.originCity || '',
      departureAirport: booking.departureAirport || '',
      seatPreference: booking.seatPreference || 'No Preference',
      mealPreference: booking.mealPreference || '',
      specialRequirements: booking.specialRequirements || '',
      travelEmergencyContact: booking.emergencyContact || '',
      travelEmergencyPhone: booking.emergencyPhone || '',
      dietaryRequirements: member.dietaryRequirements || '',
      medicalConditions: member.medicalConditions || '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member, registration, membershipId, teamId]);

  type DocType = 'Passport' | 'Photo' | 'Press Credentials';

  const docBackendType = (docType: DocType) =>
    docType === 'Passport' ? 'passport_copy' : docType === 'Photo' ? 'profile_photo' : 'press_credentials';

  const handleFileUpload = async (docType: DocType, file: File) => {
    if (!registration?.registrationId) {
      toast.error('This team is not linked to an event yet — documents can be uploaded once it is.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 2MB.');
      return;
    }

    setUploadingDoc(docType);
    try {
      await uploadRegistrationDocuments(registration.registrationId, [
        { file, type: docBackendType(docType) },
      ]);
      toast.success(`${docType} uploaded successfully`);
      await refetch();
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || `Failed to upload ${docType}`;
      toast.error(msg);
    } finally {
      setUploadingDoc(null);
    }
  };

  const getUploadedDoc = (docType: DocType) => {
    const backendType = docBackendType(docType);
    return (registration?.documents || []).find((d: any) => d.type === backendType);
  };

  const isPersonalComplete = Boolean(
    personal.passportNumber && personal.organization && personal.jobTitle,
  );
  const documentsComplete = Boolean(getUploadedDoc('Passport') && getUploadedDoc('Photo'));

  const calculateProgress = () => {
    let completed = 0;
    if (isPersonalComplete) completed++;
    if (documentsComplete) completed++;
    return Math.round((completed / 2) * 100);
  };

  const handleSaveRegistration = async () => {
    if (!member) return;

    setIsSaving(true);
    try {
      await updateTeamMember(member.id, {
        phone: personal.phone,
        nationality: personal.nationality,
        passportNumber: personal.passportNumber,
        passportExpiry: personal.passportExpiry,
        organization: personal.organization,
        jobTitle: personal.jobTitle,
        dietaryNotes: personal.dietaryNotes,
        accessibilityNeeds: personal.accessibilityNeeds,
        emergencyContact: personal.emergencyContact,
        emergencyPhone: personal.emergencyPhone,
        needsVisa: travel.needsVisa,
        needsAccommodation: travel.needsAccommodation,
        needsTransport: travel.needsTransport,
        originCity: travel.originCity,
        dietaryRequirements: travel.dietaryRequirements,
        medicalConditions: travel.medicalConditions,
      });

      if (registration?.id) {
        const servicesRequired = [
          ...(travel.needsAccommodation ? ['accommodation'] : []),
          ...(travel.needsTransport ? ['airporttransfer'] : []),
        ];
        await updateRegistrationForm(registration.id, {
          phone: personal.phone,
          nationality: personal.nationality,
          passportNumber: personal.passportNumber,
          passportExpiry: personal.passportExpiry,
          organization: personal.organization,
          jobTitle: personal.jobTitle,
          emergencyContactName: personal.emergencyContact,
          emergencyContactPhone: personal.emergencyPhone,
          preferredArrivalDate: travel.arrivalDate,
          preferredDepartureDate: travel.departureDate,
          needsVisa: travel.needsVisa,
          servicesRequired,
          dietaryRequirements: travel.dietaryRequirements,
          originCity: travel.originCity,
          departureAirport: travel.departureAirport,
          seatPreference: travel.seatPreference,
          mealPreference: travel.mealPreference,
          specialRequirements: travel.specialRequirements,
          travelEmergencyContactName: travel.travelEmergencyContact,
          travelEmergencyContactPhone: travel.travelEmergencyPhone,
        });
      } else {
        toast.info('Saved member profile — travel itinerary details will save once this team is linked to an event.');
      }

      toast.success('Member registration saved');
      navigate(-1);
    } catch (error: any) {
      console.error('Failed to save member registration:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to save registration';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">Member not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const participant = member.participant || {};

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back
      </Button>

      <div>
        <h1 className="text-3xl font-bold">Complete Registration</h1>
        <p className="text-muted-foreground mt-1">
          {participant.firstName} {participant.lastName} · {team?.name || 'Team'}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Registration Progress</span>
            <span className="text-sm text-muted-foreground">{calculateProgress()}%</span>
          </div>
          <Progress value={calculateProgress()} className="h-2" />
        </CardContent>
      </Card>

      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="personal" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Personal
              </TabsTrigger>
              <TabsTrigger value="professional" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Professional
              </TabsTrigger>
              <TabsTrigger value="travel" className="flex items-center gap-2">
                <Plane className="h-4 w-4" />
                Travel
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documents
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent>
            <TabsContent value="personal" className="space-y-4 mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={personal.phone} onChange={(e) => setPersonal(prev => ({ ...prev, phone: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Nationality</Label>
                  <Input value={personal.nationality} onChange={(e) => setPersonal(prev => ({ ...prev, nationality: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Passport Number *</Label>
                  <Input value={personal.passportNumber} onChange={(e) => setPersonal(prev => ({ ...prev, passportNumber: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Passport Expiry</Label>
                  <Input type="date" value={personal.passportExpiry} onChange={(e) => setPersonal(prev => ({ ...prev, passportExpiry: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Emergency Contact Name</Label>
                  <Input value={personal.emergencyContact} onChange={(e) => setPersonal(prev => ({ ...prev, emergencyContact: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Emergency Contact Phone</Label>
                  <Input value={personal.emergencyPhone} onChange={(e) => setPersonal(prev => ({ ...prev, emergencyPhone: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={() => setActiveTab('professional')}>Next: Professional</Button>
              </div>
            </TabsContent>

            <TabsContent value="professional" className="space-y-4 mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Organization *</Label>
                  <Input value={personal.organization} onChange={(e) => setPersonal(prev => ({ ...prev, organization: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Job Title *</Label>
                  <Input value={personal.jobTitle} onChange={(e) => setPersonal(prev => ({ ...prev, jobTitle: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dietary Notes</Label>
                <Textarea value={personal.dietaryNotes} onChange={(e) => setPersonal(prev => ({ ...prev, dietaryNotes: e.target.value }))} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Accessibility Needs</Label>
                <Textarea value={personal.accessibilityNeeds} onChange={(e) => setPersonal(prev => ({ ...prev, accessibilityNeeds: e.target.value }))} rows={2} />
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setActiveTab('personal')}>Previous</Button>
                <Button onClick={() => setActiveTab('travel')}>Next: Travel</Button>
              </div>
            </TabsContent>

            <TabsContent value="travel" className="space-y-4 mt-0">
              <div className="flex flex-col gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="needsTransport"
                    checked={travel.needsTransport}
                    onCheckedChange={(checked) => setTravel(prev => ({ ...prev, needsTransport: !!checked }))}
                  />
                  <Label htmlFor="needsTransport">Requires Air Travel Arrangement</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="needsAccommodation"
                    checked={travel.needsAccommodation}
                    onCheckedChange={(checked) => setTravel(prev => ({ ...prev, needsAccommodation: !!checked }))}
                  />
                  <Label htmlFor="needsAccommodation">Requires Accommodation</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="needsVisa"
                    checked={travel.needsVisa}
                    onCheckedChange={(checked) => setTravel(prev => ({ ...prev, needsVisa: !!checked }))}
                  />
                  <Label htmlFor="needsVisa">Requires Visa Assistance</Label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-2">
                  <Label>Preferred Arrival Date</Label>
                  <Input type="date" value={travel.arrivalDate} onChange={(e) => setTravel(prev => ({ ...prev, arrivalDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Preferred Departure Date</Label>
                  <Input type="date" value={travel.departureDate} onChange={(e) => setTravel(prev => ({ ...prev, departureDate: e.target.value }))} />
                </div>
              </div>

              {travel.needsTransport && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Plane className="h-4 w-4" />
                    Flight Preferences
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Origin City *</Label>
                      <Input value={travel.originCity} onChange={(e) => setTravel(prev => ({ ...prev, originCity: e.target.value }))} placeholder="e.g., London, Dubai" />
                    </div>
                    <div className="space-y-2">
                      <Label>Departure Airport</Label>
                      <Select value={travel.departureAirport} onValueChange={(v) => setTravel(prev => ({ ...prev, departureAirport: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select airport" />
                        </SelectTrigger>
                        <SelectContent>
                          {AIRPORTS.map(a => (
                            <SelectItem key={a.code} value={a.code}>{a.code} - {a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Seat Preference</Label>
                      <Select value={travel.seatPreference} onValueChange={(v: 'Window' | 'Aisle' | 'No Preference') => setTravel(prev => ({ ...prev, seatPreference: v }))}>
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
                      <Input value={travel.mealPreference} onChange={(e) => setTravel(prev => ({ ...prev, mealPreference: e.target.value }))} placeholder="e.g., Halal, Vegetarian" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Special Requirements</Label>
                    <Textarea value={travel.specialRequirements} onChange={(e) => setTravel(prev => ({ ...prev, specialRequirements: e.target.value }))} placeholder="Wheelchair assistance, medical equipment, etc." rows={2} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Travel Emergency Contact Name</Label>
                      <Input value={travel.travelEmergencyContact} onChange={(e) => setTravel(prev => ({ ...prev, travelEmergencyContact: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Travel Emergency Contact Phone</Label>
                      <Input value={travel.travelEmergencyPhone} onChange={(e) => setTravel(prev => ({ ...prev, travelEmergencyPhone: e.target.value }))} />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2 border-t pt-4">
                <Label>Dietary Requirements (for this event)</Label>
                <Textarea value={travel.dietaryRequirements} onChange={(e) => setTravel(prev => ({ ...prev, dietaryRequirements: e.target.value }))} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Medical Conditions</Label>
                <Textarea value={travel.medicalConditions} onChange={(e) => setTravel(prev => ({ ...prev, medicalConditions: e.target.value }))} rows={2} />
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setActiveTab('professional')}>Previous</Button>
                <Button onClick={() => setActiveTab('documents')}>Next: Documents</Button>
              </div>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4 mt-0">
              {!registration?.registrationId && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  This team isn't linked to an event yet — documents can be uploaded once it's attached to an approved delegation.
                </div>
              )}
              <div className="space-y-3">
                {(['Passport', 'Photo', 'Press Credentials'] as const).map((docType) => {
                  const existing = getUploadedDoc(docType);
                  return (
                    <div key={docType} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {docType}
                            {docType === 'Press Credentials' && <span className="text-muted-foreground font-normal"> (optional, for Media)</span>}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {existing ? (existing.fileName || 'Uploaded') : 'Not uploaded'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {existing && <Check className="h-5 w-5 text-status-success" />}
                        <Button
                          variant={existing ? 'outline' : 'default'}
                          size="sm"
                          disabled={uploadingDoc === docType || !registration?.registrationId}
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*,.pdf';
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) void handleFileUpload(docType, file);
                            };
                            input.click();
                          }}
                        >
                          {uploadingDoc === docType ? 'Uploading...' : existing ? 'Replace' : (<><Upload className="h-4 w-4 mr-1" />Upload</>)}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setActiveTab('travel')}>Previous</Button>
                <Button onClick={handleSaveRegistration} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Registration'}
                </Button>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default RegisterMemberPage;
