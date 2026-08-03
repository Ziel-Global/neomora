import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createTeam, deleteTeam, getMyTeams, listTeamMembers } from '@/api/teamApi';
import { Team, SPORT_CATEGORIES } from '@/lib/teamStore';
import { Loader2, Plus, Trash2, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';

const teamSport = (team: any) => String(
  team.sportName || team.subCategory || team.sportCategory?.subCategory || team.sportCategory || 'Sport not set',
);

const teamDelegation = (team: any) => team.delegation?.country || team.delegationId || team.delegation_id;

const TeamsPage: React.FC = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [sport, setSport] = useState('');

  const { data: teams = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: ['manager', 'teams'],
    queryFn: async () => {
      const result = await getMyTeams();
      const withCounts = await Promise.all(result.map(async (team: any) => {
        try {
          const members = await listTeamMembers(team.id);
          return { ...team, memberCount: members.length };
        } catch {
          return team;
        }
      }));
      return withCounts as Team[];
    },
  });

  useEffect(() => {
    if (error) {
      console.error(error);
      toast.error('Could not load your teams');
    }
  }, [error]);

  const selectedSport = useMemo(
    () => SPORT_CATEGORIES.find((category) => category.name === sport),
    [sport],
  );

  const create = async () => {
    if (!name.trim() || !selectedSport) {
      toast.error('Enter a team name and choose its sport');
      return;
    }
    setSaving(true);
    try {
      await createTeam({
        name: name.trim(),
        sportCategoryGroup: selectedSport.id === 'football' || selectedSport.id === 'basketball' || selectedSport.id === 'volleyball' || selectedSport.id === 'esports' ? 'team-based-games' : 'individual-games',
        subCategory: selectedSport.name,
      });
      toast.success('Team created. You can now build its roster.');
      setName('');
      setSport('');
      setOpen(false);
      await refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not create team');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (team: Team) => {
    if (!confirm(`Delete ${team.name}? This cannot be undone.`)) return;
    try {
      await deleteTeam(team.id);
      toast.success('Team deleted');
      await refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not delete team');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Step 2 of 3 · Organise</p>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="mt-1 text-muted-foreground">Build reusable teams first, then send eligible teams in a delegation.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Create team</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create a team</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>Team name</Label><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Falcons FC" /></div>
              <div className="space-y-2">
                <Label>Sport</Label>
                <Select value={sport} onValueChange={setSport}><SelectTrigger><SelectValue placeholder="Choose the team sport" /></SelectTrigger><SelectContent>
                  {SPORT_CATEGORIES.map((category) => <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>)}
                </SelectContent></Select>
                <p className="text-xs text-muted-foreground">The team will only be available for events that offer this sport.</p>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create} disabled={saving}>{saving ? 'Creating…' : 'Create team'}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-primary/15 bg-primary/[0.03]"><CardContent className="flex gap-3 py-4 text-sm text-muted-foreground"><Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" />Add people once in <button className="font-medium text-primary underline-offset-4 hover:underline" onClick={() => navigate('/manager/members')}>Members</button>, or create a person directly from a team. A team does not belong to an event until you select it in a delegation.</CardContent></Card>

      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : teams.length === 0 ? (
        <Card><CardContent className="py-16 text-center"><Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" /><h2 className="font-semibold">No teams yet</h2><p className="mt-1 text-sm text-muted-foreground">Create a team, then add members whenever you are ready.</p><Button className="mt-5" onClick={() => setOpen(true)}>Create your first team</Button></CardContent></Card>
      ) : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{teams.map((team: any) => {
        const assigned = teamDelegation(team);
        return <Card key={team.id} className="transition-shadow hover:shadow-md"><CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-lg">{team.name}</CardTitle><CardDescription className="mt-1">{teamSport(team)}</CardDescription></div><Badge variant={assigned ? 'secondary' : 'outline'}>{assigned ? 'In delegation' : 'Ready to send'}</Badge></div></CardHeader><CardContent className="space-y-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" />{team.memberCount || 0} member{Number(team.memberCount) === 1 ? '' : 's'}</div><div className="flex gap-2"><Button size="sm" className="flex-1" onClick={() => navigate(`/manager/members?teamId=${team.id}`)}><UserPlus className="mr-2 h-4 w-4" />Add member</Button><Button size="sm" variant="outline" onClick={() => navigate(`/manager/add-members?teamId=${team.id}`)}>Manage</Button><Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => remove(team)} aria-label={`Delete ${team.name}`}><Trash2 className="h-4 w-4" /></Button></div></CardContent></Card>;
      })}</div>}
    </div>
  );
};

export default TeamsPage;
