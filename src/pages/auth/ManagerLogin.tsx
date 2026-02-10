 import React, { useState } from 'react';
 import { useNavigate, Link } from 'react-router-dom';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { toast } from 'sonner';
 import { useManagerSession } from '@/contexts/ManagerSessionContext';
 import { Users, ArrowLeft } from 'lucide-react';
 
 const ManagerLogin: React.FC = () => {
   const navigate = useNavigate();
   const { login } = useManagerSession();
   const [email, setEmail] = useState('');
   const [isLoading, setIsLoading] = useState(false);
 
   const handleLogin = async (e: React.FormEvent) => {
     e.preventDefault();
     setIsLoading(true);
 
     // Simulate API call
     await new Promise(resolve => setTimeout(resolve, 500));
 
     const manager = login(email);
     if (manager) {
       toast.success(`Welcome back, ${manager.firstName}!`);
       navigate('/manager/dashboard');
     } else {
       toast.error('No manager account found with this email. Please register first.');
     }
     setIsLoading(false);
   };
 
   return (
     <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
       <Card className="w-full max-w-md">
         <CardHeader className="text-center">
           <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
             <Users className="h-6 w-6 text-primary" />
           </div>
           <CardTitle className="text-2xl">Team Manager Portal</CardTitle>
           <CardDescription>
             Sign in to manage your delegation and team registrations
           </CardDescription>
         </CardHeader>
         <CardContent>
           <form onSubmit={handleLogin} className="space-y-4">
             <div className="space-y-2">
               <Label htmlFor="email">Email Address</Label>
               <Input
                 id="email"
                 type="email"
                 placeholder="manager@federation.org"
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 required
               />
             </div>
             <Button type="submit" className="w-full" disabled={isLoading}>
               {isLoading ? 'Signing in...' : 'Sign In'}
             </Button>
           </form>
 
           <div className="mt-6 text-center space-y-3">
             <p className="text-sm text-muted-foreground">
               Don't have a manager account?{' '}
               <Link to="/manager/register" className="text-primary hover:underline font-medium">
                 Register as Manager
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
 
 export default ManagerLogin;