import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, Column } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Flag,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  MoreHorizontal,
  Eye,
  ChevronDown,
  FileText,
  Download,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { getAllDelegations, updateDelegationStatus } from '@/api/delegationApi';
import { getAllTeams, listTeamMembers } from '@/api/teamApi';
import { getEvents } from '@/api/eventApi';
import { getRegistrationsByTeam } from '@/api/registrationApi';

interface DelegationWithDetails {
  id: string;
  delegationId?: string;
  country: string;
  eventId: string;
  eventName: string;
  managerName: string;
  teamName?: string;
  // status: string;
  totalMembers: number;
  submittedAt?: string;
  teamIds: string[];
  teams: any[];
  members: any[];
  [key: string]: any; // Allow other properties from the API
}

const DelegationsPage: React.FC = () => {
  const { eventId } = useParams();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [delegations, setDelegations] = useState<DelegationWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Dialog states
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [viewMembersDialogOpen, setViewMembersDialogOpen] = useState(false);
  const [selectedDelegation, setSelectedDelegation] = useState<DelegationWithDetails | null>(null);
  const [reason, setReason] = useState('');
  const [membersLoading, setMembersLoading] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [delegationData, eventData, teamData, registrationGroups] = await Promise.all([
        getAllDelegations(),
        getEvents(),
        getAllTeams().catch(() => []),
        getRegistrationsByTeam().catch(() => []),
      ]);

      const normalizeRegistrationGroups = (groups: any[]) => {
        const results: any[] = [];

        for (const group of groups || []) {
          const teamId = group.teamId || group.id || group._id || group.team?.id || group.team?._id;
          const teamName = group.teamName || group.name || group.team?.name || 'Unknown Team';
          const members = group.members || group.participants || group.registrations || [];

          const normalizedMembers = members.map((member: any) => {
            const reg = member?.registration || member;
            const participant = member?.participant || reg?.participant || member?.user || reg?.user || member;
            return {
              ...participant,
              registration: reg,
              teamId,
              team_id: teamId,
            };
          });

          const firstMember = normalizedMembers[0];
          const organization = firstMember?.organization || firstMember?.registration?.organization || '';
          const orgCountryMatch = typeof organization === 'string'
            ? organization.match(/^(.*)\s+delegation$/i)
            : null;

          const eventId =
            group.eventId ||
            group.event_id ||
            group.event?.id ||
            group.event?._id ||
            members[0]?.event?.id ||
            members[0]?.event?._id ||
            members[0]?.registration?.event?.id ||
            members[0]?.registration?.event?._id ||
            null;

          const country =
            group.country ||
            group.team?.country ||
            firstMember?.country ||
            firstMember?.nationality ||
            firstMember?.registration?.country ||
            (orgCountryMatch ? orgCountryMatch[1] : null) ||
            null;

          results.push({
            id: teamId,
            name: teamName,
            eventId,
            country,
            memberCount: normalizedMembers.length,
            members: normalizedMembers,
          });
        }

        return results;
      };

      const registrationTeams = normalizeRegistrationGroups(
        Array.isArray(registrationGroups) ? registrationGroups : []
      );

      // Admin can see Submitted/Under Review/Approved/Rejected; exclude Draft
      const submittedDelegations = delegationData.filter((d: any) =>
        d.status && d.status.toLowerCase() !== 'draft'
      );

      const delegationsByEventId = submittedDelegations.reduce((acc: Map<string, number>, del: any) => {
        const eventId = del.eventId || del.event_id || del.event?.id || del.event?._id;
        if (!eventId) return acc;
        acc.set(eventId, (acc.get(eventId) || 0) + 1);
        return acc;
      }, new Map<string, number>());

      // API already groups delegations by (manager + country + event)
      // Just enrich with additional data here
      const enrichedDelegations = submittedDelegations.map((d: any) => {
        const eid = d.eventId || d.event_id || d.event?.id || d.event?._id;
        const event = eventData.find((e: any) => e.id === eid || e._id === eid);

        // Try to get teams from multiple sources
        const teamsFromData = d.teams || [];
        const teamIds = d.teamIds || d.team_ids || teamsFromData.map((t: any) => t.id || t._id) || [];

        // If we have teams array from API, use them directly
        let teams = teamsFromData.length > 0 ? teamsFromData : [];

        // Otherwise, look them up from teamData
        if (teams.length === 0 && teamIds.length > 0) {
          teams = teamIds
            .map((id: string) => teamData.find((t: any) => t.id === id || t._id === id))
            .filter(Boolean);
        }

        // Fallback: find teams by delegation ID
        if (teams.length === 0) {
          teams = teamData.filter((t: any) =>
            t.delegationId === (d.id || d._id) ||
            t.delegation_id === (d.id || d._id) ||
            t.delegation?.id === (d.id || d._id) ||
            t.delegation?._id === (d.id || d._id)
          );
        }

        // Fallback: match by event and country when IDs are not present
        if (teams.length === 0 && eid && d.country) {
          teams = teamData.filter((t: any) => {
            const tEventId = t.eventId || t.event_id || t.event?.id || t.event?._id;
            const tCountry = t.country || t.team?.country;
            return tEventId === eid && tCountry === d.country;
          });
        }

        // Fallback: use registrations grouped by team
        if (teams.length === 0 && eid) {
          const byEvent = registrationTeams.filter((t: any) => t.eventId === eid);
          if (d.country) {
            const countryKey = String(d.country).toLowerCase();
            const byCountry = byEvent.filter((t: any) =>
              t.country && String(t.country).toLowerCase() === countryKey
            );
            teams = byCountry.length > 0 ? byCountry : [];
          }

          if (teams.length === 0 && (delegationsByEventId.get(eid) || 0) === 1) {
            teams = byEvent;
          }
        }

        const membersFromRegistrations = teams.flatMap((t: any) => t.members || []);

        const hasSubmittedMembers = d.status && d.status.toLowerCase() !== 'draft';

        return {
          ...d,
          id: d.id || d._id,
          teamIds: teamIds.length > 0 ? teamIds : teams.map((t: any) => t.id || t._id),
          teamName: d.teamName || (teams.length > 0 ? teams[0].name : 'Unknown Team'),
          eventName: event?.name || d.event?.name || d.eventName || 'Unknown Event',
          eventId: eid,
          managerName: d.managerName || d.manager?.name || 'Unknown Team Manager',
          totalMembers: hasSubmittedMembers
            ? (d.totalMembers || d.total_members || d.members?.length || membersFromRegistrations.length || 0)
            : 0,
          teams: teams.length > 0 ? teams : [],
          members: hasSubmittedMembers ? (d.members && d.members.length > 0 ? d.members : membersFromRegistrations) : [],
        };
      });

      // Filter by eventId if present
      const finalDelegations = eventId
        ? enrichedDelegations.filter((d: any) => d.eventId === eventId)
        : enrichedDelegations;

      setDelegations(finalDelegations);
    } catch (error) {
      console.error('Failed to load delegations:', error);
      toast.error('Failed to load delegations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId]);

  // Stats
  const stats = {
    submitted: delegations.filter(d => d.status === 'Submitted' || d.status === 'Under Review').length,
    approved: delegations.filter(d => d.status === 'Approved').length,
    rejected: delegations.filter(d => d.status === 'Rejected').length,
    draft: delegations.filter(d => d.status === 'Draft').length,
  };

  const filteredData = delegations.filter(d => {
    if (statusFilter === 'Submitted') return d.status === 'Submitted' || d.status === 'Under Review';
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    return true;
  });

  const handleApprove = async (delegation: DelegationWithDetails) => {
    try {
      await updateDelegationStatus(delegation.delegationId || delegation.id, 'Approved', undefined, delegation);
      setDelegations(prev => prev.map(row => {
        const rowId = row.delegationId || row.id;
        const targetId = delegation.delegationId || delegation.id;
        return rowId === targetId ? { ...row, status: 'Approved' } : row;
      }));
      toast.success(`Delegation from ${delegation.country} approved!`);
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to approve';
      toast.error(msg);
    }
  };

  const handleReject = async () => {
    if (!selectedDelegation || !reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    try {
      await updateDelegationStatus(selectedDelegation.delegationId || selectedDelegation.id, 'Rejected', reason, selectedDelegation);
      setDelegations(prev => prev.map(row => {
        const rowId = row.delegationId || row.id;
        const targetId = selectedDelegation.delegationId || selectedDelegation.id;
        return rowId === targetId ? { ...row, status: 'Rejected' } : row;
      }));
      toast.success(`Delegation from ${selectedDelegation.country} rejected`);
      setRejectDialogOpen(false);
      setSelectedDelegation(null);
      setReason('');
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to reject';
      toast.error(msg);
    }
  };

  const openRejectDialog = (delegation: DelegationWithDetails) => {
    setSelectedDelegation(delegation);
    setReason('');
    setRejectDialogOpen(true);
  };

  const openViewMembersDialog = async (delegation: DelegationWithDetails) => {
    setSelectedDelegation(delegation);
    setViewMembersDialogOpen(true);

    // If delegation has no members but has teams/teamIds, fetch members from teams
    if ((!delegation.members || delegation.members.length === 0) && (delegation.teamIds || delegation.teams)?.length > 0) {
      setMembersLoading(true);
      try {
        const teamIds = delegation.teamIds?.length > 0
          ? delegation.teamIds
          : (delegation.teams || []).map((t: any) => t.id || t._id).filter(Boolean);

        const allMembers: any[] = [];
        for (const teamId of teamIds) {
          try {
            const members = await listTeamMembers(teamId);
            allMembers.push(...members.map((m: any) => ({ ...m, teamId, team_id: teamId })));
          } catch (e) {
            console.warn(`Failed to fetch members for team ${teamId}:`, e);
          }
        }

        setSelectedDelegation(prev => prev ? {
          ...prev,
          members: allMembers,
          totalMembers: allMembers.length,
        } : prev);
      } catch (error) {
        console.error('Failed to fetch delegation members:', error);
      } finally {
        setMembersLoading(false);
      }
    } else {
      setMembersLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Athlete': return 'bg-status-info-bg text-status-info';
      case 'Head Coach': return 'bg-accent/20 text-accent';
      case 'Assistant Coach': return 'bg-accent/10 text-accent';
      case 'Medical Doctor': return 'bg-status-error-bg text-status-error';
      case 'Physiotherapist': return 'bg-status-warning-bg text-status-warning';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const columns: Column<DelegationWithDetails>[] = [
    {
      key: 'country',
      header: 'Delegation',
      sortable: true,
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <Flag className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="font-semibold">{row.country}</p>
            <p className="text-xs text-muted-foreground">Manager: {row.manager?.firstName} {row.manager?.lastName}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'event',
      header: 'Event',
      accessor: (row) => (
        <span className="text-sm">{row.eventName}</span>
      ),
    },
    {
      key: 'teams',
      header: 'Teams',
      accessor: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.teams && row.teams.length > 0 ? (
            <>
              {row.teams.slice(0, 2).map(t => (
                <Badge key={t.id || t._id} variant="secondary" className="text-xs">
                  {t.name || t.sportCategory || 'Team'}
                </Badge>
              ))}
              {row.teams.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{row.teams.length - 2} more
                </Badge>
              )}
            </>
          ) : row.teamName && row.teamName !== 'Unknown Team' ? (
            <Badge variant="secondary" className="text-xs">
              {row.teamName}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground italic">No specific teams</span>
          )}
        </div>
      ),
    },
    {
      key: 'members',
      header: 'Members',
      accessor: (row) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto py-1 px-2 -ml-2"
          onClick={(e) => {
            e.stopPropagation();
            openViewMembersDialog(row);
          }}
        >
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{row.totalMembers}</span>
          </div>
        </Button>
      ),
    },
    {
      key: 'submittedAt',
      header: 'Submitted',
      sortable: true,
      accessor: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-48',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          {(row.status === 'Submitted' || row.status === 'Under Review') ? (
            <>
              <Button
                size="sm"
                className="bg-status-success hover:bg-status-success/90 text-white"
                onClick={() => handleApprove(row)}
              >
                Approve
              </Button>
              <Button
                size="sm"
                className="bg-status-error hover:bg-status-error/90 text-white"
                onClick={() => openRejectDialog(row)}
              >
                Reject
              </Button>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">{row.status}</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Team Delegations"
        subtitle="Review and approve team-based registrations from delegation managers"
        breadcrumbs={[{ label: 'Delegations' }]}
        actions={
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('Submitted')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold">{stats.submitted}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-status-warning-bg flex items-center justify-center">
                <Clock className="h-5 w-5 text-status-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('Approved')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-status-success-bg flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-status-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('Rejected')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-status-error-bg flex items-center justify-center">
                <XCircle className="h-5 w-5 text-status-error" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('Draft')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Draft</p>
                <p className="text-2xl font-bold">{stats.draft}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty State or Data Table */}
      {delegations.length === 0 ? (
        <Card className="p-12">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading delegations...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Flag className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Delegations Yet</h3>
              <p className="text-muted-foreground max-w-md">
                Team delegations will appear here when managers submit their teams for approval.
              </p>
            </div>
          )}
        </Card>
      ) : (
        <DataTable
          data={filteredData}
          columns={columns}
          keyExtractor={(row) => row.id}
          searchable
          searchPlaceholder="Search by country, event..."
          searchKey={(row) => `${row.country} ${row.eventName} ${row.managerName}`}
        />
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Delegation</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this delegation. This will be visible to the team manager.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Rejection Reason</Label>
              <Textarea
                id="reject-reason"
                placeholder="Enter the reason for rejection..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject Delegation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Members Dialog */}
      <Dialog open={viewMembersDialogOpen} onOpenChange={setViewMembersDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedDelegation?.country} Delegation - Members</DialogTitle>
            <DialogDescription>
              {selectedDelegation?.totalMembers} team members for {selectedDelegation?.eventName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {membersLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : selectedDelegation?.teams && selectedDelegation.teams.length > 0 ? (
              selectedDelegation.teams.map(team => (
                <Collapsible key={team.id || team._id} defaultOpen>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{team.name}</span>
                      <Badge variant="secondary">{team.sportCategory}</Badge>
                      <Badge variant="outline">{team.memberCount || team.members?.length} members</Badge>
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <div className="grid gap-2">
                      {selectedDelegation.members
                        .filter(m => (m.teamId === team.id || m.team_id === team.id || m.teamId === team._id || m.team_id === team._id))
                        .map(member => (
                          <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-accent/10 text-accent text-xs">
                                  {(member.firstName || '').charAt(0)}{(member.lastName || '').charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{member.firstName} {member.lastName}</p>
                                <p className="text-xs text-muted-foreground">{member.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getRoleBadgeColor(member.role)}>{member.role}</Badge>
                              <Badge variant="outline" className="text-xs">{member.nationality || member.country}</Badge>
                              <StatusBadge status={member.status} />
                            </div>
                          </div>
                        ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))
            ) : (
              <div className="grid gap-2">
                <p className="text-sm text-muted-foreground mb-2">Detailed team structure not found. Showing individual members:</p>
                {selectedDelegation?.members.map((member, idx) => (
                  <div key={member.id || idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-accent/10 text-accent text-xs">
                          {(member.firstName || '').charAt(0)}{(member.lastName || '').charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{member.firstName} {member.lastName}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getRoleBadgeColor(member.role)}>{member.role}</Badge>
                      <Badge variant="outline" className="text-xs">{member.nationality || member.country}</Badge>
                      <StatusBadge status={member.status || 'Draft'} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setViewMembersDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DelegationsPage;