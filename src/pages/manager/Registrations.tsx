
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useManagerSession } from '@/contexts/ManagerSessionContext';
import { Team, TeamMember } from '@/lib/teamStore';
import { EMSEvent, EMSInvitation } from '@/lib/emsStore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { getMyTeams, listTeamMembers } from '@/api/teamApi';
import { getEvents } from '@/api/eventApi';
import { getMyRegistrations } from '@/api/registrationApi';
import { Loader2, Eye, Search, FileText, Users, UserPlus, ArrowRight, Calendar, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface PendingRegistration {
  invitation: EMSInvitation;
  event: EMSEvent;
  participantName: string;
  participantEmail: string;
}

const RegistrationsPage: React.FC = () => {
  const { manager } = useManagerSession();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // New state for pending registrations
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<EMSEvent[]>([]);

  useEffect(() => {
    if (manager) {
      refreshData();
    }
  }, [manager]);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [teamsData, eventsData] = await Promise.all([
        getMyTeams(),
        getEvents()
      ]);
      setTeams(teamsData);
      setEvents(eventsData);

      // Try to get registrations from global endpoint first
      let regsData = await getMyRegistrations();

      // If none found or global failed, aggregate from teams
      if (regsData.length === 0 && teamsData.length > 0) {
        console.log('No global registrations found, aggregating from teams...');
        const teamMembersPromises = teamsData.map(team => listTeamMembers(team.id));
        const membersPerTeam = await Promise.all(teamMembersPromises);

        // Flatten and add teamId context if missing
        regsData = membersPerTeam.flatMap((teamMembers, index) =>
          teamMembers.map(m => ({ ...m, teamId: teamsData[index].id }))
        );
      }

      setMembers(regsData as any);
    } catch (error: any) {
      console.error('Failed to load registrations data:', error);
      const msg = error?.response?.data?.message || error?.message || 'Unknown error';
      toast.error(`Failed to load registrations: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMembers = (members || []).filter(m => {
    const participant = (m as any).participant || m;
    const matchesTeam = selectedTeamFilter === 'all' || m.teamId === selectedTeamFilter;
    const matchesSearch =
      (participant.firstName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (participant.lastName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (participant.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (participant.passportNumber || (m as any).passportNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTeam && matchesSearch;
  });

  const getTeamName = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.name || 'Unknown Team';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-status-success-bg text-status-success';
      case 'Submitted': return 'bg-status-info-bg text-status-info';
      case 'Rejected': return 'bg-status-error-bg text-status-error';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Team Registration</h1>
        <p className="text-muted-foreground mt-1">
          View and manage all registered team members
        </p>
      </div>


      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or passport..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedTeamFilter} onValueChange={setSelectedTeamFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map(team => (
                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Registered Members ({filteredMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">No members registered yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Passport</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map(registration => {
                    const m = registration as any;
                    const p = m.participant || m;
                    return (
                      <TableRow key={registration.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{p.firstName} {p.lastName}</p>
                            <p className="text-sm text-muted-foreground">{p.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getTeamName(registration.teamId)}</TableCell>
                        <TableCell>{p.role || m.role}</TableCell>
                        <TableCell className="font-mono text-sm">{p.passportNumber || m.passportNumber}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(registration.status || 'Draft')}>{registration.status || 'Draft'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedMember(registration)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/manager/documents?memberId=${registration.id}`)}
                            title="Manage Documents"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
                      <p className="text-sm text-muted-foreground">Role</p>
                      <p className="font-medium">{p.role || m.role}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sport</p>
                      <p className="font-medium">{p.sportCategory || m.sportCategory}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{p.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{p.phone || m.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Nationality</p>
                      <p className="font-medium">{p.nationality || m.nationality}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Passport</p>
                      <p className="font-medium font-mono">{p.passportNumber || m.passportNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Passport Expiry</p>
                      <p className="font-medium">{p.passportExpiry || m.passportExpiry || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date of Birth</p>
                      <p className="font-medium">{p.dateOfBirth || m.dateOfBirth || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Gender</p>
                      <p className="font-medium">{p.gender || m.gender}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge className={getStatusColor(m.status || 'Draft')}>{m.status || 'Draft'}</Badge>
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
              {(selectedMember as any).emergencyContact && (
                <div className="text-start">
                  <p className="text-sm text-muted-foreground">Emergency Contact</p>
                  <p className="font-medium">{(selectedMember as any).emergencyContact} - {(selectedMember as any).emergencyPhone}</p>
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