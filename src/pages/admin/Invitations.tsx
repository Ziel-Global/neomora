// import React, { useState, useEffect, useMemo } from 'react';
// import { useTranslation } from 'react-i18next';
// import { useNavigate, useParams } from 'react-router-dom';
// import { PageHeader } from '@/components/common/PageHeader';
// import { StatsCard } from '@/components/common/StatsCard';
// import { StatusBadge } from '@/components/common/StatusBadge';
// import {
//   eventStore,
//   participantStore,
//   templateStore,
//   campaignStore,
//   invitationStore,
//   initializeStore,
//   EMSEvent,
//   EMSParticipant,
//   EMSCampaign,
//   EMSInvitation,
//   EMSInvitationTemplate,
//   InvitationStatus,
// } from '@/lib/emsStore';
// import { ParticipantRole } from '@/data/mockData';
// import { Mail, Send, Users, CheckCircle, Plus, Search, Eye, MoreHorizontal, FileText, Clock, XCircle, HelpCircle, Copy, ExternalLink, Trash2, Play, RefreshCw, Crown, Star } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
// import { Label } from '@/components/ui/label';
// import { Textarea } from '@/components/ui/textarea';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Progress } from '@/components/ui/progress';
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
// import { Badge } from '@/components/ui/badge';
// import { Checkbox } from '@/components/ui/checkbox';
// import { toast } from '@/hooks/use-toast';
// import { format } from 'date-fns';
// import { InvitationPreviewModal } from '@/components/invitations/InvitationPreviewModal';
// import * as campaignApi from '@/api/campaignApi';
// import { getEvents } from '@/api/eventApi';
// import { getParticipants } from '@/api/participantApi';
// import { getAllDelegations } from '@/api/delegationApi';
// import { Loader2 } from 'lucide-react';

// // Check if template is VIP based on name/subject
// const isVIPTemplate = (template: EMSInvitationTemplate): boolean => {
//   const name = template.name.toLowerCase();
//   const subject = template.subject.toLowerCase();
//   return name.includes('vip') || name.includes('exclusive') ||
//     subject.includes('vip') || subject.includes('exclusive');
// };

// // Real backend UUIDs for invitation templates
// const BACKEND_TEMPLATE_IDS = {
//   VIP: '03a64d7b-50df-4be1-a97f-fe9182321174',
//   STANDARD: 'a424a3fd-3afe-4357-a179-41794ff34197',
// };

// // Map a local template to its real backend UUID
// const getBackendTemplateId = (template: EMSInvitationTemplate | undefined): string => {
//   if (!template) return BACKEND_TEMPLATE_IDS.STANDARD;
//   // If the ID is already a real backend UUID, use it directly
//   if (template.id === BACKEND_TEMPLATE_IDS.VIP || template.id === BACKEND_TEMPLATE_IDS.STANDARD) {
//     return template.id;
//   }
//   return isVIPTemplate(template) ? BACKEND_TEMPLATE_IDS.VIP : BACKEND_TEMPLATE_IDS.STANDARD;
// };

// const ROLES: ParticipantRole[] = ['VVIP', 'VIP', 'Athlete', 'Official', 'Judge', 'Media', 'Fan'];


// const InvitationsPage: React.FC = () => {
//   const { t } = useTranslation();
//   const navigate = useNavigate();
//   const { eventId } = useParams<{ eventId: string }>();
//   const [activeTab, setActiveTab] = useState('campaigns');
//   const [isCreateOpen, setIsCreateOpen] = useState(false);
//   const [wizardStep, setWizardStep] = useState(1);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [refreshKey, setRefreshKey] = useState(0);
//   const [isLoading, setIsLoading] = useState(false);
//   const [isActionLoading, setIsActionLoading] = useState(false);
//   const [apiCampaigns, setApiCampaigns] = useState<campaignApi.Campaign[]>([]);
//   const [apiEvents, setApiEvents] = useState<EMSEvent[]>([]);
//   const [apiParticipants, setApiParticipants] = useState<EMSParticipant[]>([]);
//   const [apiDelegations, setApiDelegations] = useState<any[]>([]);

//   // Wizard form state
//   const [selectedEventId, setSelectedEventId] = useState('');
//   const [campaignName, setCampaignName] = useState('');
//   const [selectedRoles, setSelectedRoles] = useState<ParticipantRole[]>([]);
//   const [selectedDelegations, setSelectedDelegations] = useState<string[]>([]);
//   const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
//   const [audienceMode, setAudienceMode] = useState<'role' | 'individual' | 'delegation'>('role');
//   const [participantSearchTerm, setParticipantSearchTerm] = useState('');
//   const [selectedTemplateId, setSelectedTemplateId] = useState('');
//   const [rsvpDeadline, setRsvpDeadline] = useState('');
//   const [customMessage, setCustomMessage] = useState('');

//   // View states
//   const [selectedCampaign, setSelectedCampaign] = useState<EMSCampaign | null>(null);
//   const [viewCampaignOpen, setViewCampaignOpen] = useState(false);

//   // Template preview state
//   const [previewTemplate, setPreviewTemplate] = useState<EMSInvitationTemplate | null>(null);
//   const [previewOpen, setPreviewOpen] = useState(false);

//   // Initialize store and fetch API data
//   useEffect(() => {
//     initializeStore();
//     loadCampaigns();
//   }, [refreshKey]);

//   const loadCampaigns = async () => {
//     setIsLoading(true);
//     try {
//       const [campaignData, eventData, participantData, delegationData] = await Promise.all([
//         campaignApi.getCampaigns(),
//         getEvents(),
//         getParticipants(),
//         getAllDelegations().catch(() => [])
//       ]);
//       setApiCampaigns(Array.isArray(campaignData) ? campaignData : []);
//       setApiEvents(Array.isArray(eventData) ? eventData : []);
//       setApiParticipants(Array.isArray(participantData) ? participantData : []);
//       setApiDelegations(Array.isArray(delegationData) ? delegationData : []);
//     } catch (error) {
//       console.error('Failed to load invitations data:', error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Fetch data
//   const events = useMemo(() => {
//     if (Array.isArray(apiEvents) && apiEvents.length > 0) return apiEvents;
//     return eventStore.getAll();
//   }, [apiEvents, refreshKey]);

//   const participants = useMemo(() => {
//     if (Array.isArray(apiParticipants) && apiParticipants.length > 0) return apiParticipants;
//     return participantStore.getAll();
//   }, [apiParticipants, refreshKey]);

//   const templates = useMemo(() => templateStore.getAll(), [refreshKey]);

//   const campaigns = useMemo(() => {
//     if (Array.isArray(apiCampaigns) && apiCampaigns.length > 0) {
//       const camps = apiCampaigns as any as EMSCampaign[];
//       if (eventId) {
//         return camps.filter(c => c.eventId === eventId);
//       }
//       return camps;
//     }
//     return [];
//   }, [apiCampaigns, refreshKey, eventId]);

//   const invitations = useMemo(() => {
//     const localInvitations = invitationStore.getAll();
//     if (eventId) {
//       return localInvitations.filter(inv => inv.eventId === eventId);
//     }
//     return localInvitations;
//   }, [refreshKey, eventId]);

//   // Calculate stats
//   const stats = useMemo(() => ({
//     totalSent: (invitations || []).filter(i => i.sentAt).length,
//     delivered: (invitations || []).filter(i => i.deliveredAt).length,
//     accepted: (invitations || []).filter(i => i.status === 'Accepted').length,
//     campaigns: (campaigns || []).length,
//   }), [invitations, campaigns]);

//   const getStatusVariant = (status: string): 'success' | 'info' | 'warning' | 'default' | 'destructive' => {
//     switch (status) {
//       case 'Completed':
//       case 'Accepted': return 'success';
//       case 'Sent':
//       case 'Delivered':
//       case 'Opened': return 'info';
//       case 'Scheduled':
//       case 'Pending':
//       case 'Maybe': return 'warning';
//       case 'Declined':
//       case 'Expired': return 'destructive';
//       case 'Draft':
//       default: return 'default';
//     }
//   };

//   const getEventName = (campaignOrEventId: EMSCampaign | { eventId?: string; event?: { id?: string; name?: string } } | string) => {
//     if (typeof campaignOrEventId === 'string') {
//       return events.find(e => e.id === campaignOrEventId)?.name || 'Unknown Event';
//     }

//     if ((campaignOrEventId as any)?.event?.name) return (campaignOrEventId as any).event.name;
//     const eventId = (campaignOrEventId as any)?.eventId;
//     return events.find(e => e.id === eventId)?.name || 'Unknown Event';
//   };

//   const getCampaignStats = (campaign: EMSCampaign | { id: string; stats?: any }) => {
//     const invitationsForCampaign = invitationStore.getByCampaign(campaign.id);
//     return {
//       audienceSize: campaign.stats?.audienceSize ?? invitationsForCampaign.length,
//       sentCount: campaign.stats?.sentCount ?? invitationsForCampaign.filter(i => i.sentAt).length,
//       deliveredCount: campaign.stats?.deliveredCount ?? invitationsForCampaign.filter(i => i.deliveredAt).length,
//       openedCount: campaign.stats?.openedCount ?? invitationsForCampaign.filter(i => i.openedAt).length,
//       acceptedCount: campaign.stats?.acceptedCount ?? invitationsForCampaign.filter(i => i.status === 'Accepted').length,
//       maybeCount: campaign.stats?.maybeCount ?? invitationsForCampaign.filter(i => i.status === 'Maybe').length,
//       declinedCount: campaign.stats?.declinedCount ?? invitationsForCampaign.filter(i => i.status === 'Declined').length,
//     };
//   };

//   const filteredCampaigns = campaigns.filter(c =>
//     c.name.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   const approvedDelegations = useMemo(() => {
//     return apiDelegations.filter(d =>
//       d.status === 'Approved' &&
//       (d.eventId === selectedEventId || !selectedEventId)
//     );
//   }, [apiDelegations, selectedEventId]);

//   // Get audience based on filters
//   const getFilteredAudience = (): EMSParticipant[] => {
//     if (!selectedEventId) return [];

//     if (audienceMode === 'individual') {
//       return participants.filter(p => selectedParticipantIds.includes(p.id));
//     }

//     if (audienceMode === 'delegation') {
//       return participants.filter(p => {
//         if (selectedDelegations.length > 0) {
//           return selectedDelegations.some(selected => {
//             const selectedLower = selected.toLowerCase();
//             const orgLower = (p.organization || '').toLowerCase();
//             return selectedLower && (orgLower.includes(selectedLower) || selectedLower.includes(orgLower));
//           });
//         }
//         return approvedDelegations.some(del => {
//           const countryLower = (del.country || '').toLowerCase();
//           const orgLower = (p.organization || '').toLowerCase();
//           return countryLower && (orgLower.includes(countryLower) || countryLower.includes(orgLower));
//         });
//       });
//     }

//     return participants.filter(p =>
//       selectedRoles.length === 0 || selectedRoles.includes(p.role)
//     );
//   };

//   const filteredParticipantsForSelection = participants.filter(p => {
//     const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
//     const searchLower = participantSearchTerm.toLowerCase();
//     return fullName.includes(searchLower) || p.email.toLowerCase().includes(searchLower);
//   });

//   const toggleParticipant = (participantId: string) => {
//     setSelectedParticipantIds(prev =>
//       prev.includes(participantId)
//         ? prev.filter(id => id !== participantId)
//         : [...prev, participantId]
//     );
//   };

//   const toggleRole = (role: ParticipantRole) => {
//     setSelectedRoles(prev =>
//       prev.includes(role)
//         ? prev.filter(r => r !== role)
//         : [...prev, role]
//     );
//   };

//   const toggleDelegation = (delegation: string) => {
//     setSelectedDelegations(prev =>
//       prev.includes(delegation)
//         ? prev.filter(d => d !== delegation)
//         : [...prev, delegation]
//     );
//   };

//   const resetWizard = () => {
//     setWizardStep(1);
//     setSelectedEventId('');
//     setCampaignName('');
//     setSelectedRoles([]);
//     setSelectedDelegations([]);
//     setSelectedParticipantIds([]);
//     setAudienceMode('role');
//     setParticipantSearchTerm('');
//     setSelectedTemplateId('');
//     setRsvpDeadline('');
//     setCustomMessage('');
//   };

//   const createLocalCampaignInvitations = (payload: {
//     campaignId: string;
//     campaignName: string;
//     selectedEventId: string;
//     selectedTemplateId: string;
//     selectedTemplate?: EMSInvitationTemplate;
//     audience: EMSParticipant[];
//     rsvpDeadline: string;
//     selectedRoles: ParticipantRole[];
//   }) => {
//     const participantEmailMap = Object.fromEntries(
//       payload.audience.map(participant => [participant.id, participant.email])
//     ) as Record<string, string>;

//     const localCampaign = campaignStore.createWithId(payload.campaignId, {
//       name: payload.campaignName,
//       eventId: payload.selectedEventId,
//       templateId: payload.selectedTemplateId,
//       targetRoles: payload.selectedRoles,
//       targetNationalities: [],
//       rsvpDeadline: payload.rsvpDeadline,
//       scheduledAt: null,
//       sentAt: null,
//       status: 'Draft',
//       audienceIds: payload.audience.map(participant => participant.id),
//       templateName: payload.selectedTemplate?.name,
//       subject: payload.selectedTemplate?.subject,
//       content: payload.selectedTemplate?.body,
//     } as any);

//     const createdInvitations = invitationStore.bulkCreateForCampaign(
//       localCampaign.id,
//       payload.selectedEventId,
//       payload.selectedTemplateId,
//       payload.audience.map(participant => participant.id),
//       payload.rsvpDeadline,
//       participantEmailMap
//     );

//     campaignStore.updateStats(localCampaign.id);
//     return { localCampaign, createdInvitations };
//   };

//   const handleCreateCampaign = async () => {
//     if (!selectedEventId || !campaignName || !selectedTemplateId || !rsvpDeadline) {
//       toast({ title: 'Missing fields', description: 'Please fill in all required fields', variant: 'destructive' });
//       return;
//     }

//     const audience = getFilteredAudience();
//     if (audience.length === 0) {
//       toast({ title: 'No audience', description: 'No participants match your criteria', variant: 'destructive' });
//       return;
//     }

//     setIsActionLoading(true);
//     try {
//       const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
//       const tempCampaignId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
//       const { createdInvitations } = createLocalCampaignInvitations({
//         campaignId: tempCampaignId,
//         campaignName,
//         selectedEventId,
//         selectedTemplateId,
//         selectedTemplate,
//         audience,
//         rsvpDeadline,
//         selectedRoles,
//       });

//       const backendCampaign = await campaignApi.createCampaign({
//         name: campaignName,
//         subject: selectedTemplate?.subject || campaignName,
//         content: selectedTemplate?.body || customMessage,
//         templateId: getBackendTemplateId(selectedTemplate),

//         eventId: selectedEventId,
//         rsvpDeadline: rsvpDeadline,
//         audienceIds: audience.map(p => p.id),
//         // invitationIds: createdInvitations.map(i => i.id),
//         roleFilters: audienceMode === 'role' ? selectedRoles : undefined,
//         targetDelegationIds: audienceMode === 'delegation' 
//           ? selectedDelegations.map(name => approvedDelegations.find(d => (d.country || d.name) === name)?.id).filter(Boolean) as string[]
//           : undefined,
//       }).catch((error) => {
//         console.warn('Backend campaign create failed, ignored for local flow:', error);
//         return null;
//       });

//       const backendCampaignId = backendCampaign?.id;
//       if (backendCampaignId) {
//         const rekeyedCampaign = campaignStore.rekey(tempCampaignId, backendCampaignId);
//         if (rekeyedCampaign) {
//           invitationStore.rekeyCampaign(tempCampaignId, backendCampaignId);
//         }
//       }

//       toast({ title: 'Campaign created', description: `Created ${createdInvitations.length} invitations for participants.` });
//       setIsCreateOpen(false);
//       resetWizard();
//       setRefreshKey(k => k + 1);
//     } catch (error) {
//       console.error('Failed to create campaign locally:', error);
//       toast({ title: 'Error', description: 'Failed to create campaign', variant: 'destructive' });
//     } finally {
//       setIsActionLoading(false);
//     }
//   };

//   const ensureLocalInvitationsForCampaign = (campaignId: string) => {
//     const existing = invitationStore.getByCampaign(campaignId);
//     if (existing.length > 0) return existing;

//     let campaign = campaignStore.getById(campaignId) as any;
//     if (!campaign) {
//       campaign = apiCampaigns.find(c => c.id === campaignId);
//     }
//     if (!campaign) return [];

//     const audienceIds: string[] = Array.isArray(campaign.audienceIds) ? campaign.audienceIds : Array.isArray(campaign.targetParticipantIds) ? campaign.targetParticipantIds : [];
//     if (audienceIds.length === 0) return [];

//     return invitationStore.bulkCreateForCampaign(
//       campaignId,
//       campaign.eventId,
//       campaign.templateId || selectedTemplateId || '',
//       audienceIds,
//       campaign.rsvpDeadline || rsvpDeadline || '',
//       Object.fromEntries(
//         (campaign.audienceIds || audienceIds).map((participantId: string) => {
//           const participant = participants.find(p => p.id === participantId);
//           return [participantId, participant?.email || ''];
//         })
//       ) as Record<string, string>
//     );
//   };

//   const handleSendCampaign = async (campaignId: string) => {
//     setIsActionLoading(true);
//     try {
//       const created = ensureLocalInvitationsForCampaign(campaignId);
//       const sent = invitationStore.sendCampaign(campaignId);

//       campaignStore.update(campaignId, { status: 'Sent', sentAt: new Date().toISOString() } as any);
//       campaignStore.updateStats(campaignId);

//       // Sync status change to backend API so it stays Sent on refresh
//       await campaignApi.sendCampaignNow(campaignId).catch((error) => {
//         console.warn('Backend sendCampaignNow failed, continuing with local flow:', error);
//       });

//       toast({ title: 'Campaign sent', description: `Delivered ${sent || created.length} invitations to selected participants.` });
//       setRefreshKey(k => k + 1);
//       setViewCampaignOpen(false);
//     } catch (error: any) {
//       console.error('Failed to send campaign locally:', error);
//       toast({ title: 'Error', description: 'Failed to send campaign', variant: 'destructive' });
//     } finally {
//       setIsActionLoading(false);
//     }
//   };

//   const handleDeleteCampaign = async (campaignId: string) => {
//     if (!confirm('Are you sure you want to delete this campaign?')) return;

//     setIsActionLoading(true);
//     try {
//       await campaignApi.deleteCampaign(campaignId);
//       toast({ title: 'Campaign deleted' });
//       setRefreshKey(k => k + 1);
//     } catch (error) {
//       console.error('Failed to delete campaign:', error);
//       toast({ title: 'Error', description: 'Failed to delete campaign', variant: 'destructive' });
//     } finally {
//       setIsActionLoading(false);
//     }
//   };

//   const handleViewCampaign = async (campaign: EMSCampaign) => {
//     setIsActionLoading(true);
//     try {
//       const details = await campaignApi.getCampaignById(campaign.id);
//       setSelectedCampaign(details as any as EMSCampaign);
//       setViewCampaignOpen(true);
//     } catch (error) {
//       console.error('Failed to fetch campaign details:', error);
//       setSelectedCampaign(campaign);
//       setViewCampaignOpen(true);
//     } finally {
//       setIsActionLoading(false);
//     }
//   };

//   const copyInviteLink = (token: string) => {
//     const link = `${window.location.origin}/invite/${token}`;
//     navigator.clipboard.writeText(link);
//     toast({ title: 'Link copied', description: 'Invitation link copied to clipboard' });
//   };

//   const getParticipantName = (participantId: string) => {
//     const p = participants.find(p => p.id === participantId);
//     return p ? `${p.firstName} ${p.lastName}` : 'Unknown';
//   };

//   const renderWizardStep = () => {
//     switch (wizardStep) {
//       case 1:
//         return (
//           <div className="space-y-4">
//             <h3 className="font-medium">{t('invitations.step_1_select_event')}</h3>
//             {isLoading ? (
//               <div className="flex justify-center py-8">
//                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
//               </div>
//             ) : events.length === 0 ? (
//               <Card className="border-dashed">
//                 <CardContent className="p-6 text-center">
//                   <p className="text-muted-foreground mb-2">{t('invitations.no_events_created')}</p>
//                   <Button variant="outline" onClick={() => navigate('/admin/events')}>
//                     {t('invitations.create_event_first')}
//                   </Button>
//                 </CardContent>
//               </Card>
//             ) : (
//               <>
//                 <Select value={selectedEventId} onValueChange={setSelectedEventId}>
//                   <SelectTrigger>
//                     <SelectValue placeholder={t('invitations.choose_event')} />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {events.map(event => (
//                       <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//                 <div className="grid gap-2">
//                   <Label>{t('invitations.campaign_name_label')}</Label>
//                   <Input
//                     placeholder={t('invitations.campaign_name_placeholder')}
//                     value={campaignName}
//                     onChange={(e) => setCampaignName(e.target.value)}
//                   />
//                 </div>
//                 <div className="grid gap-2">
//                   <Label>{t('invitations.rsvp_deadline_label')}</Label>
//                   <Input
//                     type="date"
//                     value={rsvpDeadline}
//                     onChange={(e) => setRsvpDeadline(e.target.value)}
//                   />
//                 </div>
//               </>
//             )}
//           </div>
//         );
//       case 2:
//         return (
//           <div className="space-y-4">
//             <h3 className="font-medium">{t('invitations.step_2_select_audience')}</h3>
//             {isLoading ? (
//               <div className="flex justify-center py-8">
//                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
//               </div>
//             ) : participants.length === 0 ? (
//               <Card className="border-dashed">
//                 <CardContent className="p-6 text-center">
//                   <p className="text-muted-foreground mb-2">{t('invitations.no_participants_in_system')}</p>
//                   <Button variant="outline" onClick={() => navigate('/admin/participants')}>
//                     {t('invitations.add_participants_first')}
//                   </Button>
//                 </CardContent>
//               </Card>
//             ) : (
//               <>
//                 {/* Selection Mode Toggle */}
//                 <div className="flex gap-2">
//                   <Button
//                     variant={audienceMode === 'role' ? 'default' : 'outline'}
//                     size="sm"
//                     onClick={() => {
//                       setAudienceMode('role');
//                       setSelectedDelegations([]);
//                       setSelectedParticipantIds([]);
//                     }}
//                   >
//                     Filter by Role
//                   </Button>
//                   <Button
//                     variant={audienceMode === 'delegation' ? 'default' : 'outline'}
//                     size="sm"
//                     onClick={() => {
//                       setAudienceMode('delegation');
//                       setSelectedRoles([]);
//                       setSelectedParticipantIds([]);
//                     }}
//                   >
//                     {t('invitations.filter_by_delegation')}
//                   </Button>
//                   <Button
//                     variant={audienceMode === 'individual' ? 'default' : 'outline'}
//                     size="sm"
//                     onClick={() => {
//                       setAudienceMode('individual');
//                       setSelectedRoles([]);
//                       setSelectedDelegations([]);
//                     }}
//                   >
//                     {t('invitations.select_individuals')}
//                   </Button>
//                 </div>

//                 {audienceMode === 'role' && (
//                   <div className="grid gap-2">
//                     <Label>{t('invitations.filter_by_role_label')}</Label>
//                     <div className="flex flex-wrap gap-2">
//                       {ROLES.map(role => (
//                         <Badge
//                           key={role}
//                           variant={selectedRoles.includes(role) ? 'default' : 'outline'}
//                           className="cursor-pointer"
//                           onClick={() => toggleRole(role)}
//                         >
//                           {role}
//                         </Badge>
//                       ))}
//                     </div>
//                   </div>
//                 )}
//                 {audienceMode === 'delegation' && (
//                   <div className="grid gap-2">
//                     <Label>{t('invitations.filter_by_delegation_label')}</Label>
//                     <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-1">
//                       {Array.from(new Set(approvedDelegations.map(del => del.country || del.name).filter(Boolean)))
//                         .sort()
//                         .map(org => (
//                           <Badge
//                             key={org}
//                             variant={selectedDelegations.includes(org) ? 'default' : 'outline'}
//                             className="cursor-pointer text-md"
//                             onClick={() => toggleDelegation(org)}
//                           >
//                             {org}
//                           </Badge>
//                         ))}
//                     </div>
//                     {approvedDelegations.length === 0 && (
//                       <p className="text-sm text-muted-foreground">{t('invitations.no_delegations_found')}</p>
//                     )}
//                   </div>
//                 )}
//                 {audienceMode === 'individual' && (
//                   <div className="space-y-3">
//                     <div className="relative">
//                       <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//                       <Input
//                         placeholder={t('invitations.search_participants_placeholder')}
//                         value={participantSearchTerm}
//                         onChange={(e) => setParticipantSearchTerm(e.target.value)}
//                         className="pl-10"
//                       />
//                     </div>
//                     <div className="max-h-60 overflow-y-auto border rounded-lg">
//                       {filteredParticipantsForSelection.length === 0 ? (
//                         <p className="text-sm text-muted-foreground text-center py-4">
//                           {t('invitations.no_participants_found')}
//                         </p>
//                       ) : (
//                         filteredParticipantsForSelection.map(p => (
//                           <div
//                             key={p.id}
//                             className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${selectedParticipantIds.includes(p.id) ? 'bg-primary/5' : ''
//                               }`}
//                             onClick={() => toggleParticipant(p.id)}
//                           >
//                             <Checkbox
//                               checked={selectedParticipantIds.includes(p.id)}
//                               onCheckedChange={() => toggleParticipant(p.id)}
//                             />
//                             <div className="flex-1 min-w-0">
//                               <p className="font-medium text-sm truncate">
//                                 {p.firstName} {p.lastName}
//                               </p>
//                               <p className="text-xs text-muted-foreground truncate">
//                                 {p.email}
//                               </p>
//                             </div>
//                             <Badge variant="outline" className="text-xs">
//                               {p.role}
//                             </Badge>
//                           </div>
//                         ))
//                       )}
//                     </div>
//                     {selectedParticipantIds.length > 0 && (
//                       <Button
//                         variant="ghost"
//                         size="sm"
//                         onClick={() => setSelectedParticipantIds([])}
//                       >
//                         {t('invitations.clear_selection')}
//                       </Button>
//                     )}
//                   </div>
//                 )}

//                 <Card>
//                   <CardContent className="p-4">
//                     <p className="text-sm text-muted-foreground">{t('invitations.selected_audience')}</p>
//                     <p className="text-2xl font-bold">{t('common.participants_count', { count: getFilteredAudience().length })}</p>
//                   </CardContent>
//                 </Card>
//               </>
//             )}
//           </div>
//         );
//       case 3:
//         const selectedEvent3 = events.find(e => e.id === selectedEventId);
//         return (
//           <div className="space-y-4">
//             <h3 className="font-medium">{t('invitations.step_3_choose_template')}</h3>
//             {templates.length === 0 ? (
//               <Card className="border-dashed">
//                 <CardContent className="p-6 text-center">
//                   <p className="text-muted-foreground">{t('invitations.no_templates_available')}</p>
//                 </CardContent>
//               </Card>
//             ) : (
//               <div className="grid gap-2">
//                 {templates.map(template => {
//                   const isVIP = isVIPTemplate(template);
//                   return (
//                     <Card
//                       key={template.id}
//                       className={`cursor-pointer transition-colors ${selectedTemplateId === template.id ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/50'}`}
//                       onClick={() => setSelectedTemplateId(template.id)}
//                     >
//                       <CardContent className="p-4">
//                         <div className="flex justify-between items-start gap-3">
//                           <div className="flex-1">
//                             <div className="flex items-center gap-2 mb-1">
//                               <p className="font-medium">{template.name}</p>
//                               <Badge
//                                 variant={isVIP ? "default" : "secondary"}
//                                 className={isVIP ? "bg-amber-500 hover:bg-amber-600 text-amber-950 text-xs" : "text-xs"}
//                               >
//                                 {isVIP ? (
//                                   <>
//                                     <Crown className="h-3 w-3 mr-1" />
//                                     {t('invitations.vip')}
//                                   </>
//                                 ) : (
//                                   <>
//                                     <Star className="h-3 w-3 mr-1" />
//                                     {t('invitations.standard')}
//                                   </>
//                                 )}
//                               </Badge>
//                             </div>
//                             <p className="text-sm text-muted-foreground">{template.subject}</p>
//                           </div>
//                           <div className="flex items-center gap-2">
//                             <Button
//                               variant="ghost"
//                               size="sm"
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 setPreviewTemplate(template);
//                                 setPreviewOpen(true);
//                               }}
//                             >
//                               <Eye className="h-4 w-4 mr-1" />
//                               {t('invitations.preview')}
//                             </Button>
//                             <Checkbox checked={selectedTemplateId === template.id} />
//                           </div>
//                         </div>
//                       </CardContent>
//                     </Card>
//                   );
//                 })}
//               </div>
//             )}
//             <div className="grid gap-2">
//               <Label>{t('invitations.customize_message')}</Label>
//               <Textarea
//                 placeholder={t('invitations.customize_message_placeholder')}
//                 rows={4}
//                 value={customMessage}
//                 onChange={(e) => setCustomMessage(e.target.value)}
//               />
//             </div>
//           </div>
//         );
//       case 4:
//         const selectedEvent = events.find(e => e.id === selectedEventId);
//         const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
//         const audience = getFilteredAudience();

//         return (
//           <div className="space-y-4">
//             <h3 className="font-medium">{t('invitations.step_4_review_create')}</h3>
//             <Card>
//               <CardContent className="p-4 space-y-2">
//                 <div className="flex justify-between">
//                   <span className="text-muted-foreground">{t('common.event')}:</span>
//                   <span>{selectedEvent?.name || '-'}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-muted-foreground">{t('common.campaign')}:</span>
//                   <span>{campaignName || '-'}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-muted-foreground">{t('common.audience')}:</span>
//                   <span>{t('common.participants_count', { count: audience.length })}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-muted-foreground">{t('invitations.templates')}:</span>
//                   <span>{selectedTemplate?.name || '-'}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-muted-foreground">{t('invitations.rsvp_deadline')}:</span>
//                   <span>{rsvpDeadline || '-'}</span>
//                 </div>
//               </CardContent>
//             </Card>
//             <p className="text-sm text-muted-foreground">
//               {audience.length === 1
//                 ? t('invitations.review_create_desc_singular')
//                 : t('invitations.review_create_desc_plural', { count: audience.length })}
//               <br />
//               {t('invitations.review_create_subdesc')}
//             </p>
//           </div>
//         );
//       default:
//         return null;
//     }
//   };

//   // Campaign detail view
//   const CampaignDetailDialog = () => {
//     if (!selectedCampaign) return null;

//     const campInvitations = invitationStore.getByCampaign(selectedCampaign.id);
//     const eventName = (selectedCampaign as any)?.event?.name || events.find(e => e.id === selectedCampaign.eventId)?.name;
//     const campaignStats = getCampaignStats(selectedCampaign);

//     return (
//       <Dialog open={viewCampaignOpen} onOpenChange={setViewCampaignOpen}>
//         <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
//           <DialogHeader>
//             <DialogTitle>{selectedCampaign.name}</DialogTitle>
//             <DialogDescription>
//               {eventName || 'Unknown Event'} • {t('common.participants_count', { count: campInvitations.length })}
//             </DialogDescription>
//           </DialogHeader>

//           <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-4">
//             <Card>
//               <CardContent className="p-3 text-center">
//                 <p className="text-2xl font-bold">{campaignStats.sentCount}</p>
//                 <p className="text-xs text-muted-foreground">{t('invitations.delivered')}</p>
//               </CardContent>
//             </Card>
//             <Card>
//               <CardContent className="p-3 text-center">
//                 <p className="text-2xl font-bold text-success">{campaignStats.acceptedCount}</p>
//                 <p className="text-xs text-muted-foreground">{t('invitations.accepted')}</p>
//               </CardContent>
//             </Card>
//             <Card>
//               <CardContent className="p-3 text-center">
//                 <p className="text-2xl font-bold text-warning">{campaignStats.maybeCount}</p>
//                 <p className="text-xs text-muted-foreground">{t('common.maybe')}</p>
//               </CardContent>
//             </Card>
//             <Card>
//               <CardContent className="p-3 text-center">
//                 <p className="text-2xl font-bold text-destructive">{campaignStats.declinedCount}</p>
//                 <p className="text-xs text-muted-foreground">{t('events.declined')}</p>
//               </CardContent>
//             </Card>
//           </div>

//           {selectedCampaign.status === 'Draft' && (
//             <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-between mb-4">
//               <div>
//                 <p className="font-medium">{t('invitations.campaign_not_sent')}</p>
//                 <p className="text-sm text-muted-foreground">{t('invitations.click_send_to_deliver')}</p>
//               </div>
//               <Button onClick={() => {
//                 handleSendCampaign(selectedCampaign.id);
//                 setSelectedCampaign(campaignStore.getById(selectedCampaign.id) || null);
//               }}>
//                 <Send className="h-4 w-4 mr-2" />
//                 {t('invitations.send_now')}
//               </Button>
//             </div>
//           )}

//           <Table>
//             <TableHeader>
//               <TableRow>
//                 <TableHead>{t('common.participant')}</TableHead>
//                 <TableHead>{t('common.status')}</TableHead>
//                 <TableHead>{t('invitations.delivered')}</TableHead>
//                 <TableHead>{t('invitations.accepted')}</TableHead>
//                 <TableHead></TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {campInvitations.map((inv) => {
//                 const participant = participants.find(p => p.id === inv.participantId);
//                 return (
//                   <TableRow key={inv.id}>
//                     <TableCell>
//                       <div>
//                         <p className="font-medium">{participant ? `${participant.firstName} ${participant.lastName}` : 'Unknown'}</p>
//                         <p className="text-sm text-muted-foreground">{participant?.email}</p>
//                       </div>
//                     </TableCell>
//                     <TableCell>
//                       <StatusBadge status={inv.status} variant={getStatusVariant(inv.status)} />
//                     </TableCell>
//                     <TableCell className="text-sm text-muted-foreground">
//                       {inv.sentAt ? format(new Date(inv.sentAt), 'MMM d, HH:mm') : '-'}
//                     </TableCell>
//                     <TableCell className="text-sm text-muted-foreground">
//                       {inv.respondedAt ? format(new Date(inv.respondedAt), 'MMM d, HH:mm') : '-'}
//                     </TableCell>
//                     <TableCell>
//                       <Button variant="ghost" size="sm" onClick={() => copyInviteLink(inv.token)}>
//                         <Copy className="h-4 w-4" />
//                       </Button>
//                     </TableCell>
//                   </TableRow>
//                 );
//               })}
//             </TableBody>
//           </Table>
//         </DialogContent>
//       </Dialog>
//     );
//   };

//   return (
//     <div className="space-y-6">
//       <PageHeader
//         title={t('invitations.title')}
//         description={t('invitations.description')}
//         action={
//           <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetWizard(); }}>
//             <DialogTrigger asChild>
//               <Button><Plus className="h-4 w-4 me-2" />{t('invitations.create_campaign')}</Button>
//             </DialogTrigger>
//             <DialogContent className="max-w-2xl">
//               <DialogHeader>
//                 <DialogTitle>{t('invitations.create_campaign_title')}</DialogTitle>
//               </DialogHeader>
//               {/* Progress indicator */}
//               <div className="flex justify-between mb-6">
//                 {[1, 2, 3, 4].map((step) => (
//                   <div key={step} className="flex items-center">
//                     <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${wizardStep >= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
//                       }`}>
//                       {step}
//                     </div>
//                     {step < 4 && <div className={`w-12 sm:w-16 h-1 mx-1 sm:mx-2 ${wizardStep > step ? 'bg-primary' : 'bg-muted'}`} />}
//                   </div>
//                 ))}
//               </div>
//               {renderWizardStep()}
//               <DialogFooter className="mt-6">
//                 <Button variant="outline" onClick={() => setWizardStep(Math.max(1, wizardStep - 1))} disabled={wizardStep === 1}>
//                   {t('invitations.previous')}
//                 </Button>
//                 {wizardStep < 4 ? (
//                   <Button
//                     onClick={() => setWizardStep(wizardStep + 1)}
//                     disabled={
//                       (wizardStep === 1 && (!selectedEventId || !campaignName || !rsvpDeadline)) ||
//                       (wizardStep === 2 && getFilteredAudience().length === 0) ||
//                       (wizardStep === 3 && !selectedTemplateId)
//                     }
//                   >
//                     {t('invitations.next')}
//                   </Button>
//                 ) : (
//                   <Button onClick={handleCreateCampaign}>{t('common.create')}</Button>
//                 )}
//               </DialogFooter>
//             </DialogContent>
//           </Dialog>
//         }
//       />

//       {/* Stats */}
//       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//         <StatsCard title={t('invitations.total_sent')} value={stats.totalSent} icon={Send} />
//         <StatsCard title={t('invitations.delivered')} value={stats.delivered} icon={Mail} />
//         <StatsCard title={t('invitations.accepted')} value={stats.accepted} icon={CheckCircle} />
//         <StatsCard title={t('invitations.campaigns')} value={stats.campaigns} icon={Users} />
//       </div>

//       <Tabs value={activeTab} onValueChange={setActiveTab}>
//         <TabsList>
//           <TabsTrigger value="campaigns">{t('invitations.campaigns')}</TabsTrigger>
//           <TabsTrigger value="invitations">{t('invitations.all_invitations')}</TabsTrigger>
//           <TabsTrigger value="templates">{t('invitations.templates')}</TabsTrigger>
//         </TabsList>

//         <TabsContent value="campaigns" className="space-y-4 mt-4">
//           <div className="flex gap-2">
//             <div className="relative flex-1">
//               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//               <Input
//                 placeholder={t('invitations.search_placeholder')}
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="pl-10"
//               />
//             </div>
//             <Button variant="outline" size="icon" onClick={() => setRefreshKey(k => k + 1)}>
//               <RefreshCw className="h-4 w-4" />
//             </Button>
//           </div>

//           {filteredCampaigns.length === 0 ? (
//             <Card className="border-dashed">
//               <CardContent className="p-8 text-center">
//                 <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
//                 <h3 className="font-medium mb-2">{t('invitations.no_campaigns_yet')}</h3>
//                 <p className="text-muted-foreground mb-4">{t('invitations.no_campaigns_desc')}</p>
//                 <Button onClick={() => setIsCreateOpen(true)}>
//                   <Plus className="h-4 w-4 mr-2" />
//                   {t('invitations.create_campaign')}
//                 </Button>
//               </CardContent>
//             </Card>
//           ) : (
//             <Card>
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead>{t('common.campaign')}</TableHead>
//                     <TableHead>{t('common.event')}</TableHead>
//                     <TableHead>{t('common.audience')}</TableHead>
//                     <TableHead>{t('common.responses')}</TableHead>
//                     <TableHead>{t('common.status')}</TableHead>
//                     <TableHead></TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {filteredCampaigns.map((campaign) => (
//                     <TableRow key={campaign.id}>
//                       <TableCell>
//                         <div>
//                           <p className="font-medium">{campaign.name}</p>
//                           <p className="text-sm text-muted-foreground">
//                             {campaign.createdAt ? (() => {
//                               try {
//                                 const date = new Date(campaign.createdAt);
//                                 return isNaN(date.getTime()) ? '' : format(date, 'MMM d, yyyy');
//                               } catch (e) {
//                                 return '';
//                               }
//                             })() : ''}
//                           </p>
//                         </div>
//                       </TableCell>
//                       <TableCell className="text-sm">{getEventName(campaign)}</TableCell>
//                       <TableCell>{getCampaignStats(campaign).audienceSize}</TableCell>
//                       <TableCell>
//                         <div className="flex gap-1">
//                           <Badge variant="outline" className="bg-success/10 text-success border-success/20">
//                             {getCampaignStats(campaign).acceptedCount}
//                           </Badge>
//                           <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
//                             {getCampaignStats(campaign).maybeCount}
//                           </Badge>
//                           <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
//                             {getCampaignStats(campaign).declinedCount}
//                           </Badge>
//                         </div>
//                       </TableCell>
//                       <TableCell>
//                         <StatusBadge status={campaign.status} variant={getStatusVariant(campaign.status)} />
//                       </TableCell>
//                       <TableCell>
//                         <DropdownMenu>
//                           <DropdownMenuTrigger asChild>
//                             <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
//                           </DropdownMenuTrigger>
//                           <DropdownMenuContent align="end">
//                             <DropdownMenuItem onClick={() => handleViewCampaign(campaign)}>
//                               <Eye className="h-4 w-4 mr-2" />{t('invitations.view_details')}
//                             </DropdownMenuItem>
//                             {campaign.status === 'Draft' && (
//                               <DropdownMenuItem onClick={() => handleSendCampaign(campaign.id)}>
//                                 <Send className="h-4 w-4 mr-2" />{t('invitations.send_campaign')}
//                               </DropdownMenuItem>
//                             )}
//                             <DropdownMenuSeparator />
//                             <DropdownMenuItem
//                               className="text-destructive"
//                               onClick={() => handleDeleteCampaign(campaign.id)}
//                             >
//                               <Trash2 className="h-4 w-4 mr-2" />Delete
//                             </DropdownMenuItem>
//                           </DropdownMenuContent>
//                         </DropdownMenu>
//                       </TableCell>
//                     </TableRow>
//                   ))}
//                 </TableBody>
//               </Table>
//             </Card>
//           )}
//         </TabsContent>

//         <TabsContent value="invitations" className="space-y-4 mt-4">
//           {invitations.length === 0 ? (
//             <Card className="border-dashed">
//               <CardContent className="p-8 text-center">
//                 <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
//                 <h3 className="font-medium mb-2">{t('invitations.no_invitations_yet')}</h3>
//                 <p className="text-muted-foreground">{t('invitations.invitations_appear_here')}</p>
//               </CardContent>
//             </Card>
//           ) : (
//             <Card>
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead>{t('common.participant')}</TableHead>
//                     <TableHead>{t('common.event')}</TableHead>
//                     <TableHead>{t('common.status')}</TableHead>
//                     <TableHead>{t('invitations.rsvp_deadline')}</TableHead>
//                     <TableHead>{t('invitations.delivered')}</TableHead>
//                     <TableHead></TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {invitations.slice(0, 50).map((inv) => (
//                     <TableRow key={inv.id}>
//                       <TableCell>
//                         <p className="font-medium">{getParticipantName(inv.participantId)}</p>
//                       </TableCell>
//                       <TableCell className="text-sm">{getEventName(inv.eventId)}</TableCell>
//                       <TableCell>
//                         <StatusBadge status={inv.status} variant={getStatusVariant(inv.status)} />
//                       </TableCell>
//                       <TableCell className="text-sm text-muted-foreground">
//                         {inv.rsvpDeadline}
//                       </TableCell>
//                       <TableCell className="text-sm text-muted-foreground">
//                         {inv.sentAt ? format(new Date(inv.sentAt), 'MMM d') : '-'}
//                       </TableCell>
//                       <TableCell>
//                         <div className="flex gap-1">
//                           <Button variant="ghost" size="sm" onClick={() => copyInviteLink(inv.token)}>
//                             <Copy className="h-4 w-4" />
//                           </Button>
//                           <Button
//                             variant="ghost"
//                             size="sm"
//                             onClick={() => window.open(`/invite/${inv.token}`, '_blank')}
//                           >
//                             <ExternalLink className="h-4 w-4" />
//                           </Button>
//                         </div>
//                       </TableCell>
//                     </TableRow>
//                   ))}
//                 </TableBody>
//               </Table>
//             </Card>
//           )}
//         </TabsContent>

//         <TabsContent value="templates" className="space-y-4 mt-4">
//           <div className="grid md:grid-cols-2 gap-4">
//             {templates.map((template) => (
//               <Card key={template.id}>
//                 <CardHeader>
//                   <div className="flex justify-between items-start">
//                     <div>
//                       <CardTitle className="text-base">{template.name}</CardTitle>
//                       <Badge variant="outline" className="mt-1">{template.language}</Badge>
//                     </div>
//                     <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
//                   </div>
//                 </CardHeader>
//                 <CardContent>
//                   <p className="text-sm text-muted-foreground mb-2">{template.subject}</p>
//                   <div className="flex flex-wrap gap-1">
//                     {template.variables.slice(0, 3).map((v, i) => (
//                       <Badge key={i} variant="secondary" className="text-xs">{`{{${v}}}`}</Badge>
//                     ))}
//                     {template.variables.length > 3 && (
//                       <Badge variant="secondary" className="text-xs">+{template.variables.length - 3}</Badge>
//                     )}
//                   </div>
//                 </CardContent>
//               </Card>
//             ))}
//           </div>
//         </TabsContent>
//       </Tabs>

//       <CampaignDetailDialog />

//       {/* Template Preview Modal */}
//       <InvitationPreviewModal
//         open={previewOpen}
//         onOpenChange={setPreviewOpen}
//         template={previewTemplate}
//         event={events.find(e => e.id === selectedEventId)}
//         rsvpDeadline={rsvpDeadline}
//       />
//     </div>
//   );
// };

// export default InvitationsPage;





import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { StatsCard } from '@/components/common/StatsCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  eventStore,
  participantStore,
  templateStore,
  campaignStore,
  invitationStore,
  initializeStore,
  EMSEvent,
  EMSParticipant,
  EMSCampaign,
  EMSInvitation,
  EMSInvitationTemplate,
  InvitationStatus,
} from '@/lib/emsStore';
import { ParticipantRole } from '@/data/mockData';
import { Mail, Send, Users, CheckCircle, Plus, Search, Eye, MoreHorizontal, FileText, Clock, XCircle, HelpCircle, Copy, ExternalLink, Trash2, Play, RefreshCw, Crown, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { InvitationPreviewModal } from '@/components/invitations/InvitationPreviewModal';
import * as campaignApi from '@/api/campaignApi';
import { getEvents } from '@/api/eventApi';
import { getParticipants } from '@/api/participantApi';
import { getAllDelegations } from '@/api/delegationApi';
import { Loader2 } from 'lucide-react';

// Check if template is VIP based on name/subject
const isVIPTemplate = (template: EMSInvitationTemplate): boolean => {
  const name = template.name.toLowerCase();
  const subject = template.subject.toLowerCase();
  return name.includes('vip') || name.includes('exclusive') ||
    subject.includes('vip') || subject.includes('exclusive');
};

// Real backend UUIDs for invitation templates
const BACKEND_TEMPLATE_IDS = {
  VIP: '03a64d7b-50df-4be1-a97f-fe9182321174',
  STANDARD: 'a424a3fd-3afe-4357-a179-41794ff34197',
};

// Map a local template to its real backend UUID
const getBackendTemplateId = (template: EMSInvitationTemplate | undefined): string => {
  if (!template) return BACKEND_TEMPLATE_IDS.STANDARD;
  // If the ID is already a real backend UUID, use it directly
  if (template.id === BACKEND_TEMPLATE_IDS.VIP || template.id === BACKEND_TEMPLATE_IDS.STANDARD) {
    return template.id;
  }
  return isVIPTemplate(template) ? BACKEND_TEMPLATE_IDS.VIP : BACKEND_TEMPLATE_IDS.STANDARD;
};

const ROLES: ParticipantRole[] = ['VVIP', 'VIP', 'Athlete', 'Official', 'Judge', 'Media', 'Fan'];


const InvitationsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const [activeTab, setActiveTab] = useState('campaigns');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [apiCampaigns, setApiCampaigns] = useState<campaignApi.Campaign[]>([]);
  const [apiEvents, setApiEvents] = useState<EMSEvent[]>([]);
  const [apiParticipants, setApiParticipants] = useState<EMSParticipant[]>([]);
  const [apiDelegations, setApiDelegations] = useState<any[]>([]);

  // Wizard form state
  const [selectedEventId, setSelectedEventId] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<ParticipantRole[]>([]);
  const [selectedDelegations, setSelectedDelegations] = useState<string[]>([]);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [audienceMode, setAudienceMode] = useState<'role' | 'individual' | 'delegation'>('role');
  const [participantSearchTerm, setParticipantSearchTerm] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [rsvpDeadline, setRsvpDeadline] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  // View states
  const [selectedCampaign, setSelectedCampaign] = useState<EMSCampaign | null>(null);
  const [viewCampaignOpen, setViewCampaignOpen] = useState(false);

  // Template preview state
  const [previewTemplate, setPreviewTemplate] = useState<EMSInvitationTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Initialize store and fetch API data
  useEffect(() => {
    initializeStore();
    loadCampaigns();
  }, [refreshKey]);

  const loadCampaigns = async () => {
    setIsLoading(true);
    try {
      const [campaignData, eventData, participantData, delegationData] = await Promise.all([
        campaignApi.getCampaigns(),
        getEvents(),
        getParticipants(),
        getAllDelegations().catch(() => [])
      ]);
      setApiCampaigns(Array.isArray(campaignData) ? campaignData : []);
      setApiEvents(Array.isArray(eventData) ? eventData : []);
      setApiParticipants(Array.isArray(participantData) ? participantData : []);
      setApiDelegations(Array.isArray(delegationData) ? delegationData : []);
    } catch (error) {
      console.error('Failed to load invitations data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data
  const events = useMemo(() => {
    if (Array.isArray(apiEvents) && apiEvents.length > 0) return apiEvents;
    return eventStore.getAll();
  }, [apiEvents, refreshKey]);

  const participants = useMemo(() => {
    if (Array.isArray(apiParticipants) && apiParticipants.length > 0) return apiParticipants;
    return participantStore.getAll();
  }, [apiParticipants, refreshKey]);

  const templates = useMemo(() => templateStore.getAll(), [refreshKey]);

  const campaigns = useMemo(() => {
    if (Array.isArray(apiCampaigns) && apiCampaigns.length > 0) {
      const camps = apiCampaigns as any as EMSCampaign[];
      if (eventId) {
        return camps.filter(c => c.eventId === eventId);
      }
      return camps;
    }
    return [];
  }, [apiCampaigns, refreshKey, eventId]);

  const invitations = useMemo(() => {
    const localInvitations = invitationStore.getAll();
    if (eventId) {
      return localInvitations.filter(inv => inv.eventId === eventId);
    }
    return localInvitations;
  }, [refreshKey, eventId]);

  // Calculate stats
  const stats = useMemo(() => ({
    totalSent: (invitations || []).filter(i => i.sentAt).length,
    delivered: (invitations || []).filter(i => i.deliveredAt).length,
    accepted: (invitations || []).filter(i => i.status === 'Accepted').length,
    campaigns: (campaigns || []).length,
  }), [invitations, campaigns]);

  const getStatusVariant = (status: string): 'success' | 'info' | 'warning' | 'default' | 'destructive' => {
    switch (status) {
      case 'Completed':
      case 'Accepted': return 'success';
      case 'Sent':
      case 'Delivered':
      case 'Opened': return 'info';
      case 'Scheduled':
      case 'Pending':
      case 'Maybe': return 'warning';
      case 'Declined':
      case 'Expired': return 'destructive';
      case 'Draft':
      default: return 'default';
    }
  };

  const getEventName = (campaignOrEventId: EMSCampaign | { eventId?: string; event?: { id?: string; name?: string } } | string) => {
    if (typeof campaignOrEventId === 'string') {
      return events.find(e => e.id === campaignOrEventId)?.name || 'Unknown Event';
    }

    if ((campaignOrEventId as any)?.event?.name) return (campaignOrEventId as any).event.name;
    const eventId = (campaignOrEventId as any)?.eventId;
    return events.find(e => e.id === eventId)?.name || 'Unknown Event';
  };

  const getCampaignStats = (campaign: EMSCampaign | { id: string; stats?: any }) => {
    const invitationsForCampaign = invitationStore.getByCampaign(campaign.id);
    return {
      audienceSize: invitationsForCampaign.length || campaign.stats?.audienceSize || 0,
      sentCount: invitationsForCampaign.filter(i => i.sentAt).length || campaign.stats?.sentCount || 0,
      deliveredCount: invitationsForCampaign.filter(i => i.deliveredAt).length || campaign.stats?.deliveredCount || 0,
      openedCount: invitationsForCampaign.filter(i => i.openedAt).length || campaign.stats?.openedCount || 0,
      acceptedCount: invitationsForCampaign.filter(i => i.status === 'Accepted').length || campaign.stats?.acceptedCount || 0,
      maybeCount: invitationsForCampaign.filter(i => i.status === 'Maybe').length || campaign.stats?.maybeCount || 0,
      declinedCount: invitationsForCampaign.filter(i => i.status === 'Declined').length || campaign.stats?.declinedCount || 0,
    };
  };

  const filteredCampaigns = campaigns.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const approvedDelegations = useMemo(() => {
    return apiDelegations.filter(d =>
      d.status === 'Approved' &&
      (d.eventId === selectedEventId || !selectedEventId)
    );
  }, [apiDelegations, selectedEventId]);

  // Get audience based on filters
  const getFilteredAudience = (): EMSParticipant[] => {
    if (!selectedEventId) return [];

    if (audienceMode === 'individual') {
      return participants.filter(p => selectedParticipantIds.includes(p.id));
    }

    if (audienceMode === 'delegation') {
      const selectedCountries = selectedDelegations
        .map(id => {
          const del = approvedDelegations.find(d => (d.id || d._id) === id);
          return (del?.country || del?.name || '').toLowerCase();
        })
        .filter(Boolean);

      if (selectedCountries.length > 0) {
        return participants.filter(p => {
          const orgLower = (p.organization || '').toLowerCase();
          const natLower = (p.nationality || '').toLowerCase();
          return selectedCountries.some(c =>
            orgLower.includes(c) || c.includes(orgLower) || natLower === c
          );
        });
      }
      return approvedDelegations.length > 0
        ? participants.filter(p => {
          return approvedDelegations.some(del => {
            const countryLower = (del.country || '').toLowerCase();
            const orgLower = (p.organization || '').toLowerCase();
            return countryLower && (orgLower.includes(countryLower) || countryLower.includes(orgLower));
          });
        })
        : [];
    }

    return participants.filter(p =>
      selectedRoles.length === 0 || selectedRoles.includes(p.role)
    );
  };

  const filteredParticipantsForSelection = participants.filter(p => {
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
    const searchLower = participantSearchTerm.toLowerCase();
    return fullName.includes(searchLower) || p.email.toLowerCase().includes(searchLower);
  });

  const toggleParticipant = (participantId: string) => {
    setSelectedParticipantIds(prev =>
      prev.includes(participantId)
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  };

  const toggleRole = (role: ParticipantRole) => {
    setSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const toggleDelegation = (delegationId: string) => {
    setSelectedDelegations(prev =>
      prev.includes(delegationId)
        ? prev.filter(d => d !== delegationId)
        : [...prev, delegationId]
    );
  };

  const resetWizard = () => {
    setWizardStep(1);
    setSelectedEventId('');
    setCampaignName('');
    setSelectedRoles([]);
    setSelectedDelegations([]);
    setSelectedParticipantIds([]);
    setAudienceMode('role');
    setParticipantSearchTerm('');
    setSelectedTemplateId('');
    setRsvpDeadline('');
    setCustomMessage('');
  };

  const createLocalCampaignInvitations = (payload: {
    campaignId: string;
    campaignName: string;
    selectedEventId: string;
    selectedTemplateId: string;
    selectedTemplate?: EMSInvitationTemplate;
    audience: EMSParticipant[];
    rsvpDeadline: string;
    selectedRoles: ParticipantRole[];
    targetManagerIds?: string[];
  }) => {
    const participantEmailMap = Object.fromEntries(
      payload.audience.map(participant => [participant.id, participant.email])
    ) as Record<string, string>;

    const localCampaign = campaignStore.createWithId(payload.campaignId, {
      name: payload.campaignName,
      eventId: payload.selectedEventId,
      templateId: payload.selectedTemplateId,
      targetRoles: payload.selectedRoles,
      targetNationalities: [],
      targetManagerIds: payload.targetManagerIds,
      rsvpDeadline: payload.rsvpDeadline,
      scheduledAt: null,
      sentAt: null,
      status: 'Draft',
      audienceIds: payload.audience.map(participant => participant.id),
      templateName: payload.selectedTemplate?.name,
      subject: payload.selectedTemplate?.subject,
      content: payload.selectedTemplate?.body,
    } as any);

    const createdInvitations = invitationStore.bulkCreateForCampaign(
      localCampaign.id,
      payload.selectedEventId,
      payload.selectedTemplateId,
      payload.audience.map(participant => participant.id),
      payload.rsvpDeadline,
      participantEmailMap
    );

    campaignStore.updateStats(localCampaign.id);
    return { localCampaign, createdInvitations };
  };

  const handleCreateCampaign = async () => {
    if (!selectedEventId || !campaignName || !selectedTemplateId || !rsvpDeadline) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    const audience = getFilteredAudience();
    if (audience.length === 0) {
      toast({ title: 'No audience', description: 'No participants match your criteria', variant: 'destructive' });
      return;
    }

    setIsActionLoading(true);
    try {
      const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

      const computedTargetManagerIds = audienceMode === 'delegation' && selectedDelegations.length > 0
        ? Array.from(new Set(
            selectedDelegations
              .map(id => {
                const del = approvedDelegations.find(d => (d.id || d._id) === id);
                return del?.managerId || del?.manager_id || del?.manager?.id || null;
              })
              .filter(Boolean)
          ))
        : undefined;

      const tempCampaignId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const { createdInvitations } = createLocalCampaignInvitations({
        campaignId: tempCampaignId,
        campaignName,
        selectedEventId,
        selectedTemplateId,
        selectedTemplate,
        audience,
        rsvpDeadline,
        selectedRoles,
        targetManagerIds: computedTargetManagerIds,
      });

      const backendCampaign = await campaignApi.createCampaign({
        name: campaignName,
        subject: selectedTemplate?.subject || campaignName,
        content: selectedTemplate?.body || customMessage,
        templateId: getBackendTemplateId(selectedTemplate),

        eventId: selectedEventId,
        rsvpDeadline: rsvpDeadline,
        audienceIds: audience.map(p => p.id),
        roleFilters: audienceMode === 'role' ? selectedRoles : undefined,
        targetDelegationIds: audienceMode === 'delegation' && selectedDelegations.length > 0
          ? selectedDelegations.filter(Boolean) as string[]
          : undefined,
        targetManagerIds: computedTargetManagerIds,
      }).catch((error) => {
        console.warn('Backend campaign create failed, ignored for local flow:', error);
        return null;
      });

      const backendCampaignId = backendCampaign?.id;
      if (backendCampaignId) {
        const rekeyedCampaign = campaignStore.rekey(tempCampaignId, backendCampaignId);
        if (rekeyedCampaign) {
          invitationStore.rekeyCampaign(tempCampaignId, backendCampaignId);
        }
      }

      toast({ title: 'Campaign created', description: `Created ${createdInvitations.length} invitations for participants.` });
      setIsCreateOpen(false);
      resetWizard();
      setRefreshKey(k => k + 1);
    } catch (error) {
      console.error('Failed to create campaign locally:', error);
      toast({ title: 'Error', description: 'Failed to create campaign', variant: 'destructive' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const ensureLocalInvitationsForCampaign = (campaignId: string) => {
    const existing = invitationStore.getByCampaign(campaignId);

    let campaign = campaignStore.getById(campaignId) as any;
    if (!campaign) {
      campaign = apiCampaigns.find(c => c.id === campaignId);
    }
    if (!campaign) return existing;

    const audienceIds: string[] = Array.isArray(campaign.audienceIds)
      ? campaign.audienceIds
      : Array.isArray(campaign.targetParticipantIds)
        ? campaign.targetParticipantIds
        : [];
    if (audienceIds.length === 0) return existing;

    // Sirf wahi audienceIds ke liye invitation banao jinke liye abhi tak nahi bani.
    // Participant-id basis par duplicate-check karo — sirf existing.length > 0 kaafi nahi,
    // kyun ke campaign ID rekey hone ke baad agar local invitations purani campaignId se
    // linked reh gayi hon to getByCampaign(campaignId) khali return karega aur invitations
    // dobara (duplicate) bulk-create ho jayengi.
    const existingParticipantIds = new Set(existing.map(inv => inv.participantId));
    const missingIds = audienceIds.filter(id => !existingParticipantIds.has(id));

    if (missingIds.length === 0) return existing;

    const created = invitationStore.bulkCreateForCampaign(
      campaignId,
      campaign.eventId,
      campaign.templateId || selectedTemplateId || '',
      missingIds,
      campaign.rsvpDeadline || rsvpDeadline || '',
      Object.fromEntries(
        missingIds.map((participantId: string) => {
          const participant = participants.find(p => p.id === participantId);
          return [participantId, participant?.email || ''];
        })
      ) as Record<string, string>
    );

    return [...existing, ...created];
  };

  const handleSendCampaign = async (campaignId: string) => {
    setIsActionLoading(true);
    try {
      const created = ensureLocalInvitationsForCampaign(campaignId);
      const sent = invitationStore.sendCampaign(campaignId);

      campaignStore.update(campaignId, { status: 'Sent', sentAt: new Date().toISOString() } as any);
      campaignStore.updateStats(campaignId);

      // Sync status change to backend API so it stays Sent on refresh
      await campaignApi.sendCampaignNow(campaignId).catch((error) => {
        console.warn('Backend sendCampaignNow failed, continuing with local flow:', error);
      });

      toast({ title: 'Campaign sent', description: `Delivered ${sent || created.length} invitations to selected participants.` });
      setRefreshKey(k => k + 1);
      setViewCampaignOpen(false);
    } catch (error: any) {
      console.error('Failed to send campaign locally:', error);
      toast({ title: 'Error', description: 'Failed to send campaign', variant: 'destructive' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    setIsActionLoading(true);
    try {
      await campaignApi.deleteCampaign(campaignId);
      toast({ title: 'Campaign deleted' });
      setRefreshKey(k => k + 1);
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      toast({ title: 'Error', description: 'Failed to delete campaign', variant: 'destructive' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleViewCampaign = async (campaign: EMSCampaign) => {
    setIsActionLoading(true);
    try {
      const details = await campaignApi.getCampaignById(campaign.id);
      setSelectedCampaign(details as any as EMSCampaign);
      setViewCampaignOpen(true);
    } catch (error) {
      console.error('Failed to fetch campaign details:', error);
      setSelectedCampaign(campaign);
      setViewCampaignOpen(true);
    } finally {
      setIsActionLoading(false);
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Link copied', description: 'Invitation link copied to clipboard' });
  };

  const getParticipantName = (participantId: string) => {
    const p = participants.find(p => p.id === participantId);
    return p ? `${p.firstName} ${p.lastName}` : 'Unknown';
  };

  const renderWizardStep = () => {
    switch (wizardStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="font-medium">{t('invitations.step_1_select_event')}</h3>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : events.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground mb-2">{t('invitations.no_events_created')}</p>
                  <Button variant="outline" onClick={() => navigate('/admin/events')}>
                    {t('invitations.create_event_first')}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('invitations.choose_event')} />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map(event => (
                      <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid gap-2">
                  <Label>{t('invitations.campaign_name_label')}</Label>
                  <Input
                    placeholder={t('invitations.campaign_name_placeholder')}
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t('invitations.rsvp_deadline_label')}</Label>
                  <Input
                    type="date"
                    value={rsvpDeadline}
                    onChange={(e) => setRsvpDeadline(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="font-medium">{t('invitations.step_2_select_audience')}</h3>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : participants.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground mb-2">{t('invitations.no_participants_in_system')}</p>
                  <Button variant="outline" onClick={() => navigate('/admin/participants')}>
                    {t('invitations.add_participants_first')}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Selection Mode Toggle */}
                <div className="flex gap-2">
                  <Button
                    variant={audienceMode === 'role' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setAudienceMode('role');
                      setSelectedDelegations([]);
                      setSelectedParticipantIds([]);
                    }}
                  >
                    Filter by Role
                  </Button>
                  <Button
                    variant={audienceMode === 'delegation' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setAudienceMode('delegation');
                      setSelectedRoles([]);
                      setSelectedParticipantIds([]);
                    }}
                  >
                    {t('invitations.filter_by_delegation')}
                  </Button>
                  <Button
                    variant={audienceMode === 'individual' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setAudienceMode('individual');
                      setSelectedRoles([]);
                      setSelectedDelegations([]);
                    }}
                  >
                    {t('invitations.select_individuals')}
                  </Button>
                </div>

                {audienceMode === 'role' && (
                  <div className="grid gap-2">
                    <Label>{t('invitations.filter_by_role_label')}</Label>
                    <div className="flex flex-wrap gap-2">
                      {ROLES.map(role => (
                        <Badge
                          key={role}
                          variant={selectedRoles.includes(role) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleRole(role)}
                        >
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {audienceMode === 'delegation' && (
                  <div className="grid gap-2">
                    <Label>{t('invitations.filter_by_delegation_label')}</Label>
                    <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-1">
                      {approvedDelegations
                        .filter(del => del.country || del.name)
                        .sort((a, b) => (a.country || a.name || '').localeCompare(b.country || b.name || ''))
                        .map(del => {
                          const delId = del.id || del._id;
                          const label = del.country || del.name;
                          return (
                            <Badge
                              key={delId}
                              variant={selectedDelegations.includes(delId) ? 'default' : 'outline'}
                              className="cursor-pointer text-md"
                              onClick={() => toggleDelegation(delId)}
                            >
                              {label}
                            </Badge>
                          );
                        })}
                    </div>
                    {approvedDelegations.length === 0 && (
                      <p className="text-sm text-muted-foreground">{t('invitations.no_delegations_found')}</p>
                    )}
                  </div>
                )}
                {audienceMode === 'individual' && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t('invitations.search_participants_placeholder')}
                        value={participantSearchTerm}
                        onChange={(e) => setParticipantSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto border rounded-lg">
                      {filteredParticipantsForSelection.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {t('invitations.no_participants_found')}
                        </p>
                      ) : (
                        filteredParticipantsForSelection.map(p => (
                          <div
                            key={p.id}
                            className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${selectedParticipantIds.includes(p.id) ? 'bg-primary/5' : ''
                              }`}
                            onClick={() => toggleParticipant(p.id)}
                          >
                            <Checkbox
                              checked={selectedParticipantIds.includes(p.id)}
                              onCheckedChange={() => toggleParticipant(p.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {p.firstName} {p.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {p.email}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {p.role}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                    {selectedParticipantIds.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedParticipantIds([])}
                      >
                        {t('invitations.clear_selection')}
                      </Button>
                    )}
                  </div>
                )}

                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">{t('invitations.selected_audience')}</p>
                    <p className="text-2xl font-bold">{t('common.participants_count', { count: getFilteredAudience().length })}</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        );
      case 3:
        const selectedEvent3 = events.find(e => e.id === selectedEventId);
        return (
          <div className="space-y-4">
            <h3 className="font-medium">{t('invitations.step_3_choose_template')}</h3>
            {templates.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">{t('invitations.no_templates_available')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-2">
                {templates.map(template => {
                  const isVIP = isVIPTemplate(template);
                  return (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-colors ${selectedTemplateId === template.id ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/50'}`}
                      onClick={() => setSelectedTemplateId(template.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">{template.name}</p>
                              <Badge
                                variant={isVIP ? "default" : "secondary"}
                                className={isVIP ? "bg-amber-500 hover:bg-amber-600 text-amber-950 text-xs" : "text-xs"}
                              >
                                {isVIP ? (
                                  <>
                                    <Crown className="h-3 w-3 mr-1" />
                                    {t('invitations.vip')}
                                  </>
                                ) : (
                                  <>
                                    <Star className="h-3 w-3 mr-1" />
                                    {t('invitations.standard')}
                                  </>
                                )}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{template.subject}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewTemplate(template);
                                setPreviewOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              {t('invitations.preview')}
                            </Button>
                            <Checkbox checked={selectedTemplateId === template.id} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
            <div className="grid gap-2">
              <Label>{t('invitations.customize_message')}</Label>
              <Textarea
                placeholder={t('invitations.customize_message_placeholder')}
                rows={4}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
              />
            </div>
          </div>
        );
      case 4:
        const selectedEvent = events.find(e => e.id === selectedEventId);
        const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
        const audience = getFilteredAudience();

        return (
          <div className="space-y-4">
            <h3 className="font-medium">{t('invitations.step_4_review_create')}</h3>
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('common.event')}:</span>
                  <span>{selectedEvent?.name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('common.campaign')}:</span>
                  <span>{campaignName || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('common.audience')}:</span>
                  <span>{t('common.participants_count', { count: audience.length })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('invitations.templates')}:</span>
                  <span>{selectedTemplate?.name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('invitations.rsvp_deadline')}:</span>
                  <span>{rsvpDeadline || '-'}</span>
                </div>
              </CardContent>
            </Card>
            <p className="text-sm text-muted-foreground">
              {audience.length === 1
                ? t('invitations.review_create_desc_singular')
                : t('invitations.review_create_desc_plural', { count: audience.length })}
              <br />
              {t('invitations.review_create_subdesc')}
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  // Campaign detail view
  const CampaignDetailDialog = () => {
    if (!selectedCampaign) return null;

    const campInvitations = invitationStore.getByCampaign(selectedCampaign.id);
    const eventName = (selectedCampaign as any)?.event?.name || events.find(e => e.id === selectedCampaign.eventId)?.name;
    const campaignStats = getCampaignStats(selectedCampaign);

    return (
      <Dialog open={viewCampaignOpen} onOpenChange={setViewCampaignOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCampaign.name}</DialogTitle>
            <DialogDescription>
              {eventName || 'Unknown Event'} • {t('common.participants_count', { count: campInvitations.length })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-4">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{campaignStats.sentCount}</p>
                <p className="text-xs text-muted-foreground">{t('invitations.delivered')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-success">{campaignStats.acceptedCount}</p>
                <p className="text-xs text-muted-foreground">{t('invitations.accepted')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-warning">{campaignStats.maybeCount}</p>
                <p className="text-xs text-muted-foreground">{t('common.maybe')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-destructive">{campaignStats.declinedCount}</p>
                <p className="text-xs text-muted-foreground">{t('events.declined')}</p>
              </CardContent>
            </Card>
          </div>

          {selectedCampaign.status === 'Draft' && (
            <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-between mb-4">
              <div>
                <p className="font-medium">{t('invitations.campaign_not_sent')}</p>
                <p className="text-sm text-muted-foreground">{t('invitations.click_send_to_deliver')}</p>
              </div>
              <Button onClick={() => {
                handleSendCampaign(selectedCampaign.id);
                setSelectedCampaign(campaignStore.getById(selectedCampaign.id) || null);
              }}>
                <Send className="h-4 w-4 mr-2" />
                {t('invitations.send_now')}
              </Button>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.participant')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('invitations.delivered')}</TableHead>
                <TableHead>{t('invitations.accepted')}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campInvitations.map((inv) => {
                const participant = participants.find(p => p.id === inv.participantId);
                return (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{participant ? `${participant.firstName} ${participant.lastName}` : 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">{participant?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={inv.status} variant={getStatusVariant(inv.status)} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {inv.sentAt ? format(new Date(inv.sentAt), 'MMM d, HH:mm') : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {inv.respondedAt ? format(new Date(inv.respondedAt), 'MMM d, HH:mm') : '-'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => copyInviteLink(inv.token)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('invitations.title')}
        description={t('invitations.description')}
        action={
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetWizard(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 me-2" />{t('invitations.create_campaign')}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t('invitations.create_campaign_title')}</DialogTitle>
              </DialogHeader>
              {/* Progress indicator */}
              <div className="flex justify-between mb-6">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${wizardStep >= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                      {step}
                    </div>
                    {step < 4 && <div className={`w-12 sm:w-16 h-1 mx-1 sm:mx-2 ${wizardStep > step ? 'bg-primary' : 'bg-muted'}`} />}
                  </div>
                ))}
              </div>
              {renderWizardStep()}
              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setWizardStep(Math.max(1, wizardStep - 1))} disabled={wizardStep === 1}>
                  {t('invitations.previous')}
                </Button>
                {wizardStep < 4 ? (
                  <Button
                    onClick={() => setWizardStep(wizardStep + 1)}
                    disabled={
                      (wizardStep === 1 && (!selectedEventId || !campaignName || !rsvpDeadline)) ||
                      (wizardStep === 2 && getFilteredAudience().length === 0) ||
                      (wizardStep === 3 && !selectedTemplateId)
                    }
                  >
                    {t('invitations.next')}
                  </Button>
                ) : (
                  <Button onClick={handleCreateCampaign}>{t('common.create')}</Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title={t('invitations.total_sent')} value={stats.totalSent} icon={Send} />
        <StatsCard title={t('invitations.delivered')} value={stats.delivered} icon={Mail} />
        <StatsCard title={t('invitations.accepted')} value={stats.accepted} icon={CheckCircle} />
        <StatsCard title={t('invitations.campaigns')} value={stats.campaigns} icon={Users} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="campaigns">{t('invitations.campaigns')}</TabsTrigger>
          <TabsTrigger value="invitations">{t('invitations.all_invitations')}</TabsTrigger>
          <TabsTrigger value="templates">{t('invitations.templates')}</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4 mt-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('invitations.search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => setRefreshKey(k => k + 1)}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {filteredCampaigns.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">{t('invitations.no_campaigns_yet')}</h3>
                <p className="text-muted-foreground mb-4">{t('invitations.no_campaigns_desc')}</p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('invitations.create_campaign')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.campaign')}</TableHead>
                    <TableHead>{t('common.event')}</TableHead>
                    <TableHead>{t('common.audience')}</TableHead>
                    <TableHead>{t('common.responses')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {campaign.createdAt ? (() => {
                              try {
                                const date = new Date(campaign.createdAt);
                                return isNaN(date.getTime()) ? '' : format(date, 'MMM d, yyyy');
                              } catch (e) {
                                return '';
                              }
                            })() : ''}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{getEventName(campaign)}</TableCell>
                      <TableCell>{getCampaignStats(campaign).audienceSize}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                            {getCampaignStats(campaign).acceptedCount}
                          </Badge>
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                            {getCampaignStats(campaign).maybeCount}
                          </Badge>
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                            {getCampaignStats(campaign).declinedCount}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={campaign.status} variant={getStatusVariant(campaign.status)} />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewCampaign(campaign)}>
                              <Eye className="h-4 w-4 mr-2" />{t('invitations.view_details')}
                            </DropdownMenuItem>
                            {campaign.status === 'Draft' && (
                              <DropdownMenuItem onClick={() => handleSendCampaign(campaign.id)}>
                                <Send className="h-4 w-4 mr-2" />{t('invitations.send_campaign')}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteCampaign(campaign.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4 mt-4">
          {invitations.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">{t('invitations.no_invitations_yet')}</h3>
                <p className="text-muted-foreground">{t('invitations.invitations_appear_here')}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.participant')}</TableHead>
                    <TableHead>{t('common.event')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('invitations.rsvp_deadline')}</TableHead>
                    <TableHead>{t('invitations.delivered')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.slice(0, 50).map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <p className="font-medium">{getParticipantName(inv.participantId)}</p>
                      </TableCell>
                      <TableCell className="text-sm">{getEventName(inv.eventId)}</TableCell>
                      <TableCell>
                        <StatusBadge status={inv.status} variant={getStatusVariant(inv.status)} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {inv.rsvpDeadline}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {inv.sentAt ? format(new Date(inv.sentAt), 'MMM d') : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => copyInviteLink(inv.token)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/invite/${inv.token}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <Badge variant="outline" className="mt-1">{template.language}</Badge>
                    </div>
                    <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">{template.subject}</p>
                  <div className="flex flex-wrap gap-1">
                    {template.variables.slice(0, 3).map((v, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{`{{${v}}}`}</Badge>
                    ))}
                    {template.variables.length > 3 && (
                      <Badge variant="secondary" className="text-xs">+{template.variables.length - 3}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <CampaignDetailDialog />

      {/* Template Preview Modal */}
      <InvitationPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        template={previewTemplate}
        event={events.find(e => e.id === selectedEventId)}
        rsvpDeadline={rsvpDeadline}
      />
    </div>
  );
};

export default InvitationsPage;










