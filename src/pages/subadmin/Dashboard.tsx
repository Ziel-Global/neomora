import React from 'react';
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

// Pending items by module
const pendingItems = [
  { module: 'Registrations', icon: FileText, count: 8, urgent: 3, href: '/subadmin/registrations' },
  { module: 'Visa Documents', icon: FileCheck2, count: 15, urgent: 5, href: '/subadmin/visas' },
  { module: 'Travel Requests', icon: Plane, count: 5, urgent: 2, href: '/subadmin/travel' },
  { module: 'Accommodation', icon: Hotel, count: 3, urgent: 0, href: '/subadmin/accommodation' },
  { module: 'Accreditation', icon: BadgeCheck, count: 7, urgent: 4, href: '/subadmin/accreditation' },
  { module: 'Equipment', icon: Package, count: 2, urgent: 0, href: '/subadmin/equipment' },
];

const recentActivity = [
  { id: 1, action: 'Approved registration', participant: 'Sarah Mitchell', time: '5 min ago', type: 'success' },
  { id: 2, action: 'Flagged document', participant: 'Hans Mueller', time: '12 min ago', type: 'warning' },
  { id: 3, action: 'Updated travel itinerary', participant: 'Priya Sharma', time: '25 min ago', type: 'info' },
  { id: 4, action: 'Rejected photo upload', participant: 'Carlos Rodriguez', time: '1 hour ago', type: 'error' },
  { id: 5, action: 'Allocated room', participant: 'Mohammed Al-Rashid', time: '2 hours ago', type: 'success' },
];

const upcomingDeadlines = [
  { task: 'Visa batch submission', date: '2024-07-20', daysLeft: 3 },
  { task: 'Badge printing queue review', date: '2024-07-22', daysLeft: 5 },
  { task: 'Transport manifest finalization', date: '2024-07-25', daysLeft: 8 },
  { task: 'Hotel rooming list confirmation', date: '2024-07-28', daysLeft: 11 },
];

const SubAdminDashboard: React.FC = () => {
  const totalPending = pendingItems.reduce((acc, item) => acc + item.count, 0);
  const totalUrgent = pendingItems.reduce((acc, item) => acc + item.urgent, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations Dashboard"
        description="Review and process pending items across all modules"
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Pending Reviews"
          value={totalPending}
          icon={ClipboardCheck}
          trend={{ value: 12, isPositive: false }}
        />
        <StatsCard
          title="Urgent Items"
          value={totalUrgent}
          icon={AlertTriangle}
          trend={{ value: 3, isPositive: false }}
        />
        <StatsCard
          title="Processed Today"
          value={24}
          icon={CheckCircle2}
          trend={{ value: 15, isPositive: true }}
        />
        <StatsCard
          title="Avg. Processing Time"
          value="2.4h"
          icon={Clock}
          trend={{ value: 8, isPositive: true }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pending by Module */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Pending Items by Module</CardTitle>
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
                          {item.count} pending
                          {item.urgent > 0 && (
                            <span className="text-destructive ml-1">
                              ({item.urgent} urgent)
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
              Upcoming Deadlines
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
                    {deadline.daysLeft}d left
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
            <CardTitle className="text-lg">Quick Processing Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileCheck2 className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-sm">5 Visa Documents Awaiting Review</p>
                    <p className="text-xs text-muted-foreground">SLA: Review within 24 hours</p>
                  </div>
                </div>
                <Button size="sm" asChild>
                  <Link to="/subadmin/visas">Review Now</Link>
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <BadgeCheck className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-sm">7 Badge Photos Need Validation</p>
                    <p className="text-xs text-muted-foreground">Check photo quality standards</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/subadmin/accreditation">Validate</Link>
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
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-full mt-0.5 ${
                    activity.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
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
          <CardTitle className="text-lg">Module Completion Overview</CardTitle>
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
                    <span className="text-muted-foreground">{stat.name}</span>
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
