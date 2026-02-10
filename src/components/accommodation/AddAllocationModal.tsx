import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Hotel, User, Calendar, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { EMSAccommodation, accommodationStore, hotelStore, EMSHotel } from '@/lib/emsStore';
import { participantStore, registrationStore, travelStore, visaStore } from '@/lib/emsStore';
import { toast } from 'sonner';

interface AddAllocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editAllocation?: EMSAccommodation | null;
  preSelectedParticipantId?: string | null;
}

interface EligibilityCheck {
  eligible: boolean;
  reason: string;
  warnings: string[];
}

export const AddAllocationModal: React.FC<AddAllocationModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  editAllocation,
  preSelectedParticipantId
}) => {
  const [step, setStep] = useState(1);
  const [selectedParticipantId, setSelectedParticipantId] = useState('');
  const [selectedHotelId, setSelectedHotelId] = useState('');
  const [roomType, setRoomType] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [roommateIds, setRoommateIds] = useState<string[]>([]);
  const [specialRequests, setSpecialRequests] = useState('');
  const [hotelAddress, setHotelAddress] = useState('');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [eligibility, setEligibility] = useState<EligibilityCheck | null>(null);

  const participants = participantStore.getAll();
  const hotels = hotelStore.getAll();
  const registrations = registrationStore.getAll();

  // Get eligible participants (approved registration with needsAccommodation AND ticketed travel)
  const eligibleParticipants = participants.filter(p => {
    const reg = registrations.find(r => r.participantId === p.id);
    if (!reg) return false;
    // Must be approved and need accommodation
    if (reg.status !== 'Approved' || !reg.formData.needsAccommodation) return false;

    // Must have ticketed travel for dates
    const travel = travelStore.getByParticipant(p.id)[0];
    const isTravelReady = travel?.status === 'Ticketed' && travel.itinerary.length >= 2;

    // Must have approved visa (if required)
    const visa = visaStore.getByParticipant(p.id);
    const isVisaReady = !visa || visa.status === 'Approved' || visa.status === 'Not Required';

    return isTravelReady && isVisaReady;
  });

  // Filter out already allocated participants
  const existingAllocations = accommodationStore.getAll();
  const allocatedParticipantIds = existingAllocations
    .filter(a => a.status !== 'Cancelled')
    .map(a => a.participantId);

  const availableParticipants = editAllocation
    ? eligibleParticipants
    : eligibleParticipants.filter(p => !allocatedParticipantIds.includes(p.id));

  useEffect(() => {
    if (editAllocation) {
      setSelectedParticipantId(editAllocation.participantId);
      setSelectedHotelId(editAllocation.hotelId);
      setRoomType(editAllocation.roomType);
      setRoomNumber(editAllocation.roomNumber);
      setCheckIn(editAllocation.checkIn);
      setCheckOut(editAllocation.checkOut);
      setRoommateIds(editAllocation.roommates);
      setSpecialRequests(editAllocation.specialRequests || '');
      setHotelAddress(editAllocation.hotelAddress || '');
      setInstructions(editAllocation.instructions || '');
    } else {
      resetForm();
      // If there's a pre-selected participant, auto-select them
      if (preSelectedParticipantId && open) {
        handleParticipantSelect(preSelectedParticipantId);
      }
    }
  }, [editAllocation, preSelectedParticipantId, open]);

  const resetForm = () => {
    setStep(1);
    setSelectedParticipantId('');
    setSelectedHotelId('');
    setRoomType('');
    setRoomNumber('');
    setCheckIn('');
    setCheckOut('');
    setRoommateIds([]);
    setSpecialRequests('');
    setHotelAddress('');
    setInstructions('');
    setEligibility(null);
  };

  const checkEligibility = (participantId: string): EligibilityCheck => {
    const participant = participantStore.getById(participantId);
    const warnings: string[] = [];

    if (!participant) {
      return { eligible: false, reason: 'Participant not found', warnings: [] };
    }

    // Use the store's eligibility check which validates travel status
    const storeEligibility = accommodationStore.checkEligibility(participantId);

    // Additional Visa Check
    const visaApp = visaStore.getByParticipant(participantId);
    if (visaApp && visaApp.status !== 'Approved' && visaApp.status !== 'Not Required') {
      return {
        eligible: false,
        reason: 'Visa not approved',
        warnings: [`Current visa status: ${visaApp.status}`]
      };
    }

    if (!storeEligibility.eligible) {
      return {
        eligible: false,
        reason: storeEligibility.reason,
        warnings: storeEligibility.travelStatus ? [`Current travel status: ${storeEligibility.travelStatus}`] : []
      };
    }

    // Additional warnings
    if (participant.accessibilityNeeds) {
      warnings.push(`Accessibility needs: ${participant.accessibilityNeeds}`);
    }

    if (participant.dietaryNotes) {
      warnings.push(`Dietary notes: ${participant.dietaryNotes}`);
    }

    return {
      eligible: true,
      reason: `Eligible for accommodation (${storeEligibility.checkIn} to ${storeEligibility.checkOut})`,
      warnings
    };
  };

  const handleParticipantSelect = (participantId: string) => {
    setSelectedParticipantId(participantId);
    const check = checkEligibility(participantId);
    setEligibility(check);

    // Auto-fill dates from ticketed travel itinerary
    const travelDates = accommodationStore.getTravelDates(participantId);
    if (travelDates) {
      setCheckIn(travelDates.checkIn);
      setCheckOut(travelDates.checkOut);
    }
  };

  const handleHotelSelect = (hotelId: string) => {
    setSelectedHotelId(hotelId);
    setRoomType('');
    setRoomNumber('');
    const hotel = hotels.find(h => h.id === hotelId);
    if (hotel) {
      setHotelAddress(hotel.address || '');
    }
  };

  const getSelectedHotel = (): EMSHotel | undefined => {
    return hotels.find(h => h.id === selectedHotelId);
  };

  const getSelectedParticipant = () => {
    return participants.find(p => p.id === selectedParticipantId);
  };

  const getHotelOccupancy = (hotelId: string) => {
    const hotel = hotels.find(h => h.id === hotelId);
    const occupants = existingAllocations.filter(
      a => a.hotelId === hotelId && a.status !== 'Cancelled'
    ).length;
    return { occupants, capacity: hotel?.capacity || 0 };
  };

  const handleSubmit = async () => {
    if (!eligibility?.eligible) {
      toast.error('Participant is not eligible for accommodation');
      return;
    }

    if (!selectedHotelId || !roomType || !roomNumber || !checkIn || !checkOut) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const hotel = getSelectedHotel();
      const participant = getSelectedParticipant();

      if (editAllocation) {
        accommodationStore.update(editAllocation.id, {
          hotelId: selectedHotelId,
          hotelName: hotel?.name || '',
          roomType,
          roomNumber,
          checkIn,
          checkOut,
          roommates: roommateIds,
          specialRequests: specialRequests || undefined,
          hotelAddress: hotelAddress || undefined,
          instructions: instructions || undefined,
        });
        toast.success('Allocation updated successfully');
      } else {
        accommodationStore.create({
          participantId: selectedParticipantId,
          registrationId: registrations.find(r => r.participantId === selectedParticipantId)?.id || '',
          hotelId: selectedHotelId,
          hotelName: hotel?.name || '',
          roomType,
          roomNumber,
          checkIn,
          checkOut,
          status: 'Provisional',
          roommates: roommateIds,
          gender: 'Other', // Would come from participant data
          specialRequests: specialRequests || undefined,
          hotelAddress: hotelAddress || undefined,
          instructions: instructions || undefined,
        });
        toast.success(`Provisional allocation created for ${participant?.firstName} ${participant?.lastName}`);
      }

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to save allocation');
    } finally {
      setLoading(false);
    }
  };

  const selectedHotel = getSelectedHotel();
  const selectedParticipant = getSelectedParticipant();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hotel className="h-5 w-5 text-primary" />
            {editAllocation ? 'Edit Allocation' : 'Add Room Allocation'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              <User className="h-4 w-4" /> Participant
            </div>
            <div className="h-px w-8 bg-border" />
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              <Hotel className="h-4 w-4" /> Hotel & Room
            </div>
            <div className="h-px w-8 bg-border" />
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              <Calendar className="h-4 w-4" /> Dates & Review
            </div>
          </div>

          {/* Step 1: Select Participant */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Participant *</Label>
                <Select value={selectedParticipantId} onValueChange={handleParticipantSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a participant..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableParticipants.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        No eligible participants available
                      </div>
                    ) : (
                      availableParticipants.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center gap-2">
                            <span>{p.firstName} {p.lastName}</span>
                            <Badge variant="outline" className="text-xs">{p.role}</Badge>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {eligibility && (
                <Alert variant={eligibility.eligible ? 'default' : 'destructive'}>
                  {eligibility.eligible ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    <p className="font-medium">{eligibility.reason}</p>
                    {eligibility.warnings.length > 0 && (
                      <ul className="mt-2 text-sm space-y-1">
                        {eligibility.warnings.map((w, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            {w}
                          </li>
                        ))}
                      </ul>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {selectedParticipant && eligibility?.eligible && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Organization:</span>
                        <p className="font-medium">{selectedParticipant.organization}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Nationality:</span>
                        <p className="font-medium">{selectedParticipant.nationality}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Role:</span>
                        <p className="font-medium">{selectedParticipant.role}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email:</span>
                        <p className="font-medium truncate">{selectedParticipant.email}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 2: Select Hotel & Room */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Hotel *</Label>
                <Select value={selectedHotelId} onValueChange={handleHotelSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a hotel..." />
                  </SelectTrigger>
                  <SelectContent>
                    {hotels.map(hotel => {
                      const { occupants, capacity } = getHotelOccupancy(hotel.id);
                      const occupancyPercent = Math.round((occupants / capacity) * 100);
                      return (
                        <SelectItem key={hotel.id} value={hotel.id}>
                          <div className="flex items-center justify-between gap-4 w-full">
                            <span>{hotel.name}</span>
                            <Badge
                              variant={occupancyPercent >= 90 ? 'destructive' : occupancyPercent >= 70 ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {occupants}/{capacity}
                            </Badge>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedHotel && (
                <>
                  <div className="space-y-2">
                    <Label>Room Type *</Label>
                    <Select value={roomType} onValueChange={setRoomType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select room type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedHotel.roomTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Room Number *</Label>
                    <Input
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      placeholder="e.g., 1201, PS-01"
                    />
                  </div>

                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">City:</span>
                          <p className="font-medium">{selectedHotel.city}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Contact:</span>
                          <p className="font-medium">{selectedHotel.contact}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Step 3: Dates & Review */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Travel-derived dates info */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Check-in and check-out dates are automatically derived from the participant's
                  ticketed travel itinerary (flight arrival and departure dates).
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Check-in Date</Label>
                  <Input
                    type="date"
                    value={checkIn}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">From flight arrival</p>
                </div>
                <div className="space-y-2">
                  <Label>Check-out Date</Label>
                  <Input
                    type="date"
                    value={checkOut}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">From flight departure</p>
                </div>
                <div className="space-y-2">
                  <Label>Total Nights</Label>
                  <div className="flex items-center justify-center h-10 bg-muted rounded-md border font-semibold text-lg">
                    {checkIn && checkOut ?
                      Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))
                      : '-'
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">Auto-calculated</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Special Requests (Optional)</Label>
                <Textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Any special requirements or notes..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Hotel Address Display</Label>
                <Input
                  value={hotelAddress}
                  onChange={(e) => setHotelAddress(e.target.value)}
                  placeholder="Full address of the hotel..."
                />
              </div>

              <div className="space-y-2">
                <Label>Instructions for Participant (Optional)</Label>
                <Textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Check-in procedures, shuttle info, etc."
                  rows={3}
                />
              </div>

              {/* Review Summary */}
              <Card className="border-primary">
                <CardContent className="pt-4">
                  <h4 className="font-semibold mb-3">Allocation Summary</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Participant:</span>
                      <p className="font-medium">{selectedParticipant?.firstName} {selectedParticipant?.lastName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Role:</span>
                      <p className="font-medium">{selectedParticipant?.role}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Hotel:</span>
                      <p className="font-medium">{selectedHotel?.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Room:</span>
                      <p className="font-medium">{roomType} - {roomNumber}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Check-in:</span>
                      <p className="font-medium">{checkIn}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Check-out:</span>
                      <p className="font-medium">{checkOut}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Stay Duration:</span>
                      <p className="font-medium">
                        {checkIn && checkOut ?
                          `${Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))} nights`
                          : '-'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <Badge variant="secondary">Status: Provisional</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Allocation will be created as Provisional and requires Admin approval to Confirm.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && (!selectedParticipantId || !eligibility?.eligible)) ||
                (step === 2 && (!selectedHotelId || !roomType || !roomNumber))
              }
            >
              Continue
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving...' : editAllocation ? 'Update Allocation' : 'Create Allocation'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
