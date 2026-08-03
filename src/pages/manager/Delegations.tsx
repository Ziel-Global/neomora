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
import { Team, Delegation, TeamMember } from '@/lib/teamStore';
import { eventStore, participantStore, registrationStore, travelStore } from '@/lib/emsStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Flag, Users, Send, CheckCircle, Clock, AlertCircle, Plus, Minus, Plane, Trash2, ClipboardList, AlertTriangle, Loader2, Calendar, UserCog, HeartPulse, Building2, MoreHorizontal, Sparkles, CheckCircle2, ArrowRight, LayoutGrid, List } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getMyDelegations, createDelegation, submitDelegation, updateDelegation, deleteDelegation, extractDelegationId, submitDelegationRoster } from '@/api/delegationApi';
import { getEvents } from '@/api/eventApi';
import { getMyTeams, createTeam, listTeamMembers, updateTeamMember, updateTeam } from '@/api/teamApi';
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

  // Headcount declaration state
  const [isHeadcountOpen, setIsHeadcountOpen] = useState(false);
  const [headcountDelegation, setHeadcountDelegation] = useState<Delegation | null>(null);
  const [headcountCounts, setHeadcountCounts] = useState<Record<string, number>>({});
  const [isSavingHeadcount, setIsSavingHeadcount] = useState(false);
  const [submittingRosterId, setSubmittingRosterId] = useState<string | null>(null);

  // Post-approval team selection state
  const [isSelectTeamOpen, setIsSelectTeamOpen] = useState(false);
  const [selectTeamDelegation, setSelectTeamDelegation] = useState<Delegation | null>(null);
  const [selectTeamIds, setSelectTeamIds] = useState<string[]>([]);
  const [isSavingTeamSelection, setIsSavingTeamSelection] = useState(false);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircle className="h-4 w-4 text-status-success" />;
      case 'Submitted': return <Clock className="h-4 w-4 text-status-info" />;
      case 'Roster Submitted': return <Clock className="h-4 w-4 text-status-info" />;
      case 'Rejected': return <AlertCircle className="h-4 w-4 text-status-error" />;
      case 'Update Requested': return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-status-success-bg text-status-success';
      case 'Submitted': return 'bg-status-info-bg text-status-info';
      case 'Roster Submitted': return 'bg-status-info-bg text-status-info';
      case 'Rejected': return 'bg-status-error-bg text-status-error';
      case 'Update Requested': return 'bg-amber-100 text-amber-800';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => (status === 'Roster Submitted' ? 'Submitted' : status);

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

      const counts = Object.fromEntries(
        Object.entries(headcountCounts).filter(([, value]) => Number(value) > 0),
      );
      if (Object.keys(counts).length > 0) {
        await updateDelegation(delegationId, { expectedMemberCounts: counts });
      }

      await submitDelegation(delegationId);

      toast.success('Registration sent for admin approval');
      setSelectedEventId('');
      setSelectedTeamIds([]);
      setHeadcountCounts({});
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

  const getCategoryBreakdown = (delegation: Delegation): CategoryBreakdown[] => {
    const expectedCounts = delegation.expectedMemberCounts || {};
    const actualCounts: Record<string, number> = {};
    for (const member of getDelegationRoster(delegation)) {
      const category = member.role || '';
      actualCounts[category] = (actualCounts[category] || 0) + 1;
    }

    const categories = new Set([...Object.keys(expectedCounts), ...Object.keys(actualCounts)]);
    return Array.from(categories).map((category) => {
      const expected = Number(expectedCounts[category] || 0);
      const actual = actualCounts[category] || 0;
      return {
        category: category === '' ? 'Uncategorized' : category,
        expected,
        actual,
        matches: expected === actual,
      };
    });
  };

  const isRosterReadyToSend = (delegation: Delegation): boolean => {
    const breakdown = getCategoryBreakdown(delegation);
    return breakdown.length > 0 && breakdown.every((entry) => entry.matches);
  };

  // "Approved" is reused for two different moments: admin approving the
  // declared headcount (before any roster is sent), and the delegation
  // reaching full completion after every individual member's registration
  // has been approved. Only the second one is truly done — distinguish it by
  // checking that a roster actually exists and every member in it is Approved.
  const isDelegationFullyApproved = (delegation: Delegation): boolean => {
    if (delegation.status !== 'Approved') return false;
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

  const isMemberRegistrationComplete = (member: any) => {
    const p = member.participant || {};
    return Boolean(p.passportNumber && p.organization && p.jobTitle);
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
    setHeadcountCounts({ ...(delegation.expectedMemberCounts || {}) });
    setIsHeadcountOpen(true);
  };

  const handleSaveHeadcount = async () => {
    if (!headcountDelegation) return;

    setIsSavingHeadcount(true);
    try {
      const counts = Object.fromEntries(
        Object.entries(headcountCounts).filter(([, value]) => Number(value) > 0),
      );
      await updateDelegation(headcountDelegation.id, { expectedMemberCounts: counts });
      toast.success('Attendee counts saved');
      setIsHeadcountOpen(false);
      setHeadcountDelegation(null);
      void refetch();
    } catch (error: any) {
      console.error('Failed to save headcount:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to save attendee counts';
      toast.error(msg);
    } finally {
      setIsSavingHeadcount(false);
    }
  };

  const getTotalHeadcount = (delegation: Delegation) =>
    Object.values(delegation.expectedMemberCounts || {}).reduce((sum, n) => sum + (Number(n) || 0), 0);

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
                <div className="flex flex-wrap items-end justify-between gap-3 px-0.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary/60" />
                      <h2 className="text-sm font-semibold text-foreground">Attendee headcount</h2>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      You'll add their names later, once this is approved.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/15">
                    <Users className="h-3.5 w-3.5" />
                    <span className="tabular-nums">
                      {Object.values(headcountCounts).reduce((sum, n) => sum + (Number(n) || 0), 0)}
                    </span>
                    <span className="font-medium text-primary/70">total</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {Object.entries(groupedDelegationCategories()).map(([group, categories]) => (
                    <CategoryGroupSection
                      key={group}
                      group={group}
                      categories={categories}
                      counts={headcountCounts}
                      disabled={isCreating}
                      onChange={(label, value) =>
                        setHeadcountCounts((prev) => ({ ...prev, [label]: value }))
                      }
                    />
                  ))}
                </div>
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
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
              <div className="overflow-x-auto">
                <Table className="w-full table-fixed">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-11 min-w-0 bg-muted/40 text-[11px] font-semibold uppercase tracking-wider">Delegation</TableHead>
                      <TableHead className="h-11 w-[120px] bg-muted/40 text-[11px] font-semibold uppercase tracking-wider">Status</TableHead>
                      <TableHead className="h-11 w-[90px] bg-muted/40 text-[11px] font-semibold uppercase tracking-wider">Teams</TableHead>
                      <TableHead className="h-11 w-[100px] bg-muted/40 text-[11px] font-semibold uppercase tracking-wider">Members</TableHead>
                      <TableHead className="h-11 w-[140px] bg-muted/40 text-[11px] font-semibold uppercase tracking-wider">Roster</TableHead>
                      <TableHead className="h-11 w-[220px] bg-muted/40 text-[11px] font-semibold uppercase tracking-wider">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {delegations.map((delegation) => {
                      const row = summarizeDelegation(delegation);
                      return (
                        <TableRow
                          key={delegation.id}
                          className="border-border/60 transition-colors hover:bg-muted/25"
                        >
                          <TableCell className="min-w-0 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-inset ring-primary/10">
                                <Flag className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {row.countryLabel} Delegation
                                </p>
                                <p className="truncate text-xs text-muted-foreground">{row.eventName}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge className={cn('font-medium', getStatusColor(delegation.status))}>
                              {row.fullyApproved ? 'Delegation Approved' : getStatusLabel(delegation.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 text-sm tabular-nums text-muted-foreground">
                            {row.teamCount}
                          </TableCell>
                          <TableCell className="py-3 text-sm tabular-nums text-muted-foreground">
                            {row.memberCount}
                            {row.expectedCount > 0 ? (
                              <span className="text-muted-foreground/70"> / {row.expectedCount}</span>
                            ) : null}
                          </TableCell>
                          <TableCell className="py-3">
                            {row.breakdown.length === 0 ? (
                              <span className="text-xs text-muted-foreground">Not declared</span>
                            ) : (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2 text-[11px]">
                                  <span className="font-medium tabular-nums text-foreground">
                                    {row.matchedRoles}/{row.breakdown.length}
                                  </span>
                                  <span
                                    className={cn(
                                      'font-semibold tabular-nums',
                                      row.mismatched.length === 0 ? 'text-status-success' : 'text-amber-700',
                                    )}
                                  >
                                    {row.rosterProgress}%
                                  </span>
                                </div>
                                <Progress value={row.rosterProgress} className="h-1" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {delegation.status === 'Approved' && row.teamCount === 0 && (
                                <Button size="sm" className="h-8" onClick={() => openSelectTeamDialog(delegation)}>
                                  Select team
                                </Button>
                              )}
                              {delegation.status === 'Approved' && row.teamCount > 0 && row.fullyApproved && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8"
                                  onClick={() => openMemberRegistrations(delegation)}
                                >
                                  Roster
                                </Button>
                              )}
                              {delegation.status === 'Approved' && row.teamCount > 0 && !row.fullyApproved && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8"
                                    onClick={() => openMemberRegistrations(delegation)}
                                  >
                                    Roster
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="h-8"
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
                                  className="h-8"
                                  onClick={() => handleSubmitDelegation(delegation.id)}
                                >
                                  Submit
                                </Button>
                              )}
                              {delegation.status === 'Submitted' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8"
                                  onClick={() => openBulkTravel(delegation)}
                                >
                                  Travel
                                </Button>
                              )}
                              {delegation.status === 'Roster Submitted' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8"
                                  onClick={() => openMemberRegistrations(delegation)}
                                >
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
                        delegation.status === 'Approved' && 'bg-status-success',
                        delegation.status === 'Submitted' && 'bg-primary',
                        (delegation.status === 'Draft' || delegation.status === 'Update Requested') && 'bg-amber-500',
                        delegation.status === 'Rejected' && 'bg-status-error',
                      )}
                      aria-hidden
                    />

                    <div className="space-y-4 p-5 pl-6 sm:p-6 sm:pl-7">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {getStatusIcon(delegation.status)}
                            <h3 className="text-lg font-semibold tracking-tight text-foreground">
                              {row.countryLabel} Delegation
                            </h3>
                          </div>
                          <p className="text-sm text-muted-foreground">{row.eventName}</p>
                        </div>
                        <Badge className={cn('shrink-0', getStatusColor(delegation.status))}>
                          {row.fullyApproved ? 'Delegation Approved' : getStatusLabel(delegation.status)}
                        </Badge>
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
                  Declare Attendee Counts
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed">
                  Set how many people will attend in each category. Names come later after approval.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-5">
            <div className="flex justify-end">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/15">
                <Users className="h-3.5 w-3.5" />
                <span className="tabular-nums">
                  {Object.values(headcountCounts).reduce((sum, n) => sum + (Number(n) || 0), 0)}
                </span>
                <span className="font-medium text-primary/70">total</span>
              </div>
            </div>
            {Object.entries(groupedDelegationCategories()).map(([group, categories]) => (
              <CategoryGroupSection
                key={group}
                group={group}
                categories={categories}
                counts={headcountCounts}
                disabled={isSavingHeadcount}
                onChange={(label, value) =>
                  setHeadcountCounts((prev) => ({ ...prev, [label]: value }))
                }
              />
            ))}
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
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Select Team</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Only unassigned teams whose sport is offered by this event are shown. You can select more than one.
          </p>
          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No teams created yet — go to Teams to create one first.
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto border rounded-lg p-3">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSelectTeamOpen(false)} disabled={isSavingTeamSelection}>
              Cancel
            </Button>
            <Button onClick={handleConfirmTeamSelection} disabled={isSavingTeamSelection}>
              {isSavingTeamSelection ? 'Saving...' : 'Confirm Team'}
            </Button>
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
