import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useManagerSession } from '@/contexts/ManagerSessionContext';
import { teamStore, teamMemberStore, Team, TEAM_ROLES } from '@/lib/teamStore';
import { Plus, Save, Users, UserPlus, Trash2, ChevronLeft, Search, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { getMyTeams, addTeamMember, addTeamMembersBulk, listTeamMembers } from '@/api/teamApi';
import { getMyDelegations } from '@/api/delegationApi';
import { getManagerParticipants } from '@/api/participantApi';
import {
  getPendingTeamRegistrations,
  removePendingTeamRegistrations,
  RegisteredParticipantOption,
} from '@/api/registrationApi';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Participant extends RegisteredParticipantOption {}

interface MemberRow {
  participantId: string;
  participant: Participant | null;
  role: string;
  needsVisa: boolean;
  needsAccommodation: boolean;
  needsTransport: boolean;
  originCity: string;
  dietaryRequirements: string;
  medicalConditions: string;
  search: string;
  dropdownOpen: boolean;
}

const emptyRow = (): MemberRow => ({
  participantId: '',
  participant: null,
  role: '',
  needsVisa: false,
  needsAccommodation: false,
  needsTransport: false,
  originCity: '',
  dietaryRequirements: '',
  medicalConditions: '',
  search: '',
  dropdownOpen: false,
});

// ─── Participant helpers ──────────────────────────────────────────────────────

const participantName = (p: Participant) =>
  p.firstName && p.lastName ? `${p.firstName} ${p.lastName}` : (p.name || p.email || p.id);

const participantInitials = (p: Participant) => {
  const n = participantName(p);
  return n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
};

const resolveTeamEventId = (team?: any): string =>
  String(team?.eventId || team?.event_id || team?.event?.id || team?.event?._id || '');

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

const getMemberParticipantId = (member: any): string =>
  String(
    member?.participantId ||
    member?.participant_id ||
    member?.participant?.id ||
    member?.participant?._id ||
    '',
  );

const getMemberEmail = (member: any): string =>
  String(member?.email || member?.participant?.email || '').toLowerCase();

const loadRegisteredParticipantsForTeam = async (
  teamId: string,
): Promise<Participant[]> => {
  const pendingEntries = getPendingTeamRegistrations(teamId);
  const pendingIds = new Set(pendingEntries.map((entry) => entry.participantId));

  let teamMembers: any[] = [];
  if (teamId.startsWith('team-')) {
    teamMembers = teamMemberStore.getByTeam(teamId);
  } else {
    try {
      teamMembers = await listTeamMembers(teamId);
    } catch {
      teamMembers = [];
    }
  }

  const existingParticipantIds = new Set<string>();
  const existingEmails = new Set<string>();
  for (const member of teamMembers) {
    const participantId = getMemberParticipantId(member);
    if (participantId) existingParticipantIds.add(participantId);
    const email = getMemberEmail(member);
    if (email) existingEmails.add(email);
  }

  const managerParticipants = await getManagerParticipants();
  const available = new Map<string, Participant>();

  for (const participant of managerParticipants) {
    if (existingParticipantIds.has(participant.id)) continue;
    if (participant.email && existingEmails.has(participant.email.toLowerCase())) continue;

    available.set(participant.id, {
      id: participant.id,
      registrationId: participant.id,
      firstName: participant.firstName,
      lastName: participant.lastName,
      name: `${participant.firstName || ''} ${participant.lastName || ''}`.trim() || participant.email,
      email: participant.email,
      phone: participant.phone,
      nationality: participant.nationality,
      passportNumber: participant.passportNumber,
      gender: participant.gender,
      role: participant.role,
    });
  }

  for (const pending of pendingEntries) {
    if (existingParticipantIds.has(pending.participantId)) continue;
    if (pending.email && existingEmails.has(pending.email.toLowerCase())) continue;
    if (available.has(pending.participantId)) continue;

    available.set(pending.participantId, {
      id: pending.participantId,
      registrationId: pending.registrationId,
      firstName: pending.firstName,
      lastName: pending.lastName,
      name: `${pending.firstName || ''} ${pending.lastName || ''}`.trim() || pending.email,
      email: pending.email,
    });
  }

  // Include pending entries that may not yet appear in GET /manager/participants
  for (const pendingId of pendingIds) {
    if (available.has(pendingId) || existingParticipantIds.has(pendingId)) continue;
    const pending = pendingEntries.find((entry) => entry.participantId === pendingId);
    if (!pending) continue;
    available.set(pendingId, {
      id: pending.participantId,
      registrationId: pending.registrationId,
      firstName: pending.firstName,
      lastName: pending.lastName,
      name: `${pending.firstName || ''} ${pending.lastName || ''}`.trim() || pending.email,
      email: pending.email,
    });
  }

  return Array.from(available.values());
};

// ─── Component ───────────────────────────────────────────────────────────────

const AddMembersPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { manager } = useManagerSession();

  const [teams, setTeams] = useState<Team[]>([]);
  const [delegations, setDelegations] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);

  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);

  const [rows, setRows] = useState<MemberRow[]>([emptyRow()]);
  const [isSaving, setIsSaving] = useState(false);

  const searchRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Load teams ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (manager) loadTeams();
  }, [manager, searchParams]);

  const loadTeams = async () => {
    setIsLoadingTeams(true);
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
        if (!merged.find((st: any) => st.id === lt.id)) {
          merged.push({
            ...enrichTeamWithDelegationEvent(lt, delegationsData),
            memberCount: teamMemberStore.getByTeam(lt.id).length,
          });
        }
      }
      setTeams(merged);
      const teamIdParam = searchParams.get('teamId');
      if (teamIdParam && merged.some((t: any) => t.id === teamIdParam)) {
        setSelectedTeamId(teamIdParam);
      }
    } catch {
      toast.error('Failed to load teams');
    } finally {
      setIsLoadingTeams(false);
    }
  };

  useEffect(() => {
    if (!selectedTeamId) {
      setAllParticipants([]);
      setRows([emptyRow()]);
      return;
    }

    if (!teams.some((entry) => entry.id === selectedTeamId)) return;

    setIsLoadingParticipants(true);
    loadRegisteredParticipantsForTeam(selectedTeamId)
      .then(setAllParticipants)
      .catch((error) => {
        console.error('Failed to load registered participants:', error);
        toast.error('Failed to load registered members');
        setAllParticipants([]);
      })
      .finally(() => setIsLoadingParticipants(false));

    setRows([emptyRow()]);
  }, [selectedTeamId, teams, delegations]);

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  // ── Row helpers ─────────────────────────────────────────────────────────────

  const updateRow = <K extends keyof MemberRow>(index: number, key: K, value: MemberRow[K]) => {
    setRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const selectParticipant = (index: number, p: Participant) => {
    setRows(prev => {
      const next = [...prev];
      const defaultRole =
        p.role && TEAM_ROLES.includes(p.role as any) ? p.role : next[index].role;

      next[index] = {
        ...next[index],
        participantId: p.id,
        participant: p,
        search: participantName(p),
        dropdownOpen: false,
        role: defaultRole,
        originCity: next[index].originCity || p.nationality || '',
        dietaryRequirements: next[index].dietaryRequirements,
      };
      return next;
    });
  };

  const clearParticipant = (index: number) => {
    setRows(prev => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        participantId: '',
        participant: null,
        search: '',
        dropdownOpen: false,
      };
      return next;
    });
  };

  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = (index: number) => {
    if (rows.length > 1) setRows(prev => prev.filter((_, i) => i !== index));
  };

  // ── Filter participants per row ─────────────────────────────────────────────

  const filteredParticipants = (row: MemberRow, rowIndex: number) => {
    const selectedElsewhere = new Set(
      rows
        .filter((_, index) => index !== rowIndex)
        .map((entry) => entry.participantId)
        .filter(Boolean),
    );

    const available = allParticipants.filter(
      (participant) => !selectedElsewhere.has(participant.id),
    );

    const q = row.search.toLowerCase().trim();
    if (!q) return available;
    return available.filter(p => {
      const name = participantName(p).toLowerCase();
      const email = (p.email || '').toLowerCase();
      const passport = (p.passportNumber || '').toLowerCase();
      return name.includes(q) || email.includes(q) || passport.includes(q);
    });
  };

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!selectedTeamId) { toast.error('Please select a team first'); return; }

    const validRows = rows.filter(r => r.participantId && r.role);
    if (validRows.length === 0) {
      toast.error('Please select a participant and role for at least one member');
      return;
    }

    setIsSaving(true);

    try {
      const isLocalTeam = selectedTeamId.startsWith('team-');

      if (isLocalTeam) {
        let savedCount = 0;
        for (const r of validRows) {
          const p = r.participant!;
          teamMemberStore.create({
            teamId: selectedTeamId,
            firstName: p.firstName || '',
            lastName: p.lastName || '',
            email: p.email || '',
            phone: p.phone || '',
            nationality: p.nationality || '',
            passportNumber: p.passportNumber || '',
            passportExpiry: '',
            dateOfBirth: '',
            gender: (p.gender as any) || 'Male',
            sportCategory:
              typeof selectedTeam?.sportCategory === 'string'
                ? selectedTeam.sportCategory
                : (selectedTeam?.sportCategory as any)?.name || '',
            subCategory: selectedTeam?.subCategory || '',
            role: r.role,
            emergencyContact: '',
            emergencyPhone: '',
            dietaryRequirements: r.dietaryRequirements,
            medicalConditions: r.medicalConditions,
          });
          savedCount++;
        }
        toast.success(`${savedCount} member(s) added successfully!`);
      } else {
        const mapRowToPayload = (r: MemberRow) => ({
          participantId: r.participantId,
          role: r.role,
          needsVisa: r.needsVisa,
          needsAccommodation: r.needsAccommodation,
          needsTransport: r.needsTransport,
          originCity: r.originCity,
          dietaryRequirements: r.dietaryRequirements,
          medicalConditions: r.medicalConditions,
        });

        if (validRows.length === 1) {
          await addTeamMember(selectedTeamId, mapRowToPayload(validRows[0]));
        } else {
          const membersPayload = validRows.map(mapRowToPayload);
          await addTeamMembersBulk(selectedTeamId, membersPayload);
        }

        toast.success(`${validRows.length} member(s) added successfully!`);
      }

      removePendingTeamRegistrations(
        selectedTeamId,
        validRows.map((row) => row.participantId),
      );

      setRows([emptyRow()]);

      const refreshed = await loadRegisteredParticipantsForTeam(selectedTeamId);
        setAllParticipants(refreshed);
    } catch (error: any) {
      const detail =
        error?.response?.data?.message ||
        JSON.stringify(error?.response?.data) ||
        error.message;
      toast.error('Failed to add members: ' + detail);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/manager/teams')}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Teams
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Add Team Members</h1>
        <p className="text-muted-foreground mt-1">
          Select registered members and add them to the team/delegation
        </p>
      </div>

      {/* Team Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Team</CardTitle>
          <CardDescription>Choose which team to add members to</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTeams ? (
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
                    {team.name} (
                    {typeof team.sportCategory === 'string'
                      ? team.sportCategory
                      : (team.sportCategory as any)?.name}
                    )
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>
{/*
      {selectedTeamId && (
        <Card className="border-dashed">
          <CardContent className="py-4">
            <p className="font-medium">
              {isLoadingParticipants
                ? 'Loading registered members…'
                : `${allParticipants.length} registered member(s) ready to add`}
            </p>
            <p className="text-sm text-muted-foreground">
              Only members registered on the Register page for this team/event appear here.
            </p>
          </CardContent>
        </Card>
      )}
*/}
      {/* Add Members Form */}
      {selectedTeamId && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg">Add Members</CardTitle>
                <CardDescription>
                  Adding to:{' '}
                  <span className="font-medium text-foreground">{selectedTeam?.name}</span>
                  {isLoadingParticipants && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Loading participants…
                    </span>
                  )}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addRow}>
                <Plus className="h-4 w-4 mr-1" />
                Add Another
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {rows.map((row, index) => (
              <div
                key={index}
                className="border rounded-xl p-5 space-y-5 bg-muted/20"
              >
                {/* Row header */}
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold flex items-center gap-2 text-sm">
                    <UserPlus className="h-4 w-4 text-primary" />
                    Member {index + 1}
                    {row.participant && (
                      <Badge className="text-xs">{participantName(row.participant)}</Badge>
                    )}
                  </h4>
                  {rows.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeRow(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                {/* ── Participant Search ── */}
                <div className="space-y-2">
                  <Label className="font-medium">
                    Participant <span className="text-destructive">*</span>
                  </Label>

                  {row.participant ? (
                    /* Selected state */
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-primary/5 border-primary/20">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                          {participantInitials(row.participant)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{participantName(row.participant)}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {row.participant.email || ''}
                          {row.participant.passportNumber
                            ? ` • ${row.participant.passportNumber}`
                            : ''}
                          {row.participant.nationality
                            ? ` • ${row.participant.nationality}`
                            : ''}
                        </p>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => clearParticipant(index)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    /* Search state */
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          ref={el => { searchRefs.current[index] = el; }}
                          className="pl-9"
                          placeholder="Search registered member by name, email or passport…"
                          value={row.search}
                          onChange={e => {
                            updateRow(index, 'search', e.target.value);
                            updateRow(index, 'dropdownOpen', true);
                          }}
                          onFocus={() => updateRow(index, 'dropdownOpen', true)}
                          onBlur={() =>
                            setTimeout(() => updateRow(index, 'dropdownOpen', false), 150)
                          }
                        />
                      </div>

                      {row.dropdownOpen && (
                        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border bg-popover shadow-xl">
                          {isLoadingParticipants ? (
                            <div className="flex items-center justify-center py-6">
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            </div>
                          ) : filteredParticipants(row, index).length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              No registered members available. Register them first on the Register page.
                            </div>
                          ) : (
                            filteredParticipants(row, index).map(p => (
                              <button
                                key={p.id}
                                type="button"
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent text-left transition-colors"
                                onMouseDown={() => selectParticipant(index, p)}
                              >
                                <Avatar className="h-8 w-8 shrink-0">
                                  <AvatarFallback className="text-xs">
                                    {participantInitials(p)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {participantName(p)}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {p.email || ''}
                                    {p.passportNumber ? ` • ${p.passportNumber}` : ''}
                                    {p.nationality ? ` • ${p.nationality}` : ''}
                                  </p>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Role + Origin City ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-medium">
                      Role <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={row.role}
                      onValueChange={v => updateRow(index, 'role', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {TEAM_ROLES.map(role => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-medium">Origin City</Label>
                    <Input
                      value={row.originCity}
                      onChange={e => updateRow(index, 'originCity', e.target.value)}
                      placeholder="e.g. Islamabad"
                    />
                  </div>
                </div>

                {/* ── Toggles ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {(
                    [
                      { key: 'needsVisa', label: 'Needs Visa' },
                      { key: 'needsAccommodation', label: 'Needs Accommodation' },
                      { key: 'needsTransport', label: 'Needs Transport' },
                    ] as const
                  ).map(({ key, label }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-lg border p-3 gap-3"
                    >
                      <Label htmlFor={`${key}-${index}`} className="text-sm cursor-pointer">
                        {label}
                      </Label>
                      <Switch
                        id={`${key}-${index}`}
                        checked={row[key]}
                        onCheckedChange={v => updateRow(index, key, v)}
                      />
                    </div>
                  ))}
                </div>

                {/* ── Dietary + Medical ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Dietary Requirements</Label>
                    <Input
                      value={row.dietaryRequirements}
                      onChange={e => updateRow(index, 'dietaryRequirements', e.target.value)}
                      placeholder="e.g. Halal Protein extensive"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Medical Conditions</Label>
                    <Input
                      value={row.medicalConditions}
                      onChange={e => updateRow(index, 'medicalConditions', e.target.value)}
                      placeholder="e.g. None"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={addRow}>
                <Plus className="h-4 w-4 mr-2" />
                Add More Members
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isSaving ? 'Saving…' : 'Save All Members'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AddMembersPage;
