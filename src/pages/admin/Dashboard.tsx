import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/common/PageHeader';
import { StatsCard } from '@/components/common/StatsCard';
import { CardGridSkeleton } from '@/components/common/LoadingSkeleton';
import {
  getAdminDashboard,
  AdminDashboardData,
  AdminDashboardAlert,
} from '@/api/dashboardApi';
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
  Loader2,
  RefreshCw,
  Flag,
  Mail,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link, useParams } from 'react-router-dom';
import { getEvents } from '@/api/eventApi';

const buildFallbackAlerts = (
  stats: AdminDashboardData['stats'],
  t: (key: string, options?: Record<string, unknown>) => string,
  eventBasePath: string,
): AdminDashboardAlert[] => {
  const alerts: AdminDashboardAlert[] = [];

  if (stats.regUnderReview > 0 || stats.regPending > 0) {
    alerts.push({
      type: 'warning',
      message: t('common.alerts.pending_review', { count: stats.regUnderReview || stats.regPending }),
      link: `${eventBasePath}/registrations`,
    });
  }
  if (stats.visaPending > 0) {
    alerts.push({
      type: 'warning',
      message: t('common.alerts.visa_deadline', { count: stats.visaPending }),
      link: `${eventBasePath}/visas`,
    });
  }
  if (stats.pendingInvitations > 0) {
    alerts.push({
      type: 'info',
      message: `${stats.pendingInvitations} invitation(s) pending delivery or response`,
      link: `${eventBasePath}/invitations`,
    });
  }
  if (stats.rsvpPending > 0) {
    alerts.push({
      type: 'info',
      message: `${stats.rsvpPending} RSVP(s) awaiting response`,
      link: `${eventBasePath}/invitations`,
    });
  }

  return alerts;
};

const AdminDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { eventId } = useParams<{ eventId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [eventName, setEventName] = useState<string | undefined>();

  const eventBasePath = eventId ? `/admin/events/${eventId}` : '/admin';

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [data, events] = await Promise.all([
        getAdminDashboard(eventId),
        eventId ? getEvents().catch(() => []) : Promise.resolve([]),
      ]);
      setDashboard(data);

      if (eventId) {
        const matchedEvent = events.find(
          event => String(event.id || (event as any)._id) === String(eventId),
        );
        setEventName(data.eventName || matchedEvent?.name);
      } else {
        setEventName(data.eventName);
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to load admin dashboard';
      setError(message);
      setDashboard(null);
      setEventName(undefined);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

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

  if (error || !dashboard) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('common.dashboard')}
          subtitle="Overview of event operations"
        />
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-4">
            <AlertTriangle className="h-10 w-10 mx-auto text-destructive" />
            <div>
              <p className="font-medium">Could not load dashboard</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <Button onClick={() => void loadDashboard()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { stats } = dashboard;
  const alerts = dashboard.alerts.length > 0
    ? dashboard.alerts.map(alert => ({
        ...alert,
        link: alert.link?.startsWith('/admin/events/')
          ? alert.link
          : alert.link?.replace(/^\/admin(?=\/|$)/, eventBasePath) || alert.link,
      }))
    : buildFallbackAlerts(stats, t, eventBasePath);
  const recentActivity = dashboard.recentActivity;
  const subtitleDate = new Date().toLocaleDateString(i18n.language, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const subtitle = eventName
    ? `${eventName} - ${subtitleDate}`
    : dashboard.eventName
      ? `${dashboard.eventName} - ${subtitleDate}`
      : subtitleDate;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={t('common.dashboard')}
        subtitle={subtitle}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void loadDashboard()}>
              <RefreshCw className="h-4 w-4 me-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin">
                <Calendar className="h-4 w-4 me-2" />
                {t('common.change_event')}
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t('common.total_invited')}
          value={stats.invited || stats.totalParticipants}
          icon={Users}
          description={
            stats.totalParticipants > 0
              ? `${stats.totalParticipants} total participants`
              : undefined
          }
        />
        <StatsCard
          title={t('common.rsvp_confirmed')}
          value={stats.rsvpYes}
          icon={CheckCircle2}
          variant="success"
          description={
            stats.rsvpPending > 0
              ? t('common.pending_count', { count: stats.rsvpPending })
              : undefined
          }
        />
        <StatsCard
          title={t('common.registrations')}
          value={stats.regTotal || stats.regApproved}
          icon={FileText}
          variant="primary"
          description={
            stats.regTotal > 0
              ? `${stats.regApproved} approved · ${stats.regUnderReview || stats.regPending} under review`
              : t('common.under_review_count', { count: stats.regUnderReview || stats.regPending })
          }
        />
        <StatsCard
          title={t('common.pending_docs')}
          value={(stats.regUnderReview || stats.regPending) + stats.visaPending}
          icon={Clock}
          variant="warning"
          description={
            stats.regUnderReview || stats.regPending
              ? `${stats.regUnderReview || stats.regPending} registration(s) under review`
              : t('common.require_attention')
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t('common.visas_approved')}
          value={stats.visaApproved}
          icon={FileText}
          variant="success"
          description={t('common.in_process_count', { count: stats.visaPending })}
        />
        <StatsCard
          title={t('common.travel_booked')}
          value={stats.travelTicketed}
          icon={Plane}
          description={t('common.pending_count', { count: stats.travelPending })}
        />
        <StatsCard
          title={t('common.rooms_allocated')}
          value={stats.accomAllocated}
          icon={Hotel}
          description={t('common.across_all_hotels')}
        />
        <StatsCard
          title={t('common.badges_ready')}
          value={stats.badgesPrinted + stats.badgesReady}
          icon={BadgeCheck}
          variant="success"
          description={t('common.pending_count', { count: stats.badgesPending })}
        />
      </div>

      {!eventId && (stats.totalEvents > 0 ||
        stats.totalDelegations > 0 ||
        stats.totalTeams > 0 ||
        stats.totalCampaigns > 0) && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.totalEvents > 0 && (
            <StatsCard title="Events" value={stats.totalEvents} icon={Calendar} />
          )}
          {stats.totalDelegations > 0 && (
            <StatsCard title="Delegations" value={stats.totalDelegations} icon={Flag} />
          )}
          {stats.totalTeams > 0 && (
            <StatsCard title="Teams" value={stats.totalTeams} icon={Users} />
          )}
          {stats.totalCampaigns > 0 && (
            <StatsCard
              title="Campaigns"
              value={stats.totalCampaigns}
              icon={Mail}
              description={
                stats.pendingInvitations > 0
                  ? `${stats.pendingInvitations} pending invitations`
                  : undefined
              }
            />
          )}
        </div>
      )}

      {eventId && (stats.totalDelegations > 0 || stats.totalTeams > 0 || stats.totalCampaigns > 0) && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.totalDelegations > 0 && (
            <StatsCard title="Delegations" value={stats.totalDelegations} icon={Flag} />
          )}
          {stats.totalTeams > 0 && (
            <StatsCard title="Teams" value={stats.totalTeams} icon={Users} />
          )}
          {stats.totalCampaigns > 0 && (
            <StatsCard
              title="Campaigns"
              value={stats.totalCampaigns}
              icon={Mail}
              description={
                stats.pendingInvitations > 0
                  ? `${stats.pendingInvitations} pending invitations`
                  : undefined
              }
            />
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4 text-status-warning" />
              {t('common.alerts_notifications')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No alerts right now.
              </p>
            ) : (
              alerts.map((alert, index) => {
                const content = (
                  <>
                    <AlertTriangle
                      className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                        alert.type === 'error'
                          ? 'text-status-error'
                          : alert.type === 'warning'
                            ? 'text-status-warning'
                            : 'text-status-info'
                      }`}
                    />
                    <span className="text-sm">{alert.message}</span>
                  </>
                );

                return alert.link ? (
                  <Link
                    key={`${alert.message}-${index}`}
                    to={alert.link}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    {content}
                  </Link>
                ) : (
                  <div
                    key={`${alert.message}-${index}`}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    {content}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              {t('common.recent_activity')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No recent activity from the dashboard API yet.
              </p>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={`${activity.action}-${index}`} className="flex items-center gap-4">
                    <div className="h-2 w-2 rounded-full bg-accent flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.action}</p>
                      {activity.participant && (
                        <p className="text-xs text-muted-foreground">{activity.participant}</p>
                      )}
                    </div>
                    {activity.time && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {activity.time}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">{t('common.quick_actions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link to={`${eventBasePath}/registrations`}>
              <Button variant="outline" className="w-full justify-between h-auto py-4">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t('common.review_registrations')}
                </span>
                {(stats.regUnderReview > 0 || stats.regPending > 0) && (
                  <span className="bg-status-warning-bg text-status-warning text-xs px-2 py-0.5 rounded-full">
                    {stats.regUnderReview || stats.regPending}
                  </span>
                )}
              </Button>
            </Link>
            <Link to={`${eventBasePath}/visas`}>
              <Button variant="outline" className="w-full justify-between h-auto py-4">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t('common.process_visas')}
                </span>
                {stats.visaPending > 0 && (
                  <span className="bg-status-warning-bg text-status-warning text-xs px-2 py-0.5 rounded-full">
                    {stats.visaPending}
                  </span>
                )}
              </Button>
            </Link>
            <Link to={`${eventBasePath}/accreditation`}>
              <Button variant="outline" className="w-full justify-between h-auto py-4">
                <span className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4" />
                  {t('common.print_badges')}
                </span>
                {stats.badgesReady > 0 && (
                  <span className="bg-status-info-bg text-status-info text-xs px-2 py-0.5 rounded-full">
                    {stats.badgesReady}
                  </span>
                )}
              </Button>
            </Link>
            <Link to={`${eventBasePath}/participants`}>
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
