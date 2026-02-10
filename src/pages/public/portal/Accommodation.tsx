import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useParticipantSession } from '@/contexts/ParticipantSessionContext';
import { accommodationStore, EMSAccommodation, visaStore, travelStore } from '@/lib/emsStore';
import { AccommodationCard } from '@/components/accommodation/AccommodationCard';
import { Hotel, AlertCircle, Eye, Calendar, Building2 } from 'lucide-react';
import { StatusBadge } from '@/components/common/StatusBadge';

const Accommodation: React.FC = () => {
    const { participant } = useParticipantSession();
    const [accommodations, setAccommodations] = useState<EMSAccommodation[]>([]);
    const [visaStatus, setVisaStatus] = useState<any>(null);
    const [travelStatus, setTravelStatus] = useState<any>(null);
    const [selectedAccommodation, setSelectedAccommodation] = useState<EMSAccommodation | null>(null);

    useEffect(() => {
        if (participant) {
            // Get all accommodations for this participant (could be multiple events)
            const allAccommodations = accommodationStore.getAll().filter(a => a.participantId === participant.id);
            setAccommodations(allAccommodations);

            // Check Visa Status
            const visa = visaStore.getByParticipant(participant.id);
            setVisaStatus(visa ? visa.status : 'Pending Docs');

            // Check Travel Status
            const travel = travelStore.getByParticipant(participant.id)[0];
            setTravelStatus(travel ? travel.status : 'Not Requested');
        }
    }, [participant]);

    if (!participant) return null;

    // 1. Visa Gating
    const isVisaRequired = visaStatus && visaStatus !== 'Not Required' && visaStatus !== 'Approved';
    if (isVisaRequired) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2">My Accommodation</h1>
                    <p className="text-muted-foreground">Details of your hotel allocation during the event.</p>
                </div>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Visa Action Required</AlertTitle>
                    <AlertDescription>
                        Accommodation allocation is placed on hold until your Visa application is approved.
                        Please complete your <Link to="/portal/visa" className="underline font-bold">Visa tasks</Link> first.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // 2. Travel Gating
    const isTravelPending = !travelStatus || (travelStatus !== 'Ticketed' && travelStatus !== 'Approved');

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">My Accommodation</h1>
                <p className="text-muted-foreground">Details of your hotel allocation during the event.</p>
            </div>

            {isTravelPending && accommodations.length === 0 && (
                <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800 mb-6">
                    <AlertCircle className="h-4 w-4 text-yellow-800" />
                    <AlertTitle>Travel Confirmation Pending</AlertTitle>
                    <AlertDescription>
                        Your accommodation dates will be finalized based on your flight itinerary.
                        Please ensure your <Link to="/portal/travel" className="underline font-bold">Travel & Flights</Link> are confirmed.
                    </AlertDescription>
                </Alert>
            )}

            {accommodations.length === 0 && (
                <Card>
                    <CardContent className="pt-10 pb-10 text-center text-muted-foreground">
                        <Hotel className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium">No Accommodation Allocated Yet</p>
                        <p className="text-sm mt-2 max-w-md mx-auto">
                            {isTravelPending
                                ? "Waiting for travel confirmation to determine your check-in/out dates."
                                : "Your accommodation is being processed by our team."}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Accommodation List */}
            {accommodations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-primary" />
                            My Accommodation Allocations
                        </CardTitle>
                        <CardDescription>
                            {accommodations.length} allocation(s) found
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border">
                            {accommodations.map((accommodation) => (
                                <div
                                    key={accommodation.id}
                                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                            <Hotel className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium">{accommodation.hotelName}</p>
                                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {formatDate(accommodation.checkIn)} - {formatDate(accommodation.checkOut)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <StatusBadge status={accommodation.status} />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSelectedAccommodation(accommodation)}
                                        >
                                            <Eye className="h-4 w-4 mr-1" />
                                            View
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Accommodation Detail Dialog */}
            <Dialog open={!!selectedAccommodation} onOpenChange={() => setSelectedAccommodation(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
                    <DialogHeader className="p-6 pb-0">
                        <DialogTitle className="flex items-center gap-2">
                            <Hotel className="h-5 w-5 text-primary" />
                            Accommodation Details
                        </DialogTitle>
                    </DialogHeader>

                    {selectedAccommodation && (
                        <div className="p-6 pt-4">
                            <AccommodationCard
                                accommodation={selectedAccommodation}
                                isVIP={participant.role === 'VVIP' || participant.role === 'VIP'}
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Accommodation;
