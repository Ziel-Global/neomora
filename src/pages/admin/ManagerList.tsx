import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Loader2, Users, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { AdminHomeHeader } from '@/components/layout/AdminHomeHeader';
import {
  getAllManagers,
  createTeamManager,
  getManagerDisplayName,
  EMSManager,
} from '@/api/managerApi';
import {
  INTERNATIONAL_PHONE_PLACEHOLDER,
  sanitizePhoneInput,
  validateInternationalPhone,
} from '@/lib/phoneValidation';

const RequiredMark = () => <span className="text-destructive">*</span>;

const ManagerList: React.FC = () => {
  const [managers, setManagers] = useState<EMSManager[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    country: '',
    organization: '',
    federation: '',
  });

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    setIsLoading(true);
    try {
      const data = await getAllManagers();
      setManagers(data);
    } catch (error) {
      console.error('Error fetching managers:', error);
      toast.error('Failed to load managers');
      setManagers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      country: '',
      organization: '',
      federation: '',
    });
    setPhoneError('');
  };

  const handleCreateManager = async () => {
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim().toLowerCase();

    const phone = form.phone.trim();
    const country = form.country.trim();
    const organization = form.organization.trim();
    const federation = form.federation.trim();

    if (!firstName || !lastName || !email || !phone || !country || !organization || !federation) {
      toast.error('All fields are required');
      return;
    }

    const phoneValidationError = validateInternationalPhone(phone);
    if (phoneValidationError) {
      setPhoneError(phoneValidationError);
      toast.error(phoneValidationError);
      return;
    }
    setPhoneError('');

    if (!form.password) {
      toast.error('Password is required');
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsCreating(true);
    try {
      const created = await createTeamManager({
        firstName,
        lastName,
        email,
        password: form.password,
        confirmPassword: form.confirmPassword,
        phone,
        country,
        organization,
        federation,
      });

      setManagers(prev => {
        const map = new Map(prev.map(manager => [manager.email.toLowerCase(), manager]));
        map.set(created.email.toLowerCase(), created);
        return Array.from(map.values());
      });

      toast.success(`Manager ${getManagerDisplayName(created)} created. They can log in at /login/manager.`);
      resetForm();
      setIsCreateOpen(false);
    } catch (error: any) {
      console.error('Error creating manager:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to create manager';
      toast.error(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setIsCreating(false);
    }
  };

  const filteredManagers = managers.filter(manager => {
    const query = searchQuery.toLowerCase();
    const fullName = getManagerDisplayName(manager).toLowerCase();
    return (
      fullName.includes(query) ||
      (manager.email && manager.email.toLowerCase().includes(query)) ||
      (manager.country && manager.country.toLowerCase().includes(query)) ||
      (manager.organization && manager.organization.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AdminHomeHeader />

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
        <PageHeader
          title="Team Managers"
          description="View and manage all team managers across the system."
          action={
            <Button onClick={() => setIsCreateOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Create Manager
            </Button>
          }
        />

        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Users className="h-5 w-5" />
                Manager List
              </CardTitle>
              <CardDescription>
                Overview of registered team managers
              </CardDescription>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search managers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Organization / Federation</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <div className="flex justify-center items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading managers...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredManagers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No managers found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredManagers.map((manager) => (
                      <TableRow key={manager.id}>
                        <TableCell className="font-medium">
                          {getManagerDisplayName(manager)}
                        </TableCell>
                        <TableCell>{manager.email}</TableCell>
                        <TableCell>{manager.phone || '-'}</TableCell>
                        <TableCell>{manager.country || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{manager.organization || '-'}</span>
                            {manager.federation && (
                              <span className="text-xs text-muted-foreground">
                                {manager.federation}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={manager.status?.toLowerCase() === 'active' ? 'default' : 'secondary'}>
                            {manager.status || 'Active'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={isCreateOpen} onOpenChange={(open) => {
        setIsCreateOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Team Manager</DialogTitle>
            <DialogDescription>
              Register a new team manager account.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First Name <RequiredMark /></Label>
                <Input
                  placeholder="e.g. Ahmed"
                  value={form.firstName}
                  onChange={(e) => setForm(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name <RequiredMark /></Label>
                <Input
                  placeholder="e.g. Khan"
                  value={form.lastName}
                  onChange={(e) => setForm(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email <RequiredMark /></Label>
              <Input
                type="email"
                placeholder="e.g. manager@example.com"
                value={form.email}
                onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Password <RequiredMark /></Label>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={form.password}
                  onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm Password <RequiredMark /></Label>
                <Input
                  type="password"
                  placeholder="Re-enter password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone <RequiredMark /></Label>
              <Input
                type="tel"
                placeholder={INTERNATIONAL_PHONE_PLACEHOLDER}
                value={form.phone}
                onChange={(e) => {
                  const nextPhone = sanitizePhoneInput(e.target.value);
                  setForm(prev => ({ ...prev, phone: nextPhone }));
                  if (phoneError) {
                    setPhoneError(validateInternationalPhone(nextPhone) || '');
                  }
                }}
                onBlur={() => setPhoneError(validateInternationalPhone(form.phone) || '')}
                className={phoneError ? 'border-red-500' : undefined}
              />
              {phoneError && (
                <p className="text-sm text-red-500">{phoneError}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Country <RequiredMark /></Label>
                <Input
                  placeholder="e.g. Pakistan"
                  value={form.country}
                  onChange={(e) => setForm(prev => ({ ...prev, country: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Organization <RequiredMark /></Label>
                <Input
                  placeholder="e.g. National Sports Council"
                  value={form.organization}
                  onChange={(e) => setForm(prev => ({ ...prev, organization: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sport Federation <RequiredMark /></Label>
              <Input
                placeholder="e.g. Saudi Sports Federation"
                value={form.federation}
                onChange={(e) => setForm(prev => ({ ...prev, federation: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreateManager} disabled={isCreating}>
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Create Manager
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagerList;
