import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { transportTripStore, vehicleStore, transportRouteStore, EMSTransportTrip } from '@/lib/emsStore';
import { accessZoneDefinitions, collectionPoints } from '@/data/accreditationData';
import { MapPin, Calendar, Clock, Car } from 'lucide-react';
import { toast } from 'sonner';

interface TravelBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    participantId: string;
    allowedZones: string[];
    hotelName?: string; // Participant's hotel
}

export const TravelBookingModal: React.FC<TravelBookingModalProps> = ({
    isOpen,
    onClose,
    participantId,
    allowedZones,
    hotelName
}) => {
    const [formData, setFormData] = useState({
        pickupType: 'hotel', // 'hotel', 'venue', 'custom'
        pickupLocation: hotelName || '',
        dropoffLocation: '',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        passengers: 1,
        notes: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter allowed destinations based on zone access
    // 'all' in allowedZones means access to everything
    const hasAllAccess = allowedZones.includes('all');

    const allowedVenues = accessZoneDefinitions.filter(zone =>
        hasAllAccess || allowedZones.includes(zone.code) || !zone.isRestricted
    );

    // Combine venues and collection points as potential destinations
    const destinations = [
        { type: 'Venue', items: allowedVenues.map(v => ({ id: v.id, name: v.name })) },
        // Also allow going back to hotel
        { type: 'Accommodation', items: hotelName ? [{ id: 'my-hotel', name: `${hotelName} (My Hotel)` }] : [] }
    ];

    /* 
      Simplified logic:
      - If pickup is Hotel, Dropoff can be any allowed Venue.
      - If pickup is Venue, Dropoff can be Hotel or another allowed Venue.
    */

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Basic validation
            if (!formData.pickupLocation || !formData.dropoffLocation) {
                toast.error('Please specify both pickup and dropoff locations');
                setIsSubmitting(false);
                return;
            }

            // Create trip record
            // We can check if a route exists or create an ad-hoc one
            // For on-demand, we often just want to record the request.
            // We'll create a "Planned" trip with 'On-Demand' type.

            const newTrip: Omit<EMSTransportTrip, 'id' | 'createdAt' | 'updatedAt'> = {
                routeId: 'adhoc-' + Date.now(),
                routeName: 'On-Demand Request',
                type: 'On-Demand' as any, // casting as 'On-Demand' might not be in the strict type yet, we'll see or use 'Hotel-Venue Shuttle'
                date: formData.date,
                pickupTime: formData.time,
                estimatedArrival: '', // Unknown yet
                vehicleId: null,
                vehicleType: 'Sedan', // Default request
                vehiclePlate: null,
                driverName: null,
                driverPhone: null,
                capacity: 3,
                participantIds: [participantId],
                status: 'Planned',
                pickupLocation: formData.pickupLocation,
                dropoffLocation: formData.dropoffLocation,
                priority: 50, // Standard priority
                noShows: [],
                notes: formData.notes
            };

            // We need to extend the type if 'On-Demand' isn't valid, let's check lib/emsStore.ts
            // The types allowed might be limited. transportTripStore uses TransportTripType.
            // Let's assume 'Hotel-Venue Shuttle' is safe or just cast it if we want to distinguish.
            // Actually, let's check the store file content I read earlier.
            // types seen: 'Airport Pickup', 'Airport Dropoff', 'Hotel-Venue Shuttle'. 
            // I'll reuse 'Hotel-Venue Shuttle' or just 'Other' if I can.
            // Let's use 'Hotel-Venue Shuttle' for now as it's the closest generic.

            newTrip.type = 'Hotel-Venue Shuttle';

            transportTripStore.create(newTrip);

            toast.success('Transport request submitted successfully');
            onClose();
        } catch (error) {
            console.error('Booking error:', error);
            toast.error('Failed to book transport');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Book Transportation</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">

                    {/* Pickup */}
                    <div className="space-y-2">
                        <Label>Pickup Location</Label>
                        <div className="flex gap-2">
                            <Select
                                value={formData.pickupType}
                                onValueChange={(val) => setFormData({ ...formData, pickupType: val, pickupLocation: val === 'hotel' ? (hotelName || '') : '' })}
                            >
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hotel">My Hotel</SelectItem>
                                    <SelectItem value="venue">Venue</SelectItem>
                                    <SelectItem value="custom">Other</SelectItem>
                                </SelectContent>
                            </Select>

                            {formData.pickupType === 'hotel' ? (
                                <Input value={hotelName || 'No Hotel Assigned'} disabled className="flex-1" />
                            ) : formData.pickupType === 'venue' ? (
                                <Select
                                    value={formData.pickupLocation}
                                    onValueChange={(val) => setFormData({ ...formData, pickupLocation: val })}
                                >
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Select Venue" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allowedVenues.map(venue => (
                                            <SelectItem key={venue.id} value={venue.name}>{venue.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input
                                    placeholder="Enter pickup location"
                                    value={formData.pickupLocation}
                                    onChange={e => setFormData({ ...formData, pickupLocation: e.target.value })}
                                    className="flex-1"
                                />
                            )}
                        </div>
                    </div>

                    {/* Dropoff */}
                    <div className="space-y-2">
                        <Label>Dropoff Location</Label>
                        <Select
                            value={formData.dropoffLocation}
                            onValueChange={(val) => setFormData({ ...formData, dropoffLocation: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Destination" />
                            </SelectTrigger>
                            <SelectContent>
                                {destinations.map(group => (
                                    group.items.length > 0 && (
                                        <React.Fragment key={group.type}>
                                            <SelectItem value={`header-${group.type}`} disabled className="font-semibold text-muted-foreground opacity-100 pl-2">
                                                {group.type}
                                            </SelectItem>
                                            {group.items.map(item => (
                                                <SelectItem key={item.id} value={item.name} className="pl-6">
                                                    {item.name}
                                                </SelectItem>
                                            ))}
                                        </React.Fragment>
                                    )
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="date"
                                    className="pl-9"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Time</Label>
                            <div className="relative">
                                <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="time"
                                    className="pl-9"
                                    value={formData.time}
                                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Notes (Optional)</Label>
                        <Textarea
                            placeholder="Any special requirements? e.g. Wheelchair access"
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                </form>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Booking...' : 'Book Ride'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
