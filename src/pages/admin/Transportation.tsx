import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatsCard } from '@/components/common/StatsCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { 
  transportRouteStore, 
  transportTripStore, 
  vehicleStore, 
  participantStore,
  travelStore,
  accommodationStore,
  hotelStore,
  transportPlanStore,
  EMSTransportTrip,
  EMSTransportRoute,
  EMSVehicle,
  TransportTripStatus,
  TransportEligibility,
  EMSParticipant,
  getTransportPolicy
} from '@/lib/emsStore';
import { Bus, Route, Users, Clock, Search, Plus, Eye, MapPin, Car, CheckCircle, AlertTriangle, Play, XCircle, Bell, Truck, Calendar, UserPlus, Plane, Hotel, RefreshCw, Info, Wand2, Send, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TransportPlanGenerator } from '@/components/transport/TransportPlanGenerator';

const TransportationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('plans');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrip, setSelectedTrip] = useState<EMSTransportTrip | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignVehicleModal, setShowAssignVehicleModal] = useState(false);
  const [showAddPassengerModal, setShowAddPassengerModal] = useState(false);
  
  const [trips, setTrips] = useState<EMSTransportTrip[]>([]);
  const [routes, setRoutes] = useState<EMSTransportRoute[]>([]);
  const [vehicles, setVehicles] = useState<EMSVehicle[]>([]);
  const [eligibleParticipants, setEligibleParticipants] = useState<{ participant: EMSParticipant; eligibility: TransportEligibility }[]>([]);
  const [stats, setStats] = useState({ planned: 0, assigned: 0, notified: 0, active: 0, completed: 0, total: 0, cancelled: 0 });

  const [newTripData, setNewTripData] = useState({
    routeId: '',
    date: '',
    pickupTime: '',
    vehicleType: 'Mercedes Sprinter',
  });

  const loadData = () => {
    setTrips(transportTripStore.getAll());
    setRoutes(transportRouteStore.getAll());
    setVehicles(vehicleStore.getAll());
    setStats(transportTripStore.getStats());
    setEligibleParticipants(transportTripStore.getEligibleParticipants());
  };

  useEffect(() => {
    loadData();
  }, []);

  const getParticipant = (id: string) => participantStore.getById(id);
  const getRoute = (id: string) => transportRouteStore.getById(id);

  const getStatusVariant = (status: TransportTripStatus) => {
    switch (status) {
      case 'Completed': return 'success';
      case 'Active': return 'info';
      case 'Notified': return 'info';
      case 'Assigned': return 'warning';
      case 'Planned': return 'default';
      case 'Cancelled': return 'destructive';
      default: return 'default';
    }
  };

  const filteredTrips = trips.filter(t => {
    const matchesSearch = t.routeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.pickupLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.dropoffLocation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleCreateTrip = () => {
    const route = getRoute(newTripData.routeId);
    if (!route || !newTripData.date || !newTripData.pickupTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    const [hours, minutes] = newTripData.pickupTime.split(':').map(Number);
    const estMinutes = (hours * 60 + minutes + route.estimatedDuration) % (24 * 60);
    const estArrival = `${String(Math.floor(estMinutes / 60)).padStart(2, '0')}:${String(estMinutes % 60).padStart(2, '0')}`;

    transportTripStore.create({
      routeId: route.id,
      routeName: route.name,
      type: route.type,
      date: newTripData.date,
      pickupTime: newTripData.pickupTime,
      estimatedArrival: estArrival,
      vehicleId: null,
      vehicleType: newTripData.vehicleType,
      vehiclePlate: null,
      driverName: null,
      driverPhone: null,
      capacity: newTripData.vehicleType === 'Luxury Bus' ? 45 : newTripData.vehicleType === 'Sedan' ? 3 : 15,
      participantIds: [],
      status: 'Planned',
      pickupLocation: route.from,
      dropoffLocation: route.to,
      priority: 5, // Default priority for manually created trips
      noShows: [],
    });

    toast.success('Trip created successfully');
    setShowCreateModal(false);
    setNewTripData({ routeId: '', date: '', pickupTime: '', vehicleType: 'Mercedes Sprinter' });
    loadData();
  };

  const handleAssignVehicle = (vehicleId: string) => {
    if (!selectedTrip) return;
    transportTripStore.assignVehicle(selectedTrip.id, vehicleId);
    toast.success('Vehicle assigned successfully');
    setShowAssignVehicleModal(false);
    loadData();
    setSelectedTrip(transportTripStore.getById(selectedTrip.id) || null);
  };

  const handleStatusAction = (tripId: string, action: 'notify' | 'start' | 'complete' | 'cancel') => {
    switch (action) {
      case 'notify':
        transportTripStore.notifyPassengers(tripId);
        toast.success('Passengers notified');
        break;
      case 'start':
        transportTripStore.startTrip(tripId);
        toast.success('Trip started');
        break;
      case 'complete':
        transportTripStore.completeTrip(tripId);
        toast.success('Trip completed');
        break;
      case 'cancel':
        transportTripStore.cancelTrip(tripId);
        toast.success('Trip cancelled');
        break;
    }
    loadData();
    if (selectedTrip?.id === tripId) {
      setSelectedTrip(transportTripStore.getById(tripId) || null);
    }
  };

  const handleAddPassenger = (participantId: string) => {
    if (!selectedTrip) return;
    const result = transportTripStore.addPassenger(selectedTrip.id, participantId);
    if (result) {
      toast.success('Passenger added');
      loadData();
      setSelectedTrip(transportTripStore.getById(selectedTrip.id) || null);
    } else {
      toast.error('Could not add passenger - trip may be full');
    }
  };

  const handleRemovePassenger = (participantId: string) => {
    if (!selectedTrip) return;
    transportTripStore.removePassenger(selectedTrip.id, participantId);
    toast.success('Passenger removed');
    loadData();
    setSelectedTrip(transportTripStore.getById(selectedTrip.id) || null);
  };

  const handleMarkNoShow = (participantId: string) => {
    if (!selectedTrip) return;
    transportTripStore.markNoShow(selectedTrip.id, participantId);
    toast.success('Marked as no-show');
    loadData();
    setSelectedTrip(transportTripStore.getById(selectedTrip.id) || null);
  };

  // Get eligible participants for adding to trip
  const getEligiblePassengers = () => {
    if (!selectedTrip) return [];
    const allParticipants = participantStore.getAll();
    return allParticipants.filter(p => {
      // Not already in this trip
      if (selectedTrip.participantIds.includes(p.id)) return false;
      // Has ticketed travel
      const travel = travelStore.getByParticipant(p.id)[0];
      if (!travel || travel.status !== 'Ticketed') return false;
      // Has accommodation
      const accommodation = accommodationStore.getByParticipant(p.id);
      if (!accommodation) return false;
      return true;
    });
  };

  // Generate airport transfers for all eligible participants
  const handleGenerateTransfers = () => {
    const participants = participantStore.getAll();
    let generated = 0;
    
    participants.forEach(p => {
      const travel = travelStore.getByParticipant(p.id)[0];
      const accommodation = accommodationStore.getByParticipant(p.id);
      
      if (travel?.status === 'Ticketed' && accommodation) {
        const result = transportTripStore.generateAirportTransfers(p.id);
        if (result.pickup || result.dropoff) generated++;
      }
    });

    if (generated > 0) {
      toast.success(`Generated transfers for ${generated} participants`);
      loadData();
    } else {
      toast.info('No new transfers to generate');
    }
  };

  // Batch actions for selected trips
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([]);

  const handleBatchAssignVehicles = () => {
    if (selectedTripIds.length === 0) {
      toast.error('Select trips first');
      return;
    }
    const result = transportTripStore.batchAssignVehicles(selectedTripIds);
    toast.success(`Assigned vehicles to ${result.assigned} trips${result.failed > 0 ? `, ${result.failed} failed` : ''}`);
    setSelectedTripIds([]);
    loadData();
  };

  const handleBatchNotify = () => {
    if (selectedTripIds.length === 0) {
      toast.error('Select trips first');
      return;
    }
    const notified = transportTripStore.batchNotify(selectedTripIds);
    toast.success(`Notified passengers on ${notified} trips`);
    setSelectedTripIds([]);
    loadData();
  };

  const toggleTripSelection = (tripId: string) => {
    setSelectedTripIds(prev => 
      prev.includes(tripId) ? prev.filter(id => id !== tripId) : [...prev, tripId]
    );
  };

  const selectAllTrips = (status?: TransportTripStatus) => {
    const toSelect = filteredTrips
      .filter(t => !status || t.status === status)
      .map(t => t.id);
    setSelectedTripIds(toSelect);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transportation"
        description="Centralized transport planning with automatic grouping and batch assignment"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleGenerateTransfers}>
              <Truck className="h-4 w-4 mr-2" />
              Quick Generate
            </Button>
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Manual Trip</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Trip</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Route</Label>
                    <Select value={newTripData.routeId} onValueChange={(v) => setNewTripData(prev => ({ ...prev, routeId: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select route" />
                      </SelectTrigger>
                      <SelectContent>
                        {routes.map(route => (
                          <SelectItem key={route.id} value={route.id}>
                            {route.name} ({route.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Date</Label>
                      <Input type="date" value={newTripData.date} onChange={(e) => setNewTripData(prev => ({ ...prev, date: e.target.value }))} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Pickup Time</Label>
                      <Input type="time" value={newTripData.pickupTime} onChange={(e) => setNewTripData(prev => ({ ...prev, pickupTime: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Vehicle Type</Label>
                    <Select value={newTripData.vehicleType} onValueChange={(v) => setNewTripData(prev => ({ ...prev, vehicleType: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Luxury Bus">Luxury Bus (45 pax)</SelectItem>
                        <SelectItem value="Mercedes Sprinter">Mercedes Sprinter (15 pax)</SelectItem>
                        <SelectItem value="SUV">SUV (6 pax)</SelectItem>
                        <SelectItem value="Sedan">Sedan (3 pax)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                  <Button onClick={handleCreateTrip}>Create Trip</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatsCard title="Planned" value={stats.planned} icon={Clock} />
        <StatsCard title="Assigned" value={stats.assigned} icon={Car} />
        <StatsCard title="Notified" value={stats.notified} icon={Bell} />
        <StatsCard title="Active" value={stats.active} icon={Play} trend={{ value: stats.active, isPositive: true }} />
        <StatsCard title="Completed" value={stats.completed} icon={CheckCircle} trend={{ value: Math.round((stats.completed / (stats.total || 1)) * 100), isPositive: true }} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="plans" className="gap-2">
            <Wand2 className="h-4 w-4" />
            Transport Plans
          </TabsTrigger>
          <TabsTrigger value="trips">Trips & Manifests</TabsTrigger>
          <TabsTrigger value="eligible">
            Eligible Participants
            {eligibleParticipants.length > 0 && (
              <Badge variant="secondary" className="ml-2">{eligibleParticipants.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="routes">Routes</TabsTrigger>
          <TabsTrigger value="vehicles">Fleet</TabsTrigger>
        </TabsList>

        {/* Transport Plans Tab - NEW */}
        <TabsContent value="plans" className="space-y-4 mt-4">
          <TransportPlanGenerator onPlanExecuted={loadData} />
        </TabsContent>

        <TabsContent value="trips" className="space-y-4 mt-4">
          {/* Batch Actions Bar */}
          {selectedTripIds.length > 0 && (
            <div className="flex items-center gap-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <span className="text-sm font-medium">
                {selectedTripIds.length} trip{selectedTripIds.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleBatchAssignVehicles}>
                  <Car className="h-4 w-4 mr-1" />
                  Assign Vehicles
                </Button>
                <Button size="sm" variant="outline" onClick={handleBatchNotify}>
                  <Bell className="h-4 w-4 mr-1" />
                  Notify All
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedTripIds([])}>
                  Clear
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search trips..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Airport Pickup">Airport Pickup</SelectItem>
                <SelectItem value="Airport Dropoff">Airport Dropoff</SelectItem>
                <SelectItem value="Hotel-Venue Shuttle">Hotel-Venue Shuttle</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Planned">Planned</SelectItem>
                <SelectItem value="Assigned">Assigned</SelectItem>
                <SelectItem value="Notified">Notified</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => selectAllTrips('Planned')}>
              <Settings2 className="h-4 w-4 mr-1" />
              Select Planned
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox 
                      checked={selectedTripIds.length === filteredTrips.length && filteredTrips.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTripIds(filteredTrips.map(t => t.id));
                        } else {
                          setSelectedTripIds([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Route / Type</TableHead>
                  <TableHead>Date / Time</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Passengers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No trips found. Use Transport Plans to generate trips automatically.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTrips.map((trip) => (
                    <TableRow key={trip.id} className={selectedTripIds.includes(trip.id) ? 'bg-primary/5' : ''}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedTripIds.includes(trip.id)}
                          onCheckedChange={() => toggleTripSelection(trip.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{trip.routeName}</p>
                          <Badge variant="outline" className="text-xs">{trip.type}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="flex items-center gap-1"><Calendar className="h-3 w-3" />{trip.date}</p>
                          <p className="text-muted-foreground">{trip.pickupTime} → {trip.estimatedArrival}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {trip.vehiclePlate ? (
                          <div className="text-sm">
                            <p>{trip.vehicleType}</p>
                            <p className="text-muted-foreground">{trip.vehiclePlate}</p>
                          </div>
                        ) : (
                          <Badge variant="secondary">{trip.vehicleType}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {trip.driverName ? (
                          <div className="text-sm">
                            <p>{trip.driverName}</p>
                            <p className="text-muted-foreground">{trip.driverPhone}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{trip.participantIds.length} / {trip.capacity}</Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={trip.status} variant={getStatusVariant(trip.status)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedTrip(trip)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {trip.status === 'Planned' && (
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedTrip(trip); setShowAssignVehicleModal(true); }}>
                              <Car className="h-4 w-4" />
                            </Button>
                          )}
                          {trip.status === 'Assigned' && (
                            <Button variant="ghost" size="sm" onClick={() => handleStatusAction(trip.id, 'notify')}>
                              <Bell className="h-4 w-4" />
                            </Button>
                          )}
                          {trip.status === 'Notified' && (
                            <Button variant="ghost" size="sm" onClick={() => handleStatusAction(trip.id, 'start')}>
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {trip.status === 'Active' && (
                            <Button variant="ghost" size="sm" onClick={() => handleStatusAction(trip.id, 'complete')}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Eligible Participants Tab */}
        <TabsContent value="eligible" className="space-y-4 mt-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Participants are eligible for transport when they have <strong>ticketed travel</strong> and <strong>confirmed accommodation</strong>. 
              Auto-generate will create airport transfers based on their flight times and hotel assignments.
            </AlertDescription>
          </Alert>

          {eligibleParticipants.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No eligible participants found.</p>
                <p className="text-sm mt-2">Participants need ticketed travel and confirmed accommodation to be eligible.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Participant</TableHead>
                    <TableHead>Role / Policy</TableHead>
                    <TableHead>Flight Details</TableHead>
                    <TableHead>Accommodation</TableHead>
                    <TableHead>Existing Transfers</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eligibleParticipants.map(({ participant, eligibility }) => {
                    const existingTrips = transportTripStore.getByParticipant(participant.id);
                    const hasPickup = existingTrips.some(t => t.type === 'Airport Pickup');
                    const hasDropoff = existingTrips.some(t => t.type === 'Airport Dropoff');
                    const policy = getTransportPolicy(participant.role);

                    return (
                      <TableRow key={participant.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{participant.firstName} {participant.lastName}</p>
                            <p className="text-sm text-muted-foreground">{participant.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <Badge variant="secondary">{participant.role}</Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {policy.vehicleType} • Priority {policy.priority}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {eligibility.travelDetails && (
                            <div className="text-sm">
                              <div className="flex items-center gap-1">
                                <Plane className="h-3 w-3 text-green-500" />
                                <span>Arr: {eligibility.travelDetails.arrivalDate} {eligibility.travelDetails.arrivalTime}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Plane className="h-3 w-3 text-red-500 rotate-45" />
                                <span>Dep: {eligibility.travelDetails.departureDate} {eligibility.travelDetails.departureTime}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {eligibility.travelDetails.arrivalFlightNumber} / {eligibility.travelDetails.departureFlightNumber}
                              </p>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {eligibility.accommodationDetails && (
                            <div className="text-sm">
                              <div className="flex items-center gap-1">
                                <Hotel className="h-3 w-3" />
                                <span>{eligibility.accommodationDetails.hotelName}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {eligibility.accommodationDetails.checkIn} → {eligibility.accommodationDetails.checkOut}
                              </p>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {hasPickup ? (
                              <Badge variant="outline" className="text-green-600">Pickup ✓</Badge>
                            ) : (
                              <Badge variant="secondary">No Pickup</Badge>
                            )}
                            {hasDropoff ? (
                              <Badge variant="outline" className="text-green-600">Dropoff ✓</Badge>
                            ) : (
                              <Badge variant="secondary">No Dropoff</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(!hasPickup || !hasDropoff) && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                const result = transportTripStore.generateAirportTransfers(participant.id);
                                if (result.pickup || result.dropoff) {
                                  toast.success(`Generated transfers for ${participant.firstName}`);
                                  loadData();
                                } else {
                                  toast.info('Transfers already exist');
                                }
                              }}
                            >
                              <Truck className="h-4 w-4 mr-1" />
                              Generate
                            </Button>
                          )}
                          {hasPickup && hasDropoff && (
                            <span className="text-sm text-muted-foreground">Complete</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="routes" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {routes.map((route) => (
              <Card key={route.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{route.type}</Badge>
                    <span className="text-sm text-muted-foreground">{route.estimatedDuration} min</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <h3 className="font-medium mb-3">{route.name}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-green-500 mt-0.5" />
                      <div>
                        <span className="text-muted-foreground text-xs">{route.fromType}</span>
                        <p>{route.from}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-red-500 mt-0.5" />
                      <div>
                        <span className="text-muted-foreground text-xs">{route.toType}</span>
                        <p>{route.to}</p>
                      </div>
                    </div>
                    {route.distance && (
                      <p className="text-muted-foreground text-xs">Distance: {route.distance}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="vehicles" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map((vehicle) => (
              <Card key={vehicle.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Bus className="h-4 w-4" />
                      {vehicle.type}
                    </CardTitle>
                    <Badge variant={vehicle.status === 'Available' ? 'secondary' : vehicle.status === 'In Use' ? 'outline' : 'destructive'}>
                      {vehicle.status}
                    </Badge>
                  </div>
                  <CardDescription>{vehicle.plateNumber}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Capacity</span>
                    <span className="font-medium">{vehicle.capacity} passengers</span>
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground">Driver</p>
                    <p className="font-medium">{vehicle.driverName}</p>
                    <p className="text-muted-foreground text-xs">{vehicle.driverPhone}</p>
                  </div>
                  {vehicle.features && vehicle.features.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2">
                      {vehicle.features.map(f => (
                        <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Trip Detail Dialog */}
      <Dialog open={!!selectedTrip && !showAssignVehicleModal && !showAddPassengerModal} onOpenChange={() => setSelectedTrip(null)}>
        <DialogContent className="max-w-2xl">
          {selectedTrip && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Trip Details</span>
                  <StatusBadge status={selectedTrip.status} variant={getStatusVariant(selectedTrip.status)} />
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label className="text-muted-foreground text-xs">Route</Label>
                    <p className="font-medium">{selectedTrip.routeName}</p>
                    <Badge variant="outline" className="mt-1">{selectedTrip.type}</Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Schedule</Label>
                    <p className="font-medium">{selectedTrip.date}</p>
                    <p className="text-sm text-muted-foreground">{selectedTrip.pickupTime} → {selectedTrip.estimatedArrival}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Pickup</Label>
                    <p className="font-medium">{selectedTrip.pickupLocation}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Dropoff</Label>
                    <p className="font-medium">{selectedTrip.dropoffLocation}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label className="text-muted-foreground text-xs">Vehicle</Label>
                    <p className="font-medium">{selectedTrip.vehicleType}</p>
                    <p className="text-sm text-muted-foreground">{selectedTrip.vehiclePlate || 'Not assigned'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Driver</Label>
                    <p className="font-medium">{selectedTrip.driverName || 'Not assigned'}</p>
                    <p className="text-sm text-muted-foreground">{selectedTrip.driverPhone || '-'}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-muted-foreground text-sm">
                      Passenger List ({selectedTrip.participantIds.length} / {selectedTrip.capacity})
                    </Label>
                    {selectedTrip.status !== 'Completed' && selectedTrip.status !== 'Cancelled' && (
                      <Button variant="outline" size="sm" onClick={() => setShowAddPassengerModal(true)}>
                        <UserPlus className="h-4 w-4 mr-1" />Add
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedTrip.participantIds.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No passengers assigned</p>
                    ) : (
                      selectedTrip.participantIds.map((id) => {
                        const p = getParticipant(id);
                        const isNoShow = selectedTrip.noShows.includes(id);
                        return p ? (
                          <div key={id} className={`flex items-center justify-between p-2 rounded ${isNoShow ? 'bg-red-50 dark:bg-red-950' : 'bg-muted/50'}`}>
                            <div className="flex items-center gap-2">
                              <span className={isNoShow ? 'line-through text-muted-foreground' : ''}>{p.firstName} {p.lastName}</span>
                              <Badge variant="secondary" className="text-xs">{p.role}</Badge>
                              {isNoShow && <Badge variant="destructive" className="text-xs">No-Show</Badge>}
                            </div>
                            {selectedTrip.status !== 'Completed' && selectedTrip.status !== 'Cancelled' && (
                              <div className="flex gap-1">
                                {!isNoShow && selectedTrip.status === 'Active' && (
                                  <Button variant="ghost" size="sm" onClick={() => handleMarkNoShow(id)}>
                                    <AlertTriangle className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" onClick={() => handleRemovePassenger(id)}>
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : null;
                      })
                    )}
                  </div>
                </div>

                {/* Action Buttons based on status */}
                <div className="flex gap-2 pt-4 border-t">
                  {selectedTrip.status === 'Planned' && (
                    <>
                      <Button onClick={() => setShowAssignVehicleModal(true)}>
                        <Car className="h-4 w-4 mr-2" />Assign Vehicle
                      </Button>
                      <Button variant="destructive" onClick={() => handleStatusAction(selectedTrip.id, 'cancel')}>
                        Cancel Trip
                      </Button>
                    </>
                  )}
                  {selectedTrip.status === 'Assigned' && (
                    <>
                      <Button onClick={() => handleStatusAction(selectedTrip.id, 'notify')}>
                        <Bell className="h-4 w-4 mr-2" />Notify Passengers
                      </Button>
                      <Button variant="destructive" onClick={() => handleStatusAction(selectedTrip.id, 'cancel')}>
                        Cancel Trip
                      </Button>
                    </>
                  )}
                  {selectedTrip.status === 'Notified' && (
                    <>
                      <Button onClick={() => handleStatusAction(selectedTrip.id, 'start')}>
                        <Play className="h-4 w-4 mr-2" />Start Trip
                      </Button>
                      <Button variant="destructive" onClick={() => handleStatusAction(selectedTrip.id, 'cancel')}>
                        Cancel Trip
                      </Button>
                    </>
                  )}
                  {selectedTrip.status === 'Active' && (
                    <Button onClick={() => handleStatusAction(selectedTrip.id, 'complete')}>
                      <CheckCircle className="h-4 w-4 mr-2" />Complete Trip
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Vehicle Modal */}
      <Dialog open={showAssignVehicleModal} onOpenChange={setShowAssignVehicleModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Vehicle</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {vehicles.filter(v => v.status === 'Available').map(vehicle => (
              <div 
                key={vehicle.id} 
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                onClick={() => handleAssignVehicle(vehicle.id)}
              >
                <div>
                  <p className="font-medium">{vehicle.type} - {vehicle.plateNumber}</p>
                  <p className="text-sm text-muted-foreground">{vehicle.driverName} • {vehicle.capacity} seats</p>
                </div>
                <Button size="sm">Assign</Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Passenger Modal */}
      <Dialog open={showAddPassengerModal} onOpenChange={setShowAddPassengerModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Passenger</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {getEligiblePassengers().length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No eligible passengers found</p>
            ) : (
              getEligiblePassengers().map(p => (
                <div 
                  key={p.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => { handleAddPassenger(p.id); setShowAddPassengerModal(false); }}
                >
                  <div>
                    <p className="font-medium">{p.firstName} {p.lastName}</p>
                    <p className="text-sm text-muted-foreground">{p.role} • {p.organization}</p>
                  </div>
                  <Button size="sm">Add</Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransportationPage;
