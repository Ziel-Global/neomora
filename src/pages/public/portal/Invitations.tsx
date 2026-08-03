import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useParticipantSession } from '@/contexts/ParticipantSessionContext';
import { useNavigate } from 'react-router-dom';
import {
    eventStore,
    templateStore,
    invitationStore,
    campaignStore,
    EMSInvitationTemplate
} from '@/lib/emsStore';
import { InvitationPreviewModal } from '@/components/invitations/InvitationPreviewModal';
import {
    Calendar,
    Crown,
    Eye,
    Mail,
    Loader2,
    MapPin,
    Clock,
    CheckCircle2,
    X,
    AlertCircle,
    HelpCircle,
    ArrowRight,
    LayoutGrid,
    List,
    Sparkles,
} from 'lucide-react';
import {
    getMyInvitations,
    Invitation,
    respondToInvitationById,
    InvitationResponse,
} from '@/api/invitationApi';
import { getEvents } from '@/api/eventApi';
import { getMyRegistrations, Registration } from '@/api/registrationApi';
import * as campaignApi from '@/api/campaignApi';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const INVITATION_REGISTRATIONS_KEY = 'ems_invitation_registrations';
const VIEW_MODE_KEY = 'ems_invitations_view_mode';

type ViewMode = 'cards' | 'table';

const REGISTERED_INVITATION_STATUSES = new Set([
    'registered',
    'completed',
    'approved',
    'submitted',
]);

const PENDING_INVITATION_STATUSES = new Set([
    'pending',
    'sent',
    'delivered',
    'opened',
    'invited',
]);

const isRealInvitationId = (id: string): boolean =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

const getInvitationResponseStatus = (invitation: Invitation): string => {
    const raw = String(invitation.rsvpResponse || invitation.status || '').trim();
    if (!raw) return 'Pending';
    const lower = raw.toLowerCase();
    if (lower === 'accepted' || lower === 'accept') return 'Accepted';
    if (lower === 'declined' || lower === 'reject' || lower === 'rejected') return 'Declined';
    if (lower === 'maybe') return 'Maybe';
    if (PENDING_INVITATION_STATUSES.has(lower)) return 'Pending';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const isInvitationAccepted = (invitation: Invitation): boolean =>
    getInvitationResponseStatus(invitation) === 'Accepted';

const isInvitationDeclined = (invitation: Invitation): boolean =>
    getInvitationResponseStatus(invitation) === 'Declined';

const canRespondToInvitation = (invitation: Invitation): boolean => {
    if (!isRealInvitationId(invitation.id)) return false;
    const status = getInvitationResponseStatus(invitation);
    return status === 'Pending' || status === 'Maybe';
};

const mergeInvitationAfterRespond = (
    existing: Invitation,
    updated: Invitation,
    response: InvitationResponse,
): Invitation => ({
    ...existing,
    ...updated,
    id: existing.id,
    eventId: updated.eventId || existing.eventId,
    campaignId: updated.campaignId || existing.campaignId,
    templateId: updated.templateId || existing.templateId,
    rsvpDeadline: updated.rsvpDeadline || existing.rsvpDeadline,
    token: updated.token || existing.token,
    event: updated.event?.id || updated.event?.name ? updated.event : existing.event,
    template: updated.template?.id || updated.template?.name ? updated.template : existing.template,
    campaign: updated.campaign?.id || updated.campaign?.name ? updated.campaign : existing.campaign,
    status: updated.status || response,
    rsvpResponse: updated.rsvpResponse || response,
    respondedAt: updated.respondedAt || existing.respondedAt,
});

const getInvitationRegistrationMap = (): Record<string, string> =>
    JSON.parse(localStorage.getItem(INVITATION_REGISTRATIONS_KEY) || '{}');

const buildRegisteredInvitationIds = (registrations: Registration[]): Set<string> => {
    const ids = new Set<string>(Object.keys(getInvitationRegistrationMap()));

    for (const reg of registrations) {
        const invitationId = reg.invitationId || reg.invitation_id || (reg as any).invitation?.id;
        if (invitationId) ids.add(String(invitationId));
    }

    return ids;
};

const isInvitationRegistered = (
    invitation: Invitation,
    registeredInvitationIds: Set<string>,
    registrations: Registration[],
): boolean => {
    if (registeredInvitationIds.has(invitation.id)) return true;

    const status = String(invitation.status || '').trim().toLowerCase();
    if (REGISTERED_INVITATION_STATUSES.has(status)) return true;

    const eventId = invitation.eventId || invitation.event?.id;

    return registrations.some(reg => {
        const regInvitationId = reg.invitationId || reg.invitation_id || (reg as any).invitation?.id;
        if (regInvitationId && String(regInvitationId) === String(invitation.id)) return true;
        const registrationEventId = reg.eventId || (reg as any).event?.id;
        return Boolean(eventId && String(registrationEventId) === String(eventId));
    });
};

const isVIPTemplate = (template: EMSInvitationTemplate): boolean => {
    const name = template.name.toLowerCase();
    const subject = template.subject.toLowerCase();
    return name.includes('vip') || name.includes('exclusive') ||
        subject.includes('vip') || subject.includes('exclusive');
};

const formatDeadline = (deadline?: string | null): string => {
    if (!deadline) return 'No deadline';
    const date = new Date(deadline);
    if (Number.isNaN(date.getTime())) return 'No deadline';
    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

const readStoredViewMode = (): ViewMode => {
    try {
        const stored = localStorage.getItem(VIEW_MODE_KEY);
        return stored === 'table' ? 'table' : 'cards';
    } catch {
        return 'cards';
    }
};

const StatusPill = ({ status }: { status: string }) => {
    const config: Record<string, { label: string; className: string; icon: React.ElementType }> = {
        Accepted: {
            label: 'Accepted',
            className: 'bg-status-success-bg text-status-success ring-status-success/20',
            icon: CheckCircle2,
        },
        Declined: {
            label: 'Declined',
            className: 'bg-status-error-bg text-status-error ring-status-error/20',
            icon: X,
        },
        Maybe: {
            label: 'Maybe',
            className: 'bg-status-info-bg text-status-info ring-status-info/20',
            icon: HelpCircle,
        },
        Pending: {
            label: 'Pending Response',
            className: 'bg-status-warning-bg text-status-warning ring-status-warning/25',
            icon: Clock,
        },
        Delivered: {
            label: 'Pending Response',
            className: 'bg-status-warning-bg text-status-warning ring-status-warning/25',
            icon: Clock,
        },
        Opened: {
            label: 'Pending Response',
            className: 'bg-status-warning-bg text-status-warning ring-status-warning/25',
            icon: Clock,
        },
        Sent: {
            label: 'Pending Response',
            className: 'bg-status-warning-bg text-status-warning ring-status-warning/25',
            icon: Clock,
        },
        Expired: {
            label: 'Expired',
            className: 'bg-muted text-muted-foreground ring-border',
            icon: AlertCircle,
        },
    };

    const item = config[status] || {
        label: status,
        className: 'bg-muted text-muted-foreground ring-border',
        icon: AlertCircle,
    };
    const Icon = item.icon;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                item.className,
            )}
        >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
        </span>
    );
};

const getCampaignAudienceIds = (campaign: campaignApi.Campaign): string[] => {
    const fromAudience = Array.isArray(campaign.audienceIds) ? campaign.audienceIds
        : Array.isArray(campaign.targetParticipantIds) ? campaign.targetParticipantIds : [];
    const fromTargetRoles = Array.isArray(campaign.targetRoles) ? campaign.targetRoles
        : Array.isArray((campaign as any).roleFilters) ? (campaign as any).roleFilters : [];
    return [...new Set([...fromAudience, ...fromTargetRoles].map(String))];
};

const getParticipantIdentityIds = (participant: { id?: string; participantId?: string; teamMemberId?: string; [key: string]: unknown } | null): string[] => {
    if (!participant) return [];
    return [...new Set([participant.id, participant.participantId, participant.teamMemberId, participant._id, participant.userId].filter(Boolean).map(String))];
};

const buildParticipantIdentityIds = (
    participant: { id?: string; participantId?: string; teamMemberId?: string; [key: string]: unknown } | null,
    profile?: { id?: string } | null,
): string[] => {
    const ids = getParticipantIdentityIds(participant);
    if (profile?.id) ids.push(String(profile.id));
    return [...new Set(ids)];
};

const participantMatchesAudience = (identityIds: string[], audienceIds: string[]): boolean =>
    identityIds.length > 0 && audienceIds.some(id => identityIds.includes(String(id)));

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

const formatEventRecordDates = (eventObj: any): string => {
    if (!eventObj) return 'N/A';
    const start = eventObj.startDate || eventObj.start_date;
    const end = eventObj.endDate || eventObj.end_date;
    if (!start) return 'N/A';

    const startDate = new Date(start);
    if (Number.isNaN(startDate.getTime())) return 'N/A';

    const startLabel = startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    if (!end || end === start) return startLabel;

    const endDate = new Date(end);
    if (Number.isNaN(endDate.getTime())) return startLabel;

    if (startDate.getFullYear() === endDate.getFullYear()) {
        const startPart = startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const endPart = endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        return `${startPart} – ${endPart}`;
    }

    const endLabel = endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startLabel} – ${endLabel}`;
};

const invitationBelongsToParticipant = (
    invitation: Invitation,
    participant: { id?: string; participantId?: string; email?: string; teamMemberId?: string; [key: string]: unknown } | null,
): boolean => {
    if (!participant) return false;
    const identityIds = getParticipantIdentityIds(participant);
    if (invitation.participantId && identityIds.includes(String(invitation.participantId))) return true;
    return !!participant.email && invitation.participantEmail?.toLowerCase() === participant.email.toLowerCase();
};

type InvitationRowModel = {
    invitation: Invitation;
    campaign: campaignApi.Campaign | null;
    isVIP: boolean;
    eventObj: any;
    alreadyRegistered: boolean;
    responseStatus: string;
    showRespondActions: boolean;
    canRegister: boolean;
    isResponding: boolean;
    locationLabel: string;
    dateLabel: string;
    deadlineLabel: string;
    eventName: string;
};

const Invitations: React.FC = () => {
    const { participant } = useParticipantSession();
    const navigate = useNavigate();
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [apiEvents, setApiEvents] = useState<any[]>([]);
    const [campaignMap, setCampaignMap] = useState<Record<string, campaignApi.Campaign>>({});
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [registeredInvitationIds, setRegisteredInvitationIds] = useState<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<ViewMode>(readStoredViewMode);

    const [previewTemplate, setPreviewTemplate] = useState<EMSInvitationTemplate | null>(null);
    const [previewInvitation, setPreviewInvitation] = useState<Invitation | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [respondingInvitationId, setRespondingInvitationId] = useState<string | null>(null);

    const setViewModeAndPersist = (mode: ViewMode) => {
        setViewMode(mode);
        try {
            localStorage.setItem(VIEW_MODE_KEY, mode);
        } catch {
            // ignore storage failures
        }
    };

    const loadInvitations = async (showPageLoader = true) => {
        if (!participant) return;

        if (showPageLoader) {
            setIsLoading(true);
        }
        setError(null);
        try {
            const [invData, regData] = await Promise.all([
                getMyInvitations().catch(() => []),
                getMyRegistrations().catch(() => []),
            ]);
            const participantRegistrations = Array.isArray(regData) ? regData : [];
            setRegistrations(participantRegistrations);
            setRegisteredInvitationIds(buildRegisteredInvitationIds(participantRegistrations));

            // RSVP actions must only ever operate on invitation records issued
            // by the API. Local campaign previews have synthetic IDs and cannot
            // be accepted or registered against.
            const remoteInvitations = (Array.isArray(invData) ? invData : [])
                .filter(invitation => isRealInvitationId(invitation.id));
            const mergedInvitations = [...remoteInvitations];

            const invitationEmbeddedEvents = mergedInvitations
                .flatMap(inv => [inv.event, inv.campaign?.event])
                .filter((event): event is NonNullable<Invitation['event']> => Boolean(event?.id));

            const missingEventIds = [...new Set(
                mergedInvitations
                    .map(inv => inv.eventId || inv.event?.id)
                    .filter((eventId): eventId is string =>
                        Boolean(eventId) && !invitationEmbeddedEvents.some(event => event.id === eventId),
                    ),
            )];

            let baseEvents = [...invitationEmbeddedEvents];
            if (missingEventIds.length > 0) {
                const evData = await getEvents().catch(() => eventStore.getAll());
                const fetchedEvents = Array.isArray(evData) ? evData : eventStore.getAll();
                for (const event of fetchedEvents) {
                    if (missingEventIds.includes(event.id) && !baseEvents.some(existing => existing.id === event.id)) {
                        baseEvents.push(event);
                    }
                }
            }

            let allCampaigns: campaignApi.Campaign[] = mergedInvitations
                .map(inv => inv.campaign)
                .filter((campaign): campaign is NonNullable<Invitation['campaign']> & { id: string } => Boolean(campaign?.id))
                .map(campaign => ({
                    ...(campaign as campaignApi.Campaign),
                    id: campaign.id as string,
                    name: campaign.name || '',
                    subject: (campaign as any).subject || '',
                    content: (campaign as any).content || '',
                    status: ((campaign as any).status || 'Sent') as campaignApi.Campaign['status'],
                    eventId: campaign.eventId || campaign.event?.id || '',
                    templateId: campaign.templateId || campaign.template?.id || '',
                    rsvpDeadline: campaign.rsvpDeadline || '',
                    createdAt: (campaign as any).createdAt || new Date().toISOString(),
                    updatedAt: (campaign as any).updatedAt || new Date().toISOString(),
                }));

            const nextCampaignMap: Record<string, campaignApi.Campaign> = {};
            const embeddedEvents: any[] = [...invitationEmbeddedEvents];
            for (const invitation of mergedInvitations) {
                const embeddedCampaign = invitation.campaign;
                if (embeddedCampaign?.id) {
                    nextCampaignMap[embeddedCampaign.id] = {
                        ...(nextCampaignMap[embeddedCampaign.id] || {}),
                        ...embeddedCampaign,
                        id: embeddedCampaign.id,
                        name: embeddedCampaign.name || nextCampaignMap[embeddedCampaign.id]?.name || '',
                        subject: (embeddedCampaign as any).subject || nextCampaignMap[embeddedCampaign.id]?.subject || '',
                        content: (embeddedCampaign as any).content || nextCampaignMap[embeddedCampaign.id]?.content || '',
                        status: (embeddedCampaign as any).status || nextCampaignMap[embeddedCampaign.id]?.status || 'Sent',
                        eventId: embeddedCampaign.eventId || embeddedCampaign.event?.id || invitation.eventId || '',
                        templateId: embeddedCampaign.templateId || embeddedCampaign.template?.id || invitation.templateId || '',
                        rsvpDeadline: embeddedCampaign.rsvpDeadline || invitation.rsvpDeadline || '',
                        event: embeddedCampaign.event || invitation.event,
                        template: embeddedCampaign.template || invitation.template,
                        createdAt: (embeddedCampaign as any).createdAt || new Date().toISOString(),
                        updatedAt: (embeddedCampaign as any).updatedAt || new Date().toISOString(),
                    } as campaignApi.Campaign;
                }
            }
            for (const campaign of allCampaigns) {
                if (!campaign?.id) continue;
                nextCampaignMap[campaign.id] = campaign;
                if (campaign.event?.id) embeddedEvents.push(campaign.event);
            }
            const mergedEvents = [...baseEvents];
            for (const event of embeddedEvents) {
                if (!mergedEvents.some(e => e.id === event.id)) mergedEvents.push(event);
            }
            setApiEvents(mergedEvents);
            setCampaignMap(nextCampaignMap);

            const seenKeys = new Set<string>();
            const finalInvitations: Invitation[] = [];
            const addInvitation = (inv: Invitation) => {
                const key = inv.id || inv.token || `${inv.campaignId || 'direct'}-${inv.participantId || inv.eventId || ''}`;
                if (seenKeys.has(key)) return;
                seenKeys.add(key);
                finalInvitations.push(inv);
            };

            for (const inv of mergedInvitations) addInvitation(inv);

            setInvitations(finalInvitations);
        } catch (err: any) {
            console.error('Failed to load invitations:', err);
            setError('Could not load invitations. Please try again.');
            setInvitations([]);
            setApiEvents(eventStore.getAll());
            setCampaignMap({});
        } finally {
            if (showPageLoader) {
                setIsLoading(false);
            }
        }
    };

    useEffect(() => {
        if (participant) {
            void loadInvitations(true);
        }
    }, [participant]);

    const handleRespond = async (invitation: Invitation, response: InvitationResponse) => {
        if (!canRespondToInvitation(invitation)) return;

        setRespondingInvitationId(invitation.id);
        try {
            const updated = await respondToInvitationById(invitation.id, response);
            const merged = mergeInvitationAfterRespond(invitation, updated, response);
            setInvitations(prev =>
                prev.map(item => (item.id === invitation.id ? merged : item)),
            );
            if (previewInvitation?.id === invitation.id) {
                setPreviewInvitation(merged);
            }
            toast.success(
                response === 'Accepted'
                    ? 'Invitation accepted. You can now register.'
                    : response === 'Declined'
                        ? 'Invitation declined.'
                        : 'Marked as maybe.',
            );
        } catch (err: any) {
            const detail =
                err?.response?.data?.message ||
                err?.message ||
                'Failed to update invitation response';
            toast.error(detail);
        } finally {
            setRespondingInvitationId(null);
        }
    };

    const navigateToRegister = (invitation: Invitation) => {
        const eventId = invitation.eventId || invitation.event?.id || '';
        const params = new URLSearchParams({ invitationId: invitation.id });
        if (eventId) params.set('eventId', eventId);
        navigate(`/portal/register?${params.toString()}`);
    };

    const getCampaignDetails = (campaignId?: string) => {
        if (!campaignId) return null;
        return campaignMap[campaignId] || campaignStore.getById(campaignId) || null;
    };

    const getEventObj = (eventId: string, invitation?: Invitation | null) => {
        if (invitation?.event?.id) return invitation.event;
        if (invitation?.campaign?.event?.id) return invitation.campaign.event;
        const campaign = invitation?.campaignId
            ? (getCampaignDetails(invitation.campaignId) as campaignApi.Campaign | null)
            : null;
        if ((campaign as campaignApi.Campaign | null)?.event?.id) {
            return (campaign as campaignApi.Campaign).event;
        }
        return apiEvents.find(e => e.id === eventId) || eventStore.getById(eventId) || null;
    };

    const getEventName = (eventId: string, invitation?: Invitation | null) => {
        const eventObj = getEventObj(eventId, invitation);
        if (eventObj?.name) return eventObj.name;
        return eventStore.getById(eventId)?.name || 'Unknown Event';
    };

    const formatEventDates = (eventId: string, invitation?: Invitation | null) => {
        const eventObj = getEventObj(eventId, invitation);
        return formatEventRecordDates(eventObj);
    };

    const getInvitationTemplate = (invitation: Invitation): EMSInvitationTemplate | null => {
        const fromInvitation = toPreviewTemplate(invitation.template);
        if (fromInvitation) return fromInvitation;

        const campaign = invitation.campaignId
            ? (getCampaignDetails(invitation.campaignId) as campaignApi.Campaign | null)
            : null;
        const fromCampaign = toPreviewTemplate((campaign as campaignApi.Campaign | null)?.template);
        if (fromCampaign) return fromCampaign;

        const fromStore = invitation.templateId ? templateStore.getById(invitation.templateId) : undefined;
        return fromStore || null;
    };

    const handlePreview = (invitation: Invitation) => {
        setPreviewTemplate(getInvitationTemplate(invitation));
        setPreviewInvitation(invitation);
        setPreviewOpen(true);
    };

    const pendingCount = invitations.filter(inv => {
        const status = getInvitationResponseStatus(inv);
        return status === 'Pending' || status === 'Maybe' || status === 'Sent' || status === 'Delivered' || status === 'Opened';
    }).length;
    const acceptedCount = invitations.filter(inv => isInvitationAccepted(inv)).length;
    const registeredCount = invitations.filter(inv =>
        isInvitationRegistered(inv, registeredInvitationIds, registrations),
    ).length;

    const rows: InvitationRowModel[] = invitations.map((invitation) => {
        const campaign = (getCampaignDetails(invitation.campaignId as any) as campaignApi.Campaign | null)
            || (invitation.campaign as unknown as campaignApi.Campaign | undefined)
            || null;
        const template = getInvitationTemplate(invitation);
        const isVIP = template ? isVIPTemplate(template) : false;
        const eventObj: any = getEventObj(invitation.eventId, invitation);
        const alreadyRegistered = isInvitationRegistered(
            invitation,
            registeredInvitationIds,
            registrations,
        );
        const responseStatus = getInvitationResponseStatus(invitation);
        return {
            invitation,
            campaign,
            isVIP,
            eventObj,
            alreadyRegistered,
            responseStatus,
            showRespondActions: canRespondToInvitation(invitation),
            canRegister: isInvitationAccepted(invitation) && !alreadyRegistered && !isInvitationDeclined(invitation),
            isResponding: respondingInvitationId === invitation.id,
            locationLabel: eventObj?.city || eventObj?.location || 'Location TBD',
            dateLabel: formatEventDates(invitation.eventId, invitation),
            deadlineLabel: formatDeadline(invitation.rsvpDeadline),
            eventName: getEventName(invitation.eventId, invitation),
        };
    });

    const renderRespondControls = (row: InvitationRowModel, variant: 'card' | 'table' = 'card') => {
        if (!row.showRespondActions) return null;

        if (variant === 'table') {
            return (
                <div className="flex h-8 w-full items-center overflow-hidden rounded-md border border-border/80 bg-background">
                    <button
                        type="button"
                        disabled={row.isResponding}
                        onClick={() => void handleRespond(row.invitation, 'Accepted')}
                        className="inline-flex h-full flex-1 items-center justify-center gap-1 whitespace-nowrap bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                        {row.isResponding && <Loader2 className="h-3 w-3 animate-spin" />}
                        Accept
                    </button>
                    <button
                        type="button"
                        disabled={row.isResponding}
                        onClick={() => void handleRespond(row.invitation, 'Maybe')}
                        className="inline-flex h-full flex-1 items-center justify-center whitespace-nowrap border-l border-border/80 px-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
                    >
                        Maybe
                    </button>
                    <button
                        type="button"
                        disabled={row.isResponding}
                        onClick={() => void handleRespond(row.invitation, 'Declined')}
                        className="inline-flex h-full flex-1 items-center justify-center whitespace-nowrap border-l border-border/80 px-1.5 text-[11px] font-medium text-status-error transition-colors hover:bg-status-error-bg disabled:opacity-60"
                    >
                        Decline
                    </button>
                </div>
            );
        }

        return (
            <div className="flex items-center overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                <Button
                    size="sm"
                    disabled={row.isResponding}
                    className="h-8 rounded-none border-0 px-3 shadow-none"
                    onClick={() => void handleRespond(row.invitation, 'Accepted')}
                >
                    {row.isResponding ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <>
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                            Accept
                        </>
                    )}
                </Button>
                <div className="h-8 w-px bg-border" />
                <Button
                    size="sm"
                    variant="ghost"
                    disabled={row.isResponding}
                    className="h-8 rounded-none px-3 text-muted-foreground hover:text-foreground"
                    onClick={() => void handleRespond(row.invitation, 'Maybe')}
                >
                    Maybe
                </Button>
                <div className="h-8 w-px bg-border" />
                <Button
                    size="sm"
                    variant="ghost"
                    disabled={row.isResponding}
                    className="h-8 rounded-none px-3 text-status-error hover:bg-status-error-bg hover:text-status-error"
                    onClick={() => void handleRespond(row.invitation, 'Declined')}
                >
                    Decline
                </Button>
            </div>
        );
    };

    const renderRegisterControl = (row: InvitationRowModel, variant: 'card' | 'table' = 'card') => {
        const isTable = variant === 'table';

        if (row.alreadyRegistered) {
            return (
                <span
                    title="Registration complete"
                    className={cn(
                        'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md bg-status-success-bg px-2.5 text-[11px] font-semibold text-status-success ring-1 ring-inset ring-status-success/15',
                        isTable && 'w-full justify-center px-2',
                    )}
                >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    {isTable ? 'Registered' : 'Registration complete'}
                </span>
            );
        }
        if (isInvitationDeclined(row.invitation)) {
            return (
                <span
                    className={cn(
                        'inline-flex h-8 items-center whitespace-nowrap rounded-md bg-muted px-2.5 text-[11px] font-medium text-muted-foreground',
                        isTable && 'w-full justify-center px-2',
                    )}
                >
                    Declined
                </span>
            );
        }
        if (row.canRegister) {
            return (
                <Button
                    size="sm"
                    className={cn(
                        'h-8 gap-1.5 whitespace-nowrap px-3 shadow-sm',
                        isTable && 'w-full justify-center px-2',
                    )}
                    onClick={() => navigateToRegister(row.invitation)}
                >
                    Register
                    <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                </Button>
            );
        }
        if (variant === 'table') {
            return null;
        }
        return (
            <span className="inline-flex h-8 items-center rounded-lg border border-dashed border-border px-3 text-[11px] font-medium text-muted-foreground">
                Accept to unlock registration
            </span>
        );
    };

    const renderTableActions = (row: InvitationRowModel) => (
        <div className="flex items-center gap-2">
            <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 border-border/80 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => handlePreview(row.invitation)}
                title="Preview invitation"
            >
                <Eye className="h-3.5 w-3.5" />
            </Button>
            <div className="min-w-0 flex-1">
                {row.showRespondActions
                    ? renderRespondControls(row, 'table')
                    : renderRegisterControl(row, 'table')}
            </div>
        </div>
    );

    if (!participant) return null;

    const showListToolbar = !isLoading && !error && invitations.length > 0;

    return (
        <div className="space-y-8">
            <header className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.06] via-card to-card px-6 py-6 shadow-sm sm:px-8 sm:py-7">
                <div
                    className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/[0.07] blur-3xl"
                    aria-hidden
                />
                <div
                    className="pointer-events-none absolute -bottom-24 left-1/3 h-40 w-40 rounded-full bg-accent/10 blur-3xl"
                    aria-hidden
                />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-xl space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                            Participant portal
                        </p>
                        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                            My Invitations
                        </h1>
                        <p className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                            Review each invitation, respond to your RSVP, then complete registration when accepted.
                        </p>
                    </div>

                    {showListToolbar && (
                        <div className="grid grid-cols-3 gap-3 sm:gap-4">
                            {[
                                { label: 'Awaiting', value: pendingCount, tone: 'text-status-warning' },
                                { label: 'Accepted', value: acceptedCount, tone: 'text-status-success' },
                                { label: 'Registered', value: registeredCount, tone: 'text-primary' },
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

            {isLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 py-24">
                    <Loader2 className="h-9 w-9 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading your invitations…</p>
                </div>
            ) : error ? (
                <div className="rounded-2xl border border-status-error/20 bg-status-error-bg/40 px-6 py-14 text-center">
                    <AlertCircle className="mx-auto mb-3 h-10 w-10 text-status-error/70" />
                    <p className="text-sm font-medium text-status-error">{error}</p>
                    <Button variant="outline" className="mt-5" onClick={() => window.location.reload()}>
                        Retry
                    </Button>
                </div>
            ) : invitations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-20 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                        <Mail className="h-7 w-7 text-muted-foreground/50" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">No invitations yet</h2>
                    <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
                        When you are invited to an event, it will appear here for you to RSVP and register.
                    </p>
                </div>
            ) : (
                <section className="space-y-4 pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-0.5">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary/60" />
                            <h2 className="text-sm font-semibold text-foreground">
                                Invitations
                                <span className="ml-1.5 font-normal text-muted-foreground">
                                    ({invitations.length})
                                </span>
                            </h2>
                        </div>

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
                    </div>

                    {viewMode === 'cards' ? (
                        <div className="space-y-4">
                            {rows.map((row) => (
                                <article
                                    key={row.invitation.id}
                                    className={cn(
                                        'group relative overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] transition-all duration-300',
                                        'hover:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_16px_40px_-16px_rgba(15,23,42,0.14)]',
                                        row.isVIP
                                            ? 'border-amber-200/80'
                                            : row.responseStatus === 'Accepted'
                                                ? 'border-status-success/20'
                                                : 'border-border/80',
                                    )}
                                >
                                    <div
                                        className={cn(
                                            'absolute inset-y-0 left-0 w-1',
                                            row.isVIP
                                                ? 'bg-gradient-to-b from-amber-400 to-amber-600'
                                                : row.responseStatus === 'Accepted'
                                                    ? 'bg-status-success'
                                                    : row.responseStatus === 'Declined'
                                                        ? 'bg-status-error'
                                                        : 'bg-primary/40',
                                        )}
                                        aria-hidden
                                    />

                                    <div className="pl-4 sm:pl-5">
                                        <div className="flex flex-col gap-5 p-5 sm:p-6">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="space-y-2">
                                                    <div className="flex flex-wrap items-center gap-2.5">
                                                        <h3 className="text-xl font-semibold tracking-tight text-foreground">
                                                            {row.eventName}
                                                        </h3>
                                                        {row.isVIP && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm shadow-amber-500/25">
                                                                <Crown className="h-3 w-3" />
                                                                VIP
                                                            </span>
                                                        )}
                                                    </div>
                                                    {row.campaign?.name && (
                                                        <p className="text-xs text-muted-foreground">
                                                            <span className="font-medium text-foreground/70">Campaign</span>
                                                            <span className="mx-1.5 text-border">·</span>
                                                            {row.campaign.name}
                                                        </p>
                                                    )}
                                                </div>
                                                <StatusPill status={row.responseStatus} />
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
                                                        <p className="text-sm font-medium text-foreground">
                                                            {row.dateLabel}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-2.5 rounded-xl bg-muted/40 px-3 py-2.5">
                                                    <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/60" />
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                            RSVP by
                                                        </p>
                                                        <p className="text-sm font-medium text-foreground">
                                                            {row.deadlineLabel}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3 border-t border-border/70 bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                                                    onClick={() => handlePreview(row.invitation)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    Preview
                                                </Button>
                                                {renderRespondControls(row)}
                                            </div>
                                            <div className="flex items-center gap-2 sm:shrink-0">
                                                {renderRegisterControl(row)}
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
                            <div className="overflow-x-auto">
                                <Table className="w-full table-fixed">
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="h-11 min-w-0 bg-muted/40 text-[11px] font-semibold uppercase tracking-wider">Event</TableHead>
                                            <TableHead className="h-11 w-[140px] bg-muted/40 text-[11px] font-semibold uppercase tracking-wider">Location</TableHead>
                                            <TableHead className="h-11 w-[150px] bg-muted/40 text-[11px] font-semibold uppercase tracking-wider">Date</TableHead>
                                            <TableHead className="h-11 w-[105px] bg-muted/40 text-[11px] font-semibold uppercase tracking-wider">RSVP by</TableHead>
                                            <TableHead className="h-11 w-[125px] bg-muted/40 text-[11px] font-semibold uppercase tracking-wider">Status</TableHead>
                                            <TableHead className="h-11 w-[235px] bg-muted/40 text-[11px] font-semibold uppercase tracking-wider">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rows.map((row) => (
                                            <TableRow key={row.invitation.id} className="border-border/60 transition-colors hover:bg-muted/25">
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
                                                                row.eventName.charAt(0).toUpperCase()
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <p className="truncate text-sm font-semibold text-foreground">
                                                                    {row.eventName}
                                                                </p>
                                                                {row.isVIP && (
                                                                    <span className="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600 ring-1 ring-inset ring-amber-500/20">
                                                                        VIP
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {row.campaign?.name && (
                                                                <p className="truncate text-xs text-muted-foreground">
                                                                    {row.campaign.name}
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
                                                    <span className="block truncate">{row.deadlineLabel}</span>
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <StatusPill status={row.responseStatus} />
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    {renderTableActions(row)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </section>
            )}

            <InvitationPreviewModal
                open={previewOpen}
                onOpenChange={setPreviewOpen}
                template={previewTemplate}
                event={previewInvitation ? getEventObj(previewInvitation.eventId, previewInvitation) : null}
                participant={participant}
                rsvpDeadline={previewInvitation?.rsvpDeadline}
                invitationStatus={previewInvitation ? getInvitationResponseStatus(previewInvitation) : undefined}
                canRespond={previewInvitation ? canRespondToInvitation(previewInvitation) : false}
                canRegister={
                    previewInvitation
                        ? isInvitationAccepted(previewInvitation)
                            && !isInvitationRegistered(previewInvitation, registeredInvitationIds, registrations)
                            && !isInvitationDeclined(previewInvitation)
                        : false
                }
                isResponding={previewInvitation ? respondingInvitationId === previewInvitation.id : false}
                onRespond={(response) => {
                    if (previewInvitation) void handleRespond(previewInvitation, response);
                }}
                onRegister={() => {
                    if (previewInvitation) navigateToRegister(previewInvitation);
                }}
            />
        </div>
    );
};

export default Invitations;
