import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useManagerSession } from '@/contexts/ManagerSessionContext';
import { teamStore, teamMemberStore, delegationStore, Team, Delegation, TeamMember } from '@/lib/teamStore';
import { eventStore, participantStore, registrationStore, travelStore } from '@/lib/emsStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Flag, Users, Send, CheckCircle, Clock, AlertCircle, Plus, Plane } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { getDelegationsDetails, createDelegation, submitDelegation } from '@/api/delegationApi';
import { getEvents } from '@/api/eventApi';
import { getMyTeams, createTeam, listTeamMembers, updateTeamMember, updateTeam } from '@/api/teamApi';
import { createRegistration, getMyRegistrations } from '@/api/registrationApi';
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
  const [teams, setTeams] = useState<Team[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [delegationCountry, setDelegationCountry] = useState<string>('');
  const [events, setEvents] = useState<EMSEvent[]>([]);

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

  useEffect(() => {
    if (manager) {
      if (manager.country && !delegationCountry) {
        setDelegationCountry(manager.country);
      }
      refreshData();
    }
  }, [manager]);

  const refreshData = async () => {
    if (manager) {
      setIsLoading(true);
      try {
        const [delegationData, eventData, teamData, registrations] = await Promise.all([
          getDelegationsDetails(),
          getEvents(),
          getMyTeams(),
          getMyRegistrations().catch(() => [])
        ]);
        const normalizedDelegations = delegationData.map((d: any) => {
          let teamIds = d.teamIds || d.team_ids || (d.teams || []).map((t: any) => t.id || t._id) || [];

          // Map backwards from teams if backend didn't link them properly
          if (teamIds.length === 0) {
            const delegationTeams = teamData.filter((t: any) => t.delegationId === d.id || t.delegation_id === d.id || t.delegation?.id === d.id);
            teamIds = delegationTeams.map((t: any) => t.id);
          }

          return {
            ...d,
            id: d.id || d._id,
            teamIds,
            totalMembers: d.totalMembers || d.total_members || 0
          };
        });

        setDelegations(normalizedDelegations);
        setEvents(eventData.filter(e => e.status === 'Published' || e.status === 'Ongoing'));

        const registrationCounts = new Map<string, number>();
        for (const r of registrations as any[]) {
          const teamId = r.teamId || r.team_id || r.team?.id;
          if (!teamId) continue;
          registrationCounts.set(teamId, (registrationCounts.get(teamId) || 0) + 1);
        }

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

        // Normalize memberCount for server teams and merge with local teams
        const mergedTeams = teamData.map((t: any) => {
          const countFromServer = t.memberCount || t.member_count || 0;
          const countFromRegs = registrationCounts.get(t.id) || 0;
          const countFromMembers = memberCountsByTeam.get(t.id) || 0;
          return {
            ...t,
            memberCount: Math.max(countFromServer, countFromRegs, countFromMembers)
          };
        });

        const localTeams = teamStore.getByManager(manager.id);
        for (const lt of localTeams) {
          if (!mergedTeams.find(st => st.id === lt.id)) {
            const localCount = teamMemberStore.getByTeam(lt.id).length;
            mergedTeams.push({ ...lt, memberCount: localCount });
          }
        }
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
    /* Removed mandatory team selection to resolve deadlock: 
       backend requires delegationId to create a team, 
       so we must allow creating a delegation first. */

    try {
      // 1. Create the delegation on the server
      const serverTeamIds = selectedTeamIds.filter(id => !id.startsWith('team-'));
      const newDelegation = await createDelegation({
        country: delegationCountry,
        eventId: selectedEventId,
        teamIds: serverTeamIds,
      });

      // Update existing teams with the new delegation ID
      for (const teamId of serverTeamIds) {
        try {
          await updateTeam(teamId, { delegationId: newDelegation.id });
        } catch (e) {
          console.warn(`[Sync] Failed to link existing team ${teamId} to delegation`, e);
        }
      }

      // 2. Sync local teams
      const localTeamIds = selectedTeamIds.filter(id => id.startsWith('team-'));
      for (const localId of localTeamIds) {
        const localTeam = teamStore.getById(localId);
        if (!localTeam) continue;

        // Find exact sport category names from event data
        const event = events.find(e => e.id === selectedEventId);
        const eventSportCat = event?.sportCategories?.find(
          (c: any) => c.subCategory?.toLowerCase() === localTeam.sportCategory.toLowerCase()
        );

        // Create team on server
        const serverTeam = await createTeam({
          delegationId: newDelegation.id,
          eventId: selectedEventId,
          name: localTeam.name,
          sportCategory: localTeam.sportCategory,
          sportCategoryGroup: eventSportCat?.name || mapCategory(localTeam.sportCategory),
          subCategory: localTeam.subCategory || localTeam.sportCategory
        });

        // Sync members
        const localMembers = teamMemberStore.getByTeam(localId);
        for (const m of localMembers) {
          const formData = new FormData();
          formData.append('teamId', serverTeam.id);
          formData.append('eventId', selectedEventId);
          formData.append('delegationId', newDelegation.id); // Link to delegation
          formData.append('country', delegationCountry); // Store delegation country
          formData.append('firstName', m.firstName);
          formData.append('lastName', m.lastName);
          formData.append('email', m.email);
          formData.append('phone', m.phone);
          formData.append('nationality', m.nationality || manager.country || '');
          formData.append('passportNumber', m.passportNumber);
          formData.append('organization', `${delegationCountry || manager.country || ''} Delegation`);
          formData.append('jobTitle', m.role);
          formData.append('participantRole', m.role === 'Athlete' ? 'Athlete' : 'Official');
          formData.append('gender', m.gender.toLowerCase());

          if (m.dateOfBirth) formData.append('dateOfBirth', m.dateOfBirth);
          if (m.passportExpiry) formData.append('passportExpiry', m.passportExpiry);

          try {
            await createRegistration(formData);
          } catch (memberError: any) {
            // If member is already registered, skip silently
            const errMsg = memberError?.response?.data?.message || memberError?.message || '';
            console.warn(`[Sync] Skipping member ${m.email}: ${errMsg}`);
          }
        }

        // Cleanup
        teamStore.delete(localId);
      }

      toast.success('Delegation created and teams synced!');
      setSelectedEventId('');
      setSelectedTeamIds([]);
      setIsCreateOpen(false);
      refreshData();
    } catch (error: any) {
      console.error('Failed to create delegation/sync:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to create delegation';
      toast.error(msg);
    }
  };

  const handleSubmitDelegation = async (delegationId: string) => {
    try {
      await submitDelegation(delegationId);
      toast.success('Delegation submitted for review!');
      refreshData();
    } catch (error: any) {
      console.error('Failed to submit delegation:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to submit delegation';
      toast.error(msg);
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
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
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
                <Select
                  value={selectedEventId}
                  onValueChange={(val) => {
                    setSelectedEventId(val);
                    setSelectedTeamIds([]); // Clear teams when event changes
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
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateDelegation}>Create Delegation</Button>
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
                    <CardTitle className="text-lg">{manager?.country} Delegation</CardTitle>
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
                        <Button
                          className="w-full"
                          onClick={() => handleSubmitDelegation(delegation.id)}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Submit for Approval
                        </Button>
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
                      <p className="font-medium">{manager?.country} Delegation</p>
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
    </div>
  );
};

export default DelegationsPage;