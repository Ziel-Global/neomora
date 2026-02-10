 import React, { useState, useEffect } from 'react';
 import { PageHeader } from '@/components/common/PageHeader';
 import { DataTable, Column } from '@/components/common/DataTable';
 import { StatusBadge } from '@/components/common/StatusBadge';
 import { Card, CardContent } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Avatar, AvatarFallback } from '@/components/ui/avatar';
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
 } from '@/components/ui/dropdown-menu';
 import {
   Collapsible,
   CollapsibleContent,
   CollapsibleTrigger,
 } from '@/components/ui/collapsible';
 import {
   Flag,
   Users,
   CheckCircle2,
   XCircle,
   Clock,
   MoreHorizontal,
   Eye,
   ChevronDown,
   FileText,
   Download,
   AlertTriangle,
 } from 'lucide-react';
 import { toast } from 'sonner';
 import { delegationStore, teamStore, teamMemberStore, Delegation, Team, TeamMember } from '@/lib/teamStore';
 import { eventStore, participantStore, accommodationStore } from '@/lib/emsStore';
 
 interface DelegationWithDetails extends Delegation {
   eventName: string;
   teams: Team[];
   members: TeamMember[];
   managerName: string;
 }
 
 const DelegationsPage: React.FC = () => {
   const [statusFilter, setStatusFilter] = useState<string>('all');
   const [delegations, setDelegations] = useState<DelegationWithDetails[]>([]);
   const [expandedDelegation, setExpandedDelegation] = useState<string | null>(null);
   
   // Dialog states
   const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
   const [viewMembersDialogOpen, setViewMembersDialogOpen] = useState(false);
   const [selectedDelegation, setSelectedDelegation] = useState<DelegationWithDetails | null>(null);
   const [reason, setReason] = useState('');
 
   const loadData = () => {
     const allDelegations = delegationStore.getAll();
     const enriched: DelegationWithDetails[] = allDelegations.map(d => {
       const event = eventStore.getById(d.eventId);
       const teams = d.teamIds.map(id => teamStore.getById(id)).filter(Boolean) as Team[];
       const members: TeamMember[] = [];
       teams.forEach(t => {
         members.push(...teamMemberStore.getByTeam(t.id));
       });
       
       return {
         ...d,
         eventName: event?.name || 'Unknown Event',
         teams,
         members,
         managerName: d.country + ' Team Manager',
       };
     });
     setDelegations(enriched);
   };
 
   useEffect(() => {
     loadData();
   }, []);
 
   // Stats
   const stats = {
     submitted: delegations.filter(d => d.status === 'Submitted').length,
     approved: delegations.filter(d => d.status === 'Approved').length,
     rejected: delegations.filter(d => d.status === 'Rejected').length,
     draft: delegations.filter(d => d.status === 'Draft').length,
   };
 
   const filteredData = delegations.filter(d => {
     if (statusFilter !== 'all' && d.status !== statusFilter) return false;
     return true;
   });
 
   const handleApprove = (delegation: DelegationWithDetails) => {
     // Approve delegation
     delegationStore.update(delegation.id, { status: 'Approved' });
     
     // Sync all members to participants and accommodation
     delegation.members.forEach(member => {
       // Check if participant already exists
       let participant = participantStore.getByEmail(member.email);
       
       if (!participant) {
         // Create participant from team member
         participant = participantStore.create({
           firstName: member.firstName,
           lastName: member.lastName,
           email: member.email,
           phone: member.phone,
           nationality: member.nationality,
           passportNumber: member.passportNumber,
           passportExpiry: member.passportExpiry,
           organization: delegation.country + ' Delegation',
           jobTitle: member.role,
            role: member.role === 'Athlete' ? 'Athlete' : 'Official',
           dietaryNotes: member.dietaryRequirements || '',
           accessibilityNeeds: '',
           emergencyContact: member.emergencyContact,
         });
       }
       
       // Update team member status
       teamMemberStore.update(member.id, { status: 'Approved' });
       
       // Create accommodation allocation if needed
       if (participant && accommodationStore) {
         // Accommodation will be handled by the accommodation module
       }
     });
     
     // Update all teams status
     delegation.teams.forEach(team => {
       teamStore.update(team.id, { status: 'Approved' });
     });
     
     loadData();
     toast.success(`Delegation from ${delegation.country} approved! ${delegation.members.length} members synced to system.`);
   };
 
   const handleReject = () => {
     if (!selectedDelegation || !reason.trim()) {
       toast.error('Please provide a rejection reason');
       return;
     }
     
     delegationStore.update(selectedDelegation.id, { status: 'Rejected' });
     
     // Update all team members status
     selectedDelegation.members.forEach(member => {
       teamMemberStore.update(member.id, { status: 'Rejected' });
     });
     
     loadData();
     toast.success(`Delegation from ${selectedDelegation.country} rejected`);
     setRejectDialogOpen(false);
     setSelectedDelegation(null);
     setReason('');
   };
 
   const openRejectDialog = (delegation: DelegationWithDetails) => {
     setSelectedDelegation(delegation);
     setReason('');
     setRejectDialogOpen(true);
   };
 
   const openViewMembersDialog = (delegation: DelegationWithDetails) => {
     setSelectedDelegation(delegation);
     setViewMembersDialogOpen(true);
   };
 
   const getRoleBadgeColor = (role: string) => {
     switch (role) {
      case 'Athlete': return 'bg-status-info-bg text-status-info';
      case 'Head Coach': return 'bg-accent/20 text-accent';
      case 'Assistant Coach': return 'bg-accent/10 text-accent';
      case 'Medical Doctor': return 'bg-status-error-bg text-status-error';
      case 'Physiotherapist': return 'bg-status-warning-bg text-status-warning';
      default: return 'bg-muted text-muted-foreground';
     }
   };
 
   const columns: Column<DelegationWithDetails>[] = [
     {
       key: 'country',
       header: 'Delegation',
       sortable: true,
       accessor: (row) => (
         <div className="flex items-center gap-3">
           <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
             <Flag className="h-5 w-5 text-accent" />
           </div>
           <div>
             <p className="font-semibold">{row.country}</p>
             <p className="text-xs text-muted-foreground">{row.managerName}</p>
           </div>
         </div>
       ),
     },
     {
       key: 'event',
       header: 'Event',
       accessor: (row) => (
         <span className="text-sm">{row.eventName}</span>
       ),
     },
     {
       key: 'teams',
       header: 'Teams',
       accessor: (row) => (
         <div className="flex flex-wrap gap-1">
           {row.teams.slice(0, 2).map(t => (
             <Badge key={t.id} variant="secondary" className="text-xs">
               {t.sportCategory}
             </Badge>
           ))}
           {row.teams.length > 2 && (
             <Badge variant="outline" className="text-xs">
               +{row.teams.length - 2} more
             </Badge>
           )}
         </div>
       ),
     },
     {
       key: 'members',
       header: 'Members',
       accessor: (row) => (
         <Button
           variant="ghost"
           size="sm"
           className="h-auto py-1 px-2 -ml-2"
           onClick={(e) => {
             e.stopPropagation();
             openViewMembersDialog(row);
           }}
         >
           <div className="flex items-center gap-1.5">
             <Users className="h-4 w-4 text-muted-foreground" />
             <span className="text-sm font-medium">{row.members.length}</span>
           </div>
         </Button>
       ),
     },
     {
       key: 'submittedAt',
       header: 'Submitted',
       sortable: true,
       accessor: (row) => (
         <span className="text-sm text-muted-foreground">
           {row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : '-'}
         </span>
       ),
     },
     {
       key: 'status',
       header: 'Status',
       accessor: (row) => <StatusBadge status={row.status} />,
     },
     {
       key: 'actions',
       header: '',
       className: 'w-12',
       accessor: (row) => (
         <DropdownMenu>
           <DropdownMenuTrigger asChild>
             <Button variant="ghost" size="icon" className="h-8 w-8">
               <MoreHorizontal className="h-4 w-4" />
             </Button>
           </DropdownMenuTrigger>
           <DropdownMenuContent align="end">
             <DropdownMenuItem
               className="flex items-center gap-2"
               onClick={() => openViewMembersDialog(row)}
             >
               <Eye className="h-4 w-4" />
               View All Members
             </DropdownMenuItem>
             <DropdownMenuSeparator />
             {row.status === 'Submitted' && (
               <>
                 <DropdownMenuItem
                   className="flex items-center gap-2 text-status-success"
                   onClick={() => handleApprove(row)}
                 >
                   <CheckCircle2 className="h-4 w-4" />
                   Approve Delegation
                 </DropdownMenuItem>
                 <DropdownMenuItem
                   className="flex items-center gap-2 text-status-error"
                   onClick={() => openRejectDialog(row)}
                 >
                   <XCircle className="h-4 w-4" />
                   Reject Delegation
                 </DropdownMenuItem>
               </>
             )}
           </DropdownMenuContent>
         </DropdownMenu>
       ),
     },
   ];
 
   return (
     <div className="space-y-6 animate-fade-in">
       <PageHeader
         title="Team Delegations"
         subtitle="Review and approve team-based registrations from delegation managers"
         breadcrumbs={[{ label: 'Delegations' }]}
         actions={
           <Button variant="outline" size="sm">
             <Download className="h-4 w-4 mr-2" />
             Export
           </Button>
         }
       />
 
       {/* Stats Cards */}
       <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
         <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('Submitted')}>
           <CardContent className="pt-4">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm text-muted-foreground">Pending Review</p>
                 <p className="text-2xl font-bold">{stats.submitted}</p>
               </div>
               <div className="h-10 w-10 rounded-lg bg-status-warning-bg flex items-center justify-center">
                 <Clock className="h-5 w-5 text-status-warning" />
               </div>
             </div>
           </CardContent>
         </Card>
         <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('Approved')}>
           <CardContent className="pt-4">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm text-muted-foreground">Approved</p>
                 <p className="text-2xl font-bold">{stats.approved}</p>
               </div>
               <div className="h-10 w-10 rounded-lg bg-status-success-bg flex items-center justify-center">
                 <CheckCircle2 className="h-5 w-5 text-status-success" />
               </div>
             </div>
           </CardContent>
         </Card>
         <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('Rejected')}>
           <CardContent className="pt-4">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm text-muted-foreground">Rejected</p>
                 <p className="text-2xl font-bold">{stats.rejected}</p>
               </div>
               <div className="h-10 w-10 rounded-lg bg-status-error-bg flex items-center justify-center">
                 <XCircle className="h-5 w-5 text-status-error" />
               </div>
             </div>
           </CardContent>
         </Card>
         <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('Draft')}>
           <CardContent className="pt-4">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm text-muted-foreground">Draft</p>
                 <p className="text-2xl font-bold">{stats.draft}</p>
               </div>
               <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                 <FileText className="h-5 w-5 text-muted-foreground" />
               </div>
             </div>
           </CardContent>
         </Card>
       </div>
 
       {/* Empty State or Data Table */}
       {delegations.length === 0 ? (
         <Card className="p-12">
           <div className="flex flex-col items-center justify-center text-center">
             <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
               <Flag className="h-8 w-8 text-muted-foreground" />
             </div>
             <h3 className="text-lg font-semibold mb-2">No Delegations Yet</h3>
             <p className="text-muted-foreground max-w-md">
               Team delegations will appear here when managers submit their teams for approval.
             </p>
           </div>
         </Card>
       ) : (
         <DataTable
           data={filteredData}
           columns={columns}
           keyExtractor={(row) => row.id}
           searchable
           searchPlaceholder="Search by country, event..."
           searchKey={(row) => `${row.country} ${row.eventName}`}
         />
       )}
 
       {/* Reject Dialog */}
       <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Reject Delegation</DialogTitle>
             <DialogDescription>
               Please provide a reason for rejecting this delegation. This will be visible to the team manager.
             </DialogDescription>
           </DialogHeader>
           <div className="space-y-4 py-4">
             <div className="space-y-2">
               <Label htmlFor="reject-reason">Rejection Reason</Label>
               <Textarea
                 id="reject-reason"
                 placeholder="Enter the reason for rejection..."
                 value={reason}
                 onChange={(e) => setReason(e.target.value)}
                 rows={4}
               />
             </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
               Cancel
             </Button>
             <Button variant="destructive" onClick={handleReject}>
               Reject Delegation
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
 
       {/* View Members Dialog */}
       <Dialog open={viewMembersDialogOpen} onOpenChange={setViewMembersDialogOpen}>
         <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle>{selectedDelegation?.country} Delegation - Members</DialogTitle>
             <DialogDescription>
               {selectedDelegation?.members.length} team members for {selectedDelegation?.eventName}
             </DialogDescription>
           </DialogHeader>
           <div className="space-y-4 py-4">
             {selectedDelegation?.teams.map(team => (
               <Collapsible key={team.id} defaultOpen>
                 <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                   <div className="flex items-center gap-3">
                     <span className="font-semibold">{team.name}</span>
                     <Badge variant="secondary">{team.sportCategory}</Badge>
                     <Badge variant="outline">{team.memberCount} members</Badge>
                   </div>
                   <ChevronDown className="h-4 w-4" />
                 </CollapsibleTrigger>
                 <CollapsibleContent className="pt-3">
                   <div className="grid gap-2">
                     {teamMemberStore.getByTeam(team.id).map(member => (
                       <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                         <div className="flex items-center gap-3">
                           <Avatar className="h-9 w-9">
                             <AvatarFallback className="bg-accent/10 text-accent text-xs">
                               {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                             </AvatarFallback>
                           </Avatar>
                           <div>
                             <p className="font-medium text-sm">{member.firstName} {member.lastName}</p>
                             <p className="text-xs text-muted-foreground">{member.email}</p>
                           </div>
                         </div>
                         <div className="flex items-center gap-2">
                           <Badge className={getRoleBadgeColor(member.role)}>{member.role}</Badge>
                           <Badge variant="outline" className="text-xs">{member.nationality}</Badge>
                           <StatusBadge status={member.status} />
                         </div>
                       </div>
                     ))}
                   </div>
                 </CollapsibleContent>
               </Collapsible>
             ))}
           </div>
           <DialogFooter>
             <Button onClick={() => setViewMembersDialogOpen(false)}>
               Close
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   );
 };
 
 export default DelegationsPage;