 import React, { useState, useEffect } from 'react';
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { useNavigate } from 'react-router-dom';
 import { useManagerSession } from '@/contexts/ManagerSessionContext';
 import { teamStore, teamMemberStore, delegationStore, Team, Delegation } from '@/lib/teamStore';
 import { eventStore } from '@/lib/emsStore';
 import { StatsCard } from '@/components/common/StatsCard';
 import { Users, UserPlus, Flag, ClipboardList, ArrowRight, Calendar } from 'lucide-react';
 import { Badge } from '@/components/ui/badge';
 
 const ManagerDashboard: React.FC = () => {
   const navigate = useNavigate();
   const { manager } = useManagerSession();
   const [teams, setTeams] = useState<Team[]>([]);
   const [delegations, setDelegations] = useState<Delegation[]>([]);
   const [totalMembers, setTotalMembers] = useState(0);
 
   useEffect(() => {
     if (manager) {
       const managerTeams = teamStore.getByManager(manager.id);
       const managerDelegations = delegationStore.getByManager(manager.id);
       const members = teamMemberStore.getByManager(manager.id);
       
       setTeams(managerTeams);
       setDelegations(managerDelegations);
       setTotalMembers(members.length);
     }
   }, [manager]);
 
   const events = eventStore.getAll().filter(e => e.status === 'Published' || e.status === 'Ongoing');
 
   const getStatusColor = (status: string) => {
     switch (status) {
       case 'Approved': return 'bg-green-100 text-green-800';
       case 'Submitted': return 'bg-blue-100 text-blue-800';
       case 'Under Review': return 'bg-yellow-100 text-yellow-800';
       case 'Rejected': return 'bg-red-100 text-red-800';
       default: return 'bg-gray-100 text-gray-800';
     }
   };
 
   return (
     <div className="space-y-6">
       <div>
         <h1 className="text-3xl font-bold">Welcome, {manager?.firstName}!</h1>
         <p className="text-muted-foreground mt-1">
           Manage your delegation for {manager?.country}
         </p>
       </div>
 
       {/* Stats */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <StatsCard
           title="Total Teams"
           value={teams.length}
          icon={Users}
         />
         <StatsCard
           title="Total Members"
           value={totalMembers}
          icon={UserPlus}
         />
         <StatsCard
           title="Delegations"
           value={delegations.length}
          icon={Flag}
         />
         <StatsCard
           title="Pending Approval"
           value={teams.filter(t => t.status === 'Submitted').length}
          icon={ClipboardList}
         />
       </div>
 
       {/* Quick Actions */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/manager/teams')}>
           <CardContent className="p-6 flex items-center gap-4">
             <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
               <Users className="h-6 w-6 text-primary" />
             </div>
             <div className="flex-1">
               <h3 className="font-semibold">Manage Teams</h3>
               <p className="text-sm text-muted-foreground">Create and organize sport teams</p>
             </div>
             <ArrowRight className="h-5 w-5 text-muted-foreground" />
           </CardContent>
         </Card>
 
         <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/manager/add-members')}>
           <CardContent className="p-6 flex items-center gap-4">
             <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
               <UserPlus className="h-6 w-6 text-green-600" />
             </div>
             <div className="flex-1">
               <h3 className="font-semibold">Add Members</h3>
               <p className="text-sm text-muted-foreground">Register athletes and staff</p>
             </div>
             <ArrowRight className="h-5 w-5 text-muted-foreground" />
           </CardContent>
         </Card>
 
         <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/manager/delegations')}>
           <CardContent className="p-6 flex items-center gap-4">
             <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
               <Flag className="h-6 w-6 text-purple-600" />
             </div>
             <div className="flex-1">
               <h3 className="font-semibold">Submit Delegation</h3>
               <p className="text-sm text-muted-foreground">Finalize and submit your teams</p>
             </div>
             <ArrowRight className="h-5 w-5 text-muted-foreground" />
           </CardContent>
         </Card>
       </div>
 
       {/* Available Events */}
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <Calendar className="h-5 w-5" />
             Available Events
           </CardTitle>
           <CardDescription>Events open for team registration</CardDescription>
         </CardHeader>
         <CardContent>
           {events.length === 0 ? (
             <p className="text-muted-foreground text-center py-8">No events currently available for registration.</p>
           ) : (
             <div className="space-y-3">
               {events.map(event => (
                 <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                   <div>
                     <h4 className="font-medium">{event.name}</h4>
                     <p className="text-sm text-muted-foreground">
                       {event.city} • {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                     </p>
                   </div>
                   <Button size="sm" onClick={() => navigate('/manager/teams')}>
                     Register Team
                   </Button>
                 </div>
               ))}
             </div>
           )}
         </CardContent>
       </Card>
 
       {/* Recent Teams */}
       {teams.length > 0 && (
         <Card>
           <CardHeader>
             <CardTitle>Your Teams</CardTitle>
             <CardDescription>Recently created teams</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="space-y-3">
               {teams.slice(0, 5).map(team => (
                 <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                   <div>
                     <h4 className="font-medium">{team.name}</h4>
                     <p className="text-sm text-muted-foreground">
                       {team.sportCategory} • {team.memberCount} members
                     </p>
                   </div>
                   <Badge className={getStatusColor(team.status)}>{team.status}</Badge>
                 </div>
               ))}
             </div>
           </CardContent>
         </Card>
       )}
     </div>
   );
 };
 
 export default ManagerDashboard;