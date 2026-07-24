import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useManagerSession } from '@/contexts/ManagerSessionContext';
import { teamStore, teamMemberStore, Team, SPORT_CATEGORIES, TEAM_ROLES } from '@/lib/teamStore';
import { Plus, Save, Users, UserPlus, Trash2, ChevronLeft, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getMyTeams, listTeamMembers } from '@/api/teamApi';
import { getMyDelegations } from '@/api/delegationApi';
import { createRegistration, addPendingTeamRegistration, getRegistrationParticipantId } from '@/api/registrationApi';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const COUNTRIES = [
  'Saudi Arabia', 'United Arab Emirates', 'Egypt', 'Jordan', 'Kuwait',
  'Qatar', 'Bahrain', 'Oman', 'Morocco', 'Tunisia', 'Algeria', 'Iraq',
  'USA', 'UK', 'Germany', 'France', 'Japan', 'China', 'Brazil', 'Australia'
];

interface MemberForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  role: string;
  emergencyContact: string;
  emergencyPhone: string;
  dietaryRequirements: string;
  medicalConditions: string;
}

const emptyMember: MemberForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  nationality: '',
  passportNumber: '',
  passportExpiry: '',
  dateOfBirth: '',
  gender: 'Male',
  role: '',
  emergencyContact: '',
  emergencyPhone: '',
  dietaryRequirements: '',
  medicalConditions: '',
};

interface TeamMemberDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  nationality?: string;
  passportNumber?: string;
  passportExpiry?: string;
  dateOfBirth?: string;
  gender?: string;
  role: string;
  status?: string;
  sportCategory?: string;
  subCategory?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  dietaryRequirements?: string;
  medicalConditions?: string;
}

const normalizeTeamMember = (raw: any): TeamMemberDetail | null => {
  if (!raw) return null;
  const source = raw.participant || raw.user || raw;
  const id = raw.id || source.id || source._id || raw.memberId || source.email;
  const email = source.email || raw.email || '';
  const firstName = source.firstName || raw.firstName || '';
  const lastName = source.lastName || raw.lastName || '';
  if (!id && !email) return null;

  return {
    id: String(id),
    firstName: firstName || 'Unknown',
    lastName,
    email,
    phone: source.phone || raw.phone,
    nationality: source.nationality || raw.nationality || source.country || raw.country,
    passportNumber: source.passportNumber || raw.passportNumber || source.passport_number,
    passportExpiry: source.passportExpiry || raw.passportExpiry || source.passport_expiry,
    dateOfBirth: source.dateOfBirth || raw.dateOfBirth || source.date_of_birth,
    gender: source.gender || raw.gender,
    role: source.role || raw.role || raw.jobTitle || source.jobTitle || 'Member',
    status: raw.status || source.status,
    sportCategory: source.sportCategory || raw.sportCategory || source.sport_category,
    subCategory: source.subCategory || raw.subCategory || source.sub_category,
    emergencyContact: source.emergencyContact || raw.emergencyContact || source.emergency_contact,
    emergencyPhone: source.emergencyPhone || raw.emergencyPhone || source.emergency_phone,
    dietaryRequirements: source.dietaryRequirements || raw.dietaryRequirements || source.dietary_requirements,
    medicalConditions: source.medicalConditions || raw.medicalConditions || source.medical_conditions,
  };
};

const formatDetailValue = (value?: string) => (value && value.trim() ? value : 'N/A');

const resolveTeamEventId = (team?: any): string => {
  if (!team) return '';
  return String(team.eventId || team.event_id || team.event?.id || team.event?._id || '');
};

const enrichTeamWithDelegationEvent = (team: any, delegations: any[]): Team => {
  const eventId = resolveTeamEventId(team);
  if (eventId) return { ...(team as Team), eventId };

  const delegationId =
    team?.delegationId ||
    team?.delegation_id ||
    team?.delegation?.id ||
    team?.delegation?._id;
  const delegation = delegations.find((entry) => (entry?.id || entry?._id) === delegationId);
  const delegationEventId =
    delegation?.eventId ||
    delegation?.event_id ||
    delegation?.event?.id ||
    delegation?.event?._id ||
    '';

  return delegationEventId
    ? { ...(team as Team), eventId: String(delegationEventId) }
    : (team as Team);
};

const ManagerRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { manager } = useManagerSession();
  const [teams, setTeams] = useState<Team[]>([]);
  const [delegations, setDelegations] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [members, setMembers] = useState<MemberForm[]>([{ ...emptyMember }]);
  const [currentMembers, setCurrentMembers] = useState<TeamMemberDetail[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMemberDetail | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMembersLoading, setIsMembersLoading] = useState(false);

  const maxDateOfBirth = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (selectedTeamId) {
      loadCurrentMembers();
    } else {
      setCurrentMembers([]);
    }
  }, [selectedTeamId]);

  const loadCurrentMembers = async () => {
    if (!selectedTeamId) {
      setCurrentMembers([]);
      return;
    }

    setIsMembersLoading(true);
    try {
      if (selectedTeamId.startsWith('team-')) {
        const localMembers = teamMemberStore.getByTeam(selectedTeamId);
        setCurrentMembers(
          localMembers
            .map(normalizeTeamMember)
            .filter(Boolean) as TeamMemberDetail[]
        );
        return;
      }

      const teamMembers = await listTeamMembers(selectedTeamId);
      setCurrentMembers(
        (Array.isArray(teamMembers) ? teamMembers : [])
          .map(normalizeTeamMember)
          .filter(Boolean) as TeamMemberDetail[]
        );
    } catch (e) {
      console.error('Failed to load current members:', e);
      toast.error('Failed to load team members');
      setCurrentMembers([]);
    } finally {
      setIsMembersLoading(false);
    }
  };

  useEffect(() => {
    if (manager) {
      loadTeams();
    }
  }, [manager, searchParams]);

  const loadTeams = async () => {
    setIsLoading(true);
    try {
      const [serverTeams, delegationsData] = await Promise.all([
        getMyTeams(),
        getMyDelegations().catch(() => []),
      ]);
      setDelegations(Array.isArray(delegationsData) ? delegationsData : []);

      const localTeams = teamStore.getByManager(manager?.id || '');

      const merged = (Array.isArray(serverTeams) ? serverTeams : []).map((t: any) => ({
        ...enrichTeamWithDelegationEvent(t, delegationsData),
        memberCount: t.memberCount || t.member_count,
      }));

      for (const lt of localTeams) {
        if (!merged.find(st => st.id === lt.id)) {
          const localCount = teamMemberStore.getByTeam(lt.id).length;
          merged.push({
            ...enrichTeamWithDelegationEvent(lt, delegationsData),
            memberCount: localCount,
          });
        }
      }

      setTeams(merged);

      const teamIdParam = searchParams.get('teamId');
      if (teamIdParam && merged.some(t => t.id === teamIdParam)) {
        setSelectedTeamId(teamIdParam);
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
      toast.error('Failed to load teams');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTeam = teams.find(t => t.id === selectedTeamId);
  const selectedTeamEventId = selectedTeam
    ? resolveTeamEventId(enrichTeamWithDelegationEvent(selectedTeam, delegations))
    : '';

  const updateMember = (index: number, field: keyof MemberForm, value: string) => {
    setMembers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addMemberRow = () => {
    setMembers(prev => [...prev, { ...emptyMember }]);
  };

  const removeMemberRow = (index: number) => {
    if (members.length > 1) {
      setMembers(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSaveMembers = async () => {
    if (!selectedTeamId) {
      toast.error('Please select a team first');
      return;
    }

    // Validate members
    const validMembers = members.filter(m =>
      m.firstName && m.lastName && m.email && m.passportNumber && m.role
    );

    if (validMembers.length === 0) {
      toast.error('Please fill in at least one member with required fields');
      return;
    }

    setIsSaving(true);

    try {
      let savedCount = 0;

      for (const m of validMembers) {
        if (!selectedTeam) continue;

        const eventId = selectedTeamEventId;
        if (!eventId) {
          toast.error(`Team "${selectedTeam.name}" has no event assigned. Please link the team to an event.`);
          setIsSaving(false);
          return;
        }

        const isLocalTeam = selectedTeamId.startsWith('team-');

        if (isLocalTeam) {
          const localParticipantId = `local-participant-${Date.now()}-${savedCount}`;
          addPendingTeamRegistration(selectedTeamId, {
            participantId: localParticipantId,
            registrationId: localParticipantId,
            email: m.email,
            firstName: m.firstName,
            lastName: m.lastName,
            registeredAt: new Date().toISOString(),
          });
        } else {
          const formData = new FormData();

          formData.append('eventId', eventId);
          formData.append('teamId', selectedTeamId);
          formData.append('firstName', m.firstName);
          formData.append('lastName', m.lastName);
          formData.append('email', m.email);
          formData.append('phone', m.phone);
          formData.append('nationality', m.nationality || manager?.country || '');
          formData.append('passportNumber', m.passportNumber);
          formData.append('organization', `${m.nationality || manager?.country || ''} Delegation`);
          formData.append('jobTitle', m.role);
          formData.append('participantRole', m.role === 'Athlete' ? 'Athlete' : 'Official');
          formData.append('gender', m.gender.toLowerCase());

          if (m.dateOfBirth) formData.append('dateOfBirth', m.dateOfBirth);
          if (m.passportExpiry) formData.append('passportExpiry', m.passportExpiry);
          if (m.emergencyContact) formData.append('emergencyContact', m.emergencyContact);
          if (m.emergencyPhone) formData.append('emergencyPhone', m.emergencyPhone);
          if (m.dietaryRequirements) formData.append('dietaryRequirements', m.dietaryRequirements);
          if (m.medicalConditions) formData.append('medicalConditions', m.medicalConditions);

          const created = await createRegistration(formData);
          const createdRecord = (created as any)?.data || created;
          const participantId = getRegistrationParticipantId(createdRecord);
          const registrationId = String(createdRecord?.id || createdRecord?._id || '');

          if (participantId) {
            addPendingTeamRegistration(selectedTeamId, {
              participantId,
              registrationId,
              email: m.email,
              firstName: m.firstName,
              lastName: m.lastName,
              registeredAt: new Date().toISOString(),
            });
          }
        }
        savedCount++;
      }

      toast.success(`${savedCount} member(s) registered successfully! Go to Add Members to add them to the team.`);
      setMembers([{ ...emptyMember }]);
    } catch (error: any) {
      console.error('Failed to save members:', error);
      const detail = error?.response?.data?.message || JSON.stringify(error?.response?.data) || error.message;
      toast.error('Failed to save members: ' + detail);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/manager/teams')}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Teams
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Register Members</h1>
        <p className="text-muted-foreground mt-1">
          Register participant details first. They are added to the team/delegation from Add Members.
        </p>
      </div>

      {/* Team Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Team</CardTitle>
          <CardDescription>Choose which team you are registering members for</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-6">
              <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground mb-3">No teams created yet</p>
              <Button onClick={() => navigate('/manager/teams')}>Create a Team First</Button>
            </div>
          ) : (
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map(team => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name} ({typeof team.sportCategory === 'string' ? team.sportCategory : (team.sportCategory as any)?.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

  {/*    {selectedTeamId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Registered — Pending Add to Team</CardTitle>
            <CardDescription>
              These members are registered but not yet in the delegation. Add them from the Add Members page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingRegistrations.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p>No pending registrations for this team</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRegistrations.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 p-3 border rounded-lg border-dashed"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{member.firstName} {member.lastName}</p>
                      <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                    </div>
                    <Badge variant="secondary">Pending Add</Badge>
                  </div>
                ))}
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => navigate(`/manager/add-members?teamId=${selectedTeamId}`)}
                >
                  Go to Add Members
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
*/}
      {/* Team members already added via Add Members */}
      {selectedTeamId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Team Members (In Delegation)</CardTitle>
            <CardDescription>
              Members already added to team: {selectedTeam?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isMembersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : currentMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No team members added yet. Register first, then use Add Members.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setSelectedMember(member)}
                    className="w-full flex items-center justify-between gap-3 p-3 border rounded-lg text-left transition-colors hover:bg-muted/50 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {(member.firstName[0] || '?').toUpperCase()}
                          {(member.lastName[0] || '').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline">{member.role}</Badge>
                      {member.status && (
                        <Badge variant="secondary">{member.status}</Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Member Entry Forms */}
      {selectedTeamId && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg">Register New Members</CardTitle>
                <CardDescription>
                  Registering to: {selectedTeam?.name} • {typeof selectedTeam?.sportCategory === 'string' ? selectedTeam?.sportCategory : (selectedTeam?.sportCategory as any)?.name}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addMemberRow}>
                <Plus className="h-4 w-4 mr-1" />
                Add Another
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {members.map((member, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4 relative">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Member {index + 1}
                  </h4>
                  {members.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMemberRow(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                {/* Personal Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>First Name *</Label>
                    <Input
                      value={member.firstName}
                      onChange={(e) => updateMember(index, 'firstName', e.target.value)}
                      placeholder="First name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name *</Label>
                    <Input
                      value={member.lastName}
                      onChange={(e) => updateMember(index, 'lastName', e.target.value)}
                      placeholder="Last name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={member.email}
                      onChange={(e) => updateMember(index, 'email', e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={member.phone}
                      onChange={(e) => updateMember(index, 'phone', e.target.value)}
                      placeholder="+966 XXX XXX XXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nationality</Label>
                    <Select
                      value={member.nationality}
                      onValueChange={(v) => updateMember(index, 'nationality', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Input
                      type="date"
                      max={maxDateOfBirth}
                      value={member.dateOfBirth}
                      onChange={(e) => updateMember(index, 'dateOfBirth', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Passport Number *</Label>
                    <Input
                      value={member.passportNumber}
                      onChange={(e) => updateMember(index, 'passportNumber', e.target.value.toUpperCase())}
                      placeholder="A12345678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Passport Expiry</Label>
                    <Input
                      type="date"
                      value={member.passportExpiry}
                      onChange={(e) => updateMember(index, 'passportExpiry', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <RadioGroup
                      value={member.gender}
                      onValueChange={(v) => updateMember(index, 'gender', v)}
                      className="flex gap-4 pt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Male" id={`male-${index}`} />
                        <Label htmlFor={`male-${index}`} className="font-normal">Male</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Female" id={`female-${index}`} />
                        <Label htmlFor={`female-${index}`} className="font-normal">Female</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Role/Position *</Label>
                    <Select
                      value={member.role}
                      onValueChange={(v) => updateMember(index, 'role', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {TEAM_ROLES.map(role => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Dietary Requirements</Label>
                    <Input
                      value={member.dietaryRequirements}
                      onChange={(e) => updateMember(index, 'dietaryRequirements', e.target.value)}
                      placeholder="e.g., Halal, Vegetarian"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Emergency Contact Name</Label>
                    <Input
                      value={member.emergencyContact}
                      onChange={(e) => updateMember(index, 'emergencyContact', e.target.value)}
                      placeholder="Contact name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Emergency Contact Phone</Label>
                    <Input
                      value={member.emergencyPhone}
                      onChange={(e) => updateMember(index, 'emergencyPhone', e.target.value)}
                      placeholder="+966 XXX XXX XXXX"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Medical Conditions (Optional)</Label>
                  <Textarea
                    value={member.medicalConditions}
                    onChange={(e) => updateMember(index, 'medicalConditions', e.target.value)}
                    placeholder="Any medical conditions or allergies..."
                    rows={2}
                  />
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={addMemberRow}>
                <Plus className="h-4 w-4 mr-2" />
                Add More Members
              </Button>
              <Button onClick={handleSaveMembers} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save All Members'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    {(selectedMember.firstName[0] || '?').toUpperCase()}
                    {(selectedMember.lastName[0] || '').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">
                    {selectedMember.firstName} {selectedMember.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedMember.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-start">
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="font-medium">{formatDetailValue(selectedMember.role)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {selectedMember.status ? (
                    <Badge variant="secondary">{selectedMember.status}</Badge>
                  ) : (
                    <p className="font-medium">N/A</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{formatDetailValue(selectedMember.phone)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nationality</p>
                  <p className="font-medium">{formatDetailValue(selectedMember.nationality)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Passport Number</p>
                  <p className="font-medium font-mono">{formatDetailValue(selectedMember.passportNumber)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Passport Expiry</p>
                  <p className="font-medium">{formatDetailValue(selectedMember.passportExpiry)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">{formatDetailValue(selectedMember.dateOfBirth)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gender</p>
                  <p className="font-medium">{formatDetailValue(selectedMember.gender)}</p>
                </div>
                {selectedMember.sportCategory && (
                  <div>
                    <p className="text-sm text-muted-foreground">Sport</p>
                    <p className="font-medium">{formatDetailValue(selectedMember.sportCategory)}</p>
                  </div>
                )}
                {selectedMember.subCategory && (
                  <div>
                    <p className="text-sm text-muted-foreground">Sub Category</p>
                    <p className="font-medium">{formatDetailValue(selectedMember.subCategory)}</p>
                  </div>
                )}
              </div>

              {selectedMember.dietaryRequirements && (
                <div className="text-start">
                  <p className="text-sm text-muted-foreground">Dietary Requirements</p>
                  <p className="font-medium">{selectedMember.dietaryRequirements}</p>
                </div>
              )}
              {selectedMember.medicalConditions && (
                <div className="text-start">
                  <p className="text-sm text-muted-foreground">Medical Conditions</p>
                  <p className="font-medium">{selectedMember.medicalConditions}</p>
                </div>
              )}
              {(selectedMember.emergencyContact || selectedMember.emergencyPhone) && (
                <div className="text-start">
                  <p className="text-sm text-muted-foreground">Emergency Contact</p>
                  <p className="font-medium">
                    {formatDetailValue(selectedMember.emergencyContact)}
                    {selectedMember.emergencyPhone ? ` · ${selectedMember.emergencyPhone}` : ''}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagerRegisterPage;
