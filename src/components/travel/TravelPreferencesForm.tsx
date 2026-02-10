import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plane, MapPin, Calendar, Luggage, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EMSTravelBooking } from '@/lib/emsStore';

interface TravelPreferencesFormProps {
  onSubmit: (preferences: TravelPreferences) => void;
  isSubmitting?: boolean;
  existingBooking?: EMSTravelBooking | null;
  participantRole?: string;
}

export interface TravelPreferences {
  originCity: string;
  departureAirport: string;
  preferredDepartureDate: string;
  preferredReturnDate: string;
  seatPreference: 'Window' | 'Aisle' | 'Middle' | 'No Preference';
  mealPreference: string;
  specialRequirements: string;
  emergencyContact: string;
  emergencyPhone: string;
}

const majorAirports = [
  { code: 'DXB', city: 'دبي - Dubai' },
  { code: 'DOH', city: 'الدوحة - Doha' },
  { code: 'RUH', city: 'الرياض - Riyadh' },
  { code: 'JED', city: 'جدة - Jeddah' },
  { code: 'KWI', city: 'الكويت - Kuwait' },
  { code: 'BAH', city: 'البحرين - Bahrain' },
  { code: 'MCT', city: 'مسقط - Muscat' },
  { code: 'AMM', city: 'عمّان - Amman' },
  { code: 'CAI', city: 'القاهرة - Cairo' },
  { code: 'BEY', city: 'بيروت - Beirut' },
  { code: 'LHR', city: 'London Heathrow' },
  { code: 'JFK', city: 'New York JFK' },
  { code: 'LAX', city: 'Los Angeles' },
  { code: 'CDG', city: 'Paris CDG' },
  { code: 'FRA', city: 'Frankfurt' },
  { code: 'NRT', city: 'Tokyo Narita' },
  { code: 'BOM', city: 'Mumbai' },
  { code: 'KHI', city: 'كراتشي - Karachi' },
];

export const TravelPreferencesForm: React.FC<TravelPreferencesFormProps> = ({
  onSubmit,
  isSubmitting = false,
  existingBooking,
  participantRole,
}) => {
  const [preferences, setPreferences] = useState<TravelPreferences>({
    originCity: '',
    departureAirport: '',
    preferredDepartureDate: '',
    preferredReturnDate: '',
    seatPreference: 'No Preference',
    mealPreference: 'حلال / Halal',
    specialRequirements: '',
    emergencyContact: '',
    emergencyPhone: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof TravelPreferences, string>>>({});

  const isVIP = participantRole === 'VVIP' || participantRole === 'VIP';
  const travelClass = isVIP ? 'Business Class' : 'Economy';

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof TravelPreferences, string>> = {};

    if (!preferences.originCity) newErrors.originCity = 'Origin city is required';
    if (!preferences.departureAirport) newErrors.departureAirport = 'Departure airport is required';
    if (!preferences.preferredDepartureDate) newErrors.preferredDepartureDate = 'Departure date is required';
    if (!preferences.preferredReturnDate) newErrors.preferredReturnDate = 'Return date is required';
    if (!preferences.emergencyContact) newErrors.emergencyContact = 'Emergency contact is required';
    if (!preferences.emergencyPhone) newErrors.emergencyPhone = 'Emergency phone is required';

    // Date validation
    if (preferences.preferredDepartureDate && preferences.preferredReturnDate) {
      if (new Date(preferences.preferredReturnDate) <= new Date(preferences.preferredDepartureDate)) {
        newErrors.preferredReturnDate = 'Return date must be after departure date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(preferences);
    }
  };

  // If already has a booking, show status
  if (existingBooking) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-status-success" />
            Travel Request Submitted
          </CardTitle>
          <CardDescription>
            Your travel request has been submitted and is being processed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium">{existingBooking.status}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Origin</p>
                <p className="font-medium">{existingBooking.originCity}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Preferred Dates</p>
                <p className="font-medium">{existingBooking.preferredDates}</p>
              </div>
              {existingBooking.airline && (
                <div>
                  <p className="text-muted-foreground">Airline</p>
                  <p className="font-medium">{existingBooking.airline}</p>
                </div>
              )}
            </div>
            {existingBooking.status === 'Rejected' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your travel request was not approved. Please contact support for more information.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plane className="h-5 w-5 text-primary" />
            Travel Preferences
          </CardTitle>
          <CardDescription>
            Submit your travel preferences. Our team will book flights based on your preferences and event policy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Travel Class Info */}
          <Alert className={isVIP ? 'border-amber-500 bg-amber-500/10' : ''}>
            <Luggage className="h-4 w-4" />
            <AlertDescription>
              Based on your role ({participantRole || 'Guest'}), you are eligible for{' '}
              <strong>{travelClass}</strong> travel with{' '}
              {isVIP ? '40 kg baggage + priority boarding' : '23 kg baggage allowance'}.
            </AlertDescription>
          </Alert>

          {/* Origin Details */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Departure Location
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="originCity">Origin City *</Label>
                <Input
                  id="originCity"
                  placeholder="e.g., القاهرة / Cairo"
                  value={preferences.originCity}
                  onChange={(e) => setPreferences({ ...preferences, originCity: e.target.value })}
                  className={errors.originCity ? 'border-destructive' : ''}
                />
                {errors.originCity && (
                  <p className="text-xs text-destructive">{errors.originCity}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="airport">Preferred Departure Airport *</Label>
                <Select
                  value={preferences.departureAirport}
                  onValueChange={(value) => setPreferences({ ...preferences, departureAirport: value })}
                >
                  <SelectTrigger className={errors.departureAirport ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select airport" />
                  </SelectTrigger>
                  <SelectContent>
                    {majorAirports.map((airport) => (
                      <SelectItem key={airport.code} value={airport.code}>
                        {airport.code} - {airport.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.departureAirport && (
                  <p className="text-xs text-destructive">{errors.departureAirport}</p>
                )}
              </div>
            </div>
          </div>

          {/* Travel Dates */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Preferred Travel Dates
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="departure">Preferred Departure Date *</Label>
                <Input
                  id="departure"
                  type="date"
                  value={preferences.preferredDepartureDate}
                  onChange={(e) => setPreferences({ ...preferences, preferredDepartureDate: e.target.value })}
                  className={errors.preferredDepartureDate ? 'border-destructive' : ''}
                />
                {errors.preferredDepartureDate && (
                  <p className="text-xs text-destructive">{errors.preferredDepartureDate}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="return">Preferred Return Date *</Label>
                <Input
                  id="return"
                  type="date"
                  value={preferences.preferredReturnDate}
                  onChange={(e) => setPreferences({ ...preferences, preferredReturnDate: e.target.value })}
                  className={errors.preferredReturnDate ? 'border-destructive' : ''}
                />
                {errors.preferredReturnDate && (
                  <p className="text-xs text-destructive">{errors.preferredReturnDate}</p>
                )}
              </div>
            </div>
          </div>

          {/* Seat & Meal Preferences */}
          <div className="space-y-4">
            <h3 className="font-medium">Seat & Meal Preferences</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Seat Preference</Label>
                <RadioGroup
                  value={preferences.seatPreference}
                  onValueChange={(value: TravelPreferences['seatPreference']) =>
                    setPreferences({ ...preferences, seatPreference: value })
                  }
                  className="flex flex-wrap gap-4"
                >
                  {['Window', 'Aisle', 'Middle', 'No Preference'].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`seat-${option}`} />
                      <Label htmlFor={`seat-${option}`} className="cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meal">Meal Preference</Label>
                <Select
                  value={preferences.mealPreference}
                  onValueChange={(value) => setPreferences({ ...preferences, mealPreference: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="حلال / Halal">حلال / Halal</SelectItem>
                    <SelectItem value="Vegetarian">Vegetarian</SelectItem>
                    <SelectItem value="Vegan">Vegan</SelectItem>
                    <SelectItem value="Gluten-Free">Gluten-Free</SelectItem>
                    <SelectItem value="No Special Meal">No Special Meal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Special Requirements */}
          <div className="space-y-2">
            <Label htmlFor="special">Special Requirements</Label>
            <Textarea
              id="special"
              placeholder="Wheelchair assistance, medical needs, sports equipment, etc."
              value={preferences.specialRequirements}
              onChange={(e) => setPreferences({ ...preferences, specialRequirements: e.target.value })}
              rows={3}
            />
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="font-medium">Emergency Contact</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyName">Contact Name *</Label>
                <Input
                  id="emergencyName"
                  placeholder="Full name"
                  value={preferences.emergencyContact}
                  onChange={(e) => setPreferences({ ...preferences, emergencyContact: e.target.value })}
                  className={errors.emergencyContact ? 'border-destructive' : ''}
                />
                {errors.emergencyContact && (
                  <p className="text-xs text-destructive">{errors.emergencyContact}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">Contact Phone *</Label>
                <Input
                  id="emergencyPhone"
                  placeholder="+971 50 123 4567"
                  value={preferences.emergencyPhone}
                  onChange={(e) => setPreferences({ ...preferences, emergencyPhone: e.target.value })}
                  className={errors.emergencyPhone ? 'border-destructive' : ''}
                />
                {errors.emergencyPhone && (
                  <p className="text-xs text-destructive">{errors.emergencyPhone}</p>
                )}
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Travel Request'}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
};

export default TravelPreferencesForm;
