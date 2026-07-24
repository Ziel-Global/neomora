import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useManagerSession } from '@/contexts/ManagerSessionContext';
import { eventStore, invitationStore, participantStore, registrationStore, templateStore, campaignStore, EMSInvitation, EMSEvent, EMSInvitationTemplate } from '@/lib/emsStore';
import { teamMemberStore, teamStore, delegationStore } from '@/lib/teamStore';
import { getMyDelegations } from '@/api/delegationApi';
import { getMyTeams } from '@/api/teamApi';
import { getEvents } from '@/api/eventApi';
import { getMyInvitations, getInvitationsForDelegations, normalizeInvitation } from '@/api/invitationApi';
import { getCampaignsForManager, getCampaignDelegationIds, getCampaignManagerRoleIds, isSentCampaignStatus, Campaign } from '@/api/campaignApi';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { InvitationPreviewModal } from '@/components/invitations/InvitationPreviewModal';
import { Mail, Check, X, Users, Calendar, MapPin, CheckCircle, Clock, AlertCircle, Loader2, Crown, Eye, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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
  const templates = templateStore.getAll();
  const index = templates.findIndex(entry => entry.id === template.id);
  if (index >= 0) {
    templates[index] = { ...templates[index], ...template };
  } else {
    templates.push(template);
  }
  localStorage.setItem('ems_invitation_templates', JSON.stringify(templates));
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
  const [invitations, setInvitations] = useState<DelegationInvitation[]>([]);
  const [delegationNotices, setDelegationNotices] = useState<DelegationNotice[]>([]);
  const [selectedInvitation, setSelectedInvitation] = useState<DelegationInvitation | null>(null);
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [managerCampaigns, setManagerCampaigns] = useState<Campaign[]>([]);
  const [managerDelegations, setManagerDelegations] = useState<any[]>([]);
  const [registeredEventIds, setRegisteredEventIds] = useState<Set<string>>(new Set());
  const [previewTemplate, setPreviewTemplate] = useState<EMSInvitationTemplate | null>(null);
  const [previewInvitation, setPreviewInvitation] = useState<EMSInvitation | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [invitationSources, setInvitationSources] = useState<Record<string, any>>({});

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

    setIsLoading(true);
    try {
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

      // Build the set of delegation IDs owned by this manager
      const managerDelegationIds = new Set<string>();
      for (const del of serverDelegations) {
        const delId = del.id || del._id;
        if (delId) managerDelegationIds.add(String(delId));
      }
      for (const del of delegationStore.getByManager(manager.id)) {
        if (del.id) managerDelegationIds.add(String(del.id));
      }

      const delegationCampaigns = await getCampaignsForManager(Array.from(managerDelegationIds), manager.id).catch(() => []);
      setManagerCampaigns(delegationCampaigns);
      setManagerDelegations(Array.isArray(serverDelegations) ? serverDelegations : []);

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
      setRegisteredEventIds(registeredEvents);

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
            delegationId:
              normalizedInv.delegationId ||
              inv.delegationId ||
              inv.delegation_id ||
              inv.delegation?.id ||
              inv.delegation?._id ||
              inv.campaign?.targetDelegationIds?.[0] ||
              inv.campaign?.targetDelegationId ||
              '',
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

        const resolvedDelegationId = matchingDelegationId || campaignDelegationIds[0] || '';

        const syntheticId = `mgr-camp-${campaign.id}-${resolvedDelegationId || manager.id}`;
        const serverDelegation = serverDelegations.find(d => idsMatch(d.id || d._id, resolvedDelegationId));
        const delegationLabel = serverDelegation?.country
          ? `${serverDelegation.country} Delegation`
          : `${manager.country} Delegation`;

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

      setInvitationSources(sourceMap);

      const delegationInvitations: DelegationInvitation[] = [];
      const seenInvitationKeys = new Set<string>();

      const appendInvitationRow = (normalized: any) => {
        const invitationId = String(normalized?.id || '');
        if (!invitationId || seenInvitationKeys.has(invitationId)) return;

        const event = resolveInvitationEvent(normalized, serverEvents);
        if (!event) return;

        seenInvitationKeys.add(invitationId);
        const storeInvitation =
          invitationStore.getById(invitationId) || normalizedToStoreInvitation(normalized);
        const delegationName = resolveDelegationName(
          normalized.delegationId || storeInvitation.delegationId,
          serverDelegations,
          undefined,
          normalized.delegation || normalized.campaign?.targetDelegation,
        );

        delegationInvitations.push({
          invitation: storeInvitation,
          event,
          participantName: delegationName,
          participantEmail: storeInvitation.managerEmail || manager.email,
          delegationName,
          rawSource: normalized,
        });
      };

      // Primary source: API response (manager invitations endpoint already scopes data)
      for (const rawInv of serverInvitationsMerged as any[]) {
        const normalized = sourceMap[String(rawInv.id || rawInv._id)] || normalizeInvitation(rawInv);
        appendInvitationRow(normalized);
      }

      // Synthetic rows from delegation-targeted campaigns
      for (const [sourceId, normalized] of Object.entries(sourceMap)) {
        if (sourceId.startsWith('mgr-camp-')) {
          appendInvitationRow({ ...normalized, id: sourceId });
        }
      }

      setInvitations(delegationInvitations);

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
      setDelegationNotices(filteredNotices);
    } finally {
      setIsLoading(false);
    }
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

  const hasManagerDelegationForEvent = (eventId: string): boolean =>
    managerDelegations.some((delegation) => resolveDelegationEventId(delegation) === String(eventId));

  const invitationNeedsDelegation = (inv: DelegationInvitation): boolean => {
    if (hasManagerDelegationForEvent(inv.event.id)) return false;

    const delegationId = inv.invitation.delegationId;
    if (delegationId) {
      const ownsDelegation = managerDelegations.some(
        (delegation) => String(delegation.id || delegation._id) === String(delegationId),
      );
      if (ownsDelegation) return false;
    }

    return true;
  };

  const handleRegister = (inv: DelegationInvitation) => {
    if (['Delivered', 'Opened', 'Pending'].includes(inv.invitation.status)) {
      invitationStore.respond(inv.invitation.id, 'Accepted');
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
  const displayInvitations = dedupeInvitations(invitations);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Delegation Invitations</h1>
          <p className="text-muted-foreground mt-1">
            View and respond to invitations for your {manager?.country} delegation
          </p>
        </div>
     {/*   {pendingCount > 0 && (
          <Button onClick={handleBulkAccept} disabled={isLoading}>
            <Check className="h-4 w-4 mr-2" />
            Accept All ({pendingCount})
          </Button>
        )} */}
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
                {isLoading ? (
                  <div className="h-8 w-10 rounded bg-muted animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold">{invitations.length}</p>
                )}
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
                {isLoading ? (
                  <div className="h-8 w-10 rounded bg-muted animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold">{pendingCount}</p>
                )}
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
                {isLoading ? (
                  <div className="h-8 w-10 rounded bg-muted animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold">{acceptedCount}</p>
                )}
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
            Preview your invitation, then register your delegation for the event
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading invitations...</p>
            </div>
          ) : displayInvitations.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">No invitations for your delegation yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>RSVP Deadline</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayInvitations.map((inv) => {
                    const rawSource = inv.rawSource || invitationSources[inv.invitation.id];
                    const campaign = getCampaignForInvitation(inv.invitation, managerCampaigns, rawSource);
                    const template = getInvitationTemplate(inv.invitation, rawSource, managerCampaigns);
                    const isVIP = template ? isVIPTemplate(template) : false;

                    return (
                      <TableRow key={`${inv.invitation.id}-${inv.delegationName}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{inv.event.name}</p>
                            {isVIP && (
                              <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-white text-xs">
                                <Crown className="h-3 w-3 mr-1" /> VIP
                              </Badge>
                            )}
                          </div>
                          {inv.delegationName && (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs mt-1">
                              Delegation: {inv.delegationName}
                            </Badge>
                          )}
                          {campaign && (campaign.name || campaign.subject) && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs mt-1 ml-1">
                              Campaign: {campaign.name || campaign.subject}
                            </Badge>
                          )}
                          {template && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Template: {template.name}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {inv.event.city || manager?.country || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {formatEventDates(inv.event)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {inv.invitation.rsvpDeadline
                              ? new Date(inv.invitation.rsvpDeadline).toLocaleDateString()
                              : campaign?.rsvpDeadline
                                ? new Date(campaign.rsvpDeadline).toLocaleDateString()
                                : 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell className="flex items-center gap-2">
                          <Eye
                            onClick={() => handlePreview(inv)}
                            className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground"
                          />
                          {invitationNeedsDelegation(inv) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCreateDelegationForInvitation(inv)}
                            >
                              <Flag className="h-3 w-3 mr-1" />
                              Create Delegation
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* <Card>
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
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading delegation status...</p>
            </div>
          ) : delegationNotices.length === 0 ? (
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
      </Card> */}

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
      />
    </div>
  );
};

export default ManagerInvitationsPage;