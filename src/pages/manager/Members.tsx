import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CountryCombobox } from '@/components/common/CountryCombobox';
import { addTeamMember, getMyTeams, listTeamMembers } from '@/api/teamApi';
import { createManagerParticipant, getManagerParticipants } from '@/api/participantApi';
import { DELEGATION_CATEGORY_LABELS } from '@/lib/delegationCategories';
import { SPORT_CATEGORIES } from '@/lib/teamStore';
import {
  INTERNATIONAL_PHONE_PLACEHOLDER,
  sanitizePhoneInput,
} from '@/lib/phoneValidation';
import { cn } from '@/lib/utils';
import {
  Loader2,
  Plus,
  Search,
  UserPlus,
  Users,
  FolderPlus,
  IdCard,
  Mail,
  Phone,
  Trophy,
  UsersRound,
  Check,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

const ALL_SPORTS_TAB = '__all__';
const NO_SPORT_TAB = 'No sport set';
const SPORT_FILTER_KEY = 'ems_manager_members_sport_tab';

const readStoredSportTab = (): string => {
  try {
    return localStorage.getItem(SPORT_FILTER_KEY) || ALL_SPORTS_TAB;
  } catch {
    return ALL_SPORTS_TAB;
  }
};

const ROLES = DELEGATION_CATEGORY_LABELS;

const emptyForm = () => ({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  nationality: '',
  role: ROLES[0],
  sports: [] as string[],
});

const RequiredMark = () => <span className="text-destructive">*</span>;

const FormSection = ({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <section className="space-y-3.5 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-inset ring-primary/10">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 pt-0.5">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
    <div className="space-y-3">{children}</div>
  </section>
);

const teamSportName = (team: any): string =>
  String(
    team?.sportName ||
      team?.subCategory ||
      team?.sportCategory?.subCategory ||
      team?.sportCategory ||
      '',
  ).trim();

const memberParticipantId = (member: any): string =>
  String(
    member?.participantId ||
      member?.participant_id ||
      member?.participant?.id ||
      member?.participant?._id ||
      '',
  );

const MembersPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requestedTeamId = params.get('teamId') || '';
  const [open, setOpen] = useState(Boolean(requestedTeamId));
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [teamId, setTeamId] = useState(requestedTeamId);
  const [form, setForm] = useState(emptyForm);
  const [assignMember, setAssignMember] = useState<any | null>(null);
  const [assignTeamId, setAssignTeamId] = useState('');
  const [assignRole, setAssignRole] = useState(ROLES[0]);
  const [assigning, setAssigning] = useState(false);
  const [sportTab, setSportTab] = useState(readStoredSportTab);

  const { data, isLoading: loading, error, refetch } = useQuery({
    queryKey: ['manager', 'members'],
    queryFn: async () => {
      const [people, teamList] = await Promise.all([getManagerParticipants(), getMyTeams()]);

      const membershipsByTeam = await Promise.all(
        teamList.map((team) => listTeamMembers(team.id).catch(() => [])),
      );
      const teamIdsByParticipant = new Map<string, string[]>();
      teamList.forEach((team, index) => {
        for (const member of membershipsByTeam[index]) {
          const participantId = memberParticipantId(member);
          if (!participantId) continue;
          const existing = teamIdsByParticipant.get(participantId) || [];
          existing.push(team.id);
          teamIdsByParticipant.set(participantId, existing);
        }
      });

      return { members: people, teams: teamList, teamIdsByParticipant };
    },
  });
  const members = data?.members ?? [];
  const teams = data?.teams ?? [];
  const teamIdsByParticipant = data?.teamIdsByParticipant ?? new Map<string, string[]>();

  useEffect(() => {
    if (error) {
      console.error(error);
      toast.error('Could not load your members');
    }
  }, [error]);

  const selectedTeam = teams.find((team) => team.id === teamId);
  const filtered = useMemo(
    () =>
      members.filter((member) => {
        const needle = search.toLowerCase();
        return (
          !needle ||
          `${member.firstName} ${member.lastName} ${member.email}`.toLowerCase().includes(needle)
        );
      }),
    [members, search],
  );

  const sportGroups = useMemo(() => {
    const groups: { sport: string; members: typeof filtered }[] = [];
    for (const category of SPORT_CATEGORIES) {
      const inSport = filtered.filter((member) => member.sports?.includes(category.name));
      if (inSport.length > 0) groups.push({ sport: category.name, members: inSport });
    }
    const noSport = filtered.filter((member) => !member.sports || member.sports.length === 0);
    if (noSport.length > 0) groups.push({ sport: NO_SPORT_TAB, members: noSport });
    return groups;
  }, [filtered]);

  const sportTabs = useMemo(
    () => [
      { id: ALL_SPORTS_TAB, label: 'All', count: filtered.length },
      ...sportGroups.map((group) => ({
        id: group.sport,
        label: group.sport,
        count: group.members.length,
      })),
    ],
    [filtered.length, sportGroups],
  );

  const activeSportTab = useMemo(() => {
    if (sportTabs.some((tab) => tab.id === sportTab)) return sportTab;
    return ALL_SPORTS_TAB;
  }, [sportTab, sportTabs]);

  const setSportTabAndPersist = (tab: string) => {
    setSportTab(tab);
    try {
      localStorage.setItem(SPORT_FILTER_KEY, tab);
    } catch {
      // ignore storage failures
    }
  };

  const tableMembers = useMemo(() => {
    if (activeSportTab === ALL_SPORTS_TAB) return filtered;
    const group = sportGroups.find((entry) => entry.sport === activeSportTab);
    return group?.members ?? [];
  }, [activeSportTab, filtered, sportGroups]);

  const eligibleTeamsForForm = useMemo(
    () => teams.filter((team) => form.sports.includes(teamSportName(team))),
    [teams, form.sports],
  );

  const toggleFormSport = (sport: string) => {
    setForm((prev) => {
      const nextSports = prev.sports.includes(sport)
        ? prev.sports.filter((s) => s !== sport)
        : [...prev.sports, sport];
      const currentTeam = teams.find((t) => t.id === teamId);
      if (currentTeam && !nextSports.includes(teamSportName(currentTeam))) {
        setTeamId('');
      }
      return { ...prev, sports: nextSports };
    });
  };

  const handleCreateOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setForm(emptyForm());
      setTeamId(requestedTeamId);
    }
  };

  const save = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      toast.error('First name, last name, and email are required');
      return;
    }
    setSaving(true);
    try {
      const { role, ...personFields } = form;
      const member = await createManagerParticipant({
        ...personFields,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone || undefined,
        nationality: form.nationality || undefined,
      });
      if (teamId) {
        await addTeamMember(teamId, {
          participantId: member.id,
          role: form.role,
          needsVisa: false,
          needsAccommodation: false,
          needsTransport: false,
        });
        toast.success(
          `${member.firstName} was saved to Members and added to ${selectedTeam?.name || 'the team'}.`,
        );
      } else {
        toast.success(`${member.firstName} was added to your Members directory.`);
      }
      setForm(emptyForm());
      setTeamId('');
      setOpen(false);
      await refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not save this member');
    } finally {
      setSaving(false);
    }
  };

  const openAssignToTeam = (member: any) => {
    setAssignMember(member);
    setAssignTeamId('');
    setAssignRole(ROLES[0]);
  };

  const teamsMatchingAssignSport = useMemo(() => {
    if (!assignMember) return [];
    return !assignMember.sports || assignMember.sports.length === 0
      ? teams
      : teams.filter((team) => assignMember.sports.includes(teamSportName(team)));
  }, [teams, assignMember]);

  const eligibleTeamsForAssign = useMemo(() => {
    if (!assignMember) return [];
    const currentTeamIds = new Set(teamIdsByParticipant.get(assignMember.id) || []);
    return teamsMatchingAssignSport.filter((team) => !currentTeamIds.has(team.id));
  }, [teamsMatchingAssignSport, assignMember, teamIdsByParticipant]);

  const assignToTeam = async () => {
    if (!assignMember || !assignTeamId) {
      toast.error('Choose a team first');
      return;
    }
    setAssigning(true);
    try {
      await addTeamMember(assignTeamId, {
        participantId: assignMember.id,
        role: assignRole,
        needsVisa: false,
        needsAccommodation: false,
        needsTransport: false,
      });
      const team = teams.find((t) => t.id === assignTeamId);
      toast.success(`${assignMember.firstName} was added to ${team?.name || 'the team'}.`);
      setAssignMember(null);
      await refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not add this member to the team');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.06] via-card to-card px-6 py-6 shadow-sm sm:px-8 sm:py-7">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/[0.07] blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/70">
              Step 1 of 3 · Build your roster
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Members</h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Your reusable people directory. Add someone once, then place them in any team.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/15">
                <Users className="h-3.5 w-3.5" />
                <span className="tabular-nums">{members.length}</span>
                people
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border/70">
                <Trophy className="h-3.5 w-3.5" />
                <span className="tabular-nums">{sportGroups.length}</span>
                sports with members
              </span>
            </div>
          </div>

          <Dialog open={open} onOpenChange={handleCreateOpenChange}>
            <DialogTrigger asChild>
              <Button className="h-10 shrink-0 gap-1.5 shadow-sm">
                <Plus className="h-4 w-4" />
                Add member
              </Button>
            </DialogTrigger>

            <DialogContent className="flex w-[calc(100vw-1.5rem)] max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border bg-background p-0 shadow-2xl">
              <DialogHeader className="shrink-0 space-y-0 border-b bg-gradient-to-br from-primary/[0.07] via-card to-card px-6 py-5 pe-12 text-start">
                <div className="flex items-start gap-3.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-inset ring-primary/15 shadow-sm">
                    <UserPlus className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/70">
                      Team Manager Portal
                    </p>
                    <DialogTitle className="text-xl font-semibold tracking-tight">
                      {selectedTeam ? `Add member to ${selectedTeam.name}` : 'Add a member'}
                    </DialogTitle>
                    <DialogDescription className="text-sm leading-relaxed">
                      Save them to your directory now. You can place them on a matching team right away
                      or later.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
                <FormSection
                  icon={IdCard}
                  title="Personal details"
                  description="Name as it should appear on rosters and invitations."
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-[12px] font-semibold">
                        First name <RequiredMark />
                      </Label>
                      <Input
                        className="h-10 bg-background"
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                        placeholder="e.g. Ahmed"
                        autoComplete="given-name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] font-semibold">
                        Last name <RequiredMark />
                      </Label>
                      <Input
                        className="h-10 bg-background"
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                        placeholder="e.g. Khan"
                        autoComplete="family-name"
                      />
                    </div>
                  </div>
                </FormSection>

                <FormSection
                  icon={Mail}
                  title="Contact"
                  description="Used for invites and account setup when needed."
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-[12px] font-semibold">
                        Email <RequiredMark />
                      </Label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="email"
                          className="h-10 bg-background ps-9"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="member@example.com"
                          autoComplete="email"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] font-semibold">Phone</Label>
                      <div className="flex h-10 overflow-hidden rounded-md border border-input bg-background shadow-sm transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                        <span className="inline-flex shrink-0 items-center gap-1.5 border-e border-border/80 bg-muted/40 px-2.5 text-xs font-semibold text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          Intl
                        </span>
                        <input
                          type="tel"
                          inputMode="tel"
                          placeholder={INTERNATIONAL_PHONE_PLACEHOLDER}
                          value={form.phone}
                          onChange={(e) =>
                            setForm({ ...form, phone: sanitizePhoneInput(e.target.value) })
                          }
                          className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
                          autoComplete="tel"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] font-semibold">Nationality</Label>
                      <CountryCombobox
                        value={form.nationality}
                        onChange={(nationality) => setForm({ ...form, nationality })}
                        placeholder="Select country"
                        className="h-10"
                      />
                    </div>
                  </div>
                </FormSection>

                <FormSection
                  icon={Trophy}
                  title="Role & sports"
                  description="Sports control which teams they can join below."
                >
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-semibold">Role</Label>
                    <Select value={form.role} onValueChange={(role) => setForm({ ...form, role })}>
                      <SelectTrigger className="h-10 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" side="bottom" sideOffset={6} className="max-h-56">
                        {ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-[12px] font-semibold">Sports</Label>
                      {form.sports.length > 0 && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-primary ring-1 ring-inset ring-primary/15">
                          {form.sports.length} selected
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {SPORT_CATEGORIES.map((sport) => {
                        const selected = form.sports.includes(sport.name);
                        return (
                          <button
                            key={sport.id}
                            type="button"
                            onClick={() => toggleFormSport(sport.name)}
                            className={cn(
                              'group flex items-center gap-2 rounded-xl border px-3 py-2.5 text-start text-sm transition-all',
                              selected
                                ? 'border-primary/30 bg-primary/[0.08] text-foreground shadow-sm ring-1 ring-inset ring-primary/15'
                                : 'border-border/70 bg-background text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground',
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                                selected
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-border bg-muted/40 text-transparent group-hover:border-muted-foreground/40',
                              )}
                            >
                              <Check className="h-3 w-3" />
                            </span>
                            <span className="min-w-0 truncate font-medium">{sport.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </FormSection>

                <FormSection
                  icon={UsersRound}
                  title="Team placement"
                  description="Optional — leave as directory only if you are not assigning yet."
                >
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-semibold">
                      Add to team{' '}
                      <span className="font-normal text-muted-foreground">(optional)</span>
                    </Label>
                    <Select
                      value={teamId || 'none'}
                      onValueChange={(value) => setTeamId(value === 'none' ? '' : value)}
                      disabled={form.sports.length === 0}
                    >
                      <SelectTrigger className="h-10 bg-background">
                        <SelectValue
                          placeholder={
                            form.sports.length === 0 ? 'Select a sport first' : 'Directory only'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent position="popper" side="bottom" sideOffset={6} className="max-h-56">
                        <SelectItem value="none">Directory only</SelectItem>
                        {eligibleTeamsForForm.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                            {teamSportName(team) ? ` · ${teamSportName(team)}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      {form.sports.length === 0
                        ? 'Pick at least one sport to unlock matching teams.'
                        : eligibleTeamsForForm.length === 0
                          ? 'No teams match the selected sport(s) yet.'
                          : 'Only teams in the selected sports are listed.'}
                    </p>
                  </div>
                </FormSection>
              </div>

              <DialogFooter className="shrink-0 gap-2 border-t bg-muted/20 px-6 py-3.5 sm:justify-between">
                <p className="hidden text-[11px] text-muted-foreground sm:block">
                  Required fields are marked with *
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="h-10"
                    onClick={() => handleCreateOpenChange(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button className="h-10 gap-1.5 shadow-sm" onClick={save} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5" />
                    )}
                    {saving ? 'Saving…' : teamId ? 'Save & add to team' : 'Save member'}
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/[0.03] px-4 py-3.5 text-sm text-muted-foreground sm:px-5">
        <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          Members added from a team are saved here automatically. Use{' '}
          <span className="font-medium text-foreground">Add to team</span> in the table to place
          someone on a roster.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary/60" />
            <h2 className="text-sm font-semibold text-foreground">
              Directory
              <span className="ml-1.5 font-normal text-muted-foreground">
                ({tableMembers.length}
                {activeSportTab !== ALL_SPORTS_TAB ? ` · ${activeSportTab}` : ''})
              </span>
            </h2>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 bg-card pl-9"
              placeholder="Search members"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {!loading && members.length > 0 && (
          <div
            className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin"
            role="tablist"
            aria-label="Filter by sport"
          >
            {sportTabs.map((tab) => {
              const active = activeSportTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSportTabAndPersist(tab.id)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all',
                    active
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border/80 bg-card text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground',
                  )}
                >
                  {tab.label}
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                      active
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 py-24">
            <Loader2 className="h-9 w-9 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading members…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-20 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Users className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              {members.length ? 'No matching members' : 'Your roster is empty'}
            </h3>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
              {members.length
                ? 'Try another search.'
                : 'Add people now so they are ready when you create a team.'}
            </p>
          </div>
        ) : tableMembers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
            <Trophy className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="font-medium text-foreground">No members in {activeSportTab}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Switch sport above, or add someone with this sport selected.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
            <div className="overflow-x-auto">
              <Table className="w-full table-fixed">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-11 min-w-0 bg-muted/40 text-[11px] font-semibold uppercase tracking-wider">
                      Member
                    </TableHead>
                    <TableHead className="h-11 w-[160px] bg-muted/40 text-[11px] font-semibold uppercase tracking-wider">
                      Role
                    </TableHead>
                    {activeSportTab === ALL_SPORTS_TAB && (
                      <TableHead className="h-11 w-[180px] bg-muted/40 text-[11px] font-semibold uppercase tracking-wider">
                        Sports
                      </TableHead>
                    )}
                    <TableHead className="h-11 w-[140px] bg-muted/40 text-right text-[11px] font-semibold uppercase tracking-wider">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableMembers.map((member) => {
                    const initials =
                      `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase() ||
                      '?';
                    const sportsLabel =
                      member.sports?.length > 0 ? member.sports.join(', ') : 'No sport set';

                    return (
                      <TableRow
                        key={member.id}
                        className="border-border/60 transition-colors hover:bg-muted/25"
                      >
                        <TableCell className="min-w-0 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 shrink-0 ring-1 ring-inset ring-border/70">
                              <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/5 text-xs font-semibold text-primary">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {member.firstName} {member.lastName}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {member.email || 'No email added'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className="max-w-full truncate font-normal">
                            {member.role || 'Member'}
                          </Badge>
                        </TableCell>
                        {activeSportTab === ALL_SPORTS_TAB && (
                          <TableCell className="min-w-0 py-3">
                            <p className="truncate text-sm text-muted-foreground">{sportsLabel}</p>
                          </TableCell>
                        )}
                        <TableCell className="py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 border-border/80 bg-background"
                            onClick={() => openAssignToTeam(member)}
                          >
                            <FolderPlus className="h-3.5 w-3.5" />
                            Add to team
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
      </section>

      <div className="flex justify-end">
        <Button
          variant="outline"
          className="h-9 gap-1.5"
          onClick={() => navigate('/manager/teams')}
        >
          Continue to teams
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Dialog open={!!assignMember} onOpenChange={(next) => !next && setAssignMember(null)}>
        <DialogContent className="flex w-[calc(100vw-1.5rem)] max-w-md flex-col gap-0 overflow-visible rounded-2xl border bg-background p-0 shadow-2xl">
          <DialogHeader className="space-y-0 border-b bg-gradient-to-br from-primary/[0.07] via-card to-card px-5 py-4 pe-12 text-start">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-inset ring-primary/15 shadow-sm">
                <FolderPlus className="h-4 w-4" />
              </span>
              <div className="min-w-0 space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/70">
                  Team placement
                </p>
                <DialogTitle className="text-lg font-semibold tracking-tight">
                  Add {assignMember?.firstName} to a team
                </DialogTitle>
                <DialogDescription className="text-xs leading-relaxed">
                  Choose a matching team and the role they will hold on it.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid gap-4 px-5 py-4">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold">Team</Label>
              {teams.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You don't have any teams yet. Create one first.
                </p>
              ) : eligibleTeamsForAssign.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {teamsMatchingAssignSport.length === 0
                    ? `No teams match ${assignMember?.firstName}'s sport${assignMember?.sports?.length > 1 ? 's' : ''} (${assignMember?.sports?.join(', ')}).`
                    : `${assignMember?.firstName} is already on every matching team.`}
                </p>
              ) : (
                <Select value={assignTeamId} onValueChange={setAssignTeamId}>
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" sideOffset={6} className="max-h-56">
                    {eligibleTeamsForAssign.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold">Role</Label>
              <Select value={assignRole} onValueChange={setAssignRole}>
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" sideOffset={6} className="max-h-56">
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t bg-muted/20 px-5 py-3 sm:justify-end">
            <Button
              variant="outline"
              className="h-9"
              onClick={() => setAssignMember(null)}
              disabled={assigning}
            >
              Cancel
            </Button>
            <Button
              className="h-9 gap-1.5 shadow-sm"
              onClick={assignToTeam}
              disabled={assigning || eligibleTeamsForAssign.length === 0}
            >
              {assigning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FolderPlus className="h-3.5 w-3.5" />
              )}
              {assigning ? 'Adding…' : 'Add to team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MembersPage;
