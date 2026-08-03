import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useManagerSession } from '@/contexts/ManagerSessionContext';
import { StatsCard } from '@/components/common/StatsCard';
import {
  getManagerDashboard,
} from '@/api/dashboardApi';
import {
  Users,
  UserPlus,
  Flag,
  ClipboardList,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Mail,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Approved':
      return 'bg-green-100 text-green-800';
    case 'Submitted':
      return 'bg-blue-100 text-blue-800';
    case 'Under Review':
      return 'bg-yellow-100 text-yellow-800';
    case 'Rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const ManagerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { manager } = useManagerSession();
  const {
    data: dashboard,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['manager', 'dashboard'],
    queryFn: getManagerDashboard,
    enabled: !!manager,
  });

  const error = queryError
    ? (queryError as any)?.response?.data?.message ||
      (queryError as any)?.message ||
      'Failed to load manager dashboard'
    : null;

  const displayName =
    dashboard?.managerName ||
    manager?.firstName ||
    manager?.name ||
    'Manager';
  const displayCountry =
    dashboard?.country ||
    manager?.country ||
    dashboard?.organization ||
    manager?.organization ||
    'your delegation';

  const { stats, teams, delegations, alerts, recentActivity } = dashboard || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {displayName}!</h1>
          <p className="text-muted-foreground mt-1">
            {dashboard ? `Manage your delegation for ${displayCountry}` : 'Manager dashboard'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-muted animate-pulse rounded-xl" />
        </div>
      ) : error || !dashboard ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-4">
            <AlertTriangle className="h-10 w-10 mx-auto text-destructive" />
            <div>
              <p className="font-medium">Could not load dashboard</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <Button onClick={() => void refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatsCard title="Total Teams" value={stats.totalTeams} icon={Users} />
            <StatsCard title="Total Members" value={stats.totalMembers} icon={UserPlus} />
            <StatsCard title="Delegations" value={stats.totalDelegations} icon={Flag} />
            <StatsCard
              title="Pending Approval"
              value={stats.pendingApproval}
              icon={ClipboardList}
              variant={stats.pendingApproval > 0 ? 'warning' : 'default'}
            />
          </div>

          {(stats.pendingRegistrations > 0 || stats.pendingInvitations > 0 || stats.approvedTeams > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.approvedTeams > 0 && (
                <StatsCard title="Approved Teams" value={stats.approvedTeams} icon={Users} variant="success" />
              )}
              {stats.pendingRegistrations > 0 && (
                <StatsCard
                  title="Pending Registrations"
                  value={stats.pendingRegistrations}
                  icon={ClipboardList}
                  variant="warning"
                />
              )}
              {stats.pendingInvitations > 0 && (
                <StatsCard
                  title="Pending Invitations"
                  value={stats.pendingInvitations}
                  icon={Mail}
                  variant="primary"
                />
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/manager/teams')}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Manage Teams</h3>
                  <p className="text-sm text-muted-foreground">Create and organize sport teams</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/manager/add-members')}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <UserPlus className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Add Members</h3>
                  <p className="text-sm text-muted-foreground">Register athletes and staff</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/manager/delegations')}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Flag className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Submit Delegation</h3>
                  <p className="text-sm text-muted-foreground">Finalize and submit your teams</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>

          {(alerts.length > 0 || recentActivity.length > 0) && (
            <div className="grid gap-6 lg:grid-cols-2">
              {alerts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Alerts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {alerts.map((alert, index) => (
                      <div
                        key={`${alert.message}-${index}`}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        <AlertTriangle className="h-5 w-5 mt-0.5 text-status-warning shrink-0" />
                        <span className="text-sm">{alert.message}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {recentActivity.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <div key={`${activity.action}-${index}`} className="flex items-center gap-4">
                        <div className="h-2 w-2 rounded-full bg-accent shrink-0" />
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
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {teams.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Teams</CardTitle>
                <CardDescription>Recently created teams</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teams.slice(0, 5).map(team => (
                    <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg gap-3">
                      <div>
                        <h4 className="font-medium">{team.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {[team.sportCategory, `${team.memberCount} members`, team.eventName].filter(Boolean).join(' • ')}
                        </p>
                      </div>
                      <Badge className={getStatusColor(team.status)}>{team.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {delegations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Delegations</CardTitle>
                <CardDescription>Delegation status overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {delegations.slice(0, 5).map(delegation => (
                    <div key={delegation.id} className="flex items-center justify-between p-3 border rounded-lg gap-3">
                      <div>
                        <h4 className="font-medium">{delegation.name || delegation.eventName || 'Delegation'}</h4>
                        <p className="text-sm text-muted-foreground">
                          {[delegation.eventName, delegation.teamCount ? `${delegation.teamCount} teams` : '']
                            .filter(Boolean)
                            .join(' • ')}
                        </p>
                      </div>
                      <Badge className={getStatusColor(delegation.status)}>{delegation.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default ManagerDashboard;
