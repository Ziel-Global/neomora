import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CountryCombobox } from '@/components/common/CountryCombobox';
import { useManagerSession } from '@/contexts/ManagerSessionContext';
import { teamStore, teamMemberStore, Team, TEAM_ROLES } from '@/lib/teamStore';
import {
  Plus,
  Save,
  Users,
  UserPlus,
  Trash2,
  ChevronLeft,
  Search,
  CheckCircle2,
  X,
  UserPlus2,
  LayoutGrid,
  List,
  Sparkles,
  FolderKanban,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getMyTeams, addTeamMember, addTeamMembersBulk, listTeamMembers, deleteTeamMember, resolveTeamMembershipId, syncTeamMemberCount } from '@/api/teamApi';
import { getMyDelegations } from '@/api/delegationApi';
import { getManagerParticipants, createManagerParticipant, ManagerParticipantPayload } from '@/api/participantApi';
import {
  getPendingTeamRegistrations,
  removePendingTeamRegistrations,
  RegisteredParticipantOption,
} from '@/api/registrationApi';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const VIEW_MODE_KEY = 'ems_manager_add_members_view_mode';
type ViewMode = 'cards' | 'table';

const readStoredViewMode = (): ViewMode => {
  try {
    return localStorage.getItem(VIEW_MODE_KEY) === 'table' ? 'table' : 'cards';
  } catch {
    return 'cards';
  }
};

const selectTriggerClass =
  'h-10 rounded-xl border-border/80 bg-card font-medium shadow-sm transition-colors hover:border-border hover:bg-muted/30 focus:ring-primary/25 [&>span]:flex [&>span]:items-center [&>span]:gap-2';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Participant extends RegisteredParticipantOption {}

interface MemberRow {
  participantId: string;
  participant: Participant | null;
  role: string;
  search: string;
  dropdownOpen: boolean;
}

interface CurrentTeamMember {
  id: string;
  membershipId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

const mapToCurrentTeamMember = (raw: any): CurrentTeamMember | null => {
  if (!raw) return null;
  const membershipId = resolveTeamMembershipId(raw);
  const source = raw.participant || raw.user || raw;
  const id = membershipId || String(source.id || source._id || raw.email || '');
  if (!id) return null;

  return {
    id,
    membershipId: membershipId || id,
    firstName: source.firstName || raw.firstName || 'Unknown',
    lastName: source.lastName || raw.lastName || '',
    email: source.email || raw.email || '',
    role: source.role || raw.role || raw.jobTitle || source.jobTitle || 'Member',
  };
};

const emptyRow = (): MemberRow => ({
  participantId: '',
  participant: null,
  role: '',
  search: '',
  dropdownOpen: false,
});

interface NewParticipantForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  nationality: string;
  organization: string;
  jobTitle: string;
}

const emptyNewParticipantForm = (): NewParticipantForm => ({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  gender: '',
  nationality: '',
  organization: '',
  jobTitle: '',
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
      sports: participant.sports,
      teamRole: participant.teamRole,
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

  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>(readStoredViewMode);

  const [rows, setRows] = useState<MemberRow[]>([emptyRow()]);
  const [isSaving, setIsSaving] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<CurrentTeamMember | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  // Inline "create a brand new participant" dialog, opened from a row's
  // search dropdown. Collects the full participant field set (matching the
  // admin Participants form) rather than a stripped-down subset, and wires
  // the created participant straight into whichever row opened it.
  const [creatingParticipantForIndex, setCreatingParticipantForIndex] = useState<number | null>(null);
  const [newParticipantForm, setNewParticipantForm] = useState<NewParticipantForm>(emptyNewParticipantForm());
  const [isCreatingParticipant, setIsCreatingParticipant] = useState(false);

  const searchRefs = useRef<(HTMLInputElement | null)[]>([]);
  const scaffoldedForTeamRef = useRef<string | null>(null);

  // ── Load teams ──────────────────────────────────────────────────────────────
  const {
    data: teamsData,
    isLoading: isLoadingTeams,
    error: teamsError,
  } = useQuery({
    queryKey: ['manager', 'addMembers', 'teams'],
    queryFn: async () => {
      const [serverTeams, delegationsData] = await Promise.all([
        getMyTeams(),
        getMyDelegations().catch(() => []),
      ]);

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

      return { teams: merged, delegations: Array.isArray(delegationsData) ? delegationsData : [] };
    },
    enabled: !!manager,
  });

  const teams = teamsData?.teams ?? [];
  const delegations = teamsData?.delegations ?? [];

  useEffect(() => {
    if (teamsError) toast.error('Failed to load teams');
  }, [teamsError]);

  useEffect(() => {
    const teamIdParam = searchParams.get('teamId');
    if (teamIdParam && teams.some((t: any) => t.id === teamIdParam) && selectedTeamId !== teamIdParam) {
      setSelectedTeamId(teamIdParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams, searchParams]);

  useEffect(() => {
    setRows([emptyRow()]);
    scaffoldedForTeamRef.current = null;
  }, [selectedTeamId]);

  const teamIsReady = !!selectedTeamId && teams.some((entry) => entry.id === selectedTeamId);

  const {
    data: allParticipants = [],
    isLoading: isLoadingParticipants,
    error: participantsError,
    refetch: refetchParticipants,
  } = useQuery({
    queryKey: ['manager', 'addMembers', 'participants', selectedTeamId],
    queryFn: () => loadRegisteredParticipantsForTeam(selectedTeamId),
    enabled: teamIsReady,
  });

  useEffect(() => {
    if (participantsError) {
      console.error('Failed to load registered participants:', participantsError);
      toast.error('Failed to load registered members');
    }
  }, [participantsError]);

  const {
    data: currentMembers = [],
    isLoading: isLoadingCurrentMembers,
    refetch: refetchCurrentMembers,
  } = useQuery({
    queryKey: ['manager', 'addMembers', 'currentMembers', selectedTeamId],
    queryFn: async () => {
      if (selectedTeamId.startsWith('team-')) {
        const localMembers = teamMemberStore.getByTeam(selectedTeamId);
        return localMembers.map(mapToCurrentTeamMember).filter(Boolean) as CurrentTeamMember[];
      }

      const teamMembers = await listTeamMembers(selectedTeamId);
      return (Array.isArray(teamMembers) ? teamMembers : [])
        .map(mapToCurrentTeamMember)
        .filter(Boolean) as CurrentTeamMember[];
    },
    enabled: teamIsReady,
  });

  // A freshly-created team bound to a declared delegation slot starts its
  // roster pre-scaffolded: one row per required member, each already
  // labeled with its role, instead of one blank row the manager has to
  // configure from scratch. Only applies once per team selection (guarded
  // by scaffoldedForTeamRef) and only while the team has no members yet, so
  // it never clobbers in-progress edits or an already-built roster.
  useEffect(() => {
    if (!selectedTeamId || isLoadingCurrentMembers) return;
    if (scaffoldedForTeamRef.current === selectedTeamId) return;
    scaffoldedForTeamRef.current = selectedTeamId;
    if (currentMembers.length > 0) return;

    const team = teams.find((t: any) => t.id === selectedTeamId);
    if (!team || team.expectedTeamIndex === undefined || team.expectedTeamIndex === null) return;

    const delegationId = (team as any).delegationId || (team as any).delegation?.id;
    const delegation = delegations.find((d: any) => d.id === delegationId);
    const slot = delegation?.expectedTeams?.[(team as any).expectedTeamIndex];
    if (!slot?.memberCounts) return;

    const scaffolded: MemberRow[] = [];
    for (const [role, count] of Object.entries(slot.memberCounts)) {
      for (let i = 0; i < (Number(count) || 0); i++) {
        scaffolded.push({ ...emptyRow(), role });
      }
    }
    if (scaffolded.length > 0) {
      setRows(scaffolded);
    }
  }, [selectedTeamId, isLoadingCurrentMembers, currentMembers, teams, delegations]);

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove || !selectedTeamId) return;

    setIsRemovingMember(true);
    try {
      if (selectedTeamId.startsWith('team-')) {
        const removed = teamMemberStore.delete(memberToRemove.id);
        if (!removed) throw new Error('Member not found');
      } else {
        await deleteTeamMember(memberToRemove.membershipId);
        await syncTeamMemberCount(selectedTeamId).catch(() => undefined);
      }

      toast.success(`${memberToRemove.firstName} ${memberToRemove.lastName} removed from team`);
      setMemberToRemove(null);

      await Promise.all([
        refetchCurrentMembers(),
        refetchParticipants(),
      ]);
    } catch (error: any) {
      const detail =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to remove member';
      toast.error(detail);
    } finally {
      setIsRemovingMember(false);
    }
  };

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  const selectedTeamSport = selectedTeam
    ? String(
        (selectedTeam as any).sportName ||
          selectedTeam.subCategory ||
          (selectedTeam.sportCategory as any)?.subCategory ||
          selectedTeam.sportCategory ||
          '',
      ).trim()
    : '';

  // The declared team-slot this team is bound to, if any — falls back to
  // null for teams that predate the team-plan feature (no delegation, or no
  // expectedTeamIndex), which skips all capacity gating below.
  const expectedTeamSlot = (() => {
    if (!selectedTeam) return null;
    const delegationId = (selectedTeam as any).delegationId || (selectedTeam as any).delegation?.id;
    const slotIndex = (selectedTeam as any).expectedTeamIndex;
    if (!delegationId || slotIndex === undefined || slotIndex === null) return null;
    const delegation = delegations.find((d: any) => d.id === delegationId);
    return delegation?.expectedTeams?.[slotIndex] || null;
  })();

  const expectedCounts: Record<string, number> = expectedTeamSlot?.memberCounts || {};
  const hasDeclaredPlan = Object.keys(expectedCounts).length > 0;

  // Roles this specific team is allowed to have, per its delegation's
  // declared plan — falls back to the full taxonomy for teams with no plan.
  const declaredRoleOptions = hasDeclaredPlan ? Object.keys(expectedCounts) : TEAM_ROLES;

  const currentCountsByRole = (() => {
    const counts: Record<string, number> = {};
    for (const member of currentMembers) {
      const role = member.role || '';
      counts[role] = (counts[role] || 0) + 1;
    }
    return counts;
  })();

  // The team's already-saved roster already fills every declared role to
  // its required count — nothing more can be added until someone is
  // removed, so the whole "add members" form gets replaced with a banner.
  const isTeamFullyStaffed =
    hasDeclaredPlan &&
    Object.entries(expectedCounts).every(
      ([role, count]) => (currentCountsByRole[role] || 0) >= (Number(count) || 0),
    );

  // Per-row remaining capacity, accounting for both the saved roster AND
  // whichever roles the *other* draft rows already claim — so two blank
  // rows can't both pick the last remaining slot for the same role.
  const remainingCapacityForRow = (rowIndex: number): Record<string, number> => {
    const draftCountsByRole: Record<string, number> = {};
    rows.forEach((r, i) => {
      if (i === rowIndex || !r.role) return;
      draftCountsByRole[r.role] = (draftCountsByRole[r.role] || 0) + 1;
    });
    const remaining: Record<string, number> = {};
    for (const role of Object.keys(expectedCounts)) {
      const used = (currentCountsByRole[role] || 0) + (draftCountsByRole[role] || 0);
      remaining[role] = (Number(expectedCounts[role]) || 0) - used;
    }
    return remaining;
  };

  const roleOptionsForRow = (row: MemberRow, rowIndex: number): string[] => {
    if (!hasDeclaredPlan) return TEAM_ROLES;
    const remaining = remainingCapacityForRow(rowIndex);
    return declaredRoleOptions.filter((role) => (remaining[role] || 0) > 0 || role === row.role);
  };

  const setViewModeAndPersist = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      /* ignore */
    }
  };

  const sportLabel = (team?: Team | null) => {
    if (!team) return '';
    return typeof team.sportCategory === 'string'
      ? team.sportCategory
      : (team.sportCategory as any)?.name || '';
  };

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
        p.teamRole && declaredRoleOptions.includes(p.teamRole) ? p.teamRole : next[index].role;

      next[index] = {
        ...next[index],
        participantId: p.id,
        participant: p,
        search: participantName(p),
        dropdownOpen: false,
        role: defaultRole,
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

  const openCreateParticipant = (index: number) => {
    setCreatingParticipantForIndex(index);
    setNewParticipantForm(emptyNewParticipantForm());
  };

  const handleCreateParticipant = async () => {
    if (creatingParticipantForIndex === null) return;
    const form = newParticipantForm;
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      toast.error('First name, last name, and email are required');
      return;
    }

    setIsCreatingParticipant(true);
    try {
      // The row this dialog was opened from already has a role selected —
      // that's the whole reason we're creating someone to fill it, so the
      // new participant inherits it as their standing teamRole rather than
      // asking the manager to pick it again here.
      const payload: ManagerParticipantPayload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        gender: form.gender || undefined,
        nationality: form.nationality || undefined,
        organization: form.organization.trim() || undefined,
        jobTitle: form.jobTitle.trim() || undefined,
        teamRole: rows[creatingParticipantForIndex]?.role || undefined,
      };
      const created = await createManagerParticipant(payload);
      selectParticipant(creatingParticipantForIndex, { ...created, registrationId: created.id } as Participant);
      toast.success(`${created.firstName} was added to your directory.`);
      setCreatingParticipantForIndex(null);
      setNewParticipantForm(emptyNewParticipantForm());
      await refetchParticipants();
    } catch (error: any) {
      console.error('Failed to create participant:', error);
      const msg = error?.response?.data?.message || error?.message || 'Could not create participant';
      toast.error(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setIsCreatingParticipant(false);
    }
  };

  // ── Filter participants per row ─────────────────────────────────────────────

  const filteredParticipants = (row: MemberRow, rowIndex: number) => {
    const selectedElsewhere = new Set(
      rows
        .filter((_, index) => index !== rowIndex)
        .map((entry) => entry.participantId)
        .filter(Boolean),
    );

    let available = allParticipants.filter(
      (participant) => !selectedElsewhere.has(participant.id),
    );

    // Only people who play this team's sport...
    if (selectedTeamSport) {
      available = available.filter((p) => (p.sports || []).includes(selectedTeamSport));
    }

    // ...and whose own declared role matches whichever role this row is
    // currently set to (no filtering yet if the row's role isn't picked).
    if (row.role) {
      available = available.filter((p) => p.teamRole === row.role);
    }

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
    if (isTeamFullyStaffed) { toast.error('This team is already fully staffed'); return; }

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
            dietaryRequirements: '',
            medicalConditions: '',
          });
          savedCount++;
        }
        toast.success(`${savedCount} member(s) added successfully!`);
      } else {
        // Everything else (visa/accommodation/transport needs, dietary,
        // medical, origin city) is captured later during the participant's
        // own registration — this step is deliberately just who + what role.
        const mapRowToPayload = (r: MemberRow) => ({
          participantId: r.participantId,
          role: r.role,
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

      await refetchParticipants();
      await refetchCurrentMembers();
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
      <header className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.06] via-card to-card px-6 py-6 shadow-sm sm:px-8 sm:py-7">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/[0.07] blur-3xl"
          aria-hidden
        />
        <div className="relative space-y-4">
          <Button
            variant="ghost"
            size="sm"
            className="-ms-2 h-8 gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/manager/teams')}
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Teams
          </Button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                Team Manager Portal
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Add Team Members
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Select registered members and place them on a team roster.
              </p>
              {selectedTeam && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/15">
                    <FolderKanban className="h-3.5 w-3.5" />
                    {selectedTeam.name}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border/70">
                    <Users className="h-3.5 w-3.5" />
                    <span className="tabular-nums">{currentMembers.length}</span>
                    on roster
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Team picker — compact */}
      <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Select team</p>
            <p className="text-xs text-muted-foreground">Choose which roster to update</p>
          </div>

          {isLoadingTeams ? (
            <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Loading teams…
            </div>
          ) : teams.length === 0 ? (
            <Button size="sm" className="h-9 shadow-sm" onClick={() => navigate('/manager/teams')}>
              Create a team first
            </Button>
          ) : (
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger className={cn(selectTriggerClass, 'w-full sm:max-w-md')}>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Users className="h-3.5 w-3.5" />
                  </span>
                  <SelectValue placeholder="Choose a team…" />
                </div>
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-64">
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    <span className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>
                        {team.name}
                        {sportLabel(team) ? (
                          <span className="text-muted-foreground"> · {sportLabel(team)}</span>
                        ) : null}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </section>

      {selectedTeamId && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 px-0.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary/60" />
              <h2 className="text-sm font-semibold text-foreground">
                Current members
                <span className="ml-1.5 font-normal text-muted-foreground">({currentMembers.length})</span>
              </h2>
            </div>
            {currentMembers.length > 0 && (
              <div
                className="inline-flex items-center rounded-lg border border-border bg-card p-0.5 shadow-sm"
                role="group"
                aria-label="Display mode"
              >
                <button
                  type="button"
                  onClick={() => setViewModeAndPersist('cards')}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors',
                    viewMode === 'cards'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  aria-pressed={viewMode === 'cards'}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setViewModeAndPersist('table')}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors',
                    viewMode === 'table'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  aria-pressed={viewMode === 'table'}
                >
                  <List className="h-3.5 w-3.5" />
                  Table
                </button>
              </div>
            )}
          </div>

          {isLoadingCurrentMembers ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 py-14">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading members…</p>
            </div>
          ) : currentMembers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
                <Users className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-foreground">No members on this team yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Add people below to build the roster.</p>
            </div>
          ) : viewMode === 'table' ? (
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/70 hover:bg-transparent">
                      <TableHead className="h-11 bg-muted/55 text-[11px] font-semibold uppercase tracking-[0.06em]">
                        Member
                      </TableHead>
                      <TableHead className="h-11 w-[180px] bg-muted/55 text-[11px] font-semibold uppercase tracking-[0.06em]">
                        Role
                      </TableHead>
                      <TableHead className="h-11 w-[220px] bg-muted/55 text-end text-[11px] font-semibold uppercase tracking-[0.06em]">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentMembers.map((member) => (
                      <TableRow key={member.id} className="border-border/65 hover:bg-primary/[0.025]">
                        <TableCell className="py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-primary/10 shadow-sm">
                              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                {(member.firstName[0] || '?').toUpperCase()}
                                {(member.lastName[0] || '').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {member.firstName} {member.lastName}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="inline-flex items-center rounded-full border border-primary/10 bg-primary/[0.07] px-2.5 py-1 text-xs font-semibold text-primary">
                            {member.role}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 border-border/80 bg-background shadow-sm"
                              onClick={() =>
                                navigate(
                                  `/manager/register-member?membershipId=${member.membershipId}&teamId=${selectedTeamId}`,
                                )
                              }
                            >
                              Complete registration
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              title="Remove from team"
                              onClick={() => setMemberToRemove(member)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {currentMembers.map((member) => (
                <article
                  key={member.id}
                  className="flex items-center gap-3 rounded-2xl border border-border/80 bg-card p-3.5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <Avatar className="h-10 w-10 shrink-0 border border-primary/10 shadow-sm">
                    <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                      {(member.firstName[0] || '?').toUpperCase()}
                      {(member.lastName[0] || '').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                    <span className="mt-1.5 inline-flex items-center rounded-full border border-primary/10 bg-primary/[0.07] px-2 py-0.5 text-[11px] font-semibold text-primary">
                      {member.role}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 border-border/80 bg-background px-2.5 text-xs shadow-sm"
                      onClick={() =>
                        navigate(
                          `/manager/register-member?membershipId=${member.membershipId}&teamId=${selectedTeamId}`,
                        )
                      }
                    >
                      Register
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 self-end text-muted-foreground hover:text-destructive"
                      title="Remove from team"
                      onClick={() => setMemberToRemove(member)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Add Members Form — compact rows */}
      {selectedTeamId && isTeamFullyStaffed ? (
        <section className="overflow-hidden rounded-2xl border border-status-success/25 bg-status-success-bg px-5 py-6 text-center shadow-sm">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-status-success" />
          <p className="text-sm font-semibold text-status-success">
            {selectedTeam?.name} is fully staffed
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-status-success/80">
            Every role this team's delegation slot requires (
            {Object.values(expectedCounts).reduce((sum, n) => sum + (Number(n) || 0), 0)} member
            {Object.values(expectedCounts).reduce((sum, n) => sum + (Number(n) || 0), 0) === 1 ? '' : 's'}) is already assigned.
            Remove someone above first if you need to swap a member out.
          </p>
        </section>
      ) : selectedTeamId && (
        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-gradient-to-br from-primary/[0.04] via-transparent to-transparent px-4 py-3.5 sm:px-5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Add members</p>
              <p className="text-xs text-muted-foreground">
                Adding to{' '}
                <span className="font-medium text-foreground">{selectedTeam?.name}</span>
                {isLoadingParticipants && (
                  <span className="ms-2 inline-flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading…
                  </span>
                )}
              </p>
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 border-border/80 bg-background shadow-sm" onClick={addRow}>
              <Plus className="h-3.5 w-3.5" />
              Add another
            </Button>
          </div>

          <div className="space-y-3 p-4 sm:p-5">
            {rows.map((row, index) => (
              <div
                key={index}
                className="rounded-xl border border-border/70 bg-muted/15 p-3.5 sm:p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <UserPlus className="h-3.5 w-3.5 text-primary" />
                    Member {index + 1}
                  </p>
                  {rows.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeRow(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
                  {/* Participant */}
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-semibold">
                      Participant <span className="text-destructive">*</span>
                    </Label>

                    {row.participant ? (
                      <div className="flex h-10 items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/[0.04] px-2.5 shadow-sm">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                            {participantInitials(row.participant)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium leading-tight">
                            {participantName(row.participant)}
                          </p>
                        </div>
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-status-success" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => clearParticipant(index)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          ref={(el) => {
                            searchRefs.current[index] = el;
                          }}
                          className="h-10 rounded-xl border-border/80 bg-card pl-9 shadow-sm"
                          placeholder="Search by name, email or passport…"
                          value={row.search}
                          onChange={(e) => {
                            updateRow(index, 'search', e.target.value);
                            updateRow(index, 'dropdownOpen', true);
                          }}
                          onFocus={() => updateRow(index, 'dropdownOpen', true)}
                          onBlur={() =>
                            setTimeout(() => updateRow(index, 'dropdownOpen', false), 150)
                          }
                        />

                        {row.dropdownOpen && (
                          <div className="absolute z-50 mt-1.5 w-full max-h-64 overflow-y-auto rounded-xl border border-border/80 bg-popover shadow-xl">
                            {isLoadingParticipants ? (
                              <div className="flex items-center justify-center py-5">
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                              </div>
                            ) : (
                              <>
                                {filteredParticipants(row, index).length === 0 ? (
                                  <div className="py-5 text-center text-sm text-muted-foreground">
                                    No matching members found.
                                  </div>
                                ) : (
                                  filteredParticipants(row, index).map((p) => (
                                    <button
                                      key={p.id}
                                      type="button"
                                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-accent"
                                      onMouseDown={() => selectParticipant(index, p)}
                                    >
                                      <Avatar className="h-8 w-8 shrink-0">
                                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                          {participantInitials(p)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{participantName(p)}</p>
                                        <p className="truncate text-xs text-muted-foreground">
                                          {p.email || ''}
                                          {p.passportNumber ? ` · ${p.passportNumber}` : ''}
                                        </p>
                                      </div>
                                    </button>
                                  ))
                                )}
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 border-t border-border/70 px-3.5 py-2.5 text-left text-sm font-medium text-primary transition-colors hover:bg-accent"
                                  onMouseDown={() => openCreateParticipant(index)}
                                >
                                  <UserPlus2 className="h-4 w-4 shrink-0" />
                                  Create new participant
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Role */}
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-semibold">
                      Role <span className="text-destructive">*</span>
                    </Label>
                    <Select value={row.role} onValueChange={(v) => updateRow(index, 'role', v)}>
                      <SelectTrigger className={selectTriggerClass}>
                        <SelectValue placeholder="Select role…" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-h-56">
                        {roleOptionsForRow(row, index).map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-4">
              <Button variant="outline" className="h-9 gap-1.5 border-border/80 bg-background shadow-sm" onClick={addRow}>
                <Plus className="h-4 w-4" />
                Add more
              </Button>
              <Button className="h-9 gap-1.5 shadow-sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSaving ? 'Saving…' : 'Save all members'}
              </Button>
            </div>
          </div>
        </section>
      )}

      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && !isRemovingMember && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove
                ? `${memberToRemove.firstName} ${memberToRemove.lastName} will be removed from ${selectedTeam?.name || 'this team'}. This does not delete their participant registration.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemovingMember}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isRemovingMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmRemoveMember();
              }}
            >
              {isRemovingMember ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing…
                </>
              ) : (
                'Remove'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={creatingParticipantForIndex !== null}
        onOpenChange={(open) => !open && !isCreatingParticipant && setCreatingParticipantForIndex(null)}
      >
        <DialogContent className="flex max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-2xl border p-0 shadow-2xl">
          <DialogHeader className="shrink-0 space-y-0 border-b bg-gradient-to-br from-primary/[0.07] via-card to-card px-5 py-4 pe-12 text-start">
            <DialogTitle className="text-lg font-semibold tracking-tight">Create new participant</DialogTitle>
            <DialogDescription className="text-sm">
              Save them to your directory now. They&apos;ll be added straight to this roster slot.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold">First name *</Label>
                <Input
                  className="h-10 rounded-xl bg-background shadow-sm"
                  value={newParticipantForm.firstName}
                  onChange={(e) => setNewParticipantForm((prev) => ({ ...prev, firstName: e.target.value }))}
                  placeholder="e.g. Ahmed"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold">Last name *</Label>
                <Input
                  className="h-10 rounded-xl bg-background shadow-sm"
                  value={newParticipantForm.lastName}
                  onChange={(e) => setNewParticipantForm((prev) => ({ ...prev, lastName: e.target.value }))}
                  placeholder="e.g. Khan"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold">Email *</Label>
                <Input
                  type="email"
                  className="h-10 rounded-xl bg-background shadow-sm"
                  value={newParticipantForm.email}
                  onChange={(e) => setNewParticipantForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="member@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold">Phone</Label>
                <Input
                  className="h-10 rounded-xl bg-background shadow-sm"
                  value={newParticipantForm.phone}
                  onChange={(e) => setNewParticipantForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+92 300 1234567"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold">Gender</Label>
                <Select
                  value={newParticipantForm.gender}
                  onValueChange={(v) => setNewParticipantForm((prev) => ({ ...prev, gender: v }))}
                >
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold">Nationality</Label>
                <CountryCombobox
                  value={newParticipantForm.nationality}
                  onChange={(v) => setNewParticipantForm((prev) => ({ ...prev, nationality: v }))}
                  placeholder="Select country"
                  className="h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold">Organization</Label>
                <Input
                  className="h-10 rounded-xl bg-background shadow-sm"
                  value={newParticipantForm.organization}
                  onChange={(e) => setNewParticipantForm((prev) => ({ ...prev, organization: e.target.value }))}
                  placeholder="e.g. National Federation"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold">Job title</Label>
                <Input
                  className="h-10 rounded-xl bg-background shadow-sm"
                  value={newParticipantForm.jobTitle}
                  onChange={(e) => setNewParticipantForm((prev) => ({ ...prev, jobTitle: e.target.value }))}
                  placeholder="e.g. Head Coach"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t bg-muted/20 px-5 py-3.5">
            <Button
              variant="outline"
              className="h-9"
              onClick={() => setCreatingParticipantForIndex(null)}
              disabled={isCreatingParticipant}
            >
              Cancel
            </Button>
            <Button className="h-9 gap-1.5 shadow-sm" onClick={handleCreateParticipant} disabled={isCreatingParticipant}>
              {isCreatingParticipant ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save & add to team'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddMembersPage;
