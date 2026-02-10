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
import { Eye, Crown, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface InvitationPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EMSInvitationTemplate | null;
  event?: EMSEvent | null;
  participant?: EMSParticipant | null;
  rsvpDeadline?: string;
}

// Check if template is VIP based on name/subject
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
}) => {
  if (!template) return null;
  
  const isVIP = isVIPTemplate(template);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center gap-3">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Template Preview
            </DialogTitle>
            <Badge 
              variant={isVIP ? "default" : "secondary"}
              className={isVIP ? "bg-amber-500 hover:bg-amber-600 text-amber-950" : ""}
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
          </div>
          <DialogDescription>
            {template.name} - {isVIP ? 'Luxury VIP design' : 'Standard design'}
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
        
        <div className="p-6 pt-0 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close Preview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvitationPreviewModal;
