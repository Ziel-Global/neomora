 import React, { useState, useEffect } from 'react';
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
 import { useManagerSession } from '@/contexts/ManagerSessionContext';
 import { teamStore, Team, SPORT_CATEGORIES } from '@/lib/teamStore';
 import { eventStore } from '@/lib/emsStore';
 import { Plus, Users, Trash2, Edit, Eye } from 'lucide-react';
 import { Badge } from '@/components/ui/badge';
 import { toast } from 'sonner';
 import { useNavigate } from 'react-router-dom';
 
 const TeamsPage: React.FC = () => {
   const navigate = useNavigate();
   const { manager } = useManagerSession();
   const [teams, setTeams] = useState<Team[]>([]);
   const [isCreateOpen, setIsCreateOpen] = useState(false);
   const [selectedSport, setSelectedSport] = useState('');
   const [formData, setFormData] = useState({
     name: '',
     sportCategory: '',
     subCategory: '',
     eventId: '',
   });
 
   const events = eventStore.getAll().filter(e => e.status === 'Published' || e.status === 'Ongoing');
 
   useEffect(() => {
     if (manager) {
       refreshTeams();
     }
   }, [manager]);
 
   const refreshTeams = () => {
     if (manager) {
       setTeams(teamStore.getByManager(manager.id));
     }
   };
 
   const handleCreateTeam = () => {
     if (!manager) return;
     if (!formData.name || !formData.sportCategory) {
       toast.error('Please fill in all required fields');
       return;
     }
 
     teamStore.create({
       managerId: manager.id,
       name: formData.name,
       country: manager.country,
       sportCategory: formData.sportCategory,
       subCategory: formData.subCategory,
       eventId: formData.eventId,
     });
 
     toast.success('Team created successfully!');
     setFormData({ name: '', sportCategory: '', subCategory: '', eventId: '' });
     setSelectedSport('');
     setIsCreateOpen(false);
     refreshTeams();
   };
 
   const handleDeleteTeam = (teamId: string) => {
     if (confirm('Are you sure you want to delete this team? All members will also be removed.')) {
       teamStore.delete(teamId);
       toast.success('Team deleted');
       refreshTeams();
     }
   };
 
   const getStatusColor = (status: string) => {
     switch (status) {
       case 'Approved': return 'bg-green-100 text-green-800';
       case 'Submitted': return 'bg-blue-100 text-blue-800';
       case 'Under Review': return 'bg-yellow-100 text-yellow-800';
       case 'Rejected': return 'bg-red-100 text-red-800';
       default: return 'bg-gray-100 text-gray-800';
     }
   };
 
   const selectedCategory = SPORT_CATEGORIES.find(c => c.id === selectedSport);
 
   return (
     <div className="space-y-6">
       <div className="flex justify-between items-start">
         <div>
           <h1 className="text-3xl font-bold">My Teams</h1>
           <p className="text-muted-foreground mt-1">
             Create and manage teams for your delegation
           </p>
         </div>
         <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
           <DialogTrigger asChild>
             <Button>
               <Plus className="h-4 w-4 mr-2" />
               Create Team
             </Button>
           </DialogTrigger>
           <DialogContent>
             <DialogHeader>
               <DialogTitle>Create New Team</DialogTitle>
             </DialogHeader>
             <div className="space-y-4 py-4">
               <div className="space-y-2">
                 <Label>Team Name *</Label>
                 <Input
                   placeholder="e.g., Saudi Athletics Team"
                   value={formData.name}
                   onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                 />
               </div>
 
               <div className="space-y-2">
                 <Label>Event (Optional)</Label>
                 <Select
                   value={formData.eventId}
                   onValueChange={(v) => setFormData(prev => ({ ...prev, eventId: v }))}
                 >
                   <SelectTrigger>
                     <SelectValue placeholder="Select event" />
                   </SelectTrigger>
                   <SelectContent>
                     {events.map(e => (
                       <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
 
               <div className="space-y-2">
                 <Label>Sport Category *</Label>
                 <Select
                   value={selectedSport}
                   onValueChange={(v) => {
                     setSelectedSport(v);
                     const cat = SPORT_CATEGORIES.find(c => c.id === v);
                     setFormData(prev => ({
                       ...prev,
                       sportCategory: cat?.name || '',
                       subCategory: ''
                     }));
                   }}
                 >
                   <SelectTrigger>
                     <SelectValue placeholder="Select sport" />
                   </SelectTrigger>
                   <SelectContent>
                     {SPORT_CATEGORIES.map(cat => (
                       <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
 
               {selectedCategory && selectedCategory.subCategories.length > 0 && (
                 <div className="space-y-2">
                   <Label>Sub-Category</Label>
                   <Select
                     value={formData.subCategory}
                     onValueChange={(v) => setFormData(prev => ({ ...prev, subCategory: v }))}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Select sub-category" />
                     </SelectTrigger>
                     <SelectContent>
                       {selectedCategory.subCategories.map(sub => (
                         <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
               )}
             </div>
             <DialogFooter>
               <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
               <Button onClick={handleCreateTeam}>Create Team</Button>
             </DialogFooter>
           </DialogContent>
         </Dialog>
       </div>
 
       {teams.length === 0 ? (
         <Card>
           <CardContent className="py-12 text-center">
             <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
             <h3 className="font-semibold mb-2">No teams yet</h3>
             <p className="text-muted-foreground mb-4">Create your first team to start adding members</p>
             <Button onClick={() => setIsCreateOpen(true)}>
               <Plus className="h-4 w-4 mr-2" />
               Create Team
             </Button>
           </CardContent>
         </Card>
       ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {teams.map(team => (
             <Card key={team.id} className="hover:shadow-md transition-shadow">
               <CardHeader className="pb-3">
                 <div className="flex justify-between items-start">
                   <div>
                     <CardTitle className="text-lg">{team.name}</CardTitle>
                     <CardDescription>
                       {team.sportCategory}
                       {team.subCategory && ` • ${team.subCategory}`}
                     </CardDescription>
                   </div>
                   <Badge className={getStatusColor(team.status)}>{team.status}</Badge>
                 </div>
               </CardHeader>
               <CardContent>
                 <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                   <Users className="h-4 w-4" />
                   <span>{team.memberCount} members</span>
                 </div>
                 <div className="flex gap-2">
                   <Button
                     size="sm"
                     variant="outline"
                     className="flex-1"
                     onClick={() => navigate(`/manager/add-members?teamId=${team.id}`)}
                   >
                     <Plus className="h-4 w-4 mr-1" />
                     Add Members
                   </Button>
                   <Button
                     size="sm"
                     variant="ghost"
                     onClick={() => handleDeleteTeam(team.id)}
                   >
                     <Trash2 className="h-4 w-4 text-destructive" />
                   </Button>
                 </div>
               </CardContent>
             </Card>
           ))}
         </div>
       )}
     </div>
   );
 };
 
 export default TeamsPage;