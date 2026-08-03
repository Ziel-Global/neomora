import React from 'react';
import { cn } from '@/lib/utils';
import { EMSInvitationTemplate, EMSEvent, EMSParticipant } from '@/lib/emsStore';
import { Crown, Calendar, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface InvitationTemplatePreviewProps {
  template: EMSInvitationTemplate;
  event?: EMSEvent | null;
  participant?: EMSParticipant | null;
  rsvpDeadline?: string;
  className?: string;
}

const isVIPTemplate = (template: EMSInvitationTemplate): boolean => {
  const name = template.name.toLowerCase();
  const subject = template.subject.toLowerCase();
  return (
    name.includes('vip') ||
    name.includes('exclusive') ||
    subject.includes('vip') ||
    subject.includes('exclusive')
  );
};

const replaceVariables = (
  text: string,
  event?: EMSEvent | null,
  participant?: EMSParticipant | null,
  rsvpDeadline?: string,
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
    result = result.replace(
      /\{\{startDate\}\}/g,
      event.startDate ? format(new Date(event.startDate), 'MMMM d, yyyy') : 'TBD',
    );
    result = result.replace(
      /\{\{endDate\}\}/g,
      event.endDate ? format(new Date(event.endDate), 'MMMM d, yyyy') : 'TBD',
    );
  } else {
    result = result.replace(/\{\{eventName\}\}/g, 'Event Name');
    result = result.replace(/\{\{eventCity\}\}/g, 'City');
    result = result.replace(/\{\{startDate\}\}/g, 'Start Date');
    result = result.replace(/\{\{endDate\}\}/g, 'End Date');
  }

  result = result.replace(
    /\{\{rsvpDeadline\}\}/g,
    rsvpDeadline ? format(new Date(rsvpDeadline), 'MMMM d, yyyy') : 'RSVP Deadline',
  );

  return result;
};

const formatDateRange = (event?: EMSEvent | null): string => {
  if (!event?.startDate) return 'Date TBD';
  const start = format(new Date(event.startDate), 'MMM d');
  if (!event.endDate) return format(new Date(event.startDate), 'MMM d, yyyy');
  const end = format(new Date(event.endDate), 'MMM d, yyyy');
  return `${start} – ${end}`;
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
    <div
      className={cn(
        'relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl shadow-[0_20px_50px_-24px_rgba(28,18,8,0.65)]',
        className,
      )}
      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(155deg,#1a120c_0%,#2a1c12_42%,#3a2818_100%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 15%, rgba(251,191,36,0.35), transparent 35%), radial-gradient(circle at 80% 85%, rgba(245,158,11,0.2), transparent 40%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-[8px] rounded-xl border border-amber-400/25"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-[12px] rounded-[10px] border border-amber-200/10"
        aria-hidden
      />

      <div className="relative flex h-full min-h-0 flex-col px-5 pb-6 pt-5 sm:px-8 sm:pb-7 sm:pt-6">
        <div className="shrink-0 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200">
            <Crown className="h-3.5 w-3.5 text-amber-300" />
            VIP Invitation
          </div>
          <p className="mt-3 text-[10px] font-sans font-semibold uppercase tracking-[0.26em] text-amber-300/70">
            You are cordially invited
          </p>
          <h2 className="mx-auto mt-2 max-w-2xl text-balance text-[1.35rem] font-normal leading-snug tracking-tight text-amber-50 sm:text-[1.55rem]">
            {subject}
          </h2>
          <div className="mx-auto mt-3 flex h-3 w-28 items-center justify-center gap-2">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-400/60" />
            <span className="h-1 w-1 rotate-45 bg-amber-300/80" />
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-400/60" />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 py-3">
          {event && (
            <div className="grid w-full max-w-2xl shrink-0 grid-cols-3 gap-2 rounded-xl border border-amber-400/20 bg-black/25 px-2 py-3 sm:px-4">
              <div className="min-w-0 text-center">
                <Calendar className="mx-auto mb-1 h-3.5 w-3.5 text-amber-300/90" />
                <p className="font-sans text-[9px] font-semibold uppercase tracking-[0.16em] text-amber-300/60">
                  Date
                </p>
                <p className="mt-0.5 truncate font-sans text-[11px] font-medium text-amber-50 sm:text-xs">
                  {formatDateRange(event)}
                </p>
              </div>
              <div className="min-w-0 border-x border-amber-400/15 text-center">
                <MapPin className="mx-auto mb-1 h-3.5 w-3.5 text-amber-300/90" />
                <p className="font-sans text-[9px] font-semibold uppercase tracking-[0.16em] text-amber-300/60">
                  Location
                </p>
                <p className="mt-0.5 truncate font-sans text-[11px] font-medium text-amber-50 sm:text-xs">
                  {event.city || 'TBD'}
                </p>
              </div>
              <div className="min-w-0 text-center">
                <Clock className="mx-auto mb-1 h-3.5 w-3.5 text-amber-300/90" />
                <p className="font-sans text-[9px] font-semibold uppercase tracking-[0.16em] text-amber-300/60">
                  RSVP by
                </p>
                <p className="mt-0.5 truncate font-sans text-[11px] font-medium text-amber-50 sm:text-xs">
                  {rsvpDeadline ? format(new Date(rsvpDeadline), 'MMM d, yyyy') : 'TBD'}
                </p>
              </div>
            </div>
          )}

          <p className="max-w-2xl min-h-0 overflow-hidden text-center font-sans text-[13px] font-light leading-relaxed text-amber-100/85 line-clamp-4 whitespace-pre-line sm:text-sm">
            {body}
          </p>
        </div>

        <p className="shrink-0 pt-2 text-center font-sans text-[10px] font-medium uppercase tracking-[0.22em] text-amber-300/60">
          Your presence would be an honour
        </p>
      </div>
    </div>
  );
};

const StandardInvitationTemplate: React.FC<TemplateContentProps> = ({
  subject,
  body,
  event,
  rsvpDeadline,
  className,
}) => {
  return (
    <div
      className={cn(
        'relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#d7d0c4] bg-[#f7f3eb] shadow-[0_18px_40px_-24px_rgba(40,32,20,0.35)]',
        className,
      )}
      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
    >
      <div
        className="pointer-events-none absolute inset-[8px] rounded-xl border border-[#cfc6b6]/70"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#b7a990] to-transparent"
        aria-hidden
      />

      <div className="relative flex h-full min-h-0 flex-col px-5 pb-6 pt-5 sm:px-8 sm:pb-7 sm:pt-6">
        <div className="shrink-0 text-center">
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8a7d68]">
            Event Invitation
          </p>
          <div className="mx-auto mt-2.5 flex h-3 w-24 items-center justify-center gap-2">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#b7a990]" />
            <span className="h-1 w-1 rounded-full bg-[#a89578]" />
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#b7a990]" />
          </div>
          <h2 className="mx-auto mt-3 max-w-2xl text-balance text-[1.35rem] font-normal leading-snug tracking-tight text-[#2a241c] sm:text-[1.55rem]">
            {subject}
          </h2>
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 py-3">
          {event && (
            <div className="grid w-full max-w-2xl shrink-0 grid-cols-3 gap-2 rounded-xl border border-[#e2dacb] bg-white/70 px-2 py-3 shadow-sm sm:px-4">
              <div className="min-w-0 text-center">
                <Calendar className="mx-auto mb-1 h-3.5 w-3.5 text-[#8a7d68]" />
                <p className="font-sans text-[9px] font-semibold uppercase tracking-[0.16em] text-[#9a8d78]">
                  Date
                </p>
                <p className="mt-0.5 truncate font-sans text-[11px] font-medium text-[#2a241c] sm:text-xs">
                  {formatDateRange(event)}
                </p>
              </div>
              <div className="min-w-0 border-x border-[#e8e1d4] text-center">
                <MapPin className="mx-auto mb-1 h-3.5 w-3.5 text-[#8a7d68]" />
                <p className="font-sans text-[9px] font-semibold uppercase tracking-[0.16em] text-[#9a8d78]">
                  Location
                </p>
                <p className="mt-0.5 truncate font-sans text-[11px] font-medium text-[#2a241c] sm:text-xs">
                  {event.city || 'TBD'}
                </p>
              </div>
              <div className="min-w-0 text-center">
                <Clock className="mx-auto mb-1 h-3.5 w-3.5 text-[#8a7d68]" />
                <p className="font-sans text-[9px] font-semibold uppercase tracking-[0.16em] text-[#9a8d78]">
                  RSVP by
                </p>
                <p className="mt-0.5 truncate font-sans text-[11px] font-medium text-[#2a241c] sm:text-xs">
                  {rsvpDeadline ? format(new Date(rsvpDeadline), 'MMM d, yyyy') : 'TBD'}
                </p>
              </div>
            </div>
          )}

          <p className="max-w-2xl min-h-0 overflow-hidden text-center font-sans text-[13px] font-normal leading-relaxed text-[#4a4338] line-clamp-4 whitespace-pre-line sm:text-sm">
            {body}
          </p>
        </div>

        <div className="mx-auto w-full max-w-[14rem] shrink-0 border-t border-[#d9d0c0] pt-3 text-center">
          <p className="font-sans text-[11px] italic text-[#8a7d68]">
            We look forward to welcoming you
          </p>
        </div>
      </div>
    </div>
  );
};

export default InvitationTemplatePreview;
