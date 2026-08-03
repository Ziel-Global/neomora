import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InvitationTemplatePreview } from './InvitationTemplatePreview';
import { EMSInvitationTemplate, EMSEvent, EMSParticipant } from '@/lib/emsStore';
import { Eye, Crown, Star, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { InvitationResponse } from '@/api/invitationApi';
import { cn } from '@/lib/utils';

interface InvitationPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EMSInvitationTemplate | null;
  event?: EMSEvent | null;
  participant?: EMSParticipant | null;
  rsvpDeadline?: string;
  invitationStatus?: string;
  canRespond?: boolean;
  canRegister?: boolean;
  isResponding?: boolean;
  onRespond?: (response: InvitationResponse) => void;
  onRegister?: () => void;
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

export const InvitationPreviewModal: React.FC<InvitationPreviewModalProps> = ({
  open,
  onOpenChange,
  template,
  event,
  participant,
  rsvpDeadline,
  invitationStatus,
  canRespond = false,
  canRegister = false,
  isResponding = false,
  onRespond,
  onRegister,
}) => {
  if (!template) return null;

  const isVIP = isVIPTemplate(template);
  const showActions = (canRespond && onRespond) || (canRegister && onRegister);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,820px)] w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border bg-background p-0 shadow-2xl sm:h-[min(88vh,720px)]">
        <DialogHeader className="shrink-0 space-y-0 border-b bg-gradient-to-br from-primary/[0.05] via-card to-card px-5 py-3 pe-12 text-start">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <Eye className="h-4 w-4 text-primary/70" />
              Invitation Preview
            </DialogTitle>
            <Badge
              variant={isVIP ? 'default' : 'secondary'}
              className={cn(
                'h-6 gap-1 rounded-md px-2 text-[10px] font-semibold uppercase tracking-wide',
                isVIP && 'bg-amber-500 text-amber-950 hover:bg-amber-500',
              )}
            >
              {isVIP ? <Crown className="h-3 w-3" /> : <Star className="h-3 w-3" />}
              {isVIP ? 'VIP' : 'Standard'}
            </Badge>
            {invitationStatus && (
              <Badge variant="outline" className="h-6 rounded-md px-2 text-[10px]">
                {invitationStatus}
              </Badge>
            )}
          </div>
          <DialogDescription className="mt-1 text-xs leading-relaxed">
            {template.name} — review the invitation
            {canRespond ? ' and respond to RSVP' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-2.5 sm:px-4 sm:py-3">
          <InvitationTemplatePreview
            className="h-full min-h-0 w-full flex-1"
            template={template}
            event={event}
            participant={participant}
            rsvpDeadline={rsvpDeadline}
          />
        </div>

        <div
          className={cn(
            'shrink-0 flex flex-col gap-2 border-t bg-muted/20 px-5 py-3 sm:flex-row sm:items-center',
            showActions ? 'sm:justify-between' : 'sm:justify-end',
          )}
        >
          <Button variant="outline" className="h-9" onClick={() => onOpenChange(false)}>
            Close
          </Button>

          {showActions && (
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {canRespond && onRespond && (
                <>
                  <Button
                    className="h-9"
                    disabled={isResponding}
                    onClick={() => onRespond('Accepted')}
                  >
                    {isResponding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept'}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    disabled={isResponding}
                    onClick={() => onRespond('Maybe')}
                  >
                    Maybe
                  </Button>
                  <Button
                    variant="destructive"
                    className="h-9"
                    disabled={isResponding}
                    onClick={() => onRespond('Declined')}
                  >
                    Decline
                  </Button>
                </>
              )}
              {canRegister && onRegister && (
                <Button className="h-9" onClick={onRegister}>
                  Register
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvitationPreviewModal;
