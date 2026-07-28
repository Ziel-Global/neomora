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
  return name.includes('vip') || name.includes('exclusive') ||
         subject.includes('vip') || subject.includes('exclusive');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center gap-3 flex-wrap">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Invitation Preview
            </DialogTitle>
            <Badge
              variant={isVIP ? 'default' : 'secondary'}
              className={isVIP ? 'bg-amber-500 hover:bg-amber-600 text-amber-950' : ''}
            >
              {isVIP ? (
                <>
                  <Crown className="h-3 w-3 mr-1" />
                  VIP
                </>
              ) : (
                <>
                  <Star className="h-3 w-3 mr-1" />
                  Standard
                </>
              )}
            </Badge>
            {invitationStatus && (
              <Badge variant="outline">{invitationStatus}</Badge>
            )}
          </div>
          <DialogDescription>
            {template.name} - Review the invitation and respond to RSVP.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-4">
          <InvitationTemplatePreview
            template={template}
            event={event}
            participant={participant}
            rsvpDeadline={rsvpDeadline}
          />
        </div>

        <div className="p-6 pt-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>

          <div className="flex flex-wrap gap-2 justify-end">
            {canRespond && onRespond && (
              <>
                <Button
                  disabled={isResponding}
                  onClick={() => onRespond('Accepted')}
                >
                  {isResponding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept'}
                </Button>
                <Button
                  variant="outline"
                  disabled={isResponding}
                  onClick={() => onRespond('Maybe')}
                >
                  Maybe
                </Button>
                <Button
                  variant="destructive"
                  disabled={isResponding}
                  onClick={() => onRespond('Declined')}
                >
                  Decline
                </Button>
              </>
            )}
            {canRegister && onRegister && (
              <Button onClick={onRegister}>
                Register
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvitationPreviewModal;
