import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(email, password, 'admin');
      if (success) {
        toast.success('Welcome back, Admin!');
        navigate('/admin');
      } else {
        toast.error('Invalid credentials');
      }
    } catch (error) {
      toast.error('Login failed. Please try again.');
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
            <div className="flex justify-center mb-4">
              <div className="h-20 w-20 bg-emerald-100 rounded-2xl flex items-center justify-center transform rotate-3 shadow-lg">
                <Shield className="h-10 w-10 text-emerald-800" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900 font-serif">Admin Access</CardTitle>
              <CardDescription className="mt-2 text-gray-500">
                Secure authentication for system administrators
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">Email Address</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@neomora.local"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-gray-700">Password</Label>
                  <a href="#" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">Forgot password?</a>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 h-11"
                />
              </div>
              <Button type="submit" className="w-full bg-emerald-900 hover:bg-emerald-800 h-11 text-base shadow-lg shadow-emerald-900/10" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  'Sign In to Dashboard'
                )}
              </Button>
            </form>

            <Link
              to="/"
              className="flex items-center justify-center text-sm text-muted-foreground hover:text-emerald-700 transition-colors pt-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Services
            </Link>

            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs text-center text-muted-foreground">
                Protected by Neomora Secure Auth.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
