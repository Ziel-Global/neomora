import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useManagerSession } from '@/contexts/ManagerSessionContext';
import { teamStore, teamMemberStore, Team, SPORT_CATEGORIES } from '@/lib/teamStore';
import { Plus, Users, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { getMyTeams, createTeam, deleteTeam, listTeamMembers } from '@/api/teamApi';
import { getMyDelegations } from '@/api/delegationApi';
import { getEvents } from '@/api/eventApi';
import { EMSEvent } from '@/lib/emsStore';
import { Loader2 } from 'lucide-react';

interface EventSportCategoryOption {
  key: string;
  sportName: string;
  group: string;
  label: string;
}

const KNOWN_SPORT_GROUPS = new Set(['team-based-games', 'individual-games', 'hybrid-games']);

const inferSportCategoryGroup = (sportName: string): string => {
  const cat = SPORT_CATEGORIES.find(
    (c) => c.name.toLowerCase() === sportName.toLowerCase(),
  );
  if (!cat) return 'hybrid-games';

  const teamGames = ['football', 'basketball', 'volleyball', 'esports'];
  const individualGames = ['athletics', 'swimming', 'tennis', 'gymnastics', 'equestrian'];
  if (teamGames.includes(cat.id)) return 'team-based-games';
  if (individualGames.includes(cat.id)) return 'individual-games';
  return 'hybrid-games';
};

const normalizeEventSportCategories = (event?: EMSEvent | null): EventSportCategoryOption[] => {
  const raw = (event as any)?.sportCategories || (event as any)?.sport_categories || [];
  if (!Array.isArray(raw)) return [];

  const options = new Map<string, EventSportCategoryOption>();

  raw.forEach((category: any, index: number) => {
    const rawName = String(category.name || category.sportCategory || category.sport_category || '').trim();
    const rawSubCategory = String(category.subCategory || category.sub_category || '').trim();
    const rawGroup = String(
      category.group ||
      category.sportCategoryGroup ||
      category.sport_category_group ||
      '',
    ).trim();

    // API uses subCategory for sport name (e.g. Football) and sportCategoryGroup for group.
    let sportName = rawName;
    let group = rawGroup;

    if (KNOWN_SPORT_GROUPS.has(rawName) && rawSubCategory) {
      sportName = rawSubCategory;
      group = rawName;
    } else if (!group && sportName) {
      group = inferSportCategoryGroup(sportName);
    }

    if (!sportName || !group) return;

    const key = `${group}::${sportName}`;
    if (options.has(key)) return;

    const detailLabel =
      rawSubCategory && rawSubCategory.toLowerCase() !== sportName.toLowerCase()
        ? `${sportName} (${rawSubCategory})`
        : sportName;

    options.set(key, {
      key,
      sportName,
      group,
      label: detailLabel,
    });
  });

  return Array.from(options.values());
};

const TeamsPage: React.FC = () => {
  const navigate = useNavigate();
  const { manager } = useManagerSession();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSportOptionKey, setSelectedSportOptionKey] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    delegationId: '',
    eventId: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [events, setEvents] = useState<EMSEvent[]>([]);
  const [delegations, setDelegations] = useState<any[]>([]);

  useEffect(() => {
    if (manager) {
      initialLoad();
    }
  }, [manager]);

  const initialLoad = async () => {
    setIsLoading(true);
    try {
      const [eventsData] = await Promise.all([
        getEvents(),
        refreshDelegations(),
      ]);
      setEvents(eventsData.filter(e => e.status === 'Published' || e.status === 'Ongoing'));
      await refreshTeams(teamStore.getByManager(manager?.id || ''));
    } catch (error: any) {
      console.error('Failed to load initial teams data:', error);
      const msg = error?.response?.data?.message || error?.message || 'Unknown error';
      toast.error(`Failed to load teams or events: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshDelegations = async () => {
    try {
      const delegationsData = await getMyDelegations();
      setDelegations(delegationsData);
    } catch (error) {
      console.error('Failed to refresh delegations:', error);
    }
  };

  const refreshTeams = async (localTeamsOverride?: Team[]) => {
    try {
      const serverTeams = await getMyTeams();
      const localTeams = localTeamsOverride || teamStore.getByManager(manager?.id || '');

      const memberCountsByTeam = new Map<string, number>();
      await Promise.all(
        serverTeams.map(async (team: any) => {
          try {
            const members = await listTeamMembers(team.id);
            memberCountsByTeam.set(team.id, members.length);
          } catch {
            memberCountsByTeam.set(team.id, 0);
          }
        }),
      );

      const merged = serverTeams.map((t: any) => {
        const countFromServer = t.memberCount || t.member_count || 0;
        const countFromMembers = memberCountsByTeam.get(t.id) || 0;

        return {
          ...t,
          memberCount: Math.max(countFromServer, countFromMembers),
        };
      });

      for (const lt of localTeams) {
        if (!merged.find(st => st.id === lt.id)) {
          const localCount = teamMemberStore.getByTeam(lt.id).length;
          merged.push({ ...lt, memberCount: localCount });
        }
      }

      setTeams(merged);
    } catch (error) {
      console.error('Failed to refresh teams:', error);
    }
  };

  const selectedEvent = useMemo(
    () => events.find(e => e.id === formData.eventId),
    [events, formData.eventId],
  );

  const eventSportOptions = useMemo(
    () => normalizeEventSportCategories(selectedEvent),
    [selectedEvent],
  );

  const selectedSportOption = useMemo(
    () => eventSportOptions.find(option => option.key === selectedSportOptionKey),
    [eventSportOptions, selectedSportOptionKey],
  );

  const resolveDelegationEventId = (delegation: any): string =>
    delegation?.eventId || delegation?.event_id || delegation?.event?.id || delegation?.event?._id || '';

  const getDelegationLabel = (delegation: any): string => {
    const name = delegation.name || delegation.country || 'Delegation';
    const eventId = resolveDelegationEventId(delegation);
    const eventName = events.find(e => e.id === eventId)?.name;
    return eventName ? `${name} (${eventName})` : name;
  };

  const resetCreateForm = () => {
    setFormData({ name: '', delegationId: '', eventId: '' });
    setSelectedSportOptionKey('');
  };

  const handleDelegationChange = (delegationId: string) => {
    const delegation = delegations.find(d => (d.id || d._id) === delegationId);
    const eventId = delegation ? resolveDelegationEventId(delegation) : '';
    setSelectedSportOptionKey('');
    setFormData(prev => ({
      ...prev,
      delegationId,
      eventId,
    }));
  };

  const handleCreateTeam = async () => {
    if (!manager) return;

    if (!formData.delegationId) {
      toast.error('Please select a delegation');
      return;
    }

    if (!formData.name.trim() || !formData.eventId) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!selectedSportOption) {
      toast.error('Please select a sport category configured for this event');
      return;
    }

    setIsActionLoading(true);
    try {
      await createTeam({
        delegationId: formData.delegationId,
        eventId: formData.eventId,
        name: formData.name.trim(),
        sportCategoryGroup: selectedSportOption.group,
        subCategory: selectedSportOption.sportName,
      });
      toast.success('Team created successfully!');

      resetCreateForm();
      setIsCreateOpen(false);
      refreshTeams();
    } catch (error: any) {
      console.error('Failed to create team:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to create team';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (confirm('Are you sure you want to delete this team?')) {
      try {
        if (teamId.startsWith('team-')) {
          teamStore.delete(teamId);
        } else {
          await deleteTeam(teamId);
        }
        toast.success('Team deleted');
        refreshTeams();
      } catch (error) {
        console.error('Failed to delete team:', error);
        toast.error('Failed to delete team');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Submitted': return 'bg-blue-100 text-blue-800';
      case 'Under Review': return 'bg-yellow-100 text-yellow-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">My Teams</h1>
          <p className="text-muted-foreground mt-1">
            Create teams under your delegations
          </p>
        </div>
        <Dialog
          open={isCreateOpen}
          onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (open) {
              refreshDelegations();
            } else {
              resetCreateForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Delegation *</Label>
                {delegations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No delegations yet. Create one from the Delegations page first.
                  </p>
                ) : (
                  <Select
                    value={formData.delegationId}
                    onValueChange={handleDelegationChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select delegation" />
                    </SelectTrigger>
                    <SelectContent>
                      {delegations.map(d => {
                        const id = d.id || d._id;
                        return (
                          <SelectItem key={id} value={id}>{getDelegationLabel(d)}</SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label>Team Name *</Label>
                <Input
                  placeholder="e.g., Saudi Athletics Team"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Event *</Label>
                <Select
                  value={formData.eventId}
                  onValueChange={(v) => {
                    setSelectedSportOptionKey('');
                    setFormData(prev => ({ ...prev, eventId: v }));
                  }}
                  disabled={!!formData.delegationId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.delegationId && (
                  <p className="text-xs text-muted-foreground">
                    Event is set from the selected delegation
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Sport Category *</Label>
                {!formData.eventId ? (
                  <p className="text-sm text-muted-foreground">Select a delegation or event first</p>
                ) : eventSportOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No sport categories configured for this event. Ask admin to add them on the event.
                  </p>
                ) : (
                  <Select
                    value={selectedSportOptionKey}
                    onValueChange={setSelectedSportOptionKey}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sport category" />
                    </SelectTrigger>
                    <SelectContent>
                      {eventSportOptions.map(option => (
                        <SelectItem key={option.key} value={option.key}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isActionLoading}>Cancel</Button>
              <Button
                onClick={handleCreateTeam}
                disabled={isActionLoading || delegations.length === 0 || eventSportOptions.length === 0}
              >
                {isActionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Team
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : teams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="font-semibold mb-2">No teams yet</h3>
            <p className="text-muted-foreground mb-4">Create a delegation first, then add your first team</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => (
            <Card key={team.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                    <CardDescription>
                      {typeof team.sportCategory === 'string' ? team.sportCategory : (team.sportCategory as any)?.name}
                      {team.subCategory && ` • ${typeof team.subCategory === 'string' ? team.subCategory : (team.subCategory as any)?.name}`}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(team.status)}>{team.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Users className="h-4 w-4" />
                  <span>{team.memberCount} members</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate(`/manager/register-list?teamId=${team.id}`)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Members
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteTeam(team.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamsPage;
