import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DataTable, Column } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  ChevronRight,
  Home,
  Filter,
  FileText,
  Download,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getAllDelegations, updateDelegationStatus, requestDelegationUpdate } from '@/api/delegationApi';
import { getAllTeams, listTeamMembers, getPendingTeamMembers, approveTeamMember, rejectTeamMember, PendingTeamMember } from '@/api/teamApi';
import { getEvents } from '@/api/eventApi';
import { getRegistrationsByTeam } from '@/api/registrationApi';

// Shared look for the delegation table: fixed layout, airy rows, quiet header
const TABLE_SKIN = [
  '[&>div.rounded-lg]:rounded-2xl [&>div.rounded-lg]:border-border/70 [&>div.rounded-lg]:shadow-sm',
  '[&_table]:w-full [&_table]:table-fixed',
  '[&_thead_tr]:border-b [&_thead_tr]:border-border/70 [&_thead_tr]:bg-muted/40 [&_thead_tr:hover]:bg-muted/40',
  '[&_th]:h-12 [&_th]:px-3 [&_th]:text-[10px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[0.12em] [&_th]:text-muted-foreground/70',
  '[&_td]:px-3 [&_td]:py-3.5',
  '[&_tbody_tr]:border-b [&_tbody_tr]:border-border/40 [&_tbody_tr:last-child]:border-0',
  '[&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-primary/[0.035]',
].join(' ');

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
  const [requestUpdateDialogOpen, setRequestUpdateDialogOpen] = useState(false);
  const [viewMembersDialogOpen, setViewMembersDialogOpen] = useState(false);
  const [selectedDelegation, setSelectedDelegation] = useState<DelegationWithDetails | null>(null);
  const [reason, setReason] = useState('');
  const [updateMessage, setUpdateMessage] = useState('');
  const [isRequestingUpdate, setIsRequestingUpdate] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);

  // Pending (per-member) review state
  const [pendingMembers, setPendingMembers] = useState<PendingTeamMember[]>([]);
  const [pendingMembersLoading, setPendingMembersLoading] = useState(false);
  const [memberActionId, setMemberActionId] = useState<string | null>(null);
  const [memberRejectDialogOpen, setMemberRejectDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<PendingTeamMember | null>(null);
  const [memberRejectReason, setMemberRejectReason] = useState('');

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

  const loadPendingMembers = async () => {
    setPendingMembersLoading(true);
    try {
      const members = await getPendingTeamMembers();
      setPendingMembers(members);
    } catch (error) {
      console.error('Failed to load pending members:', error);
    } finally {
      setPendingMembersLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadPendingMembers();
  }, [eventId]);

  const handleApproveMember = async (member: PendingTeamMember) => {
    setMemberActionId(member.id);
    try {
      await approveTeamMember(member.id);
      setPendingMembers(prev => prev.filter(m => m.id !== member.id));
      toast.success(`${member.participant?.firstName || 'Member'} approved`);
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to approve member';
      toast.error(msg);
    } finally {
      setMemberActionId(null);
    }
  };

  const openMemberRejectDialog = (member: PendingTeamMember) => {
    setSelectedMember(member);
    setMemberRejectReason('');
    setMemberRejectDialogOpen(true);
  };

  const handleRejectMember = async () => {
    if (!selectedMember || !memberRejectReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    setMemberActionId(selectedMember.id);
    try {
      await rejectTeamMember(selectedMember.id, memberRejectReason.trim());
      setPendingMembers(prev => prev.filter(m => m.id !== selectedMember.id));
      toast.success(`${selectedMember.participant?.firstName || 'Member'} rejected`);
      setMemberRejectDialogOpen(false);
      setSelectedMember(null);
      setMemberRejectReason('');
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to reject member';
      toast.error(msg);
    } finally {
      setMemberActionId(null);
    }
  };

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

  const openRequestUpdateDialog = (delegation: DelegationWithDetails) => {
    setSelectedDelegation(delegation);
    setUpdateMessage('');
    setRequestUpdateDialogOpen(true);
  };

  const handleRequestUpdate = async () => {
    if (!selectedDelegation || !updateMessage.trim()) {
      toast.error('Please describe what needs to change');
      return;
    }
    setIsRequestingUpdate(true);
    try {
      await requestDelegationUpdate(selectedDelegation.delegationId || selectedDelegation.id, updateMessage.trim());
      setDelegations(prev => prev.map(row => {
        const rowId = row.delegationId || row.id;
        const targetId = selectedDelegation.delegationId || selectedDelegation.id;
        return rowId === targetId ? { ...row, status: 'Update Requested', reviewMessage: updateMessage.trim() } : row;
      }));
      toast.success(`Update requested for ${selectedDelegation.country}'s delegation`);
      setRequestUpdateDialogOpen(false);
      setSelectedDelegation(null);
      setUpdateMessage('');
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to request update';
      toast.error(msg);
    } finally {
      setIsRequestingUpdate(false);
    }
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
          } catch (e: any) {
            console.warn(`Failed to fetch members for team ${teamId}:`, e);
            const msg = e?.response?.data?.message || e?.message || 'Unknown error';
            toast.error(`Failed to load members for one of the teams: ${msg}`);
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
      className: 'min-w-0',
      accessor: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 text-accent ring-1 ring-inset ring-accent/15">
            <Flag className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-tight text-foreground">{row.country}</p>
            <p className="truncate text-xs leading-tight text-muted-foreground">
              {row.manager?.firstName || row.manager?.lastName
                ? `${row.manager?.firstName || ''} ${row.manager?.lastName || ''}`.trim()
                : row.managerName}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'event',
      header: 'Event',
      className: 'w-[150px] min-w-0',
      accessor: (row) => (
        <span className="block truncate text-[13px] text-foreground/80">{row.eventName}</span>
      ),
    },
    {
      key: 'teams',
      header: 'Teams',
      className: 'w-[170px] min-w-0',
      accessor: (row) => {
        const teamNames = row.teams && row.teams.length > 0
          ? row.teams.map((team: any) => team.name || team.sportCategory || 'Team')
          : row.teamName && row.teamName !== 'Unknown Team'
            ? [row.teamName]
            : [];

        if (teamNames.length === 0) {
          return <span className="text-xs italic text-muted-foreground">Not assigned</span>;
        }

        return (
          <div className="flex min-w-0 items-center gap-1">
            <span
              title={teamNames.join(', ')}
              className="min-w-0 truncate rounded-md border border-border/70 bg-muted/40 px-2 py-1 text-xs font-medium text-foreground/75"
            >
              {teamNames[0]}
            </span>
            {teamNames.length > 1 && (
              <span
                title={teamNames.slice(1).join(', ')}
                className="shrink-0 rounded-md bg-primary/10 px-1.5 py-1 text-xs font-semibold text-primary"
              >
                +{teamNames.length - 1}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'members',
      header: 'Members',
      className: 'w-[100px]',
      accessor: (row) => (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-card px-2 py-1 text-xs font-semibold text-foreground/80 transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
          onClick={(event) => {
            event.stopPropagation();
            openViewMembersDialog(row);
          }}
          title="View members"
        >
          <Users className="h-3.5 w-3.5" />
          {row.totalMembers}
        </button>
      ),
    },
    {
      key: 'submittedAt',
      header: 'Submitted',
      sortable: true,
      className: 'w-[115px] min-w-0',
      accessor: (row) => (
        <span className="block truncate text-[13px] text-muted-foreground">
          {row.submittedAt
            ? new Date(row.submittedAt).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-[130px]',
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-[220px]',
      accessor: (row) => {
        const canDecide = row.status === 'Submitted' || row.status === 'Under Review';

        if (!canDecide) {
          return <span className="text-xs text-muted-foreground">No action needed</span>;
        }

        return (
          <div
            className="flex h-8 w-full items-center overflow-hidden rounded-md border border-border/80 bg-background"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => handleApprove(row)}
              className="inline-flex h-full flex-1 items-center justify-center gap-1 whitespace-nowrap bg-status-success px-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              <CheckCircle2 className="h-3 w-3" />
              Approve
            </button>
            <button
              type="button"
              onClick={() => openRequestUpdateDialog(row)}
              className="inline-flex h-full flex-1 items-center justify-center whitespace-nowrap border-l border-border/80 px-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Changes
            </button>
            <button
              type="button"
              onClick={() => openRejectDialog(row)}
              className="inline-flex h-full flex-1 items-center justify-center whitespace-nowrap border-l border-border/80 px-1.5 text-[11px] font-medium text-status-error transition-colors hover:bg-status-error-bg"
            >
              Reject
            </button>
          </div>
        );
      },
    },
  ];

  const statCards = [
    {
      key: 'Submitted',
      label: 'Pending review',
      value: stats.submitted,
      hint: 'Waiting for your decision',
      icon: Clock,
      bar: 'bg-status-warning',
      iconWrap: 'bg-status-warning-bg text-status-warning',
      valueTone: 'text-status-warning',
    },
    {
      key: 'Approved',
      label: 'Approved',
      value: stats.approved,
      hint: 'Cleared to attend the event',
      icon: CheckCircle2,
      bar: 'bg-status-success',
      iconWrap: 'bg-status-success-bg text-status-success',
      valueTone: 'text-status-success',
    },
    {
      key: 'Rejected',
      label: 'Rejected',
      value: stats.rejected,
      hint: 'Turned down by a reviewer',
      icon: XCircle,
      bar: 'bg-status-error',
      iconWrap: 'bg-status-error-bg text-status-error',
      valueTone: 'text-status-error',
    },
    {
      key: 'Draft',
      label: 'Draft',
      value: stats.draft,
      hint: 'Not yet submitted by the manager',
      icon: FileText,
      bar: 'bg-muted-foreground/40',
      iconWrap: 'bg-muted text-muted-foreground',
      valueTone: 'text-foreground',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero header */}
      <header className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.06] via-card to-card px-6 py-6 shadow-sm sm:px-8 sm:py-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/[0.07] blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-40 w-40 rounded-full bg-accent/10 blur-3xl" aria-hidden />

        <div className="relative space-y-4">
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link to="/" className="transition-colors hover:text-foreground">
              <Home className="h-4 w-4" />
            </Link>
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            <span className="font-medium text-foreground">Delegations</span>
          </nav>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                Event operations
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Team Delegations
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Review and approve team-based registrations from delegation managers.
              </p>
            </div>

            <Button variant="outline" size="sm" className="h-9 shrink-0 gap-2 bg-card shadow-sm">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </header>

      {/* Status tiles — double as filters */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const isActive = statusFilter === card.key;
          const Icon = card.icon;

          return (
            <button
              key={card.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => setStatusFilter(isActive ? 'all' : card.key)}
              className={cn(
                'group relative overflow-hidden rounded-2xl border bg-card p-4 text-start shadow-sm transition-all duration-200',
                'hover:-translate-y-0.5 hover:shadow-md',
                isActive ? 'border-primary/40 ring-2 ring-primary/20' : 'border-border/70',
              )}
            >
              <span className={cn('absolute inset-x-0 top-0 h-[3px]', card.bar)} aria-hidden />

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {card.label}
                  </p>
                  <p
                    className={cn(
                      'mt-1 text-3xl font-semibold tabular-nums tracking-tight',
                      card.value > 0 ? card.valueTone : 'text-foreground/30',
                    )}
                  >
                    {card.value}
                  </p>
                </div>
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', card.iconWrap)}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {isActive ? 'Showing only these — click to clear' : card.hint}
              </p>
            </button>
          );
        })}
      </div>

      {/* Delegations list */}
      {isLoading && delegations.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 py-24">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading delegations…</p>
        </div>
      ) : delegations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-20 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Flag className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No delegations yet</h3>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
            Team delegations will appear here when managers submit their teams for approval.
          </p>
        </div>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3.5 shadow-sm sm:px-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-inset ring-primary/10">
                <Flag className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  Delegations
                  <span className="ml-1.5 text-sm font-normal tabular-nums text-muted-foreground">
                    ({filteredData.length})
                  </span>
                </h2>
                <p className="truncate text-xs text-muted-foreground">
                  Each row is one country's delegation for an event
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-[168px] text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="Submitted">Pending review</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                    <SelectItem value="Update Requested">Update requested</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {statusFilter !== 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-muted-foreground hover:text-foreground"
                  onClick={() => setStatusFilter('all')}
                >
                  Clear filter
                </Button>
              )}
            </div>
          </div>

          {filteredData.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
              <p className="text-sm text-muted-foreground">No delegations match the current filter.</p>
            </div>
          ) : (
            <DataTable
              data={filteredData}
              columns={columns}
              keyExtractor={(row) => row.id}
              searchable
              searchPlaceholder="Search by country, event..."
              searchKey={(row) => `${row.country} ${row.eventName} ${row.managerName}`}
              className={TABLE_SKIN}
            />
          )}
        </section>
      )}

      {/* Pending Members (per-member review) */}
      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/20 px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-status-warning/20 to-status-warning/5 text-status-warning ring-1 ring-inset ring-status-warning/15">
              <Users className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Pending members
                {pendingMembers.length > 0 && (
                  <span className="ml-1.5 text-sm font-normal tabular-nums text-muted-foreground">
                    ({pendingMembers.length})
                  </span>
                )}
              </h2>
              <p className="truncate text-xs text-muted-foreground">
                Individual members sent for review, awaiting approval
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {pendingMembersLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Loading members…
            </div>
          ) : pendingMembers.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <CheckCircle2 className="h-6 w-6 text-status-success/60" />
              <p className="text-sm text-muted-foreground">Nothing waiting — all members are reviewed.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingMembers.map((member) => {
                const isActing = memberActionId === member.id;

                return (
                  <div
                    key={member.id}
                    className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-3 transition-colors hover:border-primary/25 hover:bg-primary/[0.02] sm:flex-row sm:items-center sm:justify-between sm:p-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border">
                        <AvatarFallback className="bg-gradient-to-br from-accent/20 to-accent/5 text-[11px] font-bold text-accent">
                          {(member.participant?.firstName || '').charAt(0)}
                          {(member.participant?.lastName || '').charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {member.participant?.firstName} {member.participant?.lastName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {member.delegation?.country || 'Unknown'} · {member.team?.name || 'Unknown Team'}
                          {member.eventName ? ` · ${member.eventName}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {member.role && (
                        <span className="hidden whitespace-nowrap rounded-md border border-border/70 bg-muted/40 px-2 py-1 text-xs font-medium text-foreground/70 sm:inline-block">
                          {member.role}
                        </span>
                      )}
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 bg-status-success text-xs text-white shadow-sm hover:bg-status-success/90"
                        onClick={() => handleApproveMember(member)}
                        disabled={isActing}
                      >
                        {isActing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 border-status-error/30 text-xs text-status-error hover:bg-status-error-bg hover:text-status-error"
                        onClick={() => openMemberRejectDialog(member)}
                        disabled={isActing}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Reject Member Dialog */}
      <Dialog open={memberRejectDialogOpen} onOpenChange={setMemberRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Member</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {selectedMember?.participant?.firstName || 'this member'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="member-reject-reason">Rejection Reason</Label>
            <Textarea
              id="member-reject-reason"
              placeholder="Enter the reason for rejection..."
              value={memberRejectReason}
              onChange={(e) => setMemberRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectMember} disabled={memberActionId === selectedMember?.id}>
              Reject Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            {selectedDelegation?.expectedTeams && selectedDelegation.expectedTeams.length > 0 && (
              <div className="space-y-2">
                <Label>Declared Team Plan</Label>
                <div className="space-y-2">
                  {selectedDelegation.expectedTeams.map((slot, index) => (
                    <div key={index}>
                      <p className="text-xs font-medium text-muted-foreground">{slot.name || `Team ${index + 1}`}</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {Object.entries(slot.memberCounts || {}).map(([category, count]) => (
                          <Badge key={category} variant="outline">{category}: {count as number}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

      {/* Request Changes Dialog */}
      <Dialog open={requestUpdateDialogOpen} onOpenChange={setRequestUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Changes</DialogTitle>
            <DialogDescription>
              Send this delegation back to the manager with a message describing what needs to change. They'll be able to edit and resubmit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedDelegation?.expectedTeams && selectedDelegation.expectedTeams.length > 0 && (
              <div className="space-y-2">
                <Label>Declared Team Plan</Label>
                <div className="space-y-2">
                  {selectedDelegation.expectedTeams.map((slot, index) => (
                    <div key={index}>
                      <p className="text-xs font-medium text-muted-foreground">{slot.name || `Team ${index + 1}`}</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {Object.entries(slot.memberCounts || {}).map(([category, count]) => (
                          <Badge key={category} variant="outline">{category}: {count as number}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="update-message">Message to Manager</Label>
              <Textarea
                id="update-message"
                placeholder="Describe what needs to change..."
                value={updateMessage}
                onChange={(e) => setUpdateMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestUpdateDialogOpen(false)} disabled={isRequestingUpdate}>
              Cancel
            </Button>
            <Button onClick={handleRequestUpdate} disabled={isRequestingUpdate}>
              {isRequestingUpdate ? 'Sending...' : 'Send Request'}
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
              selectedDelegation.teams.map((team: any) => {
                const sportLabel =
                  typeof team.sportCategory === 'string'
                    ? team.sportCategory
                    : team.sportCategory?.subCategory || team.sportCategory?.name || team.sportName || '';
                const teamMembers = (selectedDelegation.members || []).filter((m: any) =>
                  (m.teamId === team.id || m.team_id === team.id || m.teamId === team._id || m.team_id === team._id ||
                    m.team?.id === team.id || m.team?.id === team._id),
                );
                return (
                  <Collapsible key={team.id || team._id} defaultOpen>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{team.name}</span>
                        {sportLabel && <Badge variant="secondary">{sportLabel}</Badge>}
                        <Badge variant="outline">{teamMembers.length} members</Badge>
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3">
                      <div className="grid gap-2">
                        {teamMembers.map((member: any) => {
                          const p = member.participant || member;
                          return (
                            <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarFallback className="bg-accent/10 text-accent text-xs">
                                    {(p.firstName || '').charAt(0)}{(p.lastName || '').charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">{p.firstName} {p.lastName}</p>
                                  <p className="text-xs text-muted-foreground">{p.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={getRoleBadgeColor(member.role)}>{member.role || 'No category'}</Badge>
                                <Badge variant="outline" className="text-xs">{p.nationality || 'Unknown'}</Badge>
                                <StatusBadge status={member.status || 'Draft'} />
                              </div>
                            </div>
                          );
                        })}
                        {teamMembers.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-3">No members in this team yet.</p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })
            ) : (
              <div className="grid gap-2">
                <p className="text-sm text-muted-foreground mb-2">Detailed team structure not found. Showing individual members:</p>
                {(selectedDelegation?.members || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No members found for this delegation.</p>
                ) : (
                  (selectedDelegation?.members || []).map((member: any, idx: number) => {
                    const p = member.participant || member;
                    return (
                      <div key={member.id || idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-accent/10 text-accent text-xs">
                              {(p.firstName || '').charAt(0)}{(p.lastName || '').charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{p.firstName} {p.lastName}</p>
                            <p className="text-xs text-muted-foreground">{p.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getRoleBadgeColor(member.role)}>{member.role || 'No category'}</Badge>
                          <Badge variant="outline" className="text-xs">{p.nationality || 'Unknown'}</Badge>
                          <StatusBadge status={member.status || 'Draft'} />
                        </div>
                      </div>
                    );
                  })
                )}
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