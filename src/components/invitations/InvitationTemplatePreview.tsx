import React from 'react';
import { cn } from '@/lib/utils';
import { EMSInvitationTemplate, EMSEvent, EMSParticipant } from '@/lib/emsStore';
import { Crown, Star, Calendar, MapPin, Clock, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

interface InvitationTemplatePreviewProps {
  template: EMSInvitationTemplate;
  event?: EMSEvent | null;
  participant?: EMSParticipant | null;
  rsvpDeadline?: string;
  className?: string;
}

// Check if template is VIP based on name/subject
const isVIPTemplate = (template: EMSInvitationTemplate): boolean => {
  const name = template.name.toLowerCase();
  const subject = template.subject.toLowerCase();
  return name.includes('vip') || name.includes('exclusive') || 
         subject.includes('vip') || subject.includes('exclusive');
};

// Replace template variables with actual values
const replaceVariables = (
  text: string,
  event?: EMSEvent | null,
  participant?: EMSParticipant | null,
  rsvpDeadline?: string
): string => {
  let result = text;
  
  if (participant) {
    result = result.replace(/\{\{firstName\}\}/g, participant.firstName);
    result = result.replace(/\{\{lastName\}\}/g, participant.lastName);
  } else {
    result = result.replace(/\{\{firstName\}\}/g, 'Guest');
    result = result.replace(/\{\{lastName\}\}/g, '');
  }
  
  if (event) {
    result = result.replace(/\{\{eventName\}\}/g, event.name);
    result = result.replace(/\{\{eventCity\}\}/g, event.city);
    result = result.replace(/\{\{startDate\}\}/g, event.startDate ? format(new Date(event.startDate), 'MMMM d, yyyy') : 'TBD');
    result = result.replace(/\{\{endDate\}\}/g, event.endDate ? format(new Date(event.endDate), 'MMMM d, yyyy') : 'TBD');
  } else {
    result = result.replace(/\{\{eventName\}\}/g, 'Event Name');
    result = result.replace(/\{\{eventCity\}\}/g, 'City');
    result = result.replace(/\{\{startDate\}\}/g, 'Start Date');
    result = result.replace(/\{\{endDate\}\}/g, 'End Date');
  }
  
  result = result.replace(/\{\{rsvpDeadline\}\}/g, rsvpDeadline ? format(new Date(rsvpDeadline), 'MMMM d, yyyy') : 'RSVP Deadline');
  
  return result;
};

export const InvitationTemplatePreview: React.FC<InvitationTemplatePreviewProps> = ({
  template,
  event,
  participant,
  rsvpDeadline,
  className,
}) => {
  const isVIP = isVIPTemplate(template);
  
  const subject = replaceVariables(template.subject, event, participant, rsvpDeadline);
  const body = replaceVariables(template.body, event, participant, rsvpDeadline);
  
  if (isVIP) {
    return (
      <VIPInvitationTemplate
        subject={subject}
        body={body}
        event={event}
        rsvpDeadline={rsvpDeadline}
        className={className}
      />
    );
  }
  
  return (
    <StandardInvitationTemplate
      subject={subject}
      body={body}
      event={event}
      rsvpDeadline={rsvpDeadline}
      className={className}
    />
  );
};

// VIP Luxury Template
interface TemplateContentProps {
  subject: string;
  body: string;
  event?: EMSEvent | null;
  rsvpDeadline?: string;
  className?: string;
}

const VIPInvitationTemplate: React.FC<TemplateContentProps> = ({
  subject,
  body,
  event,
  rsvpDeadline,
  className,
}) => {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl",
      className
    )}>
      {/* Luxury Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-900 via-amber-800 to-yellow-900" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImRpYW1vbmQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTMwIDBMNjAgMzBMMzAgNjBMMCAzMFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjE1LDAsMC4xKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2RpYW1vbmQpIi8+PC9zdmc+')] opacity-50" />
      
      {/* Gold Accent Lines */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
      
      {/* Content */}
      <div className="relative p-8 md:p-10">
        {/* VIP Badge */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full shadow-lg shadow-amber-500/30">
            <Crown className="h-5 w-5 text-amber-900" />
            <span className="font-bold text-amber-900 uppercase tracking-wider text-sm">VIP Exclusive</span>
            <Sparkles className="h-4 w-4 text-amber-900" />
          </div>
        </div>
        
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-amber-100 mb-2">
            {subject}
          </h2>
          <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto" />
        </div>
        
        {/* Event Details Card */}
        {event && (
          <div className="bg-black/20 backdrop-blur-sm rounded-lg p-6 mb-6 border border-amber-500/30">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <Calendar className="h-5 w-5 text-amber-400" />
                <div>
                  <p className="text-xs text-amber-300/70 uppercase tracking-wide">Date</p>
                  <p className="text-amber-100 font-medium">
                    {event.startDate ? format(new Date(event.startDate), 'MMM d') : 'TBD'}
                    {event.endDate && ` - ${format(new Date(event.endDate), 'MMM d, yyyy')}`}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <MapPin className="h-5 w-5 text-amber-400" />
                <div>
                  <p className="text-xs text-amber-300/70 uppercase tracking-wide">Location</p>
                  <p className="text-amber-100 font-medium">{event.city}</p>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Clock className="h-5 w-5 text-amber-400" />
                <div>
                  <p className="text-xs text-amber-300/70 uppercase tracking-wide">RSVP By</p>
                  <p className="text-amber-100 font-medium">
                    {rsvpDeadline ? format(new Date(rsvpDeadline), 'MMM d, yyyy') : 'TBD'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Message Body */}
        <div className="bg-black/10 rounded-lg p-6 mb-6">
          <p className="text-amber-100/90 whitespace-pre-line leading-relaxed font-light">
            {body}
          </p>
        </div>
        
        {/* VIP Benefits */}
        <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 rounded-lg p-4 border border-amber-500/20">
          <p className="text-center text-amber-300 text-sm font-medium">
            ★ Priority Seating ★ Exclusive Lounge Access ★ Dedicated Concierge ★
          </p>
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-amber-300/60 text-xs uppercase tracking-widest">
            Your presence would be an honor
          </p>
        </div>
      </div>
    </div>
  );
};

// Standard Template
const StandardInvitationTemplate: React.FC<TemplateContentProps> = ({
  subject,
  body,
  event,
  rsvpDeadline,
  className,
}) => {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl bg-background border",
      className
    )}>
      {/* Header */}
      <div className="bg-primary/10 p-6 border-b">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Star className="h-5 w-5 text-primary" />
          <span className="font-medium text-primary uppercase tracking-wide text-sm">Event Invitation</span>
        </div>
        <h2 className="text-xl md:text-2xl font-semibold text-center text-foreground">
          {subject}
        </h2>
      </div>
      
      {/* Content */}
      <div className="p-6 md:p-8">
        {/* Event Details */}
        {event && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-medium text-sm">
                  {event.startDate ? format(new Date(event.startDate), 'MMM d') : 'TBD'}
                  {event.endDate && ` - ${format(new Date(event.endDate), 'MMM d')}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-medium text-sm">{event.city}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">RSVP By</p>
                <p className="font-medium text-sm">
                  {rsvpDeadline ? format(new Date(rsvpDeadline), 'MMM d, yyyy') : 'TBD'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Message Body */}
        <div className="mb-6">
          <p className="text-foreground/80 whitespace-pre-line leading-relaxed">
            {body}
          </p>
        </div>
        
        {/* Footer */}
        <div className="text-center pt-4 border-t">
          <p className="text-muted-foreground text-sm">
            We look forward to seeing you there!
          </p>
        </div>
      </div>
    </div>
  );
};

export default InvitationTemplatePreview;
