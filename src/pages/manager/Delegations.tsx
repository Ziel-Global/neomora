import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useManagerSession } from '@/contexts/ManagerSessionContext';
import { Team, Delegation, TeamMember, SPORT_CATEGORIES } from '@/lib/teamStore';
import { eventStore, participantStore, registrationStore, travelStore } from '@/lib/emsStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Flag, Users, Send, Clock, AlertCircle, Plus, Minus, Plane, Trash2, ClipboardList, AlertTriangle, Loader2, Calendar, UserCog, HeartPulse, Building2, MoreHorizontal, Sparkles, CheckCircle2, ArrowRight, LayoutGrid, List, Search, UserPlus2 } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getMyDelegations, createDelegation, submitDelegation, updateDelegation, deleteDelegation, extractDelegationId, submitDelegationRoster } from '@/api/delegationApi';
import { getEvents } from '@/api/eventApi';
import { getMyTeams, createTeam, listTeamMembers, updateTeamMember, updateTeam, deleteTeamMember, resolveTeamMembershipId, addTeamMember } from '@/api/teamApi';
import { getManagerParticipants, createManagerParticipant } from '@/api/participantApi';
import { EMSEvent } from '@/lib/emsStore';
import { DelegationCategory, groupedDelegationCategories } from '@/lib/delegationCategories';
import { CountryCombobox } from '@/components/common/CountryCombobox';
import { cn } from '@/lib/utils';

const VIEW_MODE_KEY = 'ems_manager_delegations_view_mode';
type ViewMode = 'cards' | 'table';

const readStoredViewMode = (): ViewMode => {
  try {
    return localStorage.getItem(VIEW_MODE_KEY) === 'table' ? 'table' : 'cards';
  } catch {
    return 'cards';
  }
};

type DelegationStatusTone = {
  icon: React.ElementType;
  chip: string;
  dot: string;
  bar: string;
};

const getDelegationStatusTone = (status: string, fullyApproved?: boolean): DelegationStatusTone => {
  if (fullyApproved || status === 'Approved') {
    return {
      icon: CheckCircle2,
      chip: 'border-status-success/25 bg-status-success-bg text-status-success',
      dot: 'bg-status-success',
      bar: 'bg-status-success',
    };
  }
  switch (status) {
    case 'Submitted':
    case 'Roster Submitted':
      return {
        icon: Clock,
        chip: 'border-status-info/25 bg-status-info-bg text-status-info',
        dot: 'bg-status-info',
        bar: 'bg-primary',
      };
    case 'Rejected':
      return {
        icon: AlertCircle,
        chip: 'border-status-error/25 bg-status-error-bg text-status-error',
        dot: 'bg-status-error',
        bar: 'bg-status-error',
      };
    case 'Update Requested':
      return {
        icon: AlertTriangle,
        chip: 'border-amber-500/25 bg-amber-50 text-amber-800',
        dot: 'bg-amber-500',
        bar: 'bg-amber-500',
      };
    default:
      return {
        icon: Clock,
        chip: 'border-border/80 bg-muted/60 text-muted-foreground',
        dot: 'bg-muted-foreground/50',
        bar: 'bg-amber-500',
      };
  }
};

const DelegationStatusChip = ({
  status,
  fullyApproved,
  compact,
}: {
  status: string;
  fullyApproved?: boolean;
  compact?: boolean;
}) => {
  const tone = getDelegationStatusTone(status, fullyApproved);
  const Icon = tone.icon;
  const label = fullyApproved
    ? 'Approved'
    : status === 'Roster Submitted'
      ? 'Roster sent'
      : status;

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full border font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]',
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        tone.chip,
      )}
    >
      <Icon className={cn('shrink-0', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      <span className="truncate">{label}</span>
    </span>
  );
};

const CATEGORY_GROUP_META: Record<string, { icon: React.ElementType; hint: string }> = {
  'Athletes/Players': { icon: Users, hint: 'Competing athletes and players' },
  'Team Officials': { icon: UserCog, hint: 'Coaching and team leadership' },
  'Support Staff': { icon: HeartPulse, hint: 'Medical, training, and wellbeing' },
  Administrative: { icon: Building2, hint: 'Delegation leadership and admin' },
  Others: { icon: MoreHorizontal, hint: 'Media, security, and other roles' },
};

const HeadcountStepper = ({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) => {
  const count = Number.isFinite(value) ? Math.max(0, value) : 0;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/80 px-3 py-2.5 shadow-sm transition-colors hover:border-border">
      <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-foreground">{label}</p>
      <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border/80 bg-muted/30 p-0.5">
        <button
          type="button"
          disabled={disabled || count <= 0}
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(0, count - 1))}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          disabled={disabled}
          value={count}
          aria-label={label}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') {
              onChange(0);
              return;
            }
            onChange(Math.max(0, parseInt(raw, 10) || 0));
          }}
          className="h-7 w-10 border-0 bg-transparent text-center text-sm font-semibold tabular-nums text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          disabled={disabled}
          aria-label={`Increase ${label}`}
          onClick={() => onChange(count + 1)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

const CategoryGroupSection = ({
  group,
  categories,
  counts,
  onChange,
  disabled,
}: {
  group: string;
  categories: DelegationCategory[];
  counts: Record<string, number>;
  onChange: (label: string, value: number) => void;
  disabled?: boolean;
}) => {
  const meta = CATEGORY_GROUP_META[group] || CATEGORY_GROUP_META.Others;
  const Icon = meta.icon;
  const groupTotal = categories.reduce((sum, category) => sum + (counts[category.label] || 0), 0);

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b border-border/60 bg-muted/25 px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-inset ring-primary/10">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">{group}</h3>
            {groupTotal > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-primary ring-1 ring-inset ring-primary/15">
                {groupTotal}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">{meta.hint}</p>
        </div>
      </div>
      <div className="grid gap-2 p-3 sm:grid-cols-2">
        {categories.map((category) => (
          <HeadcountStepper
            key={category.label}
            label={category.label}
            value={counts[category.label] ?? 0}
            disabled={disabled}
            onChange={(next) => onChange(category.label, next)}
          />
        ))}
      </div>
    </section>
  );
};

interface HeadcountTeamDraft {
  name: string;
  counts: Record<string, number>;
}

const TeamPlanEditor = ({
  teams,
  onChange,
  disabled,
}: {
  teams: HeadcountTeamDraft[];
  onChange: (next: HeadcountTeamDraft[]) => void;
  disabled?: boolean;
}) => {
  const addTeam = () => onChange([...teams, { name: '', counts: {} }]);
  const removeTeam = (index: number) => onChange(teams.filter((_, i) => i !== index));
  const renameTeam = (index: number, name: string) =>
    onChange(teams.map((t, i) => (i === index ? { ...t, name } : t)));
  const updateCount = (index: number, label: string, value: number) =>
    onChange(teams.map((t, i) => (i === index ? { ...t, counts: { ...t.counts, [label]: value } } : t)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-0.5">
        <Label className="text-[12px] font-semibold">
          Number of teams: <span className="tabular-nums">{teams.length}</span>
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={addTeam}
          disabled={disabled}
        >
          <Plus className="h-3.5 w-3.5" />
          Add team
        </Button>
      </div>

      <div className="space-y-4">
        {teams.map((team, index) => {
          const teamTotal = Object.values(team.counts).reduce((sum, n) => sum + (Number(n) || 0), 0);
          return (
            <section key={index} className="space-y-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Input
                  value={team.name}
                  onChange={(e) => renameTeam(index, e.target.value)}
                  placeholder={`Team ${index + 1}`}
                  disabled={disabled}
                  className="h-9 flex-1"
                />
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/15">
                  <Users className="h-3 w-3" />
                  <span className="tabular-nums">{teamTotal}</span>
                </span>
                {teams.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeTeam(index)}
                    disabled={disabled}
                    aria-label={`Remove team ${index + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {Object.entries(groupedDelegationCategories()).map(([group, categories]) => (
                  <CategoryGroupSection
                    key={group}
                    group={group}
                    categories={categories}
                    counts={team.counts}
                    disabled={disabled}
                    onChange={(label, value) => updateCount(index, label, value)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

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

interface BulkTravelPrefs {
  needsVisa: boolean;
  needsAccommodation: boolean;
  needsTransport: boolean;
  originCity: string;
  departureAirport: string;
  preferredArrivalDate: string;
  preferredDepartureDate: string;
  seatPreference: 'Window' | 'Aisle' | 'No Preference';
  mealPreference: string;
  specialRequirements: string;
}

const DelegationsPage: React.FC = () => {
  const { manager } = useManagerSession();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const handledCreateFromUrl = useRef(false);
  const pendingInvitationCreateRef = useRef<{
    eventId: string;
    eventName?: string;
    invitationId?: string;
  } | null>(null);
  const [localDraftDelegations, setLocalDraftDelegations] = useState<Delegation[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [delegationCountry, setDelegationCountry] = useState<string>('');
  const [events, setEvents] = useState<EMSEvent[]>([]);
  const [createFromInvitationEventId, setCreateFromInvitationEventId] = useState<string | null>(null);
  const [createFromInvitationEventName, setCreateFromInvitationEventName] = useState<string>('');
  const [isCountryDialogOpen, setIsCountryDialogOpen] = useState(false);
  const [countryInput, setCountryInput] = useState('');
  const [pendingSubmission, setPendingSubmission] = useState<{ delegationId: string; isDraft: boolean } | null>(null);

  // Bulk travel preferences state
  const [isBulkTravelOpen, setIsBulkTravelOpen] = useState(false);
  const [selectedDelegation, setSelectedDelegation] = useState<Delegation | null>(null);
  const [bulkTravelPrefs, setBulkTravelPrefs] = useState<BulkTravelPrefs>({
    needsVisa: false,
    needsAccommodation: true,
    needsTransport: true,
    originCity: '',
    departureAirport: '',
    preferredArrivalDate: '',
    preferredDepartureDate: '',
    seatPreference: 'No Preference',
    mealPreference: '',
    specialRequirements: '',
  });
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [isCreating, setIsCreating] = useState(false);

  // Headcount declaration state — one entry per declared team-slot, each
  // with its own name and category breakdown.
  const [isHeadcountOpen, setIsHeadcountOpen] = useState(false);
  const [headcountDelegation, setHeadcountDelegation] = useState<Delegation | null>(null);
  const [headcountTeams, setHeadcountTeams] = useState<{ name: string; counts: Record<string, number> }[]>([
    { name: '', counts: {} },
  ]);
  const [isSavingHeadcount, setIsSavingHeadcount] = useState(false);
  const [submittingRosterId, setSubmittingRosterId] = useState<string | null>(null);

  // Post-approval team selection state
  const [isSelectTeamOpen, setIsSelectTeamOpen] = useState(false);
  const [selectTeamDelegation, setSelectTeamDelegation] = useState<Delegation | null>(null);
  const [selectTeamIds, setSelectTeamIds] = useState<string[]>([]);
  const [isSavingTeamSelection, setIsSavingTeamSelection] = useState(false);

  // "Create new team for a declared slot" mini-flow, inside the Select Team dialog
  const [creatingSlotIndex, setCreatingSlotIndex] = useState<number | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamSport, setNewTeamSport] = useState('');
  const [isCreatingTeamForSlot, setIsCreatingTeamForSlot] = useState(false);
  const [removingTeamId, setRemovingTeamId] = useState<string | null>(null);
  const [assigningExistingTeamSlot, setAssigningExistingTeamSlot] = useState<number | null>(null);

  // "Trim excess members" modal — opened when a team attached to a slot has
  // more people in a category than that slot declared.
  const [trimmingTeam, setTrimmingTeam] = useState<Team | null>(null);
  const [removingExcessMembershipId, setRemovingExcessMembershipId] = useState<string | null>(null);

  // "Missing roles" modal — lists what a slot-bound team still needs, each
  // with an "Add" button that opens the scoped add-member modal below.
  const [missingRolesTeam, setMissingRolesTeam] = useState<Team | null>(null);

  // Scoped "add a member for this exact role" modal, opened from the
  // missing-roles list. Search-existing-or-quick-create-new, matching the
  // same pattern as the AddMembers page's inline creation flow.
  const [addingRoleFor, setAddingRoleFor] = useState<{ team: Team; category: string } | null>(null);
  const [addMemberSearch, setAddMemberSearch] = useState('');
  const [addMemberCandidates, setAddMemberCandidates] = useState<any[]>([]);
  const [isLoadingAddMemberCandidates, setIsLoadingAddMemberCandidates] = useState(false);
  const [addingParticipantId, setAddingParticipantId] = useState<string | null>(null);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickCreateForm, setQuickCreateForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', nationality: '',
  });
  const [isQuickCreating, setIsQuickCreating] = useState(false);
  const [rosterCategoryTab, setRosterCategoryTab] = useState<string>('__all__');
  const [viewMode, setViewMode] = useState<ViewMode>(readStoredViewMode);

  const setViewModeAndPersist = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      // ignore
    }
  };

  // Member registrations (completeness) state
  const [isMemberRegistrationsOpen, setIsMemberRegistrationsOpen] = useState(false);
  const [memberRegistrationsDelegation, setMemberRegistrationsDelegation] = useState<Delegation | null>(null);

  const normalizeDelegation = (delegation: any, teamData?: Team[]) => {
    const id = delegation.id || delegation._id;
    let teamIds = delegation.teamIds || delegation.team_ids || (delegation.teams || []).map((t: any) => t.id || t._id).filter(Boolean) || [];

    // Fallback: look up in teamData if empty
    if ((!teamIds || teamIds.length === 0) && teamData) {
      teamIds = teamData
        .filter((t: any) => {
          const tDelId = t.delegationId || t.delegation_id || t.delegation?.id || t.delegation?._id;
          return tDelId === id;
        })
        .map((t: any) => t.id || t._id);
    }

    return {
      ...delegation,
      id,
      teamIds,
      status: delegation.status || 'Draft',
      totalMembers: delegation.totalMembers || delegation.total_members || 0,
      serverDelegationId: delegation.serverDelegationId || delegation.server_delegation_id,
    };
  };

  const {
    data,
    isLoading,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: ['manager', 'delegations'],
    queryFn: async () => {
      const [delegationData, eventData, teamData] = await Promise.all([
        getMyDelegations(),
        getEvents(),
        getMyTeams(),
      ]);
      const remoteDelegations = delegationData.map((d: any) => normalizeDelegation(d, teamData));

      // Try to resolve the country name if manager.country is empty or 'Unknown'
      let resolvedCountry = manager!.country || '';
      if (!resolvedCountry || resolvedCountry === 'Unknown') {
        const teamWithCountry = teamData.find(t => t.country && t.country !== 'Unknown');
        if (teamWithCountry) {
          resolvedCountry = teamWithCountry.country;
        }
      }

      if (resolvedCountry && resolvedCountry !== 'Unknown' && resolvedCountry !== manager!.country) {
        manager!.country = resolvedCountry;
        localStorage.setItem('ems_manager_session', JSON.stringify({ ...manager, country: resolvedCountry }));
      }

      // Fetch delegations from database (including server-side drafts)
      const remoteDelegationsFiltered = remoteDelegations.filter((delegation: any) =>
        (delegation.managerId === manager!.id || !delegation.managerId)
      );

      const publishedEvents = eventData.filter(e => e.status === 'Published' || e.status === 'Ongoing');

      const memberCountsByTeam = new Map<string, number>();
      const membersByTeam = new Map<string, any[]>();
      await Promise.all(
        teamData.map(async (t: any) => {
          try {
            const members = await listTeamMembers(t.id);
            memberCountsByTeam.set(t.id, members.length);
            membersByTeam.set(t.id, members);
          } catch {
            memberCountsByTeam.set(t.id, 0);
            membersByTeam.set(t.id, []);
          }
        })
      );

      const mergedTeams = teamData.map((t: any) => {
        const countFromServer = t.memberCount || t.member_count || 0;
        const countFromMembers = memberCountsByTeam.get(t.id) || 0;
        return {
          ...t,
          memberCount: Math.max(countFromServer, countFromMembers),
        };
      });

      return { delegations: remoteDelegationsFiltered, events: publishedEvents, teams: mergedTeams, membersByTeam };
    },
    enabled: !!manager,
  });

  const teams = data?.teams ?? [];
  const delegations = data?.delegations ?? [];
  const membersByTeam = data?.membersByTeam ?? new Map<string, any[]>();

  useEffect(() => {
    if (data?.events) setEvents(data.events);
  }, [data?.events]);

  useEffect(() => {
    if (loadError) {
      console.error('Failed to load initial delegations data:', loadError);
      const msg = (loadError as any)?.response?.data?.message || (loadError as any)?.message || 'Unknown error';
      toast.error(`Failed to load delegations: ${msg}`);
    }
  }, [loadError]);

  useEffect(() => {
    if (manager?.country && !delegationCountry) {
      setDelegationCountry(manager.country);
    }
  }, [manager, delegationCountry]);

  useEffect(() => {
    const eventId = searchParams.get('eventId');
    const eventName = searchParams.get('eventName');
    const shouldCreate = searchParams.get('create') === '1' || searchParams.get('create') === 'true';
    if (!eventId || !shouldCreate || handledCreateFromUrl.current) return;

    handledCreateFromUrl.current = true;
    pendingInvitationCreateRef.current = {
      eventId,
      eventName: eventName || undefined,
      invitationId: searchParams.get('invitationId') || undefined,
    };
    navigate('/manager/delegations', { replace: true });
  }, [searchParams, navigate]);

  useEffect(() => {
    if (isLoading || !pendingInvitationCreateRef.current) return;

    const pending = pendingInvitationCreateRef.current;
    pendingInvitationCreateRef.current = null;

    setCreateFromInvitationEventId(pending.eventId);
    setCreateFromInvitationEventName(pending.eventName || '');

    if (!events.some((event) => String(event.id) === String(pending.eventId))) {
      const fromStore = eventStore.getById(pending.eventId);
      if (fromStore) {
        setEvents((prev) => {
          if (prev.some((event) => String(event.id) === String(pending.eventId))) return prev;
          return [...prev, fromStore];
        });
      } else if (pending.eventName) {
        setEvents((prev) => {
          if (prev.some((event) => String(event.id) === String(pending.eventId))) return prev;
          return [...prev, {
            id: pending.eventId,
            name: pending.eventName,
            theme: '',
            startDate: '',
            endDate: '',
            city: '',
            venues: [],
            status: 'Published',
            clientGroups: [],
            eventType: 'individual',
            sportCategories: [],
            allowTeamRegistration: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as EMSEvent];
        });
      }
    }

    setSelectedEventId(pending.eventId);
    setIsCreateOpen(true);
  }, [isLoading, events]);

  const getSelectableEvents = (): EMSEvent[] => {
    if (!createFromInvitationEventId) return events;
    const matched = events.filter((event) => String(event.id) === String(createFromInvitationEventId));
    if (matched.length > 0) return matched;
    const fromStore = eventStore.getById(createFromInvitationEventId);
    if (fromStore) return [fromStore];
    if (createFromInvitationEventName) {
      return [{
        id: createFromInvitationEventId,
        name: createFromInvitationEventName,
        theme: '',
        startDate: '',
        endDate: '',
        city: '',
        venues: [],
        status: 'Published',
        clientGroups: [],
        eventType: 'individual',
        sportCategories: [],
        allowTeamRegistration: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as EMSEvent];
    }
    return [];
  };

  const openCreateDialog = (fromInvitation = false) => {
    if (!fromInvitation) {
      setCreateFromInvitationEventId(null);
      setCreateFromInvitationEventName('');
      setSelectedEventId('');
      setSelectedTeamIds([]);
    }
    setIsCreateOpen(true);
  };

  const handleCreateOpenChange = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open) {
      setCreateFromInvitationEventId(null);
      setCreateFromInvitationEventName('');
      setSelectedEventId('');
      setSelectedTeamIds([]);
    }
  };

  const getEventName = (delegation: any) => {
    const eid = delegation.eventId || delegation.event_id || delegation.event?.id;
    return events.find(e => e.id === eid)?.name || 'Unknown Event';
  };

  const getStatusIcon = (status: string, fullyApproved?: boolean) => {
    const Icon = getDelegationStatusTone(status, fullyApproved).icon;
    return <Icon className="h-4 w-4" />;
  };

  const handleSelectTeam = (teamId: string) => {
    setSelectedTeamIds(prev => prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]);
  };

  const selectedEventSports = (() => {
    const event = events.find((entry) => String(entry.id) === String(selectedEventId));
    const categories = (event as any)?.sportCategories || (event as any)?.sport_categories || [];
    return new Set((Array.isArray(categories) ? categories : []).map((category: any) =>
      String(category.subCategory || category.sub_category || (category.name && !String(category.name).includes('games') ? category.name : '')).trim().toLowerCase(),
    ).filter(Boolean));
  })();

  const selectableTeamsForDelegation = teams.filter((team: any) => {
    const assignedDelegation = team.delegationId || team.delegation_id || team.delegation?.id || team.delegation?._id;
    if (assignedDelegation) return false;
    if (!selectedEventId) return false;
    const sport = String(team.sportName || team.subCategory || team.sportCategory?.subCategory || team.sportCategory || '').trim().toLowerCase();
    return selectedEventSports.has(sport);
  });

  const mapCategory = (catId: string) => {
    const teamGames = ['football', 'basketball', 'volleyball', 'esports'];
    const individualGames = ['athletics', 'swimming', 'tennis', 'gymnastics', 'equestrian'];
    const id = catId.toLowerCase();
    if (teamGames.includes(id)) return 'team-based-games';
    if (individualGames.includes(id)) return 'individual-games';
    return 'hybrid-games';
  };

  const buildExpectedTeams = () =>
    headcountTeams.map((team) => ({
      name: team.name.trim() || undefined,
      memberCounts: Object.fromEntries(
        Object.entries(team.counts).filter(([, value]) => Number(value) > 0),
      ),
    }));

  const handleSendRegistration = async () => {
    if (!manager) return;
    if (!selectedEventId) {
      toast.error('Please select an event');
      return;
    }
    if (!delegationCountry.trim()) {
      toast.error('Please select a country for the delegation');
      return;
    }

    const existing = delegations.find((d: any) =>
      String(d.eventId || d.event_id || d.event?.id) === String(selectedEventId),
    );
    if (existing) {
      toast.info('You already have a delegation registered for this event.');
      setIsCreateOpen(false);
      return;
    }

    setIsCreating(true);
    try {
      const serverDelegation = await createDelegation({
        managerId: manager.id,
        country: delegationCountry.trim(),
        eventId: selectedEventId,
      });

      const delegationId = extractDelegationId(serverDelegation);
      if (!delegationId) {
        toast.error('Delegation created but no ID returned from server');
        return;
      }

      const expectedTeams = buildExpectedTeams();
      if (expectedTeams.length > 0) {
        await updateDelegation(delegationId, { expectedTeams });
      }

      await submitDelegation(delegationId);

      toast.success('Registration sent for admin approval');
      setSelectedEventId('');
      setSelectedTeamIds([]);
      setHeadcountTeams([{ name: '', counts: {} }]);
      setCreateFromInvitationEventId(null);
      setCreateFromInvitationEventName('');
      setIsCreateOpen(false);
      await refetch();
    } catch (error: any) {
      console.error('Failed to send delegation registration:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to send registration';
      toast.error(msg);
    } finally {
      setIsCreating(false);
    }
  };

  const openSelectTeamDialog = (delegation: Delegation) => {
    setSelectTeamDelegation(delegation);
    setSelectTeamIds([...(delegation.teamIds || [])]);
    setSelectedEventId(String((delegation as any).eventId || (delegation as any).event_id || (delegation as any).event?.id || ''));
    setIsSelectTeamOpen(true);
  };

  const handleToggleSelectTeam = (teamId: string) => {
    setSelectTeamIds(prev => prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]);
  };

  const handleConfirmTeamSelection = async () => {
    if (!selectTeamDelegation) return;
    if (selectTeamIds.length === 0) {
      toast.error('Select at least one team');
      return;
    }

    setIsSavingTeamSelection(true);
    try {
      await updateDelegation(selectTeamDelegation.id, { teamIds: selectTeamIds });
      toast.success('Team attached to delegation');
      setIsSelectTeamOpen(false);
      setSelectTeamDelegation(null);
      setSelectTeamIds([]);
      await refetch();
    } catch (error: any) {
      console.error('Failed to attach team to delegation:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to attach team';
      toast.error(msg);
    } finally {
      setIsSavingTeamSelection(false);
    }
  };

  const openCreateTeamForSlot = (slotIndex: number, slotName: string) => {
    setCreatingSlotIndex(slotIndex);
    setNewTeamName(slotName || '');
    setNewTeamSport('');
  };

  const handleCreateTeamForSlot = async () => {
    if (!selectTeamDelegation || creatingSlotIndex === null) return;
    if (!newTeamName.trim() || !newTeamSport) {
      toast.error('Enter a team name and choose its sport');
      return;
    }
    const selectedSport = SPORT_CATEGORIES.find((category) => category.name === newTeamSport);
    if (!selectedSport) return;

    setIsCreatingTeamForSlot(true);
    try {
      const teamBasedIds = ['football', 'basketball', 'volleyball', 'esports'];
      const created = await createTeam({
        delegationId: selectTeamDelegation.id,
        name: newTeamName.trim(),
        sportCategoryGroup: teamBasedIds.includes(selectedSport.id) ? 'team-based-games' : 'individual-games',
        subCategory: selectedSport.name,
        expectedTeamIndex: creatingSlotIndex,
      });
      toast.success('Team created — add its roster now.');
      setCreatingSlotIndex(null);
      setNewTeamName('');
      setNewTeamSport('');
      setIsSelectTeamOpen(false);
      setSelectTeamDelegation(null);
      await refetch();
      if (created?.id) {
        navigate(`/manager/add-members?teamId=${created.id}`);
      }
    } catch (error: any) {
      console.error('Failed to create team for slot:', error);
      const msg = error?.response?.data?.message || error?.message || 'Could not create team';
      toast.error(msg);
    } finally {
      setIsCreatingTeamForSlot(false);
    }
  };

  const handleRemoveTeamFromSlot = async (team: Team) => {
    setRemovingTeamId(team.id);
    try {
      // Detach only — the team and its roster stay intact, just unassigned,
      // so it's reusable and the slot opens back up to pick or create again.
      await updateTeam(team.id, { delegationId: null });
      toast.success(`${team.name} removed from this delegation.`);
      await refetch();
    } catch (error: any) {
      console.error('Failed to remove team from delegation:', error);
      const msg = error?.response?.data?.message || error?.message || 'Could not remove this team';
      toast.error(msg);
    } finally {
      setRemovingTeamId(null);
    }
  };

  const handleUseExistingTeamForSlot = async (delegationId: string, slotIndex: number, teamId: string) => {
    setAssigningExistingTeamSlot(slotIndex);
    try {
      await updateTeam(teamId, { delegationId, expectedTeamIndex: slotIndex });
      toast.success('Team assigned to this slot.');
      await refetch();
    } catch (error: any) {
      console.error('Failed to assign existing team to slot:', error);
      const msg = error?.response?.data?.message || error?.message || 'Could not assign this team';
      toast.error(msg);
    } finally {
      setAssigningExistingTeamSlot(null);
    }
  };

  const handleRemoveExcessMember = async (member: any) => {
    const membershipId = resolveTeamMembershipId(member);
    setRemovingExcessMembershipId(membershipId);
    try {
      await deleteTeamMember(membershipId);
      toast.success('Member removed from team.');
      await refetch();
    } catch (error: any) {
      console.error('Failed to remove excess member:', error);
      const msg = error?.response?.data?.message || error?.message || 'Could not remove this member';
      toast.error(msg);
    } finally {
      setRemovingExcessMembershipId(null);
    }
  };

  const teamSportOf = (team: Team): string =>
    String(
      (team as any).sportName || team.subCategory || (team.sportCategory as any)?.subCategory || team.sportCategory || '',
    ).trim();

  const openAddMemberForRole = async (team: Team, category: string) => {
    setAddingRoleFor({ team, category });
    setAddMemberSearch('');
    setShowQuickCreate(false);
    setQuickCreateForm({ firstName: '', lastName: '', email: '', phone: '', nationality: '' });
    setIsLoadingAddMemberCandidates(true);
    try {
      const all = await getManagerParticipants();
      setAddMemberCandidates(all);
    } catch (error) {
      console.error('Failed to load participants:', error);
      toast.error('Failed to load your directory');
      setAddMemberCandidates([]);
    } finally {
      setIsLoadingAddMemberCandidates(false);
    }
  };

  const filteredAddMemberCandidates = () => {
    if (!addingRoleFor) return [];
    const { team, category } = addingRoleFor;
    const sport = teamSportOf(team);
    const alreadyOnTeam = new Set(
      (membersByTeam.get(team.id) || [])
        .map((m: any) => m.participant?.id || m.participantId)
        .filter(Boolean),
    );

    let list = addMemberCandidates.filter((p: any) => !alreadyOnTeam.has(p.id));
    if (sport) list = list.filter((p: any) => (p.sports || []).includes(sport));
    list = list.filter((p: any) => p.teamRole === category);

    const q = addMemberSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((p: any) => {
        const name = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
        return name.includes(q) || (p.email || '').toLowerCase().includes(q);
      });
    }
    return list;
  };

  const handleAddExistingMemberForRole = async (participant: any) => {
    if (!addingRoleFor) return;
    const { team, category } = addingRoleFor;
    setAddingParticipantId(participant.id);
    try {
      await addTeamMember(team.id, {
        participantId: participant.id,
        role: category,
        needsVisa: false,
        needsAccommodation: false,
        needsTransport: false,
      });
      toast.success(`${participant.firstName} added to ${team.name}.`);
      await refetch();
      setAddingRoleFor(null);
    } catch (error: any) {
      console.error('Failed to add member:', error);
      const msg = error?.response?.data?.message || error?.message || 'Could not add this member';
      toast.error(msg);
    } finally {
      setAddingParticipantId(null);
    }
  };

  const handleQuickCreateAndAdd = async () => {
    if (!addingRoleFor) return;
    const { team, category } = addingRoleFor;
    if (!quickCreateForm.firstName.trim() || !quickCreateForm.lastName.trim() || !quickCreateForm.email.trim()) {
      toast.error('First name, last name, and email are required');
      return;
    }

    setIsQuickCreating(true);
    try {
      const sport = teamSportOf(team);
      const created = await createManagerParticipant({
        firstName: quickCreateForm.firstName.trim(),
        lastName: quickCreateForm.lastName.trim(),
        email: quickCreateForm.email.trim(),
        phone: quickCreateForm.phone.trim() || undefined,
        nationality: quickCreateForm.nationality || undefined,
        sports: sport ? [sport] : undefined,
        teamRole: category,
      });
      await addTeamMember(team.id, {
        participantId: created.id,
        role: category,
        needsVisa: false,
        needsAccommodation: false,
        needsTransport: false,
      });
      toast.success(`${created.firstName} was created and added to ${team.name}.`);
      await refetch();
      setAddingRoleFor(null);
    } catch (error: any) {
      console.error('Failed to create and add member:', error);
      const msg = error?.response?.data?.message || error?.message || 'Could not create this member';
      toast.error(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setIsQuickCreating(false);
    }
  };

  const openCountryDialog = (delegationId: string, isDraft: boolean, initialCountry?: string) => {
    setPendingSubmission({ delegationId, isDraft });
    setCountryInput(initialCountry || manager?.country || '');
    setIsCountryDialogOpen(true);
  };

  const submitDelegationWithCountry = async (delegationId: string, overrideCountry?: string) => {
    try {
      // Check if it's a local draft
      const isDraft = delegationId.startsWith('draft-');
      const sanitizedCountry = overrideCountry?.trim() || '';

      if (isDraft) {
        // Find the draft delegation
        const draftDelegation = localDraftDelegations.find(d => d.id === delegationId);
        if (!draftDelegation) {
          toast.error('Draft delegation not found');
          return;
        }

        const countryToSubmit = sanitizedCountry || draftDelegation.country;
        if (!countryToSubmit || countryToSubmit === 'Unknown') {
          openCountryDialog(delegationId, true, draftDelegation.country || manager?.country || '');
          return;
        }

        // First create on server
        const draftTeamIds = draftDelegation.teamIds || [];
        const serverDelegation = await createDelegation({
          managerId: manager?.id,
          country: countryToSubmit,
          eventId: draftDelegation.eventId,
          teamIds: draftTeamIds,
        });

        const sDelId = serverDelegation.id ||
          serverDelegation._id ||
          (serverDelegation as any).data?.id ||
          (serverDelegation as any).data?._id ||
          (serverDelegation as any).delegation?.id ||
          (serverDelegation as any).delegation?._id;

        if (!sDelId) {
          console.error('Failed to extract delegation ID from server response:', serverDelegation);
          toast.error('Failed to get delegation ID from server');
          return;
        }

        // Update all teams with the new delegationId
        if (draftTeamIds.length > 0) {
          try {
            await Promise.all(
              draftTeamIds.map(teamId =>
                updateTeam(teamId, { delegationId: sDelId, delegation_id: sDelId } as any)
              )
            );
            console.log('Successfully associated teams with delegation on server');
          } catch (err: any) {
            console.error('Failed to associate teams with delegation:', err);
            toast.error(`Warning: Failed to link teams to delegation: ${err.message || err}`);
          }
        }

        // Then submit
        await submitDelegation(sDelId);

        // Remove from local drafts and delegations display
        setLocalDraftDelegations(prev => prev.filter(d => d.id !== delegationId));

        toast.success('Delegation submitted for admin review!');
      } else {
        // Already on server, check if country is unknown/empty
        const serverDel = delegations.find(d => d.id === delegationId);
        const countryToSubmit = sanitizedCountry || serverDel?.country;
        if (!countryToSubmit || countryToSubmit === 'Unknown') {
          openCountryDialog(delegationId, false, serverDel?.country || manager?.country || '');
          return;
        }

        if (sanitizedCountry && sanitizedCountry !== serverDel?.country) {
          // Update country on server
          await updateDelegation(delegationId, { country: sanitizedCountry });
        }

        await submitDelegation(delegationId);
        toast.success('Delegation submitted for admin review!');
      }

      void refetch();
    } catch (error: any) {
      console.error('Failed to submit delegation:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to submit delegation';
      toast.error(msg);
    }
  };

  const handleSubmitDelegation = async (delegationId: string) => {
    await submitDelegationWithCountry(delegationId);
  };

  const handleConfirmCountry = async () => {
    if (!pendingSubmission) return;
    const trimmed = countryInput.trim();
    if (!trimmed) {
      toast.error('Country name is required to submit delegation');
      return;
    }

    const { delegationId } = pendingSubmission;
    setIsCountryDialogOpen(false);
    setPendingSubmission(null);
    await submitDelegationWithCountry(delegationId, trimmed);
  };

  const handleDeleteDraft = async (delegationId: string) => {
    const isLocal = delegationId.startsWith('draft-');
    if (isLocal) {
      setLocalDraftDelegations(prev => prev.filter(d => d.id !== delegationId));
      toast.success('Draft delegation deleted');
    } else {
      try {
        await deleteDelegation(delegationId);
        toast.success('Draft delegation deleted from server');
        void refetch();
      } catch (err: any) {
        console.error('Failed to delete delegation from server:', err);
        toast.error('Failed to delete delegation from server');
      }
    }
  };

  const getMemberCount = (delegation: Delegation) => {
    // Live roster (fresh listTeamMembers data) first — the backend's totalMembers
    // snapshot is only ever written at creation/headcount-submit and goes stale
    // as soon as members are added or removed afterward.
    if (membersByTeam.size > 0) return getDelegationRoster(delegation).length;

    const backendTotal = (delegation as any).totalMembers;
    if (backendTotal > 0) return backendTotal;

    let total = 0;
    for (const teamId of (delegation.teamIds || [])) {
      const team = teams.find(t => t.id === teamId);
      if (team) {
        total += team.memberCount || 0;
      }
    }
    return total;
  };

  const getDelegationRoster = (delegation: Delegation): any[] =>
    (delegation.teamIds || []).flatMap((teamId) => membersByTeam.get(teamId) || []);

  interface CategoryBreakdown {
    category: string;
    expected: number;
    actual: number;
    matches: boolean;
  }

  interface TeamSlotBreakdown {
    slotIndex: number;
    slotName: string;
    team?: Team;
    categories: CategoryBreakdown[];
  }

  const getDelegationTeamObjects = (delegation: Delegation): Team[] =>
    (delegation.teamIds || [])
      .map((teamId) => teams.find((t: any) => t.id === teamId))
      .filter(Boolean) as Team[];

  // Per declared team-slot (not one flat delegation-wide total): each slot's
  // "actual" only counts members on the team actually bound to that slot via
  // Team.expectedTeamIndex, so a slot with no team yet — or a team short a
  // member — is visible on its own, not hidden inside an aggregate total.
  const getTeamSlotBreakdown = (delegation: Delegation): TeamSlotBreakdown[] => {
    const expectedTeams = delegation.expectedTeams || [];
    const delegationTeams = getDelegationTeamObjects(delegation);

    return expectedTeams.map((slot, index) => {
      const team = delegationTeams.find((t: any) => t.expectedTeamIndex === index);
      const members = team ? (membersByTeam.get(team.id) || []) : [];
      const actualCounts: Record<string, number> = {};
      for (const member of members) {
        const category = member.role || '';
        actualCounts[category] = (actualCounts[category] || 0) + 1;
      }

      const expectedCounts = slot.memberCounts || {};
      const categories = new Set([...Object.keys(expectedCounts), ...Object.keys(actualCounts)]);
      const categoryBreakdown = Array.from(categories).map((category) => {
        const expected = Number(expectedCounts[category] || 0);
        const actual = actualCounts[category] || 0;
        return {
          category: category === '' ? 'Uncategorized' : category,
          expected,
          actual,
          matches: expected === actual,
        };
      });

      return {
        slotIndex: index,
        slotName: slot.name || `Team ${index + 1}`,
        team,
        categories: categoryBreakdown,
      };
    });
  };

  // Members of a slot-bound team sitting in a category that's over its
  // declared count — e.g. slot needs 2 Athletes/Players, team already has 3
  // (commonly from attaching a pre-existing team that wasn't built for this
  // plan). Every member in an over-filled category is equally "extra" — no
  // single one is more removable than another — so all of them come back
  // here, and the set only shrinks once enough are actually removed.
  const getExcessMembersForTeam = (team: Team, delegation: Delegation): any[] => {
    if (team.expectedTeamIndex === undefined || team.expectedTeamIndex === null) return [];
    const slotBreakdown = getTeamSlotBreakdown(delegation).find((s) => s.slotIndex === team.expectedTeamIndex);
    if (!slotBreakdown) return [];

    const overCategories = new Set(
      slotBreakdown.categories.filter((c) => c.actual > c.expected).map((c) => c.category),
    );
    if (overCategories.size === 0) return [];

    const members = membersByTeam.get(team.id) || [];
    return members.filter((m: any) => overCategories.has(m.role || 'Uncategorized'));
  };

  // Categories where a slot-bound team still has fewer people than declared
  // — e.g. slot needs 1 Nutritionist, team has 0. Complements
  // getExcessMembersForTeam: that flags too many, this flags too few.
  const getMissingRolesForTeam = (
    team: Team,
    delegation: Delegation,
  ): { category: string; missing: number }[] => {
    if (team.expectedTeamIndex === undefined || team.expectedTeamIndex === null) return [];
    const slotBreakdown = getTeamSlotBreakdown(delegation).find((s) => s.slotIndex === team.expectedTeamIndex);
    if (!slotBreakdown) return [];

    return slotBreakdown.categories
      .filter((c) => c.actual < c.expected)
      .map((c) => ({ category: c.category, missing: c.expected - c.actual }));
  };

  // Delegation-wide aggregate (all slots' categories summed together) — used
  // for the roster review modal's browse-by-role view, where the manager
  // doesn't care which physical team an athlete belongs to. Not used for
  // gating send/approval anymore — see getTeamSlotBreakdown for that.
  const getCategoryBreakdown = (delegation: Delegation): CategoryBreakdown[] => {
    const expectedCounts: Record<string, number> = {};
    for (const slot of delegation.expectedTeams || []) {
      for (const [category, count] of Object.entries(slot.memberCounts || {})) {
        expectedCounts[category] = (expectedCounts[category] || 0) + Number(count || 0);
      }
    }
    const actualCounts: Record<string, number> = {};
    for (const member of getDelegationRoster(delegation)) {
      const category = member.role || '';
      actualCounts[category] = (actualCounts[category] || 0) + 1;
    }

    const categories = new Set([...Object.keys(expectedCounts), ...Object.keys(actualCounts)]);
    return Array.from(categories).map((category) => {
      const expected = expectedCounts[category] || 0;
      const actual = actualCounts[category] || 0;
      return {
        category: category === '' ? 'Uncategorized' : category,
        expected,
        actual,
        matches: expected === actual,
      };
    });
  };

  const isMemberRegistrationComplete = (member: any) => {
    const p = member.participant || {};
    return Boolean(p.passportNumber && p.organization && p.jobTitle);
  };

  // Ready to send only once every declared team-slot has a team created for
  // it, that team's category counts match the slot exactly, AND every member
  // on the roster has actually filled in their registration form — matches
  // the backend's submitRoster validation, so "you can send" never lies.
  const isRosterReadyToSend = (delegation: Delegation): boolean => {
    const slots = getTeamSlotBreakdown(delegation);
    if (slots.length === 0) return false;
    if (!slots.every((slot) => !!slot.team && slot.categories.every((c) => c.matches))) return false;
    const roster = getDelegationRoster(delegation);
    return roster.length > 0 && roster.every((member) => isMemberRegistrationComplete(member));
  };

  // "Approved" is reused for two different moments: admin approving the
  // declared headcount (before any roster is sent), and the delegation
  // reaching full completion after every individual member's registration
  // has been approved. Only the second one is truly done — distinguish it by
  // requiring the roster to be complete (every slot filled and matching) AND
  // every member in it Approved. Previously this only checked the second
  // half, so a roster short a whole declared member could still read as done.
  const isDelegationFullyApproved = (delegation: Delegation): boolean => {
    if (delegation.status !== 'Approved') return false;
    if (!isRosterReadyToSend(delegation)) return false;
    const roster = getDelegationRoster(delegation);
    return roster.length > 0 && roster.every((member: any) => member.status === 'Approved');
  };

  const getDelegationMembersList = async (delegation: Delegation): Promise<TeamMember[]> => {
    const allMembers: TeamMember[] = [];
    try {
      for (const teamId of (delegation.teamIds || [])) {
        const teamMembers = await listTeamMembers(teamId);
        allMembers.push(...teamMembers);
      }
    } catch (error) {
      console.error('Failed to fetch delegation members:', error);
      toast.error('Failed to fetch team members');
    }
    return allMembers;
  };

  /**
   * Once a member's roster entry has actually been sent to (and reviewed by)
   * admin, the badge should reflect that review outcome — Approved/Rejected/
   * Submitted — not just whether their profile fields are filled in. Before
   * the roster is ever sent (status still Draft), fall back to the profile-
   * completeness check, since admin review hasn't started yet.
   */
  const getMemberReviewBadge = (member: any): { label: string; className: string } => {
    switch (member.status) {
      case 'Approved':
        return { label: 'Approved', className: 'bg-status-success/10 text-status-success ring-status-success/25' };
      case 'Rejected':
        return { label: 'Rejected', className: 'bg-status-error/10 text-status-error ring-status-error/25' };
      case 'Submitted':
      case 'UnderReview':
        return { label: 'Submitted', className: 'bg-status-info/10 text-status-info ring-status-info/25' };
      default: {
        const complete = isMemberRegistrationComplete(member);
        return complete
          ? { label: 'Registered', className: 'bg-status-success/10 text-status-success ring-status-success/25' }
          : { label: 'Not registered', className: 'bg-amber-50 text-amber-800 ring-amber-300/80' };
      }
    }
  };

  const openMemberRegistrations = (delegation: Delegation) => {
    setMemberRegistrationsDelegation(delegation);
    setRosterCategoryTab('__all__');
    setIsMemberRegistrationsOpen(true);
  };

  const {
    data: delegationMembersList = [],
    isLoading: isLoadingDelegationMembers,
  } = useQuery({
    queryKey: ['manager', 'delegationMembers', memberRegistrationsDelegation?.id],
    queryFn: () => getDelegationMembersList(memberRegistrationsDelegation as Delegation),
    enabled: isMemberRegistrationsOpen && !!memberRegistrationsDelegation,
  });

  const openHeadcountDialog = (delegation: Delegation) => {
    setHeadcountDelegation(delegation);
    const existing = delegation.expectedTeams;
    setHeadcountTeams(
      existing && existing.length > 0
        ? existing.map((slot) => ({ name: slot.name || '', counts: { ...(slot.memberCounts || {}) } }))
        : [{ name: '', counts: {} }],
    );
    setIsHeadcountOpen(true);
  };

  const handleSaveHeadcount = async () => {
    if (!headcountDelegation) return;

    setIsSavingHeadcount(true);
    try {
      const expectedTeams = buildExpectedTeams();
      await updateDelegation(headcountDelegation.id, { expectedTeams });
      toast.success('Team plan saved');
      setIsHeadcountOpen(false);
      setHeadcountDelegation(null);
      void refetch();
    } catch (error: any) {
      console.error('Failed to save headcount:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to save team plan';
      toast.error(msg);
    } finally {
      setIsSavingHeadcount(false);
    }
  };

  const getTotalHeadcount = (delegation: Delegation) =>
    (delegation.expectedTeams || []).reduce(
      (sum, slot) => sum + Object.values(slot.memberCounts || {}).reduce((s, n) => s + (Number(n) || 0), 0),
      0,
    );

  const handleSendDelegation = async (delegationId: string) => {
    setSubmittingRosterId(delegationId);
    try {
      await submitDelegationRoster(delegationId);
      toast.success('Delegation roster sent for review');
      void refetch();
    } catch (error: any) {
      console.error('Failed to send delegation roster:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to send delegation';
      toast.error(msg);
    } finally {
      setSubmittingRosterId(null);
    }
  };

  const openBulkTravel = (delegation: Delegation) => {
    setSelectedDelegation(delegation);
    setBulkTravelPrefs({
      needsVisa: false,
      needsAccommodation: true,
      needsTransport: true,
      originCity: manager?.country || '',
      departureAirport: '',
      preferredArrivalDate: '',
      preferredDepartureDate: '',
      seatPreference: 'No Preference',
      mealPreference: '',
      specialRequirements: '',
    });
    setBulkProgress(0);
    setIsBulkTravelOpen(true);
  };

  const handleBulkSetTravelPrefs = async () => {
    if (!selectedDelegation || !manager) return;

    setIsSubmittingBulk(true);
    setBulkProgress(0);

    try {
      const members = await getDelegationMembersList(selectedDelegation);
      if (members.length === 0) {
        toast.error('No members found in this delegation');
        setIsSubmittingBulk(false);
        return;
      }

      const event = events.find(e => e.id === selectedDelegation.eventId);
      if (!event) {
        toast.error('Event not found');
        setIsSubmittingBulk(false);
        return;
      }

      if (bulkTravelPrefs.needsTransport && (!bulkTravelPrefs.originCity || !bulkTravelPrefs.departureAirport)) {
        toast.error('Please fill in origin city and departure airport');
        setIsSubmittingBulk(false);
        return;
      }

      if (bulkTravelPrefs.needsTransport && (!bulkTravelPrefs.preferredArrivalDate || !bulkTravelPrefs.preferredDepartureDate)) {
        toast.error('Please fill in preferred travel dates');
        setIsSubmittingBulk(false);
        return;
      }

      let processed = 0;
      const total = members.length;

      for (const member of members) {
        // Update team member with travel preferences via API
        await updateTeamMember(member.id, {
          travelPreferences: bulkTravelPrefs,
        });

        processed++;
        setBulkProgress(Math.round((processed / total) * 100));
      }

      toast.success(`Travel preferences set for ${members.length} members!`);
      setIsBulkTravelOpen(false);
      setSelectedDelegation(null);
      void refetch();
    } catch (error) {
      console.error('Bulk travel preferences error:', error);
      toast.error('Failed to set travel preferences');
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  const summarizeDelegation = (delegation: Delegation) => {
    const breakdown = getCategoryBreakdown(delegation);
    const matchedRoles = breakdown.filter((entry) => entry.matches).length;
    const mismatched = breakdown.filter((entry) => !entry.matches);
    const rosterProgress = breakdown.length > 0
      ? Math.round((matchedRoles / breakdown.length) * 100)
      : 0;
    const teamCount = (delegation.teamIds || []).length;
    const memberCount = getMemberCount(delegation);
    const expectedCount = getTotalHeadcount(delegation);
    const countryLabel = delegation.country || manager?.country || 'Unknown';
    const teamNames = (delegation.teamIds || [])
      .map((teamId) => teams.find((t) => t.id === teamId)?.name)
      .filter(Boolean) as string[];
    const visibleGaps = mismatched.slice(0, 4);
    const hiddenGapCount = Math.max(0, mismatched.length - visibleGaps.length);

    return {
      breakdown,
      matchedRoles,
      mismatched,
      rosterProgress,
      teamCount,
      memberCount,
      expectedCount,
      countryLabel,
      teamNames,
      visibleGaps,
      hiddenGapCount,
      eventName: getEventName(delegation),
      readyToSend: isRosterReadyToSend(delegation),
      fullyApproved: isDelegationFullyApproved(delegation),
    };
  };

  const approvedCount = delegations.filter((d) => isDelegationFullyApproved(d)).length;
  const pendingCount = delegations.filter(
    (d) =>
      d.status === 'Submitted' ||
      d.status === 'Update Requested' ||
      d.status === 'Draft' ||
      d.status === 'Roster Submitted' ||
      (d.status === 'Approved' && !isDelegationFullyApproved(d)),
  ).length;

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.06] via-card to-card px-6 py-6 shadow-sm sm:px-8 sm:py-7">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/[0.07] blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/70">
              Team Manager Portal
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Delegations</h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Register and track your country&apos;s delegation for events you&apos;ve been invited to.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/15">
                <Flag className="h-3.5 w-3.5" />
                <span className="tabular-nums">{delegations.length}</span>
                total
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-status-success/10 px-2.5 py-1 text-xs font-semibold text-status-success ring-1 ring-inset ring-status-success/20">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="tabular-nums">{approvedCount}</span>
                approved
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border/70">
                <Clock className="h-3.5 w-3.5" />
                <span className="tabular-nums">{pendingCount}</span>
                in progress
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            className="h-10 shrink-0 gap-1.5 bg-card"
            onClick={() => navigate('/manager/invitations')}
          >
            View Invitations
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

        <Dialog open={isCreateOpen} onOpenChange={handleCreateOpenChange}>
          <DialogContent className="flex w-[calc(100vw-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl border bg-background p-0 shadow-2xl max-h-[90vh]">
            <DialogHeader className="shrink-0 space-y-0 border-b bg-gradient-to-br from-primary/[0.07] via-card to-card px-6 py-5 pe-12 text-start">
              <div className="flex items-start gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-inset ring-primary/15 shadow-sm">
                  <Flag className="h-5 w-5" />
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/70">
                    Team Manager Portal
                  </p>
                  <DialogTitle className="text-xl font-semibold tracking-tight">
                    Register Delegation
                  </DialogTitle>
                  <DialogDescription className="text-sm leading-relaxed">
                    Confirm the event and country, then declare how many people will attend by role.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <section className="grid gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:grid-cols-2 sm:p-5">
                <div className="space-y-2">
                  <Label className="text-[12px] font-semibold">Event</Label>
                  <div className="flex h-10 items-center gap-2.5 rounded-lg border border-border/80 bg-muted/30 px-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Calendar className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate text-sm font-medium text-foreground">
                      {getSelectableEvents()[0]?.name || createFromInvitationEventName || 'Selected event'}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[12px] font-semibold">
                    Delegation Country <span className="text-destructive">*</span>
                  </Label>
                  <CountryCombobox
                    value={delegationCountry}
                    onChange={setDelegationCountry}
                    placeholder="Select country"
                    className="h-10"
                  />
                </div>
              </section>

              <section className="space-y-3">
                <div className="px-0.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary/60" />
                    <h2 className="text-sm font-semibold text-foreground">Team plan</h2>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Declare how many teams you'll bring and each team's expected roster. You'll add people's names later, once this is approved.
                  </p>
                </div>

                <TeamPlanEditor teams={headcountTeams} onChange={setHeadcountTeams} disabled={isCreating} />
              </section>
            </div>

            <DialogFooter className="shrink-0 gap-2 border-t bg-muted/20 px-6 py-3.5 sm:justify-between">
              <p className="hidden text-[11px] text-muted-foreground sm:block">
                Counts can be adjusted before you submit for approval.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-9"
                  onClick={() => handleCreateOpenChange(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button className="h-9 gap-1.5 shadow-sm" onClick={handleSendRegistration} disabled={isCreating}>
                  {isCreating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  {isCreating ? 'Sending…' : 'Send Registration'}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 py-24">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading delegations…</p>
        </div>
      ) : delegations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-20 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Flag className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No delegations yet</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
            Accept an event invitation to register your delegation.
          </p>
          <Button className="mt-5 gap-1.5" onClick={() => navigate('/manager/invitations')}>
            <Flag className="h-4 w-4" />
            View Invitations
          </Button>
        </div>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 px-0.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary/60" />
              <h2 className="text-sm font-semibold text-foreground">
                Your delegations
                <span className="ml-1.5 font-normal text-muted-foreground">({delegations.length})</span>
              </h2>
            </div>
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
          </div>

          {viewMode === 'table' ? (
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_10px_30px_-18px_hsl(var(--foreground)/0.18)]">
              <div className="overflow-x-auto">
                <Table className="w-full min-w-[760px]">
                  <TableHeader>
                    <TableRow className="border-border/70 hover:bg-transparent">
                      <TableHead className="h-12 bg-muted/55 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                        Delegation
                      </TableHead>
                      <TableHead className="h-12 w-[150px] bg-muted/55 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="h-12 w-[88px] bg-muted/55 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                        Teams
                      </TableHead>
                      <TableHead className="h-12 w-[110px] bg-muted/55 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                        Members
                      </TableHead>
                      <TableHead className="h-12 w-[160px] bg-muted/55 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                        Roster
                      </TableHead>
                      <TableHead className="h-12 w-[200px] bg-muted/55 text-end text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {delegations.map((delegation) => {
                      const row = summarizeDelegation(delegation);
                      const tone = getDelegationStatusTone(delegation.status, row.fullyApproved);
                      return (
                        <TableRow
                          key={delegation.id}
                          className="border-border/65 transition-colors hover:bg-primary/[0.025]"
                        >
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-inset ring-primary/10 shadow-sm">
                                <Flag className="h-4 w-4" />
                                <span
                                  className={cn(
                                    'absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card',
                                    tone.dot,
                                  )}
                                  aria-hidden
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                                  {row.countryLabel} Delegation
                                </p>
                                <p className="truncate text-xs text-muted-foreground">{row.eventName}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <DelegationStatusChip
                              status={delegation.status}
                              fullyApproved={row.fullyApproved}
                            />
                          </TableCell>
                          <TableCell className="py-4 text-center">
                            <span className="inline-flex min-w-[2rem] items-center justify-center rounded-lg bg-muted/50 px-2 py-1 text-sm font-semibold tabular-nums text-foreground ring-1 ring-inset ring-border/60">
                              {row.teamCount}
                            </span>
                          </TableCell>
                          <TableCell className="py-4 text-center">
                            <span className="inline-flex items-center justify-center rounded-lg bg-muted/50 px-2.5 py-1 text-sm font-semibold tabular-nums text-foreground ring-1 ring-inset ring-border/60">
                              {row.memberCount}
                              {row.expectedCount > 0 ? (
                                <span className="ms-0.5 font-medium text-muted-foreground">/{row.expectedCount}</span>
                              ) : null}
                            </span>
                          </TableCell>
                          <TableCell className="py-4">
                            {row.breakdown.length === 0 ? (
                              <span className="inline-flex items-center rounded-full border border-dashed border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                Not declared
                              </span>
                            ) : (
                              <div className="min-w-[120px] space-y-1.5 rounded-xl border border-border/70 bg-muted/25 px-2.5 py-2">
                                <div className="flex items-center justify-between gap-2 text-[11px]">
                                  <span className="font-semibold tabular-nums text-foreground">
                                    {row.matchedRoles}/{row.breakdown.length}
                                  </span>
                                  <span
                                    className={cn(
                                      'font-bold tabular-nums',
                                      row.mismatched.length === 0 ? 'text-status-success' : 'text-amber-700',
                                    )}
                                  >
                                    {row.rosterProgress}%
                                  </span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={cn(
                                      'h-full rounded-full transition-all',
                                      row.mismatched.length === 0 ? 'bg-status-success' : 'bg-primary',
                                    )}
                                    style={{ width: `${Math.min(100, Math.max(0, row.rosterProgress))}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              {delegation.status === 'Approved' && row.teamCount === 0 && (
                                <Button size="sm" className="h-8 shadow-sm" onClick={() => openSelectTeamDialog(delegation)}>
                                  Select team
                                </Button>
                              )}
                              {delegation.status === 'Approved' && row.teamCount > 0 && row.fullyApproved && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 gap-1.5 border-border/80 bg-background shadow-sm"
                                  onClick={() => openMemberRegistrations(delegation)}
                                >
                                  <ClipboardList className="h-3.5 w-3.5" />
                                  Roster
                                </Button>
                              )}
                              {delegation.status === 'Approved' && row.teamCount > 0 && !row.fullyApproved && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 gap-1.5 border-border/80 bg-background shadow-sm"
                                    onClick={() => openMemberRegistrations(delegation)}
                                  >
                                    <ClipboardList className="h-3.5 w-3.5" />
                                    Roster
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="h-8 shadow-sm"
                                    onClick={() => handleSendDelegation(delegation.id)}
                                    disabled={submittingRosterId === delegation.id || !row.readyToSend}
                                  >
                                    {submittingRosterId === delegation.id
                                      ? '…'
                                      : row.readyToSend
                                        ? 'Send'
                                        : 'Fix roster'}
                                  </Button>
                                </>
                              )}
                              {(delegation.status === 'Draft' ||
                                delegation.status === 'Rejected' ||
                                delegation.status === 'Update Requested') && (
                                <Button
                                  size="sm"
                                  className="h-8 shadow-sm"
                                  onClick={() => handleSubmitDelegation(delegation.id)}
                                >
                                  Submit
                                </Button>
                              )}
                              {delegation.status === 'Submitted' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 gap-1.5 border-border/80 bg-background shadow-sm"
                                  onClick={() => openBulkTravel(delegation)}
                                >
                                  <Plane className="h-3.5 w-3.5" />
                                  Travel
                                </Button>
                              )}
                              {delegation.status === 'Roster Submitted' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 gap-1.5 border-border/80 bg-background shadow-sm"
                                  onClick={() => openMemberRegistrations(delegation)}
                                >
                                  <ClipboardList className="h-3.5 w-3.5" />
                                  Roster
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              {delegations.map((delegation) => {
                const row = summarizeDelegation(delegation);

                return (
                  <article
                    key={delegation.id}
                    className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] transition-shadow hover:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_16px_40px_-16px_rgba(15,23,42,0.14)]"
                  >
                    <div
                      className={cn(
                        'absolute inset-y-0 left-0 w-1',
                        getDelegationStatusTone(delegation.status, row.fullyApproved).bar,
                      )}
                      aria-hidden
                    />

                    <div className="space-y-4 p-5 pl-6 sm:p-6 sm:pl-7">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                'flex h-7 w-7 items-center justify-center rounded-lg ring-1 ring-inset',
                                getDelegationStatusTone(delegation.status, row.fullyApproved).chip,
                              )}
                            >
                              {getStatusIcon(delegation.status, row.fullyApproved)}
                            </span>
                            <h3 className="text-lg font-semibold tracking-tight text-foreground">
                              {row.countryLabel} Delegation
                            </h3>
                          </div>
                          <p className="text-sm text-muted-foreground">{row.eventName}</p>
                        </div>
                        <DelegationStatusChip
                          status={delegation.status}
                          fullyApproved={row.fullyApproved}
                        />
                      </div>

                      {delegation.status === 'Update Requested' && delegation.reviewMessage && (
                        <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3.5 py-3 text-sm text-amber-950">
                          <p className="font-medium">Changes requested by admin</p>
                          <p className="mt-1 text-amber-900/90">{delegation.reviewMessage}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-muted/40 px-3 py-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Teams</p>
                          <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{row.teamCount}</p>
                        </div>
                        <div className="rounded-xl bg-muted/40 px-3 py-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Members</p>
                          <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{row.memberCount}</p>
                        </div>
                        <div className="rounded-xl bg-muted/40 px-3 py-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Expected</p>
                          <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
                            {row.expectedCount > 0 ? row.expectedCount : '—'}
                          </p>
                        </div>
                      </div>

                      {row.breakdown.length > 0 && (
                        <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/20 p-3.5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold text-foreground">Roster fill</p>
                              <p className="text-[11px] text-muted-foreground">
                                {row.matchedRoles} of {row.breakdown.length} roles match
                              </p>
                            </div>
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ring-1 ring-inset',
                                row.mismatched.length === 0
                                  ? 'bg-status-success/10 text-status-success ring-status-success/20'
                                  : 'bg-amber-500/10 text-amber-700 ring-amber-500/20',
                              )}
                            >
                              {row.rosterProgress}%
                            </span>
                          </div>
                          <Progress value={row.rosterProgress} className="h-1.5" />

                          {row.mismatched.length > 0 ? (
                            <div className="space-y-1.5">
                              {row.visibleGaps.map((entry) => (
                                <div
                                  key={entry.category}
                                  className="flex items-center justify-between gap-3 rounded-lg border border-amber-200/70 bg-amber-50/70 px-2.5 py-1.5"
                                >
                                  <span className="min-w-0 truncate text-[12px] font-medium text-amber-900">
                                    {entry.category}
                                  </span>
                                  <span className="shrink-0 text-[11px] font-bold tabular-nums text-amber-800">
                                    {entry.actual}/{entry.expected}
                                  </span>
                                </div>
                              ))}
                              {row.hiddenGapCount > 0 && (
                                <button
                                  type="button"
                                  className="w-full rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold text-primary hover:bg-primary/5"
                                  onClick={() => openMemberRegistrations(delegation)}
                                >
                                  +{row.hiddenGapCount} more roles — open roster
                                </button>
                              )}
                            </div>
                          ) : (
                            <p className="flex items-center gap-1.5 text-[11px] font-medium text-status-success">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              All declared roles are filled correctly
                            </p>
                          )}
                        </div>
                      )}

                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Teams included
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {row.teamCount === 0 ? (
                            <span className="text-sm text-muted-foreground">No team selected yet</span>
                          ) : (
                            row.teamNames.map((name) => (
                              <Badge key={name} variant="secondary" className="rounded-md text-xs font-medium">
                                {name}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 border-t border-border/70 pt-4">
                        {(delegation.status === 'Draft' ||
                          delegation.status === 'Rejected' ||
                          delegation.status === 'Update Requested') && (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                variant="outline"
                                className="h-9 gap-1.5"
                                onClick={() => openHeadcountDialog(delegation)}
                              >
                                <ClipboardList className="h-3.5 w-3.5" />
                                {row.expectedCount > 0 ? 'Edit counts' : 'Declare counts'}
                              </Button>
                              <Button
                                variant="outline"
                                className="h-9 gap-1.5"
                                onClick={() => openBulkTravel(delegation)}
                              >
                                <Plane className="h-3.5 w-3.5" />
                                Travel
                              </Button>
                            </div>
                            <Button
                              className="h-10 gap-2 shadow-sm"
                              onClick={() => handleSubmitDelegation(delegation.id)}
                            >
                              <Send className="h-4 w-4" />
                              {delegation.status === 'Update Requested'
                                ? 'Resubmit for approval'
                                : 'Submit for approval'}
                            </Button>
                          </>
                        )}

                        {delegation.status === 'Submitted' && (
                          <Button
                            variant="outline"
                            className="h-9 gap-1.5"
                            onClick={() => openBulkTravel(delegation)}
                          >
                            <Plane className="h-3.5 w-3.5" />
                            Update travel preferences
                          </Button>
                        )}

                        {delegation.status === 'Approved' && row.teamCount === 0 && (
                          <Button
                            className="h-10 gap-2 shadow-sm"
                            onClick={() => openSelectTeamDialog(delegation)}
                          >
                            <Users className="h-4 w-4" />
                            Select team
                          </Button>
                        )}

                        {delegation.status === 'Approved' && row.teamCount > 0 && row.fullyApproved && (
                          <>
                            <div className="rounded-xl border border-status-success/30 bg-status-success/10 px-3.5 py-3 text-sm text-status-success">
                              Delegation approved — every member has been reviewed and approved by admin.
                            </div>
                            <Button
                              variant="outline"
                              className="h-9 gap-1.5"
                              onClick={() => openMemberRegistrations(delegation)}
                            >
                              <ClipboardList className="h-3.5 w-3.5" />
                              Roster
                            </Button>
                          </>
                        )}

                        {delegation.status === 'Approved' && row.teamCount > 0 && !row.fullyApproved && (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                variant="outline"
                                className="h-9 gap-1.5"
                                onClick={() => openSelectTeamDialog(delegation)}
                              >
                                <Users className="h-3.5 w-3.5" />
                                Change team
                              </Button>
                              <Button
                                variant="outline"
                                className="h-9 gap-1.5"
                                onClick={() => openMemberRegistrations(delegation)}
                              >
                                <ClipboardList className="h-3.5 w-3.5" />
                                Roster
                              </Button>
                            </div>
                            <Button
                              className="h-10 gap-2 shadow-sm"
                              onClick={() => handleSendDelegation(delegation.id)}
                              disabled={submittingRosterId === delegation.id || !row.readyToSend}
                            >
                              {submittingRosterId === delegation.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                              {submittingRosterId === delegation.id
                                ? 'Sending…'
                                : row.memberCount === 0
                                  ? 'Add members to send'
                                  : !row.readyToSend
                                    ? 'Fix roster to send'
                                    : 'Send delegation'}
                            </Button>
                          </>
                        )}

                        {delegation.status === 'Roster Submitted' && (
                          <>
                            <div className="rounded-xl border border-status-info/30 bg-status-info/10 px-3.5 py-3 text-sm text-status-info">
                              Roster sent — waiting for admin to review and approve each member.
                            </div>
                            <Button
                              variant="outline"
                              className="h-9 gap-1.5"
                              onClick={() => openMemberRegistrations(delegation)}
                            >
                              <ClipboardList className="h-3.5 w-3.5" />
                              Roster
                            </Button>
                          </>
                        )}
                      </div>

                      {delegation.submittedAt && (
                        <p className="text-[11px] text-muted-foreground">
                          Submitted {new Date(delegation.submittedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Bulk Travel Preferences Dialog */}
      <Dialog open={isBulkTravelOpen} onOpenChange={setIsBulkTravelOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Bulk Set Travel Preferences
            </DialogTitle>
          </DialogHeader>

          {selectedDelegation && (
            <div className="space-y-6">
              {/* Summary */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{selectedDelegation.country || manager?.country || 'Unknown'} Delegation</p>
                      <p className="text-sm text-muted-foreground">
                        {getEventName(selectedDelegation)}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {getMemberCount(selectedDelegation)} members
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Travel Preferences */}
              <div className="space-y-4">
                <h3 className="font-semibold">Shared Travel Preferences</h3>
                <p className="text-sm text-muted-foreground">
                  These preferences will be applied to all members in the delegation.
                </p>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="bulkNeedsTransport"
                      checked={bulkTravelPrefs.needsTransport}
                      onCheckedChange={(checked) =>
                        setBulkTravelPrefs(prev => ({ ...prev, needsTransport: !!checked }))
                      }
                    />
                    <Label htmlFor="bulkNeedsTransport">Requires Air Travel Arrangement</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="bulkNeedsAccommodation"
                      checked={bulkTravelPrefs.needsAccommodation}
                      onCheckedChange={(checked) =>
                        setBulkTravelPrefs(prev => ({ ...prev, needsAccommodation: !!checked }))
                      }
                    />
                    <Label htmlFor="bulkNeedsAccommodation">Requires Accommodation</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="bulkNeedsVisa"
                      checked={bulkTravelPrefs.needsVisa}
                      onCheckedChange={(checked) =>
                        setBulkTravelPrefs(prev => ({ ...prev, needsVisa: !!checked }))
                      }
                    />
                    <Label htmlFor="bulkNeedsVisa">Requires Visa Assistance</Label>
                  </div>
                </div>

                {bulkTravelPrefs.needsTransport && (
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Plane className="h-4 w-4" />
                      Flight Details
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Origin City *</Label>
                        <Input
                          placeholder="e.g., London, UK"
                          value={bulkTravelPrefs.originCity}
                          onChange={(e) =>
                            setBulkTravelPrefs(prev => ({ ...prev, originCity: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Departure Airport *</Label>
                        <Select
                          value={bulkTravelPrefs.departureAirport}
                          onValueChange={(v) =>
                            setBulkTravelPrefs(prev => ({ ...prev, departureAirport: v }))
                          }
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
                        <Label>Preferred Arrival Date *</Label>
                        <Input
                          type="date"
                          value={bulkTravelPrefs.preferredArrivalDate}
                          onChange={(e) =>
                            setBulkTravelPrefs(prev => ({ ...prev, preferredArrivalDate: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Preferred Departure Date *</Label>
                        <Input
                          type="date"
                          value={bulkTravelPrefs.preferredDepartureDate}
                          onChange={(e) =>
                            setBulkTravelPrefs(prev => ({ ...prev, preferredDepartureDate: e.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Seat Preference</Label>
                        <Select
                          value={bulkTravelPrefs.seatPreference}
                          onValueChange={(v: 'Window' | 'Aisle' | 'No Preference') =>
                            setBulkTravelPrefs(prev => ({ ...prev, seatPreference: v }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="No Preference">No Preference</SelectItem>
                            <SelectItem value="Window">Window</SelectItem>
                            <SelectItem value="Aisle">Aisle</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Meal Preference</Label>
                        <Select
                          value={bulkTravelPrefs.mealPreference}
                          onValueChange={(v) =>
                            setBulkTravelPrefs(prev => ({ ...prev, mealPreference: v }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select meal" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Regular">Regular</SelectItem>
                            <SelectItem value="Vegetarian">Vegetarian</SelectItem>
                            <SelectItem value="Vegan">Vegan</SelectItem>
                            <SelectItem value="Halal">Halal</SelectItem>
                            <SelectItem value="Kosher">Kosher</SelectItem>
                            <SelectItem value="Gluten-Free">Gluten-Free</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Special Requirements</Label>
                      <Textarea
                        placeholder="Any special travel requirements for the delegation..."
                        value={bulkTravelPrefs.specialRequirements}
                        onChange={(e) =>
                          setBulkTravelPrefs(prev => ({ ...prev, specialRequirements: e.target.value }))
                        }
                        rows={2}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Progress */}
              {isSubmittingBulk && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Setting travel preferences...</span>
                    <span>{bulkProgress}%</span>
                  </div>
                  <Progress value={bulkProgress} className="h-2" />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkTravelOpen(false)}
              disabled={isSubmittingBulk}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkSetTravelPrefs}
              disabled={isSubmittingBulk}
            >
              {isSubmittingBulk ? 'Saving...' : `Set Travel for ${selectedDelegation ? getMemberCount(selectedDelegation) : 0} Members`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Country Required Dialog */}
      <Dialog
        open={isCountryDialogOpen}
        onOpenChange={(open) => {
          setIsCountryDialogOpen(open);
          if (!open) {
            setPendingSubmission(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delegation Country</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Country Name *</Label>
            <Input
              placeholder="e.g., Saudi Arabia"
              value={countryInput}
              onChange={(e) => setCountryInput(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCountryDialogOpen(false);
                setPendingSubmission(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmCountry}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Declare Attendee Counts Dialog */}
      <Dialog open={isHeadcountOpen} onOpenChange={(open) => {
        setIsHeadcountOpen(open);
        if (!open) setHeadcountDelegation(null);
      }}>
        <DialogContent className="flex w-[calc(100vw-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl border bg-background p-0 shadow-2xl max-h-[90vh]">
          <DialogHeader className="shrink-0 space-y-0 border-b bg-gradient-to-br from-primary/[0.07] via-card to-card px-6 py-5 pe-12 text-start">
            <div className="flex items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-inset ring-primary/15 shadow-sm">
                <ClipboardList className="h-5 w-5" />
              </span>
              <div className="min-w-0 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/70">
                  Delegation roster
                </p>
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  Declare Team Plan
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed">
                  Set how many teams you'll bring and each team's expected roster. Names come later after approval.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-5">
            <TeamPlanEditor teams={headcountTeams} onChange={setHeadcountTeams} disabled={isSavingHeadcount} />
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t bg-muted/20 px-6 py-3.5 sm:justify-end">
            <Button
              variant="outline"
              className="h-9"
              onClick={() => setIsHeadcountOpen(false)}
              disabled={isSavingHeadcount}
            >
              Cancel
            </Button>
            <Button className="h-9 gap-1.5 shadow-sm" onClick={handleSaveHeadcount} disabled={isSavingHeadcount}>
              {isSavingHeadcount ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ClipboardList className="h-3.5 w-3.5" />
              )}
              {isSavingHeadcount ? 'Saving…' : 'Save Counts'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Select Team Dialog (post-approval) */}
      <Dialog open={isSelectTeamOpen} onOpenChange={(open) => {
        setIsSelectTeamOpen(open);
        if (!open) {
          setSelectTeamDelegation(null);
          setSelectTeamIds([]);
          setCreatingSlotIndex(null);
          setNewTeamName('');
          setNewTeamSport('');
        }
      }}>
        <DialogContent className="flex max-h-[85vh] max-w-xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle>Select Team</DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-4">
            {selectTeamDelegation?.expectedTeams && selectTeamDelegation.expectedTeams.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Declared team slots</Label>
                <div className="space-y-2">
                  {selectTeamDelegation.expectedTeams.map((slot, index) => {
                    const boundTeam = getDelegationTeamObjects(selectTeamDelegation).find(
                      (t: any) => t.expectedTeamIndex === index,
                    );
                    const excessMembers = boundTeam
                      ? getExcessMembersForTeam(boundTeam, selectTeamDelegation)
                      : [];
                    const missingRoles = boundTeam
                      ? getMissingRolesForTeam(boundTeam, selectTeamDelegation)
                      : [];
                    const missingTotal = missingRoles.reduce((sum, m) => sum + m.missing, 0);
                    const missingTitle = missingRoles
                      .map((m) => `${m.missing} ${m.category}`)
                      .join(', ');
                    const slotSummary = Object.entries(slot.memberCounts || {})
                      .map(([category, count]) => `${count} ${category}`)
                      .join(', ') || 'No roster declared';

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-sm transition-colors hover:border-border"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 text-[11px] font-bold text-primary ring-1 ring-inset ring-primary/10">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-bold tracking-tight text-foreground">
                              {slot.name || `Team ${index + 1}`}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{slotSummary}</p>
                          </div>
                        </div>
                        {boundTeam ? (
                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                            {excessMembers.length === 0 && missingTotal === 0 && (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-status-success/25 bg-status-success-bg px-2.5 py-1 text-xs font-semibold text-status-success">
                                <CheckCircle2 className="h-3 w-3 shrink-0" />
                                <span className="max-w-[9rem] truncate">{boundTeam.name}</span>
                              </span>
                            )}
                            {missingTotal > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsSelectTeamOpen(false);
                                  setMissingRolesTeam(boundTeam);
                                }}
                                title={missingTitle}
                                className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100"
                              >
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                {missingTotal} role{missingTotal === 1 ? '' : 's'} missing
                              </button>
                            )}
                            {excessMembers.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsSelectTeamOpen(false);
                                  setTrimmingTeam(boundTeam);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/15"
                              >
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                {excessMembers.length} extra member{excessMembers.length === 1 ? '' : 's'}
                              </button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 gap-1.5 rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleRemoveTeamFromSlot(boundTeam)}
                              disabled={removingTeamId === boundTeam.id}
                            >
                              {removingTeamId === boundTeam.id ? (
                                <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3 shrink-0" />
                              )}
                              {removingTeamId === boundTeam.id ? 'Removing' : 'Remove'}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex shrink-0 items-center gap-1.5">
                            {selectableTeamsForDelegation.length > 0 && (
                              <Select
                                value=""
                                onValueChange={(teamId) =>
                                  handleUseExistingTeamForSlot(selectTeamDelegation.id, index, teamId)
                                }
                                disabled={assigningExistingTeamSlot === index}
                              >
                                <SelectTrigger className="h-8 w-[168px] rounded-full border-border/80 text-xs shadow-sm">
                                  <SelectValue
                                    placeholder={
                                      assigningExistingTeamSlot === index ? 'Assigning…' : 'Use existing team'
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {selectableTeamsForDelegation.map((team) => (
                                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            <Button
                              size="sm"
                              className="h-8 shrink-0 gap-1.5 rounded-full px-3.5 text-xs font-semibold shadow-sm"
                              onClick={() => openCreateTeamForSlot(index, slot.name || '')}
                            >
                              <Plus className="h-3 w-3 shrink-0" />
                              Create team
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {creatingSlotIndex !== null && (
                  <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/[0.03] p-3">
                    <p className="text-xs font-semibold text-primary">
                      New team for {selectTeamDelegation.expectedTeams[creatingSlotIndex]?.name || `Team ${creatingSlotIndex + 1}`}
                    </p>
                    <div className="space-y-2">
                      <Input
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="Team name"
                        className="h-9"
                        disabled={isCreatingTeamForSlot}
                      />
                      <Select value={newTeamSport} onValueChange={setNewTeamSport} disabled={isCreatingTeamForSlot}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Choose the team sport" />
                        </SelectTrigger>
                        <SelectContent>
                          {SPORT_CATEGORIES.filter((category) =>
                            selectedEventSports.has(category.name.toLowerCase()),
                          ).map((category) => (
                            <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCreatingSlotIndex(null)}
                        disabled={isCreatingTeamForSlot}
                      >
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleCreateTeamForSlot} disabled={isCreatingTeamForSlot}>
                        {isCreatingTeamForSlot ? 'Creating…' : 'Create & add members'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Delegations declared before the team-plan feature existed have
                no expectedTeams — fall back to the original free-form,
                multi-select team picker so they still work. Once a plan is
                declared, the per-slot pickers above are the only way in,
                since every team must be bound to a specific slot. */}
            {(!selectTeamDelegation?.expectedTeams || selectTeamDelegation.expectedTeams.length === 0) && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Or pick an existing team</Label>
                <p className="text-sm text-muted-foreground">
                  Only unassigned teams whose sport is offered by this event are shown. You can select more than one.
                </p>
                {teams.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No teams created yet — create one above, or go to Teams to create one first.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto border rounded-lg p-3">
                    {selectableTeamsForDelegation.map(team => (
                      <div key={team.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded">
                        <Checkbox
                          id={`select-team-${team.id}`}
                          checked={selectTeamIds.includes(team.id)}
                          onCheckedChange={() => handleToggleSelectTeam(team.id)}
                        />
                        <label htmlFor={`select-team-${team.id}`} className="flex-1 cursor-pointer text-sm">
                          <p className="font-medium">{team.name}</p>
                          <p className="text-muted-foreground">
                            {(team as any).sportName || team.subCategory || (team.sportCategory as any)?.subCategory || team.sportCategory}
                          </p>
                        </label>
                      </div>
                    ))}
                    {selectableTeamsForDelegation.length === 0 && (
                      <p className="text-sm text-center py-4 text-muted-foreground">
                        No eligible unassigned teams for this event's sports. Create a matching team first.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t px-6 py-3.5">
            {selectTeamDelegation?.expectedTeams && selectTeamDelegation.expectedTeams.length > 0 ? (
              <Button onClick={() => setIsSelectTeamOpen(false)}>Close</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsSelectTeamOpen(false)} disabled={isSavingTeamSelection}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmTeamSelection} disabled={isSavingTeamSelection || selectTeamIds.length === 0}>
                  {isSavingTeamSelection ? 'Saving...' : 'Confirm Team'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trim Excess Members Dialog */}
      <Dialog open={!!trimmingTeam} onOpenChange={(open) => !open && setTrimmingTeam(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Trim {trimmingTeam?.name}'s roster</DialogTitle>
            <DialogDescription>
              This team has more people in a category than the delegation plan declared. Every member
              below is equally over — remove enough to bring each category back down to what's needed.
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const excess = trimmingTeam && selectTeamDelegation
              ? getExcessMembersForTeam(trimmingTeam, selectTeamDelegation)
              : [];
            const byCategory = excess.reduce((groups: Record<string, any[]>, member: any) => {
              const category = member.role || 'Uncategorized';
              (groups[category] ||= []).push(member);
              return groups;
            }, {});

            if (excess.length === 0) {
              return (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-status-success" />
                  <p className="text-sm font-medium text-foreground">All categories are back in line.</p>
                </div>
              );
            }

            return (
              <div className="max-h-80 space-y-4 overflow-y-auto">
                {Object.entries(byCategory).map(([category, members]) => (
                  <div key={category} className="space-y-2">
                    <p className="text-xs font-semibold text-destructive">
                      {category} — {members.length} too many
                    </p>
                    <div className="space-y-1.5">
                      {members.map((member: any) => {
                        const p = member.participant || {};
                        const membershipId = resolveTeamMembershipId(member);
                        const initials =
                          `${p.firstName?.[0] || ''}${p.lastName?.[0] || ''}`.toUpperCase() || '?';
                        return (
                          <div
                            key={membershipId}
                            className="flex items-center justify-between gap-3 rounded-lg border border-destructive/25 bg-destructive/[0.04] p-2.5"
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <Avatar className="h-8 w-8 shrink-0 ring-1 ring-inset ring-destructive/20">
                                <AvatarFallback className="bg-destructive/10 text-xs font-semibold text-destructive">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">
                                  {p.firstName} {p.lastName}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">{p.email || 'No email'}</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 shrink-0 gap-1.5 rounded-full px-3 text-xs font-medium text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemoveExcessMember(member)}
                              disabled={removingExcessMembershipId === membershipId}
                            >
                              {removingExcessMembershipId === membershipId ? (
                                <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3 shrink-0" />
                              )}
                              Remove
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setTrimmingTeam(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Missing Roles Dialog */}
      <Dialog open={!!missingRolesTeam} onOpenChange={(open) => !open && setMissingRolesTeam(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Fill {missingRolesTeam?.name}'s roster</DialogTitle>
            <DialogDescription>
              These roles are still short of what the delegation plan declared for this team.
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const missing = missingRolesTeam && selectTeamDelegation
              ? getMissingRolesForTeam(missingRolesTeam, selectTeamDelegation)
              : [];

            if (missing.length === 0) {
              return (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-status-success" />
                  <p className="text-sm font-medium text-foreground">All declared roles are filled.</p>
                </div>
              );
            }

            return (
              <div className="space-y-2">
                {missing.map(({ category, missing: count }) => (
                  <div
                    key={category}
                    className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/25 bg-amber-50 p-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-amber-900">{category}</p>
                      <p className="text-xs text-amber-700">{count} still needed</p>
                    </div>
                    <Button
                      size="sm"
                      className="h-8 shrink-0 gap-1.5 rounded-full px-3 text-xs font-semibold"
                      onClick={() => missingRolesTeam && openAddMemberForRole(missingRolesTeam, category)}
                    >
                      <Plus className="h-3 w-3 shrink-0" />
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            );
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setMissingRolesTeam(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member For Role Dialog — opened from the Missing Roles list */}
      <Dialog open={!!addingRoleFor} onOpenChange={(open) => !open && setAddingRoleFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add {addingRoleFor?.category}</DialogTitle>
            <DialogDescription>
              To {addingRoleFor?.team.name}. Only people who play this team's sport and are declared as{' '}
              {addingRoleFor?.category} show up here.
            </DialogDescription>
          </DialogHeader>

          {!showQuickCreate ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by name or email…"
                  value={addMemberSearch}
                  onChange={(e) => setAddMemberSearch(e.target.value)}
                />
              </div>
              <div className="max-h-64 space-y-1.5 overflow-y-auto">
                {isLoadingAddMemberCandidates ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : filteredAddMemberCandidates().length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No matching members found — create one below.
                  </p>
                ) : (
                  filteredAddMemberCandidates().map((p: any) => {
                    const initials = `${p.firstName?.[0] || ''}${p.lastName?.[0] || ''}`.toUpperCase() || '?';
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/70 p-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{p.firstName} {p.lastName}</p>
                            <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="h-8 shrink-0 rounded-full px-3 text-xs"
                          onClick={() => handleAddExistingMemberForRole(p)}
                          disabled={addingParticipantId === p.id}
                        >
                          {addingParticipantId === p.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Add'
                          )}
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
              <Button variant="outline" className="w-full gap-1.5" onClick={() => setShowQuickCreate(true)}>
                <UserPlus2 className="h-3.5 w-3.5" />
                Can't find them? Create new
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-semibold">First name *</Label>
                  <Input
                    value={quickCreateForm.firstName}
                    onChange={(e) => setQuickCreateForm((prev) => ({ ...prev, firstName: e.target.value }))}
                    placeholder="e.g. Ahmed"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-semibold">Last name *</Label>
                  <Input
                    value={quickCreateForm.lastName}
                    onChange={(e) => setQuickCreateForm((prev) => ({ ...prev, lastName: e.target.value }))}
                    placeholder="e.g. Khan"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-semibold">Email *</Label>
                <Input
                  type="email"
                  value={quickCreateForm.email}
                  onChange={(e) => setQuickCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="member@example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-semibold">Phone</Label>
                  <Input
                    value={quickCreateForm.phone}
                    onChange={(e) => setQuickCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+92 300 1234567"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-semibold">Nationality</Label>
                  <CountryCombobox
                    value={quickCreateForm.nationality}
                    onChange={(nationality) => setQuickCreateForm((prev) => ({ ...prev, nationality }))}
                    placeholder="Select country"
                  />
                </div>
              </div>
              <div className="flex justify-between gap-2 pt-1">
                <Button variant="ghost" onClick={() => setShowQuickCreate(false)} disabled={isQuickCreating}>
                  Back to search
                </Button>
                <Button onClick={handleQuickCreateAndAdd} disabled={isQuickCreating}>
                  {isQuickCreating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    'Create & add'
                  )}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingRoleFor(null)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member Registrations Dialog */}
      <Dialog open={isMemberRegistrationsOpen} onOpenChange={(open) => {
        setIsMemberRegistrationsOpen(open);
        if (!open) {
          setMemberRegistrationsDelegation(null);
          setRosterCategoryTab('__all__');
        }
      }}>
        <DialogContent className="flex w-[calc(100vw-1.5rem)] max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl border bg-background p-0 shadow-2xl">
          <DialogHeader className="shrink-0 space-y-0 border-b bg-gradient-to-br from-primary/[0.07] via-card to-card px-6 py-5 pe-12 text-start">
            <div className="flex items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-inset ring-primary/15 shadow-sm">
                <ClipboardList className="h-5 w-5" />
              </span>
              <div className="min-w-0 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/70">
                  Delegation roster
                </p>
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  {memberRegistrationsDelegation
                    ? `${memberRegistrationsDelegation.country || manager?.country || 'Delegation'} roster`
                    : 'Delegation Roster'}
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed">
                  Pick a role above to review its people. Counts must match before you can send.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {(() => {
              const breakdown = memberRegistrationsDelegation
                ? getCategoryBreakdown(memberRegistrationsDelegation)
                : [];
              const matched = breakdown.filter((entry) => entry.matches).length;
              const membersByCategory = delegationMembersList.reduce((groups: Record<string, any[]>, member: any) => {
                const category = member.role || 'No category set';
                (groups[category] ||= []).push(member);
                return groups;
              }, {});

              const categoryTabs = [
                {
                  id: '__all__',
                  label: 'All',
                  actual: delegationMembersList.length,
                  expected: breakdown.reduce((sum, entry) => sum + entry.expected, 0),
                  matches: breakdown.length > 0 && breakdown.every((entry) => entry.matches),
                },
                ...breakdown.map((entry) => ({
                  id: entry.category,
                  label: entry.category,
                  actual: entry.actual,
                  expected: entry.expected,
                  matches: entry.matches,
                })),
              ];

              const activeTab = categoryTabs.some((tab) => tab.id === rosterCategoryTab)
                ? rosterCategoryTab
                : '__all__';

              const visibleMembers =
                activeTab === '__all__'
                  ? delegationMembersList
                  : (membersByCategory[activeTab] || []);

              const activeMeta = categoryTabs.find((tab) => tab.id === activeTab);

              return (
                <>
                  {breakdown.length > 0 && (
                    <div className="rounded-2xl border border-border/70 bg-muted/20 p-3.5">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-foreground">
                          {matched} of {breakdown.length} roles ready
                        </p>
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                          {breakdown.length
                            ? Math.round((matched / breakdown.length) * 100)
                            : 0}%
                        </span>
                      </div>
                      <Progress
                        value={breakdown.length ? Math.round((matched / breakdown.length) * 100) : 0}
                        className="h-1.5"
                      />
                    </div>
                  )}

                  {!isLoadingDelegationMembers && (breakdown.length > 0 || delegationMembersList.length > 0) && (
                    <div
                      className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                      role="tablist"
                      aria-label="Filter roster by role"
                    >
                      {categoryTabs.map((tab) => {
                        const active = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setRosterCategoryTab(tab.id)}
                            className={cn(
                              'inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all',
                              active
                                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                : 'border-border/80 bg-card text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground',
                            )}
                          >
                            <span className="max-w-[14rem] truncate" title={tab.label}>{tab.label}</span>
                            <span
                              className={cn(
                                'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                                active
                                  ? 'bg-primary-foreground/20 text-primary-foreground'
                                  : tab.matches
                                    ? 'bg-status-success/15 text-status-success'
                                    : 'bg-amber-500/10 text-amber-700',
                              )}
                            >
                              {tab.actual}/{tab.expected || '—'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {isLoadingDelegationMembers ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Loading roster…</p>
                    </div>
                  ) : delegationMembersList.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
                      <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                      <p className="font-medium text-foreground">No members on this delegation yet</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Add people to the selected team, then return here to register them.
                      </p>
                    </div>
                  ) : visibleMembers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
                      <AlertCircle className="mx-auto mb-3 h-7 w-7 text-amber-500/70" />
                      <p className="font-medium text-foreground">No one in {activeMeta?.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Expected {activeMeta?.expected ?? 0}. Add members with this role, or switch tabs.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
                      <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-2.5">
                        <p className="text-xs font-semibold text-foreground">
                          {activeMeta?.label || 'Members'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {visibleMembers.length} people
                          {activeTab !== '__all__' && activeMeta
                            ? ` · need ${activeMeta.expected}`
                            : ''}
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        <Table className="w-full min-w-[640px] table-fixed">
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="h-10 min-w-0 bg-muted/20 text-[11px] font-semibold uppercase tracking-wider">
                                Member
                              </TableHead>
                              {activeTab === '__all__' && (
                                <TableHead className="h-10 w-[180px] bg-muted/20 text-[11px] font-semibold uppercase tracking-wider">
                                  Role
                                </TableHead>
                              )}
                              <TableHead className="h-10 w-[168px] bg-muted/20 text-[11px] font-semibold uppercase tracking-wider">
                                Registration
                              </TableHead>
                              <TableHead className="h-10 w-[112px] bg-muted/20 text-right text-[11px] font-semibold uppercase tracking-wider">
                                Action
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {visibleMembers.map((member: any) => {
                              const complete = isMemberRegistrationComplete(member);
                              const reviewBadge = getMemberReviewBadge(member);
                              const p = member.participant || {};
                              const roleLabel = member.role || 'No category set';
                              const initials =
                                `${p.firstName?.[0] || ''}${p.lastName?.[0] || ''}`.toUpperCase() || '?';

                              return (
                                <TableRow
                                  key={member.id}
                                  className="border-border/60 transition-colors hover:bg-muted/25"
                                >
                                  <TableCell className="min-w-0 overflow-hidden py-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                      <Avatar className="h-9 w-9 shrink-0 ring-1 ring-inset ring-border/70">
                                        <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/5 text-xs font-semibold text-primary">
                                          {initials}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="min-w-0 flex-1 overflow-hidden">
                                        <p className="truncate text-sm font-semibold text-foreground">
                                          {p.firstName} {p.lastName}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                          {p.email || 'No email'}
                                        </p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  {activeTab === '__all__' && (
                                    <TableCell className="w-[180px] max-w-[180px] overflow-hidden py-3">
                                      <p
                                        className="truncate text-sm text-muted-foreground"
                                        title={roleLabel}
                                      >
                                        {roleLabel}
                                      </p>
                                    </TableCell>
                                  )}
                                  <TableCell className="w-[168px] max-w-[168px] overflow-hidden py-3">
                                    <span
                                      className={cn(
                                        'inline-flex max-w-full items-center truncate rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset',
                                        reviewBadge.className,
                                      )}
                                      title={reviewBadge.label}
                                    >
                                      {reviewBadge.label}
                                    </span>
                                  </TableCell>
                                  <TableCell className="w-[112px] py-3 text-right">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 gap-1.5"
                                      onClick={() =>
                                        navigate(
                                          `/manager/register-member?membershipId=${member.id}&teamId=${member.team?.id || ''}`,
                                        )
                                      }
                                    >
                                      {complete ? 'Edit' : 'Register'}
                                      <ArrowRight className="h-3 w-3" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t bg-muted/20 px-6 py-3.5 sm:justify-end">
            <Button
              variant="outline"
              className="h-9"
              onClick={() => setIsMemberRegistrationsOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DelegationsPage;
