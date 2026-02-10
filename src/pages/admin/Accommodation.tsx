import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatsCard } from '@/components/common/StatsCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  accommodationStore,
  hotelStore,
  participantStore,
  visaStore,
  travelStore,
  registrationStore,
  EMSAccommodation,
  EMSHotel,
  EMSParticipant,
  AccommodationStatus
} from '@/lib/emsStore';
import { Hotel, Bed, Users, CheckCircle, Search, Plus, Eye, Edit, RefreshCw, Check, X, LogIn, LogOut, FileDown, Flag, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AddAllocationModal } from '@/components/accommodation/AddAllocationModal';
import { toast } from 'sonner';
import { TeamDelegationFilter } from '@/components/admin/TeamDelegationFilter';
import { teamMemberStore, delegationStore, teamStore, Delegation } from '@/lib/teamStore';
import { DelegationAccommodationCard } from '@/components/accommodation/DelegationAccommodationCard';

const AccommodationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('allocations');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHotel, setSelectedHotel] = useState<EMSHotel | null>(null);
  const [allocations, setAllocations] = useState<EMSAccommodation[]>([]);
  const [hotels, setHotels] = useState<EMSHotel[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editAllocation, setEditAllocation] = useState<EMSAccommodation | null>(null);
  const [preSelectedParticipantId, setPreSelectedParticipantId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddHotelModal, setShowAddHotelModal] = useState(false);
  const [viewMode, setViewMode] = useState<'individual' | 'team'>('individual');
  const [selectedDelegationId, setSelectedDelegationId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedPendingIds, setSelectedPendingIds] = useState<string[]>([]);
  const [showBulkAllocateModal, setShowBulkAllocateModal] = useState(false);
  const [bulkHotelId, setBulkHotelId] = useState<string>('');
  const [bulkRoomType, setBulkRoomType] = useState<string>('Standard');
  const [newHotelData, setNewHotelData] = useState({
    name: '',
    city: '',
    address: '',
    category: 'Standard' as 'VVIP' | 'VIP' | 'Standard',
    capacity: 50,
    roomTypes: ['Standard', 'Deluxe'],
    contact: '',
  });

  const loadData = () => {
    setAllocations(accommodationStore.getAll());
    setHotels(hotelStore.getAll());
  };

  useEffect(() => {
    // Initialize store on first load
    hotelStore.seedDefaults();
    loadData();
  }, []);

  const getParticipant = (id: string) => participantStore.getById(id);

  // Get participants who need accommodation (ticketed travelers who requested accommodation)
  const getParticipantsNeedingAccommodation = (): EMSParticipant[] => {
    const allParticipants = participantStore.getAll();
    return allParticipants.filter(participant => {
      // Check if they have a ticketed travel booking
      const travels = travelStore.getByParticipant(participant.id);
      const hasTicket = travels.some(t => t.status === 'Ticketed');
      if (!hasTicket) return false;

      // Check if they requested accommodation in registration
      const registrations = registrationStore.getByParticipant(participant.id);
      const needsAccommodation = registrations.some(r => r.formData.needsAccommodation);
      if (!needsAccommodation) return false;

      // Check if they already have accommodation
      const hasAccommodation = accommodationStore.getByParticipant(participant.id);
      return !hasAccommodation;
    });
  };

  const participantsNeedingAccommodation = getParticipantsNeedingAccommodation();

  // Filter pending participants by team if in team mode
  const filteredPendingParticipants = participantsNeedingAccommodation.filter(participant => {
    if (viewMode !== 'team') return true;

    const teamMember = teamMemberStore.getAll().find(m => m.email === participant.email);
    if (!teamMember) return false;

    if (selectedTeamId && teamMember.teamId !== selectedTeamId) return false;

    if (selectedDelegationId) {
      const delegation = delegationStore.getById(selectedDelegationId);
      if (!delegation?.teamIds.includes(teamMember.teamId)) return false;
    }

    return true;
  });

  // Bulk allocate handler
  const handleBulkAllocate = () => {
    if (!bulkHotelId) {
      toast.error('Please select a hotel');
      return;
    }

    const hotel = hotelStore.getById(bulkHotelId);
    if (!hotel) return;

    let count = 0;
    let roomCounter = 100;

    selectedPendingIds.forEach(participantId => {
      const participant = participantStore.getById(participantId);
      if (!participant) return;

      // Get travel dates
      const travels = travelStore.getByParticipant(participantId);
      const ticketedTravel = travels.find(t => t.status === 'Ticketed');

      // Default dates from travel itinerary
      let checkIn = '';
      let checkOut = '';

      if (ticketedTravel?.itinerary.length) {
        // First flight arrival = check-in
        const firstFlight = ticketedTravel.itinerary[0];
        checkIn = firstFlight.departAt.split(' ')[0];

        // Last flight departure = check-out
        const lastFlight = ticketedTravel.itinerary[ticketedTravel.itinerary.length - 1];
        checkOut = lastFlight.departAt.split(' ')[0];
      }

      // Get registration
      const registrations = registrationStore.getByParticipant(participantId);
      const registration = registrations[0];

      // Determine gender
      const teamMember = teamMemberStore.getAll().find(m => m.email === participant.email);
      const gender = teamMember?.gender || 'Other';

      // Create allocation
      accommodationStore.create({
        participantId: participantId,
        registrationId: registration?.id || '',
        hotelId: hotel.id,
        hotelName: hotel.name,
        roomType: bulkRoomType,
        roomNumber: `${roomCounter++}`,
        checkIn: checkIn,
        checkOut: checkOut,
        status: 'Provisional',
        roommates: [],
        gender: gender as 'Male' | 'Female' | 'Other',
        hotelAddress: hotel.address,
      });

      count++;
    });

    toast.success(`${count} team members allocated to ${hotel.name}!`);
    setSelectedPendingIds([]);
    setShowBulkAllocateModal(false);
    setBulkHotelId('');
    loadData();
  };

  const handleSelectAllPending = (checked: boolean) => {
    if (checked) {
      setSelectedPendingIds(filteredPendingParticipants.map(p => p.id));
    } else {
      setSelectedPendingIds([]);
    }
  };

  const handleSelectOnePending = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedPendingIds([...selectedPendingIds, id]);
    } else {
      setSelectedPendingIds(selectedPendingIds.filter(sid => sid !== id));
    }
  };

  const allPendingSelected = filteredPendingParticipants.length > 0 && selectedPendingIds.length === filteredPendingParticipants.length;

  const stats = accommodationStore.getStats();

  const getStatusVariant = (status: AccommodationStatus): 'default' | 'success' | 'warning' | 'info' | 'destructive' => {
    switch (status) {
      case 'Checked-In': return 'success';
      case 'Confirmed': return 'info';
      case 'Provisional': return 'warning';
      case 'Checked-Out': return 'default';
      case 'Cancelled': return 'destructive';
      default: return 'default';
    }
  };

  const filteredAllocations = allocations.filter(acc => {
    const participant = getParticipant(acc.participantId);
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

    // Check Visa Status for Provisional allocations
    // If it's Provisional (requiring confirmation) but Visa is not approved, hide it or block it.
    // To match Air Travel logic: "user wont appear".
    const visa = visaStore.getByParticipant(participant.id);
    const isVisaReady = !visa || visa.status === 'Approved' || visa.status === 'Not Required';

    if (acc.status === 'Provisional' && !isVisaReady) {
      // Hide if provisional and visa not ready (Admin shouldn't verify yet)
      return false;
    }

    const matchesSearch =
      participant.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.hotelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.roomNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || acc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getHotelOccupancy = (hotelId: string) => {
    return hotelStore.getOccupancy(hotelId);
  };

  const handleConfirm = (id: string) => {
    const confirmationNumber = window.prompt('Enter Hotel Confirmation Number (optional):');
    accommodationStore.confirm(id, 'Admin', confirmationNumber || undefined);
    loadData();
    toast.success('Allocation confirmed');
  };

  const handleCheckIn = (id: string) => {
    accommodationStore.checkIn(id);
    loadData();
    toast.success('Guest checked in');
  };

  const handleCheckOut = (id: string) => {
    accommodationStore.checkOut(id);
    loadData();
    toast.success('Guest checked out');
  };

  const handleCancel = (id: string) => {
    accommodationStore.cancel(id, 'Cancelled by admin');
    loadData();
    toast.success('Allocation cancelled');
  };

  const handleBulkConfirm = () => {
    const count = accommodationStore.confirmAll(selectedIds, 'Admin');
    setSelectedIds([]);
    loadData();
    toast.success(`${count} allocations confirmed`);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredAllocations.filter(a => a.status === 'Provisional').map(a => a.id));
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

  const provisionalCount = filteredAllocations.filter(a => a.status === 'Provisional').length;
  const allProvisionalSelected = provisionalCount > 0 && selectedIds.length === provisionalCount;

  // Helper: Get participants needing accommodation for a specific delegation
  const getPendingForDelegation = (delegationId: string): EMSParticipant[] => {
    const delegation = delegationStore.getById(delegationId);
    if (!delegation) return [];

    const allTeamMembers = teamMemberStore.getAll();
    const delegationEmails = new Set(
      allTeamMembers
        .filter(m => delegation.teamIds.includes(m.teamId))
        .map(m => m.email.toLowerCase())
    );

    return participantsNeedingAccommodation.filter(p =>
      delegationEmails.has(p.email.toLowerCase())
    );
  };

  // Helper: Get allocations for a specific delegation
  const getAllocationsForDelegation = (delegationId: string): EMSAccommodation[] => {
    const delegation = delegationStore.getById(delegationId);
    if (!delegation) return [];

    const allTeamMembers = teamMemberStore.getAll();
    const delegationEmails = new Set(
      allTeamMembers
        .filter(m => delegation.teamIds.includes(m.teamId))
        .map(m => m.email.toLowerCase())
    );

    return allocations.filter(acc => {
      const participant = getParticipant(acc.participantId);
      if (!participant) return false;
      return delegationEmails.has(participant.email.toLowerCase());
    });
  };

  // Build participants map for DelegationAccommodationCard
  const participantsMap = new Map<string, EMSParticipant>();
  allocations.forEach(acc => {
    const p = getParticipant(acc.participantId);
    if (p) participantsMap.set(acc.participantId, p);
  });

  // Delegation-level bulk allocate (opens modal with pre-selected IDs)
  const handleDelegationAllocate = (ids: string[]) => {
    setSelectedPendingIds(ids);
    setShowBulkAllocateModal(true);
  };

  // Delegation-level bulk confirm
  const handleDelegationConfirm = (ids: string[]) => {
    const count = accommodationStore.confirmAll(ids, 'Admin - Delegation bulk confirm');
    loadData();
    toast.success(`${count} allocations confirmed for delegation`);
  };

  const handleAddHotel = () => {
    if (!newHotelData.name || !newHotelData.city || !newHotelData.contact) {
      toast.error('Please fill in all required fields');
      return;
    }

    hotelStore.create({
      name: newHotelData.name,
      city: newHotelData.city,
      address: newHotelData.address,
      category: newHotelData.category,
      capacity: newHotelData.capacity,
      roomTypes: newHotelData.roomTypes,
      contact: newHotelData.contact,
    });

    toast.success(`Hotel "${newHotelData.name}" added successfully`);
    setShowAddHotelModal(false);
    setNewHotelData({
      name: '',
      city: '',
      address: '',
      category: 'Standard',
      capacity: 50,
      roomTypes: ['Standard', 'Deluxe'],
      contact: '',
    });
    loadData();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accommodation"
        description="Manage hotel inventory and room allocations"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatsCard title="Provisional" value={stats.provisional} icon={Bed} />
        <StatsCard title="Confirmed" value={stats.confirmed} icon={Hotel} trend={{ value: stats.confirmed, isPositive: true }} />
        <StatsCard title="Checked-In" value={stats.checkedIn} icon={CheckCircle} />
        <StatsCard title="Checked-Out" value={stats.checkedOut} icon={LogOut} />
        <StatsCard title="Total Allocated" value={stats.total - stats.cancelled} icon={Users} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="allocations">Room Allocations</TabsTrigger>
          <TabsTrigger value="hotels">Hotels Inventory</TabsTrigger>
          <TabsTrigger value="rooming">Rooming List</TabsTrigger>
        </TabsList>

        <TabsContent value="allocations" className="space-y-6 mt-4">
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
                <Flag className="h-4 w-4 mr-1" />
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

          {/* Delegation Cards View for Team Mode */}
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
                    const pendingParticipants = getPendingForDelegation(delegation.id);
                    const delegationAllocations = getAllocationsForDelegation(delegation.id);
                    return (
                      <DelegationAccommodationCard
                        key={delegation.id}
                        delegation={delegation}
                        pendingParticipants={pendingParticipants}
                        allocations={delegationAllocations}
                        participants={participantsMap}
                        onAllocate={handleDelegationAllocate}
                        onConfirm={handleDelegationConfirm}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Section 1: Participants Needing Accommodation */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Bed className="h-5 w-5" />
                      Pending Accommodation ({filteredPendingParticipants.length})
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Bulk Actions for Pending */}
                  {selectedPendingIds.length > 0 && (
                    <div className="flex items-center gap-4 p-3 bg-primary/10 rounded-lg border border-primary/20 mb-4">
                      <span className="text-sm font-medium">{selectedPendingIds.length} selected</span>
                      <Button size="sm" onClick={() => setShowBulkAllocateModal(true)}>
                        <Sparkles className="h-4 w-4 mr-1" />
                        Bulk Allocate
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setSelectedPendingIds([])}>
                        Clear Selection
                      </Button>
                    </div>
                  )}

                  {filteredPendingParticipants.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">
                      No participants awaiting accommodation
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <Checkbox
                              checked={allPendingSelected}
                              onCheckedChange={handleSelectAllPending}
                            />
                          </TableHead>
                          <TableHead>Participant</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Nationality</TableHead>
                          <TableHead>Travel Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPendingParticipants.map((participant) => {
                          return (
                            <TableRow key={participant.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedPendingIds.includes(participant.id)}
                                  onCheckedChange={(checked) => handleSelectOnePending(participant.id, !!checked)}
                                />
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium" dir="auto">{participant.firstName} {participant.lastName}</p>
                                  <p className="text-sm text-muted-foreground">{participant.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{participant.role}</Badge>
                              </TableCell>
                              <TableCell>
                                <StatusBadge status="Ticketed" variant="success" />
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setPreSelectedParticipantId(participant.id);
                                    setEditAllocation(null);
                                    setShowAddModal(true);
                                  }}
                                >
                                  <Hotel className="h-4 w-4 mr-1" />
                                  Accommodate
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Section 2: Accommodated Participants */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Hotel className="h-5 w-5" />
                      Accommodated Participants ({filteredAllocations.length})
                    </CardTitle>
                    <div className="flex gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 w-64"
                        />
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="Provisional">Provisional</SelectItem>
                          <SelectItem value="Confirmed">Confirmed</SelectItem>
                          <SelectItem value="Checked-In">Checked-In</SelectItem>
                          <SelectItem value="Checked-Out">Checked-Out</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="icon" onClick={loadData}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Bulk Actions */}
                  {selectedIds.length > 0 && (
                    <div className="flex items-center gap-4 p-3 bg-muted rounded-lg mb-4">
                      <span className="text-sm font-medium">{selectedIds.length} selected</span>
                      <Button size="sm" onClick={handleBulkConfirm}>
                        <Check className="h-4 w-4 mr-1" /> Confirm All
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setSelectedIds([])}>
                        Clear
                      </Button>
                    </div>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={allProvisionalSelected}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Participant</TableHead>
                        <TableHead>Hotel</TableHead>
                        <TableHead>Room</TableHead>
                        <TableHead>Check-in</TableHead>
                        <TableHead>Check-out</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Conf. #</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAllocations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No accommodated participants yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAllocations.map((acc) => {
                          const participant = getParticipant(acc.participantId);
                          return (
                            <TableRow key={acc.id}>
                              <TableCell>
                                {acc.status === 'Provisional' && (
                                  <Checkbox
                                    checked={selectedIds.includes(acc.id)}
                                    onCheckedChange={(checked) => handleSelectOne(acc.id, !!checked)}
                                  />
                                )}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{participant?.firstName} {participant?.lastName}</p>
                                  <p className="text-sm text-muted-foreground">{participant?.role}</p>
                                </div>
                              </TableCell>
                              <TableCell>{acc.hotelName}</TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <Badge variant="outline" className="font-mono w-fit">{acc.roomNumber}</Badge>
                                  <span className="text-xs text-muted-foreground">{acc.roomType}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{acc.checkIn}</TableCell>
                              <TableCell className="text-sm">{acc.checkOut}</TableCell>
                              <TableCell>
                                <StatusBadge status={acc.status} variant={getStatusVariant(acc.status)} />
                              </TableCell>
                              <TableCell>
                                {acc.confirmationNumber ? (
                                  <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">
                                    {acc.confirmationNumber}
                                  </code>
                                ) : '-'}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {acc.status === 'Provisional' && (
                                    <>
                                      <Button variant="ghost" size="sm" onClick={() => handleConfirm(acc.id)} title="Confirm">
                                        <Check className="h-4 w-4 text-green-600" />
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={() => handleCancel(acc.id)} title="Cancel">
                                        <X className="h-4 w-4 text-red-600" />
                                      </Button>
                                    </>
                                  )}
                                  {acc.status === 'Confirmed' && (
                                    <Button variant="ghost" size="sm" onClick={() => handleCheckIn(acc.id)} title="Check-in">
                                      <LogIn className="h-4 w-4 text-blue-600" />
                                    </Button>
                                  )}
                                  {acc.status === 'Checked-In' && (
                                    <Button variant="ghost" size="sm" onClick={() => handleCheckOut(acc.id)} title="Check-out">
                                      <LogOut className="h-4 w-4 text-orange-600" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditAllocation(acc);
                                      setShowAddModal(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="hotels" className="space-y-4 mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Hotel Inventory</h3>
            <Button onClick={() => setShowAddHotelModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Hotel
            </Button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hotels.map((hotel) => {
              const { occupants, capacity, percent } = getHotelOccupancy(hotel.id);
              return (
                <Card
                  key={hotel.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedHotel(hotel)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Hotel className="h-5 w-5 text-primary" />
                      {hotel.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">{hotel.city}</p>
                      <Badge variant={hotel.category === 'VVIP' ? 'default' : hotel.category === 'VIP' ? 'secondary' : 'outline'}>
                        {hotel.category}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Occupancy</span>
                        <span>{occupants}/{capacity} ({percent}%)</span>
                      </div>
                      <Progress
                        value={percent}
                        className="h-2"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {hotel.roomTypes.map((type, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{type}</Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{hotel.contact}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="rooming" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Rooming List by Hotel</h3>
            <Button variant="outline" size="sm">
              <FileDown className="h-4 w-4 mr-2" /> Export PDF
            </Button>
          </div>
          <Card>
            <CardContent className="pt-6">
              {hotels.map((hotel) => {
                const hotelAllocations = allocations.filter(
                  a => a.hotelId === hotel.id && a.status !== 'Cancelled'
                );
                if (hotelAllocations.length === 0) return null;
                return (
                  <div key={hotel.id} className="mb-6 last:mb-0">
                    <h3 className="font-medium flex items-center gap-2 mb-3">
                      <Hotel className="h-4 w-4" />
                      {hotel.name}
                      <Badge variant="outline">{hotelAllocations.length} guests</Badge>
                    </h3>
                    <div className="grid gap-2 pl-6">
                      {hotelAllocations.map((acc) => {
                        const participant = getParticipant(acc.participantId);
                        return (
                          <div key={acc.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="font-mono">{acc.roomNumber}</Badge>
                              <span>{participant?.firstName} {participant?.lastName}</span>
                              <Badge variant="secondary" className="text-xs">{participant?.role}</Badge>
                            </div>
                            <StatusBadge status={acc.status} variant={getStatusVariant(acc.status)} size="sm" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {hotels.every(hotel =>
                allocations.filter(a => a.hotelId === hotel.id && a.status !== 'Cancelled').length === 0
              ) && (
                  <p className="text-center text-muted-foreground py-8">
                    No room allocations yet. Create allocations from the Room Allocations tab.
                  </p>
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Hotel Detail Dialog */}
      <Dialog open={!!selectedHotel} onOpenChange={() => setSelectedHotel(null)}>
        <DialogContent className="max-w-lg">
          {selectedHotel && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Hotel className="h-5 w-5" />
                  {selectedHotel.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-sm">City</Label>
                    <p className="font-medium">{selectedHotel.city}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Category</Label>
                    <Badge variant={selectedHotel.category === 'VVIP' ? 'default' : 'secondary'}>
                      {selectedHotel.category}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Capacity</Label>
                    <p className="font-medium">{selectedHotel.capacity} rooms</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Contact</Label>
                    <p className="font-medium">{selectedHotel.contact}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Room Types</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedHotel.roomTypes.map((type, i) => (
                      <Badge key={i} variant="secondary">{type}</Badge>
                    ))}
                  </div>
                </div>
                {selectedHotel.amenities && selectedHotel.amenities.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground text-sm">Amenities</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedHotel.amenities.map((amenity, i) => (
                        <Badge key={i} variant="outline">{amenity}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground text-sm">Current Occupancy</Label>
                  <div className="mt-2">
                    {(() => {
                      const { occupants, capacity, percent } = getHotelOccupancy(selectedHotel.id);
                      return (
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>{occupants} guests</span>
                            <span>{percent}%</span>
                          </div>
                          <Progress value={percent} className="h-2" />
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Allocation Modal */}
      <AddAllocationModal
        open={showAddModal}
        onOpenChange={(open) => {
          setShowAddModal(open);
          if (!open) {
            setEditAllocation(null);
            setPreSelectedParticipantId(null);
          }
        }}
        onSuccess={loadData}
        editAllocation={editAllocation}
        preSelectedParticipantId={preSelectedParticipantId}
      />

      {/* Add Hotel Modal */}
      <Dialog open={showAddHotelModal} onOpenChange={setShowAddHotelModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Hotel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hotelName">Hotel Name *</Label>
                <Input
                  id="hotelName"
                  placeholder="e.g., Grand Plaza Hotel"
                  value={newHotelData.name}
                  onChange={(e) => setNewHotelData({ ...newHotelData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="e.g., Dubai"
                  value={newHotelData.city}
                  onChange={(e) => setNewHotelData({ ...newHotelData, city: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="Full hotel address"
                value={newHotelData.address}
                onChange={(e) => setNewHotelData({ ...newHotelData, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newHotelData.category}
                  onValueChange={(v: 'VVIP' | 'VIP' | 'Standard') => setNewHotelData({ ...newHotelData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VVIP">VVIP</SelectItem>
                    <SelectItem value="VIP">VIP</SelectItem>
                    <SelectItem value="Standard">Standard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Room Capacity *</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={newHotelData.capacity}
                  onChange={(e) => setNewHotelData({ ...newHotelData, capacity: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">Contact Number *</Label>
              <Input
                id="contact"
                placeholder="+971 4 123 4567"
                value={newHotelData.contact}
                onChange={(e) => setNewHotelData({ ...newHotelData, contact: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Room Types</Label>
              <div className="flex gap-2">
                {['Standard', 'Deluxe', 'Suite', 'Executive Suite'].map(type => (
                  <Badge
                    key={type}
                    variant={newHotelData.roomTypes.includes(type) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      if (newHotelData.roomTypes.includes(type)) {
                        setNewHotelData({
                          ...newHotelData,
                          roomTypes: newHotelData.roomTypes.filter(t => t !== type)
                        });
                      } else {
                        setNewHotelData({
                          ...newHotelData,
                          roomTypes: [...newHotelData.roomTypes, type]
                        });
                      }
                    }}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Click to toggle room types</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddHotelModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddHotel}>
              <Plus className="h-4 w-4 mr-2" />
              Add Hotel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Allocate Modal */}
      <Dialog open={showBulkAllocateModal} onOpenChange={setShowBulkAllocateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Bulk Allocate Team
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Allocate <strong>{selectedPendingIds.length}</strong> team members to the same hotel.
              Check-in/out dates will be derived from each member's travel itinerary.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Hotel *</Label>
                <Select value={bulkHotelId} onValueChange={setBulkHotelId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose hotel..." />
                  </SelectTrigger>
                  <SelectContent>
                    {hotels.map((hotel) => {
                      const occupancy = getHotelOccupancy(hotel.id);
                      return (
                        <SelectItem key={hotel.id} value={hotel.id}>
                          <div className="flex items-center gap-2">
                            <span>{hotel.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({occupancy.occupants}/{hotel.capacity})
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Room Type</Label>
                <Select value={bulkRoomType} onValueChange={setBulkRoomType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Deluxe">Deluxe</SelectItem>
                    <SelectItem value="Suite">Suite</SelectItem>
                    <SelectItem value="Executive">Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">What will happen:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>Each team member gets assigned to the selected hotel</li>
                <li>Room numbers are auto-generated sequentially</li>
                <li>Check-in/out dates sync from their travel itinerary</li>
                <li>Allocations appear in each participant's portal</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkAllocateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkAllocate} disabled={!bulkHotelId}>
              <Hotel className="h-4 w-4 mr-2" />
              Allocate {selectedPendingIds.length} Members
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccommodationPage;
