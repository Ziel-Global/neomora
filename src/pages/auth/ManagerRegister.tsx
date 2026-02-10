 import React, { useState } from 'react';
 import { useNavigate, Link } from 'react-router-dom';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { toast } from 'sonner';
 import { useManagerSession, TeamManager } from '@/contexts/ManagerSessionContext';
 import { Users, ArrowLeft } from 'lucide-react';
 import { generateId } from '@/lib/emsStore';
 
 const COUNTRIES = [
   'Saudi Arabia', 'United Arab Emirates', 'Egypt', 'Jordan', 'Kuwait', 
   'Qatar', 'Bahrain', 'Oman', 'Morocco', 'Tunisia', 'Algeria', 'Iraq',
   'USA', 'UK', 'Germany', 'France', 'Japan', 'China', 'Brazil', 'Australia'
 ];
 
 const MANAGERS_KEY = 'ems_team_managers';
 
 const ManagerRegister: React.FC = () => {
   const navigate = useNavigate();
   const { login } = useManagerSession();
   const [isLoading, setIsLoading] = useState(false);
   const [formData, setFormData] = useState({
     firstName: '',
     lastName: '',
     email: '',
     phone: '',
     country: '',
     organization: '',
     federation: '',
   });
 
   const updateField = (field: string, value: string) => {
     setFormData(prev => ({ ...prev, [field]: value }));
   };
 
   const handleRegister = async (e: React.FormEvent) => {
     e.preventDefault();
     setIsLoading(true);
 
     // Check if email already exists
     const managersData = localStorage.getItem(MANAGERS_KEY);
     const managers: TeamManager[] = managersData ? JSON.parse(managersData) : [];
     
     if (managers.some(m => m.email.toLowerCase() === formData.email.toLowerCase())) {
       toast.error('A manager with this email already exists. Please login instead.');
       setIsLoading(false);
       return;
     }
 
     // Create new manager
     const newManager: TeamManager = {
       id: generateId('mgr'),
       ...formData,
       createdAt: new Date().toISOString(),
     };
 
     managers.push(newManager);
     localStorage.setItem(MANAGERS_KEY, JSON.stringify(managers));
 
     // Auto-login
     login(formData.email);
     toast.success('Registration successful! Welcome to the Team Manager Portal.');
     navigate('/manager/dashboard');
     setIsLoading(false);
   };
 
   return (
     <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
       <Card className="w-full max-w-lg">
         <CardHeader className="text-center">
           <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
             <Users className="h-6 w-6 text-primary" />
           </div>
           <CardTitle className="text-2xl">Register as Team Manager</CardTitle>
           <CardDescription>
             Create your account to manage your delegation's registrations
           </CardDescription>
         </CardHeader>
         <CardContent>
           <form onSubmit={handleRegister} className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="firstName">First Name *</Label>
                 <Input
                   id="firstName"
                   value={formData.firstName}
                   onChange={(e) => updateField('firstName', e.target.value)}
                   required
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="lastName">Last Name *</Label>
                 <Input
                   id="lastName"
                   value={formData.lastName}
                   onChange={(e) => updateField('lastName', e.target.value)}
                   required
                 />
               </div>
             </div>
 
             <div className="space-y-2">
               <Label htmlFor="email">Email Address *</Label>
               <Input
                 id="email"
                 type="email"
                 value={formData.email}
                 onChange={(e) => updateField('email', e.target.value)}
                 required
               />
             </div>
 
             <div className="space-y-2">
               <Label htmlFor="phone">Phone Number *</Label>
               <Input
                 id="phone"
                 type="tel"
                 value={formData.phone}
                 onChange={(e) => updateField('phone', e.target.value)}
                 required
               />
             </div>
 
             <div className="space-y-2">
               <Label htmlFor="country">Country *</Label>
               <Select value={formData.country} onValueChange={(v) => updateField('country', v)}>
                 <SelectTrigger>
                   <SelectValue placeholder="Select your country" />
                 </SelectTrigger>
                 <SelectContent>
                   {COUNTRIES.map(c => (
                     <SelectItem key={c} value={c}>{c}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
 
             <div className="space-y-2">
               <Label htmlFor="organization">Organization / Federation *</Label>
               <Input
                 id="organization"
                 value={formData.organization}
                 onChange={(e) => updateField('organization', e.target.value)}
                 placeholder="e.g., Saudi Olympic Committee"
                 required
               />
             </div>
 
             <div className="space-y-2">
               <Label htmlFor="federation">Sport Federation (Optional)</Label>
               <Input
                 id="federation"
                 value={formData.federation}
                 onChange={(e) => updateField('federation', e.target.value)}
                 placeholder="e.g., Saudi Football Federation"
               />
             </div>
 
             <Button type="submit" className="w-full" disabled={isLoading}>
               {isLoading ? 'Creating Account...' : 'Create Manager Account'}
             </Button>
           </form>
 
           <div className="mt-6 text-center space-y-3">
             <p className="text-sm text-muted-foreground">
               Already have an account?{' '}
               <Link to="/login/manager" className="text-primary hover:underline font-medium">
                 Sign In
               </Link>
             </p>
             <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
               <ArrowLeft className="h-4 w-4" />
               Back to Home
             </Link>
           </div>
         </CardContent>
       </Card>
     </div>
   );
 };
 
 export default ManagerRegister;