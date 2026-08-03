import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useManagerSession } from '@/contexts/ManagerSessionContext';
import { eventStore, invitationStore, participantStore, registrationStore, templateStore, campaignStore, EMSInvitation, EMSEvent, EMSInvitationTemplate } from '@/lib/emsStore';
import { teamMemberStore, teamStore, delegationStore } from '@/lib/teamStore';
import { getMyDelegations } from '@/api/delegationApi';
import { getMyTeams } from '@/api/teamApi';
import { getEvents } from '@/api/eventApi';
import { getMyInvitations, getInvitationsForDelegations, normalizeInvitation, respondToInvitationById, InvitationResponse, Invitation } from '@/api/invitationApi';
import { getCampaignsForManager, getCampaignDelegationIds, getCampaignManagerRoleIds, isSentCampaignStatus, Campaign } from '@/api/campaignApi';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InvitationPreviewModal } from '@/components/invitations/InvitationPreviewModal';
import { Mail, X, Calendar, MapPin, Clock, AlertCircle, Loader2, Crown, Eye, Flag, CheckCircle2, HelpCircle, ArrowRight, Sparkles, LayoutGrid, List } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const VIEW_MODE_KEY = 'ems_manager_invitations_view_mode';
type ViewMode = 'cards' | 'table';

const readStoredViewMode = (): ViewMode => {
  try {
    return localStorage.getItem(VIEW_MODE_KEY) === 'table' ? 'table' : 'cards';
  } catch {
    return 'cards';
  }
};

interface DelegationInvitation {
  invitation: EMSInvitation;
  event: EMSEvent;
  participantName: string;
  participantEmail: string;
  delegationName: string;
  rawSource?: any;
}

interface DelegationNotice {
  id: string;
  delegationName: string;
  eventName: string;
  teamCount: number;
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';
  rejectionReason?: string;
}

interface InvitationsQueryData {
  invitations: DelegationInvitation[];
  delegationNotices: DelegationNotice[];
  managerCampaigns: Campaign[];
  managerDelegations: any[];
  registeredEventIds: Set<string>;
  invitationSources: Record<string, any>;
}

const PENDING_INVITATION_STATUSES = new Set([
  'pending',
  'sent',
  'delivered',
  'opened',
  'invited',
]);

const isRealInvitationId = (id: string): boolean =>
  Boolean(id) && !id.startsWith('camp-inv-');

const getInvitationResponseStatus = (invitation: Pick<EMSInvitation, 'id' | 'status'> & { rsvpResponse?: string }): string => {
  const raw = String(invitation.rsvpResponse || invitation.status || '').trim();
  if (!raw) return 'Pending';
  const lower = raw.toLowerCase();
  if (lower === 'accepted' || lower === 'accept') return 'Accepted';
  if (lower === 'declined' || lower === 'reject' || lower === 'rejected') return 'Declined';
  if (lower === 'maybe') return 'Maybe';
  if (PENDING_INVITATION_STATUSES.has(lower)) return 'Pending';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const isInvitationAccepted = (invitation: EMSInvitation): boolean =>
  getInvitationResponseStatus(invitation) === 'Accepted';

const isInvitationDeclined = (invitation: EMSInvitation): boolean =>
  getInvitationResponseStatus(invitation) === 'Declined';

const canRespondToInvitation = (invitation: EMSInvitation): boolean => {
  if (!isRealInvitationId(invitation.id)) return false;
  const status = getInvitationResponseStatus(invitation);
  return status === 'Pending' || status === 'Maybe';
};

const mergeInvitationAfterRespond = (
  existing: EMSInvitation,
  updated: Invitation,
  response: InvitationResponse,
): EMSInvitation => ({
  ...existing,
  ...updated,
  id: existing.id,
  eventId: updated.eventId || existing.eventId,
  campaignId: updated.campaignId || existing.campaignId,
  templateId: updated.templateId || existing.templateId,
  token: updated.token || existing.token,
  status: (updated.status || response) as EMSInvitation['status'],
  rsvpDeadline: updated.rsvpDeadline || existing.rsvpDeadline,
  respondedAt: updated.respondedAt || existing.respondedAt || new Date().toISOString(),
  rsvpResponse: updated.rsvpResponse || response,
} as EMSInvitation);

const toPreviewTemplate = (raw: unknown): EMSInvitationTemplate | null => {
  if (!raw || typeof raw !== 'object') return null;
  const template = raw as Record<string, unknown>;
  const id = template.id || template._id;
  if (!id) return null;
  return {
    id: String(id),
    name: String(template.name || ''),
    subject: String(template.subject || ''),
    body: String(template.body || template.content || ''),
    language: String(template.language || 'en'),
    variables: Array.isArray(template.variables) ? template.variables.map(String) : [],
    createdAt: String(template.createdAt || template.created_at || new Date().toISOString()),
  };
};

const syncTemplateToStore = (raw: unknown) => {
  const template = toPreviewTemplate(raw);
  if (!template) return;
  templateStore.upsert(template);
};

const resolveDelegationName = (
  delegationId: string | undefined,
  serverDelegations: any[],
  fallbackCountry?: string,
  embeddedDelegation?: any,
): string => {
  const embeddedLabel =
    embeddedDelegation?.name ||
    embeddedDelegation?.country ||
    embeddedDelegation?.delegationName;
  if (embeddedLabel) {
    return String(embeddedLabel).toLowerCase().includes('delegation')
      ? String(embeddedLabel)
      : `${embeddedLabel} Delegation`;
  }

  if (delegationId) {
    const serverDelegation = serverDelegations.find(
      (entry) => String(entry.id || entry._id) === String(delegationId),
    );
    const localDelegation = delegationStore.getById(delegationId);
    const label =
      serverDelegation?.name ||
      serverDelegation?.delegationName ||
      serverDelegation?.country ||
      localDelegation?.country;
    if (label) {
      return String(label).toLowerCase().includes('delegation') ? String(label) : `${label} Delegation`;
    }
  }
  return '';
};

/** Delegation id only when present on the invitation payload — not from manager-owned delegations or campaign targets. */
const getInvitationDelegationIdFromRaw = (raw: any): string =>
  String(
    raw?.delegationId ||
    raw?.delegation_id ||
    raw?.delegation?.id ||
    raw?.delegation?._id ||
    '',
  );

const resolveInvitationDelegation = (
  normalized: any,
  serverDelegations: any[],
  rawSource?: any,
): { delegationId: string; delegationName: string } => {
  const source = rawSource || normalized;
  const delegationId = getInvitationDelegationIdFromRaw(source);
  if (!delegationId) {
    return { delegationId: '', delegationName: '' };
  }

  return {
    delegationId,
    delegationName: resolveDelegationName(
      delegationId,
      serverDelegations,
      undefined,
      source?.delegation || normalized?.delegation,
    ),
  };
};

const isVIPTemplate = (template: EMSInvitationTemplate): boolean => {
  const name = template.name.toLowerCase();
  const subject = template.subject.toLowerCase();
  return name.includes('vip') || name.includes('exclusive') ||
    subject.includes('vip') || subject.includes('exclusive');
};

const formatEventDates = (event: EMSEvent): string => {
  if (!event?.startDate) return 'N/A';
  const startLabel = new Date(event.startDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  if (!event.endDate || event.endDate === event.startDate) return startLabel;
  const endLabel = new Date(event.endDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startLabel} - ${endLabel}`;
};

const getInvitationTemplate = (
  invitation: EMSInvitation,
  rawSource?: any,
  campaigns: Campaign[] = [],
): EMSInvitationTemplate | null => {
  const fromInvitation = toPreviewTemplate(rawSource?.template);
  if (fromInvitation) return fromInvitation;

  const campaign =
    rawSource?.campaign ||
    getCampaignForInvitation(invitation, campaigns, rawSource);
  const fromCampaign = toPreviewTemplate(campaign?.template);
  if (fromCampaign) return fromCampaign;

  if (invitation.templateId) {
    const fromStore = templateStore.getById(invitation.templateId);
    if (fromStore) return fromStore;
  }

  if (invitation.campaignId) {
    const storedCampaign = campaignStore.getById(invitation.campaignId) as Campaign | undefined;
    const fromStoredCampaign = toPreviewTemplate(storedCampaign?.template);
    if (fromStoredCampaign) return fromStoredCampaign;
    if (storedCampaign?.templateId) {
      return templateStore.getById(storedCampaign.templateId) || null;
    }
  }

  return null;
};

const getCampaignForInvitation = (
  invitation: EMSInvitation,
  campaigns: Campaign[] = [],
  rawSource?: any,
): Campaign | null => {
  const embedded = rawSource?.campaign;
  const campaignId =
    invitation.campaignId ||
    embedded?.id ||
    embedded?._id ||
    rawSource?.campaignId ||
    rawSource?.campaign_id;

  if (embedded && typeof embedded === 'object') {
    if (embedded.name || embedded.subject) return embedded as Campaign;
    if (campaignId) {
      const fromList = campaigns.find(c => String(c.id) === String(campaignId));
      if (fromList) return fromList;
    }
  }

  if (!campaignId) return null;
  return campaigns.find(c => String(c.id) === String(campaignId))
    || (campaignStore.getById(campaignId) as Campaign | undefined)
    || null;
};

const dedupeInvitations = (items: DelegationInvitation[]): DelegationInvitation[] => {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = `${item.invitation.campaignId || item.invitation.id}-${item.event.id}-${item.invitation.delegationId || item.delegationName}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const buildEventFromRecord = (eventId: string, embedded?: any): EMSEvent | null => {
  if (!embedded || typeof embedded !== 'object') return null;
  const id = String(eventId || embedded.id || embedded._id || '');
  if (!id) return null;
  return {
    id,
    name: embedded.name || 'Event',
    theme: embedded.theme || '',
    startDate: embedded.startDate || embedded.start_date || '',
    endDate: embedded.endDate || embedded.end_date || '',
    city: embedded.city || '',
    venues: embedded.venues || [],
    status: embedded.status || 'Published',
    clientGroups: embedded.clientGroups || embedded.client_groups || [],
    eventType: embedded.eventType || embedded.event_type || 'individual',
    sportCategories: embedded.sportCategories || embedded.sport_categories || [],
    allowTeamRegistration: embedded.allowTeamRegistration || embedded.allow_team_registration || false,
    createdAt: embedded.createdAt || embedded.created_at || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

const resolveInvitationEvent = (
  normalized: any,
  serverEvents: any[],
): EMSEvent | null => {
  const eventId = String(
    normalized.eventId ||
    normalized.event_id ||
    normalized.event?.id ||
    normalized.event?._id ||
    normalized.campaign?.eventId ||
    normalized.campaign?.event?.id ||
    '',
  );

  const embedded = normalized.event || normalized.campaign?.event;
  const fromEmbedded = buildEventFromRecord(eventId, embedded);
  if (fromEmbedded) return fromEmbedded;

  if (eventId) {
    const fromStore = eventStore.getById(eventId);
    if (fromStore) return fromStore;

    const fromServer = serverEvents.find(
      (entry) => String(entry.id || entry._id) === eventId,
    );
    if (fromServer) {
      return buildEventFromRecord(eventId, fromServer);
    }
  }

  if (normalized.campaign?.name || normalized.campaign?.event?.name) {
    return {
      id: eventId || String(normalized.id || normalized.campaign?.id || 'event'),
      name: normalized.campaign?.event?.name || normalized.campaign?.name || 'Event',
      theme: '',
      startDate: normalized.campaign?.event?.startDate || normalized.campaign?.event?.start_date || '',
      endDate: normalized.campaign?.event?.endDate || normalized.campaign?.event?.end_date || '',
      city: normalized.campaign?.event?.city || '',
      venues: [],
      status: 'Published',
      clientGroups: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return null;
};

const normalizedToStoreInvitation = (normalized: any): EMSInvitation => ({
  id: String(normalized.id || ''),
  participantId: normalized.participantId || normalized.participant_id || '',
  participantEmail: normalized.participantEmail || normalized.participant_email || '',
  managerId: normalized.managerId || normalized.manager_id || '',
  managerEmail: normalized.managerEmail || normalized.manager_email || '',
  delegationId: normalized.delegationId || normalized.delegation_id || '',
  recipientType: normalized.recipientType || normalized.recipient_type || 'manager',
  eventId: normalized.eventId || normalized.event_id || normalized.event?.id || normalized.campaign?.eventId || '',
  status: normalized.status || 'Pending',
  rsvpDeadline: normalized.rsvpDeadline || normalized.rsvp_deadline || normalized.campaign?.rsvpDeadline || '',
  token: normalized.token || String(normalized.id || ''),
  campaignId: normalized.campaignId || normalized.campaign_id || normalized.campaign?.id || '',
  templateId: normalized.templateId || normalized.template_id || normalized.template?.id || normalized.campaign?.templateId || '',
  createdAt: normalized.createdAt || normalized.created_at || new Date().toISOString(),
  updatedAt: normalized.updatedAt || normalized.updated_at || new Date().toISOString(),
});

const ManagerInvitationsPage: React.FC = () => {
  const { manager } = useManagerSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedInvitation, setSelectedInvitation] = useState<DelegationInvitation | null>(null);
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EMSInvitationTemplate | null>(null);
  const [previewInvitation, setPreviewInvitation] = useState<EMSInvitation | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [respondingInvitationId, setRespondingInvitationId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(readStoredViewMode);

  const setViewModeAndPersist = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      // ignore storage failures
    }
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['manager', 'invitations'],
    queryFn: fetchInvitationsData,
    enabled: !!manager,
  });

  const invitations = data?.invitations ?? [];
  const delegationNotices = data?.delegationNotices ?? [];
  const managerCampaigns = data?.managerCampaigns ?? [];
  const managerDelegations = data?.managerDelegations ?? [];
  const registeredEventIds = data?.registeredEventIds ?? new Set<string>();
  const invitationSources = data?.invitationSources ?? {};

  useEffect(() => {
    if (!manager) return;

    const handleRefresh = () => {
      void refetch();
    };

    window.addEventListener('storage', handleRefresh);
    window.addEventListener('delegation-status-updated', handleRefresh as EventListener);

    return () => {
      window.removeEventListener('storage', handleRefresh);
      window.removeEventListener('delegation-status-updated', handleRefresh as EventListener);
    };
  }, [manager, refetch]);

  async function fetchInvitationsData(): Promise<InvitationsQueryData> {
    if (!manager) {
      return {
        invitations: [],
        delegationNotices: [],
        managerCampaigns: [],
        managerDelegations: [],
        registeredEventIds: new Set(),
        invitationSources: {},
      };
    }

    {
      // Fetch everything from the server in parallel, including this manager's
      // invitations via getMyInvitations(). IMPORTANT: getMyInvitations() in
      // invitationApi.ts must check the manager's auth token
      // (ems_manager_token), not just ems_participant_token, or it will
      // always return [] when called from this page — see the updated
      // invitationApi.ts.
      const [serverDelegations, serverTeams, serverEvents, serverInvitations] = await Promise.all([
        getMyDelegations().catch(() => []),
        getMyTeams().catch(() => []),
        getEvents().catch(() => []),
        getMyInvitations().catch(() => []),
      ]);

      // Build the set of delegation IDs owned by this manager. Server data only —
      // the local delegationStore cache can outlive deleted server records (e.g.
      // after a DB reset during testing) and must never override live truth here.
      const managerDelegationIds = new Set<string>();
      for (const del of serverDelegations) {
        const delId = del.id || del._id;
        if (delId) managerDelegationIds.add(String(delId));
      }

      const delegationCampaigns = await getCampaignsForManager(Array.from(managerDelegationIds), manager.id).catch(() => []);

      for (const campaign of delegationCampaigns) {
        syncTemplateToStore(campaign.template);
        const existingCampaign = campaignStore.getById(campaign.id);
        const campaignPayload = {
          name: campaign.name,
          subject: campaign.subject || '',
          content: campaign.content || '',
          status: campaign.status || 'Draft',
          eventId: campaign.eventId || '',
          templateId: campaign.templateId || campaign.template?.id || '',
          targetRoles: campaign.targetRoles || [],
          targetNationalities: campaign.targetNationalities || [],
          targetDelegationIds: getCampaignDelegationIds(campaign),
          rsvpDeadline: campaign.rsvpDeadline || '',
          audienceIds: campaign.audienceIds || [],
        };
        if (existingCampaign) {
          campaignStore.update(campaign.id, campaignPayload);
        } else {
          campaignStore.createWithId(campaign.id, campaignPayload);
        }
      }

      const registeredEvents = new Set<string>();
      for (const del of serverDelegations) {
        const eventId = String(del.eventId || del.event_id || del.event?.id || del.event?._id || '');
        const status = String(del.status || '').toLowerCase();
        if (eventId && status && status !== 'draft') {
          registeredEvents.add(eventId);
        }
      }
      const delegationScopedInvitations = await getInvitationsForDelegations(Array.from(managerDelegationIds)).catch(() => []);
      const serverInvitationsMerged = [
        ...(Array.isArray(serverInvitations) ? serverInvitations : []),
        ...delegationScopedInvitations,
      ];

      const sourceMap: Record<string, any> = {};
      for (const rawInv of serverInvitationsMerged as any[]) {
        const normalized = normalizeInvitation(rawInv);
        if (!normalized.id) continue;
        sourceMap[normalized.id] = normalized;
        syncTemplateToStore(normalized.template);
        syncTemplateToStore(normalized.campaign?.template);
      }

      // Synchronize remote invitations into the local invitationStore BEFORE
      // building the delegation-matching list below, so freshly-fetched
      // invitations are included in this render pass.
      if (serverInvitationsMerged.length > 0) {
        for (const inv of serverInvitationsMerged as any[]) {
          const invId = inv.id || inv._id;
          if (!invId) continue;

          const embeddedEvent = inv.event || inv.campaign?.event;
          const embeddedEventId = inv.eventId || inv.event_id || embeddedEvent?.id || embeddedEvent?._id;
          if (embeddedEvent && embeddedEventId) {
            const eventId = String(embeddedEventId);
            const existingEvent = eventStore.getById(eventId);
            const eventData = {
              id: eventId,
              name: embeddedEvent.name || 'Event',
              theme: embeddedEvent.theme || '',
              startDate: embeddedEvent.startDate || embeddedEvent.start_date || '',
              endDate: embeddedEvent.endDate || embeddedEvent.end_date || '',
              city: embeddedEvent.city || '',
              venues: embeddedEvent.venues || [],
              status: embeddedEvent.status || 'Published',
              clientGroups: embeddedEvent.clientGroups || embeddedEvent.client_groups || [],
              eventType: embeddedEvent.eventType || embeddedEvent.event_type || 'individual',
              sportCategories: embeddedEvent.sportCategories || embeddedEvent.sport_categories || [],
              allowTeamRegistration: embeddedEvent.allowTeamRegistration || embeddedEvent.allow_team_registration || false,
              createdAt: embeddedEvent.createdAt || embeddedEvent.created_at || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as EMSEvent;

            if (existingEvent) {
              eventStore.update(eventId, eventData);
            } else {
              const events = eventStore.getAll();
              events.push(eventData);
              localStorage.setItem('ems_events', JSON.stringify(events));
            }
          }

          const normalizedInv = sourceMap[String(invId)] || normalizeInvitation(inv);

          invitationStore.upsert({
            id: invId,
            participantId: inv.participantId || inv.participant_id || inv.participant?.id || inv.participant?._id || '',
            participantEmail: inv.participantEmail || inv.participant_email || inv.participant?.email || '',
            managerId: inv.managerId || inv.manager_id || inv.manager?.id || inv.manager?._id || '',
            managerEmail: inv.managerEmail || inv.manager_email || inv.manager?.email || '',
            delegationId: getInvitationDelegationIdFromRaw(inv),
            recipientType: inv.recipientType || inv.recipient_type || ((inv.managerId || inv.manager_id || inv.manager?.id || inv.delegationId) ? 'manager' : 'participant'),
            eventId: inv.eventId || inv.event_id || inv.event?.id || inv.event?._id || '',
            status: inv.status || 'Pending',
            rsvpDeadline: normalizedInv.rsvpDeadline || inv.rsvpDeadline || inv.rsvp_deadline || '',
            token: inv.token || '',
            campaignId: normalizedInv.campaignId || inv.campaignId || inv.campaign_id || '',
            templateId: normalizedInv.templateId || inv.templateId || inv.template_id || '',
            createdAt: inv.createdAt || inv.created_at || new Date().toISOString(),
            updatedAt: inv.updatedAt || inv.updated_at || new Date().toISOString(),
          } as any);
        }
      }

      const idsMatch = (left?: string, right?: string) =>
        !!left && !!right && String(left) === String(right);

      // Backend stores target_delegation_ids on campaigns but may not create
      // separate manager invitation rows — derive manager invitations from sent campaigns.
      for (const campaign of delegationCampaigns) {
        const campaignDelegationIds = getCampaignDelegationIds(campaign);
        const matchingDelegationId = campaignDelegationIds.find(id => managerDelegationIds.has(String(id)));
        const matchesByManagerRole = getCampaignManagerRoleIds(campaign).includes(String(manager.id));
        if (!matchingDelegationId && !matchesByManagerRole) continue;

        const resolvedDelegationId = matchingDelegationId || '';

        const syntheticId = `mgr-camp-${campaign.id}-${resolvedDelegationId || manager.id}`;
        const serverDelegation = resolvedDelegationId
          ? serverDelegations.find(d => idsMatch(d.id || d._id, resolvedDelegationId))
          : undefined;
        const delegationLabel = resolvedDelegationId && serverDelegation?.country
          ? `${serverDelegation.country} Delegation`
          : '';

        const campaignEventId = String(campaign.eventId || campaign.event?.id || '');
        const serverEvent = serverEvents.find((ev: any) => idsMatch(ev.id || ev._id, campaignEventId));
        const embeddedEvent = campaign.event || serverEvent;

        if (embeddedEvent && campaignEventId) {
          const existingEvent = eventStore.getById(campaignEventId);
          const eventData = {
            id: campaignEventId,
            name: embeddedEvent.name || 'Event',
            theme: embeddedEvent.theme || '',
            startDate: embeddedEvent.startDate || embeddedEvent.start_date || '',
            endDate: embeddedEvent.endDate || embeddedEvent.end_date || '',
            city: embeddedEvent.city || '',
            venues: embeddedEvent.venues || [],
            status: embeddedEvent.status || 'Published',
            clientGroups: embeddedEvent.clientGroups || embeddedEvent.client_groups || [],
            eventType: embeddedEvent.eventType || embeddedEvent.event_type || 'individual',
            sportCategories: embeddedEvent.sportCategories || embeddedEvent.sport_categories || [],
            allowTeamRegistration: embeddedEvent.allowTeamRegistration || embeddedEvent.allow_team_registration || false,
            createdAt: embeddedEvent.createdAt || embeddedEvent.created_at || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as EMSEvent;
          if (existingEvent) {
            eventStore.update(campaignEventId, eventData);
          } else {
            const events = eventStore.getAll();
            events.push(eventData);
            localStorage.setItem('ems_events', JSON.stringify(events));
          }
        }

        invitationStore.upsert({
          id: syntheticId,
          campaignId: campaign.id,
          eventId: campaignEventId,
          templateId: campaign.templateId || campaign.template?.id || '',
          managerId: manager.id,
          managerEmail: manager.email,
          delegationId: resolvedDelegationId,
          recipientType: 'manager',
          participantId: '',
          status: isSentCampaignStatus(campaign.status) ? 'Delivered' : 'Pending',
          rsvpDeadline: campaign.rsvpDeadline || '',
          token: syntheticId,
          notes: delegationLabel,
          sentAt: campaign.sentAt || null,
          deliveredAt: isSentCampaignStatus(campaign.status) ? (campaign.sentAt || new Date().toISOString()) : null,
          openedAt: null,
          respondedAt: null,
          guestCount: 0,
          createdAt: campaign.createdAt || new Date().toISOString(),
          updatedAt: campaign.updatedAt || new Date().toISOString(),
        } as any);

        sourceMap[syntheticId] = {
          id: syntheticId,
          campaignId: campaign.id,
          eventId: campaignEventId,
          delegationId: resolvedDelegationId,
          template: campaign.template,
          templateId: campaign.templateId || campaign.template?.id || '',
          campaign,
          event: embeddedEvent,
          rsvpDeadline: campaign.rsvpDeadline || '',
        };
        syncTemplateToStore(campaign.template);
      }

      const delegationInvitations: DelegationInvitation[] = [];
      const seenInvitationKeys = new Set<string>();

      const appendInvitationRow = (normalized: any, rawPayload?: any) => {
        const invitationId = String(normalized?.id || '');
        if (!invitationId || seenInvitationKeys.has(invitationId)) return;

        const event = resolveInvitationEvent(normalized, serverEvents);
        if (!event) return;

        seenInvitationKeys.add(invitationId);
        const storeInvitation =
          invitationStore.getById(invitationId) || normalizedToStoreInvitation(normalized);
        const rawSource = rawPayload || sourceMap[invitationId] || normalized;
        const invitationDelegation = resolveInvitationDelegation(
          normalized,
          serverDelegations,
          rawSource,
        );
        storeInvitation.delegationId = invitationDelegation.delegationId;

        delegationInvitations.push({
          invitation: storeInvitation,
          event,
          participantName: invitationDelegation.delegationName,
          participantEmail: storeInvitation.managerEmail || manager.email,
          delegationName: invitationDelegation.delegationName,
          rawSource,
        });
      };

      // Primary source: API response (manager invitations endpoint already scopes data)
      for (const rawInv of serverInvitationsMerged as any[]) {
        const normalized = sourceMap[String(rawInv.id || rawInv._id)] || normalizeInvitation(rawInv);
        appendInvitationRow(normalized, rawInv);
      }

      // Synthetic rows from delegation-targeted campaigns
      for (const [sourceId, normalized] of Object.entries(sourceMap)) {
        if (sourceId.startsWith('mgr-camp-')) {
          appendInvitationRow({ ...normalized, id: sourceId }, normalized);
        }
      }

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

      return {
        invitations: delegationInvitations,
        delegationNotices: filteredNotices,
        managerCampaigns: delegationCampaigns,
        managerDelegations: Array.isArray(serverDelegations) ? serverDelegations : [],
        registeredEventIds: registeredEvents,
        invitationSources: sourceMap,
      };
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Accepted':
        return {
          label: 'Accepted',
          pill: 'bg-status-success-bg text-status-success ring-status-success/20',
          accent: 'bg-status-success',
          border: 'border-status-success/20',
          icon: CheckCircle2,
        };
      case 'Declined':
        return {
          label: 'Declined',
          pill: 'bg-status-error-bg text-status-error ring-status-error/20',
          accent: 'bg-status-error',
          border: 'border-status-error/20',
          icon: X,
        };
      case 'Maybe':
        return {
          label: 'Maybe',
          pill: 'bg-status-info-bg text-status-info ring-status-info/20',
          accent: 'bg-status-info',
          border: 'border-status-info/20',
          icon: HelpCircle,
        };
      case 'Expired':
        return {
          label: 'Expired',
          pill: 'bg-muted text-muted-foreground ring-border',
          accent: 'bg-muted-foreground/40',
          border: 'border-border/80',
          icon: AlertCircle,
        };
      default:
        return {
          label: 'Awaiting your reply',
          pill: 'bg-status-warning-bg text-status-warning ring-status-warning/25',
          accent: 'bg-status-warning',
          border: 'border-status-warning/30',
          icon: Clock,
        };
    }
  };

  const updateInvitationEntry = (entry: DelegationInvitation, mergedInvitation: EMSInvitation) => {
    queryClient.setQueryData<InvitationsQueryData>(['manager', 'invitations'], prev =>
      prev
        ? {
            ...prev,
            invitations: prev.invitations.map(item =>
              item.invitation.id === entry.invitation.id
                ? { ...item, invitation: mergedInvitation }
                : item,
            ),
          }
        : prev,
    );
    if (previewInvitation?.id === entry.invitation.id) {
      setPreviewInvitation(mergedInvitation);
    }
  };

  const handleRespond = async (entry: DelegationInvitation, response: InvitationResponse): Promise<boolean> => {
    if (!canRespondToInvitation(entry.invitation)) return false;

    setRespondingInvitationId(entry.invitation.id);
    try {
      const updated = await respondToInvitationById(entry.invitation.id, response);
      const merged = mergeInvitationAfterRespond(entry.invitation, updated, response);
      updateInvitationEntry(entry, merged);
      toast.success(
        response === 'Accepted'
          ? `Invitation accepted for ${entry.participantName}`
          : response === 'Declined'
            ? 'Invitation declined.'
            : 'Marked as maybe.',
      );
      return true;
    } catch (err: any) {
      const detail =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to update invitation response';
      toast.error(detail);
      return false;
    } finally {
      setRespondingInvitationId(null);
    }
  };

  const handlePreview = (inv: DelegationInvitation) => {
    const rawSource = inv.rawSource || invitationSources[inv.invitation.id];
    const template = getInvitationTemplate(inv.invitation, rawSource, managerCampaigns);
    if (!template) {
      toast.error('Template not available for this invitation');
      return;
    }
    setPreviewTemplate(template);
    setPreviewInvitation(inv.invitation);
    setPreviewOpen(true);
  };

  const resolveDelegationEventId = (delegation: any): string =>
    String(delegation?.eventId || delegation?.event_id || delegation?.event?.id || delegation?.event?._id || '');

  const hasManagerDelegationForEvent = (eventId: string): boolean => {
    const targetEventId = String(eventId);
    if (!targetEventId) return false;

    // Server data only — see the comment on managerDelegationIds above.
    return managerDelegations.some(
      (delegation) => resolveDelegationEventId(delegation) === targetEventId,
    );
  };

  const invitationHasDelegation = (inv: DelegationInvitation): boolean => {
    const rawSource = inv.rawSource || invitationSources[inv.invitation.id];
    return Boolean(getInvitationDelegationIdFromRaw(rawSource));
  };

  const invitationNeedsDelegation = (inv: DelegationInvitation): boolean =>
    !invitationHasDelegation(inv);

  const isCreateDelegationDisabled = (inv: DelegationInvitation): boolean =>
    invitationNeedsDelegation(inv) && hasManagerDelegationForEvent(inv.event.id);

  const handleRegister = async (inv: DelegationInvitation) => {
    if (canRespondToInvitation(inv.invitation)) {
      const accepted = await handleRespond(inv, 'Accepted');
      if (!accepted) return;
    } else if (!isInvitationAccepted(inv.invitation)) {
      toast.error('Please accept the invitation before continuing.');
      return;
    }

    const params = new URLSearchParams();
    if (inv.event.id) params.set('eventId', inv.event.id);
    if (inv.invitation.id) params.set('invitationId', inv.invitation.id);
    if (inv.invitation.delegationId) params.set('delegationId', inv.invitation.delegationId);
    navigate(`/manager/delegations?${params.toString()}`);
  };

  const handleCreateDelegationForInvitation = (inv: DelegationInvitation) => {
    const params = new URLSearchParams();
    params.set('eventId', inv.event.id);
    params.set('eventName', inv.event.name);
    params.set('create', '1');
    if (inv.invitation.id) params.set('invitationId', inv.invitation.id);
    navigate(`/manager/delegations?${params.toString()}`);
  };

  const handleAcceptInvitation = (inv: DelegationInvitation) => {
    setSelectedInvitation(inv);
    setIsAcceptDialogOpen(true);
  };

  const handleConfirmAccept = async () => {
    if (!selectedInvitation) return;

    setIsProcessing(true);
    try {
      await handleRespond(selectedInvitation, 'Accepted');
      setIsAcceptDialogOpen(false);
      setSelectedInvitation(null);
    } catch {
      toast.error('Failed to accept invitation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkAccept = async () => {
    const pendingInvitations = invitations.filter(inv => canRespondToInvitation(inv.invitation));

    if (pendingInvitations.length === 0) {
      toast.info('No pending invitations to accept');
      return;
    }

    setIsProcessing(true);
    let accepted = 0;
    try {
      for (const inv of pendingInvitations) {
        try {
          await handleRespond(inv, 'Accepted');
          accepted++;
        } catch {
          // handleRespond already shows toast
        }
      }
      if (accepted > 0) {
        toast.success(`Accepted ${accepted} invitation(s) for your delegation`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingCount = invitations.filter(
    inv => getInvitationResponseStatus(inv.invitation) === 'Pending',
  ).length;

  const acceptedCount = invitations.filter(inv => isInvitationAccepted(inv.invitation)).length;
  const displayInvitations = dedupeInvitations(invitations);

  const buildRow = (inv: DelegationInvitation) => {
    const rawSource = inv.rawSource || invitationSources[inv.invitation.id];
    const campaign = getCampaignForInvitation(inv.invitation, managerCampaigns, rawSource);
    const template = getInvitationTemplate(inv.invitation, rawSource, managerCampaigns);
    const responseStatus = getInvitationResponseStatus(inv.invitation);
    const status = getStatusStyle(responseStatus);
    const deadline =
      inv.invitation.rsvpDeadline
        ? new Date(inv.invitation.rsvpDeadline).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : campaign?.rsvpDeadline
          ? new Date(campaign.rsvpDeadline).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : 'No deadline';

    return {
      inv,
      campaign,
      template,
      isVIP: template ? isVIPTemplate(template) : false,
      responseStatus,
      status,
      showRespondActions: canRespondToInvitation(inv.invitation),
      canContinue: isInvitationAccepted(inv.invitation) && !isInvitationDeclined(inv.invitation),
      isResponding: respondingInvitationId === inv.invitation.id,
      needsDelegation: invitationNeedsDelegation(inv) && !hasManagerDelegationForEvent(inv.event.id),
      deadline,
      campaignLabel: campaign?.name || campaign?.subject || null,
      locationLabel: inv.event.city || manager?.country || 'To be confirmed',
      dateLabel: formatEventDates(inv.event),
    };
  };

  const renderPrimaryAction = (
    row: ReturnType<typeof buildRow>,
    variant: 'card' | 'table' = 'card',
  ) => {
    const isTable = variant === 'table';

    if (row.showRespondActions) {
      return (
        <div
          className={cn(
            'flex h-8 overflow-hidden rounded-md border border-border/80 bg-card',
            isTable ? 'w-full' : 'h-9 rounded-lg shadow-sm',
          )}
        >
          <button
            type="button"
            disabled={row.isResponding}
            onClick={() => void handleRespond(row.inv, 'Accepted')}
            className={cn(
              'inline-flex h-full flex-1 items-center justify-center gap-1 whitespace-nowrap bg-primary text-[11px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60',
              isTable ? 'px-1.5' : 'gap-1.5 px-3.5 text-xs',
            )}
          >
            {row.isResponding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              !isTable && <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Accept
          </button>
          <button
            type="button"
            disabled={row.isResponding}
            onClick={() => void handleRespond(row.inv, 'Maybe')}
            className={cn(
              'inline-flex h-full flex-1 items-center justify-center whitespace-nowrap border-l border-border/80 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60',
              isTable ? 'px-1.5' : 'px-3 text-xs',
            )}
          >
            Maybe
          </button>
          <button
            type="button"
            disabled={row.isResponding}
            onClick={() => void handleRespond(row.inv, 'Declined')}
            className={cn(
              'inline-flex h-full flex-1 items-center justify-center whitespace-nowrap border-l border-border/80 text-[11px] font-medium text-status-error transition-colors hover:bg-status-error-bg disabled:opacity-60',
              isTable ? 'px-1.5' : 'px-3 text-xs',
            )}
          >
            Decline
          </button>
        </div>
      );
    }

    if (row.needsDelegation) {
      return (
        <Button
          size="sm"
          className={cn('h-8 gap-1.5 shadow-sm', isTable ? 'w-full px-2 text-xs' : 'h-9')}
          disabled={!row.canContinue}
          title={!row.canContinue ? 'Accept the invitation first' : undefined}
          onClick={() => {
            if (!row.canContinue) {
              toast.error('Please accept the invitation before creating a delegation.');
              return;
            }
            handleCreateDelegationForInvitation(row.inv);
          }}
        >
          <Flag className="h-3.5 w-3.5 shrink-0" />
          {isTable ? 'Create' : 'Create Delegation'}
          {!isTable && <ArrowRight className="h-3.5 w-3.5" />}
        </Button>
      );
    }

    return (
      <Button
        size="sm"
        className={cn('h-8 gap-1.5 shadow-sm', isTable ? 'w-full px-2 text-xs' : 'h-9')}
        disabled={!row.canContinue}
        onClick={() => void handleRegister(row.inv)}
      >
        {isInvitationDeclined(row.inv.invitation)
          ? 'Declined'
          : row.canContinue
            ? isTable
              ? 'Continue'
              : 'Continue to Delegation'
            : isTable
              ? 'Accept first'
              : 'Accept to continue'}
        {row.canContinue && !isTable && <ArrowRight className="h-3.5 w-3.5" />}
      </Button>
    );
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.06] via-card to-card px-6 py-6 shadow-sm sm:px-8 sm:py-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/[0.07] blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-40 w-40 rounded-full bg-accent/10 blur-3xl" aria-hidden />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
              Team manager portal
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Delegation Invitations
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              View and respond to invitations for your {manager?.country || ''} delegation, then continue to registration.
            </p>
          </div>

          {!isLoading && invitations.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {[
                { label: 'Total', value: invitations.length, tone: 'text-foreground' },
                { label: 'Awaiting reply', value: pendingCount, tone: 'text-status-warning' },
                { label: 'Accepted', value: acceptedCount, tone: 'text-status-success' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="min-w-[88px] rounded-xl border border-border/70 bg-card/80 px-3.5 py-3 shadow-sm backdrop-blur-sm"
                >
                  <p className={cn('text-2xl font-semibold tabular-nums tracking-tight', stat.tone)}>
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* List */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 px-0.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary/60" />
            <h2 className="text-sm font-semibold text-foreground">
              Invitations
              <span className="ml-1.5 font-normal text-muted-foreground">({displayInvitations.length})</span>
            </h2>
          </div>

          {!isLoading && displayInvitations.length > 0 && (
            <div
              className="inline-flex items-center rounded-lg border border-border bg-card p-0.5 shadow-sm"
              role="group"
              aria-label="Display mode"
            >
              <button
                type="button"
                onClick={() => setViewModeAndPersist('cards')}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors',
                  viewMode === 'cards'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-pressed={viewMode === 'cards'}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Cards
              </button>
              <button
                type="button"
                onClick={() => setViewModeAndPersist('table')}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors',
                  viewMode === 'table'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-pressed={viewMode === 'table'}
              >
                <List className="h-3.5 w-3.5" />
                Table
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 py-24">
            <Loader2 className="h-9 w-9 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading invitations…</p>
          </div>
        ) : displayInvitations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-20 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Mail className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No invitations yet</h3>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
              When organisers invite your delegation, they will appear here for you to respond.
            </p>
          </div>
        ) : viewMode === 'table' ? (
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
            <div className="overflow-x-auto">
              <Table className="w-full table-fixed">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-11 min-w-0 bg-muted/40 text-[11px] font-semibold uppercase tracking-wider">Event</TableHead>
                    <TableHead className="h-11 w-[130px] bg-muted/40 text-[11px] font-semibold uppercase tracking-wider">Location</TableHead>
                    <TableHead className="h-11 w-[150px] bg-muted/40 text-[11px] font-semibold uppercase tracking-wider">Date</TableHead>
                    <TableHead className="h-11 w-[110px] bg-muted/40 text-[11px] font-semibold uppercase tracking-wider">RSVP by</TableHead>
                    <TableHead className="h-11 w-[145px] bg-muted/40 text-[11px] font-semibold uppercase tracking-wider">Status</TableHead>
                    <TableHead className="h-11 w-[250px] bg-muted/40 text-[11px] font-semibold uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayInvitations.map((inv) => {
                    const row = buildRow(inv);
                    const StatusIcon = row.status.icon;

                    return (
                      <TableRow
                        key={`${inv.invitation.id}-${inv.delegationName}`}
                        className="border-border/60 transition-colors hover:bg-muted/25"
                      >
                        <TableCell className="min-w-0 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold ring-1 ring-inset',
                                row.isVIP
                                  ? 'bg-gradient-to-br from-amber-400/25 to-amber-500/5 text-amber-600 ring-amber-500/25'
                                  : 'bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-primary/10',
                              )}
                            >
                              {row.isVIP ? (
                                <Crown className="h-4 w-4" />
                              ) : (
                                inv.event.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {inv.event.name}
                                </p>
                                {row.isVIP && (
                                  <span className="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600 ring-1 ring-inset ring-amber-500/20">
                                    VIP
                                  </span>
                                )}
                              </div>
                              {row.campaignLabel && (
                                <p className="truncate text-xs text-muted-foreground">
                                  {row.campaignLabel}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-0 py-3">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{row.locationLabel}</span>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-0 py-3">
                          <div className="flex items-center gap-1.5 text-sm">
                            <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">{row.dateLabel}</span>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-0 py-3 text-sm text-muted-foreground">
                          <span className="block truncate">{row.deadline}</span>
                        </TableCell>
                        <TableCell className="py-3">
                          <span
                            className={cn(
                              'inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                              row.status.pill,
                            )}
                          >
                            <StatusIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{row.status.label}</span>
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 shrink-0 border-border/80 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                              onClick={() => handlePreview(inv)}
                              title="Preview invitation"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <div className="min-w-0 flex-1">
                              {renderPrimaryAction(row, 'table')}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {displayInvitations.map((inv) => {
              const row = buildRow(inv);
              const StatusIcon = row.status.icon;

              return (
                <article
                  key={`${inv.invitation.id}-${inv.delegationName}`}
                  className={cn(
                    'group relative overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] transition-all duration-300',
                    'hover:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_16px_40px_-16px_rgba(15,23,42,0.14)]',
                    row.status.border,
                  )}
                >
                  <div className={cn('absolute inset-y-0 left-0 w-1', row.status.accent)} aria-hidden />

                  <div className="pl-4 sm:pl-5">
                    <div className="space-y-5 p-5 sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-semibold tracking-tight text-foreground">
                              {inv.event.name}
                            </h3>
                            {row.isVIP && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600 ring-1 ring-inset ring-amber-500/20">
                                <Crown className="h-3 w-3" />
                                VIP
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {row.campaignLabel && (
                              <span className="truncate">Campaign · {row.campaignLabel}</span>
                            )}
                            {row.template?.name && (
                              <span className="truncate">Template · {row.template.name}</span>
                            )}
                            {invitationHasDelegation(inv) && inv.delegationName && (
                              <span className="truncate">Delegation · {inv.delegationName}</span>
                            )}
                          </div>
                        </div>

                        <span
                          className={cn(
                            'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                            row.status.pill,
                          )}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {row.status.label}
                        </span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="flex items-start gap-2.5 rounded-xl bg-muted/40 px-3 py-2.5">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/60" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Location
                            </p>
                            <p className="truncate text-sm font-medium text-foreground">
                              {row.locationLabel}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2.5 rounded-xl bg-muted/40 px-3 py-2.5">
                          <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/60" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Event dates
                            </p>
                            <p className="text-sm font-medium text-foreground">{row.dateLabel}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2.5 rounded-xl bg-muted/40 px-3 py-2.5">
                          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/60" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              RSVP by
                            </p>
                            <p className="truncate text-sm font-medium text-foreground">{row.deadline}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-border/70 bg-muted/20 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5 border-border/80 bg-card text-muted-foreground hover:text-foreground"
                        onClick={() => handlePreview(inv)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </Button>

                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        {renderPrimaryAction(row, 'card')}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Accept Confirmation Dialog */}
      <Dialog open={isAcceptDialogOpen} onOpenChange={setIsAcceptDialogOpen}>
        <DialogContent className="max-w-lg overflow-hidden rounded-2xl p-0">
          <DialogHeader className="space-y-0 border-b bg-gradient-to-br from-primary/[0.06] via-card to-card px-5 py-4 pe-12 text-start">
            <DialogTitle className="text-lg tracking-tight">Accept Invitation</DialogTitle>
            <DialogDescription className="text-xs">
              You are accepting this invitation on behalf of {selectedInvitation?.participantName}
            </DialogDescription>
          </DialogHeader>
          {selectedInvitation && (
            <div className="space-y-4 px-5 py-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Participant', value: selectedInvitation.participantName },
                  { label: 'Event', value: selectedInvitation.event.name },
                  { label: 'Location', value: selectedInvitation.event.city || '—' },
                  {
                    label: 'Dates',
                    value: `${new Date(selectedInvitation.event.startDate).toLocaleDateString()} – ${new Date(selectedInvitation.event.endDate).toLocaleDateString()}`,
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-muted/40 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
              <p className="rounded-xl border border-border/70 bg-muted/20 px-3.5 py-3 text-sm text-muted-foreground">
                After accepting, you can continue to complete the delegation with travel preferences and required documents.
              </p>
            </div>
          )}
          <DialogFooter className="border-t bg-muted/20 px-5 py-3">
            <Button variant="outline" onClick={() => setIsAcceptDialogOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleConfirmAccept} disabled={isProcessing} className="gap-1.5">
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {isProcessing ? 'Processing…' : 'Accept & Continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InvitationPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        template={previewTemplate}
        event={previewInvitation ? invitations.find(i => i.invitation.id === previewInvitation.id)?.event || null : null}
        participant={{
          firstName: manager?.name?.split(' ')[0] || manager?.country || 'Manager',
          lastName: manager?.name?.split(' ').slice(1).join(' ') || 'Delegation',
          email: manager?.email || '',
        }}
        rsvpDeadline={previewInvitation?.rsvpDeadline}
        invitationStatus={previewInvitation ? getInvitationResponseStatus(previewInvitation) : undefined}
        canRespond={previewInvitation ? canRespondToInvitation(previewInvitation) : false}
        canRegister={
          previewInvitation
            ? isInvitationAccepted(previewInvitation) && !isInvitationDeclined(previewInvitation)
            : false
        }
        isResponding={previewInvitation ? respondingInvitationId === previewInvitation.id : false}
        onRespond={(response) => {
          const entry = invitations.find(item => item.invitation.id === previewInvitation?.id);
          if (entry) void handleRespond(entry, response);
        }}
        onRegister={() => {
          const entry = invitations.find(item => item.invitation.id === previewInvitation?.id);
          if (entry) void handleRegister(entry);
        }}
      />
    </div>
  );
};


export default ManagerInvitationsPage;