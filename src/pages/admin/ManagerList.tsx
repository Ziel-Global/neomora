import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, Users, UserPlus, Mail, Building2, Phone, Globe2, ShieldCheck, IdCard } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AdminHomeHeader } from '@/components/layout/AdminHomeHeader';
import { SPORT_CATEGORIES } from '@/lib/teamStore';
import { getSportsBoardName } from '@/lib/sportsBoards';
import { CountryCombobox } from '@/components/common/CountryCombobox';
import {
  getAllManagers,
  inviteTeamManager,
  resendManagerSetupEmail,
  getManagerDisplayName,
  EMSManager,
} from '@/api/managerApi';
import {
  INTERNATIONAL_PHONE_PLACEHOLDER,
  sanitizePhoneInput,
  validateInternationalPhone,
} from '@/lib/phoneValidation';

const RequiredMark = () => <span className="text-destructive">*</span>;

const FormSection = ({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <section className="space-y-3.5 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-inset ring-primary/10">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 pt-0.5">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
    <div className="space-y-3">{children}</div>
  </section>
);

const ManagerList: React.FC = () => {
  const [managers, setManagers] = useState<EMSManager[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    sport: '',
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
      phone: '',
      country: '',
      sport: '',
      organization: '',
      federation: '',
    });
    setPhoneError('');
  };

  const handleInviteManager = async () => {
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

    setIsCreating(true);
    try {
      const { teamManager: created, setupEmailSent } = await inviteTeamManager({
        firstName,
        lastName,
        email,
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

      if (setupEmailSent) {
        toast.success(`Invite sent to ${created.email}. They'll set their own password to log in.`);
      } else {
        toast.warning(`Manager ${getManagerDisplayName(created)} was created, but the invite email failed to send. Use "Resend invite" to try again.`);
      }
      resetForm();
      setIsCreateOpen(false);
    } catch (error: any) {
      console.error('Error inviting manager:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to invite manager';
      toast.error(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setIsCreating(false);
    }
  };

  const handleResendInvite = async (manager: EMSManager) => {
    setResendingId(manager.id);
    try {
      await resendManagerSetupEmail(manager.id);
      toast.success(`Invite resent to ${manager.email}.`);
    } catch (error: any) {
      console.error('Error resending manager invite:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to resend invite';
      toast.error(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setResendingId(null);
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
              Invite Manager
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex justify-center items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading managers...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredManagers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
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
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResendInvite(manager)}
                            disabled={resendingId === manager.id}
                          >
                            {resendingId === manager.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Mail className="h-4 w-4 mr-2" />
                            )}
                            Resend invite
                          </Button>
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
        <DialogContent className="flex w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border bg-background p-0 shadow-2xl max-h-[90vh]">
          <DialogHeader className="shrink-0 space-y-0 border-b bg-gradient-to-br from-primary/[0.07] via-card to-card px-6 py-5 pe-12 text-start">
            <div className="flex items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-inset ring-primary/15 shadow-sm">
                <UserPlus className="h-5 w-5" />
              </span>
              <div className="min-w-0 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/70">
                  Event operations
                </p>
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  Invite Team Manager
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed">
                  We'll email them a secure link to set their own password and log in.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <FormSection
              icon={IdCard}
              title="Personal details"
              description="Name as it should appear on invitations and communications."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-semibold">
                    First Name <RequiredMark />
                  </Label>
                  <Input
                    placeholder="e.g. Ahmed"
                    value={form.firstName}
                    onChange={(e) => setForm(prev => ({ ...prev, firstName: e.target.value }))}
                    className="h-10 bg-background"
                    autoComplete="given-name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-semibold">
                    Last Name <RequiredMark />
                  </Label>
                  <Input
                    placeholder="e.g. Khan"
                    value={form.lastName}
                    onChange={(e) => setForm(prev => ({ ...prev, lastName: e.target.value }))}
                    className="h-10 bg-background"
                    autoComplete="family-name"
                  />
                </div>
              </div>
            </FormSection>

            <FormSection
              icon={Mail}
              title="Contact"
              description="Invite and account setup are sent to this email and phone."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-semibold">
                    Email <RequiredMark />
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="manager@example.com"
                      value={form.email}
                      onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                      className="h-10 bg-background ps-9"
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-semibold">
                    Phone <RequiredMark />
                  </Label>
                  <div
                    className={cn(
                      'flex h-10 overflow-hidden rounded-md border border-input bg-background shadow-sm transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
                      phoneError && 'border-destructive focus-within:ring-destructive',
                    )}
                  >
                    <span className="inline-flex shrink-0 items-center gap-1.5 border-e border-border/80 bg-muted/40 px-2.5 text-xs font-semibold text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      Intl
                    </span>
                    <input
                      type="tel"
                      inputMode="tel"
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
                      className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
                      autoComplete="tel"
                    />
                  </div>
                  <p className={cn('text-[11px] leading-tight', phoneError ? 'text-destructive' : 'text-muted-foreground')}>
                    {phoneError || 'Include country code, e.g. +92 326 5488525'}
                  </p>
                </div>
              </div>
            </FormSection>

            <FormSection
              icon={Building2}
              title="Organization"
              description="Country and federation help route them to the right events."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-semibold">
                    Country <RequiredMark />
                  </Label>
                  <CountryCombobox
                    value={form.country}
                    onChange={(value) => setForm(prev => ({
                      ...prev,
                      country: value,
                      federation: prev.sport ? getSportsBoardName(value, prev.sport) : prev.federation,
                    }))}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-semibold">
                    Organization <RequiredMark />
                  </Label>
                  <div className="relative">
                    <Globe2 className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="e.g. National Sports Council"
                      value={form.organization}
                      onChange={(e) => setForm(prev => ({ ...prev, organization: e.target.value }))}
                      className="h-10 bg-background ps-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-semibold">Sport</Label>
                  <Select
                    value={form.sport}
                    onValueChange={(value) => setForm(prev => ({
                      ...prev,
                      sport: value,
                      federation: prev.country ? getSportsBoardName(prev.country, value) : prev.federation,
                    }))}
                  >
                    <SelectTrigger className="h-10 bg-background">
                      <SelectValue placeholder="Select sport" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPORT_CATEGORIES.map(sport => (
                        <SelectItem key={sport.id} value={sport.name}>{sport.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Optional — used to suggest a federation name.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-semibold">
                    Sport Federation <RequiredMark />
                  </Label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="e.g. Saudi Sports Federation"
                      value={form.federation}
                      onChange={(e) => setForm(prev => ({ ...prev, federation: e.target.value }))}
                      className="h-10 bg-background ps-9"
                    />
                  </div>
                </div>
              </div>
            </FormSection>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t bg-muted/20 px-6 py-3.5 sm:justify-between">
            <p className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
              <ShieldCheck className="h-3.5 w-3.5 text-primary/60" />
              They choose their own password from the email link.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-10"
                onClick={() => setIsCreateOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button className="h-10 gap-1.5 shadow-sm" onClick={handleInviteManager} disabled={isCreating}>
                {isCreating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserPlus className="h-3.5 w-3.5" />
                )}
                Send Invite
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagerList;
