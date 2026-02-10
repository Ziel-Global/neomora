import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatsCard } from '@/components/common/StatsCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  travelStore,
  participantStore,
  visaStore,
  EMSTravelBooking,
  EMSParticipant,
  TravelBookingStatus,
} from '@/lib/emsStore';
import { Plane, Ticket, Clock, CheckCircle, Search, Eye, AlertTriangle, XCircle, RefreshCw, Users, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { TravelRequestActions, FlightDetails } from '@/components/travel/TravelRequestActions';
import { DelegationTravelCard } from '@/components/travel/DelegationTravelCard';
import { TeamDelegationFilter } from '@/components/admin/TeamDelegationFilter';
import { teamMemberStore, delegationStore, teamStore, Delegation } from '@/lib/teamStore';

const TravelPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('requests');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<EMSTravelBooking | null>(null);
  const [bookings, setBookings] = useState<EMSTravelBooking[]>([]);
  const [viewMode, setViewMode] = useState<'individual' | 'team'>('individual');
  const [selectedDelegationId, setSelectedDelegationId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedApprovedIds, setSelectedApprovedIds] = useState<string[]>([]);
  const [bulkBookingOpen, setBulkBookingOpen] = useState(false);
  const [bulkAirline, setBulkAirline] = useState('Emirates');
  const [bulkCabinClass, setBulkCabinClass] = useState<'Economy' | 'Business' | 'First'>('Economy');

  // Load bookings from store
  const loadBookings = () => {
    setBookings(travelStore.getAll());
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const getParticipant = (id: string): EMSParticipant | undefined => {
    return participantStore.getById(id);
  };

  const stats = {
    ticketed: bookings.filter(t => t.status === 'Ticketed').length,
    approved: bookings.filter(t => t.status === 'Approved').length,
    requested: bookings.filter(t => t.status === 'Requested').length,
    rejected: bookings.filter(t => t.status === 'Rejected').length,
  };

  const getStatusVariant = (status: TravelBookingStatus) => {
    switch (status) {
      case 'Ticketed': return 'success';
      case 'Approved': return 'info';
      case 'Proposed': return 'warning';
      case 'Requested': return 'default';
      case 'Not Required': return 'secondary';
      case 'Rejected': return 'destructive';
      default: return 'default';
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const participant = getParticipant(booking.participantId);
    if (!participant) return false;

    // Team filtering
    if (viewMode === 'team') {
      // Find if participant is a team member
      const teamMember = teamMemberStore.getAll().find(m => m.email === participant.email);
      if (!teamMember) return false;

      if (selectedTeamId && teamMember.teamId !== selectedTeamId) return false;

      if (selectedDelegationId) {
        const delegation = delegationStore.getById(selectedDelegationId);
        if (!delegation?.teamIds.includes(teamMember.teamId)) return false;
      }
    }

    // Check Visa Status
    const visa = visaStore.getByParticipant(participant.id);
    const isVisaReady = !visa || visa.status === 'Approved' || visa.status === 'Not Required';

    // If filtering for "Requested" (pending), HIDE those without valid visas
    // so the admin doesn't even see them in the queue.
    if ((statusFilter === 'all' || statusFilter === 'Requested') && booking.status === 'Requested' && !isVisaReady) {
      return false;
    }

    const matchesSearch = participant.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.originCity.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Action handlers
  const handleApprove = (bookingId: string, comments?: string) => {
    const result = travelStore.approve(bookingId, comments);
    if (result) {
      toast.success('Travel request approved successfully');
      loadBookings();
    }
  };

  const handleReject = (bookingId: string, reason: string) => {
    const result = travelStore.reject(bookingId, reason);
    if (result) {
      toast.error('Travel request rejected');
      loadBookings();
    }
  };

  const handleBookFlight = (bookingId: string, flightDetails: FlightDetails) => {
    const result = travelStore.bookFlight(bookingId, flightDetails);
    if (result) {
      toast.success('Flight booked and ticket issued successfully');
      loadBookings();
      setSelectedBooking(null);
    }
  };

  // Bulk action handlers
  // Bulk approve
  const handleBulkApprove = () => {
    let count = 0;
    selectedIds.forEach(id => {
      const result = travelStore.approve(id, 'Bulk approved');
      if (result) count++;
    });
    toast.success(`${count} travel requests approved`);
    setSelectedIds([]);
    loadBookings();
  };

  // Bulk book flights - auto-generates flights based on each participant's preferred dates
  const handleBulkBookFlights = () => {
    let count = 0;
    selectedApprovedIds.forEach(id => {
      const booking = bookings.find(b => b.id === id);
      if (!booking) return;

      const participant = getParticipant(booking.participantId);
      const isVIP = participant?.role === 'VVIP' || participant?.role === 'VIP';

      // Use participant's preferred dates or fallback to defaults
      const departureDate = booking.preferredDepartureDate || '';
      const returnDate = booking.preferredReturnDate || '';

      if (!departureDate) return; // Skip if no departure date

      // Generate flight number based on airline
      const flightPrefix = bulkAirline === 'Emirates' ? 'EK' :
        bulkAirline === 'Qatar Airways' ? 'QR' :
          bulkAirline === 'Etihad Airways' ? 'EY' :
            bulkAirline === 'Saudia' ? 'SV' : 'XX';
      const flightNum = Math.floor(Math.random() * 900) + 100;
      const returnFlightNum = Math.floor(Math.random() * 900) + 100;

      const flightDetails = {
        airline: bulkAirline,
        flightNumber: `${flightPrefix}${flightNum}`,
        from: booking.departureAirport || booking.originCity.substring(0, 3).toUpperCase(),
        to: 'DXB',
        departureDate: departureDate,
        departureTime: '08:00',
        arrivalTime: '14:30',
        returnFlightNumber: `${flightPrefix}${returnFlightNum}`,
        returnDepartureDate: returnDate || departureDate,
        returnDepartureTime: '22:00',
        returnArrivalTime: '04:30',
        cabinClass: isVIP ? 'Business' as const : bulkCabinClass,
        seatNumber: '',
      };

      const result = travelStore.bookFlight(id, flightDetails);
      if (result) count++;
    });

    toast.success(`${count} flights booked successfully! Tickets issued for each participant.`);
    setSelectedApprovedIds([]);
    setBulkBookingOpen(false);
    loadBookings();
  };

  // Helper: Get bookings for a specific delegation
  const getBookingsForDelegation = (delegationId: string): EMSTravelBooking[] => {
    const delegation = delegationStore.getById(delegationId);
    if (!delegation) return [];

    const allTeamMembers = teamMemberStore.getAll();
    const delegationEmails = new Set(
      allTeamMembers
        .filter(m => delegation.teamIds.includes(m.teamId))
        .map(m => m.email.toLowerCase())
    );

    return bookings.filter(booking => {
      const participant = getParticipant(booking.participantId);
      if (!participant) return false;
      return delegationEmails.has(participant.email.toLowerCase());
    });
  };

  // Build participants map for DelegationTravelCard
  const participantsMap = new Map<string, EMSParticipant>();
  bookings.forEach(b => {
    const p = getParticipant(b.participantId);
    if (p) participantsMap.set(b.participantId, p);
  });

  // Delegation-level bulk approve
  const handleDelegationApprove = (ids: string[]) => {
    let count = 0;
    ids.forEach(id => {
      const result = travelStore.approve(id, 'Delegation bulk approved');
      if (result) count++;
    });
    toast.success(`${count} travel requests approved for delegation`);
    loadBookings();
  };

  // Delegation-level bulk book (opens dialog with pre-selected IDs)
  const handleDelegationBook = (ids: string[]) => {
    setSelectedApprovedIds(ids);
    setBulkBookingOpen(true);
  };

  // Selection handlers for approved bookings
  const approvedBookings = bookings.filter(b => b.status === 'Approved');
  const handleSelectAllApproved = (checked: boolean) => {
    if (checked) {
      setSelectedApprovedIds(approvedBookings.map(b => b.id));
    } else {
      setSelectedApprovedIds([]);
    }
  };

  const handleSelectOneApproved = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedApprovedIds([...selectedApprovedIds, id]);
    } else {
      setSelectedApprovedIds(selectedApprovedIds.filter(sid => sid !== id));
    }
  };

  const allApprovedSelected = approvedBookings.length > 0 && selectedApprovedIds.length === approvedBookings.length;

  // Filter approved bookings based on view mode and team selection
  const filteredApprovedBookings = bookings.filter(booking => {
    if (booking.status !== 'Approved') return false;

    const participant = getParticipant(booking.participantId);
    if (!participant) return false;

    // Team filtering
    if (viewMode === 'team') {
      const teamMember = teamMemberStore.getAll().find(m => m.email === participant.email);
      if (!teamMember) return false;

      if (selectedTeamId && teamMember.teamId !== selectedTeamId) return false;

      if (selectedDelegationId) {
        const delegation = delegationStore.getById(selectedDelegationId);
        if (!delegation?.teamIds.includes(teamMember.teamId)) return false;
      }
    }

    return true;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const requestedIds = filteredBookings
        .filter(b => b.status === 'Requested')
        .map(b => b.id);
      setSelectedIds(requestedIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    }
  };

  const requestedCount = filteredBookings.filter(b => b.status === 'Requested').length;
  const allRequestedSelected = requestedCount > 0 && selectedIds.length === requestedCount;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Air Travel"
        description="Manage travel requests, approvals, and ticket issuance"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Ticketed" value={stats.ticketed} icon={Ticket} trend={{ value: 40, isPositive: true }} />
        <StatsCard title="Approved" value={stats.approved} icon={CheckCircle} />
        <StatsCard title="Pending Requests" value={stats.requested} icon={Clock} />
        <StatsCard title="Rejected" value={stats.rejected} icon={XCircle} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requests">Travel Requests</TabsTrigger>
          <TabsTrigger value="approved">Ready to Book</TabsTrigger>
          <TabsTrigger value="pnr">PNR Registry</TabsTrigger>
          <TabsTrigger value="policy">Travel Policy</TabsTrigger>
        </TabsList>

        {/* Pending Travel Requests */}
        <TabsContent value="requests" className="space-y-4 mt-4">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium">View Mode:</span>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'individual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('individual')}
              >
                Individual
              </Button>
              <Button
                variant={viewMode === 'team' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('team')}
              >
                <Users className="h-4 w-4 mr-1" />
                Team/Delegation
              </Button>
            </div>

            {viewMode === 'team' && (
              <TeamDelegationFilter
                selectedDelegationId={selectedDelegationId}
                selectedTeamId={selectedTeamId}
                onDelegationChange={setSelectedDelegationId}
                onTeamChange={setSelectedTeamId}
              />
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Requested">Requested</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Ticketed">Ticketed</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadBookings}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Bulk Actions */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <span className="text-sm font-medium">{selectedIds.length} selected</span>
              <Button size="sm" onClick={handleBulkApprove}>
                <Check className="h-4 w-4 mr-1" />
                Approve All
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedIds([])}>
                Clear Selection
              </Button>
            </div>
          )}

          {/* Delegation Cards View */}
          {viewMode === 'team' ? (
            <div className="space-y-4">
              {delegationStore.getAll().length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8 text-muted-foreground">
                    No delegations found
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {delegationStore.getAll().map((delegation) => {
                    const delegationBookings = getBookingsForDelegation(delegation.id);
                    return (
                      <DelegationTravelCard
                        key={delegation.id}
                        delegation={delegation}
                        bookings={delegationBookings}
                        participants={participantsMap}
                        onApprove={handleDelegationApprove}
                        onBook={handleDelegationBook}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allRequestedSelected}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Participant</TableHead>
                    <TableHead>Origin</TableHead>
                    <TableHead>Preferred Dates</TableHead>
                    <TableHead>Preferences</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.filter(b => b.status !== 'Ticketed').length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No pending travel requests
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBookings.filter(b => b.status !== 'Ticketed').map((booking) => {
                      const participant = getParticipant(booking.participantId);
                      return (
                        <TableRow key={booking.id}>
                          <TableCell>
                            {booking.status === 'Requested' && (
                              <Checkbox
                                checked={selectedIds.includes(booking.id)}
                                onCheckedChange={(checked) => handleSelectOne(booking.id, !!checked)}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium" dir="auto">{participant?.firstName} {participant?.lastName}</p>
                              <p className="text-sm text-muted-foreground" dir="auto">{participant?.organization}</p>
                              <Badge variant="outline" className="text-xs mt-1">{participant?.role}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p dir="auto">{booking.originCity}</p>
                              {booking.departureAirport && (
                                <p className="text-xs text-muted-foreground">{booking.departureAirport}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{booking.preferredDepartureDate || '—'}</p>
                              <p className="text-muted-foreground">to {booking.preferredReturnDate || '—'}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs space-y-1">
                              {booking.seatPreference && <p>Seat: {booking.seatPreference}</p>}
                              {booking.mealPreference && <p>Meal: {booking.mealPreference}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={booking.status} variant={getStatusVariant(booking.status)} />
                            {booking.status === 'Rejected' && booking.rejectionReason && (
                              <p className="text-xs text-destructive mt-1 max-w-[150px] truncate" title={booking.rejectionReason}>
                                {booking.rejectionReason}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <TravelRequestActions
                                booking={booking}
                                participant={participant}
                                onApprove={handleApprove}
                                onReject={handleReject}
                                onBookFlight={handleBookFlight}
                              />
                              <Button variant="ghost" size="sm" onClick={() => setSelectedBooking(booking)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Ready to Book */}
        <TabsContent value="approved" className="space-y-4 mt-4">
          {/* View Mode Toggle for Ready to Book */}
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg flex-wrap">
            <span className="text-sm font-medium">View Mode:</span>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'individual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('individual')}
              >
                Individual
              </Button>
              <Button
                variant={viewMode === 'team' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('team')}
              >
                <Users className="h-4 w-4 mr-1" />
                Team/Delegation
              </Button>
            </div>

            {viewMode === 'team' && (
              <TeamDelegationFilter
                selectedDelegationId={selectedDelegationId}
                selectedTeamId={selectedTeamId}
                onDelegationChange={setSelectedDelegationId}
                onTeamChange={setSelectedTeamId}
              />
            )}
          </div>

          {/* Bulk Actions for Approved */}
          {selectedApprovedIds.length > 0 && (
            <div className="flex items-center gap-4 p-3 bg-status-success/10 rounded-lg border border-status-success/20">
              <span className="text-sm font-medium">{selectedApprovedIds.length} selected</span>
              <Button size="sm" onClick={() => setBulkBookingOpen(true)}>
                <Sparkles className="h-4 w-4 mr-1" />
                Bulk Book Flights
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedApprovedIds([])}>
                Clear Selection
              </Button>
            </div>
          )}

          {/* Delegation Cards View for Approved */}
          {viewMode === 'team' ? (
            <div className="space-y-4">
              {delegationStore.getAll().length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8 text-muted-foreground">
                    No delegations found
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {delegationStore.getAll()
                    .filter(delegation => {
                      // Only show delegations that have approved bookings
                      const delegationBookings = getBookingsForDelegation(delegation.id);
                      return delegationBookings.some(b => b.status === 'Approved');
                    })
                    .map((delegation) => {
                      const delegationBookings = getBookingsForDelegation(delegation.id);
                      return (
                        <DelegationTravelCard
                          key={delegation.id}
                          delegation={delegation}
                          bookings={delegationBookings}
                          participants={participantsMap}
                          onApprove={handleDelegationApprove}
                          onBook={handleDelegationBook}
                        />
                      );
                    })}
                </div>
              )}
              {delegationStore.getAll().filter(d =>
                getBookingsForDelegation(d.id).some(b => b.status === 'Approved')
              ).length === 0 && delegationStore.getAll().length > 0 && (
                  <Card>
                    <CardContent className="text-center py-8 text-muted-foreground">
                      No delegations with approved bookings ready for flight booking
                    </CardContent>
                  </Card>
                )}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-status-success" />
                    Approved Requests - Ready for Booking
                  </CardTitle>
                </div>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={filteredApprovedBookings.length > 0 && selectedApprovedIds.length === filteredApprovedBookings.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedApprovedIds(filteredApprovedBookings.map(b => b.id));
                          } else {
                            setSelectedApprovedIds([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Participant</TableHead>
                    <TableHead>Origin</TableHead>
                    <TableHead>Travel Dates</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApprovedBookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No approved requests pending booking
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredApprovedBookings.map((booking) => {
                      const participant = getParticipant(booking.participantId);
                      const isVIP = participant?.role === 'VVIP' || participant?.role === 'VIP';
                      return (
                        <TableRow key={booking.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedApprovedIds.includes(booking.id)}
                              onCheckedChange={(checked) => handleSelectOneApproved(booking.id, !!checked)}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium" dir="auto">{participant?.firstName} {participant?.lastName}</p>
                              <Badge variant="outline" className="text-xs">{participant?.role}</Badge>
                            </div>
                          </TableCell>
                          <TableCell dir="auto">{booking.originCity}</TableCell>
                          <TableCell>
                            {booking.preferredDepartureDate} → {booking.preferredReturnDate}
                          </TableCell>
                          <TableCell>
                            <Badge variant={isVIP ? 'default' : 'secondary'}>
                              {isVIP ? 'Business' : 'Economy'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <TravelRequestActions
                              booking={booking}
                              participant={participant}
                              onApprove={handleApprove}
                              onReject={handleReject}
                              onBookFlight={handleBookFlight}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* PNR Registry */}
        <TabsContent value="pnr" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ticketed Itineraries</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PNR</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead>Airline</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Departure</TableHead>
                  <TableHead>Class</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.filter(b => b.status === 'Ticketed').length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No ticketed bookings yet
                    </TableCell>
                  </TableRow>
                ) : (
                  bookings.filter(b => b.status === 'Ticketed').map((booking) => {
                    const participant = getParticipant(booking.participantId);
                    const firstFlight = booking.itinerary[0];
                    return (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">{booking.pnr}</Badge>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium" dir="auto">{participant?.firstName} {participant?.lastName}</p>
                        </TableCell>
                        <TableCell>{booking.airline}</TableCell>
                        <TableCell>
                          {firstFlight?.from} → {firstFlight?.to}
                        </TableCell>
                        <TableCell className="text-sm">{firstFlight?.departAt}</TableCell>
                        <TableCell>
                          <Badge variant={booking.cabinClass === 'Business' ? 'default' : 'secondary'}>
                            {booking.cabinClass}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Travel Policy */}
        <TabsContent value="policy" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Travel Policy Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground text-sm">Eligible Roles for Travel</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge>VVIP</Badge>
                      <Badge>VIP</Badge>
                      <Badge>Athlete</Badge>
                      <Badge>Official</Badge>
                      <Badge>Judge</Badge>
                      <Badge variant="outline">Media (Case-by-case)</Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Class of Travel</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between">
                        <span>VVIP / VIP</span>
                        <span className="font-medium">Business Class</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Athletes / Officials</span>
                        <span className="font-medium">Premium Economy</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Others</span>
                        <span className="font-medium">Economy</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground text-sm">Booking Window</Label>
                    <p className="mt-1">Requests must be submitted at least <strong>30 days</strong> before travel date</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Preferred Airlines</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="secondary">Emirates</Badge>
                      <Badge variant="secondary">Qatar Airways</Badge>
                      <Badge variant="secondary">Etihad Airways</Badge>
                      <Badge variant="secondary">Gulf Air</Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Baggage Allowance</Label>
                    <p className="mt-1">VIP: <strong>40 kg + Priority</strong></p>
                    <p>Athletes: <strong>23 kg + 1 sports equipment</strong></p>
                    <p>Others: <strong>23 kg standard</strong></p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Booking Detail Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="max-w-2xl">
          {selectedBooking && (
            <>
              <DialogHeader>
                <DialogTitle>Travel Request Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium" dir="auto">
                      {getParticipant(selectedBooking.participantId)?.firstName}{' '}
                      {getParticipant(selectedBooking.participantId)?.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground" dir="auto">
                      {getParticipant(selectedBooking.participantId)?.organization}
                    </p>
                    <Badge variant="outline" className="mt-1">
                      {getParticipant(selectedBooking.participantId)?.role}
                    </Badge>
                  </div>
                  <StatusBadge status={selectedBooking.status} variant={getStatusVariant(selectedBooking.status)} />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Origin City</p>
                    <p className="font-medium" dir="auto">{selectedBooking.originCity}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Airport</p>
                    <p className="font-medium">{selectedBooking.departureAirport || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Preferred Departure</p>
                    <p className="font-medium">{selectedBooking.preferredDepartureDate || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Preferred Return</p>
                    <p className="font-medium">{selectedBooking.preferredReturnDate || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Seat Preference</p>
                    <p className="font-medium">{selectedBooking.seatPreference || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Meal Preference</p>
                    <p className="font-medium">{selectedBooking.mealPreference || '—'}</p>
                  </div>
                </div>

                {selectedBooking.specialRequirements && (
                  <div>
                    <p className="text-muted-foreground text-sm">Special Requirements</p>
                    <p className="text-sm">{selectedBooking.specialRequirements}</p>
                  </div>
                )}

                {selectedBooking.emergencyContact && (
                  <div className="grid grid-cols-2 gap-4 text-sm p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-muted-foreground">Emergency Contact</p>
                      <p className="font-medium">{selectedBooking.emergencyContact}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Emergency Phone</p>
                      <p className="font-medium">{selectedBooking.emergencyPhone}</p>
                    </div>
                  </div>
                )}

                {selectedBooking.itinerary.length > 0 && (
                  <div className="space-y-3">
                    <p className="font-medium">Flight Itinerary</p>
                    {selectedBooking.itinerary.map((flight, i) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <Plane className="h-8 w-8 text-primary" />
                            <div className="flex-1">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-mono text-lg">{flight.from} → {flight.to}</p>
                                  <p className="text-sm text-muted-foreground">{flight.flightNumber}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">{flight.departAt.split(' ')[0]}</p>
                                  <p className="text-sm text-muted-foreground">{flight.departAt.split(' ')[1]}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {selectedBooking.pnr && (
                  <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                    <span className="text-muted-foreground">PNR</span>
                    <span className="font-mono font-bold text-lg">{selectedBooking.pnr}</span>
                  </div>
                )}

                {selectedBooking.status === 'Rejected' && selectedBooking.rejectionReason && (
                  <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <p className="text-sm font-medium text-destructive">Rejection Reason:</p>
                    <p className="text-sm">{selectedBooking.rejectionReason}</p>
                  </div>
                )}

                {selectedBooking.status === 'Requested' && (
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        const reason = prompt('Enter rejection reason:');
                        if (reason) {
                          handleReject(selectedBooking.id, reason);
                          setSelectedBooking(null);
                        }
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => {
                        handleApprove(selectedBooking.id);
                        setSelectedBooking(null);
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Booking Dialog */}
      <Dialog open={bulkBookingOpen} onOpenChange={setBulkBookingOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Bulk Book Flights
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Book flights for <strong>{selectedApprovedIds.length}</strong> participants using their individual preferred travel dates.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Airline</Label>
                <Select value={bulkAirline} onValueChange={setBulkAirline}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Emirates">Emirates</SelectItem>
                    <SelectItem value="Qatar Airways">Qatar Airways</SelectItem>
                    <SelectItem value="Etihad Airways">Etihad Airways</SelectItem>
                    <SelectItem value="Saudia">Saudia</SelectItem>
                    <SelectItem value="Gulf Air">Gulf Air</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Default Cabin Class</Label>
                <Select
                  value={bulkCabinClass}
                  onValueChange={(v: 'Economy' | 'Business' | 'First') => setBulkCabinClass(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Economy">Economy</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                    <SelectItem value="First">First</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">VIP/VVIP participants will automatically get Business class</p>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">What will happen:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>Each participant gets their own ticket based on their preferred dates</li>
                <li>PNR and ticket numbers are auto-generated</li>
                <li>Itineraries appear in each participant's portal</li>
                <li>Accommodation dates sync automatically</li>
              </ul>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setBulkBookingOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkBookFlights}>
              <Ticket className="h-4 w-4 mr-2" />
              Book {selectedApprovedIds.length} Flights
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TravelPage;
