import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useParticipantSession } from '@/contexts/ParticipantSessionContext';
import { registrationStore, EMSRegistration, eventStore } from '@/lib/emsStore';
import { StatusBadge } from '@/components/common/StatusBadge';
import { FileText, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Registrations: React.FC = () => {
    const { participant } = useParticipantSession();
    const [registrations, setRegistrations] = useState<EMSRegistration[]>([]);

    useEffect(() => {
        if (participant) {
            const regs = registrationStore.getAll().filter(r => r.participantId === participant.id);
            setRegistrations(regs);
        }
    }, [participant]);

    const getEventName = (eventId: string) => {
        return eventStore.getById(eventId)?.name || 'Unknown Event';
    };

    const navigate = useNavigate();

    if (!participant) return null;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">My Registrations</h1>
                <p className="text-muted-foreground">Track the status of your event registrations.</p>
            </div>

            {registrations.length === 0 ? (
                <Card>
                    <CardContent className="pt-10 pb-10 text-center text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>You have not registered for any events yet.</p>
                        <div className="mt-4">
                            <Button onClick={() => navigate('/register')}>Register for Event</Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {registrations.map((reg) => (
                        <Card key={reg.id}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg font-bold">{getEventName(reg.eventId)}</CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">Ref: {reg.registrationId}</p>
                                    </div>
                                    <StatusBadge status={reg.status} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {reg.formData.needsTransport && (
                                        <Badge variant="secondary" className="text-xs">
                                            <Plane className="h-3 w-3 mr-1" />
                                            Travel Requested
                                        </Badge>
                                    )}
                                    {reg.formData.needsAccommodation && (
                                        <Badge variant="secondary" className="text-xs">
                                            <FileText className="h-3 w-3 mr-1" />
                                            Accommodation Requested
                                        </Badge>
                                    )}
                                    {reg.documents.map((doc, idx) => (
                                        <Badge key={idx} variant={doc.status === 'Verified' ? 'outline' : 'secondary'} className="text-xs">
                                            {doc.type}: {doc.status}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Registrations;
