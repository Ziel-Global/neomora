import React, { useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { DataTable, Column } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EMSRegistration, EMSParticipant, travelStore } from '@/lib/emsStore';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Download,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  AlertTriangle,
  Users,
  Upload,
  ChevronDown,
  ChevronRight,
  Home,
  Image as ImageIcon,
  User,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  getRegistrations,
  approveRegistration,
  rejectRegistration,
  startRegistrationReview,
  requestRegistrationUpdate,
} from '@/api/registrationApi';
import { Loader2 } from 'lucide-react';

// Document storage keys (visa portal and registration)
const VISA_DOCS_KEY = 'ems_visa_documents';
const REG_DOCS_KEY = 'ems_registration_documents';

// Helper to retrieve actual file data from dedicated storage
const getDocumentFileData = (fileDataOrRef: string | undefined): string | null => {
  if (!fileDataOrRef) return null;

  // If it's already base64 data, return as-is (legacy support)
  if (fileDataOrRef.startsWith('data:')) {
    return fileDataOrRef;
  }

  // Try registration documents storage first
  try {
    const regStored = localStorage.getItem(REG_DOCS_KEY);
    if (regStored) {
      const docStorage = JSON.parse(regStored);
      if (docStorage[fileDataOrRef]) {
        return docStorage[fileDataOrRef];
      }
    }
  } catch (e) {
    console.error('Failed to retrieve from reg docs:', e);
  }

  // Fallback to visa documents storage
  try {
    const visaStored = localStorage.getItem(VISA_DOCS_KEY);
    if (visaStored) {
      const docStorage = JSON.parse(visaStored);
      if (docStorage[fileDataOrRef]) {
        return docStorage[fileDataOrRef];
      }
    }
  } catch (e) {
    console.error('Failed to retrieve from visa docs:', e);
  }

  return null;
};

// Plain-language explanation of what each status means for the reviewer
const STATUS_HINTS: Record<string, string> = {
  Submitted: 'Waiting for your decision',
  'Under Review': 'You started reviewing this',
  Approved: 'Cleared to attend',
  Rejected: 'Not approved',
  'Update Requested': 'Waiting on the participant',
  Draft: 'Not submitted yet',
};

const getStatusHint = (status: string): string => STATUS_HINTS[status] || '';

// passport_copy -> "Passport copy"
const humanizeDocumentType = (type: string): string => {
  const words = (type || 'Document')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const isImageDocument = (fileName?: string): boolean =>
  /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileName || '');

// Shared look for the registration tables: fixed layout, airy rows, quiet header
const TABLE_SKIN = [
  // Soften the container DataTable draws around the table itself
  '[&>div.rounded-lg]:rounded-2xl [&>div.rounded-lg]:border-border/70 [&>div.rounded-lg]:shadow-sm',
  '[&_table]:w-full [&_table]:table-fixed',
  '[&_thead_tr]:border-b [&_thead_tr]:border-border/70 [&_thead_tr]:bg-muted/40 [&_thead_tr:hover]:bg-muted/40',
  '[&_th]:h-12 [&_th]:px-3 [&_th]:text-[10px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[0.12em] [&_th]:text-muted-foreground/70',
  '[&_td]:px-3 [&_td]:py-3.5',
  '[&_tbody_tr]:border-b [&_tbody_tr]:border-border/40 [&_tbody_tr:last-child]:border-0',
  '[&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-primary/[0.035]',
].join(' ');

interface RegistrationWithParticipant extends EMSRegistration {
  participant: EMSParticipant;
  documentCount: number;
  pendingDocs: number;
  teamName?: string;
  teamId?: string;
}

interface TeamRegistrationsGroup {
  id?: string;
  _id?: string;
  teamId?: string;
  teamName?: string;
  name?: string;
  team?: any;
  members?: any[];
  participants?: any[];
  registrations?: any[];
  [key: string]: any;
}

const RegistrationsPage: React.FC = () => {
  const { eventId } = useParams();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [registrations, setRegistrations] = useState<RegistrationWithParticipant[]>([]);
  const [viewMode, setViewMode] = useState<'individual' | 'team'>('individual');

  // Dialog states
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [requestUpdateDialogOpen, setRequestUpdateDialogOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<RegistrationWithParticipant | null>(null);
  const [reason, setReason] = useState('');
  const [viewDocsDialogOpen, setViewDocsDialogOpen] = useState(false);
  const [viewProfileDialogOpen, setViewProfileDialogOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  const normalizeName = (fullName: string | undefined) => {
    if (!fullName) return { firstName: 'Unknown', lastName: '' };
    const parts = fullName.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return { firstName: 'Unknown', lastName: '' };
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  };

  const buildRegistrationRows = (groups: TeamRegistrationsGroup[]): RegistrationWithParticipant[] => {
    const rows: RegistrationWithParticipant[] = [];

    for (const group of groups) {
      const teamId = group.teamId || group.id || group._id || group.team?.id || group.team?._id;
      const teamName = group.teamName || group.name || group.team?.name || 'Unknown Team';
      const members = group.members || group.participants || group.registrations || [];

      const groupEventId =
        group.eventId ||
        group.event_id ||
        group.event?.id ||
        group.event?._id ||
        members[0]?.event?.id ||
        members[0]?.event?._id ||
        members[0]?.registration?.event?.id ||
        members[0]?.registration?.event?._id ||
        null;

      for (const member of members) {
        const reg = member?.registration || member;
        const participantSource = member?.participant || reg?.participant || member?.user || reg?.user || member;
        const nameFallback = normalizeName(participantSource?.name || reg?.name);

        const participant: EMSParticipant = {
          id: participantSource?.id || participantSource?._id || reg?.participantId || reg?.participant_id || '',
          firstName: participantSource?.firstName || nameFallback.firstName,
          lastName: participantSource?.lastName || nameFallback.lastName,
          email: participantSource?.email || reg?.email || '-',
          phone: participantSource?.phone || reg?.phone || '-',
          nationality: participantSource?.nationality || participantSource?.country || reg?.country || 'Unknown',
          passportNumber: participantSource?.passportNumber || '-',
          organization: participantSource?.organization || '-',
          jobTitle: participantSource?.jobTitle,
          role: participantSource?.teamRole || participantSource?.role || reg?.role || 'Athlete',
          dietaryNotes: participantSource?.dietaryNotes || '',
          accessibilityNeeds: participantSource?.accessibilityNeeds || '',
          registrationDate: participantSource?.createdAt || reg?.createdAt || new Date().toISOString(),
          avatar: participantSource?.avatar,
        };

        const documents = reg?.documents || [];
        const pendingDocs = documents.filter((d: any) => d.status === 'Pending').length || 0;

        rows.push({
          ...(reg || {}),
          id: reg?.id || reg?._id || reg?.registrationId || reg?.registration_id || member?.id || member?._id,
          registrationId: reg?.registrationId || reg?.registration_id || reg?.id || reg?._id || member?.id || member?._id,
          participantId: participant.id,
          status: reg?.status || reg?.registrationStatus || reg?.registration_status || 'Submitted',
          submittedAt: reg?.submittedAt || reg?.createdAt || reg?.created_at || null,
          documents,
          formData: reg?.formData || reg?.form_data || {},
          participant,
          documentCount: documents.length || 0,
          pendingDocs,
          teamId,
          teamName,
          eventId: reg?.eventId || reg?.event_id || reg?.event?.id || reg?.event?._id || groupEventId,
        });
      }
    }

    return rows;
  };

  // Load data from backend API
  const loadData = async () => {
    setIsLoading(true);
    try {
      // The admin registrations endpoint already includes participant, team,
      // event, and document data. Loading the grouped endpoint as well was a
      // second full download and did not add information for this table.
      const allRegs = await getRegistrations().catch(() => []);

      const individualRows: any[] = [];
      if (Array.isArray(allRegs)) {
        for (const reg of allRegs) {
          const participantSource = reg.participant || reg.user || reg;
          const nameFallback = normalizeName(participantSource?.name || reg?.name);
          const participant: EMSParticipant = {
            id: participantSource?.id || participantSource?._id || reg?.participantId || reg?.participant_id || '',
            firstName: participantSource?.firstName || nameFallback.firstName,
            lastName: participantSource?.lastName || nameFallback.lastName,
            email: participantSource?.email || reg?.email || '-',
            phone: participantSource?.phone || reg?.phone || '-',
            nationality: participantSource?.nationality || participantSource?.country || reg?.country || 'Unknown',
            passportNumber: participantSource?.passportNumber || '-',
            organization: participantSource?.organization || '-',
            jobTitle: participantSource?.jobTitle,
            role: participantSource?.teamRole || participantSource?.role || reg?.role || 'Athlete',
            dietaryNotes: participantSource?.dietaryNotes || '',
            accessibilityNeeds: participantSource?.accessibilityNeeds || '',
            registrationDate: participantSource?.createdAt || reg?.createdAt || new Date().toISOString(),
            avatar: participantSource?.avatar,
          };
          const documents = reg?.documents || [];
          const pendingDocs = documents.filter((d: any) => d.status === 'Pending').length || 0;

          individualRows.push({
            ...(reg || {}),
            id: reg?.id || reg?._id || reg?.registrationId || reg?.registration_id,
            registrationId: reg?.registrationId || reg?.registration_id || reg?.id || reg?._id,
            participantId: participant.id,
            status: reg?.status || reg?.registrationStatus || reg?.registration_status || 'Submitted',
            submittedAt: reg?.submittedAt || reg?.createdAt || reg?.created_at || null,
            documents,
            formData: reg?.formData || reg?.form_data || {},
            participant,
            documentCount: documents.length || 0,
            pendingDocs,
            teamId: reg?.teamId || reg?.team?.id || reg?.team?._id || null, // Keep actual team if present, else null
            teamName: reg?.teamName || reg?.team?.name || null, // No fallback to "Unknown Team"
            eventId: reg?.eventId || reg?.event_id || reg?.event?.id || reg?.event?._id,
          });
        }
      }

      let rows = individualRows;

      // Deduplicate by ID
      const uniqueRows = new Map();
      for (const row of rows) {
        if (row.id && !uniqueRows.has(row.id)) {
          uniqueRows.set(row.id, row);
        }
      }
      rows = Array.from(uniqueRows.values());

      if (eventId) {
        rows = rows.filter((r: any) => String(r.eventId) === String(eventId));
      }
      const statusPriority: Record<string, number> = {
        Submitted: 0,
        'Under Review': 1,
        'Update Requested': 2,
        Approved: 3,
        Rejected: 4,
        Draft: 5,
      };
      rows.sort((a: any, b: any) => {
        const priorityDifference = (statusPriority[a.status] ?? 99) - (statusPriority[b.status] ?? 99);
        if (priorityDifference !== 0) return priorityDifference;
        return new Date(b.submittedAt || b.createdAt || 0).getTime() - new Date(a.submittedAt || a.createdAt || 0).getTime();
      });
      setRegistrations(rows);
    } catch (err) {
      console.error('Failed to load registrations:', err);
      toast.error(t('registrations.no_registrations'));
      setRegistrations([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId]);

  // Apply filters
  const filteredData = registrations.filter(reg => {
    if (statusFilter === 'needs-review') {
      return reg.status === 'Submitted' || reg.status === 'Under Review';
    }
    if (statusFilter !== 'all' && reg.status !== statusFilter) return false;
    return true;
  });

  const { groupedTeams, individualRegistrations } = useMemo(() => {
    const map = new Map<string, { teamId: string; teamName: string; members: RegistrationWithParticipant[] }>();
    const individuals: RegistrationWithParticipant[] = [];

    const normalizeKey = (v: any) => {
      if (!v && v !== 0) return null;
      const s = String(v).trim();
      return s === '' ? null : s.toLowerCase();
    };

    for (const reg of filteredData) {
      const rawTeamId = reg.teamId || reg.team?.id || reg.team?._id || reg.team?._key || null;
      const rawTeamName = reg.teamName || reg.team?.name || reg.team?.teamName || null;

      const keyId = normalizeKey(rawTeamId) || normalizeKey(rawTeamName) || null;
      const teamName = rawTeamName || (rawTeamId ? String(rawTeamId) : null);

      if (!keyId) {
        individuals.push(reg);
        continue;
      }

      const existing = map.get(keyId);
      if (!existing) {
        map.set(keyId, { teamId: keyId, teamName: teamName || 'Unknown Team', members: [reg] });
      } else {
        existing.members.push(reg);
      }
    }

    return {
      groupedTeams: Array.from(map.values()).sort((a, b) => (a.teamName || '').localeCompare(b.teamName || '')),
      individualRegistrations: individuals,
    };
  }, [filteredData]);

  // Whether a registration belongs to a team (same resolution logic used to split
  // groupedTeams/individualRegistrations below, applied to the full unfiltered list).
  const isTeamRegistration = (reg: any) => {
    const normalizeKey = (v: any) => {
      if (!v && v !== 0) return null;
      const s = String(v).trim();
      return s === '' ? null : s.toLowerCase();
    };
    const rawTeamId = reg.teamId || reg.team?.id || reg.team?._id || reg.team?._key || null;
    const rawTeamName = reg.teamName || reg.team?.name || reg.team?.teamName || null;
    return Boolean(normalizeKey(rawTeamId) || normalizeKey(rawTeamName));
  };

  // Stats — scoped to whichever mode (Individuals/Teams) is currently selected
  const modeRegistrations = registrations.filter(r => isTeamRegistration(r) === (viewMode === 'team'));
  const stats = {
    submitted: modeRegistrations.filter(r => r.status === 'Submitted').length,
    underReview: modeRegistrations.filter(r => r.status === 'Under Review').length,
    approved: modeRegistrations.filter(r => r.status === 'Approved').length,
    rejected: modeRegistrations.filter(r => r.status === 'Rejected').length,
  };
  const reviewQueueCount = stats.submitted + stats.underReview;
  const needsReview = (status: string) => status === 'Submitted' || status === 'Under Review';

  // Action handlers
  // const handleApprove = async (reg: RegistrationWithParticipant) => {
  //   try {
  //     await approveRegistration(reg.id);
  //   } catch (e) {
  //     toast.error(t('common.failed'));
  //     return;
  //   }
  //   if (reg.formData?.needsTransport) {
  //     const travel = travelStore.generateForApprovedRegistration(reg.id);
  //     if (travel) {
  //       toast.success(t('common.activity.travel_ticketed') + `: ${reg.participant.firstName}`);
  //     }
  //   }
  //   loadData();
  //   toast.success(t('common.activity.reg_approved') + `: ${reg.registrationId}`);
  // };


  const updateSelectedRegistrationStatus = (
    reg: RegistrationWithParticipant,
    status: RegistrationWithParticipant['status'],
  ) => {
    setSelectedRegistration((prev) => {
      if (!prev) return prev;
      const sameRecord =
        prev.id === reg.id ||
        prev.registrationId === reg.registrationId;
      return sameRecord ? { ...prev, status } : prev;
    });
  };

  const handleApprove = async (reg: RegistrationWithParticipant) => {
    setIsStatusUpdating(true);
    try {
      await approveRegistration(reg.registrationId);
      updateSelectedRegistrationStatus(reg, 'Approved');
      toast.success(t('common.activity.reg_approved', { defaultValue: 'Registration approved' }));
      await loadData();
    } catch (e) {
      toast.error(t('common.failed'));
    } finally {
      setIsStatusUpdating(false);
    }
  };




  // const handleStartReview = async (reg: RegistrationWithParticipant) => {
  //   try {
  //     await startRegistrationReview(reg.id);
  //   } catch (e) {
  //     toast.error(t('common.failed'));
  //     return;
  //   }
  //   loadData();
  //   toast.info(t('registrations.start_review') + `: ${reg.registrationId}`);
  // };


  const handleStartReview = async (reg: RegistrationWithParticipant) => {
    setIsStatusUpdating(true);
    try {
      await startRegistrationReview(reg.registrationId);
      updateSelectedRegistrationStatus(reg, 'Under Review');
      toast.success(t('registrations.start_review'));
      await loadData();
    } catch (e) {
      toast.error(t('common.failed'));
    } finally {
      setIsStatusUpdating(false);
    }
  };







  const handleReject = async () => {
    if (!selectedRegistration || !reason.trim()) {
      toast.error(t('registrations.rejection_reason'));
      return;
    }
    try {
      await rejectRegistration(
        selectedRegistration.registrationId,
        reason
      );
    } catch (e) {
      toast.error(t('common.failed'));
      return;
    }
    updateSelectedRegistrationStatus(selectedRegistration, 'Rejected');
    await loadData();
    toast.success(t('common.rejected') + `: ${selectedRegistration.registrationId}`);
    setRejectDialogOpen(false);
    setReason('');
  };

  const handleRequestUpdate = async () => {
    if (!selectedRegistration || !reason.trim()) {
      toast.error(t('registrations.required_updates'));
      return;
    }
    try {
      await requestRegistrationUpdate(selectedRegistration.registrationId, reason);
    } catch (e) {
      toast.error(t('common.failed'));
      return;
    }
    updateSelectedRegistrationStatus(selectedRegistration, 'Update Requested');
    await loadData();
    toast.success(t('common.update_requested') + `: ${selectedRegistration.registrationId}`);
    setRequestUpdateDialogOpen(false);
    setReason('');
  };

  const openRejectDialog = (reg: RegistrationWithParticipant) => {
    setSelectedRegistration(reg);
    setReason('');
    setRejectDialogOpen(true);
  };

  const openRequestUpdateDialog = (reg: RegistrationWithParticipant) => {
    setSelectedRegistration(reg);
    setReason('');
    setRequestUpdateDialogOpen(true);
  };

  const openViewProfileDialog = (reg: RegistrationWithParticipant) => {
    setSelectedRegistration(reg);
    setViewProfileDialogOpen(true);
  };

  const openViewDocsDialog = (reg: RegistrationWithParticipant) => {
    setSelectedRegistration(reg);
    setViewDocsDialogOpen(true);
  };

  const columns: Column<RegistrationWithParticipant>[] = [
    {
      key: 'participant',
      header: t('common.participant'),
      sortable: true,
      className: 'min-w-0',
      accessor: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border">
            <AvatarFallback className="bg-gradient-to-br from-primary/15 to-primary/5 text-[11px] font-bold text-primary">
              {row.participant.firstName.charAt(0)}{row.participant.lastName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 text-start">
            <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
              {row.participant.firstName} {row.participant.lastName}
            </p>
            <p className="truncate text-xs leading-tight text-muted-foreground">{row.participant.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'team',
      header: t('common.team') || 'Team',
      className: 'w-[130px] min-w-0',
      accessor: (row) => (
        <span className="block truncate text-[13px] text-foreground/80">{row.teamName || 'Unknown Team'}</span>
      ),
    },
    {
      key: 'nationality',
      header: t('registrations.nationality'),
      sortable: true,
      className: 'w-[120px] min-w-0',
      accessor: (row) => (
        <span className="block truncate text-[13px] text-foreground/80">{row.participant.nationality}</span>
      ),
    },
    {
      key: 'role',
      header: t('participants.role'),
      className: 'w-[105px]',
      accessor: (row) => (
        <span className="inline-block max-w-full truncate rounded-full border border-border/70 bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-foreground/75">
          {t(`common.${row.participant.role.toLowerCase()}`, { defaultValue: row.participant.role })}
        </span>
      ),
    },
    {
      key: 'documents',
      header: t('registrations.documents'),
      className: 'w-[95px]',
      accessor: (row) => (
        <button
          type="button"
          title={row.pendingDocs > 0 ? `${row.pendingDocs} pending review` : `${row.documentCount} documents`}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[13px] font-medium tabular-nums transition-colors',
            row.pendingDocs > 0
              ? 'text-status-warning hover:bg-status-warning-bg'
              : row.documentCount > 0
                ? 'text-foreground/80 hover:bg-muted'
                : 'text-muted-foreground/60 hover:bg-muted hover:text-foreground',
          )}
          onClick={(e) => {
            e.stopPropagation();
            openViewDocsDialog(row);
          }}
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          {row.documentCount}
          {row.pendingDocs > 0 && (
            <span className="h-1.5 w-1.5 rounded-full bg-status-warning" />
          )}
        </button>
      ),
    },
    {
      key: 'submittedAt',
      header: t('common.submitted'),
      sortable: true,
      className: 'w-[105px]',
      accessor: (row) => (
        <span className="whitespace-nowrap text-[13px] tabular-nums text-foreground/80">
          {row.submittedAt
            ? new Date(row.submittedAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
              month: 'short',
              day: 'numeric',
            })
            : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      className: 'w-[135px]',
      accessor: (row) => (
        <StatusBadge status={row.status} size="sm" className="whitespace-nowrap" />
      ),
    },
    {
      key: 'action',
      header: t('common.action', { defaultValue: 'Action' }),
      className: 'w-[112px] text-end',
      accessor: (row) => (
        <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
          <Button
            size="sm"
            variant={needsReview(row.status) ? 'default' : 'outline'}
            className={cn(
              'h-8 w-full gap-1.5 px-2 text-xs font-semibold transition-all',
              needsReview(row.status)
                ? 'shadow-sm hover:shadow-md'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => openViewProfileDialog(row)}
          >
            {needsReview(row.status) ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Review
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                Details
              </>
            )}
          </Button>
        </div>
      ),
    },
  ];

  const handleRowClick = (row: RegistrationWithParticipant) => {
    openViewProfileDialog(row);
  };

  const renderRegistrationStatusActions = (reg: RegistrationWithParticipant) => {
    const canDecide = reg.status === 'Submitted' || reg.status === 'Under Review';

    if (!canDecide) {
      return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border/70 bg-muted/40 px-3.5 py-2.5 sm:px-4 sm:py-3">
          <StatusBadge status={reg.status} />
          <p className="text-xs text-muted-foreground sm:text-sm">
            {t('registrations.status_finalized', {
              defaultValue: 'This registration is finalised — no further action is needed.',
            })}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          What would you like to do?
        </p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button
            size="sm"
            disabled={isStatusUpdating}
            className="h-9 justify-center gap-1.5 bg-status-success text-xs hover:bg-status-success/90"
            onClick={() => handleApprove(reg)}
          >
            {isStatusUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {t('common.approve', { defaultValue: 'Approve' })}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isStatusUpdating}
            className="h-9 justify-center gap-1.5 border-status-error/30 text-xs text-status-error hover:bg-status-error-bg hover:text-status-error"
            onClick={() => openRejectDialog(reg)}
          >
            <XCircle className="h-3.5 w-3.5" />
            {t('common.reject', { defaultValue: 'Reject' })}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isStatusUpdating}
            className="h-9 justify-center gap-1.5 text-xs"
            onClick={() => openRequestUpdateDialog(reg)}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Ask for changes
          </Button>
          {reg.status === 'Submitted' ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={isStatusUpdating}
              className="h-9 justify-center gap-1.5 text-xs"
              onClick={() => handleStartReview(reg)}
            >
              <Clock className="h-3.5 w-3.5" />
              Decide later
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-9 justify-center text-xs"
              onClick={() => setViewProfileDialogOpen(false)}
            >
              {t('common.close', { defaultValue: 'Close' })}
            </Button>
          )}
        </div>
      </div>
    );
  };

  const DetailRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="truncate text-end text-sm font-medium text-foreground">{value || '—'}</span>
    </div>
  );

  const openDocumentPreview = (doc: { fileData?: string; fileName?: string }) => {
    const actualFileData = getDocumentFileData(doc.fileData);

    if (!actualFileData) {
      toast.info('Document not found or not yet uploaded.');
      return;
    }

    const previewWindow = window.open();
    if (!previewWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups to view documents.');
      return;
    }

    if (actualFileData.startsWith('data:image/')) {
      previewWindow.document.write(
        `<html><head><title>${doc.fileName}</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#1a1a1a;"><img src="${actualFileData}" style="max-width:100%;max-height:100vh;object-fit:contain;" /></body></html>`
      );
    } else {
      previewWindow.document.write(
        `<iframe src="${actualFileData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
      );
    }
  };

  const memberColumns = columns.filter((col) => col.key !== 'team');

  const statCards = [
    {
      key: 'needs-review',
      label: 'Awaiting decision',
      value: reviewQueueCount,
      hint: 'Approve, reject or ask for changes',
      icon: AlertTriangle,
      bar: 'bg-status-warning',
      iconWrap: 'bg-status-warning-bg text-status-warning',
      valueTone: 'text-status-warning',
    },
    {
      key: 'Under Review',
      label: t('registrations.under_review'),
      value: stats.underReview,
      hint: 'You already opened these',
      icon: Clock,
      bar: 'bg-status-info',
      iconWrap: 'bg-status-info-bg text-status-info',
      valueTone: 'text-status-info',
    },
    {
      key: 'Approved',
      label: t('registrations.approved'),
      value: stats.approved,
      hint: 'Cleared to attend the event',
      icon: CheckCircle2,
      bar: 'bg-status-success',
      iconWrap: 'bg-status-success-bg text-status-success',
      valueTone: 'text-status-success',
    },
    {
      key: 'Rejected',
      label: t('registrations.rejected'),
      value: stats.rejected,
      hint: 'Turned down by a reviewer',
      icon: XCircle,
      bar: 'bg-status-error',
      iconWrap: 'bg-status-error-bg text-status-error',
      valueTone: 'text-status-error',
    },
  ];

  const listCount = viewMode === 'individual' ? individualRegistrations.length : groupedTeams.length;

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
            <span className="font-medium text-foreground">{t('registrations.title')}</span>
          </nav>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                Event operations
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {t('registrations.title')}
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t('registrations.subtitle')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div
                className="inline-flex h-10 items-center gap-1 rounded-xl border border-border/70 bg-card/70 p-1 shadow-sm backdrop-blur-sm"
                role="group"
                aria-label="Registration type"
              >
                {([
                  { mode: 'individual' as const, label: 'Individuals', icon: User, count: individualRegistrations.length },
                  { mode: 'team' as const, label: 'Teams', icon: Users, count: groupedTeams.length },
                ]).map((option) => {
                  const isActive = viewMode === option.mode;
                  const OptionIcon = option.icon;

                  return (
                    <button
                      key={option.mode}
                      type="button"
                      onClick={() => setViewMode(option.mode)}
                      aria-pressed={isActive}
                      className={cn(
                        'inline-flex h-8 items-center gap-2 rounded-lg px-3 text-[13px] font-semibold transition-all duration-200',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <OptionIcon className="h-3.5 w-3.5" />
                      {option.label}
                      <span
                        className={cn(
                          'rounded px-1.5 text-[11px] font-bold tabular-nums',
                          isActive
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {option.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <Button variant="outline" className="h-10 shrink-0 gap-2 bg-card shadow-sm">
                <Download className="h-4 w-4" />
                {t('registrations.export')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Status tiles — scoped to the selected Individuals/Teams mode above, double as filters */}
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

      {reviewQueueCount > 0 && (
        <div className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/[0.07] via-primary/[0.03] to-transparent px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {reviewQueueCount} registration{reviewQueueCount === 1 ? '' : 's'} need{reviewQueueCount === 1 ? 's' : ''} your decision
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Review documents, then approve, reject, or ask the participant to update their details.
              </p>
            </div>
          </div>
          <Button onClick={() => setStatusFilter('needs-review')} className="shrink-0 gap-1.5 shadow-sm">
            Review queue
          </Button>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 py-24">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t('registrations.loading', 'Loading registrations...')}</p>
        </div>
      ) : groupedTeams.length === 0 && individualRegistrations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-20 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Users className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">{t('registrations.no_registrations')}</h3>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
            {t('registrations.no_registrations_desc')}
          </p>
          {statusFilter !== 'all' && (
            <Button variant="outline" size="sm" className="mt-5" onClick={() => setStatusFilter('all')}>
              {t('registrations.clear_filters')}
            </Button>
          )}
        </div>
      ) : (
        <section className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3.5 shadow-sm lg:flex-row lg:items-center lg:justify-between sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-inset ring-primary/10">
                <Users className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  {viewMode === 'individual' ? 'Individual registrations' : 'Team registrations'}
                  <span className="ml-1.5 text-sm font-normal text-muted-foreground tabular-nums">({listCount})</span>
                </h2>
                <p className="truncate text-xs text-muted-foreground">
                  {viewMode === 'individual'
                    ? 'Participants who registered on their own'
                    : 'Participants grouped by the team they registered with'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-[168px] text-sm">
                    <SelectValue placeholder={t('common.status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('registrations.all_status')}</SelectItem>
                    <SelectItem value="needs-review">Needs review</SelectItem>
                    <SelectItem value="Submitted">{t('common.submitted')}</SelectItem>
                    <SelectItem value="Under Review">{t('common.under_review')}</SelectItem>
                    <SelectItem value="Approved">{t('common.approved')}</SelectItem>
                    <SelectItem value="Rejected">{t('common.rejected')}</SelectItem>
                    <SelectItem value="Update Requested">{t('common.update_requested')}</SelectItem>
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
                  {t('registrations.clear_filters')}
                </Button>
              )}
            </div>
          </div>

          {viewMode === 'individual' ? (
            individualRegistrations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
                <p className="text-sm text-muted-foreground">
                  No individual registrations match the current filter.
                </p>
              </div>
            ) : (
              <DataTable
                data={individualRegistrations}
                columns={memberColumns}
                keyExtractor={(row) => row.id || row.registrationId || row.participantId}
                searchable
                searchPlaceholder={t('registrations.search_placeholder')}
                searchKey={(row) => `${row.participant.firstName} ${row.participant.lastName} ${row.participant.email}`}
                selectable
                onSelectionChange={(ids) => console.log('Selected:', ids)}
                onRowClick={handleRowClick}
                className={TABLE_SKIN}
              />
            )
          ) : groupedTeams.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
              <p className="text-sm text-muted-foreground">No team registrations match the current filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupedTeams.map((team) => {
                const pending = team.members.filter((member) => needsReview(member.status)).length;
                const approved = team.members.filter((member) => member.status === 'Approved').length;
                const initials = (team.teamName || 'T')
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((word) => word.charAt(0).toUpperCase())
                  .join('');

                return (
                  <Collapsible key={team.teamId} defaultOpen={false}>
                    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-shadow hover:shadow-md">
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="group flex w-full items-center gap-3 px-4 py-3.5 text-start sm:px-5"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-[13px] font-bold text-primary ring-1 ring-inset ring-primary/10">
                            {initials}
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">{team.teamName}</p>
                            <p className="text-xs text-muted-foreground">
                              {team.members.length} {team.members.length === 1 ? 'member' : 'members'}
                            </p>
                          </div>

                          <div className="hidden items-center gap-1.5 sm:flex">
                            {pending > 0 && (
                              <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-status-warning-bg px-2 py-0.5 text-[11px] font-semibold text-status-warning ring-1 ring-inset ring-status-warning/20">
                                <AlertTriangle className="h-3 w-3" />
                                {pending} to review
                              </span>
                            )}
                            {approved > 0 && (
                              <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-status-success-bg px-2 py-0.5 text-[11px] font-semibold text-status-success ring-1 ring-inset ring-status-success/20">
                                <CheckCircle2 className="h-3 w-3" />
                                {approved} approved
                              </span>
                            )}
                          </div>

                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </button>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="border-t border-border/60 bg-muted/[0.15] px-4 py-4 sm:px-5">
                        <DataTable
                          data={team.members}
                          columns={memberColumns}
                          keyExtractor={(row) => row.id || row.registrationId || `${row.participantId}-${row.teamId}`}
                          searchable={false}
                          selectable
                          onSelectionChange={(ids) => console.log('Selected:', ids)}
                          onRowClick={handleRowClick}
                          className={TABLE_SKIN}
                        />
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent dir={isRtl ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="text-start">{t('registrations.reject_registration')}</DialogTitle>
            <DialogDescription className="text-start">
              {t('registrations.reject_desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2 text-start">
              <Label htmlFor="reject-reason">{t('registrations.rejection_reason')}</Label>
              <Textarea
                id="reject-reason"
                placeholder={t('registrations.rejection_placeholder')}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="text-start"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              {t('registrations.reject_registration')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Update Dialog */}
      <Dialog open={requestUpdateDialogOpen} onOpenChange={setRequestUpdateDialogOpen}>
        <DialogContent dir={isRtl ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="text-start">{t('registrations.request_update')}</DialogTitle>
            <DialogDescription className="text-start">
              {t('registrations.describe_updates')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2 text-start">
              <Label htmlFor="update-reason">{t('registrations.required_updates')}</Label>
              <Textarea
                id="update-reason"
                placeholder={t('registrations.describe_updates')}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="text-start"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRequestUpdateDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleRequestUpdate}>
              {t('registrations.send_request')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Documents Dialog */}
      <Dialog open={viewDocsDialogOpen} onOpenChange={setViewDocsDialogOpen}>
        <DialogContent
          className="flex max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-xl p-0"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {(() => {
            const documents = selectedRegistration?.documents || [];
            const pendingCount = documents.filter((doc: any) => doc.status === 'Pending').length;

            return (
              <>
                <DialogHeader className="shrink-0 space-y-0 border-b bg-gradient-to-br from-primary/[0.06] via-card to-card px-4 py-3.5 pe-12 text-start sm:px-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-inset ring-primary/10">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <DialogTitle className="truncate text-base tracking-tight">
                        {t('registrations.view_docs')}
                      </DialogTitle>
                      <DialogDescription className="truncate text-xs">
                        {selectedRegistration
                          ? `${selectedRegistration.participant.firstName} ${selectedRegistration.participant.lastName}`
                          : ''}
                        {documents.length > 0 && (
                          <>
                            {' · '}
                            {documents.length} {documents.length === 1 ? 'file' : 'files'}
                            {pendingCount > 0 ? ` · ${pendingCount} awaiting review` : ' · all reviewed'}
                          </>
                        )}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                  {documents.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                        <FileText className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground">{t('registrations.no_docs')}</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {documents.map((doc: any, index: number) => {
                        const isImage = isImageDocument(doc.fileName);
                        const DocIcon = isImage ? ImageIcon : FileText;

                        return (
                          <div
                            key={index}
                            className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 transition-colors hover:border-primary/25 hover:bg-primary/[0.02]"
                          >
                            <span
                              className={cn(
                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
                                isImage
                                  ? 'bg-status-info-bg text-status-info ring-status-info/15'
                                  : 'bg-muted text-muted-foreground ring-border',
                              )}
                            >
                              <DocIcon className="h-4 w-4" />
                            </span>

                            <div className="min-w-0 flex-1 text-start">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {humanizeDocumentType(doc.type)}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">{doc.fileName}</p>
                            </div>

                            <StatusBadge status={doc.status} />

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 shrink-0 gap-1.5 text-xs"
                              onClick={() => openDocumentPreview(doc)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <DialogFooter className="shrink-0 border-t bg-muted/20 px-4 py-3 sm:px-5">
                  <Button variant="outline" onClick={() => setViewDocsDialogOpen(false)}>
                    {t('common.close', { defaultValue: 'Close' })}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
      {/* Registration review modal — full details plus approve / reject actions */}
      <Dialog open={viewProfileDialogOpen} onOpenChange={setViewProfileDialogOpen}>
        <DialogContent
          className="flex max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-xl p-0"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {selectedRegistration && (
            <>
              {/* Header */}
              <DialogHeader className="shrink-0 space-y-0 border-b bg-gradient-to-br from-primary/[0.06] via-card to-card py-3 pe-12 ps-4 text-start sm:py-3.5 sm:ps-5">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar className="h-9 w-9 shrink-0 ring-2 ring-background sm:h-10 sm:w-10">
                      <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                        {selectedRegistration.participant.firstName.charAt(0)}
                        {selectedRegistration.participant.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <DialogTitle className="truncate text-start text-base font-semibold tracking-tight sm:text-lg">
                        {selectedRegistration.participant.firstName} {selectedRegistration.participant.lastName}
                      </DialogTitle>
                      <DialogDescription className="truncate text-start text-xs">
                        {selectedRegistration.participant.email}
                      </DialogDescription>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {getStatusHint(selectedRegistration.status)}
                    </span>
                    <StatusBadge status={selectedRegistration.status} size="sm" />
                  </div>
                </div>
              </DialogHeader>

              {/* Body */}
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5 text-start sm:px-5 sm:py-4">
                <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                  <section className="rounded-xl border border-border/70 bg-card px-3.5 py-2.5">
                    <h4 className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('participants.participant_details', { defaultValue: 'Personal details' })}
                    </h4>
                    <div className="divide-y divide-border/60">
                      <DetailRow label={t('common.phone', { defaultValue: 'Phone' })} value={selectedRegistration.participant.phone} />
                      <DetailRow
                        label={t('registrations.nationality', { defaultValue: 'Nationality' })}
                        value={selectedRegistration.participant.nationality}
                      />
                      <DetailRow label="Passport" value={selectedRegistration.participant.passportNumber} />
                      <DetailRow
                        label={t('participants.role', { defaultValue: 'Role' })}
                        value={t(`common.${selectedRegistration.participant.role.toLowerCase()}`, {
                          defaultValue: selectedRegistration.participant.role,
                        })}
                      />
                      <DetailRow label="Organization" value={selectedRegistration.participant.organization} />
                      <DetailRow label="Job title" value={selectedRegistration.participant.jobTitle} />
                    </div>
                  </section>

                  <section className="rounded-xl border border-border/70 bg-card px-3.5 py-2.5">
                    <h4 className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Registration
                    </h4>
                    <div className="divide-y divide-border/60">
                      <DetailRow
                        label={t('common.team', { defaultValue: 'Team' })}
                        value={selectedRegistration.teamName || 'Individual'}
                      />
                      <DetailRow
                        label={t('common.submitted', { defaultValue: 'Submitted' })}
                        value={
                          selectedRegistration.submittedAt
                            ? new Date(selectedRegistration.submittedAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                            : '—'
                        }
                      />
                      <DetailRow label="Dietary notes" value={selectedRegistration.participant.dietaryNotes} />
                      <DetailRow label="Accessibility" value={selectedRegistration.participant.accessibilityNeeds} />
                      <DetailRow
                        label={t('registrations.documents', { defaultValue: 'Documents' })}
                        value={
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                            onClick={() => openViewDocsDialog(selectedRegistration)}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            {selectedRegistration.documentCount === 0
                              ? 'None'
                              : `View ${selectedRegistration.documentCount}`}
                          </button>
                        }
                      />
                    </div>
                  </section>
                </div>
              </div>

              {/* Footer actions */}
              <DialogFooter className="shrink-0 flex-col border-t bg-muted/25 px-4 py-3 sm:flex-col sm:items-stretch sm:space-x-0 sm:px-5 sm:py-3.5">
                {renderRegistrationStatusActions(selectedRegistration)}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RegistrationsPage;
