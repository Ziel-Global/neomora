 import React, { useState, useEffect } from 'react';
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { useManagerSession } from '@/contexts/ManagerSessionContext';
 import { eventStore, invitationStore, participantStore, registrationStore, EMSInvitation, EMSEvent } from '@/lib/emsStore';
 import { teamMemberStore, teamStore, TeamMember } from '@/lib/teamStore';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
 import { UserPlus, CheckCircle, Clock, Plane, FileCheck } from 'lucide-react';
 import { useNavigate } from 'react-router-dom';
 
 interface ReadyToRegister {
   member: TeamMember;
   event: EMSEvent;
   invitation?: EMSInvitation;
   hasTravelPrefs: boolean;
 }
 
 const ManagerRegisterPage: React.FC = () => {
   const { manager } = useManagerSession();
   const navigate = useNavigate();
   const [readyMembers, setReadyMembers] = useState<ReadyToRegister[]>([]);
 
   useEffect(() => {
     if (manager) {
       loadReadyMembers();
     }
   }, [manager]);
 
   const loadReadyMembers = () => {
     if (!manager) return;
 
     const allInvitations = invitationStore.getAll();
     const allParticipants = participantStore.getAll();
     const teamMembers = teamMemberStore.getByManager(manager.id);
     
     const ready: ReadyToRegister[] = [];
 
     // Check accepted invitations for team members
     for (const inv of allInvitations) {
       if (inv.status !== 'Accepted') continue;
       
       const participant = allParticipants.find(p => p.id === inv.participantId);
       const event = eventStore.getById(inv.eventId);
       
       if (participant && event) {
         // Check if already registered
        const existingRegs = registrationStore.getByParticipant(participant.id);
        const existingReg = existingRegs.find(r => r.eventId === event.id);
         if (existingReg) continue;
         
         // Check if this is a team member
         const teamMember = teamMembers.find(m => m.email.toLowerCase() === participant.email.toLowerCase());
         
         if (teamMember) {
           ready.push({
             member: teamMember,
             event,
             invitation: inv,
             hasTravelPrefs: !!teamMember.travelPreferences?.originCity,
           });
         } else {
           // Check if participant is from manager's country
           const isFromCountry = participant.nationality === manager.country;
           if (isFromCountry) {
             // Create virtual member
             ready.push({
               member: {
                 id: participant.id,
                 teamId: '',
                 firstName: participant.firstName,
                 lastName: participant.lastName,
                 email: participant.email,
                 phone: participant.phone,
                 nationality: participant.nationality,
                 passportNumber: participant.passportNumber || '',
                 passportExpiry: participant.passportExpiry || '',
                 dateOfBirth: '',
                 gender: 'Male',
                 sportCategory: '',
                 subCategory: '',
                 role: participant.role,
                 emergencyContact: participant.emergencyContact || '',
                 emergencyPhone: '',
                 dietaryRequirements: participant.dietaryNotes,
                 medicalConditions: '',
                 status: 'Draft',
                 createdAt: participant.createdAt,
                 updatedAt: participant.updatedAt,
               },
               event,
               invitation: inv,
               hasTravelPrefs: false,
             });
           }
         }
       }
     }
 
     // Also check team members who don't have invitations but are ready
     for (const member of teamMembers) {
       // Skip if already in list or already registered for their team's event
       const alreadyInList = ready.some(r => r.member.email.toLowerCase() === member.email.toLowerCase());
       if (alreadyInList) continue;
       
       // Skip members that are already registered
       if (member.registrationStatus === 'Submitted' || member.registrationStatus === 'Approved') continue;
       
       // Get team to find event
       const team = teamStore.getById(member.teamId);
       if (!team) continue;
       
       const event = eventStore.getById(team.eventId);
       if (!event) continue;
       
       // Check if participant exists and is registered
       const participant = participantStore.getByEmail(member.email);
       if (participant) {
        const existingRegs = registrationStore.getByParticipant(participant.id);
        const existingReg = existingRegs.find(r => r.eventId === event.id);
         if (existingReg) continue;
       }
       
       ready.push({
         member,
         event,
         hasTravelPrefs: !!member.travelPreferences?.originCity,
       });
     }
 
     setReadyMembers(ready);
   };
 
   const handleRegister = (item: ReadyToRegister) => {
     navigate(`/manager/register-member?email=${encodeURIComponent(item.member.email)}&eventId=${item.event.id}`);
   };
 
   const registeredCount = teamMemberStore.getByManager(manager?.id || '').filter(
     m => m.registrationStatus === 'Submitted' || m.registrationStatus === 'Approved'
   ).length;
 
   return (
     <div className="space-y-6">
       <div>
         <h1 className="text-3xl font-bold">Register Members</h1>
         <p className="text-muted-foreground mt-1">
           Complete registration for your delegation members
         </p>
       </div>
 
       {/* Stats */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <Card>
           <CardContent className="pt-6">
             <div className="flex items-center gap-4">
               <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                 <UserPlus className="h-6 w-6 text-primary" />
               </div>
               <div>
                 <p className="text-2xl font-bold">{readyMembers.length}</p>
                 <p className="text-sm text-muted-foreground">Ready to Register</p>
               </div>
             </div>
           </CardContent>
         </Card>
         <Card>
           <CardContent className="pt-6">
             <div className="flex items-center gap-4">
               <div className="h-12 w-12 rounded-full bg-status-success-bg flex items-center justify-center">
                 <CheckCircle className="h-6 w-6 text-status-success" />
               </div>
               <div>
                 <p className="text-2xl font-bold">{registeredCount}</p>
                 <p className="text-sm text-muted-foreground">Registered</p>
               </div>
             </div>
           </CardContent>
         </Card>
         <Card>
           <CardContent className="pt-6">
             <div className="flex items-center gap-4">
               <div className="h-12 w-12 rounded-full bg-status-info-bg flex items-center justify-center">
                 <Plane className="h-6 w-6 text-status-info" />
               </div>
               <div>
                 <p className="text-2xl font-bold">{readyMembers.filter(m => m.hasTravelPrefs).length}</p>
                 <p className="text-sm text-muted-foreground">With Travel Prefs</p>
               </div>
             </div>
           </CardContent>
         </Card>
       </div>
 
       {/* Ready to Register Table */}
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <UserPlus className="h-5 w-5" />
             Ready to Register ({readyMembers.length})
           </CardTitle>
           <CardDescription>
             Members with accepted invitations or team members ready for registration. 
             Travel preferences will be pre-filled if set via bulk action.
           </CardDescription>
         </CardHeader>
         <CardContent>
           {readyMembers.length === 0 ? (
             <div className="text-center py-12">
               <FileCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
               <p className="text-muted-foreground">No members ready to register</p>
               <p className="text-sm text-muted-foreground mt-1">
                 Accept invitations or add team members to get started
               </p>
             </div>
           ) : (
             <div className="overflow-x-auto">
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Member</TableHead>
                     <TableHead>Event</TableHead>
                     <TableHead>Role</TableHead>
                     <TableHead>Travel Prefs</TableHead>
                     <TableHead>Actions</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {readyMembers.map((item, idx) => (
                     <TableRow key={`${item.member.id}-${idx}`}>
                       <TableCell>
                         <div>
                           <p className="font-medium">{item.member.firstName} {item.member.lastName}</p>
                           <p className="text-sm text-muted-foreground">{item.member.email}</p>
                         </div>
                       </TableCell>
                       <TableCell>
                         <div>
                           <p className="font-medium">{item.event.name}</p>
                           <p className="text-sm text-muted-foreground">{item.event.city}</p>
                         </div>
                       </TableCell>
                       <TableCell>
                         <Badge variant="secondary">{item.member.role || 'Participant'}</Badge>
                       </TableCell>
                       <TableCell>
                         {item.hasTravelPrefs ? (
                           <Badge className="bg-status-success-bg text-status-success">
                             <Plane className="h-3 w-3 mr-1" />
                             Set
                           </Badge>
                         ) : (
                           <Badge variant="outline" className="text-muted-foreground">
                             <Clock className="h-3 w-3 mr-1" />
                             Not Set
                           </Badge>
                         )}
                       </TableCell>
                       <TableCell>
                         <Button size="sm" onClick={() => handleRegister(item)}>
                           <UserPlus className="h-4 w-4 mr-1" />
                           Register
                         </Button>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </div>
           )}
         </CardContent>
       </Card>
     </div>
   );
 };
 
 export default ManagerRegisterPage;