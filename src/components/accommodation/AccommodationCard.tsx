import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Hotel,
    Calendar,
    MapPin,
    CheckCircle2,
    Info,
    Building2,
    Key,
    DoorOpen,
} from 'lucide-react';
import { EMSAccommodation } from '@/lib/emsStore';

interface AccommodationCardProps {
    accommodation: EMSAccommodation;
    isVIP?: boolean;
}

export const AccommodationCard: React.FC<AccommodationCardProps> = ({
    accommodation,
    isVIP = false,
}) => {
    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <Card className={`overflow-hidden ${isVIP ? 'border-amber-500/50 shadow-lg shadow-amber-500/10' : 'border-border'}`}>
            {/* Premium Header */}
            <div className={`relative p-6 ${isVIP
                ? 'bg-gradient-to-br from-amber-600 via-amber-500 to-yellow-500'
                : 'bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500'}`}
            >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }} />
                </div>

                <div className="relative flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Hotel className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-xl font-bold text-white">Accommodation Details</h3>
                                {accommodation.status === 'Confirmed' && (
                                    <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Confirmed
                                    </Badge>
                                )}
                            </div>
                            <p className="text-white/80 text-sm">{accommodation.hotelName}</p>
                        </div>
                    </div>
                </div>

                {/* Accommodation Info Summary */}
                <div className="relative mt-6 p-4 rounded-lg bg-white/10 backdrop-blur-sm">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-white">
                        <div>
                            <p className="text-xs text-white/60 uppercase tracking-wide">Confirmation No.</p>
                            <p className="font-mono font-bold text-sm mt-0.5">{accommodation.confirmationNumber || 'Pending'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-white/60 uppercase tracking-wide">Room Type</p>
                            <p className="font-semibold text-sm mt-0.5">{accommodation.roomType}</p>
                        </div>
                        <div>
                            <p className="text-xs text-white/60 uppercase tracking-wide">Room No.</p>
                            <p className="font-mono text-sm mt-0.5">{accommodation.roomNumber || 'TBA'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-white/60 uppercase tracking-wide">Status</p>
                            <p className="font-semibold text-sm mt-0.5">{accommodation.status}</p>
                        </div>
                    </div>
                </div>
            </div>

            <CardContent className="p-0">
                {/* Stay Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                <Calendar className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Check-in</p>
                                <p className="font-semibold">{formatDate(accommodation.checkIn)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground ml-11">
                            <Info className="h-3 w-3" />
                            <span>After 2:00 PM</span>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-8 w-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                                <Calendar className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Check-out</p>
                                <p className="font-semibold">{formatDate(accommodation.checkOut)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground ml-11">
                            <Info className="h-3 w-3" />
                            <span>Before 12:00 PM</span>
                        </div>
                    </div>
                </div>

                {/* Location & Instructions */}
                <div className="p-6 bg-muted/30 border-t border-border space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="font-semibold text-sm">Hotel Address</p>
                            <p className="text-sm text-muted-foreground mt-1" dir="auto">
                                {accommodation.hotelAddress || 'Address details will be provided at check-in.'}
                            </p>
                        </div>
                    </div>

                    {accommodation.instructions && (
                        <div className="flex items-start gap-4">
                            <div className="h-10 w-10 rounded-lg bg-status-info-bg flex items-center justify-center flex-shrink-0">
                                <Info className="h-5 w-5 text-status-info" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm">Important Instructions</p>
                                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line" dir="auto">
                                    {accommodation.instructions}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
