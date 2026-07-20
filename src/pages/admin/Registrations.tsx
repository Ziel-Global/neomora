// import React, { useMemo, useState, useEffect } from 'react';
// import { useParams } from 'react-router-dom';
// import { useTranslation } from 'react-i18next';
// import { Link } from 'react-router-dom';
// import { PageHeader } from '@/components/common/PageHeader';
// import { DataTable, Column } from '@/components/common/DataTable';
// import { StatusBadge } from '@/components/common/StatusBadge';
// import { EMSRegistration, EMSParticipant, travelStore } from '@/lib/emsStore';
// import { Button } from '@/components/ui/button';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';
// import {
//   Download,
//   Filter,
//   Eye,
//   MoreHorizontal,
//   CheckCircle2,
//   XCircle,
//   Clock,
//   FileText,
//   AlertTriangle,
//   Users,
//   Upload,
//   ChevronDown,
// } from 'lucide-react';
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from '@/components/ui/dropdown-menu';
// import {
//   Collapsible,
//   CollapsibleContent,
//   CollapsibleTrigger,
// } from '@/components/ui/collapsible';
// import { Card, CardContent } from '@/components/ui/card';
// import { Avatar, AvatarFallback } from '@/components/ui/avatar';
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from '@/components/ui/dialog';
// import { Label } from '@/components/ui/label';
// import { Textarea } from '@/components/ui/textarea';
// import { toast } from 'sonner';
// import {
//   getRegistrationsByTeam,
//   getRegistrations,
//   approveRegistration,
//   rejectRegistration,
//   startRegistrationReview,
//   requestRegistrationUpdate,
// } from '@/api/registrationApi';
// import { Loader2 } from 'lucide-react';

// // Document storage keys (visa portal and registration)
// const VISA_DOCS_KEY = 'ems_visa_documents';
// const REG_DOCS_KEY = 'ems_registration_documents';

// // Helper to retrieve actual file data from dedicated storage
// const getDocumentFileData = (fileDataOrRef: string | undefined): string | null => {
//   if (!fileDataOrRef) return null;

//   // If it's already base64 data, return as-is (legacy support)
//   if (fileDataOrRef.startsWith('data:')) {
//     return fileDataOrRef;
//   }

//   // Try registration documents storage first
//   try {
//     const regStored = localStorage.getItem(REG_DOCS_KEY);
//     if (regStored) {
//       const docStorage = JSON.parse(regStored);
//       if (docStorage[fileDataOrRef]) {
//         return docStorage[fileDataOrRef];
//       }
//     }
//   } catch (e) {
//     console.error('Failed to retrieve from reg docs:', e);
//   }

//   // Fallback to visa documents storage
//   try {
//     const visaStored = localStorage.getItem(VISA_DOCS_KEY);
//     if (visaStored) {
//       const docStorage = JSON.parse(visaStored);
//       if (docStorage[fileDataOrRef]) {
//         return docStorage[fileDataOrRef];
//       }
//     }
//   } catch (e) {
//     console.error('Failed to retrieve from visa docs:', e);
//   }

//   return null;
// };

// interface RegistrationWithParticipant extends EMSRegistration {
//   participant: EMSParticipant;
//   documentCount: number;
//   pendingDocs: number;
//   teamName?: string;
//   teamId?: string;
// }

// interface TeamRegistrationsGroup {
//   id?: string;
//   _id?: string;
//   teamId?: string;
//   teamName?: string;
//   name?: string;
//   team?: any;
//   members?: any[];
//   participants?: any[];
//   registrations?: any[];
//   [key: string]: any;
// }

// const RegistrationsPage: React.FC = () => {
//   const { eventId } = useParams();
//   const { t, i18n } = useTranslation();
//   const isRtl = i18n.language === 'ar';
//   const [statusFilter, setStatusFilter] = useState<string>('all');
//   const [registrations, setRegistrations] = useState<RegistrationWithParticipant[]>([]);

//   // Dialog states
//   const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
//   const [requestUpdateDialogOpen, setRequestUpdateDialogOpen] = useState(false);
//   const [selectedRegistration, setSelectedRegistration] = useState<RegistrationWithParticipant | null>(null);
//   const [reason, setReason] = useState('');
//   const [viewDocsDialogOpen, setViewDocsDialogOpen] = useState(false);
//   const [viewProfileDialogOpen, setViewProfileDialogOpen] = useState(false);

//   const [isLoading, setIsLoading] = useState(false);

//   const normalizeName = (fullName: string | undefined) => {
//     if (!fullName) return { firstName: 'Unknown', lastName: '' };
//     const parts = fullName.trim().split(' ').filter(Boolean);
//     if (parts.length === 0) return { firstName: 'Unknown', lastName: '' };
//     if (parts.length === 1) return { firstName: parts[0], lastName: '' };
//     return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
//   };

//   const buildRegistrationRows = (groups: TeamRegistrationsGroup[]): RegistrationWithParticipant[] => {
//     const rows: RegistrationWithParticipant[] = [];

//     for (const group of groups) {
//       const teamId = group.teamId || group.id || group._id || group.team?.id || group.team?._id;
//       const teamName = group.teamName || group.name || group.team?.name || 'Unknown Team';
//       const members = group.members || group.participants || group.registrations || [];

//       const groupEventId = 
//         group.eventId || 
//         group.event_id || 
//         group.event?.id || 
//         group.event?._id || 
//         members[0]?.event?.id || 
//         members[0]?.event?._id || 
//         members[0]?.registration?.event?.id || 
//         members[0]?.registration?.event?._id || 
//         null;

//       for (const member of members) {
//         const reg = member?.registration || member;
//         const participantSource = member?.participant || reg?.participant || member?.user || reg?.user || member;
//         const nameFallback = normalizeName(participantSource?.name || reg?.name);

//         const participant: EMSParticipant = {
//           id: participantSource?.id || participantSource?._id || reg?.participantId || reg?.participant_id || '',
//           firstName: participantSource?.firstName || nameFallback.firstName,
//           lastName: participantSource?.lastName || nameFallback.lastName,
//           email: participantSource?.email || reg?.email || '-',
//           phone: participantSource?.phone || reg?.phone || '-',
//           nationality: participantSource?.nationality || participantSource?.country || reg?.country || 'Unknown',
//           passportNumber: participantSource?.passportNumber || '-',
//           organization: participantSource?.organization || '-',
//           jobTitle: participantSource?.jobTitle,
//           role: participantSource?.role || reg?.role || 'Athlete',
//           dietaryNotes: participantSource?.dietaryNotes || '',
//           accessibilityNeeds: participantSource?.accessibilityNeeds || '',
//           registrationDate: participantSource?.createdAt || reg?.createdAt || new Date().toISOString(),
//           avatar: participantSource?.avatar,
//         };

//         const documents = reg?.documents || [];
//         const pendingDocs = documents.filter((d: any) => d.status === 'Pending').length || 0;

//         rows.push({
//           ...(reg || {}),
//           id: reg?.id || reg?._id || reg?.registrationId || reg?.registration_id || member?.id || member?._id,
//           registrationId: reg?.registrationId || reg?.registration_id || reg?.id || reg?._id || member?.id || member?._id,
//           participantId: participant.id,
//           status: reg?.status || reg?.registrationStatus || reg?.registration_status || 'Submitted',
//           submittedAt: reg?.submittedAt || reg?.createdAt || reg?.created_at || null,
//           documents,
//           formData: reg?.formData || reg?.form_data || {},
//           participant,
//           documentCount: documents.length || 0,
//           pendingDocs,
//           teamId,
//           teamName,
//           eventId: reg?.eventId || reg?.event_id || reg?.event?.id || reg?.event?._id || groupEventId,
//         });
//       }
//     }

//     return rows;
//   };

//   // Load data from backend API
//   const loadData = async () => {
//     setIsLoading(true);
//     try {
//       const [apiGroups, allRegs] = await Promise.all([
//         getRegistrationsByTeam().catch(() => []),
//         getRegistrations().catch(() => [])
//       ]);

//       const rawGroups = Array.isArray(apiGroups) ? apiGroups : [];
//       const hasGroupShape = rawGroups.some(group =>
//         group && (group.members || group.participants || group.registrations)
//       );
//       const normalizedGroups = hasGroupShape
//         ? rawGroups
//         : [{ teamName: 'Unknown Team', members: rawGroups }];

//       // Process allRegs directly to avoid them getting a fake teamName
//       const individualRows: any[] = [];
//       if (Array.isArray(allRegs)) {
//         for (const reg of allRegs) {
//           const participantSource = reg.participant || reg.user || reg;
//           const nameFallback = normalizeName(participantSource?.name || reg?.name);
//           const participant: EMSParticipant = {
//             id: participantSource?.id || participantSource?._id || reg?.participantId || reg?.participant_id || '',
//             firstName: participantSource?.firstName || nameFallback.firstName,
//             lastName: participantSource?.lastName || nameFallback.lastName,
//             email: participantSource?.email || reg?.email || '-',
//             phone: participantSource?.phone || reg?.phone || '-',
//             nationality: participantSource?.nationality || participantSource?.country || reg?.country || 'Unknown',
//             passportNumber: participantSource?.passportNumber || '-',
//             organization: participantSource?.organization || '-',
//             jobTitle: participantSource?.jobTitle,
//             role: participantSource?.role || reg?.role || 'Athlete',
//             dietaryNotes: participantSource?.dietaryNotes || '',
//             accessibilityNeeds: participantSource?.accessibilityNeeds || '',
//             registrationDate: participantSource?.createdAt || reg?.createdAt || new Date().toISOString(),
//             avatar: participantSource?.avatar,
//           };
//           const documents = reg?.documents || [];
//           const pendingDocs = documents.filter((d: any) => d.status === 'Pending').length || 0;

//           individualRows.push({
//             ...(reg || {}),
//             id: reg?.id || reg?._id || reg?.registrationId || reg?.registration_id,
//             registrationId: reg?.registrationId || reg?.registration_id || reg?.id || reg?._id,
//             participantId: participant.id,
//             status: reg?.status || reg?.registrationStatus || reg?.registration_status || 'Submitted',
//             submittedAt: reg?.submittedAt || reg?.createdAt || reg?.created_at || null,
//             documents,
//             formData: reg?.formData || reg?.form_data || {},
//             participant,
//             documentCount: documents.length || 0,
//             pendingDocs,
//             teamId: reg?.teamId || reg?.team?.id || reg?.team?._id || null, // Keep actual team if present, else null
//             teamName: reg?.teamName || reg?.team?.name || null, // No fallback to "Unknown Team"
//             eventId: reg?.eventId || reg?.event_id || reg?.event?.id || reg?.event?._id,
//           });
//         }
//       }

//       let rows = [...buildRegistrationRows(normalizedGroups), ...individualRows];

//       // Deduplicate by ID
//       const uniqueRows = new Map();
//       for (const row of rows) {
//         if (row.id && !uniqueRows.has(row.id)) {
//           uniqueRows.set(row.id, row);
//         }
//       }
//       rows = Array.from(uniqueRows.values());

//       if (eventId) {
//         rows = rows.filter((r: any) => String(r.eventId) === String(eventId));
//       }
//       setRegistrations(rows);
//     } catch (err) {
//       console.error('Failed to load registrations:', err);
//       toast.error(t('registrations.no_registrations'));
//       setRegistrations([]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadData();
//   }, [eventId]);

//   // Apply filters
//   const filteredData = registrations.filter(reg => {
//     if (statusFilter !== 'all' && reg.status !== statusFilter) return false;
//     return true;
//   });

//   const { groupedTeams, individualRegistrations } = useMemo(() => {
//     const map = new Map<string, { teamId: string; teamName: string; members: RegistrationWithParticipant[] }>();
//     const individuals: RegistrationWithParticipant[] = [];

//     const normalizeKey = (v: any) => {
//       if (!v && v !== 0) return null;
//       const s = String(v).trim();
//       return s === '' ? null : s.toLowerCase();
//     };

//     for (const reg of filteredData) {
//       const rawTeamId = reg.teamId || reg.team?.id || reg.team?._id || reg.team?._key || null;
//       const rawTeamName = reg.teamName || reg.team?.name || reg.team?.teamName || null;

//       const keyId = normalizeKey(rawTeamId) || normalizeKey(rawTeamName) || null;
//       const teamName = rawTeamName || (rawTeamId ? String(rawTeamId) : null);

//       if (!keyId) {
//         individuals.push(reg);
//         continue;
//       }

//       const existing = map.get(keyId);
//       if (!existing) {
//         map.set(keyId, { teamId: keyId, teamName: teamName || 'Unknown Team', members: [reg] });
//       } else {
//         existing.members.push(reg);
//       }
//     }

//     return {
//       groupedTeams: Array.from(map.values()).sort((a, b) => (a.teamName || '').localeCompare(b.teamName || '')),
//       individualRegistrations: individuals,
//     };
//   }, [filteredData]);

//   // Stats
//   const stats = {
//     submitted: registrations.filter(r => r.status === 'Submitted').length,
//     underReview: registrations.filter(r => r.status === 'Under Review').length,
//     approved: registrations.filter(r => r.status === 'Approved').length,
//     rejected: registrations.filter(r => r.status === 'Rejected').length,
//   };

//   // Action handlers
//   const handleApprove = async (reg: RegistrationWithParticipant) => {
//     try {
//       await approveRegistration(reg.id);
//     } catch (e) {
//       toast.error(t('common.failed'));
//       return;
//     }
//     if (reg.formData?.needsTransport) {
//       const travel = travelStore.generateForApprovedRegistration(reg.id);
//       if (travel) {
//         toast.success(t('common.activity.travel_ticketed') + `: ${reg.participant.firstName}`);
//       }
//     }
//     loadData();
//     toast.success(t('common.activity.reg_approved') + `: ${reg.registrationId}`);
//   };

//   const handleStartReview = async (reg: RegistrationWithParticipant) => {
//     try {
//       await startRegistrationReview(reg.id);
//     } catch (e) {
//       toast.error(t('common.failed'));
//       return;
//     }
//     loadData();
//     toast.info(t('registrations.start_review') + `: ${reg.registrationId}`);
//   };

//   const handleReject = async () => {
//     if (!selectedRegistration || !reason.trim()) {
//       toast.error(t('registrations.rejection_reason'));
//       return;
//     }
//     try {
//       await rejectRegistration(selectedRegistration.id, reason);
//     } catch (e) {
//       toast.error(t('common.failed'));
//       return;
//     }
//     loadData();
//     toast.success(t('common.rejected') + `: ${selectedRegistration.registrationId}`);
//     setRejectDialogOpen(false);
//     setSelectedRegistration(null);
//     setReason('');
//   };

//   const handleRequestUpdate = async () => {
//     if (!selectedRegistration || !reason.trim()) {
//       toast.error(t('registrations.required_updates'));
//       return;
//     }
//     try {
//       await requestRegistrationUpdate(selectedRegistration.id, reason);
//     } catch (e) {
//       toast.error(t('common.failed'));
//       return;
//     }
//     loadData();
//     toast.success(t('common.update_requested') + `: ${selectedRegistration.registrationId}`);
//     setRequestUpdateDialogOpen(false);
//     setSelectedRegistration(null);
//     setReason('');
//   };

//   const openRejectDialog = (reg: RegistrationWithParticipant) => {
//     setSelectedRegistration(reg);
//     setReason('');
//     setRejectDialogOpen(true);
//   };

//   const openRequestUpdateDialog = (reg: RegistrationWithParticipant) => {
//     setSelectedRegistration(reg);
//     setReason('');
//     setRequestUpdateDialogOpen(true);
//   };

//   const openViewProfileDialog = (reg: RegistrationWithParticipant) => {
//     setSelectedRegistration(reg);
//     setViewProfileDialogOpen(true);
//   };

//   const openViewDocsDialog = (reg: RegistrationWithParticipant) => {
//     setSelectedRegistration(reg);
//     setViewDocsDialogOpen(true);
//   };

//   const columns: Column<RegistrationWithParticipant>[] = [
//     {
//       key: 'participant',
//       header: t('common.participant'),
//       sortable: true,
//       accessor: (row) => (
//         <div className="flex items-center gap-3">
//           <Avatar className="h-8 w-8">
//             <AvatarFallback className="bg-accent/10 text-accent text-xs">
//               {row.participant.firstName.charAt(0)}{row.participant.lastName.charAt(0)}
//             </AvatarFallback>
//           </Avatar>
//           <div className="text-start">
//             <p className="font-medium text-sm">{row.participant.firstName} {row.participant.lastName}</p>
//             <p className="text-xs text-muted-foreground">{row.participant.email}</p>
//           </div>
//         </div>
//       ),
//     },
//     {
//       key: 'team',
//       header: t('common.team') || 'Team',
//       accessor: (row) => (
//         <span className="text-sm">{row.teamName || 'Unknown Team'}</span>
//       ),
//     },
//     {
//       key: 'nationality',
//       header: t('registrations.nationality'),
//       sortable: true,
//       accessor: (row) => row.participant.nationality,
//     },
//     {
//       key: 'role',
//       header: t('participants.role'),
//       accessor: (row) => (
//         <span className="text-sm">{t(`common.${row.participant.role.toLowerCase()}`, { defaultValue: row.participant.role })}</span>
//       ),
//     },
//     {
//       key: 'documents',
//       header: t('registrations.documents'),
//       accessor: (row) => (
//         <Button
//           variant="ghost"
//           size="sm"
//           className="h-auto py-1 px-2 -ml-2"
//           onClick={(e) => {
//             e.stopPropagation();
//             openViewDocsDialog(row);
//           }}
//         >
//           <div className="flex items-center gap-1.5">
//             <FileText className="h-4 w-4 text-muted-foreground" />
//             <span className="text-sm">{row.documentCount}</span>
//             {row.pendingDocs > 0 && (
//               <span className="text-xs text-status-warning">{t('registrations.pending_count', { count: row.pendingDocs })}</span>
//             )}
//           </div>
//         </Button>
//       ),
//     },
//     {
//       key: 'submittedAt',
//       header: t('common.submitted'),
//       sortable: true,
//       accessor: (row) => (
//         <span className="text-sm text-muted-foreground font-mono">
//           {row.submittedAt ? new Date(row.submittedAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US') : '-'}
//         </span>
//       ),
//     },
//     {
//       key: 'status',
//       header: t('common.status'),
//       accessor: (row) => <StatusBadge status={row.status} />,
//     },
//     {
//       key: 'actions',
//       header: '',
//       className: 'w-12',
//       accessor: (row) => (
//         <DropdownMenu>
//           <DropdownMenuTrigger asChild>
//             <Button variant="ghost" size="icon" className="h-8 w-8">
//               <MoreHorizontal className="h-4 w-4" />
//             </Button>
//           </DropdownMenuTrigger>
//           <DropdownMenuContent align={isRtl ? 'start' : 'end'}>
//             <DropdownMenuItem
//               className="flex items-center gap-2 text-start cursor-pointer"
//               onClick={() => openViewProfileDialog(row)}
//             >
//               <Eye className="h-4 w-4" />
//               {t('registrations.view_profile')}
//             </DropdownMenuItem>
//             <DropdownMenuSeparator />
//             {row.status === 'Submitted' && (
//               <DropdownMenuItem
//                 className="flex items-center gap-2 text-status-info text-start"
//                 onClick={() => handleStartReview(row)}
//               >
//                 <Clock className="h-4 w-4" />
//                 {t('registrations.start_review')}
//               </DropdownMenuItem>
//             )}
//             {(row.status === 'Submitted' || row.status === 'Under Review') && (
//               <>
//                 <DropdownMenuItem
//                   className="flex items-center gap-2 text-status-success text-start"
//                   onClick={() => handleApprove(row)}
//                 >
//                   <CheckCircle2 className="h-4 w-4" />
//                   {t('common.approve')}
//                 </DropdownMenuItem>
//                 <DropdownMenuItem
//                   className="flex items-center gap-2 text-status-error text-start"
//                   onClick={() => openRejectDialog(row)}
//                 >
//                   <XCircle className="h-4 w-4" />
//                   {t('common.reject')}
//                 </DropdownMenuItem>
//                 <DropdownMenuItem
//                   className="flex items-center gap-2 text-status-warning text-start"
//                   onClick={() => openRequestUpdateDialog(row)}
//                 >
//                   <AlertTriangle className="h-4 w-4" />
//                   {t('registrations.request_update')}
//                 </DropdownMenuItem>
//               </>
//             )}
//           </DropdownMenuContent>
//         </DropdownMenu>
//       ),
//     },
//   ];

//   const memberColumns = columns.filter((col) => col.key !== 'team');

//   return (
//     <div className="space-y-6 animate-fade-in">
//       <PageHeader
//         title={t('registrations.title')}
//         subtitle={t('registrations.subtitle')}
//         breadcrumbs={[{ label: t('registrations.title') }]}
//         actions={
//           <Button variant="outline" size="sm">
//             <Download className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
//             {t('registrations.export')}
//           </Button>
//         }
//       />

//       {/* Stats Cards */}
//       <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
//         <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('Submitted')}>
//           <CardContent className="pt-4">
//             <div className="flex items-center justify-between">
//               <div className="text-start">
//                 <p className="text-sm text-muted-foreground">{t('registrations.submitted')}</p>
//                 <p className="text-2xl font-bold">{stats.submitted}</p>
//               </div>
//               <div className="h-10 w-10 rounded-lg bg-status-info-bg flex items-center justify-center">
//                 <FileText className="h-5 w-5 text-status-info" />
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//         <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('Under Review')}>
//           <CardContent className="pt-4">
//             <div className="flex items-center justify-between">
//               <div className="text-start">
//                 <p className="text-sm text-muted-foreground">{t('registrations.under_review')}</p>
//                 <p className="text-2xl font-bold">{stats.underReview}</p>
//               </div>
//               <div className="h-10 w-10 rounded-lg bg-status-warning-bg flex items-center justify-center">
//                 <Clock className="h-5 w-5 text-status-warning" />
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//         <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('Approved')}>
//           <CardContent className="pt-4">
//             <div className="flex items-center justify-between">
//               <div className="text-start">
//                 <p className="text-sm text-muted-foreground">{t('registrations.approved')}</p>
//                 <p className="text-2xl font-bold">{stats.approved}</p>
//               </div>
//               <div className="h-10 w-10 rounded-lg bg-status-success-bg flex items-center justify-center">
//                 <CheckCircle2 className="h-5 w-5 text-status-success" />
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//         <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('Rejected')}>
//           <CardContent className="pt-4">
//             <div className="flex items-center justify-between">
//               <div className="text-start">
//                 <p className="text-sm text-muted-foreground">{t('registrations.rejected')}</p>
//                 <p className="text-2xl font-bold">{stats.rejected}</p>
//               </div>
//               <div className="h-10 w-10 rounded-lg bg-status-error-bg flex items-center justify-center">
//                 <XCircle className="h-5 w-5 text-status-error" />
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Filters */}
//       <div className="flex flex-wrap gap-3 p-4 rounded-lg bg-muted/50 border border-border">
//         <div className="flex items-center gap-2">
//           <Filter className="h-4 w-4 text-muted-foreground" />
//           <span className="text-sm font-medium">{t('registrations.filters')}:</span>
//         </div>

//         <Select value={statusFilter} onValueChange={setStatusFilter}>
//           <SelectTrigger className="w-40 h-8">
//             <SelectValue placeholder={t('common.status')} />
//           </SelectTrigger>
//           <SelectContent>
//             <SelectItem value="all">{t('registrations.all_status')}</SelectItem>
//             <SelectItem value="Draft">{t('common.draft')}</SelectItem>
//             <SelectItem value="Submitted">{t('common.submitted')}</SelectItem>
//             <SelectItem value="Under Review">{t('common.under_review')}</SelectItem>
//             <SelectItem value="Approved">{t('common.approved')}</SelectItem>
//             <SelectItem value="Rejected">{t('common.rejected')}</SelectItem>
//             <SelectItem value="Update Requested">{t('common.update_requested')}</SelectItem>
//           </SelectContent>
//         </Select>

//         {statusFilter !== 'all' && (
//           <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')}>
//             {t('registrations.clear_filters')}
//           </Button>
//         )}
//       </div>

//       {/* Empty State or Data Table */}
//       {groupedTeams.length === 0 && individualRegistrations.length === 0 ? (
//         <Card className="p-12">
//           <div className="flex flex-col items-center justify-center text-center">
//             <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
//               <Users className="h-8 w-8 text-muted-foreground" />
//             </div>
//             <h3 className="text-lg font-semibold mb-2">{t('registrations.no_registrations')}</h3>
//             <p className="text-muted-foreground max-w-md">
//               {t('registrations.no_registrations_desc')}
//             </p>
//           </div>
//         </Card>
//       ) : (
//         <div className="space-y-6">
//           {/* Teams container - stacked full width */}
//           <Card className="p-[24px]">
//             <CardContent>
//               <div className="flex items-center justify-between mb-3">
//                 <div>
//                   <h3 className="text-2xl font-bold">{t('registrations.teams') || 'Team Registrations'}</h3>
//                   <p className="text-xs text-muted-foreground">{groupedTeams.length} teams</p>
//                 </div>
//               </div>

//               <div className="space-y-2">
//                 {groupedTeams.map((team) => (
//                   <Collapsible key={team.teamId} defaultOpen={false}>
//                     <Card>
//                       <CollapsibleTrigger asChild>
//                         <button
//                           type="button"
//                           className="flex w-full items-center justify-between p-4 text-start"
//                         >
//                           <div className="min-w-0">
//                             <p className="text-sm font-semibold truncate">{team.teamName}</p>
//                             <p className="text-xs text-muted-foreground">{team.members.length} members</p>
//                           </div>
//                           <ChevronDown className="h-4 w-4 text-muted-foreground" />
//                         </button>
//                       </CollapsibleTrigger>
//                       <CollapsibleContent className="px-4 pb-4">
//                         <DataTable
//                           data={team.members}
//                           columns={memberColumns}
//                           keyExtractor={(row) => row.id || row.registrationId || `${row.participantId}-${row.teamId}`}
//                           searchable={false}
//                           selectable
//                           onSelectionChange={(ids) => console.log('Selected:', ids)}
//                         />
//                       </CollapsibleContent>
//                     </Card>
//                   </Collapsible>
//                 ))}
//               </div>
//             </CardContent>
//           </Card>

//           {/* Individual registrations container - below teams */}
//           <Card className="p-[24px]">
//             <CardContent>
//               <div className="flex items-center justify-between mb-3">
//                 <div>
//                   <h3 className="text-2xl font-bold">{t('registrations.individuals') || 'Individual Registrations'}</h3>
//                   <p className="text-xs text-muted-foreground">{individualRegistrations.length} participants</p>
//                 </div>
//               </div>

//               {individualRegistrations.length === 0 ? (
//                 <div className="p-6">
//                   <p className="text-sm text-muted-foreground">No individual registrations</p>
//                 </div>
//               ) : (
//                 <div>
//                   <DataTable
//                     data={individualRegistrations}
//                     columns={memberColumns}
//                     keyExtractor={(row) => row.id || row.registrationId || row.participantId}
//                     searchable
//                     searchPlaceholder={t('registrations.search_placeholder')}
//                     searchKey={(row) => `${row.participant.firstName} ${row.participant.lastName} ${row.participant.email}`}
//                     selectable
//                     onSelectionChange={(ids) => console.log('Selected:', ids)}
//                   />
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </div>
//       )}

//       {/* Reject Dialog */}
//       <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
//         <DialogContent dir={isRtl ? 'rtl' : 'ltr'}>
//           <DialogHeader>
//             <DialogTitle className="text-start">{t('registrations.reject_registration')}</DialogTitle>
//             <DialogDescription className="text-start">
//               {t('registrations.reject_desc')}
//             </DialogDescription>
//           </DialogHeader>
//           <div className="space-y-4 py-4">
//             <div className="space-y-2 text-start">
//               <Label htmlFor="reject-reason">{t('registrations.rejection_reason')}</Label>
//               <Textarea
//                 id="reject-reason"
//                 placeholder={t('registrations.rejection_placeholder')}
//                 value={reason}
//                 onChange={(e) => setReason(e.target.value)}
//                 rows={4}
//                 className="text-start"
//               />
//             </div>
//           </div>
//           <DialogFooter className="gap-2">
//             <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
//               {t('common.cancel')}
//             </Button>
//             <Button variant="destructive" onClick={handleReject}>
//               {t('registrations.reject_registration')}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Request Update Dialog */}
//       <Dialog open={requestUpdateDialogOpen} onOpenChange={setRequestUpdateDialogOpen}>
//         <DialogContent dir={isRtl ? 'rtl' : 'ltr'}>
//           <DialogHeader>
//             <DialogTitle className="text-start">{t('registrations.request_update')}</DialogTitle>
//             <DialogDescription className="text-start">
//               {t('registrations.describe_updates')}
//             </DialogDescription>
//           </DialogHeader>
//           <div className="space-y-4 py-4">
//             <div className="space-y-2 text-start">
//               <Label htmlFor="update-reason">{t('registrations.required_updates')}</Label>
//               <Textarea
//                 id="update-reason"
//                 placeholder={t('registrations.describe_updates')}
//                 value={reason}
//                 onChange={(e) => setReason(e.target.value)}
//                 rows={4}
//                 className="text-start"
//               />
//             </div>
//           </div>
//           <DialogFooter className="gap-2">
//             <Button variant="outline" onClick={() => setRequestUpdateDialogOpen(false)}>
//               {t('common.cancel')}
//             </Button>
//             <Button onClick={handleRequestUpdate}>
//               {t('registrations.send_request')}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* View Documents Dialog */}
//       <Dialog open={viewDocsDialogOpen} onOpenChange={setViewDocsDialogOpen}>
//         <DialogContent className="max-w-2xl" dir={isRtl ? 'rtl' : 'ltr'}>
//           <DialogHeader>
//             <DialogTitle className="text-start">{t('registrations.view_docs')}</DialogTitle>
//             <DialogDescription className="text-start">
//               {t('registrations.view_docs')} {selectedRegistration?.participant.firstName} {selectedRegistration?.participant.lastName}
//             </DialogDescription>
//           </DialogHeader>
//           <div className="space-y-4 py-4">
//             {!selectedRegistration?.documents || selectedRegistration.documents.length === 0 ? (
//               <div className="text-center py-8 text-muted-foreground">
//                 <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
//                 <p>{t('registrations.no_docs')}</p>
//               </div>
//             ) : (
//               <div className="space-y-3">
//                 {selectedRegistration.documents.map((doc, index) => (
//                   <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
//                     <div className="flex items-center gap-3 overflow-hidden text-start">
//                       <div className={`h-10 w-10 rounded-lg flex items-center justify-center bg-muted`}>
//                         <FileText className="h-5 w-5 text-muted-foreground" />
//                       </div>
//                       <div className="min-w-0">
//                         <p className="font-medium text-sm truncate">{doc.type}</p>
//                         <p className="text-xs text-muted-foreground truncate font-mono">{doc.fileName}</p>
//                       </div>
//                     </div>
//                     <div className="flex items-center gap-2">
//                       <Button
//                         size="sm"
//                         variant="ghost"
//                         onClick={() => {
//                           const actualFileData = getDocumentFileData(doc.fileData);
//                           if (actualFileData) {
//                             // Open in modal for better viewing
//                             const newWindow = window.open();
//                             if (newWindow) {
//                               if (actualFileData.startsWith('data:image/')) {
//                                 newWindow.document.write(
//                                   `<html><head><title>${doc.fileName}</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#1a1a1a;"><img src="${actualFileData}" style="max-width:100%;max-height:100vh;object-fit:contain;" /></body></html>`
//                                 );
//                               } else {
//                                 newWindow.document.write(
//                                   `<iframe src="${actualFileData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
//                                 );
//                               }
//                             } else {
//                               toast.error('Pop-up blocked. Please allow pop-ups to view documents.');
//                             }
//                           } else {
//                             toast.info('Document not found or not yet uploaded.');
//                           }
//                         }}
//                       >
//                         <Eye className="h-4 w-4" />
//                       </Button>
//                       <StatusBadge status={doc.status} />
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//           <DialogFooter>
//             <Button onClick={() => setViewDocsDialogOpen(false)}>
//               {t('common.cancel')}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//       {/* View Profile Dialog */}
//       <Dialog open={viewProfileDialogOpen} onOpenChange={setViewProfileDialogOpen}>
//         <DialogContent className="max-w-3xl" dir={isRtl ? 'rtl' : 'ltr'}>
//           <DialogHeader>
//             <DialogTitle className="text-start">{t('registrations.view_profile')}</DialogTitle>
//           </DialogHeader>
//           <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto">
//             {selectedRegistration && (
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-start">
//                 <div>
//                   <h4 className="font-semibold mb-2">{t('participants.participant_details', { defaultValue: 'Participant Details' })}</h4>
//                   <div className="space-y-2 text-sm">
//                     <p><span className="text-muted-foreground">{t('common.name', { defaultValue: 'Name' })}:</span> {selectedRegistration.participant.firstName} {selectedRegistration.participant.lastName}</p>
//                     <p><span className="text-muted-foreground">{t('common.email', { defaultValue: 'Email' })}:</span> {selectedRegistration.participant.email}</p>
//                     <p><span className="text-muted-foreground">{t('common.phone', { defaultValue: 'Phone' })}:</span> {selectedRegistration.participant.phone}</p>
//                     <p><span className="text-muted-foreground">{t('registrations.nationality', { defaultValue: 'Nationality' })}:</span> {selectedRegistration.participant.nationality}</p>
//                     <p><span className="text-muted-foreground">Passport Number:</span> {selectedRegistration.participant.passportNumber}</p>
//                     <p><span className="text-muted-foreground">Organization:</span> {selectedRegistration.participant.organization}</p>
//                     <p><span className="text-muted-foreground">{t('participants.role', { defaultValue: 'Role' })}:</span> {t(`common.${selectedRegistration.participant.role.toLowerCase()}`, { defaultValue: selectedRegistration.participant.role })}</p>
//                     <p><span className="text-muted-foreground">Job Title:</span> {selectedRegistration.participant.jobTitle || '-'}</p>
//                   </div>
//                 </div>
//                 <div>
//                   <h4 className="font-semibold mb-2">Registration Details</h4>
//                   <div className="space-y-2 text-sm">
//                     <p><span className="text-muted-foreground">{t('common.team', { defaultValue: 'Team' })}:</span> {selectedRegistration.teamName || 'Unknown Team'}</p>
//                     <p><span className="text-muted-foreground">{t('common.status', { defaultValue: 'Status' })}:</span> <span className="ml-2 inline-block"><StatusBadge status={selectedRegistration.status} /></span></p>
//                     <p><span className="text-muted-foreground">{t('common.submitted', { defaultValue: 'Submitted At' })}:</span> {selectedRegistration.submittedAt ? new Date(selectedRegistration.submittedAt).toLocaleDateString() : '-'}</p>
//                     <p><span className="text-muted-foreground">Dietary Notes:</span> {selectedRegistration.participant.dietaryNotes || '-'}</p>
//                     <p><span className="text-muted-foreground">Accessibility Needs:</span> {selectedRegistration.participant.accessibilityNeeds || '-'}</p>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>
//           <DialogFooter>
//             <Button onClick={() => setViewProfileDialogOpen(false)}>
//               {t('common.close', { defaultValue: 'Close' })}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// };

// export default RegistrationsPage;

import React, { useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
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
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  AlertTriangle,
  Users,
  Upload,
  ChevronDown,
} from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';
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
import { toast } from 'sonner';
import {
  getRegistrationsByTeam,
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

  const [isLoading, setIsLoading] = useState(false);

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
          role: participantSource?.role || reg?.role || 'Athlete',
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
      const [apiGroups, allRegs] = await Promise.all([
        getRegistrationsByTeam().catch(() => []),
        getRegistrations().catch(() => [])
      ]);

      const rawGroups = Array.isArray(apiGroups) ? apiGroups : [];
      const hasGroupShape = rawGroups.some(group =>
        group && (group.members || group.participants || group.registrations)
      );
      const normalizedGroups = hasGroupShape
        ? rawGroups
        : [{ teamName: 'Unknown Team', members: rawGroups }];

      // Process allRegs directly to avoid them getting a fake teamName
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
            role: participantSource?.role || reg?.role || 'Athlete',
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

      let rows = [...buildRegistrationRows(normalizedGroups), ...individualRows];

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

  // Stats
  const stats = {
    submitted: registrations.filter(r => r.status === 'Submitted').length,
    underReview: registrations.filter(r => r.status === 'Under Review').length,
    approved: registrations.filter(r => r.status === 'Approved').length,
    rejected: registrations.filter(r => r.status === 'Rejected').length,
  };

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


  const handleApprove = async (reg: RegistrationWithParticipant) => {
    await approveRegistration(reg.registrationId);
    loadData();
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
    await startRegistrationReview(reg.registrationId);
    loadData();
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
    loadData();
    toast.success(t('common.rejected') + `: ${selectedRegistration.registrationId}`);
    setRejectDialogOpen(false);
    setSelectedRegistration(null);
    setReason('');
  };

  const handleRequestUpdate = async () => {
    if (!selectedRegistration || !reason.trim()) {
      toast.error(t('registrations.required_updates'));
      return;
    }
    try {
      await requestRegistrationUpdate(selectedRegistration.id, reason);
    } catch (e) {
      toast.error(t('common.failed'));
      return;
    }
    loadData();
    toast.success(t('common.update_requested') + `: ${selectedRegistration.registrationId}`);
    setRequestUpdateDialogOpen(false);
    setSelectedRegistration(null);
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
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-accent/10 text-accent text-xs">
              {row.participant.firstName.charAt(0)}{row.participant.lastName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="text-start">
            <p className="font-medium text-sm">{row.participant.firstName} {row.participant.lastName}</p>
            <p className="text-xs text-muted-foreground">{row.participant.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'team',
      header: t('common.team') || 'Team',
      accessor: (row) => (
        <span className="text-sm">{row.teamName || 'Unknown Team'}</span>
      ),
    },
    {
      key: 'nationality',
      header: t('registrations.nationality'),
      sortable: true,
      accessor: (row) => row.participant.nationality,
    },
    {
      key: 'role',
      header: t('participants.role'),
      accessor: (row) => (
        <span className="text-sm">{t(`common.${row.participant.role.toLowerCase()}`, { defaultValue: row.participant.role })}</span>
      ),
    },
    {
      key: 'documents',
      header: t('registrations.documents'),
      accessor: (row) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto py-1 px-2 -ml-2"
          onClick={(e) => {
            e.stopPropagation();
            openViewDocsDialog(row);
          }}
        >
          <div className="flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{row.documentCount}</span>
            {row.pendingDocs > 0 && (
              <span className="text-xs text-status-warning">{t('registrations.pending_count', { count: row.pendingDocs })}</span>
            )}
          </div>
        </Button>
      ),
    },
    {
      key: 'submittedAt',
      header: t('common.submitted'),
      sortable: true,
      accessor: (row) => (
        <span className="text-sm text-muted-foreground font-mono">
          {row.submittedAt ? new Date(row.submittedAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US') : '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      accessor: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isRtl ? 'start' : 'end'}>
            <DropdownMenuItem
              className="flex items-center gap-2 text-start cursor-pointer"
              onClick={() => openViewProfileDialog(row)}
            >
              <Eye className="h-4 w-4" />
              {t('registrations.view_profile')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {row.status === 'Submitted' && (
              <DropdownMenuItem
                className="flex items-center gap-2 text-status-info text-start"
                onClick={() => handleStartReview(row)}
              >
                <Clock className="h-4 w-4" />
                {t('registrations.start_review')}
              </DropdownMenuItem>
            )}
            {(row.status === 'Submitted' || row.status === 'Under Review') && (
              <>
                <DropdownMenuItem
                  className="flex items-center gap-2 text-status-success text-start"
                  onClick={() => handleApprove(row)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {t('common.approve')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex items-center gap-2 text-status-error text-start"
                  onClick={() => openRejectDialog(row)}
                >
                  <XCircle className="h-4 w-4" />
                  {t('common.reject')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex items-center gap-2 text-status-warning text-start"
                  onClick={() => openRequestUpdateDialog(row)}
                >
                  <AlertTriangle className="h-4 w-4" />
                  {t('registrations.request_update')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const memberColumns = columns.filter((col) => col.key !== 'team');

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('registrations.title')}
        subtitle={t('registrations.subtitle')}
        breadcrumbs={[{ label: t('registrations.title') }]}
        actions={
          <Button variant="outline" size="sm">
            <Download className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
            {t('registrations.export')}
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('Submitted')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="text-start">
                <p className="text-sm text-muted-foreground">{t('registrations.submitted')}</p>
                <p className="text-2xl font-bold">{stats.submitted}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-status-info-bg flex items-center justify-center">
                <FileText className="h-5 w-5 text-status-info" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('Under Review')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="text-start">
                <p className="text-sm text-muted-foreground">{t('registrations.under_review')}</p>
                <p className="text-2xl font-bold">{stats.underReview}</p>
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
              <div className="text-start">
                <p className="text-sm text-muted-foreground">{t('registrations.approved')}</p>
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
              <div className="text-start">
                <p className="text-sm text-muted-foreground">{t('registrations.rejected')}</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-status-error-bg flex items-center justify-center">
                <XCircle className="h-5 w-5 text-status-error" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t('registrations.filters')}:</span>
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-8">
            <SelectValue placeholder={t('common.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('registrations.all_status')}</SelectItem>
            <SelectItem value="Draft">{t('common.draft')}</SelectItem>
            <SelectItem value="Submitted">{t('common.submitted')}</SelectItem>
            <SelectItem value="Under Review">{t('common.under_review')}</SelectItem>
            <SelectItem value="Approved">{t('common.approved')}</SelectItem>
            <SelectItem value="Rejected">{t('common.rejected')}</SelectItem>
            <SelectItem value="Update Requested">{t('common.update_requested')}</SelectItem>
          </SelectContent>
        </Select>

        {statusFilter !== 'all' && (
          <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')}>
            {t('registrations.clear_filters')}
          </Button>
        )}
      </div>

      {/* Empty State or Data Table */}
      {groupedTeams.length === 0 && individualRegistrations.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t('registrations.no_registrations')}</h3>
            <p className="text-muted-foreground max-w-md">
              {t('registrations.no_registrations_desc')}
            </p>
          </div>
        </Card>
      ) : (
        <Card className="p-[24px]">
          <CardContent>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h3 className="text-2xl font-bold">
                  {viewMode === 'individual'
                    ? (t('registrations.individuals') || 'Individual Registrations')
                    : (t('registrations.teams') || 'Team Registrations')}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {viewMode === 'individual'
                    ? `${individualRegistrations.length} participants`
                    : `${groupedTeams.length} teams`}
                </p>
              </div>

              {/* Toggle between Individual and Team view */}
              <div className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-1 gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode('individual')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md border border-border transition-colors ${viewMode === 'individual'
                    ? 'bg-background shadow-xl text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {t('registrations.individuals') || 'Individual'}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('team')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md border border-border transition-colors ${viewMode === 'team'
                    ? 'bg-background shadow-xl text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {t('registrations.teams') || 'Team'}
                </button>
              </div>
            </div>

            {viewMode === 'individual' ? (
              individualRegistrations.length === 0 ? (
                <div className="p-6">
                  <p className="text-sm text-muted-foreground">No individual registrations</p>
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
                />
              )
            ) : (
              groupedTeams.length === 0 ? (
                <div className="p-6">
                  <p className="text-sm text-muted-foreground">No team registrations</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {groupedTeams.map((team) => (
                    <Collapsible key={team.teamId} defaultOpen={false}>
                      <Card>
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between p-4 text-start"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{team.teamName}</p>
                              <p className="text-xs text-muted-foreground">{team.members.length} members</p>
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-4">
                          <DataTable
                            data={team.members}
                            columns={memberColumns}
                            keyExtractor={(row) => row.id || row.registrationId || `${row.participantId}-${row.teamId}`}
                            searchable={false}
                            selectable
                            onSelectionChange={(ids) => console.log('Selected:', ids)}
                          />
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  ))}
                </div>
              )
            )}
          </CardContent>
        </Card>
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
        <DialogContent className="max-w-2xl" dir={isRtl ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="text-start">{t('registrations.view_docs')}</DialogTitle>
            <DialogDescription className="text-start">
              {t('registrations.view_docs')} {selectedRegistration?.participant.firstName} {selectedRegistration?.participant.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!selectedRegistration?.documents || selectedRegistration.documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>{t('registrations.no_docs')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedRegistration.documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden text-start">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center bg-muted`}>
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{doc.type}</p>
                        <p className="text-xs text-muted-foreground truncate font-mono">{doc.fileName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const actualFileData = getDocumentFileData(doc.fileData);
                          if (actualFileData) {
                            // Open in modal for better viewing
                            const newWindow = window.open();
                            if (newWindow) {
                              if (actualFileData.startsWith('data:image/')) {
                                newWindow.document.write(
                                  `<html><head><title>${doc.fileName}</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#1a1a1a;"><img src="${actualFileData}" style="max-width:100%;max-height:100vh;object-fit:contain;" /></body></html>`
                                );
                              } else {
                                newWindow.document.write(
                                  `<iframe src="${actualFileData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
                                );
                              }
                            } else {
                              toast.error('Pop-up blocked. Please allow pop-ups to view documents.');
                            }
                          } else {
                            toast.info('Document not found or not yet uploaded.');
                          }
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <StatusBadge status={doc.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setViewDocsDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* View Profile Dialog */}
      <Dialog open={viewProfileDialogOpen} onOpenChange={setViewProfileDialogOpen}>
        <DialogContent className="max-w-3xl" dir={isRtl ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="text-start">{t('registrations.view_profile')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto">
            {selectedRegistration && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-start">
                <div>
                  <h4 className="font-semibold mb-2">{t('participants.participant_details', { defaultValue: 'Participant Details' })}</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">{t('common.name', { defaultValue: 'Name' })}:</span> {selectedRegistration.participant.firstName} {selectedRegistration.participant.lastName}</p>
                    <p><span className="text-muted-foreground">{t('common.email', { defaultValue: 'Email' })}:</span> {selectedRegistration.participant.email}</p>
                    <p><span className="text-muted-foreground">{t('common.phone', { defaultValue: 'Phone' })}:</span> {selectedRegistration.participant.phone}</p>
                    <p><span className="text-muted-foreground">{t('registrations.nationality', { defaultValue: 'Nationality' })}:</span> {selectedRegistration.participant.nationality}</p>
                    <p><span className="text-muted-foreground">Passport Number:</span> {selectedRegistration.participant.passportNumber}</p>
                    <p><span className="text-muted-foreground">Organization:</span> {selectedRegistration.participant.organization}</p>
                    <p><span className="text-muted-foreground">{t('participants.role', { defaultValue: 'Role' })}:</span> {t(`common.${selectedRegistration.participant.role.toLowerCase()}`, { defaultValue: selectedRegistration.participant.role })}</p>
                    <p><span className="text-muted-foreground">Job Title:</span> {selectedRegistration.participant.jobTitle || '-'}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Registration Details</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">{t('common.team', { defaultValue: 'Team' })}:</span> {selectedRegistration.teamName || 'Unknown Team'}</p>
                    <p><span className="text-muted-foreground">{t('common.status', { defaultValue: 'Status' })}:</span> <span className="ml-2 inline-block"><StatusBadge status={selectedRegistration.status} /></span></p>
                    <p><span className="text-muted-foreground">{t('common.submitted', { defaultValue: 'Submitted At' })}:</span> {selectedRegistration.submittedAt ? new Date(selectedRegistration.submittedAt).toLocaleDateString() : '-'}</p>
                    <p><span className="text-muted-foreground">Dietary Notes:</span> {selectedRegistration.participant.dietaryNotes || '-'}</p>
                    <p><span className="text-muted-foreground">Accessibility Needs:</span> {selectedRegistration.participant.accessibilityNeeds || '-'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setViewProfileDialogOpen(false)}>
              {t('common.close', { defaultValue: 'Close' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RegistrationsPage;