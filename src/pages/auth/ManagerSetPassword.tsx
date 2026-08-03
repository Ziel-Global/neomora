import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { setManagerPassword } from '@/api/authApi';
import { useManagerSession } from '@/contexts/ManagerSessionContext';
import { toast } from 'sonner';

const ManagerSetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useManagerSession();
  const setupToken = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!setupToken) {
      toast.error('This password setup link is invalid or incomplete.');
      return;
    }

    if (password.length < 8) {
      toast.error('Your password must contain at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await setManagerPassword(setupToken, password, confirmPassword);
      const loggedIn = await login(result.email, password);

      if (!loggedIn) {
        toast.success('Password set successfully. Please sign in to continue.');
        navigate('/login/manager', { replace: true });
        return;
      }

      toast.success('Your portal is ready. Welcome to Neomora!');
      navigate('/manager/dashboard', { replace: true });
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || 'Unable to set your password. The link may have expired.'
        : 'Unable to set your password. Please try again.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 font-sans">
      <div className="absolute inset-0 bg-emerald-950" />
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-35"
        style={{ backgroundImage: "url('/leghari.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/75 via-emerald-900/80 to-emerald-950/95" />

      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            Secure manager setup
          </div>
        </div>

        <Card className="border-white/20 bg-white/95 shadow-2xl backdrop-blur-md">
          <CardHeader className="space-y-4 pb-2 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 shadow-inner">
              <KeyRound className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="font-serif text-2xl font-bold text-gray-900">Set your portal password</CardTitle>
              <CardDescription className="mt-2 text-gray-500">
                Create a password to access your Neomora delegation manager portal.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <PasswordInput
                  id="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="h-11 border-gray-200 bg-white focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <PasswordInput
                  id="confirm-password"
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  className="h-11 border-gray-200 bg-white focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
              <Button
                type="submit"
                disabled={isSubmitting || !setupToken}
                className="h-11 w-full bg-emerald-600 text-base shadow-lg shadow-emerald-500/20 hover:bg-emerald-700"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? 'Preparing your portal…' : 'Set password and continue'}
              </Button>
            </form>

            <Link
              to="/login/manager"
              className="mt-6 flex items-center justify-center border-t border-gray-100 pt-4 text-sm text-muted-foreground transition-colors hover:text-emerald-700"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to manager sign in
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManagerSetPassword;
