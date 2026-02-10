import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useParticipantSession } from '@/contexts/ParticipantSessionContext';
import {
  transportTripStore,
  accommodationStore,
  travelStore,
  hotelStore,
  EMSTransportTrip,
  getTransportPolicy
} from '@/lib/emsStore';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  Bus,
  MapPin,
  Clock,
  Calendar,
  User,
  Phone,
  Plane,
  Building2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Car,
  Hotel,
  Info
} from 'lucide-react';
import { TravelBookingModal } from '@/components/transport/TravelBookingModal';

const Transportation: React.FC = () => {
  const { participant } = useParticipantSession();
  const [trips, setTrips] = useState<EMSTransportTrip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<EMSTransportTrip | null>(null);
  const [eligibilityInfo, setEligibilityInfo] = useState<{
    eligible: boolean;
    reason: string;
    hasTicketedTravel: boolean;
    hasConfirmedAccommodation: boolean;
    travelDetails?: {
      arrivalDate: string;
      arrivalTime: string;
      departureDate: string;
      departureTime: string;
      arrivalFlightNumber: string;
      departureFlightNumber: string;
    };
    accommodationDetails?: {
      hotelName: string;
      checkIn: string;
      checkOut: string;
    };
  } | null>(null);

  const loadData = () => {
    if (participant) {
      const myTrips = transportTripStore.getByParticipant(participant.id);
      setTrips(myTrips);

      // Check eligibility with full details
      const eligibility = transportTripStore.checkEligibility(participant.id);
      setEligibilityInfo(eligibility);

      // Auto-generate if eligible but no trips exist
      if (eligibility.eligible && myTrips.length === 0) {
        transportTripStore.generateAirportTransfers(participant.id);
        setTrips(transportTripStore.getByParticipant(participant.id));
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [participant]);

  // Accreditation Check
  const [accreditationStatus, setAccreditationStatus] = useState<{
    status: 'Not Ready' | 'Ready' | 'Collected' | 'Active';
    badge: any;
    allowedZones: string[];
  }>({ status: 'Not Ready', badge: null, allowedZones: [] });

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  useEffect(() => {
    if (participant) {
      const badges = JSON.parse(localStorage.getItem('ems_accreditation_badges') || '[]');
      const profiles = JSON.parse(localStorage.getItem('ems_accreditation_profiles') || '[]');

      const profile = profiles.find((p: any) => p.participantId === participant.id);
      if (profile) {
        const badge = badges.find((b: any) => b.profileId === profile.id);
        if (badge) {
          let status: any = 'Not Ready';
          if (badge.distributionStatus === 'Activated') status = 'Active';
          else if (badge.distributionStatus === 'Collected') status = 'Collected';
          else if (badge.productionStatus === 'Ready') status = 'Ready';

          setAccreditationStatus({
            status,
            badge,
            allowedZones: badge.zoneAccess
          });
        }
      }
    }
  }, [participant]);


  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Completed': return 'success';
      case 'Active': return 'info';
      case 'Notified': return 'info';
      case 'Assigned': return 'warning';
      case 'Planned': return 'default';
      case 'Cancelled': return 'destructive';
      default: return 'default';
    }
  };

  const getTripIcon = (type: string) => {
    switch (type) {
      case 'Airport Pickup':
      case 'Airport Dropoff':
        return <Plane className="h-5 w-5" />;
      case 'Hotel-Venue Shuttle':
        return <Building2 className="h-5 w-5" />;
      default:
        return <Bus className="h-5 w-5" />;
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (!participant) return null;

  const policy = getTransportPolicy(participant.role);
  const upcomingTrips = trips.filter(t => ['Planned', 'Assigned', 'Notified'].includes(t.status));
  const activeTrips = trips.filter(t => t.status === 'Active');
  const completedTrips = trips.filter(t => t.status === 'Completed');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Transportation</h1>
        <p className="text-muted-foreground">View your scheduled pickups and transport arrangements.</p>
      </div>

      {/* Transport Policy Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Car className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Your Transport Entitlement</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Based on your role as <Badge variant="secondary">{participant.role}</Badge>,
                you are entitled to <strong>{policy.vehicleType}</strong> transport with priority level {policy.priority}.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Transport is automatically assigned based on your flight schedule and hotel. You will be grouped with other participants traveling at similar times.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Book a Ride - Action */}
      {(accreditationStatus.status === 'Collected' || accreditationStatus.status === 'Active') && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" />
                Book On-Demand Transport
              </h3>
              <p className="text-muted-foreground mt-1">
                Need a ride to a venue? Book a shuttle or car service instantly.
              </p>
            </div>
            <Button onClick={() => setIsBookingModalOpen(true)}>Book a Ride</Button>
          </CardContent>
        </Card>
      )}

      {/* Linked Data Summary */}
      {eligibilityInfo && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Travel Link */}
          <Card className={eligibilityInfo.hasTicketedTravel ? 'border-green-200' : 'border-amber-200'}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Plane className="h-4 w-4" />
                Flight Details
                {eligibilityInfo.hasTicketedTravel ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500 ml-auto" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eligibilityInfo.travelDetails ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Arrival:</span>
                    <span className="font-medium">{eligibilityInfo.travelDetails.arrivalDate} at {eligibilityInfo.travelDetails.arrivalTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Flight:</span>
                    <Badge variant="outline">{eligibilityInfo.travelDetails.arrivalFlightNumber}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Departure:</span>
                    <span className="font-medium">{eligibilityInfo.travelDetails.departureDate} at {eligibilityInfo.travelDetails.departureTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Flight:</span>
                    <Badge variant="outline">{eligibilityInfo.travelDetails.departureFlightNumber}</Badge>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your flight must be ticketed before transport can be arranged.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Accommodation Link */}
          <Card className={eligibilityInfo.hasConfirmedAccommodation ? 'border-green-200' : 'border-amber-200'}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Hotel className="h-4 w-4" />
                Accommodation
                {eligibilityInfo.hasConfirmedAccommodation ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500 ml-auto" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eligibilityInfo.accommodationDetails ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hotel:</span>
                    <span className="font-medium">{eligibilityInfo.accommodationDetails.hotelName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Check-in:</span>
                    <span>{eligibilityInfo.accommodationDetails.checkIn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Check-out:</span>
                    <span>{eligibilityInfo.accommodationDetails.checkOut}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You need a confirmed accommodation allocation for transport planning.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Not Eligible State */}
      {eligibilityInfo && !eligibilityInfo.eligible && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {eligibilityInfo.reason}
          </AlertDescription>
        </Alert>
      )}

      {/* No Trips State */}
      {eligibilityInfo?.eligible && trips.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Bus className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No transport has been scheduled yet.</p>
            <p className="text-sm mt-2">Airport transfers will be arranged based on your flight times.</p>
          </CardContent>
        </Card>
      )}

      {/* Active Trips - Most Important */}
      {activeTrips.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            In Progress
          </h2>
          {activeTrips.map(trip => (
            <Card key={trip.id} className="border-primary/50 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      {getTripIcon(trip.type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{trip.routeName}</h3>
                      <p className="text-muted-foreground">{trip.type}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {trip.pickupLocation}
                        </span>
                        <span>→</span>
                        <span>{trip.dropoffLocation}</span>
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={trip.status} variant="info" />
                </div>
                {trip.driverName && (
                  <div className="mt-4 p-3 bg-background rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{trip.driverName}</p>
                        <p className="text-sm text-muted-foreground">{trip.vehicleType} • {trip.vehiclePlate}</p>
                      </div>
                    </div>
                    <a href={`tel:${trip.driverPhone}`} className="flex items-center gap-1 text-primary">
                      <Phone className="h-4 w-4" />
                      {trip.driverPhone}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upcoming Trips */}
      {upcomingTrips.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Upcoming Transfers</h2>
          <div className="grid gap-4">
            {upcomingTrips.map(trip => (
              <Card key={trip.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedTrip(trip)}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        {getTripIcon(trip.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{trip.type}</h3>
                          <Badge variant="outline">{trip.routeName}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {trip.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(trip.pickupTime)}
                          </span>
                        </div>
                        <p className="text-sm mt-2">
                          <span className="text-muted-foreground">From:</span> {trip.pickupLocation}
                        </p>
                        {trip.linkedFlightNumber && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <Plane className="h-3 w-3 inline mr-1" />
                            Linked to flight {trip.linkedFlightNumber}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={trip.status} variant={getStatusVariant(trip.status)} />
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completed Trips */}
      {completedTrips.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">Completed</h2>
          <div className="grid gap-2">
            {completedTrips.map(trip => (
              <Card key={trip.id} className="opacity-75">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">{trip.type}</p>
                        <p className="text-sm text-muted-foreground">{trip.date} • {trip.pickupLocation} → {trip.dropoffLocation}</p>
                      </div>
                    </div>
                    <StatusBadge status="Completed" variant="success" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Trip Detail Dialog */}
      <Dialog open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)}>
        <DialogContent className="max-w-lg">
          {selectedTrip && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getTripIcon(selectedTrip.type)}
                  {selectedTrip.type}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{selectedTrip.routeName}</Badge>
                  <StatusBadge status={selectedTrip.status} variant={getStatusVariant(selectedTrip.status)} />
                </div>

                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium">{selectedTrip.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Pickup Time</p>
                      <p className="font-medium">{formatTime(selectedTrip.pickupTime)}</p>
                    </div>
                  </div>
                  {selectedTrip.linkedFlightNumber && (
                    <div className="flex items-center gap-3">
                      <Plane className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Linked Flight</p>
                        <p className="font-medium">{selectedTrip.linkedFlightNumber}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-green-500 mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">Pickup Location</p>
                      <p className="font-medium">{selectedTrip.pickupLocation}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-red-500 mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">Dropoff Location</p>
                      <p className="font-medium">{selectedTrip.dropoffLocation}</p>
                    </div>
                  </div>
                </div>

                {selectedTrip.vehiclePlate && (
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <h4 className="font-medium">Vehicle Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Type</p>
                        <p className="font-medium">{selectedTrip.vehicleType}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Plate</p>
                        <p className="font-medium">{selectedTrip.vehiclePlate}</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTrip.driverName && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-3">Driver</h4>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{selectedTrip.driverName}</p>
                          <p className="text-sm text-muted-foreground">{selectedTrip.driverPhone}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <a href={`tel:${selectedTrip.driverPhone}`}>
                          <Phone className="h-4 w-4 mr-1" />
                          Call
                        </a>
                      </Button>
                    </div>
                  </div>
                )}

                {selectedTrip.status === 'Planned' && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This trip is being planned. Vehicle and driver details will be updated once assigned.
                    </AlertDescription>
                  </Alert>
                )}

                {selectedTrip.status === 'Notified' && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Your transport is confirmed! Please be at the pickup location 10 minutes before the scheduled time.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <TravelBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          loadData(); // Refresh trips after booking
        }}
        participantId={participant.id}
        allowedZones={accreditationStatus.allowedZones}
        hotelName={eligibilityInfo?.accommodationDetails?.hotelName}
      />
    </div>
  );
};

export default Transportation;
