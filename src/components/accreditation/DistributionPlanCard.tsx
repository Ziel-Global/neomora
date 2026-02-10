import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MapPin, Clock, Users, CheckCircle2, Eye, User } from 'lucide-react';
import { CollectionPoint, collectionPoints, BadgeRecord, accreditationCategories } from '@/data/accreditationData';

interface DistributionPlanCardProps {
  badges: BadgeRecord[];
  profiles?: any[];
  onAssignCollection: (badgeId: string, pointId: string) => void;
  onAutoAssign?: (assignments: { badgeId: string; pointId: string }[]) => void;
}

export const DistributionPlanCard: React.FC<DistributionPlanCardProps> = ({
  badges,
  profiles = [],
  onAssignCollection,
  onAutoAssign,
}) => {
  const [queueDialog, setQueueDialog] = useState<{ open: boolean; point: CollectionPoint | null }>({ 
    open: false, 
    point: null 
  });

  // Group badges by collection point
  const badgesByPoint = collectionPoints.map(point => ({
    point,
    assigned: badges.filter(b => b.collectionPoint === point.id && b.distributionStatus === 'Assigned'),
    collected: badges.filter(b => b.collectionPoint === point.id && (b.distributionStatus === 'Collected' || b.distributionStatus === 'Activated')),
  }));

  const unassignedBadges = badges.filter(
    b => !b.collectionPoint && b.productionStatus === 'Ready'
  );

  const handleAutoAssign = () => {
    if (unassignedBadges.length === 0) return;

    // Distribute badges evenly across active collection points
    const activePoints = collectionPoints.filter(p => p.isActive);
    if (activePoints.length === 0) return;

    const assignments: { badgeId: string; pointId: string }[] = [];
    
    unassignedBadges.forEach((badge, index) => {
      const pointIndex = index % activePoints.length;
      assignments.push({
        badgeId: badge.id,
        pointId: activePoints[pointIndex].id
      });
    });

    if (onAutoAssign) {
      onAutoAssign(assignments);
    } else {
      // Fallback to individual assignments
      assignments.forEach(({ badgeId, pointId }) => {
        onAssignCollection(badgeId, pointId);
      });
    }
  };

  const getProfileForBadge = (badge: BadgeRecord) => {
    return profiles.find(p => p.id === badge.profileId);
  };

  const viewQueue = (point: CollectionPoint) => {
    setQueueDialog({ open: true, point });
  };

  const queueBadges = queueDialog.point 
    ? badges.filter(b => b.collectionPoint === queueDialog.point?.id && b.distributionStatus === 'Assigned')
    : [];

  return (
    <div className="space-y-4">
      {/* Unassigned Badges Alert */}
      {unassignedBadges.length > 0 && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{unassignedBadges.length} badges ready but not assigned</p>
                <p className="text-sm text-muted-foreground">
                  Assign these badges to collection points for distribution
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleAutoAssign}>
                Auto-Assign
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collection Points */}
      <div className="grid md:grid-cols-2 gap-4">
        {badgesByPoint.map(({ point, assigned, collected }) => (
          <Card key={point.id} className={!point.isActive ? 'opacity-60' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{point.name}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{point.venue} - {point.location}</span>
                  </div>
                </div>
                <Badge variant={point.isActive ? 'default' : 'secondary'}>
                  {point.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{point.operatingHours}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-2xl font-bold">{assigned.length}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Awaiting Collection</p>
                </div>
                <div className="p-3 bg-success/10 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-2xl font-bold">{collected.length}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Collected</p>
                </div>
              </div>

              {point.isActive && assigned.length > 0 && (
                <Button variant="outline" size="sm" className="w-full" onClick={() => viewQueue(point)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Queue
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Queue View Dialog */}
      <Dialog open={queueDialog.open} onOpenChange={(open) => setQueueDialog({ open, point: null })}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {queueDialog.point?.name} - Collection Queue
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {queueBadges.length} badge(s) awaiting collection
            </p>
          </DialogHeader>
          <div className="max-h-[500px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participant</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Badge #</TableHead>
                  <TableHead>Organization</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queueBadges.map((badge) => {
                  const profile = getProfileForBadge(badge);
                  const category = accreditationCategories.find(c => c.id === badge.categoryId);
                  
                  return (
                    <TableRow key={badge.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                            {profile?.profileData?.photo ? (
                              <img 
                                src={profile.profileData.photo} 
                                alt="" 
                                className="w-8 h-8 object-cover"
                              />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {profile?.profileData?.firstName} {profile?.profileData?.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {profile?.profileData?.nationality}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {category && (
                          <Badge 
                            style={{ 
                              backgroundColor: category.color, 
                              color: category.textColor 
                            }}
                          >
                            {category.code}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {badge.badgeNumber}
                        </code>
                      </TableCell>
                      <TableCell className="text-sm">
                        {profile?.profileData?.organization || 'N/A'}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {queueBadges.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No badges in queue
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
