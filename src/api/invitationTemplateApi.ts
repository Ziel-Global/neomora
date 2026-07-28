import {
  BACKEND_INVITATION_TEMPLATE_IDS,
  dedupeInvitationTemplates,
  EMSInvitationTemplate,
  normalizeInvitationTemplate,
} from '@/lib/emsStore';

export const getDefaultInvitationTemplates = (): EMSInvitationTemplate[] => [
  {
    id: BACKEND_INVITATION_TEMPLATE_IDS.STANDARD,
    name: 'Standard Invitation',
    subject: 'Invitation to {{eventName}}',
    body: 'Hello {{firstName}}, you are cordially invited to {{eventName}}. Please RSVP by {{rsvpDeadline}}.',
    language: 'en',
    variables: ['firstName', 'eventName', 'rsvpDeadline'],
    createdAt: new Date().toISOString(),
  },
  {
    id: BACKEND_INVITATION_TEMPLATE_IDS.VIP,
    name: 'VIP Invitation',
    subject: 'Exclusive VIP Invitation: {{eventName}}',
    body: 'Dear {{firstName}}, you are invited as a VIP guest to {{eventName}}. Please RSVP by {{rsvpDeadline}}.',
    language: 'en',
    variables: ['firstName', 'eventName', 'rsvpDeadline'],
    createdAt: new Date().toISOString(),
  },
];

export const extractInvitationTemplatesFromCampaigns = (
  campaigns: Array<{ template?: unknown }>,
): EMSInvitationTemplate[] => {
  const collected: EMSInvitationTemplate[] = [...getDefaultInvitationTemplates()];

  for (const campaign of campaigns) {
    const normalized = normalizeInvitationTemplate(campaign?.template);
    if (normalized) {
      collected.push(normalized);
    }
  }

  return dedupeInvitationTemplates(collected);
};

/** Backend has no standalone templates list endpoint — use defaults + campaign embeds. */
export const getInvitationTemplates = async (
  campaigns: Array<{ template?: unknown }> = [],
): Promise<EMSInvitationTemplate[]> => extractInvitationTemplatesFromCampaigns(campaigns);
