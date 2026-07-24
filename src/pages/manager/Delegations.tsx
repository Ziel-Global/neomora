import React, { useState, useEffect, useRef } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Flag, Users, Send, CheckCircle, Clock, AlertCircle, Plus, Plane, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { getMyDelegations, createDelegation, submitDelegation, updateDelegation, deleteDelegation, extractDelegationId } from '@/api/delegationApi';
import { getEvents } from '@/api/eventApi';
import { getMyTeams, createTeam, listTeamMembers, updateTeamMember, updateTeam } from '@/api/teamApi';
import { EMSEvent } from '@/lib/emsStore';

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
  const [teams, setTeams] = useState<Team[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [localDraftDelegations, setLocalDraftDelegations] = useState<Delegation[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [delegationCountry, setDelegationCountry] = useState<string>('');
  const [events, setEvents] = useState<EMSEvent[]>([]);
  const [createFromInvitationEventId, setCreateFromInvitationEventId] = useState<string | null>(null);
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
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (manager) {
      if (manager.country && !delegationCountry) {
        setDelegationCountry(manager.country);
      }
      refreshData();
    }
  }, [manager]);

  useEffect(() => {
    if (handledCreateFromUrl.current || isLoading) return;

    const eventId = searchParams.get('eventId');
    const eventName = searchParams.get('eventName');
    const shouldCreate = searchParams.get('create') === '1' || searchParams.get('create') === 'true';
    if (!eventId || !shouldCreate) return;

    handledCreateFromUrl.current = true;
    setCreateFromInvitationEventId(eventId);

    if (!events.some((event) => String(event.id) === String(eventId))) {
      const fromStore = eventStore.getById(eventId);
      if (fromStore) {
        setEvents((prev) => {
          if (prev.some((event) => String(event.id) === String(eventId))) return prev;
          return [...prev, fromStore];
        });
      } else if (eventName) {
        setEvents((prev) => {
          if (prev.some((event) => String(event.id) === String(eventId))) return prev;
          return [...prev, {
            id: eventId,
            name: eventName,
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

    setSelectedEventId(eventId);
    setIsCreateOpen(true);
    navigate('/manager/delegations', { replace: true });
  }, [searchParams, isLoading, events, navigate]);

  const getSelectableEvents = (): EMSEvent[] => {
    if (!createFromInvitationEventId) return events;
    const matched = events.filter((event) => String(event.id) === String(createFromInvitationEventId));
    if (matched.length > 0) return matched;
    const fromStore = eventStore.getById(createFromInvitationEventId);
    return fromStore ? [fromStore] : [];
  };

  const handleCreateOpenChange = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open) {
      setCreateFromInvitationEventId(null);
      setSelectedEventId('');
      setSelectedTeamIds([]);
    }
  };

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

  const refreshData = async () => {
    if (manager) {
      setIsLoading(true);
      try {
        const [delegationData, eventData, teamData] = await Promise.all([
          getMyDelegations(),
          getEvents(),
          getMyTeams(),
        ]);
        const remoteDelegations = delegationData.map((d: any) => normalizeDelegation(d, teamData));

        // Try to resolve the country name if manager.country is empty or 'Unknown'
        let resolvedCountry = manager.country || '';
        if (!resolvedCountry || resolvedCountry === 'Unknown') {
          const teamWithCountry = teamData.find(t => t.country && t.country !== 'Unknown');
          if (teamWithCountry) {
            resolvedCountry = teamWithCountry.country;
          }
        }

        if (resolvedCountry && resolvedCountry !== 'Unknown' && resolvedCountry !== manager.country) {
          manager.country = resolvedCountry;
          localStorage.setItem('ems_manager_session', JSON.stringify({ ...manager, country: resolvedCountry }));
        }

        // Fetch delegations from database (including server-side drafts)
        const remoteDelegationsFiltered = remoteDelegations.filter((delegation: any) =>
          (delegation.managerId === manager.id || !delegation.managerId)
        );

        // Use current delegations state to preserve local drafts and avoid stale closure
        setDelegations(prevDelegations => {
          const localDrafts = prevDelegations.filter(d => d.id.startsWith('draft-'));
          return [...localDrafts, ...remoteDelegationsFiltered];
        });
        setEvents(eventData.filter(e => e.status === 'Published' || e.status === 'Ongoing'));

        const memberCountsByTeam = new Map<string, number>();
        await Promise.all(
          teamData.map(async (t: any) => {
            try {
              const members = await listTeamMembers(t.id);
              memberCountsByTeam.set(t.id, members.length);
            } catch {
              memberCountsByTeam.set(t.id, 0);
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

        setTeams(mergedTeams);
      } catch (error: any) {
        console.error('Failed to load initial delegations data:', error);
        const msg = error?.response?.data?.message || error?.message || 'Unknown error';
        toast.error(`Failed to load delegations: ${msg}`);
      } finally {
        setIsLoading(false);
      }
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
      case 'Rejected': return <AlertCircle className="h-4 w-4 text-status-error" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-status-success-bg text-status-success';
      case 'Submitted': return 'bg-status-info-bg text-status-info';
      case 'Rejected': return 'bg-status-error-bg text-status-error';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleToggleTeam = (teamId: string) => {
    setSelectedTeamIds(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const mapCategory = (catId: string) => {
    const teamGames = ['football', 'basketball', 'volleyball', 'esports'];
    const individualGames = ['athletics', 'swimming', 'tennis', 'gymnastics', 'equestrian'];
    const id = catId.toLowerCase();
    if (teamGames.includes(id)) return 'team-based-games';
    if (individualGames.includes(id)) return 'individual-games';
    return 'hybrid-games';
  };

  const handleCreateDelegation = async () => {
    if (!manager) return;
    if (!selectedEventId) {
      toast.error('Please select an event');
      return;
    }
    if (!delegationCountry.trim()) {
      toast.error('Please enter a country for the delegation');
      return;
    }

    setIsCreating(true);
    try {
      const serverDelegation = await createDelegation({
        managerId: manager.id,
        country: delegationCountry.trim(),
        eventId: selectedEventId,
        teamIds: selectedTeamIds,
      });

      const delegationId = extractDelegationId(serverDelegation);
      if (!delegationId) {
        toast.error('Delegation created but no ID returned from server');
        return;
      }

      if (selectedTeamIds.length > 0) {
        try {
          await Promise.all(
            selectedTeamIds.map((teamId) =>
              updateTeam(teamId, { delegationId, delegation_id: delegationId } as any),
            ),
          );
        } catch (err: any) {
          console.error('Failed to associate teams with delegation:', err);
          toast.error(`Delegation created but failed to link teams: ${err?.message || err}`);
        }
      }

      toast.success('Delegation created successfully');
      setSelectedEventId('');
      setSelectedTeamIds([]);
      setCreateFromInvitationEventId(null);
      setIsCreateOpen(false);
      await refreshData();
    } catch (error: any) {
      console.error('Failed to create delegation:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to create delegation';
      toast.error(msg);
    } finally {
      setIsCreating(false);
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
        const serverDelegation = await createDelegation({
          managerId: manager?.id,
          country: countryToSubmit,
          eventId: draftDelegation.eventId,
          teamIds: draftDelegation.teamIds || [],
          team_ids: draftDelegation.teamIds || [],
          teams: draftDelegation.teamIds || [],
        } as any);

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
        if (draftDelegation.teamIds && draftDelegation.teamIds.length > 0) {
          try {
            await Promise.all(
              draftDelegation.teamIds.map(teamId =>
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
        setDelegations(prev => prev.filter(d => d.id !== delegationId));

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

      refreshData();
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
      setDelegations(prev => prev.filter(d => d.id !== delegationId));
      toast.success('Draft delegation deleted');
    } else {
      try {
        setIsLoading(true);
        await deleteDelegation(delegationId);
        toast.success('Draft delegation deleted from server');
        refreshData();
      } catch (err: any) {
        console.error('Failed to delete delegation from server:', err);
        toast.error('Failed to delete delegation from server');
        setIsLoading(false);
      }
    }
  };

  const getMemberCount = (delegation: Delegation) => {
    // Use backend-provided totalMembers first, then try summing team members
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
        await updateTeamMember(member.teamId, member.id, {
          travelPreferences: bulkTravelPrefs,
        });

        processed++;
        setBulkProgress(Math.round((processed / total) * 100));
      }

      toast.success(`Travel preferences set for ${members.length} members!`);
      setIsBulkTravelOpen(false);
      setSelectedDelegation(null);
      refreshData();
    } catch (error) {
      console.error('Bulk travel preferences error:', error);
      toast.error('Failed to set travel preferences');
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Delegations</h1>
          <p className="text-muted-foreground mt-1">
            Create and submit your country's delegation for events
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={handleCreateOpenChange}>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Delegation
          </Button>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Delegation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Event *</Label>
                {createFromInvitationEventId ? (
                  <div className="rounded-md border px-3 py-2 text-sm bg-muted/30">
                    {getSelectableEvents()[0]?.name || 'Selected event'}
                  </div>
                ) : (
                  <Select
                    value={selectedEventId}
                    onValueChange={(val) => {
                      setSelectedEventId(val);
                      setSelectedTeamIds([]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an event" />
                    </SelectTrigger>
                    <SelectContent>
                      {events.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label>Delegation Country *</Label>
                <Input
                  placeholder="Enter country name (e.g., Saudi Arabia, UK)"
                  value={delegationCountry}
                  onChange={(e) => setDelegationCountry(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Select Teams *</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Choose which teams to include in this delegation
                </p>
                {teams.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No teams created yet</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                    {(teams || [])
                      .filter(t => !selectedEventId || t.eventId === selectedEventId || (t as any).event?.id === selectedEventId)
                      .map(team => (
                        <div key={team.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded">
                          <Checkbox
                            id={team.id}
                            checked={selectedTeamIds.includes(team.id)}
                            onCheckedChange={() => handleToggleTeam(team.id)}
                          />
                          <label htmlFor={team.id} className="flex-1 cursor-pointer text-sm">
                            <p className="font-medium">{team.name}</p>
                            <p className="text-muted-foreground">
                              {typeof team.sportCategory === 'object' ? (team.sportCategory as any)?.name : team.sportCategory} • {team.subCategory || ''}
                            </p>
                          </label>
                        </div>
                      ))}
                    {teams.filter(t => !selectedEventId || t.eventId === selectedEventId || (t as any).event?.id === selectedEventId).length === 0 && (
                      <p className="text-sm text-center py-4 text-muted-foreground">
                        {selectedEventId ? 'No teams found for this event' : 'Please select an event first'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleCreateOpenChange(false)} disabled={isCreating}>
                Cancel
              </Button>
              <Button onClick={handleCreateDelegation} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Delegation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30 animate-spin" />
            <p className="text-muted-foreground">Loading delegations...</p>
          </CardContent>
        </Card>
      ) : delegations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Flag className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="font-semibold mb-2">No delegations yet</h3>
            <p className="text-muted-foreground mb-4">
              Create a delegation to group your teams for an event
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Delegation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {delegations.map(delegation => (
            <Card key={delegation.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(delegation.status)}
                    <CardTitle className="text-lg">{delegation.country || manager?.country || 'Unknown'} Delegation</CardTitle>
                  </div>
                  <Badge className={getStatusColor(delegation.status)}>{delegation.status}</Badge>
                </div>
                <CardDescription>{getEventName(delegation)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{(delegation.teamIds || []).length} teams</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{getMemberCount(delegation)} members</span>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-sm font-medium mb-2">Teams included:</p>
                    <div className="flex flex-wrap gap-2">
                      {(delegation.teamIds || []).map(teamId => {
                        const team = teams.find(t => t.id === teamId);
                        return team ? (
                          <Badge key={teamId} variant="secondary" className="text-xs">
                            {team.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-3">
                    {delegation.status === 'Draft' && (
                      <>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => openBulkTravel(delegation)}
                        >
                          <Plane className="h-4 w-4 mr-2" />
                          Bulk Set Travel Preferences
                        </Button>
                        <div className="flex gap-2">
                          <Button
                            className="flex-1"
                            onClick={() => handleSubmitDelegation(delegation.id)}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Submit for Approval
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteDraft(delegation.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                    {delegation.status === 'Submitted' && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => openBulkTravel(delegation)}
                      >
                        <Plane className="h-4 w-4 mr-2" />
                        Update Travel Preferences
                      </Button>
                    )}
                  </div>

                  {delegation.submittedAt && (
                    <p className="text-xs text-muted-foreground">
                      Submitted: {new Date(delegation.submittedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
    </div>
  );
};

export default DelegationsPage;