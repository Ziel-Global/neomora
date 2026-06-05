import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useManagerSession } from '@/contexts/ManagerSessionContext';
import { eventStore, invitationStore, participantStore, registrationStore, EMSInvitation, EMSEvent } from '@/lib/emsStore';
import { delegationStore, teamMemberStore, teamStore, Team, TeamMember } from '@/lib/teamStore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, CheckCircle, Clock, Plane, FileCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDelegationsDetails } from '@/api/delegationApi';
import { getMyTeams, listTeamMembers } from '@/api/teamApi';
import { getMyRegistrations } from '@/api/registrationApi';

interface ReadyToRegister {
  member: TeamMember;
  event: EMSEvent;
  invitation?: EMSInvitation;
  hasTravelPrefs: boolean;
}

const normalizeStatus = (status?: string) => status?.toString().trim().toLowerCase();

const getDelegationTeamIds = (delegation: any): string[] => {
  const teamIds = delegation?.teamIds || delegation?.team_ids || [];
  const teamObjects = (delegation?.teams || []).map((team: any) => team?.id || team?._id).filter(Boolean);

  return Array.from(new Set([...teamIds, ...teamObjects].filter(Boolean)));
};

const ManagerRegisterPage: React.FC = () => {
  const { manager } = useManagerSession();
  const navigate = useNavigate();
  const [readyMembers, setReadyMembers] = useState<ReadyToRegister[]>([]);
  const [approvedTeams, setApprovedTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [serverTeamMembers, setServerTeamMembers] = useState<ReadyToRegister[]>([]);

  useEffect(() => {
    if (manager) {
      void loadReadyMembers();
    }
  }, [manager]);

  useEffect(() => {
    const loadServerMembers = async () => {
      if (!selectedTeamId) {
        setServerTeamMembers([]);
        return;
      }

      // local teams stored in local store using ids like 'team-...'
      if (selectedTeamId.startsWith('team-')) {
        setServerTeamMembers([]);
        return;
      }

      try {
        const [members, regs] = await Promise.all([
          listTeamMembers(selectedTeamId).catch(() => []),
          getMyRegistrations().catch(() => []),
        ]);

        const mappedMembers: ReadyToRegister[] = (members as any[]).map((m) => {
          const participant = (m as any).participant || m;
          const memberLike: any = {
            id: participant.id || m.id,
            teamId: selectedTeamId,
            firstName: participant.firstName || participant.first_name || participant.fname || '',
            lastName: participant.lastName || participant.last_name || participant.lname || '',
            email: participant.email || '',
            phone: participant.phone || '',
            nationality: participant.nationality || '',
            passportNumber: participant.passportNumber || participant.passport_number || '',
            passportExpiry: participant.passportExpiry || participant.passport_expiry || '',
            dateOfBirth: participant.dateOfBirth || '',
            gender: participant.gender || 'Male',
            sportCategory: '',
            subCategory: '',
            role: participant.jobTitle || participant.role || 'Participant',
            emergencyContact: '',
            emergencyPhone: '',
            dietaryRequirements: participant.dietaryNotes || '',
            medicalConditions: '',
            travelPreferences: participant.travelPreferences || {},
          };

          const event = eventStore.getById(m.eventId || m.event?.id || '');
          return {
            member: memberLike,
            event: event || ({ id: '', name: '', city: '' } as EMSEvent),
            hasTravelPrefs: !!memberLike.travelPreferences?.originCity,
          } as ReadyToRegister;
        });

        // also map regs for this team
        const teamRegs = (regs as any[]).filter(r => r.teamId === selectedTeamId || r.team_id === selectedTeamId || r.team?.id === selectedTeamId);
        const mappedRegs = teamRegs.map(r => {
          const participant = r.participant || {};
          const memberLike: any = {
            id: participant.id || r.id,
            teamId: selectedTeamId,
            firstName: participant.firstName || participant.first_name || '',
            lastName: participant.lastName || participant.last_name || '',
            email: participant.email || '',
            phone: participant.phone || '',
            nationality: participant.nationality || '',
            passportNumber: participant.passportNumber || participant.passport_number || '',
            passportExpiry: participant.passportExpiry || participant.passport_expiry || '',
            dateOfBirth: participant.dateOfBirth || '',
            gender: participant.gender || 'Male',
            sportCategory: '',
            subCategory: '',
            role: participant.jobTitle || participant.role || 'Participant',
            emergencyContact: '',
            emergencyPhone: '',
            dietaryRequirements: participant.dietaryNotes || '',
            medicalConditions: '',
            travelPreferences: participant.travelPreferences || {},
          };
          const event = eventStore.getById(r.eventId || r.event?.id || '');
          return {
            member: memberLike,
            event: event || ({ id: '', name: '', city: '' } as EMSEvent),
            hasTravelPrefs: !!memberLike.travelPreferences?.originCity,
          } as ReadyToRegister;
        });

        // merge without duplicates (by email or id)
        const seen = new Set<string>();
        const combined: ReadyToRegister[] = [];
        for (const it of [...mappedMembers, ...mappedRegs]) {
          const key = (it.member.email || it.member.id || '').toString().toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            combined.push(it);
          }
        }

        setServerTeamMembers(combined);
      } catch (e) {
        console.error('Failed to load server team members:', e);
        setServerTeamMembers([]);
      }
    };

    void loadServerMembers();
  }, [selectedTeamId]);

  const loadReadyMembers = async () => {
    if (!manager) return;

    const allInvitations = invitationStore.getAll();
    const allParticipants = participantStore.getAll();
    const localTeams = teamStore.getByManager(manager.id);
    const localDelegations = delegationStore.getByManager(manager.id);
    const [remoteDelegations, remoteTeams] = await Promise.all([
      getDelegationsDetails().catch(() => []),
      getMyTeams().catch(() => []),
    ]);

    const managerDelegations = [...remoteDelegations, ...localDelegations].filter((delegation: any) => {
      const delegationManagerId = delegation?.managerId || delegation?.manager_id || delegation?.manager?.id || delegation?.user?.id;
      return !delegationManagerId || delegationManagerId === manager.id;
    });

    const approvedDelegations = managerDelegations.filter((delegation: any) => normalizeStatus(delegation?.status) === 'approved');
    const approvedDelegationIds = new Set<string>(approvedDelegations.map((delegation: any) => delegation?.id || delegation?._id).filter(Boolean));
    const approvedTeamIds = new Set<string>();

    for (const delegation of approvedDelegations) {
      getDelegationTeamIds(delegation).forEach((teamId) => approvedTeamIds.add(teamId));
    }

    const allTeams = [...remoteTeams, ...localTeams];
    const approvedTeamsByDelegation = allTeams.filter((team: any) => {
      const teamDelegationId = team?.delegationId || team?.delegation_id || team?.delegation?.id || team?.delegation?._id;
      return approvedTeamIds.has(team?.id) || approvedDelegationIds.has(teamDelegationId) || normalizeStatus(team?.status) === 'approved';
    });

    const uniqueApprovedTeams = Array.from(
      new Map(approvedTeamsByDelegation.map((team: any) => [team.id, team as Team])).values()
    );

    const allowedTeamIds = new Set<string>([
      ...approvedTeamIds,
      ...uniqueApprovedTeams.map((team) => team.id),
    ]);

    setApprovedTeams(uniqueApprovedTeams);

    const teamMembers = teamMemberStore.getByManager(manager.id).filter((member) => allowedTeamIds.has(member.teamId));
    const ready: ReadyToRegister[] = [];

    // Check accepted invitations for team members
    for (const inv of allInvitations) {
      if (inv.status !== 'Accepted') continue;

      const participant = allParticipants.find(p => p.id === inv.participantId);
      const event = eventStore.getById(inv.eventId);

      if (participant && event) {
        // Check if already registered
        const existingRegs = registrationStore.getByParticipant(participant.id);
        const existingReg = existingRegs.find(r => r.eventId === event.id);
        if (existingReg) continue;

        // Check if this is a team member
        const teamMember = teamMembers.find(m => m.email.toLowerCase() === participant.email.toLowerCase());

        if (teamMember) {
          ready.push({
            member: teamMember,
            event,
            invitation: inv,
            hasTravelPrefs: !!teamMember.travelPreferences?.originCity,
          });
        } else {
          // Check if participant is from manager's country
          const isFromCountry = participant.nationality === manager.country;
          if (isFromCountry) {
            // Create virtual member
            ready.push({
              member: {
                id: participant.id,
                teamId: '',
                firstName: participant.firstName,
                lastName: participant.lastName,
                email: participant.email,
                phone: participant.phone,
                nationality: participant.nationality,
                passportNumber: participant.passportNumber || '',
                passportExpiry: participant.passportExpiry || '',
                dateOfBirth: '',
                gender: 'Male',
                sportCategory: '',
                subCategory: '',
                role: participant.role,
                emergencyContact: participant.emergencyContact || '',
                emergencyPhone: '',
                dietaryRequirements: participant.dietaryNotes,
                medicalConditions: '',
                status: 'Draft',
                createdAt: participant.createdAt,
                updatedAt: participant.updatedAt,
              },
              event,
              invitation: inv,
              hasTravelPrefs: false,
            });
          }
        }
      }
    }

    // Also check team members who don't have invitations but are ready
    for (const member of teamMembers) {
      // Skip if already in list or already registered for their team's event
      const alreadyInList = ready.some(r => r.member.email.toLowerCase() === member.email.toLowerCase());
      if (alreadyInList) continue;

      // Skip members that are already registered
      if (member.registrationStatus === 'Submitted' || member.registrationStatus === 'Approved') continue;

      // Get team to find event
      const team = teamStore.getById(member.teamId);
      if (!team) continue;

      const event = eventStore.getById(team.eventId);
      if (!event) continue;

      // Check if participant exists and is registered
      const participant = participantStore.getByEmail(member.email);
      if (participant) {
        const existingRegs = registrationStore.getByParticipant(participant.id);
        const existingReg = existingRegs.find(r => r.eventId === event.id);
        if (existingReg) continue;
      }

      ready.push({
        member,
        event,
        hasTravelPrefs: !!member.travelPreferences?.originCity,
      });
    }

    setReadyMembers(ready);
  };

  const handleRegister = (item: ReadyToRegister) => {
    // 1. Determine the accurate team ID
    const effectiveTeamId = item.member.teamId || selectedTeamId || '';

    // 2. Fetch the actual team from the store to ensure we align with its designated event
    const actualTeam = teamStore.getById(effectiveTeamId);

    // 3. Prioritize the team's event ID to ensure the backend constraint is satisfied
    const effectiveEventId = actualTeam?.eventId || item.event?.id || '';
    
    const eventIdParam = effectiveEventId
      ? `&eventId=${encodeURIComponent(effectiveEventId)}`
      : '';

    if (item.invitation?.id) {
      navigate(`/register?invitationId=${encodeURIComponent(item.invitation.id)}&teamId=${encodeURIComponent(effectiveTeamId)}${eventIdParam}`);
      return;
    }

    navigate(`/register?teamId=${encodeURIComponent(effectiveTeamId)}${eventIdParam}`);
  };

      const registeredCount = teamMemberStore.getByManager(manager?.id || '').filter(
        m => m.registrationStatus === 'Submitted' || m.registrationStatus === 'Approved'
      ).length;

      const displayMembers = selectedTeamId
        ? (selectedTeamId.startsWith('team-')
          ? teamMemberStore.getByTeam(selectedTeamId).map((m) => ({ member: m, event: eventStore.getById(teamStore.getById(m.teamId || '')?.eventId || '') || ({ id: '', name: '', city: '' } as EMSEvent), hasTravelPrefs: !!m.travelPreferences?.originCity } as ReadyToRegister))
          : (serverTeamMembers.length ? serverTeamMembers : readyMembers.filter(r => r.member.teamId === selectedTeamId)))
        : readyMembers;

      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Register Members</h1>
            <p className="text-muted-foreground mt-1">
              Complete registration for your delegation members
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserPlus className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{readyMembers.length}</p>
                    <p className="text-sm text-muted-foreground">Ready to Register</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-status-success-bg flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-status-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{registeredCount}</p>
                    <p className="text-sm text-muted-foreground">Registered</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-status-info-bg flex items-center justify-center">
                    <Plane className="h-6 w-6 text-status-info" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{readyMembers.filter(m => m.hasTravelPrefs).length}</p>
                    <p className="text-sm text-muted-foreground">With Travel Prefs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {approvedTeams.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Approved Delegation Teams</CardTitle>
                <CardDescription>
                  Only teams linked to approved delegations are shown here and available for registration.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {approvedTeams.map((team) => {
                    const active = selectedTeamId === team.id;
                    return (
                      <Badge
                        key={team.id}
                        variant={active ? 'default' : 'secondary'}
                        className={`px-3 py-1 cursor-pointer ${active ? 'ring-2 ring-primary' : ''}`}
                        onClick={() => setSelectedTeamId(active ? null : team.id)}
                      >
                        {team.name}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ready to Register Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Ready to Register ({displayMembers.length})
              </CardTitle>
              <CardDescription>
                Members with accepted invitations or team members ready for registration .
                Travel preferences will be pre-filled if set via bulk action.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {displayMembers.length === 0 ? (
                <div className="text-center py-12">
                  <FileCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No members ready to register</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Approve the delegation, then accept invitations or add team members to get started
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Travel Prefs</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayMembers.map((item, idx) => (
                        <TableRow key={`${item.member.id}-${idx}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.member.firstName} {item.member.lastName}</p>
                              <p className="text-sm text-muted-foreground">{item.member.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.event.name}</p>
                              <p className="text-sm text-muted-foreground">{item.event.city}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{item.member.role || 'Participant'}</Badge>
                          </TableCell>
                          <TableCell>
                            {item.hasTravelPrefs ? (
                              <Badge className="bg-status-success-bg text-status-success">
                                <Plane className="h-3 w-3 mr-1" />
                                Set
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                <Clock className="h-3 w-3 mr-1" />
                                Not Set
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" onClick={() => handleRegister(item)}>
                              <UserPlus className="h-4 w-4 mr-1" />
                              Register
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
        </div>
      );
    };

    export default ManagerRegisterPage;