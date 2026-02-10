import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const StaffLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('ops@eventems.com');
  const [password, setPassword] = useState('demo123');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(email, password, 'subadmin');
      if (success) {
        toast.success('Welcome back!');
        navigate('/subadmin');
      } else {
        toast.error('Invalid credentials');
      }
    } catch (error) {
      toast.error('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/leghari.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/90 via-emerald-900/80 to-emerald-950/90" />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="flex justify-center mb-8">

        </div>

        <Card className="bg-white/95 backdrop-blur-md border-white/20 shadow-2xl">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="mx-auto w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center shadow-inner">
              <Users className="h-8 w-8 text-blue-700" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900 font-serif">Staff Access</CardTitle>
              <CardDescription className="mt-2 text-gray-500">
                Operational management and coordination tools
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ops@eventems.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 h-11"
                />
              </div>
              <Button type="submit" className="w-full bg-blue-700 hover:bg-blue-800 h-11 text-base shadow-lg shadow-blue-900/10" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <Link
              to="/"
              className="flex items-center justify-center text-sm text-muted-foreground hover:text-blue-700 transition-colors pt-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Services
            </Link>

            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs text-center text-muted-foreground">
                Authorized Personnel Only. <br />
                Demo: ops@eventems.com / any
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffLogin;
