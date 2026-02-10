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

  const events = eventStore.getAll().filter(e => e.status === 'Published' || e.status === 'Ongoing');

  useEffect(() => {
    if (manager) {
      refreshData();
    }
  }, [manager]);

  const refreshData = () => {
    if (manager) {
      setTeams(teamStore.getByManager(manager.id));
      setDelegations(delegationStore.getByManager(manager.id));
    }
  };

  const getEventName = (eventId: string) => {
    return eventStore.getById(eventId)?.name || 'Unknown Event';
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

  const handleCreateDelegation = () => {
    if (!manager) return;
    if (!selectedEventId) {
      toast.error('Please select an event');
      return;
    }
    if (selectedTeamIds.length === 0) {
      toast.error('Please select at least one team');
      return;
    }

    delegationStore.create({
      managerId: manager.id,
      country: manager.country,
      eventId: selectedEventId,
      teamIds: selectedTeamIds,
    });

    toast.success('Delegation created successfully!');
    setSelectedEventId('');
    setSelectedTeamIds([]);
    setIsCreateOpen(false);
    refreshData();
  };

  const handleSubmitDelegation = (delegationId: string) => {
    const delegation = delegations.find(d => d.id === delegationId);
    if (!delegation) return;

    let totalMembers = 0;
    for (const teamId of delegation.teamIds) {
      totalMembers += teamMemberStore.getByTeam(teamId).length;
    }

    if (totalMembers === 0) {
      toast.error('Cannot submit: Your delegation has no members. Please add team members first.');
      return;
    }

    delegationStore.submit(delegationId);
    toast.success('Delegation submitted for review!');
    refreshData();
  };

  const getMemberCount = (delegation: Delegation) => {
    let total = 0;
    for (const teamId of delegation.teamIds) {
      total += teamMemberStore.getByTeam(teamId).length;
    }
    return total;
  };

  const getDelegationMembersList = (delegation: Delegation): TeamMember[] => {
    const members: TeamMember[] = [];
    for (const teamId of delegation.teamIds) {
      members.push(...teamMemberStore.getByTeam(teamId));
    }
    return members;
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

    const members = getDelegationMembersList(selectedDelegation);
    if (members.length === 0) {
      toast.error('No members found in this delegation');
      return;
    }

    const event = eventStore.getById(selectedDelegation.eventId);
    if (!event) {
      toast.error('Event not found');
      return;
    }

    if (bulkTravelPrefs.needsTransport && (!bulkTravelPrefs.originCity || !bulkTravelPrefs.departureAirport)) {
      toast.error('Please fill in origin city and departure airport');
      return;
    }

    if (bulkTravelPrefs.needsTransport && (!bulkTravelPrefs.preferredArrivalDate || !bulkTravelPrefs.preferredDepartureDate)) {
      toast.error('Please fill in preferred travel dates');
      return;
    }

    setIsSubmittingBulk(true);
    setBulkProgress(0);

    try {
      let processed = 0;
      const total = members.length;

      for (const member of members) {
        // Update team member with travel preferences only (no registration)
        teamMemberStore.update(member.id, {
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
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
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
                <Label>Select Teams *</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Choose which teams to include in this delegation
                </p>
                {teams.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No teams created yet</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                    {teams.map(team => (
                      <div key={team.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded">
                        <Checkbox
                          id={team.id}
                          checked={selectedTeamIds.includes(team.id)}
                          onCheckedChange={() => handleToggleTeam(team.id)}
                        />
                        <label htmlFor={team.id} className="flex-1 cursor-pointer">
                          <p className="font-medium">{team.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {team.sportCategory} • {team.memberCount} members
                          </p>
                        </label>
                      </div>
                    ))}
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

      {delegations.length === 0 ? (
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
                <CardDescription>{getEventName(delegation.eventId)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{delegation.teamIds.length} teams</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{getMemberCount(delegation)} members</span>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-sm font-medium mb-2">Teams included:</p>
                    <div className="flex flex-wrap gap-2">
                      {delegation.teamIds.map(teamId => {
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
                        {getEventName(selectedDelegation.eventId)}
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