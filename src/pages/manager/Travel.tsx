 import React, { useState, useEffect } from 'react';
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { useManagerSession } from '@/contexts/ManagerSessionContext';
 import { teamMemberStore, teamStore, TeamMember } from '@/lib/teamStore';
 import { TeamDelegationSelector } from '@/components/manager/TeamDelegationSelector';
 import { travelStore, participantStore } from '@/lib/emsStore';
 import { TravelItineraryCard } from '@/components/travel/TravelItineraryCard';
 import { Plane, Search, Eye, Edit, Ticket, Clock, CheckCircle } from 'lucide-react';
 import { toast } from 'sonner';
 import { StatusBadge } from '@/components/common/StatusBadge';
 
 const ManagerTravelPage: React.FC = () => {
   const { manager } = useManagerSession();
   const [selectedDelegationId, setSelectedDelegationId] = useState<string | null>(null);
   const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
   const [searchTerm, setSearchTerm] = useState('');
   const [members, setMembers] = useState<TeamMember[]>([]);
   const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
   const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
   const [travelPrefs, setTravelPrefs] = useState({
     originCity: '',
     departureAirport: '',
     preferredArrivalDate: '',
     preferredDepartureDate: '',
     seatPreference: 'No Preference' as 'Window' | 'Aisle' | 'No Preference',
     mealPreference: '',
   });
 
   useEffect(() => {
     if (manager) {
       let allMembers = teamMemberStore.getByManager(manager.id);
       
       if (selectedTeamId) {
         allMembers = allMembers.filter(m => m.teamId === selectedTeamId);
       }
       
       if (searchTerm) {
         allMembers = allMembers.filter(m => 
           m.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           m.lastName.toLowerCase().includes(searchTerm.toLowerCase())
         );
       }
       
       setMembers(allMembers);
     }
   }, [manager, selectedDelegationId, selectedTeamId, searchTerm]);
 
   const getTravelBooking = (member: TeamMember) => {
     const participant = participantStore.getAll().find(p => p.email === member.email);
     if (participant) {
       const bookings = travelStore.getByParticipant(participant.id);
       return bookings[0];
     }
     return null;
   };
 
   const getTeamName = (teamId: string) => {
     return teamStore.getById(teamId)?.name || 'Unknown Team';
   };
 
   const handleEditPreferences = (member: TeamMember) => {
     setEditingMember(member);
     const prefs = member.travelPreferences;
     setTravelPrefs({
       originCity: prefs?.originCity || '',
       departureAirport: prefs?.departureAirport || '',
       preferredArrivalDate: prefs?.preferredArrivalDate || '',
       preferredDepartureDate: prefs?.preferredDepartureDate || '',
       seatPreference: prefs?.seatPreference || 'No Preference',
       mealPreference: prefs?.mealPreference || '',
     });
   };
 
   const handleSavePreferences = () => {
     if (!editingMember) return;
     
     teamMemberStore.update(editingMember.id, {
       travelPreferences: {
         ...editingMember.travelPreferences,
         needsVisa: editingMember.travelPreferences?.needsVisa || false,
         needsAccommodation: editingMember.travelPreferences?.needsAccommodation || true,
         needsTransport: true,
         originCity: travelPrefs.originCity,
         departureAirport: travelPrefs.departureAirport,
         preferredArrivalDate: travelPrefs.preferredArrivalDate,
         preferredDepartureDate: travelPrefs.preferredDepartureDate,
         seatPreference: travelPrefs.seatPreference,
         mealPreference: travelPrefs.mealPreference,
       }
     });
     
     toast.success('Travel preferences updated');
     setEditingMember(null);
     
     // Refresh members
     if (manager) {
       let allMembers = teamMemberStore.getByManager(manager.id);
       if (selectedTeamId) {
         allMembers = allMembers.filter(m => m.teamId === selectedTeamId);
       }
       setMembers(allMembers);
     }
   };
 
   // Stats
   const stats = {
     total: members.length,
     ticketed: members.filter(m => getTravelBooking(m)?.status === 'Ticketed').length,
     approved: members.filter(m => getTravelBooking(m)?.status === 'Approved').length,
     requested: members.filter(m => getTravelBooking(m)?.status === 'Requested').length,
     pending: members.filter(m => !getTravelBooking(m) && m.travelPreferences?.needsTransport).length,
   };
 
   if (!manager) return null;
 
   return (
     <div className="space-y-6">
       <div>
         <h1 className="text-2xl font-bold">Team Travel Management</h1>
         <p className="text-muted-foreground">View and manage travel bookings for your team.</p>
       </div>
 
       {/* Stats */}
       <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
         <Card>
           <CardContent className="pt-4">
             <div className="text-2xl font-bold">{stats.total}</div>
             <p className="text-sm text-muted-foreground">Total Members</p>
           </CardContent>
         </Card>
         <Card>
           <CardContent className="pt-4">
             <div className="text-2xl font-bold text-green-600">{stats.ticketed}</div>
             <p className="text-sm text-muted-foreground">Ticketed</p>
           </CardContent>
         </Card>
         <Card>
           <CardContent className="pt-4">
             <div className="text-2xl font-bold text-blue-600">{stats.approved}</div>
             <p className="text-sm text-muted-foreground">Approved</p>
           </CardContent>
         </Card>
         <Card>
           <CardContent className="pt-4">
             <div className="text-2xl font-bold text-amber-600">{stats.requested}</div>
             <p className="text-sm text-muted-foreground">Requested</p>
           </CardContent>
         </Card>
         <Card>
           <CardContent className="pt-4">
             <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
             <p className="text-sm text-muted-foreground">Pending Setup</p>
           </CardContent>
         </Card>
       </div>
 
       {/* Filters */}
       <Card>
         <CardContent className="pt-6">
           <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
             <TeamDelegationSelector
               selectedDelegationId={selectedDelegationId}
               selectedTeamId={selectedTeamId}
               onDelegationChange={setSelectedDelegationId}
               onTeamChange={setSelectedTeamId}
             />
             <div className="relative w-full md:w-64">
               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input
                 placeholder="Search members..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="pl-10"
               />
             </div>
           </div>
         </CardContent>
       </Card>
 
       {/* Members List */}
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <Plane className="h-5 w-5" />
             Team Travel Status ({members.length})
           </CardTitle>
         </CardHeader>
         <CardContent className="p-0">
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Member</TableHead>
                 <TableHead>Team</TableHead>
                 <TableHead>Origin</TableHead>
                 <TableHead>Travel Dates</TableHead>
                 <TableHead>Status</TableHead>
                 <TableHead>Actions</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {members.length === 0 ? (
                 <TableRow>
                   <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                     No team members found
                   </TableCell>
                 </TableRow>
               ) : (
                 members.map((member) => {
                   const booking = getTravelBooking(member);
                   const prefs = member.travelPreferences;
                   
                   return (
                     <TableRow key={member.id}>
                       <TableCell>
                         <div>
                           <p className="font-medium">{member.firstName} {member.lastName}</p>
                           <p className="text-sm text-muted-foreground">{member.role}</p>
                         </div>
                       </TableCell>
                       <TableCell>
                         <Badge variant="outline">{getTeamName(member.teamId)}</Badge>
                       </TableCell>
                       <TableCell>
                         {booking?.originCity || prefs?.originCity || (
                           <span className="text-muted-foreground">Not set</span>
                         )}
                       </TableCell>
                       <TableCell>
                         {booking ? (
                           <span className="text-sm">
                             {booking.preferredDepartureDate} - {booking.preferredReturnDate}
                           </span>
                         ) : prefs?.preferredArrivalDate ? (
                           <span className="text-sm">
                             {prefs.preferredArrivalDate} - {prefs.preferredDepartureDate}
                           </span>
                         ) : (
                           <span className="text-muted-foreground">Not set</span>
                         )}
                       </TableCell>
                       <TableCell>
                         {booking ? (
                           <StatusBadge status={booking.status} />
                         ) : prefs?.needsTransport ? (
                           <Badge variant="secondary">Preferences Set</Badge>
                         ) : (
                           <Badge variant="outline">No Travel</Badge>
                         )}
                       </TableCell>
                       <TableCell>
                         <div className="flex items-center gap-1">
                           {booking?.status === 'Ticketed' && (
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={() => setSelectedMember(member)}
                             >
                               <Eye className="h-4 w-4" />
                             </Button>
                           )}
                           {(!booking || booking.status === 'Requested') && (
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => handleEditPreferences(member)}
                             >
                               <Edit className="h-4 w-4 mr-1" />
                               Edit
                             </Button>
                           )}
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
 
       {/* View Itinerary Dialog */}
       <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
         <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
           {selectedMember && (() => {
             const booking = getTravelBooking(selectedMember);
             if (!booking || booking.status !== 'Ticketed') return null;
             
             return (
               <>
                 <DialogHeader>
                   <DialogTitle className="flex items-center gap-2">
                     <Ticket className="h-5 w-5 text-primary" />
                     Travel Itinerary - {selectedMember.firstName} {selectedMember.lastName}
                   </DialogTitle>
                 </DialogHeader>
                 <TravelItineraryCard
                   booking={booking}
                   passengerName={`${selectedMember.firstName} ${selectedMember.lastName}`}
                   isVIP={selectedMember.role === 'VVIP' || selectedMember.role === 'VIP'}
                 />
               </>
             );
           })()}
         </DialogContent>
       </Dialog>
 
       {/* Edit Preferences Dialog */}
       <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>
               Edit Travel Preferences - {editingMember?.firstName} {editingMember?.lastName}
             </DialogTitle>
           </DialogHeader>
           
           <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Origin City</Label>
                 <Input
                   value={travelPrefs.originCity}
                   onChange={(e) => setTravelPrefs({ ...travelPrefs, originCity: e.target.value })}
                   placeholder="e.g., London"
                 />
               </div>
               <div className="space-y-2">
                 <Label>Departure Airport</Label>
                 <Input
                   value={travelPrefs.departureAirport}
                   onChange={(e) => setTravelPrefs({ ...travelPrefs, departureAirport: e.target.value })}
                   placeholder="e.g., LHR"
                 />
               </div>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Preferred Arrival Date</Label>
                 <Input
                   type="date"
                   value={travelPrefs.preferredArrivalDate}
                   onChange={(e) => setTravelPrefs({ ...travelPrefs, preferredArrivalDate: e.target.value })}
                 />
               </div>
               <div className="space-y-2">
                 <Label>Preferred Departure Date</Label>
                 <Input
                   type="date"
                   value={travelPrefs.preferredDepartureDate}
                   onChange={(e) => setTravelPrefs({ ...travelPrefs, preferredDepartureDate: e.target.value })}
                 />
               </div>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Seat Preference</Label>
                 <Select
                   value={travelPrefs.seatPreference}
                   onValueChange={(v) => setTravelPrefs({ ...travelPrefs, seatPreference: v as any })}
                 >
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="Window">Window</SelectItem>
                     <SelectItem value="Aisle">Aisle</SelectItem>
                     <SelectItem value="No Preference">No Preference</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label>Meal Preference</Label>
                 <Input
                   value={travelPrefs.mealPreference}
                   onChange={(e) => setTravelPrefs({ ...travelPrefs, mealPreference: e.target.value })}
                   placeholder="e.g., Vegetarian"
                 />
               </div>
             </div>
           </div>
           
           <DialogFooter>
             <Button variant="outline" onClick={() => setEditingMember(null)}>Cancel</Button>
             <Button onClick={handleSavePreferences}>Save Preferences</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   );
 };
 
 export default ManagerTravelPage;