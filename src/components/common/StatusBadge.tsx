import React from 'react';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  HelpCircle,
  Loader2,
  Send,
  FileCheck,
  Plane,
  Hotel,
  BadgeCheck,
  FileText
} from 'lucide-react';

type StatusVariant =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'pending'
  | 'neutral';

interface StatusConfig {
  variant: StatusVariant;
  icon: React.ElementType;
}

const statusConfigs: Record<string, StatusConfig> = {
  // RSVP
  'Yes': { variant: 'success', icon: CheckCircle2 },
  'No': { variant: 'error', icon: XCircle },
  'Maybe': { variant: 'warning', icon: HelpCircle },
  'Invited': { variant: 'info', icon: Send },

  // Registration
  'Draft': { variant: 'neutral', icon: FileText },
  'Submitted': { variant: 'info', icon: Send },
  'Under Review': { variant: 'warning', icon: Clock },
  'Approved': { variant: 'success', icon: CheckCircle2 },
  'Rejected': { variant: 'error', icon: XCircle },
  'Update Requested': { variant: 'warning', icon: AlertCircle },

  // Documents
  'Pending': { variant: 'pending', icon: Clock },
  'Verified': { variant: 'success', icon: FileCheck },

  // Travel
  'Not Required': { variant: 'neutral', icon: Plane },
  'Requested': { variant: 'info', icon: Send },
  'Proposed': { variant: 'warning', icon: Clock },
  'Ticketed': { variant: 'success', icon: Plane },
  'Changed': { variant: 'warning', icon: AlertCircle },

  // Accommodation
  'Allocated': { variant: 'info', icon: Hotel },
  'Confirmed': { variant: 'success', icon: CheckCircle2 },
  'Checked-In': { variant: 'success', icon: BadgeCheck },

  // Visa
  'Docs Pending': { variant: 'warning', icon: FileText },
  'Ready': { variant: 'info', icon: FileCheck },

  // Badge
  'Ready to Print': { variant: 'info', icon: FileCheck },
  'Printed': { variant: 'success', icon: BadgeCheck },
  'Collected': { variant: 'success', icon: CheckCircle2 },
  'Revoked': { variant: 'error', icon: XCircle },

  // Event
  'Published': { variant: 'success', icon: CheckCircle2 },
  'Ongoing': { variant: 'info', icon: Loader2 },
  'Closed': { variant: 'neutral', icon: XCircle },

  // Campaign
  'Scheduled': { variant: 'info', icon: Clock },
  'Sent': { variant: 'success', icon: Send },
  'Completed': { variant: 'success', icon: CheckCircle2 },
};

const variantStyles: Record<StatusVariant, string> = {
  success: 'bg-status-success-bg text-status-success',
  error: 'bg-status-error-bg text-status-error',
  warning: 'bg-status-warning-bg text-status-warning',
  info: 'bg-status-info-bg text-status-info',
  pending: 'bg-status-pending-bg text-status-pending',
  neutral: 'bg-muted text-muted-foreground',
};

interface StatusBadgeProps {
  status: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'default';
  variant?: 'success' | 'error' | 'warning' | 'info' | 'pending' | 'neutral' | 'destructive' | 'secondary' | 'default';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showIcon = true,
  size = 'md',
  variant,
  className,
}) => {
  // Map external variant names to internal ones
  const mapVariant = (v?: string): StatusVariant => {
    if (!v) return 'neutral';
    switch (v) {
      case 'success': return 'success';
      case 'destructive':
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      case 'pending': return 'pending';
      default: return 'neutral';
    }
  };

  const config = variant
    ? { variant: mapVariant(variant), icon: statusConfigs[status]?.icon || HelpCircle }
    : (statusConfigs[status] || { variant: 'neutral' as StatusVariant, icon: HelpCircle });
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'status-badge',
        variantStyles[config.variant],
        (size === 'sm' || size === 'default') && size === 'sm' && 'text-[10px] px-2 py-0.5',
        className
      )}
    >
      {showIcon && <Icon className={cn('h-3 w-3', size === 'sm' && 'h-2.5 w-2.5')} />}
      {status}
    </span>
  );
};
