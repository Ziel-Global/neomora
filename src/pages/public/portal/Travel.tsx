import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useParticipantSession } from '@/contexts/ParticipantSessionContext';
import { travelStore, registrationStore, visaStore } from '@/lib/emsStore';
import { TravelPreferencesForm, TravelPreferences } from '@/components/travel/TravelPreferencesForm';
import { TravelItineraryCard } from '@/components/travel/TravelItineraryCard';
import { Plane, Send, CheckCircle2, AlertCircle, Clock, ShieldAlert, Eye, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EMSTravelBooking } from '@/lib/emsStore';

const Travel: React.FC = () => {
    const { participant } = useParticipantSession();
    const [travelBookings, setTravelBookings] = useState<EMSTravelBooking[]>([]);
    const [canSubmitRequest, setCanSubmitRequest] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [visaBlocker, setVisaBlocker] = useState<string | null>(null);
    const [selectedBooking, setSelectedBooking] = useState<EMSTravelBooking | null>(null);

    const loadData = () => {
        if (participant) {
            const bookings = travelStore.getByParticipant(participant.id);
            setTravelBookings(bookings);

            const registrations = registrationStore.getAll().filter(r => r.participantId === participant.id);
            const approvedReg = registrations.find(r => r.status === 'Approved');

            // Check Visa Status
            const visaApp = visaStore.checkRequirement(participant.id);
            const isVisaRequired = visaApp.status !== 'Not Required';
            const isVisaApproved = visaApp.status === 'Approved';

            if (isVisaRequired && !isVisaApproved) {
                setVisaBlocker(visaApp.status);
            } else {
                setVisaBlocker(null);
            }

            const needsTransport = approvedReg?.formData.needsTransport;
            setCanSubmitRequest(!!approvedReg && !!needsTransport && bookings.length === 0 && (!isVisaRequired || isVisaApproved));
        }
    };

    useEffect(() => {
        loadData();
    }, [participant]);

    const handleSubmit = (preferences: TravelPreferences) => {
        if (!participant) return;

        const registrations = registrationStore.getAll().filter(r => r.participantId === participant.id);
        const approvedReg = registrations.find(r => r.status === 'Approved');

        if (!approvedReg) {
            toast.error('You need an approved registration to submit travel preferences');
            return;
        }

        setIsSubmitting(true);
        try {
            const booking = travelStore.createRequest(
                participant.id,
                approvedReg.id,
                preferences
            );

            if (booking) {
                toast.success('Travel request submitted successfully!');
                loadData();
            }
        } catch (error) {
            toast.error('Failed to submit travel request');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!participant) return null;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">Travel & Flights</h1>
                <p className="text-muted-foreground">Manage your flight bookings and travel preferences.</p>
            </div>

            {travelBookings.length === 0 && !canSubmitRequest && (
                <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                        <Plane className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>You currently do not have any travel bookings or pending requests.</p>
                        <p className="text-sm mt-2">If you require travel assistance, please ensure you have requested it in your registration.</p>
                    </CardContent>
                </Card>
            )}

            {/* Visa Blocker Message */}
            {visaBlocker && travelBookings.length === 0 && (
                <Alert variant="destructive" className="border-amber-200 bg-amber-50 text-amber-900">
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                    <AlertDescription>
                        <strong>Travel Request Locked:</strong> Your visa application status is currently <strong>{visaBlocker}</strong>.
                        You must have an <strong>Approved</strong> visa before you can request flight bookings.
                        Please check the <a href="/portal/visa" className="underline font-medium hover:text-amber-700">Visa & Documents</a> section.
                    </AlertDescription>
                </Alert>
            )}

            {/* Request Form */}
            {canSubmitRequest && (
                <div className="space-y-4">
                    <Alert>
                        <Send className="h-4 w-4" />
                        <AlertDescription>
                            Your registration is approved! Please submit your travel preferences below so we can book your flights.
                        </AlertDescription>
                    </Alert>
                    <TravelPreferencesForm
                        onSubmit={handleSubmit}
                        isSubmitting={isSubmitting}
                        participantRole={participant.role}
                    />
                </div>
            )}

            {/* Booking List */}
            {travelBookings.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Ticket className="h-5 w-5 text-primary" />
                            My Flight Bookings
                        </CardTitle>
                        <CardDescription>
                            {travelBookings.length} booking(s) found
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border">
                            {travelBookings.map((booking) => (
                                <div
                                    key={booking.id}
                                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Plane className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-medium">
                                                {booking.originCity} → Event Venue
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {booking.preferredDepartureDate} - {booking.preferredReturnDate}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <StatusBadge status={booking.status} />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSelectedBooking(booking)}
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

            {/* Booking Detail Dialog */}
            <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plane className="h-5 w-5 text-primary" />
                            Booking Details
                        </DialogTitle>
                    </DialogHeader>

                    {selectedBooking && (
                        <div className="space-y-4">
                            {/* Status Card for non-ticketed */}
                            {selectedBooking.status !== 'Ticketed' && (
                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium">Request Status</span>
                                            <StatusBadge status={selectedBooking.status} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-muted-foreground">From:</span>
                                                <p className="font-medium">{selectedBooking.originCity}</p>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Dates:</span>
                                                <p className="font-medium">{selectedBooking.preferredDepartureDate} - {selectedBooking.preferredReturnDate}</p>
                                            </div>
                                        </div>

                                        {selectedBooking.status === 'Requested' && (
                                            <Alert>
                                                <Clock className="h-4 w-4" />
                                                <AlertDescription>
                                                    Your travel request is being reviewed. You will be notified once it's approved and flights are booked.
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        {selectedBooking.status === 'Approved' && (
                                            <Alert className="border-green-200 bg-green-50">
                                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                <AlertDescription className="text-green-800">
                                                    Your travel request has been approved! Our team is booking your flights. You'll receive your itinerary soon.
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        {selectedBooking.status === 'Rejected' && (
                                            <Alert variant="destructive">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>
                                                    {selectedBooking.rejectionReason || 'Your travel request was not approved. Please contact support.'}
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Full Itinerary Card for ticketed */}
                            {selectedBooking.status === 'Ticketed' && (
                                <TravelItineraryCard
                                    booking={selectedBooking}
                                    passengerName={`${participant.firstName} ${participant.lastName}`}
                                    isVIP={participant.role === 'VVIP' || participant.role === 'VIP'}
                                />
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Travel;
