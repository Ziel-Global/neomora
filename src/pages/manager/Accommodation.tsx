 import React, { useState, useEffect } from 'react';
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
 import { Input } from '@/components/ui/input';
 import { useManagerSession } from '@/contexts/ManagerSessionContext';
 import { teamMemberStore, teamStore, TeamMember } from '@/lib/teamStore';
 import { TeamDelegationSelector } from '@/components/manager/TeamDelegationSelector';
 import { accommodationStore, participantStore } from '@/lib/emsStore';
 import { AccommodationCard } from '@/components/accommodation/AccommodationCard';
 import { Hotel, Search, Eye, Calendar, Building2, CheckCircle, Clock } from 'lucide-react';
 import { StatusBadge } from '@/components/common/StatusBadge';
 
 const ManagerAccommodationPage: React.FC = () => {
   const { manager } = useManagerSession();
   const [selectedDelegationId, setSelectedDelegationId] = useState<string | null>(null);
   const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
   const [searchTerm, setSearchTerm] = useState('');
   const [members, setMembers] = useState<TeamMember[]>([]);
   const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
 
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
 
   const getAccommodation = (member: TeamMember) => {
     const participant = participantStore.getAll().find(p => p.email === member.email);
     if (participant) {
       const accommodations = accommodationStore.getAll().filter(a => a.participantId === participant.id);
       return accommodations[0];
     }
     return null;
   };
 
   const getTeamName = (teamId: string) => {
     return teamStore.getById(teamId)?.name || 'Unknown Team';
   };
 
   const formatDate = (dateStr: string) => {
     try {
       return new Date(dateStr).toLocaleDateString('en-US', {
         month: 'short',
         day: 'numeric',
         year: 'numeric',
       });
     } catch {
       return dateStr;
     }
   };
 
   // Stats
   const stats = {
     total: members.length,
     allocated: members.filter(m => !!getAccommodation(m)).length,
     confirmed: members.filter(m => getAccommodation(m)?.status === 'Confirmed').length,
     checkedIn: members.filter(m => getAccommodation(m)?.status === 'Checked-In').length,
     pending: members.filter(m => !getAccommodation(m) && m.travelPreferences?.needsAccommodation).length,
   };
 
   if (!manager) return null;
 
   return (
     <div className="space-y-6">
       <div>
         <h1 className="text-2xl font-bold">Team Accommodation</h1>
         <p className="text-muted-foreground">View accommodation allocations for your team members.</p>
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
             <div className="text-2xl font-bold text-blue-600">{stats.allocated}</div>
             <p className="text-sm text-muted-foreground">Allocated</p>
           </CardContent>
         </Card>
         <Card>
           <CardContent className="pt-4">
             <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
             <p className="text-sm text-muted-foreground">Confirmed</p>
           </CardContent>
         </Card>
         <Card>
           <CardContent className="pt-4">
             <div className="text-2xl font-bold text-emerald-600">{stats.checkedIn}</div>
             <p className="text-sm text-muted-foreground">Checked-In</p>
           </CardContent>
         </Card>
         <Card>
           <CardContent className="pt-4">
             <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
             <p className="text-sm text-muted-foreground">Pending</p>
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
             <Hotel className="h-5 w-5" />
             Team Accommodation Status ({members.length})
           </CardTitle>
           <CardDescription>
             Accommodation is allocated by the event organizers after travel is confirmed.
           </CardDescription>
         </CardHeader>
         <CardContent className="p-0">
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Member</TableHead>
                 <TableHead>Team</TableHead>
                 <TableHead>Hotel</TableHead>
                 <TableHead>Room</TableHead>
                 <TableHead>Dates</TableHead>
                 <TableHead>Status</TableHead>
                 <TableHead>Actions</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {members.length === 0 ? (
                 <TableRow>
                   <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                     No team members found
                   </TableCell>
                 </TableRow>
               ) : (
                 members.map((member) => {
                   const accommodation = getAccommodation(member);
                   
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
                         {accommodation ? (
                           <div className="flex items-center gap-2">
                             <Building2 className="h-4 w-4 text-muted-foreground" />
                             <span>{accommodation.hotelName}</span>
                           </div>
                         ) : (
                           <span className="text-muted-foreground">Not allocated</span>
                         )}
                       </TableCell>
                       <TableCell>
                         {accommodation ? (
                           <div>
                             <Badge variant="secondary" className="font-mono">{accommodation.roomNumber}</Badge>
                             <p className="text-xs text-muted-foreground mt-1">{accommodation.roomType}</p>
                           </div>
                         ) : (
                           <span className="text-muted-foreground">—</span>
                         )}
                       </TableCell>
                       <TableCell>
                         {accommodation ? (
                           <div className="flex items-center gap-1 text-sm">
                             <Calendar className="h-3 w-3 text-muted-foreground" />
                             <span>{formatDate(accommodation.checkIn)}</span>
                             <span className="text-muted-foreground">-</span>
                             <span>{formatDate(accommodation.checkOut)}</span>
                           </div>
                         ) : (
                           <span className="text-muted-foreground">—</span>
                         )}
                       </TableCell>
                       <TableCell>
                         {accommodation ? (
                           <StatusBadge status={accommodation.status} />
                         ) : member.travelPreferences?.needsAccommodation ? (
                           <Badge variant="secondary">
                             <Clock className="h-3 w-3 mr-1" />
                             Pending
                           </Badge>
                         ) : (
                           <Badge variant="outline">Not Requested</Badge>
                         )}
                       </TableCell>
                       <TableCell>
                         {accommodation && (
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => setSelectedMember(member)}
                           >
                             <Eye className="h-4 w-4" />
                           </Button>
                         )}
                       </TableCell>
                     </TableRow>
                   );
                 })
               )}
             </TableBody>
           </Table>
         </CardContent>
       </Card>
 
       {/* View Accommodation Dialog */}
       <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
         <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
           {selectedMember && (() => {
             const accommodation = getAccommodation(selectedMember);
             if (!accommodation) return null;
             
             return (
               <>
                 <DialogHeader className="p-6 pb-0">
                   <DialogTitle className="flex items-center gap-2">
                     <Hotel className="h-5 w-5 text-primary" />
                     Accommodation Details - {selectedMember.firstName} {selectedMember.lastName}
                   </DialogTitle>
                 </DialogHeader>
                 <div className="p-6 pt-4">
                   <AccommodationCard
                     accommodation={accommodation}
                     isVIP={selectedMember.role === 'VVIP' || selectedMember.role === 'VIP'}
                   />
                 </div>
               </>
             );
           })()}
         </DialogContent>
       </Dialog>
     </div>
   );
 };
 
 export default ManagerAccommodationPage;