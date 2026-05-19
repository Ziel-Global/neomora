import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useManagerSession } from '@/contexts/ManagerSessionContext';
import { teamStore, teamMemberStore, Team, SPORT_CATEGORIES } from '@/lib/teamStore';
import { eventStore } from '@/lib/emsStore';
import { Plus, Users, Trash2, Edit, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { getMyTeams, createTeam, deleteTeam, listTeamMembers } from '@/api/teamApi';
import { getMyRegistrations } from '@/api/registrationApi';
import { getDelegationsDetails, createDelegation } from '@/api/delegationApi';
import { getEvents } from '@/api/eventApi';
import { EMSEvent } from '@/lib/emsStore';
import { Loader2 } from 'lucide-react';

const TeamsPage: React.FC = () => {
  const navigate = useNavigate();
  const { manager } = useManagerSession();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSport, setSelectedSport] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    sportCategory: '',
    subCategory: '',
    eventId: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [events, setEvents] = useState<EMSEvent[]>([]);
  const [delegations, setDelegations] = useState<any[]>([]);
  const [delegationId, setDelegationId] = useState<string>('');

  // Remove static events

  useEffect(() => {
    if (manager) {
      initialLoad();
    }
  }, [manager]);

  const initialLoad = async () => {
    setIsLoading(true);
    try {
      const [teamsData, eventsData, delegationsData] = await Promise.all([
        getMyTeams(),
        getEvents(),
        getDelegationsDetails()
      ]);
      console.log('[DEBUG initialLoad] Team data structure:', teamsData);
      setTeams(teamsData);
      setEvents(eventsData.filter(e => e.status === 'Published' || e.status === 'Ongoing'));
      setDelegations(delegationsData);
      if (delegationsData.length > 0) {
        setDelegationId(delegationsData[0].id);
      }
    } catch (error: any) {
      console.error('Failed to load initial teams data:', error);
      const msg = error?.response?.data?.message || error?.message || 'Unknown error';
      toast.error(`Failed to load teams or events: ${msg}`);
    } finally {
      // Merge with local teams for display
      const localTeams = teamStore.getByManager(manager?.id || '');
      refreshTeams(localTeams);
      setIsLoading(false);
    }
  };

  const refreshTeams = async (localTeamsOverride?: Team[]) => {
    try {
      const [serverTeams, registrations] = await Promise.all([
        getMyTeams(),
        getMyRegistrations().catch(() => [])
      ]);
      const localTeams = localTeamsOverride || teamStore.getByManager(manager?.id || '');

      const registrationCounts = new Map<string, number>();
      for (const r of registrations as any[]) {
        const teamId = r.teamId || r.team_id || r.team?.id;
        if (!teamId) continue;
        registrationCounts.set(teamId, (registrationCounts.get(teamId) || 0) + 1);
      }

      const memberCountsByTeam = new Map<string, number>();
      await Promise.all(
        serverTeams.map(async (t: any) => {
          try {
            const members = await listTeamMembers(t.id);
            memberCountsByTeam.set(t.id, members.length);
          } catch {
            memberCountsByTeam.set(t.id, 0);
          }
        })
      );

      const merged = serverTeams.map((t: any) => {
        const countFromServer = t.memberCount || t.member_count || 0;
        const countFromRegs = registrationCounts.get(t.id) || 0;
        const countFromMembers = memberCountsByTeam.get(t.id) || 0;
        
        return {
          ...t,
          memberCount: Math.max(countFromServer, countFromRegs, countFromMembers)
        };
      });

      for (const lt of localTeams) {
        if (!merged.find(st => st.id === lt.id)) {
          // Calculate local member count dynamically
          const localCount = teamMemberStore.getByTeam(lt.id).length;
          merged.push({ ...lt, memberCount: localCount });
        }
      }

      setTeams(merged);
    } catch (error) {
      console.error('Failed to refresh teams:', error);
    }
  };

  const handleCreateTeam = async () => {
    if (!manager) return;

    if (!formData.name || !formData.sportCategory || !formData.eventId) {
      toast.error('Please fill in all required fields (Name, Event, and Sport)');
      return;
    }

    // Find the delegation for the selected event (Optional - backend should handle creation if missing)
    const targetDelegation = delegations.find(d => (d.eventId || d.event_id || d.event?.id) === formData.eventId);

    // Map sport category to backend's allowed enum values
    const mapCategory = (catId: string) => {
      const teamGames = ['football', 'basketball', 'volleyball', 'esports'];
      const individualGames = ['athletics', 'swimming', 'tennis', 'gymnastics', 'equestrian'];
      // combat can be considered individual or hybrid based on logic
      if (teamGames.includes(catId)) return 'team-based-games';
      if (individualGames.includes(catId)) return 'individual-games';
      return 'hybrid-games';
    };

    setIsActionLoading(true);
    try {
      const selectedEvent = events.find(e => e.id === formData.eventId);
      const eventSportCat = selectedEvent?.sportCategories?.find(
        (c: any) => c.subCategory?.toLowerCase() === formData.sportCategory.toLowerCase()
      );

      const payload: any = {
        eventId: formData.eventId,
        name: formData.name,
        sportCategory: formData.sportCategory,
        // Backend expects sportCategoryGroup to match event's sport_category "name"
        sportCategoryGroup: eventSportCat?.name || mapCategory(selectedSport),
        // Backend expects subCategory to match event's sport_category "subCategory"
        subCategory: formData.sportCategory
      };

      if (targetDelegation) {
        payload.delegationId = targetDelegation.id;
        await createTeam(payload);
        toast.success('Team created successfully!');
      } else {
        // Save locally if no delegation exists yet
        teamStore.create({
          managerId: manager.id,
          name: formData.name,
          country: manager.country || 'Unknown',
          sportCategory: formData.sportCategory,
          subCategory: formData.sportCategory,
          eventId: formData.eventId,
        });
        toast.success('Team created! It will be synced when you create a delegation.');
      }

      setFormData({ name: '', sportCategory: '', subCategory: '', eventId: '' });
      setSelectedSport('');
      setIsCreateOpen(false);
      refreshTeams();
    } catch (error: any) {
      console.error('Failed to create team:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to create team';
      toast.error(msg);
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

  const selectedCategory = SPORT_CATEGORIES.find(c => c.id === selectedSport);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">My Teams</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage teams for your delegation
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
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
                <Label>Team Name *</Label>
                <Input
                  placeholder="e.g., Saudi Athletics Team"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Event (Optional)</Label>
                <Select
                  value={formData.eventId}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, eventId: v }))}
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
              </div>

              <div className="space-y-2">
                <Label>Sport Category *</Label>
                <Select
                  value={selectedSport}
                  onValueChange={(v) => {
                    setSelectedSport(v);
                    const cat = SPORT_CATEGORIES.find(c => c.id === v);
                    setFormData(prev => ({
                      ...prev,
                      sportCategory: cat?.name || '',
                      subCategory: ''
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sport" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPORT_CATEGORIES.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCategory && selectedCategory.subCategories.length > 0 && (
                <div className="space-y-2">
                  <Label>Sub-Category</Label>
                  <Select
                    value={formData.subCategory}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, subCategory: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sub-category" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCategory.subCategories.map(sub => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isActionLoading}>Cancel</Button>
              <Button onClick={handleCreateTeam} disabled={isActionLoading}>
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
            <p className="text-muted-foreground mb-4">Create your first team to start adding members</p>
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
                    onClick={() => navigate(`/manager/add-members?teamId=${team.id}`)}
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