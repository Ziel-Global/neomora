import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useManagerSession } from '@/contexts/ManagerSessionContext';
import { eventStore, invitationStore, participantStore, EMSInvitation, EMSEvent } from '@/lib/emsStore';
import { teamMemberStore, teamStore, delegationStore } from '@/lib/teamStore';
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

const ManagerInvitationsPage: React.FC = () => {
  const { manager } = useManagerSession();
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState<DelegationInvitation[]>([]);
  const [selectedInvitation, setSelectedInvitation] = useState<DelegationInvitation | null>(null);
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (manager) {
      loadInvitations();
    }
  }, [manager]);

  const loadInvitations = () => {
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
        // Check if participant is from manager's country or is a team member
        const isFromCountry = participant.nationality === manager.country;
        const isTeamMember = memberEmails.includes(participant.email.toLowerCase());

        if (isFromCountry || isTeamMember) {
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