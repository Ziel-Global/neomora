import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useParticipantSession } from '@/contexts/ParticipantSessionContext';
import { Link } from 'react-router-dom';
import {
    invitationStore,
    registrationStore,
    travelStore,
    accommodationStore,
} from '@/lib/emsStore';
import {
    Mail,
    FileText,
    Plane,
    Hotel,
    BadgeCheck,
    ArrowRight
} from 'lucide-react';

const Dashboard: React.FC = () => {
    const { participant } = useParticipantSession();
    const [stats, setStats] = useState({
        invitations: 0,
        acceptedInvitations: 0,
        registrations: 0,
        approvedRegistrations: 0,
        travelStatus: 'Not Required',
        accommodationStatus: 'Not Allocated'
    });

    useEffect(() => {
        if (participant) {
            const invs = invitationStore.getAll().filter(i => i.participantId === participant.id);
            const regs = registrationStore.getAll().filter(r => r.participantId === participant.id);
            const travel = travelStore.getByParticipant(participant.id);
            const accom = accommodationStore.getByParticipant(participant.id);

            setStats({
                invitations: invs.length,
                acceptedInvitations: invs.filter(i => i.status === 'Accepted').length,
                registrations: regs.length,
                approvedRegistrations: regs.filter(r => r.status === 'Approved').length,
                travelStatus: travel.length > 0 ? travel[0].status :
                    (regs.some(r => r.formData.needsTransport) ? 'Requested' : 'Not Required'),
                accommodationStatus: accom ? accom.status : 'Not Allocated'
            });
        }
    }, [participant]);

    if (!participant) return null;

    const journeyItems = [
        {
            label: 'Invitation',
            value: stats.invitations > 0 ? (stats.acceptedInvitations > 0 ? 'Accepted' : 'Pending') : 'None',
            icon: Mail,
            complete: stats.acceptedInvitations > 0,
            link: '/portal/invitations'
        },
        {
            label: 'Registration',
            value: stats.registrations > 0 ? (stats.approvedRegistrations > 0 ? 'Approved' : 'Submitted') : 'Not Started',
            icon: FileText,
            complete: stats.approvedRegistrations > 0,
            link: '/portal/registrations'
        },
        {
            label: 'Travel',
            value: stats.travelStatus,
            icon: Plane,
            complete: stats.travelStatus === 'Ticketed',
            link: '/portal/travel'
        },
        {
            label: 'Accommodation',
            value: stats.accommodationStatus,
            icon: Hotel,
            complete: ['Confirmed', 'Checked-In'].includes(stats.accommodationStatus),
            link: '/portal/accommodation'
        },
        {
            label: 'Badge',
            value: stats.approvedRegistrations > 0 ? 'Ready' : 'Pending',
            icon: BadgeCheck,
            complete: stats.approvedRegistrations > 0,
            link: '/portal/profile'
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">Welcome, {participant.firstName}</h1>
                <p className="text-muted-foreground">Here is the current status of your event journey.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Your Journey Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        {journeyItems.map((item) => (
                            <Link to={item.link} key={item.label} className="block transition-transform hover:scale-105">
                                <div
                                    className={`p-4 rounded-lg border h-full flex flex-col justify-between ${item.complete
                                        ? 'bg-green-50/50 border-green-200'
                                        : 'bg-amber-50/50 border-amber-200'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <item.icon className={`h-5 w-5 ${item.complete ? 'text-green-600' : 'text-amber-600'}`} />
                                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-50" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">{item.label}</p>
                                        <p className="font-medium text-sm truncate" title={item.value}>{item.value}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Additional dashboard widgets could go here */}
        </div>
    );
};

export default Dashboard;
