
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useManagerSession } from '@/contexts/ManagerSessionContext';
import { Team } from '@/lib/teamStore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { getMyTeams, listTeamMembers } from '@/api/teamApi';
import { getEvents } from '@/api/eventApi';
import { Loader2, Eye, Search, FileText, Users, Calendar, Send, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const RegistrationsPage: React.FC = () => {
  const { manager } = useManagerSession();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<any | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['manager', 'registrations'],
    queryFn: async () => {
      const [teamsData, eventsData] = await Promise.all([
        getMyTeams(),
        getEvents(),
      ]);

      if (teamsData.length === 0) {
        return { teams: teamsData, events: eventsData, members: [] as any[] };
      }

      const membersPerTeam = await Promise.all(
        teamsData.map(team => listTeamMembers(team.id))
      );

      const membersData = membersPerTeam.flatMap((teamMembers, index) =>
        teamMembers.map(member => ({ ...member, teamId: teamsData[index].id }))
      );

      return { teams: teamsData, events: eventsData, members: membersData };
    },
    enabled: !!manager,
  });

  const teams = data?.teams ?? [];
  const events = data?.events ?? [];
  const members = data?.members ?? [];

  useEffect(() => {
    if (error) {
      console.error('Failed to load registrations data:', error);
      const msg = (error as any)?.response?.data?.message || (error as any)?.message || 'Unknown error';
      toast.error(`Failed to load registrations: ${msg}`);
    }
  }, [error]);

  const getTeamEventId = (team: Team | undefined): string => {
    if (!team) return '';
    return String((team as any).eventId || (team as any).event_id || (team as any).event?.id || '');
  };

  const matchesSearch = (member: any) => {
    if (!searchQuery.trim()) return true;
    const p = member.participant || member;
    const q = searchQuery.toLowerCase();
    return (
      (p.firstName || '').toLowerCase().includes(q) ||
      (p.lastName || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.passportNumber || member.passportNumber || '').toLowerCase().includes(q)
    );
  };

  const isSent = (member: any) => member.status && member.status !== 'Draft';

  const getTeamName = (teamId: string) => teams.find(t => t.id === teamId)?.name || 'Unknown Team';

  // Group teams by the event they're currently linked to (a team has no event until
  // it's attached to an approved delegation), then group members within each team.
  const eventGroups = events
    .map(event => {
      const eventTeams = teams.filter(t => getTeamEventId(t) === String(event.id));
      const eventMembers = members.filter(m => eventTeams.some(t => t.id === m.teamId) && matchesSearch(m));
      return { event, eventTeams, eventMembers };
    })
    .filter(group => group.eventTeams.length > 0);

  const unassignedTeams = teams.filter(t => !getTeamEventId(t));
  const unassignedMembers = members.filter(m => unassignedTeams.some(t => t.id === m.teamId) && matchesSearch(m));

  const renderMemberRow = (registration: any) => {
    const p = registration.participant || registration;
    const sent = isSent(registration);
    return (
      <TableRow key={registration.id}>
        <TableCell>
          <div>
            <p className="font-medium">{p.firstName} {p.lastName}</p>
            <p className="text-sm text-muted-foreground">{p.email}</p>
          </div>
        </TableCell>
        <TableCell>{getTeamName(registration.teamId)}</TableCell>
        <TableCell>{registration.role || p.role}</TableCell>
        <TableCell className="font-mono text-sm">{p.passportNumber || registration.passportNumber || '—'}</TableCell>
        <TableCell>
          <Badge className={sent ? 'bg-status-success-bg text-status-success' : 'bg-muted text-muted-foreground'}>
            {sent ? <Send className="h-3 w-3 mr-1 inline" /> : <Clock className="h-3 w-3 mr-1 inline" />}
            {sent ? 'Sent to Admin' : 'Draft — not sent'}
          </Badge>
        </TableCell>
        <TableCell>
          <Button variant="ghost" size="sm" onClick={() => setSelectedMember(registration)}>
            <Eye className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Team Registration</h1>
        <p className="text-muted-foreground mt-1">
          Members are only visible to event admins once you send the delegation. Until then, everything here is kept private to you.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or passport..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : eventGroups.length === 0 && unassignedMembers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">No members registered yet</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {eventGroups.map(({ event, eventMembers }) => (
            <Card key={event.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {event.name}
                  <Badge variant="outline" className="ml-2 font-normal">
                    {eventMembers.filter(isSent).length} sent · {eventMembers.length} total
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {eventMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No members added for this event yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Passport</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {eventMembers.map(renderMemberRow)}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {unassignedMembers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Not yet linked to an event
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  These teams aren't attached to a delegation/event yet — go to Delegations to send one.
                </p>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Passport</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unassignedMembers.map(renderMemberRow)}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Member Detail Dialog */}
      <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              {(() => {
                const m = selectedMember as any;
                const p = m.participant || m;
                return (
                  <div className="grid grid-cols-2 gap-4 text-start">
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="font-medium">{p.firstName} {p.lastName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Team</p>
                      <p className="font-medium">{getTeamName(m.teamId)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Category</p>
                      <p className="font-medium">{m.role || p.role || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{p.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{p.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Nationality</p>
                      <p className="font-medium">{p.nationality || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Passport</p>
                      <p className="font-medium font-mono">{p.passportNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Organization</p>
                      <p className="font-medium">{p.organization || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Job Title</p>
                      <p className="font-medium">{p.jobTitle || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge className={isSent(m) ? 'bg-status-success-bg text-status-success' : 'bg-muted text-muted-foreground'}>
                        {isSent(m) ? 'Sent to Admin' : 'Draft — not sent'}
                      </Badge>
                    </div>
                  </div>
                );
              })()}
              {(selectedMember as any).dietaryRequirements && (
                <div className="text-start">
                  <p className="text-sm text-muted-foreground">Dietary Requirements</p>
                  <p className="font-medium">{(selectedMember as any).dietaryRequirements}</p>
                </div>
              )}
              {(selectedMember as any).medicalConditions && (
                <div className="text-start">
                  <p className="text-sm text-muted-foreground">Medical Conditions</p>
                  <p className="font-medium">{(selectedMember as any).medicalConditions}</p>
                </div>
              )}
              {(selectedMember as any).participant?.emergencyContact && (
                <div className="text-start">
                  <p className="text-sm text-muted-foreground">Emergency Contact</p>
                  <p className="font-medium">
                    {(selectedMember as any).participant.emergencyContact} - {(selectedMember as any).participant.emergencyPhone}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RegistrationsPage;
