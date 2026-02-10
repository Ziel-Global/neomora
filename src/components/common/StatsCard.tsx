import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  className?: string;
}

const variantStyles = {
  default: {
    icon: 'bg-muted text-muted-foreground',
    trend: '',
  },
  primary: {
    icon: 'bg-accent/10 text-accent',
    trend: 'text-accent',
  },
  success: {
    icon: 'bg-status-success-bg text-status-success',
    trend: 'text-status-success',
  },
  warning: {
    icon: 'bg-status-warning-bg text-status-warning',
    trend: 'text-status-warning',
  },
  error: {
    icon: 'bg-status-error-bg text-status-error',
    trend: 'text-status-error',
  },
};

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  variant = 'default',
  className,
}) => {
  const styles = variantStyles[variant];

  return (
    <div className={cn('kpi-card group', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
        </div>
        <div className={cn('rounded-lg p-2.5', styles.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      
      {(description || trend) && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          {trend && (
            <span className={cn(
              'inline-flex items-center gap-1 font-medium',
              trend.isPositive ? 'text-status-success' : 'text-status-error'
            )}>
              {trend.isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {Math.abs(trend.value)}%
            </span>
          )}
          {description && (
            <span className="text-muted-foreground">{description}</span>
          )}
        </div>
      )}
    </div>
  );
};
