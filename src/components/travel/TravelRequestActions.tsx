import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, X, Plane, Ticket } from 'lucide-react';
import { EMSTravelBooking, EMSParticipant, visaStore } from '@/lib/emsStore';

interface TravelRequestActionsProps {
  booking: EMSTravelBooking;
  participant: EMSParticipant | undefined;
  onApprove: (bookingId: string, comments?: string) => void;
  onReject: (bookingId: string, reason: string) => void;
  onBookFlight: (bookingId: string, flightDetails: FlightDetails) => void;
}

export interface FlightDetails {
  airline: string;
  flightNumber: string;
  from: string;
  to: string;
  departureDate: string;
  departureTime: string;
  arrivalTime: string;
  returnFlightNumber: string;
  returnDepartureDate: string;
  returnDepartureTime: string;
  returnArrivalTime: string;
  cabinClass: 'Economy' | 'Business' | 'First';
  seatNumber: string;
}

const airlines = [
  'Emirates',
  'Qatar Airways',
  'Etihad Airways',
  'Saudia',
  'Gulf Air',
  'Oman Air',
  'Kuwait Airways',
  'Royal Jordanian',
  'EgyptAir',
  'Middle East Airlines',
  'British Airways',
  'Lufthansa',
];

export const TravelRequestActions: React.FC<TravelRequestActionsProps> = ({
  booking,
  participant,
  onApprove,
  onReject,
  onBookFlight,
}) => {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [bookFlightOpen, setBookFlightOpen] = useState(false);
  const [comments, setComments] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [flightDetails, setFlightDetails] = useState<FlightDetails>({
    airline: 'Emirates',
    flightNumber: '',
    from: booking.originCity || '',
    to: 'DXB',
    departureDate: booking.preferredDepartureDate || '',
    departureTime: '08:00',
    arrivalTime: '14:30',
    returnFlightNumber: '',
    returnDepartureDate: booking.preferredReturnDate || '',
    returnDepartureTime: '22:00',
    returnArrivalTime: '04:30',
    cabinClass: participant?.role === 'VVIP' || participant?.role === 'VIP' ? 'Business' : 'Economy',
    seatNumber: '',
  });

  const handleApprove = () => {
    onApprove(booking.id, comments);
    setApproveOpen(false);
    setComments('');
  };

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    onReject(booking.id, rejectReason);
    setRejectOpen(false);
    setRejectReason('');
  };

  const handleBookFlight = () => {
    onBookFlight(booking.id, flightDetails);
    setBookFlightOpen(false);
  };

  // Show appropriate actions based on status
  if (booking.status === 'Ticketed') {
    return null;
  }

  // Check visa status
  const visaApp = participant ? visaStore.getByParticipant(participant.id) : null;
  const isVisaApproved = !visaApp || visaApp.status === 'Approved' || visaApp.status === 'Not Required';

  return (
    <>
      <div className="flex gap-1">
        {booking.status === 'Requested' && (
          <>
            {isVisaApproved ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-status-success hover:text-status-success hover:bg-status-success-bg"
                onClick={() => setApproveOpen(true)}
                title="Approve Request"
              >
                <Check className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground opacity-50 cursor-not-allowed"
                title={`Cannot approve: Visa status is ${visaApp?.status}`}
                disabled
              >
                <Check className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setRejectOpen(true)}
              title="Reject Request"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
        {booking.status === 'Approved' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBookFlightOpen(true)}
          >
            <Ticket className="h-4 w-4 mr-1" />
            Book Flight
          </Button>
        )}
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Travel Request</DialogTitle>
            <DialogDescription>
              Approve travel request for {participant?.firstName} {participant?.lastName} from {booking.originCity}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Comments (Optional)</Label>
              <Textarea
                placeholder="Add any notes or comments..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} className="bg-status-success hover:bg-status-success/90">
              <Check className="h-4 w-4 mr-2" />
              Approve Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Travel Request</DialogTitle>
            <DialogDescription>
              Reject travel request for {participant?.firstName} {participant?.lastName}. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason for Rejection *</Label>
              <Textarea
                placeholder="Please explain why this request is being rejected..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim()}
            >
              <X className="h-4 w-4 mr-2" />
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Book Flight Dialog */}
      <Dialog open={bookFlightOpen} onOpenChange={setBookFlightOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Book Flight
            </DialogTitle>
            <DialogDescription>
              Enter flight details for {participant?.firstName} {participant?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
            {/* Airline & Class */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Airline *</Label>
                <Select
                  value={flightDetails.airline}
                  onValueChange={(value) => setFlightDetails({ ...flightDetails, airline: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {airlines.map((airline) => (
                      <SelectItem key={airline} value={airline}>
                        {airline}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cabin Class</Label>
                <Select
                  value={flightDetails.cabinClass}
                  onValueChange={(value: FlightDetails['cabinClass']) =>
                    setFlightDetails({ ...flightDetails, cabinClass: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Economy">Economy</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                    <SelectItem value="First">First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Outbound Flight */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Outbound Flight</h4>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Flight Number *</Label>
                  <Input
                    placeholder="EK123"
                    value={flightDetails.flightNumber}
                    onChange={(e) => setFlightDetails({ ...flightDetails, flightNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>From</Label>
                  <Input
                    value={flightDetails.from}
                    onChange={(e) => setFlightDetails({ ...flightDetails, from: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Input
                    value={flightDetails.to}
                    onChange={(e) => setFlightDetails({ ...flightDetails, to: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Departure Date *</Label>
                  <Input
                    type="date"
                    value={flightDetails.departureDate}
                    onChange={(e) => setFlightDetails({ ...flightDetails, departureDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Departure Time</Label>
                  <Input
                    type="time"
                    value={flightDetails.departureTime}
                    onChange={(e) => setFlightDetails({ ...flightDetails, departureTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Arrival Time</Label>
                  <Input
                    type="time"
                    value={flightDetails.arrivalTime}
                    onChange={(e) => setFlightDetails({ ...flightDetails, arrivalTime: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Return Flight */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Return Flight</h4>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Flight Number *</Label>
                  <Input
                    placeholder="EK456"
                    value={flightDetails.returnFlightNumber}
                    onChange={(e) => setFlightDetails({ ...flightDetails, returnFlightNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Departure Date *</Label>
                  <Input
                    type="date"
                    value={flightDetails.returnDepartureDate}
                    onChange={(e) => setFlightDetails({ ...flightDetails, returnDepartureDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Seat Number</Label>
                  <Input
                    placeholder="12A"
                    value={flightDetails.seatNumber}
                    onChange={(e) => setFlightDetails({ ...flightDetails, seatNumber: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookFlightOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBookFlight}
              disabled={!flightDetails.flightNumber || !flightDetails.departureDate}
            >
              <Ticket className="h-4 w-4 mr-2" />
              Book & Issue Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TravelRequestActions;
