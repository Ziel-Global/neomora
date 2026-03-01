import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/common/PageHeader';
import { StatsCard } from '@/components/common/StatsCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { CardGridSkeleton } from '@/components/common/LoadingSkeleton';
import { getDashboardStats, events, participants, registrations, rsvps } from '@/data/mockData';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plane,
  Hotel,
  BadgeCheck,
  FileText,
  TrendingUp,
  Bell,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';


const AdminDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<ReturnType<typeof getDashboardStats> | null>(null);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setStats(getDashboardStats());
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const alerts = [
    { type: 'error', message: t('common.alerts.missing_passports', { count: 4 }), link: '/admin/registrations' },
    { type: 'warning', message: t('common.alerts.visa_deadline', { count: 2 }), link: '/admin/visas' },
    { type: 'warning', message: t('common.alerts.pending_review', { count: 3 }), link: '/admin/registrations' },
    { type: 'info', message: t('common.alerts.new_campaign'), link: '/admin/invitations' },
  ];

  const recentActivity = [
    { action: t('common.activity.reg_approved'), participant: 'Sarah Mitchell', time: t('common.activity.min_ago', { count: 5 }) },
    { action: t('common.activity.badge_printed'), participant: 'Mohammed Al-Rashid', time: t('common.activity.min_ago', { count: 12 }) },
    { action: t('common.activity.travel_ticketed'), participant: 'Priya Sharma', time: t('common.activity.hour_ago', { count: 1 }) },
    { action: t('common.activity.rsvp_received'), participant: 'James Thompson', time: t('common.activity.hours_ago', { count: 2 }) },
    { action: t('common.activity.doc_verified'), participant: 'Yuki Tanaka', time: t('common.activity.hours_ago', { count: 3 }) },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('common.dashboard')}
          subtitle="Overview of event operations"
        />
        <CardGridSkeleton count={8} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('common.dashboard')}
        subtitle={`${events[0]?.name || t('common.event')} - ${new Date().toLocaleDateString(i18n.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 me-2" />
              {t('common.change_event')}
            </Button>
            <Button size="sm">
              {t('common.export_report')}
            </Button>
          </div>
        }
      />

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t('common.total_invited')}
          value={stats?.invited || 0}
          icon={Users}
          trend={{ value: 12, isPositive: true }}
          description={t('common.vs_last_event')}
        />
        <StatsCard
          title={t('common.rsvp_confirmed')}
          value={stats?.rsvpYes || 0}
          icon={CheckCircle2}
          variant="success"
          trend={{ value: 8, isPositive: true }}
          description={t('common.pending_count', { count: stats?.rsvpPending || 0 })}
        />
        <StatsCard
          title={t('common.registrations')}
          value={stats?.regApproved || 0}
          icon={FileText}
          variant="primary"
          description={t('common.under_review_count', { count: stats?.regPending || 0 })}
        />
        <StatsCard
          title={t('common.pending_docs')}
          value={(stats?.regPending || 0) + (stats?.visaPending || 0)}
          icon={Clock}
          variant="warning"
          description={t('common.require_attention')}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t('common.visas_approved')}
          value={stats?.visaApproved || 0}
          icon={FileText}
          variant="success"
          description={t('common.in_process_count', { count: stats?.visaPending || 0 })}
        />
        <StatsCard
          title={t('common.travel_booked')}
          value={stats?.travelTicketed || 0}
          icon={Plane}
          description={t('common.pending_count', { count: stats?.travelPending || 0 })}
        />
        <StatsCard
          title={t('common.rooms_allocated')}
          value={stats?.accomAllocated || 0}
          icon={Hotel}
          description={t('common.across_all_hotels')}
        />
        <StatsCard
          title={t('common.badges_ready')}
          value={(stats?.badgesPrinted || 0) + (stats?.badgesReady || 0)}
          icon={BadgeCheck}
          variant="success"
          description={t('common.pending_count', { count: stats?.badgesPending || 0 })}
        />
      </div>

      {/* Alerts and Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alerts Panel */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4 text-status-warning" />
              {t('common.alerts_notifications')}
            </CardTitle>
            <Button variant="ghost" size="sm">
              {t('common.view_all')}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert, index) => (
              <Link
                key={index}
                to={alert.link}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <AlertTriangle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${alert.type === 'error' ? 'text-status-error' :
                  alert.type === 'warning' ? 'text-status-warning' :
                    'text-status-info'
                  }`} />
                <span className="text-sm">{alert.message}</span>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              {t('common.recent_activity')}
            </CardTitle>
            <Button variant="ghost" size="sm">
              {t('common.view_all')}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="h-2 w-2 rounded-full bg-accent flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.participant}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {activity.time}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">{t('common.quick_actions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link to="/admin/registrations">
              <Button variant="outline" className="w-full justify-between h-auto py-4">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t('common.review_registrations')}
                </span>
                <span className="bg-status-warning-bg text-status-warning text-xs px-2 py-0.5 rounded-full">
                  {stats?.regPending || 0}
                </span>
              </Button>
            </Link>
            <Link to="/admin/visas">
              <Button variant="outline" className="w-full justify-between h-auto py-4">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t('common.process_visas')}
                </span>
                <span className="bg-status-warning-bg text-status-warning text-xs px-2 py-0.5 rounded-full">
                  {stats?.visaPending || 0}
                </span>
              </Button>
            </Link>
            <Link to="/admin/accreditation">
              <Button variant="outline" className="w-full justify-between h-auto py-4">
                <span className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4" />
                  {t('common.print_badges')}
                </span>
                <span className="bg-status-info-bg text-status-info text-xs px-2 py-0.5 rounded-full">
                  {stats?.badgesReady || 0}
                </span>
              </Button>
            </Link>
            <Link to="/admin/participants">
              <Button variant="outline" className="w-full justify-start h-auto py-4">
                <Users className="h-4 w-4 me-2" />
                {t('common.view_all_participants')}
                <ArrowRight className="h-4 w-4 ms-auto" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
