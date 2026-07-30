import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { StatsCard } from '@/components/common/StatsCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  eventStore,
  templateStore,
  campaignStore,
  invitationStore,
  initializeStore,
  BACKEND_INVITATION_TEMPLATE_IDS,
  EMSEvent,
  EMSParticipant,
  EMSCampaign,
  EMSInvitation,
  EMSInvitationTemplate,
  InvitationStatus,
} from '@/lib/emsStore';
import { ParticipantRole } from '@/data/mockData';
import { Mail, Send, Users, CheckCircle, Plus, Search, Eye, MoreHorizontal, FileText, Clock, XCircle, HelpCircle, Copy, ExternalLink, Trash2, Play, RefreshCw, Crown, Star, UserCog } from 'lucide-react';
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
import { extractInvitationTemplatesFromCampaigns } from '@/api/invitationTemplateApi';
import {
  getAllManagers,
  createTeamManager,
  getManagerDisplayName,
  EMSManager,
} from '@/api/managerApi';
import {
  INTERNATIONAL_PHONE_PLACEHOLDER,
  sanitizePhoneInput,
  validateInternationalPhone,
} from '@/lib/phoneValidation';
import {
  getInvitationsByCampaign,
  Invitation as ApiInvitation,
} from '@/api/invitationApi';
import { Loader2 } from 'lucide-react';

// Check if template is VIP based on name/subject
const isVIPTemplate = (template: EMSInvitationTemplate): boolean => {
  const name = template.name.toLowerCase();
  const subject = template.subject.toLowerCase();
  return name.includes('vip') || name.includes('exclusive') ||
    subject.includes('vip') || subject.includes('exclusive');
};

// Real backend UUIDs for invitation templates
const BACKEND_TEMPLATE_IDS = BACKEND_INVITATION_TEMPLATE_IDS;

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

interface InvitationManager extends EMSManager {}

const RequiredMark = () => <span className="text-destructive">*</span>;

const campaignInvitationKey = (inv: Pick<EMSInvitation, 'id' | 'participantId' | 'managerId'>) => {
  if (inv.participantId) return `p:${inv.participantId}`;
  if (inv.managerId) return `m:${inv.managerId}`;
  return `i:${inv.id}`;
};

const mapApiInvitationToEms = (inv: ApiInvitation, campaignId: string): EMSInvitation => ({
  id: inv.id,
  participantId: inv.participantId || inv.participant_id || '',
  participantEmail: inv.participantEmail || inv.participant_email || '',
  managerId: inv.managerId || inv.manager_id || '',
  managerEmail: inv.managerEmail || inv.manager_email || '',
  delegationId: inv.delegationId || inv.delegation_id || '',
  recipientType: inv.recipientType || inv.recipient_type || (inv.managerId || inv.manager_id ? 'manager' : 'participant'),
  eventId: inv.eventId || inv.event_id || inv.event?.id || '',
  status: (inv.status || inv.rsvpResponse || 'Pending') as InvitationStatus,
  rsvpDeadline: inv.rsvpDeadline || inv.rsvp_deadline || '',
  token: inv.token || '',
  campaignId: inv.campaignId || inv.campaign_id || campaignId,
  templateId: inv.templateId || inv.template_id || '',
  sentAt: inv.sentAt || inv.sent_at || null,
  deliveredAt: inv.deliveredAt || inv.delivered_at || null,
  openedAt: inv.openedAt || inv.opened_at || null,
  respondedAt: inv.respondedAt || inv.responded_at || null,
  guestCount: 0,
  notes: inv.notes || '',
  createdAt: inv.createdAt || inv.created_at || new Date().toISOString(),
  updatedAt: inv.updatedAt || inv.updated_at || new Date().toISOString(),
});

const buildAudienceFallbackInvitations = (
  campaign: campaignApi.Campaign | EMSCampaign,
  participantList: EMSParticipant[],
  managerList: InvitationManager[],
): EMSInvitation[] => {
  const campaignRecord = campaign as campaignApi.Campaign & EMSCampaign;
  const audienceIds = [
    ...(Array.isArray(campaignRecord.audienceIds) ? campaignRecord.audienceIds : []),
    ...(Array.isArray(campaignRecord.targetParticipantIds) ? campaignRecord.targetParticipantIds : []),
  ];
  const managerIds = Array.isArray(campaignRecord.targetManagerIds) ? campaignRecord.targetManagerIds : [];
  const rows: EMSInvitation[] = [];

  for (const participantId of audienceIds.map(String)) {
    const participant = participantList.find(item => item.id === participantId);
    if (!participant) continue;

    rows.push({
      id: `audience-participant-${participantId}`,
      participantId,
      participantEmail: participant.email,
      eventId: campaignRecord.eventId || '',
      campaignId: campaignRecord.id,
      templateId: campaignRecord.templateId || '',
      token: '',
      status: 'Pending',
      rsvpDeadline: campaignRecord.rsvpDeadline || '',
      sentAt: null,
      deliveredAt: null,
      openedAt: null,
      respondedAt: null,
      guestCount: 0,
      notes: '',
      createdAt: campaignRecord.createdAt || new Date().toISOString(),
      updatedAt: campaignRecord.updatedAt || new Date().toISOString(),
    });
  }

  for (const managerId of managerIds.map(String)) {
    const manager = managerList.find(item => item.id === managerId);
    rows.push({
      id: `audience-manager-${managerId}`,
      participantId: '',
      managerId,
      managerEmail: manager?.email || '',
      recipientType: 'manager',
      eventId: campaignRecord.eventId || '',
      campaignId: campaignRecord.id,
      templateId: campaignRecord.templateId || '',
      token: '',
      status: 'Pending',
      rsvpDeadline: campaignRecord.rsvpDeadline || '',
      sentAt: null,
      deliveredAt: null,
      openedAt: null,
      respondedAt: null,
      guestCount: 0,
      notes: '',
      createdAt: campaignRecord.createdAt || new Date().toISOString(),
      updatedAt: campaignRecord.updatedAt || new Date().toISOString(),
    });
  }

  return rows;
};

const mergeCampaignDetailInvitations = (
  campaign: campaignApi.Campaign | EMSCampaign,
  apiInvitations: ApiInvitation[],
  localInvitations: EMSInvitation[],
  participantList: EMSParticipant[],
  managerList: InvitationManager[],
): EMSInvitation[] => {
  const merged = new Map<string, EMSInvitation>();

  for (const invitation of apiInvitations) {
    const mapped = mapApiInvitationToEms(invitation, campaign.id);
    merged.set(campaignInvitationKey(mapped), mapped);
  }

  for (const invitation of localInvitations) {
    const key = campaignInvitationKey(invitation);
    const existing = merged.get(key);
    merged.set(key, existing ? { ...existing, ...invitation, id: existing.id } : invitation);
  }

  for (const invitation of buildAudienceFallbackInvitations(campaign, participantList, managerList)) {
    const key = campaignInvitationKey(invitation);
    if (!merged.has(key)) {
      merged.set(key, invitation);
    }
  }

  return Array.from(merged.values());
};

const InvitationsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const [activeTab, setActiveTab] = useState('campaigns');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [pendingCreateAction, setPendingCreateAction] = useState<'draft' | 'send' | 'schedule' | null>(null);
  const [apiCampaigns, setApiCampaigns] = useState<campaignApi.Campaign[]>([]);
  const [apiEvents, setApiEvents] = useState<EMSEvent[]>([]);
  const [apiParticipants, setApiParticipants] = useState<EMSParticipant[]>([]);
  const [apiDelegations, setApiDelegations] = useState<any[]>([]);
  const [apiManagers, setApiManagers] = useState<InvitationManager[]>([]);
  const [apiTemplates, setApiTemplates] = useState<EMSInvitationTemplate[]>([]);
  const [isParticipantsLoading, setIsParticipantsLoading] = useState(false);

  // Wizard form state
  const [selectedEventId, setSelectedEventId] = useState(eventId || '');
  const [campaignName, setCampaignName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<ParticipantRole[]>([]);
  const [selectedDelegations, setSelectedDelegations] = useState<string[]>([]);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [selectedManagerIds, setSelectedManagerIds] = useState<string[]>([]);
  const [audienceMode, setAudienceMode] = useState<'role' | 'individual' | 'delegation' | 'manager'>('role');
  const [participantSearchTerm, setParticipantSearchTerm] = useState('');
  const [managerSearchTerm, setManagerSearchTerm] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [rsvpDeadline, setRsvpDeadline] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleCampaignTargetId, setScheduleCampaignTargetId] = useState<string | null>(null);
  const [isCreateManagerOpen, setIsCreateManagerOpen] = useState(false);
  const [isCreatingManager, setIsCreatingManager] = useState(false);
  const [newManagerPhoneError, setNewManagerPhoneError] = useState('');
  const [newManagerForm, setNewManagerForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    country: '',
    organization: '',
    federation: '',
  });

  type CampaignDeliveryAction = 'draft' | 'send' | 'schedule';

  // View states
  const [selectedCampaign, setSelectedCampaign] = useState<EMSCampaign | null>(null);
  const [viewCampaignOpen, setViewCampaignOpen] = useState(false);
  const [campaignDetailInvitations, setCampaignDetailInvitations] = useState<EMSInvitation[]>([]);
  const [isCampaignDetailLoading, setIsCampaignDetailLoading] = useState(false);

  // Template preview state
  const [previewTemplate, setPreviewTemplate] = useState<EMSInvitationTemplate | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Initialize store and fetch API data
  useEffect(() => {
    initializeStore();
    loadCampaigns();
  }, [refreshKey]);

  const loadParticipantsForInvitations = async () => {
    setIsParticipantsLoading(true);
    try {
      const participantData = await getParticipants();
      setApiParticipants(Array.isArray(participantData) ? participantData : []);
    } catch (error) {
      console.error('Failed to load participants for invitations:', error);
      setApiParticipants([]);
    } finally {
      setIsParticipantsLoading(false);
    }
  };

  const loadCampaigns = async () => {
    setIsLoading(true);
    try {
      const [campaignData, eventData, participantData, delegationData, managerData] = await Promise.all([
        campaignApi.getCampaigns(),
        getEvents(),
        getParticipants().catch(() => []),
        getAllDelegations().catch(() => []),
        getAllManagers().catch(() => []),
      ]);
      const campaigns = Array.isArray(campaignData) ? campaignData : [];
      const templateData = extractInvitationTemplatesFromCampaigns(campaigns);

      setApiCampaigns(campaigns);
      setApiEvents(Array.isArray(eventData) ? eventData : []);
      setApiParticipants(Array.isArray(participantData) ? participantData : []);
      setApiDelegations(Array.isArray(delegationData) ? delegationData : []);
      setApiManagers(Array.isArray(managerData) ? managerData : []);
      setApiTemplates(templateData);
      templateStore.replaceAll(templateData);
    } catch (error) {
      console.error('Failed to load invitations data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isCreateOpen && wizardStep === 2 && audienceMode === 'individual') {
      loadParticipantsForInvitations();
    }
  }, [isCreateOpen, wizardStep, audienceMode]);

  // Fetch data
  const events = useMemo(() => {
    if (Array.isArray(apiEvents) && apiEvents.length > 0) return apiEvents;
    return eventStore.getAll();
  }, [apiEvents, refreshKey]);

  // Individual participant picker uses only GET /admin/participants — no registrations or local store merge.
  const participants = useMemo(() => {
    return [...apiParticipants].sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.trim().toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.trim().toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [apiParticipants]);

  const managers = useMemo(() => {
    const fromApi = apiManagers.filter(manager => manager.id || manager.email);
    if (fromApi.length > 0) return fromApi;

    const fromDelegations = apiDelegations
      .map((del) => {
        const managerId = String(
          del?.managerId ||
          del?.manager_id ||
          del?.manager?.id ||
          del?.manager?._id ||
          del?.user?.id ||
          del?.user?._id ||
          ''
        );
        const email =
          del?.managerEmail ||
          del?.manager_email ||
          del?.manager?.email ||
          del?.user?.email ||
          '';
        if (!managerId && !email) return null;
        return {
          id: managerId || `email:${email.toLowerCase()}`,
          email,
          name: del?.manager?.name || del?.user?.name,
          country: del?.country,
          organization: del?.organization,
        } as InvitationManager;
      })
      .filter(Boolean) as InvitationManager[];

    if (fromDelegations.length > 0) return fromDelegations;
    return [];
  }, [apiManagers, apiDelegations]);

  const templates = useMemo(() => {
    if (apiTemplates.length > 0) return apiTemplates;
    return templateStore.getUnique();
  }, [apiTemplates, refreshKey]);

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

  // Calculate stats from campaign invitationStats returned by GET /campaigns
  const stats = useMemo(() => {
    const campaignStats = campaigns.map(campaign => campaignApi.getCampaignInvitationStats(campaign));
    return {
      totalSent: campaignStats.reduce((sum, item) => sum + item.totalInvitations, 0),
      delivered: campaignStats.reduce((sum, item) => sum + item.delivered, 0),
      opened: campaignStats.reduce((sum, item) => sum + item.opened, 0),
      accepted: campaignStats.reduce((sum, item) => sum + item.accepted, 0),
      declined: campaignStats.reduce((sum, item) => sum + item.declined, 0),
      campaigns: campaigns.length,
    };
  }, [campaigns]);

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

  const getCampaignStats = (campaign: EMSCampaign | campaignApi.Campaign) => {
    const apiStats = campaignApi.getCampaignInvitationStats(campaign);
    if (apiStats.totalInvitations > 0 || apiStats.delivered > 0 || apiStats.accepted > 0) {
      return apiStats;
    }

    const invitationsForCampaign = invitationStore.getByCampaign(campaign.id);
    return {
      ...apiStats,
      totalInvitations: invitationsForCampaign.length || apiStats.totalInvitations,
      audienceSize: invitationsForCampaign.length || apiStats.audienceSize,
      sentCount: invitationsForCampaign.filter(i => i.sentAt).length || apiStats.sentCount,
      delivered: invitationsForCampaign.filter(i => i.deliveredAt).length || apiStats.delivered,
      deliveredCount: invitationsForCampaign.filter(i => i.deliveredAt).length || apiStats.deliveredCount,
      opened: invitationsForCampaign.filter(i => i.openedAt).length || apiStats.opened,
      openedCount: invitationsForCampaign.filter(i => i.openedAt).length || apiStats.openedCount,
      accepted: invitationsForCampaign.filter(i => i.status === 'Accepted').length || apiStats.accepted,
      acceptedCount: invitationsForCampaign.filter(i => i.status === 'Accepted').length || apiStats.acceptedCount,
      maybe: invitationsForCampaign.filter(i => i.status === 'Maybe').length || apiStats.maybe,
      maybeCount: invitationsForCampaign.filter(i => i.status === 'Maybe').length || apiStats.maybeCount,
      declined: invitationsForCampaign.filter(i => i.status === 'Declined').length || apiStats.declined,
      declinedCount: invitationsForCampaign.filter(i => i.status === 'Declined').length || apiStats.declinedCount,
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

  interface ManagerInvitationTarget {
    managerId: string;
    managerEmail?: string;
    delegationId: string;
    delegationName?: string;
  }

  const extractDelegationManager = (del: any) => {
    let managerId = String(
      del?.managerId ||
      del?.manager_id ||
      del?.manager?.id ||
      del?.manager?._id ||
      del?.user?.id ||
      del?.user?._id ||
      del?.userId ||
      del?.user_id ||
      del?.createdBy ||
      del?.created_by ||
      ''
    );
    let managerEmail = (
      del?.managerEmail ||
      del?.manager_email ||
      del?.manager?.email ||
      del?.user?.email ||
      ''
    ).toLowerCase().trim();

    if (!managerId && managerEmail) {
      const matchedManager = managers.find(m => m.email.toLowerCase() === managerEmail);
      if (matchedManager?.id) managerId = String(matchedManager.id);
    }

    if (managerId && !managerEmail) {
      const matchedManager = managers.find(m => String(m.id) === managerId);
      if (matchedManager?.email) managerEmail = matchedManager.email.toLowerCase();
    }

    if (!managerId && managerEmail) {
      managerId = `email:${managerEmail}`;
    }

    return { managerId, managerEmail };
  };

  const resolveManagerTargetsFromDelegations = (): ManagerInvitationTarget[] => {
    if (audienceMode !== 'delegation') return [];

    const delegationIds = selectedDelegations.length > 0
      ? selectedDelegations
      : approvedDelegations.map(d => (d.id || d._id) as string).filter(Boolean);

    const targets: ManagerInvitationTarget[] = [];
    const seenManagerIds = new Set<string>();

    for (const delegationId of delegationIds) {
      const del = approvedDelegations.find(d => (d.id || d._id) === delegationId);
      if (!del) continue;

      const { managerId, managerEmail } = extractDelegationManager(del);
      const dedupeKey = managerEmail || managerId;
      if (!managerId || !dedupeKey || seenManagerIds.has(dedupeKey)) continue;

      seenManagerIds.add(dedupeKey);
      targets.push({
        managerId,
        managerEmail,
        delegationId,
        delegationName: del.country || del.name,
      });
    }

    return targets;
  };

  const resolveManagerTargetsFromSelection = (): ManagerInvitationTarget[] => {
    if (audienceMode !== 'manager') return [];

    const targets: ManagerInvitationTarget[] = [];
    const seenKeys = new Set<string>();

    for (const managerId of selectedManagerIds) {
      const manager = managers.find(m => m.id === managerId);
      if (!manager) continue;

      const key = manager.email.toLowerCase();
      if (seenKeys.has(key)) continue;

      seenKeys.add(key);
      targets.push({
        managerId: manager.id,
        managerEmail: manager.email,
        delegationId: manager.id,
        delegationName: manager.organization || manager.country || 'Manager',
      });
    }

    return targets;
  };

  const resolveAllManagerTargets = (): ManagerInvitationTarget[] => {
    if (audienceMode === 'manager') return resolveManagerTargetsFromSelection();
    if (audienceMode === 'delegation') return resolveManagerTargetsFromDelegations();
    return [];
  };

  const resolveManagerTargetsForCampaign = (campaign: any): ManagerInvitationTarget[] => {
    const delegationIds: string[] = Array.isArray(campaign?.targetDelegationIds)
      ? campaign.targetDelegationIds
      : [];

    if (delegationIds.length === 0 && !Array.isArray(campaign?.targetManagerIds)) return [];

    const targets: ManagerInvitationTarget[] = [];
    const seenManagerIds = new Set<string>();

    for (const delegationId of delegationIds) {
      const del = apiDelegations.find(d => (d.id || d._id) === delegationId);
      if (!del) continue;

      const { managerId, managerEmail } = extractDelegationManager(del);
      const dedupeKey = managerEmail || managerId;
      if (!managerId || !dedupeKey || seenManagerIds.has(dedupeKey)) continue;

      seenManagerIds.add(dedupeKey);
      targets.push({
        managerId,
        managerEmail,
        delegationId,
        delegationName: del.country || del.name,
      });
    }

    if (targets.length === 0 && Array.isArray(campaign?.targetManagerIds)) {
      for (const managerId of campaign.targetManagerIds) {
        if (!managerId || seenManagerIds.has(managerId)) continue;
        seenManagerIds.add(managerId);

        const manager = managers.find(m => m.id === managerId);
        const managerEmail = manager?.email || (managerId.startsWith('email:') ? managerId.slice(6) : undefined);

        targets.push({
          managerId,
          managerEmail,
          delegationId: managerId,
          delegationName: manager ? (manager.organization || manager.country || 'Manager') : 'Manager',
        });
      }
    }

    return targets;
  };

  // Get audience based on filters
  const getFilteredAudience = (): EMSParticipant[] => {
    if (!selectedEventId) return [];

    if (audienceMode === 'individual') {
      return participants.filter(p => selectedParticipantIds.includes(p.id));
    }

    if (audienceMode === 'delegation') {
      // Delegation campaigns invite only the delegation manager — not individual participants.
      return [];
    }

    if (selectedRoles.length === 0) return [];

    return participants.filter(p => selectedRoles.includes(p.role));
  };

  const hasValidAudience = (): boolean => {
    if (audienceMode === 'individual') {
      return selectedParticipantIds.length > 0;
    }
    if (audienceMode === 'role') {
      return selectedRoles.length > 0 && getFilteredAudience().length > 0;
    }
    if (audienceMode === 'manager') {
      return resolveManagerTargetsFromSelection().length > 0;
    }
    if (audienceMode === 'delegation') {
      return selectedDelegations.length > 0 && resolveManagerTargetsFromDelegations().length > 0;
    }
    return getFilteredAudience().length > 0;
  };

  const getManagerIdsForCampaignRoles = (targets: ManagerInvitationTarget[]): string[] =>
    targets
      .map(target => target.managerId)
      .filter((id): id is string => Boolean(id) && !String(id).startsWith('email:'));

  const getCampaignTargetRoles = (): string[] | undefined => {
    if (audienceMode === 'role' && selectedRoles.length > 0) {
      return selectedRoles;
    }
    if (audienceMode === 'individual' && selectedParticipantIds.length > 0) {
      return selectedParticipantIds;
    }
    if (audienceMode === 'delegation') {
      const managerIds = getManagerIdsForCampaignRoles(resolveManagerTargetsFromDelegations());
      return managerIds.length > 0 ? managerIds : undefined;
    }
    if (audienceMode === 'manager') {
      const managerIds = getManagerIdsForCampaignRoles(resolveManagerTargetsFromSelection());
      return managerIds.length > 0 ? managerIds : undefined;
    }
    return undefined;
  };

  const filteredManagersForSelection = managers.filter(manager => {
    const searchLower = managerSearchTerm.toLowerCase().trim();
    if (!searchLower) return true;

    const fullName = getManagerDisplayName(manager).toLowerCase();
    return (
      fullName.includes(searchLower) ||
      manager.email.toLowerCase().includes(searchLower) ||
      (manager.country || '').toLowerCase().includes(searchLower) ||
      (manager.organization || '').toLowerCase().includes(searchLower)
    );
  });

  const filteredParticipantsForSelection = participants.filter(p => {
    const searchLower = participantSearchTerm.toLowerCase().trim();
    if (!searchLower) return true;

    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
    return (
      fullName.includes(searchLower) ||
      p.email.toLowerCase().includes(searchLower) ||
      (p.organization || '').toLowerCase().includes(searchLower) ||
      (p.nationality || '').toLowerCase().includes(searchLower) ||
      (p.role || '').toLowerCase().includes(searchLower)
    );
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

  const toggleManager = (managerId: string) => {
    setSelectedManagerIds(prev =>
      prev.includes(managerId)
        ? prev.filter(id => id !== managerId)
        : [...prev, managerId]
    );
  };

  const resetNewManagerForm = () => {
    setNewManagerForm({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      country: '',
      organization: '',
      federation: '',
    });
    setNewManagerPhoneError('');
  };

  const handleCreateManager = async () => {
    const firstName = newManagerForm.firstName.trim();
    const lastName = newManagerForm.lastName.trim();
    const email = newManagerForm.email.trim().toLowerCase();

    const phone = newManagerForm.phone.trim();
    const country = newManagerForm.country.trim();
    const organization = newManagerForm.organization.trim();
    const federation = newManagerForm.federation.trim();

    if (!firstName || !lastName || !email || !phone || !country || !organization || !federation) {
      toast({
        title: 'Missing fields',
        description: 'All fields are required.',
        variant: 'destructive',
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    const phoneError = validateInternationalPhone(phone);
    if (phoneError) {
      setNewManagerPhoneError(phoneError);
      toast({
        title: 'Invalid phone number',
        description: phoneError,
        variant: 'destructive',
      });
      return;
    }
    setNewManagerPhoneError('');

    if (!newManagerForm.password) {
      toast({
        title: 'Password required',
        description: 'Please set a password for the manager account.',
        variant: 'destructive',
      });
      return;
    }

    if (newManagerForm.password !== newManagerForm.confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Password and confirm password must be the same.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingManager(true);
    try {
      const created = await createTeamManager({
        firstName,
        lastName,
        email,
        password: newManagerForm.password,
        confirmPassword: newManagerForm.confirmPassword,
        phone,
        country,
        organization,
        federation,
      });

      setApiManagers(prev => {
        const map = new Map(prev.map(manager => [manager.email.toLowerCase(), manager]));
        map.set(created.email.toLowerCase(), created);
        return Array.from(map.values());
      });

      setSelectedManagerIds(prev =>
        prev.includes(created.id) ? prev : [...prev, created.id],
      );

      toast({
        title: 'Manager created',
        description: `${getManagerDisplayName(created)} can log in at /login/manager with their email and password.`,
      });

      resetNewManagerForm();
      setIsCreateManagerOpen(false);
    } catch (error: any) {
      console.error('Failed to create manager:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to create manager';
      toast({
        title: 'Error',
        description: Array.isArray(msg) ? msg.join(', ') : String(msg),
        variant: 'destructive',
      });
    } finally {
      setIsCreatingManager(false);
    }
  };

  const resetWizard = () => {
    // If opened from inside an event page, keep that event pre-selected
    setWizardStep(1);
    setSelectedEventId(eventId || '');
    setCampaignName('');
    setSelectedRoles([]);
    setSelectedDelegations([]);
    setSelectedParticipantIds([]);
    setSelectedManagerIds([]);
    setAudienceMode('role');
    setParticipantSearchTerm('');
    setManagerSearchTerm('');
    setSelectedTemplateId('');
    setRsvpDeadline('');
    setCustomMessage('');
    setScheduledAt('');
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
    targetDelegationIds?: string[];
    managerTargets?: ManagerInvitationTarget[];
  }) => {
    const participantEmailMap = Object.fromEntries(
      payload.audience.map(participant => [participant.id, participant.email])
    ) as Record<string, string>;

    const localCampaign = campaignStore.createWithId(payload.campaignId, {
      name: payload.campaignName,
      eventId: payload.selectedEventId,
      templateId: payload.selectedTemplateId,
      targetRoles: (payload.selectedRoles ?? []) as ParticipantRole[],
      targetNationalities: [],
      targetDelegationIds: payload.targetDelegationIds,
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

    const createdParticipantInvitations = payload.audience.length > 0
      ? invitationStore.bulkCreateForCampaign(
        localCampaign.id,
        payload.selectedEventId,
        payload.selectedTemplateId,
        payload.audience.map(participant => participant.id),
        payload.rsvpDeadline,
        participantEmailMap
      )
      : [];

    const createdManagerInvitations = payload.managerTargets?.length
      ? invitationStore.bulkCreateForManagers(
        localCampaign.id,
        payload.selectedEventId,
        payload.selectedTemplateId,
        payload.managerTargets,
        payload.rsvpDeadline
      )
      : [];

    const createdInvitations = [...createdParticipantInvitations, ...createdManagerInvitations];

    campaignStore.updateStats(localCampaign.id);
    return { localCampaign, createdInvitations };
  };

  const syncCampaignAudienceBeforeDelivery = async (campaignId: string) => {
    const created = ensureLocalInvitationsForCampaign(campaignId);

    let campaign = campaignStore.getById(campaignId) as any;
    if (!campaign) {
      campaign = apiCampaigns.find(c => c.id === campaignId);
    }

    const targetDelegationIds: string[] = Array.isArray(campaign?.targetDelegationIds)
      ? campaign.targetDelegationIds
      : [];
    const isDelegationCampaign = targetDelegationIds.length > 0;

    const participantIds: string[] = isDelegationCampaign
      ? []
      : Array.isArray(campaign?.audienceIds)
        ? campaign.audienceIds
        : Array.isArray(campaign?.targetParticipantIds)
          ? campaign.targetParticipantIds
          : created
            .filter(inv => inv.recipientType !== 'manager' && inv.participantId)
            .map(inv => inv.participantId as string);

    const managerTargets = resolveManagerTargetsForCampaign(campaign);
    const targetManagerIds: string[] = managerTargets.length > 0
      ? managerTargets.map(target => target.managerId)
      : Array.isArray(campaign?.targetManagerIds)
        ? campaign.targetManagerIds
        : [];

    const delegationManagerRoleIds = getManagerIdsForCampaignRoles(managerTargets);
    const campaignTargetRoles = isDelegationCampaign
      ? (delegationManagerRoleIds.length > 0
        ? delegationManagerRoleIds
        : targetManagerIds.filter(id => id && !String(id).startsWith('email:')))
      : Array.isArray(campaign?.targetRoles) && campaign.targetRoles.length > 0
        ? campaign.targetRoles
        : participantIds.length > 0
          ? participantIds
          : undefined;

    const shouldSyncAudience =
      participantIds.length > 0 ||
      !!campaignTargetRoles?.length ||
      targetDelegationIds.length > 0 ||
      targetManagerIds.length > 0;

    if (shouldSyncAudience) {
      await campaignApi.updateCampaign(campaignId, {
        ...(participantIds.length > 0 ? {
          audienceIds: participantIds,
          targetParticipantIds: participantIds,
          audienceSize: participantIds.length,
        } : {}),
        roleFilters: campaignTargetRoles,
        targetRoles: campaignTargetRoles,
        targetDelegationIds: targetDelegationIds.length > 0 ? targetDelegationIds : undefined,
        targetManagerIds: targetManagerIds.length > 0 ? targetManagerIds : undefined,
      }).catch((error) => {
        console.warn('Backend campaign audience sync failed before delivery:', error);
      });
    }

    return {
      created,
      campaign,
      targetDelegationIds,
      targetManagerIds,
      campaignTargetRoles,
    };
  };

  const handleCreateCampaign = async (delivery: CampaignDeliveryAction = 'draft') => {
    if (!selectedEventId || !campaignName || !selectedTemplateId || !rsvpDeadline) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    const audience = getFilteredAudience();
    const managerTargets = resolveAllManagerTargets();
    if (!hasValidAudience()) {
      toast({ title: 'No audience', description: 'No participants or managers match your criteria', variant: 'destructive' });
      return;
    }

    if (delivery === 'schedule' && !scheduledAt) {
      toast({
        title: t('invitations.schedule_required_title', { defaultValue: 'Schedule time required' }),
        description: t('invitations.schedule_required_desc', { defaultValue: 'Please choose when this campaign should be sent.' }),
        variant: 'destructive',
      });
      return;
    }

    if (delivery === 'schedule' && new Date(scheduledAt).getTime() <= Date.now()) {
      toast({
        title: t('invitations.schedule_invalid_title', { defaultValue: 'Invalid schedule time' }),
        description: t('invitations.schedule_invalid_desc', { defaultValue: 'Scheduled time must be in the future.' }),
        variant: 'destructive',
      });
      return;
    }

    setPendingCreateAction(delivery);
    setIsActionLoading(true);
    try {
      const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

      const computedTargetManagerIds = managerTargets.length > 0
        ? managerTargets.map(target => target.managerId)
        : undefined;

      const computedTargetDelegationIds = audienceMode === 'delegation' && selectedDelegations.length > 0
        ? selectedDelegations.filter(Boolean) as string[]
        : audienceMode === 'delegation'
          ? approvedDelegations.map(d => (d.id || d._id) as string).filter(Boolean)
          : undefined;

      const tempCampaignId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const campaignTargetRoles = getCampaignTargetRoles();
      const { createdInvitations } = createLocalCampaignInvitations({
        campaignId: tempCampaignId,
        campaignName,
        selectedEventId,
        selectedTemplateId,
        selectedTemplate,
        audience,
        rsvpDeadline,
        selectedRoles: (campaignTargetRoles ?? []) as ParticipantRole[],
        targetManagerIds: computedTargetManagerIds,
        targetDelegationIds: computedTargetDelegationIds,
        managerTargets: managerTargets.length > 0 ? managerTargets : undefined,
      });

      const participantIds = audienceMode === 'delegation' ? [] : audience.map(p => p.id);

      const backendCampaign = await campaignApi.createCampaign({
        name: campaignName,
        subject: selectedTemplate?.subject || campaignName,
        content: selectedTemplate?.body || customMessage,
        templateId: getBackendTemplateId(selectedTemplate),

        eventId: selectedEventId,
        rsvpDeadline: rsvpDeadline,
        ...(participantIds.length > 0 ? {
          audienceIds: participantIds,
          targetParticipantIds: participantIds,
          audienceSize: participantIds.length,
        } : {}),
        roleFilters: campaignTargetRoles,
        targetRoles: campaignTargetRoles,
        targetDelegationIds: computedTargetDelegationIds,
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

      const finalCampaignId = backendCampaignId || tempCampaignId;

      if (delivery === 'send') {
        await handleSendCampaign(finalCampaignId);
      } else if (delivery === 'schedule') {
        await handleScheduleCampaign(finalCampaignId, scheduledAt);
      } else {
        const participantCount = createdInvitations.filter(inv => inv.recipientType !== 'manager').length;
        const managerCount = createdInvitations.filter(inv => inv.recipientType === 'manager').length;
        const descriptionParts: string[] = [];
        if (participantCount > 0) descriptionParts.push(`${participantCount} participant invitation(s)`);
        if (managerCount > 0) descriptionParts.push(`${managerCount} manager invitation(s)`);

        toast({
          title: t('invitations.campaign_created', { defaultValue: 'Campaign created' }),
          description: descriptionParts.length > 0
            ? t('invitations.campaign_created_desc', {
              defaultValue: `Created ${descriptionParts.join(' and ')}.`,
              details: descriptionParts.join(' and '),
            })
            : t('invitations.campaign_created_success', { defaultValue: 'Campaign created successfully.' }),
        });
      }

      setIsCreateOpen(false);
      resetWizard();
      setRefreshKey(k => k + 1);
    } catch (error) {
      console.error('Failed to create campaign locally:', error);
      toast({ title: 'Error', description: 'Failed to create campaign', variant: 'destructive' });
    } finally {
      setIsActionLoading(false);
      setPendingCreateAction(null);
    }
  };

  const ensureLocalInvitationsForCampaign = (campaignId: string) => {
    const existing = invitationStore.getByCampaign(campaignId);

    let campaign = campaignStore.getById(campaignId) as any;
    if (!campaign) {
      campaign = apiCampaigns.find(c => c.id === campaignId);
    }
    if (!campaign) return existing;

    const isDelegationCampaign =
      (Array.isArray(campaign?.targetDelegationIds) && campaign.targetDelegationIds.length > 0) ||
      (Array.isArray(campaign?.targetManagerIds) && campaign.targetManagerIds.length > 0);

    const managerTargets = resolveManagerTargetsForCampaign(campaign);
    const ensureManagerInvitations = () => {
      if (managerTargets.length === 0) return [] as ReturnType<typeof invitationStore.bulkCreateForManagers>;
      return invitationStore.bulkCreateForManagers(
        campaignId,
        campaign.eventId,
        campaign.templateId || selectedTemplateId || '',
        managerTargets,
        campaign.rsvpDeadline || rsvpDeadline || ''
      );
    };

    if (isDelegationCampaign) {
      const createdManagers = ensureManagerInvitations();
      return createdManagers.length > 0 ? [...existing, ...createdManagers] : existing;
    }

    const audienceIds: string[] = Array.isArray(campaign.audienceIds)
      ? campaign.audienceIds
      : Array.isArray(campaign.targetParticipantIds)
        ? campaign.targetParticipantIds
        : [];

    if (audienceIds.length === 0) {
      const createdManagers = ensureManagerInvitations();
      return createdManagers.length > 0 ? [...existing, ...createdManagers] : existing;
    }

    // Sirf wahi audienceIds ke liye invitation banao jinke liye abhi tak nahi bani.
    // Participant-id basis par duplicate-check karo — sirf existing.length > 0 kaafi nahi,
    // kyun ke campaign ID rekey hone ke baad agar local invitations purani campaignId se
    // linked reh gayi hon to getByCampaign(campaignId) khali return karega aur invitations
    // dobara (duplicate) bulk-create ho jayengi.
    const existingParticipantIds = new Set(existing.map(inv => inv.participantId));
    const missingIds = audienceIds.filter(id => !existingParticipantIds.has(id));

    if (missingIds.length === 0) {
      const createdManagers = ensureManagerInvitations();
      return createdManagers.length > 0 ? [...existing, ...createdManagers] : existing;
    }

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

    const createdManagers = ensureManagerInvitations();

    return [...existing, ...created, ...createdManagers];
  };

  const handleSendCampaign = async (
    campaignId: string,
    options?: { silent?: boolean },
  ) => {
    setIsActionLoading(true);
    try {
      const {
        created,
        targetDelegationIds,
        targetManagerIds,
        campaignTargetRoles,
      } = await syncCampaignAudienceBeforeDelivery(campaignId);

      const sent = invitationStore.sendCampaign(campaignId);

      campaignStore.update(campaignId, {
        status: 'Sent',
        sentAt: new Date().toISOString(),
        ...(targetDelegationIds.length > 0 ? { targetDelegationIds } : {}),
        ...(targetManagerIds.length > 0 ? { targetManagerIds } : {}),
        ...(campaignTargetRoles?.length ? { targetRoles: campaignTargetRoles } : {}),
      } as any);
      campaignStore.updateStats(campaignId);

      await campaignApi.sendCampaignNow(campaignId).catch((error) => {
        console.warn('Backend sendCampaignNow failed, continuing with local flow:', error);
      });

      if (!options?.silent) {
        const managerInviteCount = created.filter(inv => inv.recipientType === 'manager').length;
        const participantInviteCount = created.filter(inv => inv.recipientType !== 'manager').length;
        const descriptionParts: string[] = [];
        if (managerInviteCount > 0) descriptionParts.push(`${managerInviteCount} manager invitation(s)`);
        if (participantInviteCount > 0) descriptionParts.push(`${participantInviteCount} participant invitation(s)`);

        toast({
          title: t('invitations.campaign_sent', { defaultValue: 'Campaign sent' }),
          description: descriptionParts.length > 0
            ? t('invitations.campaign_sent_desc', {
              defaultValue: `Delivered ${descriptionParts.join(' and ')}.`,
              details: descriptionParts.join(' and '),
            })
            : t('invitations.campaign_sent_count', {
              defaultValue: `Delivered ${sent || created.length} invitation(s).`,
              count: sent || created.length,
            }),
        });
      }

      setRefreshKey(k => k + 1);
      setViewCampaignOpen(false);
    } catch (error: any) {
      console.error('Failed to send campaign locally:', error);
      toast({ title: 'Error', description: 'Failed to send campaign', variant: 'destructive' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleScheduleCampaign = async (
    campaignId: string,
    scheduleValue: string,
    options?: { silent?: boolean },
  ) => {
    if (!scheduleValue) {
      toast({
        title: t('invitations.schedule_required_title', { defaultValue: 'Schedule time required' }),
        description: t('invitations.schedule_required_desc', { defaultValue: 'Please choose when this campaign should be sent.' }),
        variant: 'destructive',
      });
      return;
    }

    const scheduledIso = new Date(scheduleValue).toISOString();
    if (new Date(scheduledIso).getTime() <= Date.now()) {
      toast({
        title: t('invitations.schedule_invalid_title', { defaultValue: 'Invalid schedule time' }),
        description: t('invitations.schedule_invalid_desc', { defaultValue: 'Scheduled time must be in the future.' }),
        variant: 'destructive',
      });
      return;
    }

    setIsActionLoading(true);
    try {
      await syncCampaignAudienceBeforeDelivery(campaignId);

      await campaignApi.scheduleCampaign(campaignId, scheduledIso).catch((error) => {
        console.warn('Backend scheduleCampaign failed, continuing with local flow:', error);
      });

      campaignStore.update(campaignId, {
        status: 'Scheduled',
        scheduledAt: scheduledIso,
      } as any);

      if (!options?.silent) {
        toast({
          title: t('invitations.campaign_scheduled', { defaultValue: 'Campaign scheduled' }),
          description: t('invitations.campaign_scheduled_desc', {
            defaultValue: 'Invitations will be sent at the scheduled time.',
            datetime: format(new Date(scheduledIso), 'MMM d, yyyy HH:mm'),
          }),
        });
      }

      setScheduleDialogOpen(false);
      setScheduleCampaignTargetId(null);
      setScheduledAt('');
      setRefreshKey(k => k + 1);
      setViewCampaignOpen(false);
    } catch (error) {
      console.error('Failed to schedule campaign:', error);
      toast({ title: 'Error', description: t('invitations.schedule_failed', { defaultValue: 'Failed to schedule campaign' }), variant: 'destructive' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const openScheduleDialog = (campaignId: string) => {
    setScheduleCampaignTargetId(campaignId);
    setScheduledAt('');
    setScheduleDialogOpen(true);
  };

  const confirmScheduleCampaign = async () => {
    if (!scheduleCampaignTargetId) return;
    await handleScheduleCampaign(scheduleCampaignTargetId, scheduledAt);
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
    setIsCampaignDetailLoading(true);
    setViewCampaignOpen(true);

    try {
      const details = await campaignApi.getCampaignById(campaign.id);
      const resolvedCampaign = details as unknown as EMSCampaign;
      setSelectedCampaign(resolvedCampaign);

      const apiInvitations = await getInvitationsByCampaign(campaign.id).catch(() => [] as ApiInvitation[]);
      const localInvitations = invitationStore.getByCampaign(campaign.id);
      setCampaignDetailInvitations(
        mergeCampaignDetailInvitations(
          resolvedCampaign,
          apiInvitations,
          localInvitations,
          participants,
          managers,
        ),
      );
    } catch (error) {
      console.error('Failed to fetch campaign details:', error);
      setSelectedCampaign(campaign);
      const localInvitations = invitationStore.getByCampaign(campaign.id);
      setCampaignDetailInvitations(
        mergeCampaignDetailInvitations(campaign, [], localInvitations, participants, managers),
      );
    } finally {
      setIsActionLoading(false);
      setIsCampaignDetailLoading(false);
    }
  };

  const refreshCampaignDetailInvitations = async (campaign: EMSCampaign) => {
    setIsCampaignDetailLoading(true);
    try {
      const apiInvitations = await getInvitationsByCampaign(campaign.id).catch(() => [] as ApiInvitation[]);
      const localInvitations = invitationStore.getByCampaign(campaign.id);
      setCampaignDetailInvitations(
        mergeCampaignDetailInvitations(campaign, apiInvitations, localInvitations, participants, managers),
      );
    } finally {
      setIsCampaignDetailLoading(false);
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

  const getInvitationRecipientLabel = (inv: EMSInvitation) => {
    if (inv.recipientType === 'manager' || inv.managerId) {
      const manager = managers.find(m => m.id === inv.managerId);
      if (manager) return getManagerDisplayName(manager);
      if (inv.managerEmail) return inv.managerEmail;
      if (inv.notes) return inv.notes;
      return 'Manager';
    }
    return getParticipantName(inv.participantId);
  };

  const getInvitationRecipientEmail = (inv: EMSInvitation) => {
    if (inv.recipientType === 'manager' || inv.managerId) {
      return inv.managerEmail || managers.find(m => m.id === inv.managerId)?.email || '-';
    }
    const participant = participants.find(p => p.id === inv.participantId);
    return participant?.email || inv.participantEmail || '-';
  };

  const renderWizardStep = () => {
    switch (wizardStep) {
      case 1: {
        const todayStr = new Date().toISOString().split('T')[0];
        const currentEvent = events.find(e => e.id === selectedEventId);
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
                {/* If opened from an event page, show the event name as read-only */}
                {eventId && currentEvent ? (
                  <Card className="border border-primary/30 bg-primary/5">
                    <CardContent className="p-3 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{t('common.event')}:</span>
                      <span className="font-medium">{currentEvent.name}</span>
                    </CardContent>
                  </Card>
                ) : (
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
                )}
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
                    min={todayStr}
                    value={rsvpDeadline}
                    onChange={(e) => setRsvpDeadline(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        );
      }
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="font-medium">{t('invitations.step_2_select_audience')}</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={audienceMode === 'role' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setAudienceMode('role');
                  setSelectedDelegations([]);
                  setSelectedParticipantIds([]);
                  setSelectedManagerIds([]);
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
                  setSelectedManagerIds([]);
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
                  setSelectedManagerIds([]);
                }}
              >
                {t('invitations.select_individuals')}
              </Button>
              <Button
                variant={audienceMode === 'manager' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setAudienceMode('manager');
                  setSelectedRoles([]);
                  setSelectedDelegations([]);
                  setSelectedParticipantIds([]);
                }}
              >
                <UserCog className="h-4 w-4 mr-1" />
                Select Manager
              </Button>
            </div>

            {audienceMode === 'role' && (
              participants.length === 0 && !isLoading ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground mb-2">{t('invitations.no_participants_in_system')}</p>
                    <Button variant="outline" onClick={() => navigate('/admin/participants')}>
                      {t('invitations.add_participants_first')}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
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
              )
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
              participants.length === 0 && !isParticipantsLoading ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground mb-2">{t('invitations.no_participants_in_system')}</p>
                    <Button variant="outline" onClick={() => navigate('/admin/participants')}>
                      {t('invitations.add_participants_first')}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      {participants.length} participant(s) available
                      {selectedParticipantIds.length > 0 && ` · ${selectedParticipantIds.length} selected`}
                    </p>
                    {isParticipantsLoading && (
                      <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Refreshing...
                      </span>
                    )}
                  </div>
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
                    {isParticipantsLoading && participants.length === 0 ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Loading participants...</p>
                      </div>
                    ) : filteredParticipantsForSelection.length === 0 ? (
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
                            onClick={(e) => e.stopPropagation()}
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
              )
            )}

            {audienceMode === 'manager' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {managers.length} manager(s) available
                    {selectedManagerIds.length > 0 && ` · ${selectedManagerIds.length} selected`}
                  </p>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search managers by name, email, or organization..."
                    value={managerSearchTerm}
                    onChange={(e) => setManagerSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="max-h-52 overflow-y-auto border rounded-lg">
                  {filteredManagersForSelection.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No managers found. Create a new manager below.
                    </p>
                  ) : (
                    filteredManagersForSelection.map(manager => (
                      <div
                        key={manager.id}
                        className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${selectedManagerIds.includes(manager.id) ? 'bg-primary/5' : ''
                          }`}
                        onClick={() => toggleManager(manager.id)}
                      >
                        <Checkbox
                          checked={selectedManagerIds.includes(manager.id)}
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={() => toggleManager(manager.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {getManagerDisplayName(manager)}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {manager.email}
                          </p>
                        </div>
                        {(manager.organization || manager.country) && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            {manager.organization || manager.country}
                          </Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {selectedManagerIds.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedManagerIds([])}
                  >
                    Clear manager selection
                  </Button>
                )}

                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label>Create new manager</Label>
                      <p className="text-xs text-muted-foreground">
                        Register a team manager, then select them for this campaign.
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateManagerOpen(true)}>
                      <UserCog className="h-4 w-4 mr-2" />
                      New Manager
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{t('invitations.selected_audience')}</p>
                {audienceMode === 'manager' ? (
                  <>
                    <p className="text-2xl font-bold">
                      {resolveManagerTargetsFromSelection().length}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      manager invitation(s) selected
                    </p>
                  </>
                ) : audienceMode === 'individual' ? (
                  <p className="text-2xl font-bold">
                    {selectedParticipantIds.length}
                  </p>
                ) : audienceMode === 'delegation' ? (
                  <>
                    <p className="text-2xl font-bold">
                      {resolveManagerTargetsFromDelegations().length}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      delegation manager invitation(s) will be sent
                    </p>
                  </>
                ) : (
                  <p className="text-2xl font-bold">
                    {t('common.participants_count', { count: getFilteredAudience().length })}
                  </p>
                )}
              </CardContent>
            </Card>
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
        const managerTargets = resolveAllManagerTargets();

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
                {audienceMode === 'manager' ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Managers:</span>
                    <span>{managerTargets.length} manager(s)</span>
                  </div>
                ) : audienceMode === 'delegation' ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delegation managers:</span>
                    <span>{managerTargets.length} manager(s)</span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('common.audience')}:</span>
                    <span>{t('common.participants_count', { count: audience.length })}</span>
                  </div>
                )}
                {managerTargets.length > 0 && audienceMode !== 'manager' && audienceMode !== 'delegation' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Managers:</span>
                    <span>{managerTargets.length} manager invitation(s)</span>
                  </div>
                )}
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
              {audienceMode === 'manager'
                ? `${managerTargets.length} manager invitation(s) will be created.`
                : audience.length === 1
                  ? t('invitations.review_create_desc_singular')
                  : t('invitations.review_create_desc_plural', { count: audience.length })}
            </p>

            <div className="space-y-3 border-t pt-4">
              <Label>{t('invitations.delivery_option', { defaultValue: 'When should invitations be sent?' })}</Label>
              <p className="text-xs text-muted-foreground">
                {t('invitations.delivery_option_desc', { defaultValue: 'Choose to send immediately, schedule for later, or save as draft.' })}
              </p>
              <div className="grid gap-2">
                <Label htmlFor="campaign-schedule-at">{t('invitations.schedule_datetime', { defaultValue: 'Schedule date & time' })}</Label>
                <Input
                  id="campaign-schedule-at"
                  type="datetime-local"
                  value={scheduledAt}
                  min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t('invitations.schedule_hint', { defaultValue: 'Optional — use Schedule Campaign below, or Send Now to deliver immediately.' })}
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Campaign detail view
  const CampaignDetailDialog = () => {
    if (!selectedCampaign) return null;

    const campInvitations = campaignDetailInvitations;
    const eventName = (selectedCampaign as any)?.event?.name || events.find(e => e.id === selectedCampaign.eventId)?.name;
    const campaignStats = getCampaignStats(selectedCampaign);

    return (
      <Dialog
        open={viewCampaignOpen}
        onOpenChange={(open) => {
          setViewCampaignOpen(open);
          if (!open) {
            setSelectedCampaign(null);
            setCampaignDetailInvitations([]);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCampaign.name}</DialogTitle>
            <DialogDescription>
              {eventName || 'Unknown Event'} • {t('common.participants_count', { count: campaignStats.totalInvitations })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 my-4">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{campaignStats.totalInvitations}</p>
                <p className="text-xs text-muted-foreground">Invitations</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{campaignStats.delivered}</p>
                <p className="text-xs text-muted-foreground">{t('invitations.delivered')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{campaignStats.opened}</p>
                <p className="text-xs text-muted-foreground">Opened</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-success">{campaignStats.accepted}</p>
                <p className="text-xs text-muted-foreground">{t('invitations.accepted')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-warning">{campaignStats.maybe}</p>
                <p className="text-xs text-muted-foreground">{t('common.maybe')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-destructive">{campaignStats.declined}</p>
                <p className="text-xs text-muted-foreground">{t('events.declined')}</p>
              </CardContent>
            </Card>
          </div>

          {selectedCampaign.status === 'Draft' && (
            <div className="bg-muted/50 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <p className="font-medium">{t('invitations.campaign_not_sent')}</p>
                <p className="text-sm text-muted-foreground">{t('invitations.click_send_to_deliver')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={isActionLoading}
                  onClick={() => openScheduleDialog(selectedCampaign.id)}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {t('invitations.schedule_campaign', { defaultValue: 'Schedule Campaign' })}
                </Button>
                <Button
                  disabled={isActionLoading}
                  onClick={async () => {
                    await handleSendCampaign(selectedCampaign.id);
                    const refreshed = campaignStore.getById(selectedCampaign.id) || selectedCampaign;
                    setSelectedCampaign(refreshed);
                    await refreshCampaignDetailInvitations(refreshed);
                  }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {t('invitations.send_now')}
                </Button>
              </div>
            </div>
          )}

          {selectedCampaign.status === 'Scheduled' && (
            <div className="bg-warning/10 border border-warning/20 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <p className="font-medium">{t('invitations.campaign_scheduled_title', { defaultValue: 'Campaign scheduled' })}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedCampaign as any).scheduledAt
                    ? t('invitations.campaign_scheduled_for', {
                      defaultValue: 'Invitations will be sent on {{datetime}}.',
                      datetime: format(new Date((selectedCampaign as any).scheduledAt), 'MMM d, yyyy HH:mm'),
                    })
                    : t('invitations.campaign_scheduled_pending', { defaultValue: 'Invitations will be sent at the scheduled time.' })}
                </p>
              </div>
              <Button
                variant="outline"
                disabled={isActionLoading}
                onClick={() => handleSendCampaign(selectedCampaign.id)}
              >
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
              {isCampaignDetailLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                  </TableCell>
                </TableRow>
              ) : campInvitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {t('invitations.no_invitations_yet', { defaultValue: 'No participants found for this campaign.' })}
                  </TableCell>
                </TableRow>
              ) : (
                campInvitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{getInvitationRecipientLabel(inv)}</p>
                        <p className="text-sm text-muted-foreground">{getInvitationRecipientEmail(inv)}</p>
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
                      {inv.token ? (
                        <Button variant="ghost" size="sm" onClick={() => copyInviteLink(inv.token)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
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
                      (wizardStep === 2 && !hasValidAudience()) ||
                      (wizardStep === 3 && !selectedTemplateId)
                    }
                  >
                    {t('invitations.next')}
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={isActionLoading}
                      onClick={() => handleCreateCampaign('draft')}
                    >
                      {isActionLoading && pendingCreateAction === 'draft' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {t('invitations.save_as_draft', { defaultValue: 'Save as Draft' })}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={isActionLoading || !scheduledAt}
                      onClick={() => handleCreateCampaign('schedule')}
                    >
                      {isActionLoading && pendingCreateAction === 'schedule' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Clock className="h-4 w-4 mr-2" />
                      )}
                      {t('invitations.schedule_campaign', { defaultValue: 'Schedule Campaign' })}
                    </Button>
                    <Button disabled={isActionLoading} onClick={() => handleCreateCampaign('send')}>
                      {isActionLoading && pendingCreateAction === 'send' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      {t('invitations.send_now')}
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">{t('invitations.loading', 'Loading invitations...')}</p>
          </div>
        </Card>
      ) : (
        <>
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
                            {campaign.status === 'Scheduled' && (campaign as any).scheduledAt && (
                              <>
                                {' · '}
                                <Clock className="inline h-3 w-3 mr-0.5" />
                                {format(new Date((campaign as any).scheduledAt), 'MMM d, HH:mm')}
                              </>
                            )}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{getEventName(campaign)}</TableCell>
                      <TableCell>{getCampaignStats(campaign).totalInvitations}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex gap-1 flex-wrap">
                            <Badge variant="outline" className="bg-muted/40 text-foreground border-border">
                              {getCampaignStats(campaign).delivered} delivered
                            </Badge>
                            <Badge variant="outline" className="bg-muted/40 text-foreground border-border">
                              {getCampaignStats(campaign).opened} opened
                            </Badge>
                          </div>
                          <div className="flex gap-1 flex-wrap">
                            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                              {getCampaignStats(campaign).accepted}
                            </Badge>
                            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                              {getCampaignStats(campaign).maybe}
                            </Badge>
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                              {getCampaignStats(campaign).declined}
                            </Badge>
                          </div>
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
                              <>
                                <DropdownMenuItem onClick={() => handleSendCampaign(campaign.id)}>
                                  <Send className="h-4 w-4 mr-2" />{t('invitations.send_now')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openScheduleDialog(campaign.id)}>
                                  <Clock className="h-4 w-4 mr-2" />{t('invitations.schedule_campaign', { defaultValue: 'Schedule Campaign' })}
                                </DropdownMenuItem>
                              </>
                            )}
                            {campaign.status === 'Scheduled' && (
                              <DropdownMenuItem onClick={() => handleSendCampaign(campaign.id)}>
                                <Send className="h-4 w-4 mr-2" />{t('invitations.send_now')}
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
                        <p className="font-medium">{getInvitationRecipientLabel(inv)}</p>
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
        </>
      )}

      <Dialog open={isCreateManagerOpen} onOpenChange={(open) => {
        setIsCreateManagerOpen(open);
        if (!open) resetNewManagerForm();
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Team Manager</DialogTitle>
            <DialogDescription>
              Add a new team manager to the system. They will be selected for this campaign automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="manager-first-name">First Name <RequiredMark /></Label>
                <Input
                  id="manager-first-name"
                  placeholder="e.g. Ahmed"
                  value={newManagerForm.firstName}
                  onChange={(e) => setNewManagerForm(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager-last-name">Last Name <RequiredMark /></Label>
                <Input
                  id="manager-last-name"
                  placeholder="e.g. Khan"
                  value={newManagerForm.lastName}
                  onChange={(e) => setNewManagerForm(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manager-email">Email <RequiredMark /></Label>
              <Input
                id="manager-email"
                type="email"
                placeholder="e.g. manager@example.com"
                value={newManagerForm.email}
                onChange={(e) => setNewManagerForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="manager-password">Password <RequiredMark /></Label>
                <Input
                  id="manager-password"
                  type="password"
                  placeholder="Enter password"
                  value={newManagerForm.password}
                  onChange={(e) => setNewManagerForm(prev => ({ ...prev, password: e.target.value }))}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager-confirm-password">Confirm Password <RequiredMark /></Label>
                <Input
                  id="manager-confirm-password"
                  type="password"
                  placeholder="Re-enter password"
                  value={newManagerForm.confirmPassword}
                  onChange={(e) => setNewManagerForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manager-phone">Phone <RequiredMark /></Label>
              <Input
                id="manager-phone"
                type="tel"
                placeholder={INTERNATIONAL_PHONE_PLACEHOLDER}
                value={newManagerForm.phone}
                onChange={(e) => {
                  const phone = sanitizePhoneInput(e.target.value);
                  setNewManagerForm(prev => ({ ...prev, phone }));
                  if (newManagerPhoneError) {
                    setNewManagerPhoneError(validateInternationalPhone(phone) || '');
                  }
                }}
                onBlur={() => setNewManagerPhoneError(validateInternationalPhone(newManagerForm.phone) || '')}
                className={newManagerPhoneError ? 'border-red-500' : undefined}
              />
              {newManagerPhoneError && (
                <p className="text-sm text-red-500">{newManagerPhoneError}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="manager-country">Country <RequiredMark /></Label>
                <Input
                  id="manager-country"
                  placeholder="e.g. Pakistan"
                  value={newManagerForm.country}
                  onChange={(e) => setNewManagerForm(prev => ({ ...prev, country: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager-organization">Organization <RequiredMark /></Label>
                <Input
                  id="manager-organization"
                  placeholder="e.g. National Sports Council"
                  value={newManagerForm.organization}
                  onChange={(e) => setNewManagerForm(prev => ({ ...prev, organization: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manager-federation">Sport Federation <RequiredMark /></Label>
              <Input
                id="manager-federation"
                placeholder="e.g. Saudi Sports Federation"
                value={newManagerForm.federation}
                onChange={(e) => setNewManagerForm(prev => ({ ...prev, federation: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateManagerOpen(false)} disabled={isCreatingManager}>
              Cancel
            </Button>
            <Button onClick={handleCreateManager} disabled={isCreatingManager}>
              {isCreatingManager ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserCog className="h-4 w-4 mr-2" />}
              Create Manager
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleDialogOpen} onOpenChange={(open) => {
        setScheduleDialogOpen(open);
        if (!open) {
          setScheduleCampaignTargetId(null);
          setScheduledAt('');
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('invitations.schedule_campaign', { defaultValue: 'Schedule Campaign' })}</DialogTitle>
            <DialogDescription>
              {t('invitations.schedule_dialog_desc', { defaultValue: 'Choose when invitations should be sent automatically.' })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="schedule-campaign-at">{t('invitations.schedule_datetime', { defaultValue: 'Schedule date & time' })}</Label>
            <Input
              id="schedule-campaign-at"
              type="datetime-local"
              value={scheduledAt}
              min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button disabled={!scheduledAt || isActionLoading} onClick={confirmScheduleCampaign}>
              {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Clock className="h-4 w-4 mr-2" />}
              {t('invitations.schedule_campaign', { defaultValue: 'Schedule Campaign' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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










