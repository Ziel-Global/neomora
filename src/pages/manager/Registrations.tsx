
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useManagerSession } from '@/contexts/ManagerSessionContext';
import { teamStore, teamMemberStore, Team, TeamMember } from '@/lib/teamStore';
import { invitationStore, eventStore, EMSInvitation, EMSEvent, registrationStore, participantStore } from '@/lib/emsStore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Eye, Search, FileText, Users, UserPlus, ArrowRight, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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

  useEffect(() => {
    if (manager) {
      const managerTeams = teamStore.getByManager(manager.id);
      const allMembers = teamMemberStore.getByManager(manager.id);
      setTeams(managerTeams);
      setMembers(allMembers);

      loadPendingRegistrations(manager.id);
    }
  }, [manager]);

  const loadPendingRegistrations = (managerId: string) => {
    const allInvitations = invitationStore.getAll();
    const allRegistrations = registrationStore.getAll();
    const allParticipants = participantStore.getAll();
    const teamMembers = teamMemberStore.getByManager(managerId);
    const memberEmails = teamMembers.map(m => m.email.toLowerCase());

    const pendingList: PendingRegistration[] = [];

    const myDetails = manager;
    if (!myDetails) return;

    allInvitations.filter(i => i.status === 'Accepted').forEach(inv => {
      const participant = allParticipants.find(p => p.id === inv.participantId);
      if (!participant) return;

      // Check if already registered
      const isRegistered = allRegistrations.some(r =>
        r.participantId === inv.participantId && r.eventId === inv.eventId
      );
      if (isRegistered) return;

      // Check if ours
      const isFromCountry = participant.nationality === myDetails.country;
      const isTeamMember = memberEmails.includes(participant.email.toLowerCase());

      if (isFromCountry || isTeamMember) {
        const event = eventStore.getById(inv.eventId);
        if (event) {
          pendingList.push({
            invitation: inv,
            event,
            participantName: `${participant.firstName} ${participant.lastName} `,
            participantEmail: participant.email
          });
        }
      }
    });
    setPendingRegistrations(pendingList);
  };

  const filteredMembers = members.filter(m => {
    const matchesTeam = selectedTeamFilter === 'all' || m.teamId === selectedTeamFilter;
    const matchesSearch =
      m.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.passportNumber.toLowerCase().includes(searchQuery.toLowerCase());
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
        <h1 className="text-3xl font-bold">Team Registrations</h1>
        <p className="text-muted-foreground mt-1">
          View and manage all registered team members
        </p>
      </div>

      {/* Pending Registrations Section */}
      {pendingRegistrations.length > 0 && (
        <Card className="border-blue-100 bg-blue-50/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <UserPlus className="h-5 w-5" />
              Pending Registrations ({pendingRegistrations.length})
            </CardTitle>
            <CardDescription className="text-blue-600/80">
              These members have accepted invitations but are not yet fully registered.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingRegistrations.map(pending => (
                <Card key={pending.invitation.id} className="bg-white border-blue-100">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-semibold">{pending.participantName}</p>
                        <p className="text-sm text-muted-foreground">{pending.participantEmail}</p>
                      </div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Accepted
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{pending.event.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {pending.event.city} • {new Date(pending.event.startDate).toLocaleDateString()}
                      </p>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => navigate(`/ manager / register - member ? email = ${encodeURIComponent(pending.participantEmail)}& eventId=${pending.event.id} `)}
                    >
                      Complete Registration
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
          {filteredMembers.length === 0 ? (
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
                  {filteredMembers.map(member => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{member.firstName} {member.lastName}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getTeamName(member.teamId)}</TableCell>
                      <TableCell>{member.role}</TableCell>
                      <TableCell className="font-mono text-sm">{member.passportNumber}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(member.status)}>{member.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedMember(member)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/ manager / documents ? memberId = ${member.id} `)}
                          title="Manage Documents"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{selectedMember.firstName} {selectedMember.lastName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Team</p>
                  <p className="font-medium">{getTeamName(selectedMember.teamId)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="font-medium">{selectedMember.role}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sport</p>
                  <p className="font-medium">{selectedMember.sportCategory}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedMember.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedMember.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nationality</p>
                  <p className="font-medium">{selectedMember.nationality}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Passport</p>
                  <p className="font-medium font-mono">{selectedMember.passportNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Passport Expiry</p>
                  <p className="font-medium">{selectedMember.passportExpiry || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">{selectedMember.dateOfBirth || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gender</p>
                  <p className="font-medium">{selectedMember.gender}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(selectedMember.status)}>{selectedMember.status}</Badge>
                </div>
              </div>
              {selectedMember.dietaryRequirements && (
                <div>
                  <p className="text-sm text-muted-foreground">Dietary Requirements</p>
                  <p className="font-medium">{selectedMember.dietaryRequirements}</p>
                </div>
              )}
              {selectedMember.medicalConditions && (
                <div>
                  <p className="text-sm text-muted-foreground">Medical Conditions</p>
                  <p className="font-medium">{selectedMember.medicalConditions}</p>
                </div>
              )}
              {selectedMember.emergencyContact && (
                <div>
                  <p className="text-sm text-muted-foreground">Emergency Contact</p>
                  <p className="font-medium">{selectedMember.emergencyContact} - {selectedMember.emergencyPhone}</p>
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