import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invitationStore, eventStore, participantStore, initializeStore } from '@/lib/emsStore';
import { Calendar, MapPin, Check, X, HelpCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

const RSVPLanding: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<'loading' | 'rsvp' | 'dietary' | 'confirmed' | 'error'>('loading');
  const [response, setResponse] = useState<'yes' | 'no' | 'maybe' | null>(null);
  const [dietaryNotes, setDietaryNotes] = useState('');
  const [invitation, setInvitation] = useState<ReturnType<typeof invitationStore.getByToken>>(undefined);
  const [event, setEvent] = useState<ReturnType<typeof eventStore.getById>>(undefined);
  const [participant, setParticipant] = useState<ReturnType<typeof participantStore.getById>>(undefined);

  useEffect(() => {
    initializeStore();

    if (!token) {
      setStep('error');
      return;
    }

    const inv = invitationStore.getByToken(token);
    if (!inv) {
      setStep('error');
      return;
    }

    // Mark as opened
    invitationStore.markOpened(inv.id);

    const evt = eventStore.getById(inv.eventId);
    const part = participantStore.getById(inv.participantId);

    setInvitation(inv);
    setEvent(evt);
    setParticipant(part);

    // Check if already responded
    if (['Accepted', 'Declined', 'Maybe'].includes(inv.status)) {
      setResponse(inv.status === 'Accepted' ? 'yes' : inv.status === 'Declined' ? 'no' : 'maybe');
      setStep('confirmed');
    } else {
      setStep('rsvp');
    }
  }, [token]);

  const handleSubmit = () => {
    if (response === 'yes' || response === 'maybe') {
      setStep('dietary');
    } else {
      handleFinalSubmit();
    }
  };

  const handleFinalSubmit = () => {
    if (!invitation || !response) return;

    const statusMap = { yes: 'Accepted', no: 'Declined', maybe: 'Maybe' } as const;
    invitationStore.respond(invitation.id, statusMap[response], dietaryNotes);

    // No need to create draft registration here
    // Registration will be created when the form is submitted with 'Submitted' status

    setStep('confirmed');
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (step === 'error' || !event || !participant) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center">
          <CardContent className="p-8">
            <X className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2">Invalid Invitation</h1>
            <p className="text-muted-foreground mb-6">
              This invitation link is invalid or has expired.
            </p>
            <Button onClick={() => navigate('/')}>Return to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'confirmed') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center">
          <CardContent className="p-8">
            <div className={cn(
              "w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center",
              response === 'yes' ? "bg-success/10" : response === 'maybe' ? "bg-warning/10" : "bg-muted"
            )}>
              {response === 'yes' ? (
                <Check className="h-8 w-8 text-success" />
              ) : response === 'maybe' ? (
                <HelpCircle className="h-8 w-8 text-warning" />
              ) : (
                <X className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <h1 className="text-2xl font-bold mb-2">Thank You!</h1>
            <p className="text-muted-foreground mb-6">
              {response === 'yes' && "Your attendance has been confirmed. We look forward to seeing you!"}
              {response === 'maybe' && "We've noted your tentative response. We'll follow up closer to the event."}
              {response === 'no' && "We're sorry you can't make it. We hope to see you at future events."}
            </p>
            {response === 'yes' && (
              <div className="bg-muted p-4 rounded-lg text-left mb-6">
                <h3 className="font-medium mb-2">What's Next?</h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Complete your registration form
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Upload required documents
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Confirm travel preferences
                  </li>
                </ul>
              </div>
            )}
            {response === 'yes' ? (
              <Button onClick={() => navigate(`/register?invitationId=${invitation.id}&eventId=${invitation.eventId}`)}>Continue to Registration</Button>
            ) : (
              <Button onClick={() => navigate('/')}>Return to Home</Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'dietary') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <CardTitle>Dietary Requirements</CardTitle>
            <p className="text-muted-foreground text-sm">Please let us know about any dietary restrictions</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Dietary Notes (Optional)</Label>
              <Textarea
                placeholder="e.g., Vegetarian, Gluten-free, Nut allergy..."
                value={dietaryNotes}
                onChange={(e) => setDietaryNotes(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('rsvp')} className="flex-1">Back</Button>
              <Button onClick={handleFinalSubmit} className="flex-1">Submit RSVP</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center pb-2">
          <div className="flex flex-col items-center justify-center gap-2 mb-6">
            <img
              src="/neomora-original-logo-only.png"
              alt="NeoMora Logo"
              className="h-20 w-auto"
            />
            <img
              src="/neomora1.png"
              alt="NeoMora"
              className="h-8 w-auto"
            />
          </div>
          <p className="text-sm text-muted-foreground mb-2">You're invited to</p>
          <CardTitle className="text-2xl">{event.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{event.startDate} - {event.endDate}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{event.city}</span>
            </div>
            <p className="text-sm text-muted-foreground">{event.theme}</p>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">Dear</p>
            <p className="text-lg font-semibold">{participant.firstName} {participant.lastName}</p>
          </div>

          <div className="space-y-3">
            <Label>Will you be attending?</Label>
            <RadioGroup value={response || ''} onValueChange={(v) => setResponse(v as any)}>
              <div className="grid grid-cols-3 gap-3">
                {(['yes', 'maybe', 'no'] as const).map((opt) => (
                  <Label
                    key={opt}
                    htmlFor={opt}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all",
                      response === opt
                        ? opt === 'yes' ? "border-success bg-success/10"
                          : opt === 'maybe' ? "border-warning bg-warning/10"
                            : "border-destructive bg-destructive/10"
                        : "border-muted hover:border-muted-foreground/50"
                    )}
                  >
                    <RadioGroupItem value={opt} id={opt} className="sr-only" />
                    {opt === 'yes' ? <Check className={cn("h-6 w-6", response === 'yes' ? "text-success" : "text-muted-foreground")} />
                      : opt === 'maybe' ? <HelpCircle className={cn("h-6 w-6", response === 'maybe' ? "text-warning" : "text-muted-foreground")} />
                        : <X className={cn("h-6 w-6", response === 'no' ? "text-destructive" : "text-muted-foreground")} />}
                    <span className="font-medium capitalize">{opt}</span>
                  </Label>
                ))}
              </div>
            </RadioGroup>
          </div>

          <Button onClick={handleSubmit} disabled={!response} className="w-full">Continue</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default RSVPLanding;
