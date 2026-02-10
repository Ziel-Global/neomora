import React, { useState, useEffect } from 'react';
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
    { type: 'error', message: '4 participants missing passport documents', link: '/admin/registrations' },
    { type: 'warning', message: '2 visa applications approaching SLA deadline', link: '/admin/visas' },
    { type: 'warning', message: '3 registrations pending review for 5+ days', link: '/admin/registrations' },
    { type: 'info', message: 'New campaign scheduled for tomorrow', link: '/admin/invitations' },
  ];

  const recentActivity = [
    { action: 'Registration approved', participant: 'Sarah Mitchell', time: '5 minutes ago' },
    { action: 'Badge printed', participant: 'Mohammed Al-Rashid', time: '12 minutes ago' },
    { action: 'Travel itinerary ticketed', participant: 'Priya Sharma', time: '1 hour ago' },
    { action: 'RSVP received', participant: 'James Thompson', time: '2 hours ago' },
    { action: 'Document verified', participant: 'Yuki Tanaka', time: '3 hours ago' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          subtitle="Overview of event operations"
        />
        <CardGridSkeleton count={8} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle={`${events[0]?.name || 'Event'} - ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Change Event
            </Button>
            <Button size="sm">
              Export Report
            </Button>
          </div>
        }
      />

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Invited"
          value={stats?.invited || 0}
          icon={Users}
          trend={{ value: 12, isPositive: true }}
          description="vs last event"
        />
        <StatsCard
          title="RSVP Confirmed"
          value={stats?.rsvpYes || 0}
          icon={CheckCircle2}
          variant="success"
          trend={{ value: 8, isPositive: true }}
          description={`${stats?.rsvpPending || 0} pending`}
        />
        <StatsCard
          title="Registrations"
          value={stats?.regApproved || 0}
          icon={FileText}
          variant="primary"
          description={`${stats?.regPending || 0} under review`}
        />
        <StatsCard
          title="Pending Docs"
          value={(stats?.regPending || 0) + (stats?.visaPending || 0)}
          icon={Clock}
          variant="warning"
          description="Require attention"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Visas Approved"
          value={stats?.visaApproved || 0}
          icon={FileText}
          variant="success"
          description={`${stats?.visaPending || 0} in process`}
        />
        <StatsCard
          title="Travel Booked"
          value={stats?.travelTicketed || 0}
          icon={Plane}
          description={`${stats?.travelPending || 0} pending`}
        />
        <StatsCard
          title="Rooms Allocated"
          value={stats?.accomAllocated || 0}
          icon={Hotel}
          description="Across all hotels"
        />
        <StatsCard
          title="Badges Ready"
          value={(stats?.badgesPrinted || 0) + (stats?.badgesReady || 0)}
          icon={BadgeCheck}
          variant="success"
          description={`${stats?.badgesPending || 0} pending`}
        />
      </div>

      {/* Alerts and Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alerts Panel */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4 text-status-warning" />
              Alerts & Notifications
            </CardTitle>
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert, index) => (
              <Link
                key={index}
                to={alert.link}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <AlertTriangle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                  alert.type === 'error' ? 'text-status-error' :
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
              Recent Activity
            </CardTitle>
            <Button variant="ghost" size="sm">
              View All
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
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link to="/admin/registrations">
              <Button variant="outline" className="w-full justify-between h-auto py-4">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Review Registrations
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
                  Process Visas
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
                  Print Badges
                </span>
                <span className="bg-status-info-bg text-status-info text-xs px-2 py-0.5 rounded-full">
                  {stats?.badgesReady || 0}
                </span>
              </Button>
            </Link>
            <Link to="/admin/participants">
              <Button variant="outline" className="w-full justify-start h-auto py-4">
                <Users className="h-4 w-4 mr-2" />
                View All Participants
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
