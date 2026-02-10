 import React from 'react';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Badge } from '@/components/ui/badge';
 import { teamStore, delegationStore, Team, Delegation } from '@/lib/teamStore';
 import { useManagerSession } from '@/contexts/ManagerSessionContext';
 import { Users, Flag } from 'lucide-react';
 
 interface TeamDelegationSelectorProps {
   selectedDelegationId: string | null;
   selectedTeamId: string | null;
   onDelegationChange: (delegationId: string | null) => void;
   onTeamChange: (teamId: string | null) => void;
   showAllOption?: boolean;
 }
 
 export const TeamDelegationSelector: React.FC<TeamDelegationSelectorProps> = ({
   selectedDelegationId,
   selectedTeamId,
   onDelegationChange,
   onTeamChange,
   showAllOption = true,
 }) => {
   const { manager } = useManagerSession();
   
   const delegations = manager ? delegationStore.getByManager(manager.id) : [];
   const teams = manager ? teamStore.getByManager(manager.id) : [];
   
   // Filter teams by selected delegation
   const filteredTeams = selectedDelegationId && selectedDelegationId !== 'all'
     ? teams.filter(t => {
         const delegation = delegationStore.getById(selectedDelegationId);
         return delegation?.teamIds.includes(t.id);
       })
     : teams;
 
   return (
     <div className="flex items-center gap-3">
       {/* Delegation Selector */}
       <div className="flex items-center gap-2">
         <Flag className="h-4 w-4 text-muted-foreground" />
         <Select
           value={selectedDelegationId || 'all'}
           onValueChange={(value) => {
             onDelegationChange(value === 'all' ? null : value);
             onTeamChange(null); // Reset team when delegation changes
           }}
         >
           <SelectTrigger className="w-[180px]">
             <SelectValue placeholder="All Delegations" />
           </SelectTrigger>
           <SelectContent>
             {showAllOption && <SelectItem value="all">All Delegations</SelectItem>}
             {delegations.map((del) => (
               <SelectItem key={del.id} value={del.id}>
                 <div className="flex items-center gap-2">
                   <span>{del.country}</span>
                   <Badge variant="secondary" className="text-xs">{del.totalMembers}</Badge>
                 </div>
               </SelectItem>
             ))}
           </SelectContent>
         </Select>
       </div>
 
       {/* Team Selector */}
       <div className="flex items-center gap-2">
         <Users className="h-4 w-4 text-muted-foreground" />
         <Select
           value={selectedTeamId || 'all'}
           onValueChange={(value) => onTeamChange(value === 'all' ? null : value)}
         >
           <SelectTrigger className="w-[200px]">
             <SelectValue placeholder="All Teams" />
           </SelectTrigger>
           <SelectContent>
             {showAllOption && <SelectItem value="all">All Teams</SelectItem>}
             {filteredTeams.map((team) => (
               <SelectItem key={team.id} value={team.id}>
                 <div className="flex items-center gap-2">
                   <span>{team.name}</span>
                   <Badge variant="outline" className="text-xs">{team.sportCategory}</Badge>
                 </div>
               </SelectItem>
             ))}
           </SelectContent>
         </Select>
       </div>
     </div>
   );
 };