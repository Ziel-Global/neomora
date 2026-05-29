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
import { getMyTeams, listTeamMembers } from '@/api/teamApi';
import { getMyRegistrations, createRegistration } from '@/api/registrationApi';
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

const AddMembersPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { manager } = useManagerSession();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [members, setMembers] = useState<MemberForm[]>([{ ...emptyMember }]);
  const [currentMembers, setCurrentMembers] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMembersLoading, setIsMembersLoading] = useState(false);

  useEffect(() => {
    if (selectedTeamId) {
      loadCurrentMembers();
    } else {
      setCurrentMembers([]);
    }
  }, [selectedTeamId]);

  const loadCurrentMembers = async () => {
    setIsMembersLoading(true);
    try {
      if (selectedTeamId.startsWith('team-')) {
        const members = teamMemberStore.getByTeam(selectedTeamId);
        setCurrentMembers(members);
      } else {
        // For server teams, try to get from registrations first as it's more comprehensive for managers
        const [regs, teamMembers] = await Promise.all([
          getMyRegistrations().catch(() => []),
          listTeamMembers(selectedTeamId).catch(() => [])
        ]);

        // Filter registrations for this team and merge with team members
        const teamRegs = regs.filter((r: any) => r.teamId === selectedTeamId || r.team_id === selectedTeamId || r.team?.id === selectedTeamId);

        // Merge them avoiding duplicates by ID or Email
        const merged = [...teamRegs];
        for (const tm of teamMembers) {
          const participant = (tm as any).participant || tm;
          if (!merged.find((r: any) => r.id === tm.id || (r.participant || r).email === participant.email)) {
            merged.push(tm);
          }
        }

        setCurrentMembers(merged);
      }
    } catch (e) {
      console.error('Failed to load current members:', e);
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
      const serverTeams = await getMyTeams();
      const localTeams = teamStore.getByManager(manager?.id || '');

      const merged = serverTeams.map((t: any) => ({
        ...t,
        memberCount: t.memberCount || t.member_count 
      }));

      for (const lt of localTeams) {
        if (!merged.find(st => st.id === lt.id)) {
          const localCount = teamMemberStore.getByTeam(lt.id).length;
          merged.push({ ...lt, memberCount: localCount });
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

        const eventId = selectedTeam.eventId || (selectedTeam as any).event?.id;
        if (!eventId) {
          toast.error(`Team "${selectedTeam.name}" has no event ID. Please update the team.`);
          return;
        }

        const isLocalTeam = selectedTeamId.startsWith('team-');

        if (isLocalTeam) {
          // Save to local store
          teamMemberStore.create({
            teamId: selectedTeamId,
            firstName: m.firstName,
            lastName: m.lastName,
            email: m.email,
            phone: m.phone,
            nationality: m.nationality || manager?.country || '',
            passportNumber: m.passportNumber,
            passportExpiry: m.passportExpiry,
            dateOfBirth: m.dateOfBirth,
            gender: m.gender,
            sportCategory: typeof selectedTeam.sportCategory === 'string' ? selectedTeam.sportCategory : (selectedTeam.sportCategory as any)?.name,
            subCategory: selectedTeam.subCategory || '',
            role: m.role,
            emergencyContact: m.emergencyContact,
            emergencyPhone: m.emergencyPhone,
            dietaryRequirements: m.dietaryRequirements,
            medicalConditions: m.medicalConditions,
          });
        } else {
          // Use the server API
          const formData = new FormData();
          const eventId = selectedTeam.eventId || (selectedTeam as any).event?.id;
          if (!eventId) {
            toast.error(`Team "${selectedTeam.name}" has no event ID. Please update the team.`);
            return;
          }

          formData.append('teamId', selectedTeamId);
          formData.append('eventId', eventId);
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

          await createRegistration(formData);
        }
        savedCount++;
      }

      toast.success(`${savedCount} member(s) registered successfully!`);
      setMembers([{ ...emptyMember }]);
      loadCurrentMembers(); // Refresh the list
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
        <h1 className="text-3xl font-bold">Add Team Members</h1>
        <p className="text-muted-foreground mt-1">
          Register athletes and staff for your teams
        </p>
      </div>

      {/* Team Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Team</CardTitle>
          <CardDescription>Choose which team to add members to</CardDescription>
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

      {/* Member Entry Forms */}
      {selectedTeamId && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg">Team Members</CardTitle>
                <CardDescription>
                  Adding to: {selectedTeam?.name} • {typeof selectedTeam?.sportCategory === 'string' ? selectedTeam?.sportCategory : (selectedTeam?.sportCategory as any)?.name}
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
    </div>
  );
};
export default AddMembersPage;

