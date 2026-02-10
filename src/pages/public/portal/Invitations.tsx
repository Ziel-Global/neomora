import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useParticipantSession } from '@/contexts/ParticipantSessionContext';
import { useNavigate } from 'react-router-dom';
import {
    invitationStore,
    eventStore,
    templateStore,
    EMSInvitation,
    EMSInvitationTemplate
} from '@/lib/emsStore';
import { StatusBadge } from '@/components/common/StatusBadge';
import { InvitationPreviewModal } from '@/components/invitations/InvitationPreviewModal';
import { Calendar, Crown, Star, Eye, Mail } from 'lucide-react';

const isVIPTemplate = (template: EMSInvitationTemplate): boolean => {
    const name = template.name.toLowerCase();
    const subject = template.subject.toLowerCase();
    return name.includes('vip') || name.includes('exclusive') ||
        subject.includes('vip') || subject.includes('exclusive');
};

const Invitations: React.FC = () => {
    const { participant } = useParticipantSession();
    const navigate = useNavigate();
    const [invitations, setInvitations] = useState<EMSInvitation[]>([]);

    // Modal state
    const [previewTemplate, setPreviewTemplate] = useState<EMSInvitationTemplate | null>(null);
    const [previewInvitation, setPreviewInvitation] = useState<EMSInvitation | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);

    useEffect(() => {
        if (participant) {
            const invs = invitationStore.getAll().filter(i => i.participantId === participant.id);
            setInvitations(invs);
        }
    }, [participant]);

    const getEventName = (eventId: string) => {
        return eventStore.getById(eventId)?.name || 'Unknown Event';
    };

    if (!participant) return null;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">My Invitations</h1>
                <p className="text-muted-foreground">Manage your event invitations and RSVPs.</p>
            </div>

            {invitations.length === 0 ? (
                <Card>
                    <CardContent className="pt-10 pb-10 text-center text-muted-foreground">
                        <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>You have no invitations at this time.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {invitations.map((invitation) => {
                        const template = templateStore.getById(invitation.templateId);
                        const isVIP = template ? isVIPTemplate(template) : false;

                        return (
                            <Card key={invitation.id} className={`${isVIP ? 'border-amber-200 bg-amber-50/30' : ''}`}>
                                <CardContent className="pt-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className={`p-2 rounded-full ${isVIP ? 'bg-amber-100 text-amber-600' : 'bg-muted text-muted-foreground'}`}>
                                                <Calendar className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-lg">{getEventName(invitation.eventId)}</h3>
                                                    {isVIP && (
                                                        <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-white text-xs">
                                                            <Crown className="h-3 w-3 mr-1" /> VIP
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground">RSVP Deadline: {invitation.rsvpDeadline}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {template && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setPreviewTemplate(template);
                                                        setPreviewInvitation(invitation);
                                                        setPreviewOpen(true);
                                                    }}
                                                >
                                                    <Eye className="h-4 w-4 mr-1" /> View
                                                </Button>
                                            )}

                                            <StatusBadge status={invitation.status} />

                                            {['Pending', 'Delivered', 'Opened'].includes(invitation.status) && (
                                                <Button onClick={() => navigate(`/invite/${invitation.token}`)}>
                                                    Respond
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            <InvitationPreviewModal
                open={previewOpen}
                onOpenChange={setPreviewOpen}
                template={previewTemplate}
                event={previewInvitation ? eventStore.getById(previewInvitation.eventId) : null}
                participant={participant}
                rsvpDeadline={previewInvitation?.rsvpDeadline}
            />
        </div>
    );
};

export default Invitations;
