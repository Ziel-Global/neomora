import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useManagerSession } from '@/contexts/ManagerSessionContext';
import { eventStore, invitationStore, participantStore, registrationStore, EMSInvitation, EMSEvent } from '@/lib/emsStore';
import { teamMemberStore, teamStore, delegationStore } from '@/lib/teamStore';
import { getDelegationsDetails } from '@/api/delegationApi';
import { getMyTeams } from '@/api/teamApi';
import { getMyRegistrations } from '@/api/registrationApi';
import { getEvents } from '@/api/eventApi';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Mail, Check, X, Users, Calendar, MapPin, CheckCircle, Clock, AlertCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface DelegationInvitation {
  invitation: EMSInvitation;
  event: EMSEvent;
  participantName: string;
  participantEmail: string;
}

interface DelegationNotice {
  id: string;
  delegationName: string;
  eventName: string;
  teamCount: number;
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';
  rejectionReason?: string;
}

const ManagerInvitationsPage: React.FC = () => {
  const { manager } = useManagerSession();
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState<DelegationInvitation[]>([]);
  const [delegationNotices, setDelegationNotices] = useState<DelegationNotice[]>([]);
  const [selectedInvitation, setSelectedInvitation] = useState<DelegationInvitation | null>(null);
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (manager) {
      loadInvitations();
    }
  }, [manager]);

  useEffect(() => {
    if (!manager) return;

    const handleRefresh = () => {
      loadInvitations();
    };

    window.addEventListener('storage', handleRefresh);
    window.addEventListener('delegation-status-updated', handleRefresh as EventListener);

    return () => {
      window.removeEventListener('storage', handleRefresh);
      window.removeEventListener('delegation-status-updated', handleRefresh as EventListener);
    };
  }, [manager]);

  const loadInvitations = async () => {
    if (!manager) return;

    // Get all invitations for participants from the manager's country/delegation
    const allInvitations = invitationStore.getAll();
    const allParticipants = participantStore.getAll();

    // Also check team members that have been synced
    const teamMembers = teamMemberStore.getByManager(manager.id);
    const memberEmails = teamMembers.map(m => m.email.toLowerCase());

    const delegationInvitations: DelegationInvitation[] = [];

    for (const inv of allInvitations) {
      const participant = allParticipants.find(p => p.id === inv.participantId);
      const event = eventStore.getById(inv.eventId);

      if (participant && event) {
        // Check if participant is from manager's country, matching organization, or is a team member
        const isFromCountry = participant.nationality && manager.country &&
          participant.nationality.toLowerCase() === manager.country.toLowerCase();

        const isFromOrganization = participant.organization && manager.country && (
          participant.organization.toLowerCase() === manager.country.toLowerCase() ||
          participant.organization.toLowerCase() === `${manager.country.toLowerCase()} delegation`
        );

        const isTeamMember = memberEmails.includes(participant.email.toLowerCase());

        if (isFromCountry || isFromOrganization || isTeamMember) {
          delegationInvitations.push({
            invitation: inv,
            event,
            participantName: `${participant.firstName} ${participant.lastName}`,
            participantEmail: participant.email,
          });
        }
      }
    }

    setInvitations(delegationInvitations);

    const [serverDelegations, serverTeams, serverRegistrations, serverEvents] = await Promise.all([
      getDelegationsDetails().catch(() => []),
      getMyTeams().catch(() => []),
      getMyRegistrations().catch(() => []),
      getEvents().catch(() => []),
    ]);

    // Synchronize remote events to the local eventStore
    if (Array.isArray(serverEvents)) {
      const currentEvents = eventStore.getAll();
      let updated = false;
      for (const ev of serverEvents) {
        const evId = ev.id || ev._id;
        if (!evId) continue;
        const index = currentEvents.findIndex(e => e.id === evId);
        const eventData = {
          id: evId,
          name: ev.name,
          theme: ev.theme || '',
          startDate: ev.startDate || ev.start_date || '',
          endDate: ev.endDate || ev.end_date || '',
          city: ev.city || '',
          venues: ev.venues || [],
          status: ev.status || 'Published',
          clientGroups: ev.clientGroups || ev.client_groups || [],
          eventType: ev.eventType || ev.event_type || 'individual',
          sportCategories: ev.sportCategories || ev.sport_categories || [],
          allowTeamRegistration: ev.allowTeamRegistration || ev.allow_team_registration || false,
          createdAt: ev.createdAt || ev.created_at || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as EMSEvent;
        if (index === -1) {
          currentEvents.push(eventData);
          updated = true;
        } else {
          currentEvents[index] = { ...currentEvents[index], ...eventData };
          updated = true;
        }
      }
      if (updated) {
        localStorage.setItem('ems_events', JSON.stringify(currentEvents));
      }
    }

    // Synchronize remote registrations to the local registrationStore
    if (Array.isArray(serverRegistrations)) {
      for (const reg of serverRegistrations) {
        const regId = reg.id || reg._id;
        if (!regId) continue;

        registrationStore.upsert({
          id: regId,
          registrationId: reg.registrationId || reg.registration_id || '',
          eventId: reg.eventId || reg.event_id || '',
          participantId: reg.participantId || reg.participant_id || '',
          status: reg.status || 'Submitted',
          formData: reg.formData || { needsVisa: false, needsAccommodation: false, needsTransport: false, agreeTerms: true },
          documents: reg.documents || [],
          submittedAt: reg.submittedAt || reg.submitted_at || null,
          reviewedAt: reg.reviewedAt || reg.reviewed_at || null,
          reviewedBy: reg.reviewedBy || reg.reviewed_by || '',
          rejectionReason: reg.rejectionReason || reg.rejection_reason || '',
          delegationId: reg.delegationId || reg.delegation_id || '',
          teamId: reg.teamId || reg.team_id || '',
          country: reg.country || '',
          participant: reg.participant || null,
          team: reg.team || null,
          delegation: reg.delegation || null,
        } as any);
      }
    }

    // Synchronize remote delegations to the local delegationStore
    if (Array.isArray(serverDelegations)) {
      for (const del of serverDelegations) {
        const delId = del.id || del._id;
        if (!delId) continue;
        const existing = delegationStore.getById(delId);
        if (existing) {
          delegationStore.update(delId, {
            status: del.status || 'Submitted',
            rejectionReason: del.rejectionReason || del.rejection_reason,
            reviewedAt: del.reviewedAt || del.reviewed_at,
            eventId: del.eventId || del.event_id || del.event?.id || del.event?._id || existing.eventId || '',
          });
        } else {
          delegationStore.upsert({
            id: delId,
            managerId: del.managerId || del.manager_id || manager.id,
            country: del.country || manager.country,
            eventId: del.eventId || del.event_id || del.event?.id || del.event?._id || '',
            teamIds: (del.teamIds || del.team_ids || []).map((t: any) => typeof t === 'object' ? (t.id || t._id) : t),
            totalMembers: del.totalMembers || del.total_members || 0,
            status: del.status || 'Submitted',
            rejectionReason: del.rejectionReason || del.rejection_reason,
            reviewedAt: del.reviewedAt || del.reviewed_at,
            createdAt: del.createdAt || del.created_at || new Date().toISOString(),
            updatedAt: del.updatedAt || del.updated_at || new Date().toISOString(),
          });
        }
      }
    }

    const localDelegations = delegationStore.getAll();
    const localTeams = teamStore.getByManager(manager.id);
    const managerTeams = [...serverTeams, ...localTeams];
    const managerTeamIds = new Set(managerTeams.map(team => team.id));

    // Deduplicate delegations by ID to avoid duplicates in view
    const delegationMapById = new Map<string, any>();
    for (const del of [...serverDelegations, ...localDelegations]) {
      const delId = del.id || del._id;
      if (delId) {
        const existing = delegationMapById.get(delId);
        const delEventId = del.eventId || del.event_id || del.event?.id || del.event?._id;
        const existingEventId = existing ? (existing.eventId || existing.event_id || existing.event?.id || existing.event?._id) : null;
        if (!existing || (delEventId && !existingEventId)) {
          delegationMapById.set(delId, del);
        }
      }
    }
    const mergedDelegations = Array.from(delegationMapById.values());

    const noticeMap = new Map<string, DelegationNotice>();

    const resolveTeamIds = (delegation: any): string[] => {
      const rawTeamIds = (delegation.teamIds || delegation.team_ids || delegation.teams || [])
        .map((team: any) => typeof team === 'object' ? (team.id || team._id) : team)
        .filter(Boolean);

      if (rawTeamIds.length > 0) return rawTeamIds;

      const delegationId = delegation.delegationId || delegation.id || delegation._id;
      const linkedTeams = managerTeams.filter(team =>
        team.delegationId === delegationId ||
        team.delegation_id === delegationId ||
        team.id === delegationId ||
        team.delegation === delegationId ||
        team.delegation?.id === delegationId ||
        team.delegation?._id === delegationId
      );

      if (linkedTeams.length > 0) return linkedTeams.map(team => team.id);

      return [];
    };

    const resolveStatus = (delegation: any, delegationTeamIds: string[]): DelegationNotice['status'] => {
      const delegationId = delegation.delegationId || delegation.id || delegation._id;
      const localDelegation = delegationStore.getById(delegationId);
      const matchedLocal = localDelegations.find(local =>
        local.id === delegationId ||
        (local.eventId === (delegation.eventId || delegation.event_id || delegation.event?.id || delegation.event?._id) &&
          (local.country === (delegation.country || delegation.delegation?.country || delegation.delegationCountry)))
      );
      const preferred = matchedLocal?.status || localDelegation?.status || delegation.status || 'Draft';

      const relatedRegistrations = registrationStore.getAll().filter((reg: any) => {
        const regDelegationId = reg.delegationId || reg.delegation_id;
        const regTeamId = reg.teamId || reg.team_id || reg.team?.id || reg.team?._id;
        const regEventId = reg.eventId || reg.event_id || reg.event?.id || reg.event?._id;
        const regCountry = reg.country || reg.participant?.country || reg.participant?.nationality || reg.team?.country || reg.delegation?.country;
        const matchesTeam = delegationTeamIds.length > 0 && delegationTeamIds.some(teamId => teamId === regTeamId || teamId === regDelegationId);
        const matchesScope = regEventId === (delegation.eventId || delegation.event_id || delegation.event?.id || delegation.event?._id) && (!delegation.country || regCountry === (delegation.country || delegation.delegation?.country || delegation.delegationCountry));
        return regDelegationId === delegationId || regTeamId === delegationId || matchesTeam || matchesScope;
      });

      // Compute status based on members (matching admin's status resolution logic)
      const statuses = relatedRegistrations.map((reg: any) => reg.status).filter(Boolean);
      let registrationStatus: DelegationNotice['status'] | undefined;
      if (statuses.length > 0) {
        if (statuses.every((s: string) => s === 'Approved')) {
          registrationStatus = 'Approved';
        } else if (statuses.some((s: string) => s === 'Rejected')) {
          registrationStatus = 'Rejected';
        } else if (statuses.some((s: string) => s === 'Submitted' || s === 'Under Review')) {
          registrationStatus = 'Submitted';
        }
      }

      if (registrationStatus === 'Approved' || registrationStatus === 'Rejected') {
        return registrationStatus;
      }

      if (preferred === 'Approved' || preferred === 'Rejected') return preferred;

      if (preferred === 'Under Review') return 'Submitted';
      if (localDelegation?.status === 'Submitted' || localDelegation?.status === 'Approved' || localDelegation?.status === 'Rejected') {
        return localDelegation.status;
      }
      return preferred;
    };

    const getCanonicalKey = (delegation: any): string => {
      const eventId = delegation.eventId || delegation.event_id || delegation.event?.id || delegation.event?._id || '';
      const delegationCountry = delegation.country || delegation.delegation?.country || delegation.delegationCountry || '';
      const delegationTeamIds = resolveTeamIds(delegation);
      const delegationManagerId = delegation.managerId || delegation.manager_id || delegation.manager?.id || delegation.manager?._id || manager.id;
      const delegationId = delegation.delegationId || delegation.serverDelegationId || delegation.id || delegation._id || '';
      const teamKey = delegationTeamIds.length > 0 ? [...delegationTeamIds].sort().join('|') : '';

      return delegationId ? `id:${delegationId}` : `scope:${delegationManagerId}:${eventId}:${delegationCountry}:${teamKey}`;
    };

    const isBetterStatus = (next: DelegationNotice['status'], current?: DelegationNotice['status']) => {
      const order: Record<DelegationNotice['status'], number> = {
        Draft: 0,
        'Under Review': 1,
        Submitted: 1,
        Approved: 3,
        Rejected: 3,
      };
      return !current || order[next] >= order[current];
    };

    for (const delegation of mergedDelegations as any[]) {
      const delegationOwnerId = delegation.managerId || delegation.manager_id || delegation.manager?.id || delegation.manager?._id;
      const delegationOwnerEmail = delegation.managerEmail || delegation.manager_email || delegation.manager?.email;
      const delegationCountry = delegation.country || delegation.delegation?.country || delegation.delegationCountry;
      const delegationTeamIds = resolveTeamIds(delegation);
      const hasManagerTeam = delegationTeamIds.some((teamId: string) => managerTeamIds.has(teamId));
      const delegationId = delegation.delegationId || delegation.id || delegation._id;
      const matchedLocalDelegation = localDelegations.find(local =>
        local.id === delegationId ||
        (local.eventId === (delegation.eventId || delegation.event_id || delegation.event?.id || delegation.event?._id) &&
          local.country === delegationCountry) ||
        (local.eventId === (delegation.eventId || delegation.event_id || delegation.event?.id || delegation.event?._id) &&
          local.teamIds.some(teamId => managerTeamIds.has(teamId)))
      );
      const effectiveTeamCount = matchedLocalDelegation?.teamIds?.length || delegationTeamIds.length || delegation.totalMembers || (hasManagerTeam ? managerTeams.length : 0);
      const canonicalKey = getCanonicalKey(delegation);
      const currentNotice = noticeMap.get(canonicalKey);
      const nextStatus = resolveStatus(delegation, delegationTeamIds);

      const isOwnedByManager =
        delegationOwnerId === manager.id ||
        delegationOwnerEmail === manager.email ||
        delegationCountry === manager.country ||
        hasManagerTeam ||
        (!delegationOwnerId && !delegationOwnerEmail && delegationCountry === manager.country);

      if (!isOwnedByManager) continue;

      const event = eventStore.getById(delegation.eventId || delegation.event_id || delegation.event?.id || delegation.event?._id);
      const notice: DelegationNotice = {
        id: delegationId,
        delegationName: delegationCountry ? `${delegationCountry} Delegation` : `${manager.country} Delegation`,
        eventName: event?.name || delegation.eventName || delegation.event?.name || 'Unknown Event',
        teamCount: effectiveTeamCount,
        status: isBetterStatus(nextStatus, currentNotice?.status) ? nextStatus : currentNotice!.status,
        rejectionReason: matchedLocalDelegation?.rejectionReason || delegation.rejectionReason,
      };

      if (!currentNotice || isBetterStatus(notice.status, currentNotice.status)) {
        noticeMap.set(canonicalKey, notice);
      } else if (currentNotice && currentNotice.status !== 'Approved' && currentNotice.status !== 'Rejected') {
        noticeMap.set(canonicalKey, {
          ...currentNotice,
          teamCount: Math.max(currentNotice.teamCount, notice.teamCount),
          rejectionReason: currentNotice.rejectionReason || notice.rejectionReason,
        });
      }
    }

    const filteredNotices = Array.from(noticeMap.values()).filter(notice => notice.status !== 'Draft');
    setDelegationNotices(filteredNotices);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Accepted':
        return <Badge className="bg-status-success-bg text-status-success"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
      case 'Declined':
        return <Badge className="bg-status-error-bg text-status-error"><X className="h-3 w-3 mr-1" />Declined</Badge>;
      case 'Delivered':
      case 'Opened':
        return <Badge className="bg-status-warning-bg text-status-warning"><Clock className="h-3 w-3 mr-1" />Pending Response</Badge>;
      case 'Expired':
        return <Badge className="bg-muted text-muted-foreground"><AlertCircle className="h-3 w-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDelegationStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <Badge className="bg-status-success-bg text-status-success"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'Rejected':
        return <Badge className="bg-status-error-bg text-status-error"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'Submitted':
        return <Badge className="bg-status-warning-bg text-status-warning"><Clock className="h-3 w-3 mr-1" />Under Review</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const handleAcceptInvitation = (inv: DelegationInvitation) => {
    setSelectedInvitation(inv);
    setIsAcceptDialogOpen(true);
  };

  const handleConfirmAccept = async () => {
    if (!selectedInvitation) return;

    setIsProcessing(true);
    try {
      // Update invitation status to Accepted
      invitationStore.respond(selectedInvitation.invitation.id, 'Accepted');

      toast.success(`Invitation accepted for ${selectedInvitation.participantName}`);
      loadInvitations();
      setIsAcceptDialogOpen(false);
      setSelectedInvitation(null);
    } catch (error) {
      toast.error('Failed to accept invitation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkAccept = () => {
    const pendingInvitations = invitations.filter(
      inv => ['Delivered', 'Opened', 'Pending'].includes(inv.invitation.status)
    );

    if (pendingInvitations.length === 0) {
      toast.info('No pending invitations to accept');
      return;
    }

    let accepted = 0;
    for (const inv of pendingInvitations) {
      invitationStore.respond(inv.invitation.id, 'Accepted');
      accepted++;
    }

    toast.success(`Accepted ${accepted} invitation(s) for your delegation`);
    loadInvitations();
  };

  const pendingCount = invitations.filter(
    inv => ['Delivered', 'Opened', 'Pending'].includes(inv.invitation.status)
  ).length;

  const acceptedCount = invitations.filter(inv => inv.invitation.status === 'Accepted').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Delegation Invitations</h1>
          <p className="text-muted-foreground mt-1">
            View and respond to invitations for your {manager?.country} delegation
          </p>
        </div>
        {pendingCount > 0 && (
          <Button onClick={handleBulkAccept}>
            <Check className="h-4 w-4 mr-2" />
            Accept All ({pendingCount})
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{invitations.length}</p>
                <p className="text-sm text-muted-foreground">Total Invitations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-status-warning-bg flex items-center justify-center">
                <Clock className="h-6 w-6 text-status-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending Response</p>
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
                <p className="text-2xl font-bold">{acceptedCount}</p>
                <p className="text-sm text-muted-foreground">Accepted</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invitations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invitations ({invitations.length})
          </CardTitle>
          <CardDescription>
            Accept invitations on behalf of your delegation members, then proceed to register them
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">No invitations for your delegation yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Participant</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map(inv => (
                    <TableRow key={inv.invitation.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{inv.participantName}</p>
                          <p className="text-sm text-muted-foreground">{inv.participantEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{inv.event.name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{inv.event.city}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {new Date(inv.invitation.rsvpDeadline).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(inv.invitation.status)}</TableCell>
                      <TableCell>
                        {['Delivered', 'Opened', 'Pending'].includes(inv.invitation.status) ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleAcceptInvitation(inv)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                invitationStore.respond(inv.invitation.id, 'Declined');
                                loadInvitations();
                                toast.info('Invitation declined');
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : inv.invitation.status === 'Accepted' ? (
                          <span className="text-sm text-status-success flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            Synced to Registrations
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Delegation Review Status
          </CardTitle>
          <CardDescription>
            Latest admin decisions for your delegation submissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {delegationNotices.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">No delegation submissions found yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Delegation</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Teams</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {delegationNotices.map(notice => (
                    <TableRow key={notice.id}>
                      <TableCell>
                        <p className="font-medium">{notice.delegationName}</p>
                      </TableCell>
                      <TableCell>{notice.eventName}</TableCell>
                      <TableCell>{notice.teamCount}</TableCell>
                      <TableCell>{getDelegationStatusBadge(notice.status)}</TableCell>
                      <TableCell>
                        {notice.status === 'Approved' ? (
                          <span className="text-sm text-status-success">Delegation approved by admin</span>
                        ) : notice.status === 'Rejected' ? (
                          <span className="text-sm text-status-error">
                            Delegation rejected{notice.rejectionReason ? `: ${notice.rejectionReason}` : ''}
                          </span>
                        ) : notice.status === 'Submitted' ? (
                          <span className="text-sm text-muted-foreground">Awaiting admin review</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Draft delegation</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accept Confirmation Dialog */}
      <Dialog open={isAcceptDialogOpen} onOpenChange={setIsAcceptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Invitation</DialogTitle>
            <DialogDescription>
              You are accepting this invitation on behalf of {selectedInvitation?.participantName}
            </DialogDescription>
          </DialogHeader>
          {selectedInvitation && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Participant</p>
                  <p className="font-medium">{selectedInvitation.participantName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Event</p>
                  <p className="font-medium">{selectedInvitation.event.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{selectedInvitation.event.city}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dates</p>
                  <p className="font-medium">
                    {new Date(selectedInvitation.event.startDate).toLocaleDateString()} - {new Date(selectedInvitation.event.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm">
                  After accepting, you can proceed to complete the registration with travel preferences and required documents.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAcceptDialogOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleConfirmAccept} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Accept & Continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagerInvitationsPage;