import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useParticipantSession } from '@/contexts/ParticipantSessionContext';
import { useNavigate } from 'react-router-dom';
import {
    eventStore,
    templateStore,
    invitationStore,
    campaignStore,
    EMSInvitationTemplate
} from '@/lib/emsStore';
import { StatusBadge } from '@/components/common/StatusBadge';
import { InvitationPreviewModal } from '@/components/invitations/InvitationPreviewModal';
import { InvitationTemplatePreview } from '@/components/invitations/InvitationTemplatePreview';
import { Calendar, Crown, Star, Eye, Mail, Loader2 } from 'lucide-react';
import { getMyInvitations, Invitation } from '@/api/invitationApi';
import { getEvents } from '@/api/eventApi';
import * as campaignApi from '@/api/campaignApi';


const isVIPTemplate = (template: EMSInvitationTemplate): boolean => {
    const name = template.name.toLowerCase();
    const subject = template.subject.toLowerCase();
    return name.includes('vip') || name.includes('exclusive') ||
        subject.includes('vip') || subject.includes('exclusive');
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


    // Modal state
    const [previewTemplate, setPreviewTemplate] = useState<EMSInvitationTemplate | null>(null);
    const [previewInvitation, setPreviewInvitation] = useState<Invitation | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);


    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const [invData, evData] = await Promise.all([
                    getMyInvitations(),
                    getEvents().catch(() => eventStore.getAll())
                ]);
                const remoteInvitations = Array.isArray(invData) ? invData : [];
                const localInvitations = participant
                    ? invitationStore.getAll().filter(i =>
                        i.participantId === participant.id ||
                        (participant.email && i.participantEmail?.toLowerCase() === participant.email.toLowerCase())
                    )
                    : [];
                const mergedInvitations = [...remoteInvitations];
                for (const localInvitation of localInvitations) {
                    if (!mergedInvitations.some(existing => existing.id === localInvitation.id || existing.token === localInvitation.token)) {
                        mergedInvitations.push(localInvitation);
                    }
                }
                setApiEvents(Array.isArray(evData) ? evData : eventStore.getAll());


                let allCampaigns: campaignApi.Campaign[] = [];
                try {
                    allCampaigns = await campaignApi.getCampaigns();
                } catch (e) {
                    allCampaigns = campaignStore.getAll() as any[];
                }


                const nextCampaignMap: Record<string, campaignApi.Campaign> = {};
                const nextAudienceMap: Record<string, string[]> = {};
                for (const campaign of allCampaigns) {
                    if (campaign && campaign.id) {
                        nextCampaignMap[campaign.id] = campaign;
                        nextAudienceMap[campaign.id] = Array.isArray(campaign.audienceIds)
                            ? campaign.audienceIds
                            : Array.isArray(campaign.targetParticipantIds)
                                ? campaign.targetParticipantIds
                                : [];
                    }
                }
                setCampaignMap(nextCampaignMap);
                setCampaignAudienceMap(nextAudienceMap);


                const sentCampaigns = allCampaigns.filter(c => c.status?.toLowerCase() === 'sent');


                const finalInvitations: any[] = [...mergedInvitations.filter(inv => !inv.campaignId)];


                for (const c of sentCampaigns) {
                    const realInv = mergedInvitations.find(inv => inv.campaignId === c.id);
                    if (realInv) {
                        finalInvitations.push(realInv);
                    } else {
                        finalInvitations.push({
                            id: `camp-inv-${c.id}`,
                            campaignId: c.id,
                            eventId: c.eventId,
                            status: 'Sent',
                            templateId: c.templateId,
                            rsvpDeadline: c.rsvpDeadline,
                            token: c.id
                        });
                    }
                }


                setInvitations(finalInvitations);
            } catch (err: any) {
                console.error('Failed to load invitations:', err);
                setError('Could not load invitations. Please try again.');
                // Fallback to local store
                if (participant) {
                    const localInvs = invitationStore.getAll().filter(i =>
                        i.participantId === participant.id ||
                        (participant.email && i.participantEmail?.toLowerCase() === participant.email.toLowerCase())
                    );
                    setInvitations(localInvs as any[]);
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


    const getEventName = (eventId: string) => {
        const apiEvent = apiEvents.find(e => e.id === eventId);
        if (apiEvent) return apiEvent.name;
        return eventStore.getById(eventId)?.name || 'Unknown Event';
    };


    const getCampaignDetails = (campaignId?: string) => {
        if (!campaignId) return null;
        return campaignMap[campaignId] || campaignStore.getById(campaignId) || null;
    };


    const campaignMatchesParticipant = (campaignId?: string) => {
        if (!campaignId || !participant) return false;
        const audienceIds = campaignAudienceMap[campaignId] || (campaignStore.getById(campaignId) as any)?.audienceIds || [];
        const participantIdMatch = audienceIds.includes(participant.id);
        const participantEmailMatch = !!participant.email && invitationStore.getAll().some(inv =>
            inv.campaignId === campaignId && inv.participantEmail?.toLowerCase() === participant.email.toLowerCase()
        );
        return participantIdMatch || participantEmailMatch;
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
                <div className="space-y-4">
                    {invitations.map((invitation) => {
                        const campaign = getCampaignDetails(invitation.campaignId as any);
                        const template = templateStore.getById(invitation.templateId as any) || campaign?.template;
                        const isVIP = template ? isVIPTemplate(template as any) : false;


                        const eventObj = apiEvents.find(e => e.id === invitation.eventId) || eventStore.getById(invitation.eventId);

                        return (
                            <div key={invitation.id} className="flex flex-col gap-3 pb-6 border-b last:border-b-0 last:pb-0">
                                {template ? (
                                    <InvitationTemplatePreview
                                        template={template}
                                        event={eventObj}
                                        participant={participant}
                                        rsvpDeadline={invitation.rsvpDeadline}
                                    />
                                ) : (
                                    <Card className={`${isVIP ? 'border-amber-200 bg-amber-50/30' : ''}`}>
                                        <CardContent className="pt-6">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex items-start gap-4">
                                                    <div className={`p-2 rounded-full ${isVIP ? 'bg-amber-100 text-amber-600' : 'bg-muted text-muted-foreground'}`}>
                                                        <Calendar className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        {campaign && (
                                                            <div className="mb-2">
                                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                                                    Campaign: {campaign.name}
                                                                </Badge>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className="font-bold text-lg">{getEventName(invitation.eventId)}</h3>
                                                            {isVIP && (
                                                                <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-white text-xs">
                                                                    <Crown className="h-3 w-3 mr-1" /> VIP
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-muted-foreground">
                                                            RSVP Deadline: {invitation.rsvpDeadline || 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                <div className="flex justify-end gap-2 px-2">
                                    {['Pending', 'Delivered', 'Opened', 'Sent'].includes(invitation.status) && (
                                        <Button variant="default" className="bg-red-500 hover:bg-red-600" onClick={() => navigate(`/invite/${invitation.token}`)}>
                                            Reject
                                        </Button>
                                    )}
                                    {['Pending', 'Delivered', 'Opened', 'Sent'].includes(invitation.status) && (
                                        <Button
                                            variant="default"
                                            className="bg-green-500 hover:bg-green-600"
                                            onClick={() => navigate(`/register?invitationId=${invitation.id}`)}
                                        >
                                            Approve
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}


            <InvitationPreviewModal
                open={previewOpen}
                onOpenChange={setPreviewOpen}
                template={previewTemplate}
                event={previewInvitation ? (apiEvents.find(e => e.id === previewInvitation.eventId) || eventStore.getById(previewInvitation.eventId)) : null}
                participant={participant}
                rsvpDeadline={previewInvitation?.rsvpDeadline}
            />
        </div>
    );
};


export default Invitations;



