import React, { useState } from 'react';
import { AdminHomeHeader } from '@/components/layout/AdminHomeHeader';
import { PageHeader } from '@/components/common/PageHeader';
import { events, participants, rsvps, registrations, visaCases, travelBookings } from '@/data/mockData';
import { BarChart3, PieChart, Download, Filter, TrendingUp, Users, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend, FunnelChart, Funnel, LabelList } from 'recharts';

const ReportsPage: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('funnel');

  // Calculate funnel data
  const funnelData = [
    { name: 'Invited', value: 150, fill: 'hsl(var(--primary))' },
    { name: 'RSVP Yes', value: rsvps.filter(r => r.status === 'Yes').length * 15, fill: 'hsl(var(--chart-1))' },
    { name: 'Registered', value: registrations.length * 10, fill: 'hsl(var(--chart-2))' },
    { name: 'Approved', value: registrations.filter(r => r.status === 'Approved').length * 12, fill: 'hsl(var(--chart-3))' },
  ];

  // Role breakdown
  const roleData = [
    { name: 'Athlete', value: participants.filter(p => p.role === 'Athlete').length },
    { name: 'VIP', value: participants.filter(p => p.role === 'VIP').length },
    { name: 'VVIP', value: participants.filter(p => p.role === 'VVIP').length },
    { name: 'Official', value: participants.filter(p => p.role === 'Official').length },
    { name: 'Media', value: participants.filter(p => p.role === 'Media').length },
    { name: 'Other', value: participants.filter(p => !['Athlete', 'VIP', 'VVIP', 'Official', 'Media'].includes(p.role)).length },
  ];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  // Nationality breakdown
  const nationalityData = participants.reduce((acc, p) => {
    acc[p.nationality] = (acc[p.nationality] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const nationalityChartData = Object.entries(nationalityData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Status summary
  const statusSummary = {
    visas: {
      approved: visaCases.filter(v => v.status === 'Approved').length,
      pending: visaCases.filter(v => v.status === 'Docs Pending' || v.status === 'Submitted').length,
      total: visaCases.length,
    },
    travel: {
      ticketed: travelBookings.filter(t => t.status === 'Ticketed').length,
      pending: travelBookings.filter(t => t.status !== 'Ticketed').length,
      total: travelBookings.length,
    },
    registrations: {
      approved: registrations.filter(r => r.status === 'Approved').length,
      pending: registrations.filter(r => r.status !== 'Approved').length,
      total: registrations.length,
    },
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AdminHomeHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 animate-fade-in">
        <PageHeader
        title="Reports & Analytics"
        description="Comprehensive event analytics and export tools"
        action={
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />Export CSV
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />Export PDF
            </Button>
          </div>
        }
      />

      {/* Event Selector */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filter by Event:</span>
          </div>
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Select event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {events.map(event => (
                <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{participants.length}</p>
                <p className="text-sm text-muted-foreground">Total Participants</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.round((statusSummary.registrations.approved / statusSummary.registrations.total) * 100)}%</p>
                <p className="text-sm text-muted-foreground">Approval Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-chart-1/10">
                <Globe className="h-5 w-5 text-chart-1" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Object.keys(nationalityData).length}</p>
                <p className="text-sm text-muted-foreground">Nationalities</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-chart-2/10">
                <BarChart3 className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">{events.length}</p>
                <p className="text-sm text-muted-foreground">Active Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="breakdown">Participant Breakdown</TabsTrigger>
          <TabsTrigger value="status">Status Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="funnel" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registration Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {funnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-4 gap-4 mt-6">
                {funnelData.map((item, i) => (
                  <div key={i} className="text-center">
                    <p className="text-2xl font-bold">{item.value}</p>
                    <p className="text-sm text-muted-foreground">{item.name}</p>
                    {i > 0 && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        {Math.round((item.value / funnelData[i - 1].value) * 100)}% conversion
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By Role</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={roleData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {roleData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">By Nationality (Top 8)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={nationalityChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="status" className="mt-4">
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Registration Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Approved</span>
                    <span>{statusSummary.registrations.approved}/{statusSummary.registrations.total}</span>
                  </div>
                  <Progress value={(statusSummary.registrations.approved / statusSummary.registrations.total) * 100} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="text-center p-3 bg-success/10 rounded-lg">
                    <p className="text-2xl font-bold text-success">{statusSummary.registrations.approved}</p>
                    <p className="text-xs text-muted-foreground">Approved</p>
                  </div>
                  <div className="text-center p-3 bg-warning/10 rounded-lg">
                    <p className="text-2xl font-bold text-warning">{statusSummary.registrations.pending}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Visa Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Approved</span>
                    <span>{statusSummary.visas.approved}/{statusSummary.visas.total}</span>
                  </div>
                  <Progress value={(statusSummary.visas.approved / statusSummary.visas.total) * 100} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="text-center p-3 bg-success/10 rounded-lg">
                    <p className="text-2xl font-bold text-success">{statusSummary.visas.approved}</p>
                    <p className="text-xs text-muted-foreground">Approved</p>
                  </div>
                  <div className="text-center p-3 bg-warning/10 rounded-lg">
                    <p className="text-2xl font-bold text-warning">{statusSummary.visas.pending}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Travel Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Ticketed</span>
                    <span>{statusSummary.travel.ticketed}/{statusSummary.travel.total}</span>
                  </div>
                  <Progress value={(statusSummary.travel.ticketed / statusSummary.travel.total) * 100} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="text-center p-3 bg-success/10 rounded-lg">
                    <p className="text-2xl font-bold text-success">{statusSummary.travel.ticketed}</p>
                    <p className="text-xs text-muted-foreground">Ticketed</p>
                  </div>
                  <div className="text-center p-3 bg-warning/10 rounded-lg">
                    <p className="text-2xl font-bold text-warning">{statusSummary.travel.pending}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      </main>
    </div>
  );
};

export default ReportsPage;
