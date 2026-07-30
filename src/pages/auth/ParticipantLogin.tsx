import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useParticipantSession } from '@/contexts/ParticipantSessionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ParticipantLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login: participantLogin, isLoggedIn } = useParticipantSession();
  const [isLoading, setIsLoading] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    if (isLoggedIn) {
      navigate('/portal/dashboard');
    }
  }, [isLoggedIn, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await participantLogin(loginEmail, loginPassword);
      if (success) {
        toast.success('Welcome back!');
        navigate('/portal/dashboard');
      } else {
        toast.error('Invalid credentials. Please check your email and password.');
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm font-medium text-white backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Participant Services
          </div>
        </div>

        <Card className="bg-white/95 backdrop-blur-md border-white/20 shadow-2xl">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="mx-auto w-16 h-16 bg-emerald-50 rounded-xl flex items-center justify-center shadow-inner">
              <User className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900 font-serif">Participant Portal</CardTitle>
              <CardDescription className="mt-2 text-gray-500">
                Manage your event participation and documents
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email Address</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="your@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  className="bg-white border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <PasswordInput
                  id="login-password"
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="bg-white border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 h-11"
                />
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 text-base shadow-lg shadow-emerald-500/20" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link to="/participant/register" className="text-emerald-600 hover:underline font-medium">
                  Register as Participant
                </Link>
              </p>
              <Link
                to="/"
                className="flex items-center justify-center text-sm text-muted-foreground hover:text-emerald-700 transition-colors pt-2 border-t border-gray-100"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back to Services
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ParticipantLogin;
