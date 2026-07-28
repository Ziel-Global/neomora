// import React, { useState, useEffect } from 'react';
// import { Card, CardContent } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { useParticipantSession } from '@/contexts/ParticipantSessionContext';
// import { useNavigate } from 'react-router-dom';
// import {
//     eventStore,
//     templateStore,
//     invitationStore,
//     campaignStore,
//     EMSInvitationTemplate
// } from '@/lib/emsStore';
// import { StatusBadge } from '@/components/common/StatusBadge';
// import { InvitationPreviewModal } from '@/components/invitations/InvitationPreviewModal';
// import { InvitationTemplatePreview } from '@/components/invitations/InvitationTemplatePreview';
// import { Calendar, Crown, Star, Eye, Mail, Loader2 } from 'lucide-react';
// import { getMyInvitations, Invitation } from '@/api/invitationApi';
// import { getEvents } from '@/api/eventApi';
// import * as campaignApi from '@/api/campaignApi';


// const isVIPTemplate = (template: EMSInvitationTemplate): boolean => {
//     const name = template.name.toLowerCase();
//     const subject = template.subject.toLowerCase();
//     return name.includes('vip') || name.includes('exclusive') ||
//         subject.includes('vip') || subject.includes('exclusive');
// };


// const Invitations: React.FC = () => {
//     const { participant } = useParticipantSession();
//     const navigate = useNavigate();
//     const [invitations, setInvitations] = useState<Invitation[]>([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [apiEvents, setApiEvents] = useState<any[]>([]);
//     const [campaignMap, setCampaignMap] = useState<Record<string, campaignApi.Campaign>>({});
//     const [campaignAudienceMap, setCampaignAudienceMap] = useState<Record<string, string[]>>({});


//     // Modal state
//     const [previewTemplate, setPreviewTemplate] = useState<EMSInvitationTemplate | null>(null);
//     const [previewInvitation, setPreviewInvitation] = useState<Invitation | null>(null);
//     const [previewOpen, setPreviewOpen] = useState(false);


//     useEffect(() => {
//         const fetchData = async () => {
//             setIsLoading(true);
//             setError(null);
//             try {
//                 const [invData, evData] = await Promise.all([
//                     getMyInvitations(),
//                     getEvents().catch(() => eventStore.getAll())
//                 ]);
//                 const remoteInvitations = Array.isArray(invData) ? invData : [];
//                 const localInvitations = participant
//                     ? invitationStore.getAll().filter(i =>
//                         i.participantId === participant.id ||
//                         (participant.email && i.participantEmail?.toLowerCase() === participant.email.toLowerCase())
//                     )
//                     : [];
//                 const mergedInvitations = [...remoteInvitations];
//                 for (const localInvitation of localInvitations) {
//                     if (!mergedInvitations.some(existing => existing.id === localInvitation.id || existing.token === localInvitation.token)) {
//                         mergedInvitations.push(localInvitation);
//                     }
//                 }
//                 setApiEvents(Array.isArray(evData) ? evData : eventStore.getAll());


//                 let allCampaigns: campaignApi.Campaign[] = [];
//                 try {
//                     allCampaigns = await campaignApi.getCampaigns();
//                 } catch (e) {
//                     allCampaigns = campaignStore.getAll() as any[];
//                 }


//                 const nextCampaignMap: Record<string, campaignApi.Campaign> = {};
//                 const nextAudienceMap: Record<string, string[]> = {};
//                 for (const campaign of allCampaigns) {
//                     if (campaign && campaign.id) {
//                         nextCampaignMap[campaign.id] = campaign;
//                         nextAudienceMap[campaign.id] = Array.isArray(campaign.audienceIds)
//                             ? campaign.audienceIds
//                             : Array.isArray(campaign.targetParticipantIds)
//                                 ? campaign.targetParticipantIds
//                                 : [];
//                     }
//                 }
//                 setCampaignMap(nextCampaignMap);
//                 setCampaignAudienceMap(nextAudienceMap);


//                 const sentCampaigns = allCampaigns.filter(c => c.status?.toLowerCase() === 'sent');


//                 const finalInvitations: any[] = [...mergedInvitations.filter(inv => !inv.campaignId)];


//                 for (const c of sentCampaigns) {
//                     const realInv = mergedInvitations.find(inv => inv.campaignId === c.id);

//                     // Check if participant is in audience for this campaign
//                     const audienceIds = nextAudienceMap[c.id] || [];
//                     const isParticipantInAudience = participant && (
//                         audienceIds.includes(participant.id) ||
//                         (participant.email && localInvitations.some(inv =>
//                             inv.campaignId === c.id && inv.participantEmail?.toLowerCase() === participant.email.toLowerCase()
//                         ))
//                     );

//                     if (realInv) {
//                         finalInvitations.push(realInv);
//                     } else if (isParticipantInAudience) {
//                         finalInvitations.push({
//                             id: `camp-inv-${c.id}`,
//                             campaignId: c.id,
//                             eventId: c.eventId,
//                             status: 'Sent',
//                             templateId: c.templateId,
//                             rsvpDeadline: c.rsvpDeadline,
//                             token: c.id
//                         });
//                     }
//                 }


//                 setInvitations(finalInvitations);
//             } catch (err: any) {
//                 console.error('Failed to load invitations:', err);
//                 setError('Could not load invitations. Please try again.');
//                 // Fallback to local store
//                 if (participant) {
//                     const localInvs = invitationStore.getAll().filter(i =>
//                         i.participantId === participant.id ||
//                         (participant.email && i.participantEmail?.toLowerCase() === participant.email.toLowerCase())
//                     );
//                     setInvitations(localInvs as any[]);
//                 }
//                 setApiEvents(eventStore.getAll());
//                 setCampaignMap({});
//                 setCampaignAudienceMap({});
//             } finally {
//                 setIsLoading(false);
//             }
//         };


//         fetchData();
//     }, [participant]);


//     const getEventName = (eventId: string) => {
//         const apiEvent = apiEvents.find(e => e.id === eventId);
//         if (apiEvent) return apiEvent.name;
//         return eventStore.getById(eventId)?.name || 'Unknown Event';
//     };


//     const getCampaignDetails = (campaignId?: string) => {
//         if (!campaignId) return null;
//         return campaignMap[campaignId] || campaignStore.getById(campaignId) || null;
//     };


//     const campaignMatchesParticipant = (campaignId?: string) => {
//         if (!campaignId || !participant) return false;
//         const audienceIds = campaignAudienceMap[campaignId] || (campaignStore.getById(campaignId) as any)?.audienceIds || [];
//         const participantIdMatch = audienceIds.includes(participant.id);
//         const participantEmailMatch = !!participant.email && invitationStore.getAll().some(inv =>
//             inv.campaignId === campaignId && inv.participantEmail?.toLowerCase() === participant.email.toLowerCase()
//         );
//         return participantIdMatch || participantEmailMatch;
//     };


//     if (!participant) return null;


//     return (
//         <div className="space-y-6">
//             <div>
//                 <h1 className="text-3xl font-bold mb-2">My Invitations</h1>
//                 <p className="text-muted-foreground">Manage your event invitations and RSVPs.</p>
//             </div>


//             {isLoading ? (
//                 <div className="flex justify-center py-16">
//                     <Loader2 className="h-10 w-10 animate-spin text-primary" />
//                 </div>
//             ) : error ? (
//                 <Card>
//                     <CardContent className="pt-10 pb-10 text-center text-destructive">
//                         <p>{error}</p>
//                         <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
//                             Retry
//                         </Button>
//                     </CardContent>
//                 </Card>
//             ) : invitations.length === 0 ? (
//                 <Card>
//                     <CardContent className="pt-10 pb-10 text-center text-muted-foreground">
//                         <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
//                         <p>You have no invitations at this time.</p>
//                     </CardContent>
//                 </Card>
//             ) : (
//                 <div className="space-y-4">
//                     {invitations.map((invitation) => {
//                         const campaign = getCampaignDetails(invitation.campaignId as any);
//                         const template = templateStore.getById(invitation.templateId as any) || campaign?.template;
//                         const isVIP = template ? isVIPTemplate(template as any) : false;


//                         const eventObj = apiEvents.find(e => e.id === invitation.eventId) || eventStore.getById(invitation.eventId);

//                         return (
//                             <div key={invitation.id} className="flex flex-col gap-3 pb-6 border-b last:border-b-0 last:pb-0">
//                                 {template ? (
//                                     <InvitationTemplatePreview
//                                         template={template}
//                                         event={eventObj}
//                                         participant={participant}
//                                         rsvpDeadline={invitation.rsvpDeadline}
//                                     />
//                                 ) : (
//                                     <Card className={`${isVIP ? 'border-amber-200 bg-amber-50/30' : ''}`}>
//                                         <CardContent className="pt-6">
//                                             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//                                                 <div className="flex items-start gap-4">
//                                                     <div className={`p-2 rounded-full ${isVIP ? 'bg-amber-100 text-amber-600' : 'bg-muted text-muted-foreground'}`}>
//                                                         <Calendar className="h-6 w-6" />
//                                                     </div>
//                                                     <div>
//                                                         {campaign && (
//                                                             <div className="mb-2">
//                                                                 <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
//                                                                     Campaign: {campaign.name}
//                                                                 </Badge>
//                                                             </div>
//                                                         )}
//                                                         <div className="flex items-center gap-2 mb-1">
//                                                             <h3 className="font-bold text-lg">{getEventName(invitation.eventId)}</h3>
//                                                             {isVIP && (
//                                                                 <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-white text-xs">
//                                                                     <Crown className="h-3 w-3 mr-1" /> VIP
//                                                                 </Badge>
//                                                             )}
//                                                         </div>
//                                                         <p className="text-sm text-muted-foreground">
//                                                             RSVP Deadline: {invitation.rsvpDeadline || 'N/A'}
//                                                         </p>
//                                                     </div>
//                                                 </div>
//                                             </div>
//                                         </CardContent>
//                                     </Card>
//                                 )}

//                                 {/* <div className="flex justify-end gap-2 px-2">
//                                     {['Pending', 'Delivered', 'Opened', 'Sent'].includes(invitation.status) && (
//                                         <Button variant="default" className="bg-red-500 hover:bg-red-600" onClick={() => navigate(`/invite/${invitation.token}`)}>
//                                             Reject
//                                         </Button>
//                                     )}
//                                     {['Pending', 'Delivered', 'Opened', 'Sent'].includes(invitation.status) && (
//                                         <Button
//                                             variant="default"
//                                             className="bg-green-500 hover:bg-green-600"
//                                             onClick={() => navigate(`/register?invitationId=${invitation.id}`)}
//                                         >
//                                             Approve
//                                         </Button>
//                                     )}
//                                 </div> */}
//                             </div>
//                         );
//                     })}
//                 </div>
//             )}


//             <InvitationPreviewModal
//                 open={previewOpen}
//                 onOpenChange={setPreviewOpen}
//                 template={previewTemplate}
//                 event={previewInvitation ? (apiEvents.find(e => e.id === previewInvitation.eventId) || eventStore.getById(previewInvitation.eventId)) : null}
//                 participant={participant}
//                 rsvpDeadline={previewInvitation?.rsvpDeadline}
//             />
//         </div>
//     );
// };


// export default Invitations;



import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Calendar, Crown, Eye, Mail, Loader2, MapPin, Clock, CheckCircle, X, AlertCircle } from 'lucide-react';
import { getMyInvitations, Invitation } from '@/api/invitationApi';
import { getEvents } from '@/api/eventApi';
import { getMyRegistrations, Registration } from '@/api/registrationApi';
import * as campaignApi from '@/api/campaignApi';

const INVITATION_REGISTRATIONS_KEY = 'ems_invitation_registrations';

const REGISTERED_INVITATION_STATUSES = new Set([
    'registered',
    'accepted',
    'completed',
    'approved',
    'submitted',
]);

const getInvitationRegistrationMap = (): Record<string, string> =>
    JSON.parse(localStorage.getItem(INVITATION_REGISTRATIONS_KEY) || '{}');

const buildRegisteredInvitationIds = (registrations: Registration[]): Set<string> => {
    const ids = new Set<string>(Object.keys(getInvitationRegistrationMap()));

    for (const reg of registrations) {
        const invitationId = reg.invitationId || reg.invitation_id;
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
    if (!eventId) return false;

    return registrations.some(reg => {
        const regEventId = reg.eventId || (reg as any).event?.id;
        const regInvitationId = reg.invitationId || reg.invitation_id;
        if (regInvitationId && regInvitationId === invitation.id) return true;
        return regEventId === eventId;
    });
};


const isVIPTemplate = (template: EMSInvitationTemplate): boolean => {
    const name = template.name.toLowerCase();
    const subject = template.subject.toLowerCase();
    return name.includes('vip') || name.includes('exclusive') ||
        subject.includes('vip') || subject.includes('exclusive');
};

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'Accepted':
            return <Badge className="bg-status-success-bg text-status-success"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
        case 'Declined':
            return <Badge className="bg-status-error-bg text-status-error"><X className="h-3 w-3 mr-1" />Declined</Badge>;
        case 'Delivered':
        case 'Opened':
        case 'Sent':
        case 'Pending':
            return <Badge className="bg-status-warning-bg text-status-warning"><Clock className="h-3 w-3 mr-1" />Pending Response</Badge>;
        case 'Expired':
            return <Badge className="bg-muted text-muted-foreground"><AlertCircle className="h-3 w-3 mr-1" />Expired</Badge>;
        default:
            return <Badge variant="secondary">{status}</Badge>;
    }
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
    const startLabel = new Date(start).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    if (!end || end === start) return startLabel;
    const endLabel = new Date(end).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startLabel} - ${endLabel}`;
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


const Invitations: React.FC = () => {
    const { participant } = useParticipantSession();
    const navigate = useNavigate();
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [apiEvents, setApiEvents] = useState<any[]>([]);
    const [campaignMap, setCampaignMap] = useState<Record<string, campaignApi.Campaign>>({});
    const [campaignAudienceMap, setCampaignAudienceMap] = useState<Record<string, string[]>>({});
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [registeredInvitationIds, setRegisteredInvitationIds] = useState<Set<string>>(new Set());


    // Modal state
    const [previewTemplate, setPreviewTemplate] = useState<EMSInvitationTemplate | null>(null);
    const [previewInvitation, setPreviewInvitation] = useState<Invitation | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);


    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const identityIds = getParticipantIdentityIds(participant);

                const [invData, regData] = await Promise.all([
                    getMyInvitations().catch(() => []),
                    getMyRegistrations().catch(() => []),
                ]);
                const participantRegistrations = Array.isArray(regData) ? regData : [];
                setRegistrations(participantRegistrations);
                setRegisteredInvitationIds(buildRegisteredInvitationIds(participantRegistrations));

                const remoteInvitations = Array.isArray(invData) ? invData : [];
                const localInvitations = participant
                    ? invitationStore.getAll().filter(i => invitationBelongsToParticipant(i, participant))
                    : [];
                const mergedInvitations = [...remoteInvitations];
                for (const localInvitation of localInvitations) {
                    if (!mergedInvitations.some(existing => existing.id === localInvitation.id || existing.token === localInvitation.token)) {
                        mergedInvitations.push(localInvitation as Invitation);
                    }
                }

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

                if (remoteInvitations.length === 0) {
                    try {
                        allCampaigns = await campaignApi.getCampaignsForParticipant(identityIds);
                    } catch {
                        allCampaigns = (campaignStore.getAll() as any[]).filter(
                            (c: campaignApi.Campaign) => campaignApi.isSentCampaignStatus(c.status) && campaignApi.campaignTargetsParticipant(c, identityIds)
                        );
                    }
                }

                const nextCampaignMap: Record<string, campaignApi.Campaign> = {};
                const nextAudienceMap: Record<string, string[]> = {};
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
                    nextAudienceMap[campaign.id] = getCampaignAudienceIds(campaign);
                    if (campaign.event?.id) embeddedEvents.push(campaign.event);
                }
                const mergedEvents = [...baseEvents];
                for (const event of embeddedEvents) {
                    if (!mergedEvents.some(e => e.id === event.id)) mergedEvents.push(event);
                }
                setApiEvents(mergedEvents);
                setCampaignMap(nextCampaignMap);
                setCampaignAudienceMap(nextAudienceMap);

                const sentCampaigns = allCampaigns.filter(c => campaignApi.isSentCampaignStatus(c.status));
                const seenKeys = new Set<string>();
                const finalInvitations: Invitation[] = [];
                const addInvitation = (inv: Invitation) => {
                    const key = inv.id || inv.token || `${inv.campaignId || 'direct'}-${inv.participantId || inv.eventId || ''}`;
                    if (seenKeys.has(key)) return;
                    seenKeys.add(key);
                    finalInvitations.push(inv);
                };

                for (const inv of mergedInvitations) addInvitation(inv);

                for (const c of sentCampaigns) {
                    if (finalInvitations.some(inv => inv.campaignId === c.id)) continue;
                    const audienceIds = nextAudienceMap[c.id] || [];
                    const isParticipantInAudience = participant && (
                        participantMatchesAudience(identityIds, audienceIds) ||
                        localInvitations.some(inv => inv.campaignId === c.id && invitationBelongsToParticipant(inv, participant))
                    );
                    if (isParticipantInAudience) {
                        addInvitation({
                            id: `camp-inv-${c.id}`,
                            campaignId: c.id,
                            eventId: c.eventId || c.event?.id || '',
                            participantId: participant?.id,
                            status: 'Sent',
                            templateId: c.templateId || c.template?.id || '',
                            rsvpDeadline: c.rsvpDeadline,
                            token: c.id,
                            event: c.event,
                            template: c.template,
                            campaign: c,
                        });
                    }
                }

                setInvitations(finalInvitations);
            } catch (err: any) {
                console.error('Failed to load invitations:', err);
                setError('Could not load invitations. Please try again.');
                // Fallback to local store
                if (participant) {
                    setInvitations(invitationStore.getAll().filter(i => invitationBelongsToParticipant(i, participant)) as any[]);
                }
                setApiEvents(eventStore.getAll());
                setCampaignMap({});
                setCampaignAudienceMap({});
            } finally {
                setIsLoading(false);
            }
        };


        fetchData();
    }, [participant]);


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


    const getCampaignDetails = (campaignId?: string) => {
        if (!campaignId) return null;
        return campaignMap[campaignId] || campaignStore.getById(campaignId) || null;
    };


    const campaignMatchesParticipant = (campaignId?: string) => {
        if (!campaignId || !participant) return false;
        const audienceIds = campaignAudienceMap[campaignId]
            || getCampaignAudienceIds(campaignMap[campaignId] || (campaignStore.getById(campaignId) as any) || {});
        return participantMatchesAudience(getParticipantIdentityIds(participant), audienceIds) ||
            (!!participant.email && invitationStore.getAll().some(inv =>
                inv.campaignId === campaignId && invitationBelongsToParticipant(inv, participant)
            ));
    };

    const handlePreview = (invitation: Invitation) => {
        setPreviewTemplate(getInvitationTemplate(invitation));
        setPreviewInvitation(invitation);
        setPreviewOpen(true);
    };


    if (!participant) return null;


    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">My Invitations</h1>
                <p className="text-muted-foreground">Manage your event invitations and RSVPs.</p>
            </div>


            {isLoading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
            ) : error ? (
                <Card>
                    <CardContent className="pt-10 pb-10 text-center text-destructive">
                        <p>{error}</p>
                        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            ) : invitations.length === 0 ? (
                <Card>
                    <CardContent className="pt-10 pb-10 text-center text-muted-foreground">
                        <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>You have no invitations at this time.</p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            Invitations ({invitations.length})
                        </CardTitle>
                        <CardDescription>
                            Click "Preview" to see the full invitation, then RSVP from there.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Event</TableHead>
                                        <TableHead>Location</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>RSVP Deadline</TableHead>
                                        {/* <TableHead>Status</TableHead> */}
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invitations.map((invitation) => {
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

                                        return (
                                            <TableRow key={invitation.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium">{getEventName(invitation.eventId, invitation)}</p>
                                                        {isVIP && (
                                                            <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-white text-xs">
                                                                <Crown className="h-3 w-3 mr-1" /> VIP
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {campaign && (
                                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs mt-1">
                                                            Campaign: {campaign.name}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                        <MapPin className="h-3 w-3" />
                                                        {eventObj?.city || 'N/A'}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <Calendar className="h-3 w-3 text-muted-foreground" />
                                                        {formatEventDates(invitation.eventId, invitation)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm">
                                                        {invitation.rsvpDeadline
                                                            ? new Date(invitation.rsvpDeadline).toLocaleDateString()
                                                            : 'N/A'}
                                                    </span>
                                                </TableCell>
                                                {/* <TableCell>{getStatusBadge(invitation.status)}</TableCell> */}
                                                <TableCell className='flex justify-between items-center'>

                                                    <Eye onClick={() => handlePreview(invitation)} className="h-4 w-4 mr-1 cursor-pointer" />

                                                    <Button
                                                        disabled={alreadyRegistered}
                                                        variant={alreadyRegistered ? 'secondary' : 'default'}
                                                        onClick={() => {
                                                            if (alreadyRegistered) return;
                                                            const eventId = invitation.eventId || invitation.event?.id || '';
                                                            const params = new URLSearchParams({ invitationId: invitation.id });
                                                            if (eventId) params.set('eventId', eventId);
                                                            navigate(`/register?${params.toString()}`);
                                                        }}
                                                    >
                                                        {alreadyRegistered ? 'Registeration Submitted' : 'Register'}
                                                    </Button>

                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}


            <InvitationPreviewModal
                open={previewOpen}
                onOpenChange={setPreviewOpen}
                template={previewTemplate}
                event={previewInvitation ? getEventObj(previewInvitation.eventId, previewInvitation) : null}
                participant={participant}
                rsvpDeadline={previewInvitation?.rsvpDeadline}
            />
        </div>
    );
};


export default Invitations;