import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/common/StatusBadge';
import { 
  transportPlanStore, 
  transportTripStore,
  participantStore,
  EMSTransportPlan,
  TransportGroup,
  getTransportPolicy,
} from '@/lib/emsStore';
import { toast } from 'sonner';
import { 
  Wand2, 
  Users, 
  Car, 
  Clock, 
  Plane, 
  Hotel, 
  CheckCircle, 
  AlertTriangle,
  Play,
  Send,
  Trash2,
  Eye,
  RefreshCw,
  Calendar,
  Bus
} from 'lucide-react';

interface TransportPlanGeneratorProps {
  onPlanExecuted?: () => void;
}

export const TransportPlanGenerator: React.FC<TransportPlanGeneratorProps> = ({ onPlanExecuted }) => {
  const [plans, setPlans] = useState<EMSTransportPlan[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPlanDetail, setShowPlanDetail] = useState<EMSTransportPlan | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [planType, setPlanType] = useState<'Airport Arrivals' | 'Airport Departures'>('Airport Arrivals');
  const [generatedGroups, setGeneratedGroups] = useState<TransportGroup[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadPlans = () => {
    setPlans(transportPlanStore.getAll());
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleGenerateGroups = () => {
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }

    setIsGenerating(true);
    
    setTimeout(() => {
      const groups = planType === 'Airport Arrivals' 
        ? transportPlanStore.generateArrivalGroups(selectedDate)
        : transportPlanStore.generateDepartureGroups(selectedDate);
      
      setGeneratedGroups(groups);
      setIsGenerating(false);

      if (groups.length === 0) {
        toast.info('No eligible participants found for this date');
      } else {
        toast.success(`Generated ${groups.length} transport groups with ${groups.reduce((sum, g) => sum + g.participantIds.length, 0)} participants`);
      }
    }, 500);
  };

  const handleCreatePlan = () => {
    if (generatedGroups.length === 0) {
      toast.error('Generate groups first');
      return;
    }

    const plan = transportPlanStore.create({
      name: `${planType} - ${selectedDate}`,
      date: selectedDate,
      type: planType,
      status: 'Generated',
      participantGroups: generatedGroups,
      totalParticipants: generatedGroups.reduce((sum, g) => sum + g.participantIds.length, 0),
      totalTrips: 0,
      generatedTripIds: [],
    });

    toast.success('Transport plan created');
    setShowCreateModal(false);
    setGeneratedGroups([]);
    setSelectedDate('');
    loadPlans();
  };

  const handleExecutePlan = (planId: string) => {
    const result = transportPlanStore.executePlan(planId);
    
    if (result.success) {
      toast.success(`Plan executed: ${result.tripsCreated} trips created, ${result.participantsAssigned} participants assigned`);
    } else {
      toast.warning(`Plan executed with issues: ${result.errors.join(', ')}`);
    }
    
    loadPlans();
    onPlanExecuted?.();
  };

  const handlePublishPlan = (planId: string) => {
    const notified = transportPlanStore.publishPlan(planId);
    toast.success(`Plan published: ${notified} trips notified`);
    loadPlans();
    onPlanExecuted?.();
  };

  const handleDeletePlan = (planId: string) => {
    transportPlanStore.delete(planId);
    toast.success('Plan deleted');
    loadPlans();
  };

  const getParticipant = (id: string) => participantStore.getById(id);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'default';
      case 'Generated': return 'warning';
      case 'Assigned': return 'info';
      case 'Published': return 'success';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Transport Plans</h2>
          <p className="text-sm text-muted-foreground">
            Automatically group participants and generate transport assignments
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Wand2 className="h-4 w-4 mr-2" />
          Generate New Plan
        </Button>
      </div>

      <Alert>
        <Bus className="h-4 w-4" />
        <AlertDescription>
          Transport plans automatically group participants by <strong>arrival time windows</strong>, <strong>hotels</strong>, and <strong>role priority</strong>. 
          VIPs get exclusive transport while others are grouped for shared shuttles.
        </AlertDescription>
      </Alert>

      {/* Existing Plans */}
      {plans.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No transport plans yet.</p>
            <p className="text-sm mt-2">Generate a plan to automatically assign participants to vehicles.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {plans.map(plan => (
            <Card key={plan.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {plan.type.includes('Arrival') ? (
                      <Plane className="h-5 w-5 text-green-500" />
                    ) : (
                      <Plane className="h-5 w-5 text-red-500 rotate-45" />
                    )}
                    <div>
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                      <CardDescription>{plan.date}</CardDescription>
                    </div>
                  </div>
                  <StatusBadge status={plan.status} variant={getStatusColor(plan.status) as any} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 text-sm mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{plan.totalParticipants} participants</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <span>{plan.participantGroups.length} groups</span>
                  </div>
                  {plan.totalTrips > 0 && (
                    <div className="flex items-center gap-1">
                      <Bus className="h-4 w-4 text-muted-foreground" />
                      <span>{plan.totalTrips} trips</span>
                    </div>
                  )}
                </div>

                {/* Group Summary */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {plan.participantGroups.slice(0, 5).map(group => (
                    <Badge key={group.id} variant="secondary" className="text-xs">
                      {group.name} ({group.participantIds.length})
                    </Badge>
                  ))}
                  {plan.participantGroups.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{plan.participantGroups.length - 5} more
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowPlanDetail(plan)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                  
                  {plan.status === 'Generated' && (
                    <Button 
                      size="sm"
                      onClick={() => handleExecutePlan(plan.id)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Execute Plan
                    </Button>
                  )}
                  
                  {plan.status === 'Assigned' && (
                    <Button 
                      size="sm"
                      onClick={() => handlePublishPlan(plan.id)}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Publish & Notify
                    </Button>
                  )}

                  {plan.status !== 'Published' && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeletePlan(plan.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Plan Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Generate Transport Plan
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Plan Type</Label>
                <Select value={planType} onValueChange={(v) => setPlanType(v as typeof planType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Airport Arrivals">Airport Arrivals</SelectItem>
                    <SelectItem value="Airport Departures">Airport Departures</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleGenerateGroups} disabled={isGenerating || !selectedDate}>
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              Generate Groups
            </Button>

            {/* Generated Groups Preview */}
            {generatedGroups.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Generated Groups ({generatedGroups.length})</h3>
                  <Badge variant="secondary">
                    {generatedGroups.reduce((sum, g) => sum + g.participantIds.length, 0)} total participants
                  </Badge>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {generatedGroups.map(group => (
                    <Card key={group.id}>
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{group.name}</h4>
                              <Badge variant="outline">{group.vehicleType}</Badge>
                              <Badge variant="secondary">Priority {group.priority}</Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {group.timeWindow.start} - {group.timeWindow.end}
                              </span>
                              <span className="flex items-center gap-1">
                                <Hotel className="h-3 w-3" />
                                {group.hotelName}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {group.participantIds.length} passengers
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1">
                          {group.participantIds.slice(0, 5).map(id => {
                            const p = getParticipant(id);
                            return p ? (
                              <Badge key={id} variant="secondary" className="text-xs">
                                {p.firstName} {p.lastName}
                              </Badge>
                            ) : null;
                          })}
                          {group.participantIds.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{group.participantIds.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePlan} disabled={generatedGroups.length === 0}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Create Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan Detail Modal */}
      <Dialog open={!!showPlanDetail} onOpenChange={() => setShowPlanDetail(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {showPlanDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>{showPlanDetail.name}</span>
                  <StatusBadge status={showPlanDetail.status} variant={getStatusColor(showPlanDetail.status) as any} />
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">{showPlanDetail.date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">{showPlanDetail.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Participants</p>
                    <p className="font-medium">{showPlanDetail.totalParticipants}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Trips</p>
                    <p className="font-medium">{showPlanDetail.totalTrips || 'Not created'}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-3">Transport Groups</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Group Name</TableHead>
                        <TableHead>Time Window</TableHead>
                        <TableHead>Hotel</TableHead>
                        <TableHead>Vehicle Type</TableHead>
                        <TableHead>Passengers</TableHead>
                        <TableHead>Priority</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {showPlanDetail.participantGroups.map(group => (
                        <TableRow key={group.id}>
                          <TableCell className="font-medium">{group.name}</TableCell>
                          <TableCell>{group.timeWindow.start} - {group.timeWindow.end}</TableCell>
                          <TableCell>{group.hotelName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{group.vehicleType}</Badge>
                          </TableCell>
                          <TableCell>{group.participantIds.length}</TableCell>
                          <TableCell>
                            <Badge variant={group.priority <= 2 ? 'default' : 'secondary'}>
                              {group.priority}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {showPlanDetail.generatedTripIds.length > 0 && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      {showPlanDetail.generatedTripIds.length} trips have been created from this plan. 
                      View them in the Trips & Manifests tab.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
