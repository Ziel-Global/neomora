import React, { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { venueZones, getModuleStats } from '@/data/additionalMockData';
import { Users, AlertTriangle, CheckCircle, TrendingUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const CrowdManagementPage: React.FC = () => {
  const [zones, setZones] = useState(venueZones);
  const stats = getModuleStats().crowd;

  const getZoneStatus = (zone: typeof venueZones[0]) => {
    if (zone.currentOccupancy >= zone.criticalThreshold) return 'critical';
    if (zone.currentOccupancy >= zone.warningThreshold) return 'warning';
    return 'normal';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-destructive';
      case 'warning': return 'text-warning';
      default: return 'text-success';
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-destructive';
      case 'warning': return 'bg-warning';
      default: return 'bg-success';
    }
  };

  const simulateUpdate = () => {
    setZones(prev => prev.map(zone => ({
      ...zone,
      currentOccupancy: Math.max(0, Math.min(zone.maxCapacity, 
        zone.currentOccupancy + Math.floor(Math.random() * 200 - 100)
      ))
    })));
  };

  const totalCapacity = zones.reduce((acc, z) => acc + z.maxCapacity, 0);
  const totalOccupancy = zones.reduce((acc, z) => acc + z.currentOccupancy, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Crowd Management"
        description="Monitor venue capacity and occupancy in real-time"
        action={
          <Button variant="outline" onClick={simulateUpdate}>
            <RefreshCw className="h-4 w-4 mr-2" />Refresh Data
          </Button>
        }
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalOccupancy.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Occupancy</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-success/10">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.normal}</p>
              <p className="text-sm text-muted-foreground">Normal Zones</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-warning/10">
              <TrendingUp className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.warning}</p>
              <p className="text-sm text-muted-foreground">Warning Zones</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.critical}</p>
              <p className="text-sm text-muted-foreground">Critical Zones</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Capacity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Overall Venue Capacity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{totalOccupancy.toLocaleString()} / {totalCapacity.toLocaleString()}</span>
              <span className="font-medium">{Math.round((totalOccupancy / totalCapacity) * 100)}%</span>
            </div>
            <Progress value={(totalOccupancy / totalCapacity) * 100} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Zone Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {zones.map((zone) => {
          const status = getZoneStatus(zone);
          const percentage = Math.round((zone.currentOccupancy / zone.maxCapacity) * 100);
          
          return (
            <Card key={zone.id} className={cn(
              "transition-all",
              status === 'critical' && "border-destructive/50 bg-destructive/5",
              status === 'warning' && "border-warning/50 bg-warning/5"
            )}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{zone.name}</CardTitle>
                  {status === 'critical' && (
                    <Badge variant="destructive" className="animate-pulse">CRITICAL</Badge>
                  )}
                  {status === 'warning' && (
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">WARNING</Badge>
                  )}
                  {status === 'normal' && (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">NORMAL</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{zone.venue}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <p className={cn("text-4xl font-bold", getStatusColor(status))}>
                    {zone.currentOccupancy.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    of {zone.maxCapacity.toLocaleString()} capacity
                  </p>
                </div>
                
                <div className="space-y-1">
                  <Progress 
                    value={percentage} 
                    className={cn("h-2", getProgressColor(status))}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{percentage}% full</span>
                    <span>{zone.maxCapacity - zone.currentOccupancy} available</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-muted/50 rounded">
                    <p className="text-muted-foreground">Warning at</p>
                    <p className="font-medium">{zone.warningThreshold.toLocaleString()}</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <p className="text-muted-foreground">Critical at</p>
                    <p className="font-medium">{zone.criticalThreshold.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CrowdManagementPage;
