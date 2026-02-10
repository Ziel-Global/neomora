import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Plane,
  Calendar,
  Clock,
  MapPin,
  Luggage,
  User,
  QrCode,
  ArrowRight,
  Ticket,
  Building2,
  Crown,
} from 'lucide-react';
import { EMSTravelBooking } from '@/lib/emsStore';

interface TravelItineraryCardProps {
  booking: EMSTravelBooking;
  passengerName: string;
  isVIP?: boolean;
}

export const TravelItineraryCard: React.FC<TravelItineraryCardProps> = ({
  booking,
  passengerName,
  isVIP = false,
}) => {
  const formatDate = (dateTime: string) => {
    const date = new Date(dateTime.replace(' ', 'T'));
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateTime: string) => {
    const timePart = dateTime.split(' ')[1];
    if (!timePart) return '--:--';
    return timePart;
  };

  return (
    <Card className={`overflow-hidden ${isVIP ? 'border-amber-500/50 shadow-lg shadow-amber-500/10' : 'border-border'}`}>
      {/* Premium Header */}
      <div className={`relative p-6 ${isVIP 
        ? 'bg-gradient-to-br from-amber-600 via-amber-500 to-yellow-500' 
        : 'bg-gradient-to-br from-primary via-primary/90 to-accent'}`}
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
              <Plane className="h-8 w-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold text-white">Travel Itinerary</h3>
                {isVIP && (
                  <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                    <Crown className="h-3 w-3 mr-1" />
                    VIP
                  </Badge>
                )}
              </div>
              <p className="text-white/80 text-sm">{booking.airline}</p>
            </div>
          </div>
          
          {/* QR Code placeholder */}
          <div className="h-16 w-16 rounded-lg bg-white p-2 shadow-lg">
            <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/40 rounded flex items-center justify-center">
              <QrCode className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        {/* Passenger Info */}
        <div className="relative mt-6 p-4 rounded-lg bg-white/10 backdrop-blur-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-white">
            <div>
              <p className="text-xs text-white/60 uppercase tracking-wide">Passenger</p>
              <p className="font-semibold text-sm mt-0.5" dir="auto">{passengerName}</p>
            </div>
            <div>
              <p className="text-xs text-white/60 uppercase tracking-wide">PNR</p>
              <p className="font-mono font-bold text-sm mt-0.5">{booking.pnr || 'Pending'}</p>
            </div>
            <div>
              <p className="text-xs text-white/60 uppercase tracking-wide">Ticket No.</p>
              <p className="font-mono text-sm mt-0.5">{booking.ticketNumber || 'Pending'}</p>
            </div>
            <div>
              <p className="text-xs text-white/60 uppercase tracking-wide">Seat</p>
              <p className="font-semibold text-sm mt-0.5">{booking.seatNumber || 'TBA'}</p>
            </div>
          </div>
        </div>
      </div>

      <CardContent className="p-0">
        {/* Flight Segments */}
        <div className="divide-y divide-border">
          {booking.itinerary.map((flight, index) => (
            <div key={index} className="p-6">
              {/* Flight Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    index === 0 
                      ? 'bg-status-success-bg text-status-success' 
                      : 'bg-status-info-bg text-status-info'
                  }`}>
                    <Plane className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      {index === 0 ? 'Outbound Flight' : 'Return Flight'}
                    </p>
                    <p className="font-mono font-semibold text-sm">{flight.flightNumber}</p>
                  </div>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {formatDate(flight.departAt)}
                </Badge>
              </div>

              {/* Route Display */}
              <div className="flex items-center gap-4">
                {/* Departure */}
                <div className="flex-1 text-center">
                  <div className="h-16 w-16 mx-auto rounded-xl bg-muted flex items-center justify-center mb-2">
                    <span className="text-2xl font-bold text-foreground">{flight.from}</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{formatTime(flight.departAt)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Departure</p>
                </div>

                {/* Flight Path */}
                <div className="flex-1 flex items-center justify-center relative py-4">
                  <div className="absolute inset-x-4 top-1/2 h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20 -translate-y-1/2" />
                  <div className="relative bg-background px-2">
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                      <Plane className="h-5 w-5 text-primary-foreground rotate-90" />
                    </div>
                  </div>
                </div>

                {/* Arrival */}
                <div className="flex-1 text-center">
                  <div className="h-16 w-16 mx-auto rounded-xl bg-muted flex items-center justify-center mb-2">
                    <span className="text-2xl font-bold text-foreground">{flight.to}</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{formatTime(flight.arriveAt)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Arrival</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Info */}
        <div className="p-6 bg-muted/30 border-t border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Class</p>
                <p className="font-medium text-sm">{booking.cabinClass || 'Economy'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Luggage className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Baggage</p>
                <p className="font-medium text-sm">{booking.baggageAllowance || '23 kg'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Origin</p>
                <p className="font-medium text-sm truncate" dir="auto">{booking.originCity}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-status-success/10 flex items-center justify-center">
                <Ticket className="h-4 w-4 text-status-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-medium text-sm text-status-success">{booking.status}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
