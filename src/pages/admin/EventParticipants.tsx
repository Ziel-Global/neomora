import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, Column } from '@/components/common/DataTable';
import { EMSParticipant } from '@/lib/emsStore';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Loader2, Plus, Download, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getEvents } from '@/api/eventApi';
import { getEventParticipants } from '@/api/registrationApi';
const EventParticipantsPage: React.FC = () => {
    const { t } = useTranslation();
    const { eventId } = useParams<{ eventId: string }>();
    const [isLoading, setIsLoading] = useState(true);
    const [participants, setParticipants] = useState<EMSParticipant[]>([]);
    const [eventName, setEventName] = useState<string>('');

    useEffect(() => {
        const loadEventData = async () => {
            setIsLoading(true);
            try {
                // Fetch event details to get the name
                const events = await getEvents();
                const event = events.find((e: any) => e.id === eventId || e._id === eventId);
                if (event) {
                    setEventName(event.name);
                }

                // Fetch participants for this event
                if (eventId) {
                    const eventParticipants = await getEventParticipants(eventId);
                    setParticipants(eventParticipants);
                } else {
                    setParticipants([]);
                }
            } catch (error) {
                console.error('Failed to load event participants data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadEventData();
    }, [eventId]);

    const columns: Column<EMSParticipant>[] = [
        {
            key: 'name',
            header: t('common.participant'),
            accessor: (row: any) => row.participantId ? `${row.participantId.firstName || ''} ${row.participantId.lastName || ''}`.trim() : (row.firstName ? `${row.firstName} ${row.lastName}` : 'Unknown'),
        },
        {
            key: 'organization',
            header: t('participants.organization'),
            accessor: (row: any) => row.participantId?.organization || row.organization || '-',
        },
        {
            key: 'role',
            header: t('participants.role'),
            accessor: (row: any) => row.participantId?.role || row.role || '-',
        },
        {
            key: 'status',
            header: t('common.status'),
            accessor: (row: any) => row.status || 'Draft',
        }
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader
                title={t('participants.title')}
                subtitle={eventName ? `Managing participants for ${eventName}` : `Management for Event ID: ${eventId}`}
                breadcrumbs={[
                    { label: t('events.title'), href: '/admin/events' },
                    // { label: eventName || t('common.event'), href: `/admin/events/${eventId}` },
                    { label: t('participants.title') }
                ]}
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 me-2" />
                            {t('common.export')}
                        </Button>
                        {/* <Button size="sm">
                            <Plus className="h-4 w-4 me-2" />
                            {t('participants.add_participant')}
                        </Button> */}
                    </div>
                }
            />

            {isLoading ? (
                <div className="flex flex-col items-center justify-center p-24 text-muted-foreground">
                    <Loader2 className="h-10 w-10 animate-spin mb-4" />
                    <p>Loading records...</p>
                </div>
            ) : participants.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="p-24 text-center">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                            <Users className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">{t('participants.no_participants')}</h3>
                        {/* <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                            {t('participants.no_participants_desc')}
                        </p> */}
                        {/* <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            {t('participants.add_participant')}
                        </Button> */}
                    </CardContent>
                </Card>
            ) : (
                <DataTable
                    data={participants}
                    columns={columns}
                    keyExtractor={(row: any) => row.id || row._id}
                    searchable
                    searchPlaceholder={t('participants.search_placeholder')}
                />
            )}
        </div>
    );
};

export default EventParticipantsPage;
