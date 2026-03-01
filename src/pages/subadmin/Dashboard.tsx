import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/common/PageHeader';
import { StatsCard } from '@/components/common/StatsCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardCheck,
  FileText,
  Plane,
  Hotel,
  FileCheck2,
  Bus,
  BadgeCheck,
  Package,
  Users2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const SubAdminDashboard: React.FC = () => {
  const { t } = useTranslation();

  // Pending items by module
  const pendingItems = [
    { module: t('common.registrations'), icon: FileText, count: 8, urgent: 3, href: '/subadmin/registrations' },
    { module: t('common.visas'), icon: FileCheck2, count: 15, urgent: 5, href: '/subadmin/visas' },
    { module: t('common.travel'), icon: Plane, count: 5, urgent: 2, href: '/subadmin/travel' },
    { module: t('common.accommodation'), icon: Hotel, count: 3, urgent: 0, href: '/subadmin/accommodation' },
    { module: t('common.accreditation'), icon: BadgeCheck, count: 7, urgent: 4, href: '/subadmin/accreditation' },
    { module: t('common.equipment'), icon: Package, count: 2, urgent: 0, href: '/subadmin/equipment' },
  ];

  const recentActivity = [
    { id: 1, action: t('common.activity.reg_approved'), participant: 'Sarah Mitchell', time: t('common.activity.min_ago', { count: 5 }), type: 'success' },
    { id: 2, action: t('common.activity.flagged_doc'), participant: 'Hans Mueller', time: t('common.activity.min_ago', { count: 12 }), type: 'warning' },
    { id: 3, action: t('common.activity.updated_travel'), participant: 'Priya Sharma', time: t('common.activity.min_ago', { count: 25 }), type: 'info' },
    { id: 4, action: t('common.activity.rejected_photo'), participant: 'Carlos Rodriguez', time: t('common.activity.hour_ago', { count: 1 }), type: 'error' },
    { id: 5, action: t('common.activity.allocated_room'), participant: 'Mohammed Al-Rashid', time: t('common.activity.hours_ago', { count: 2 }), type: 'success' },
  ];

  const upcomingDeadlines = [
    { task: t('common.visas'), date: '2024-07-20', daysLeft: 3 },
    { task: t('common.accreditation'), date: '2024-07-22', daysLeft: 5 },
    { task: t('common.transportation'), date: '2024-07-25', daysLeft: 8 },
    { task: t('common.accommodation'), date: '2024-07-28', daysLeft: 11 },
  ];
  const totalPending = pendingItems.reduce((acc, item) => acc + item.count, 0);
  const totalUrgent = pendingItems.reduce((acc, item) => acc + item.urgent, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('common.ops_dashboard')}
        description={t('common.ops_dashboard_desc')}
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t('common.pending_reviews')}
          value={totalPending}
          icon={ClipboardCheck}
          trend={{ value: 12, isPositive: false }}
        />
        <StatsCard
          title={t('common.urgent_items')}
          value={totalUrgent}
          icon={AlertTriangle}
          trend={{ value: 3, isPositive: false }}
        />
        <StatsCard
          title={t('common.processed_today')}
          value={24}
          icon={CheckCircle2}
          trend={{ value: 15, isPositive: true }}
        />
        <StatsCard
          title={t('common.avg_processing_time')}
          value="2.4h"
          icon={Clock}
          trend={{ value: 8, isPositive: true }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pending by Module */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">{t('common.pending_by_module')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {pendingItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.module}
                    to={item.href}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{item.module}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.count} {t('common.pending')}
                          {item.urgent > 0 && (
                            <span className="text-destructive ml-1">
                              ({item.urgent} {t('common.urgent_items').toLowerCase()})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              {t('common.upcoming_deadlines')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingDeadlines.map((deadline, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{deadline.task}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(deadline.date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant={deadline.daysLeft <= 3 ? 'destructive' : deadline.daysLeft <= 7 ? 'secondary' : 'outline'}
                  >
                    {t('common.days_left', { count: deadline.daysLeft })}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Processing Queue + Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('common.quick_queue')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileCheck2 className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-sm">{t('common.alerts.visa_deadline', { count: 5 })}</p>
                    <p className="text-xs text-muted-foreground">SLA: Review within 24 hours</p>
                  </div>
                </div>
                <Button size="sm" asChild>
                  <Link to="/subadmin/visas">{t('common.view')}</Link>
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <BadgeCheck className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-sm">{t('common.alerts.pending_review', { count: 7 })}</p>
                    <p className="text-xs text-muted-foreground">Check photo quality standards</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/subadmin/accreditation">{t('common.status')}</Link>
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Bus className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Transport Routes Need Update</p>
                    <p className="text-xs text-muted-foreground">2 route changes pending</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/subadmin/transportation">Update</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('common.recent_activity')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-full mt-0.5 ${activity.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                    activity.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                      activity.type === 'error' ? 'bg-red-100 text-red-600' :
                        'bg-blue-100 text-blue-600'
                    }`}>
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{activity.action}</span>
                      {' for '}
                      <span className="text-muted-foreground">{activity.participant}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Module Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('common.module_overview')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: 'Invitations', sent: 847, total: 1000, color: 'bg-blue-500' },
              { name: 'Registrations', approved: 312, total: 450, color: 'bg-emerald-500' },
              { name: 'Travel Booked', booked: 186, total: 280, color: 'bg-purple-500' },
              { name: 'Visas Processed', processed: 142, total: 195, color: 'bg-amber-500' },
            ].map((stat) => {
              const progress = Math.round(((stat as any).sent || (stat as any).approved || (stat as any).booked || (stat as any).processed) / stat.total * 100);
              return (
                <div key={stat.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t(`common.${stat.name.toLowerCase()}`)}</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {(stat as any).sent || (stat as any).approved || (stat as any).booked || (stat as any).processed} / {stat.total}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubAdminDashboard;
