import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Loader2,
  Users,
  UserPlus,
  Mail,
  Building2,
  Phone,
  Globe2,
  ShieldCheck,
  IdCard,
  Trash2,
  Home,
  ChevronRight,
  MoreHorizontal,
  Filter,
  UserCheck,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AdminHomeHeader } from '@/components/layout/AdminHomeHeader';
import { DataTable, Column } from '@/components/common/DataTable';
import { SPORT_CATEGORIES } from '@/lib/teamStore';
import { getSportsBoardName } from '@/lib/sportsBoards';
import { CountryCombobox } from '@/components/common/CountryCombobox';
import {
  getAllManagers,
  inviteTeamManager,
  resendManagerSetupEmail,
  deleteTeamManager,
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
  const [managerToDelete, setManagerToDelete] = useState<EMSManager | null>(null);
  const [deletingManager, setDeletingManager] = useState(false);
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

  const handleConfirmDeleteManager = async () => {
    if (!managerToDelete) return;
    setDeletingManager(true);
    try {
      await deleteTeamManager(managerToDelete.id);
      toast.success(`${getManagerDisplayName(managerToDelete)} was deleted.`);
      setManagers(prev => prev.filter(m => m.id !== managerToDelete.id));
      setManagerToDelete(null);
    } catch (error: any) {
      console.error('Error deleting manager:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to delete manager';
      toast.error(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setDeletingManager(false);
    }
  };

  const filteredManagers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return managers;
    return managers.filter((manager) => {
      const fullName = getManagerDisplayName(manager).toLowerCase();
      return (
        fullName.includes(query) ||
        (manager.email && manager.email.toLowerCase().includes(query)) ||
        (manager.country && manager.country.toLowerCase().includes(query)) ||
        (manager.organization && manager.organization.toLowerCase().includes(query)) ||
        (manager.federation && manager.federation.toLowerCase().includes(query)) ||
        (manager.phone && manager.phone.toLowerCase().includes(query))
      );
    });
  }, [managers, searchQuery]);

  const activeCount = useMemo(
    () => managers.filter((m) => (m.status || 'Active').toLowerCase() === 'active').length,
    [managers],
  );

  const columns: Column<EMSManager>[] = [
    {
      key: 'name',
      header: 'Manager',
      sortable: true,
      accessor: (row) => {
        const name = getManagerDisplayName(row);
        const initials =
          `${row.firstName?.[0] || ''}${row.lastName?.[0] || ''}`.toUpperCase() ||
          name.charAt(0).toUpperCase() ||
          '?';
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-primary/10 shadow-sm">
              <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{name}</p>
              <p className="truncate text-sm text-muted-foreground">{row.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'phone',
      header: 'Phone',
      className: 'hidden lg:table-cell whitespace-nowrap',
      accessor: (row) => (
        <span className="text-sm font-medium text-foreground/85">{row.phone || '—'}</span>
      ),
    },
    {
      key: 'country',
      header: 'Country',
      sortable: true,
      className: 'hidden md:table-cell',
      accessor: (row) => (
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/85">
          <Globe2 className="h-3.5 w-3.5 text-muted-foreground" />
          {row.country || '—'}
        </span>
      ),
    },
    {
      key: 'organization',
      header: 'Organization',
      sortable: true,
      accessor: (row) => (
        <div className="min-w-0 max-w-[220px]">
          <p className="truncate font-medium text-foreground/85">{row.organization || '—'}</p>
          {row.federation ? (
            <p className="truncate text-xs text-muted-foreground">{row.federation}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => {
        const status = row.status || 'Active';
        const isActive = status.toLowerCase() === 'active';
        return (
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
              isActive
                ? 'border-status-success/20 bg-status-success-bg text-status-success'
                : 'border-border bg-muted text-muted-foreground',
            )}
          >
            {status}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      accessor: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              disabled={resendingId === row.id}
              onClick={() => handleResendInvite(row)}
              className="flex items-center gap-2"
            >
              {resendingId === row.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              {resendingId === row.id ? 'Sending invite…' : 'Resend invite'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setManagerToDelete(row)}
              className="flex items-center gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AdminHomeHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-10 animate-fade-in sm:px-6 lg:px-8">
        <header className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.06] via-card to-card px-6 py-6 shadow-sm sm:px-8 sm:py-7">
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/[0.07] blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-24 left-1/3 h-40 w-40 rounded-full bg-accent/10 blur-3xl"
            aria-hidden
          />

          <div className="relative space-y-4">
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Link to="/" className="transition-colors hover:text-foreground">
                <Home className="h-4 w-4" />
              </Link>
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
              <span className="font-medium text-foreground">Team Managers</span>
            </nav>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-xl space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                  Event operations
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Team Managers
                </h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  View and manage all team managers across the system.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/15">
                    <Users className="h-3.5 w-3.5" />
                    <span className="tabular-nums">{managers.length}</span>
                    total
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-status-success-bg px-2.5 py-1 text-xs font-semibold text-status-success ring-1 ring-inset ring-status-success/20">
                    <UserCheck className="h-3.5 w-3.5" />
                    <span className="tabular-nums">{activeCount}</span>
                    active
                  </span>
                </div>
              </div>

              <Button className="h-10 shrink-0 gap-1.5 shadow-sm" onClick={() => setIsCreateOpen(true)}>
                <UserPlus className="h-4 w-4" />
                Invite Manager
              </Button>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 py-24">
            <Loader2 className="h-9 w-9 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading managers…</p>
          </div>
        ) : managers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-20 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Users className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No managers yet</h3>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
              Invite a team manager to give them access to the manager portal.
            </p>
            <Button className="mt-5 gap-1.5 shadow-sm" onClick={() => setIsCreateOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Invite Manager
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Filter className="h-4 w-4" />
                  </span>
                  Manager list
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {filteredManagers.length === managers.length
                    ? `${managers.length} registered`
                    : `${filteredManagers.length} of ${managers.length} matching`}
                </span>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search managers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 rounded-xl border-border/80 bg-background pl-9 shadow-sm"
                />
              </div>
            </div>

            {filteredManagers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
                <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                <p className="font-medium text-foreground">No matching managers</p>
                <p className="mt-1 text-sm text-muted-foreground">Try another name, email, or organization.</p>
              </div>
            ) : (
              <DataTable
                data={filteredManagers}
                columns={columns}
                keyExtractor={(row) => row.id}
                searchable={false}
                pageSize={25}
                emptyMessage="No managers found."
                className="space-y-5 [&>div:last-child]:overflow-hidden [&>div:last-child]:rounded-2xl [&>div:last-child]:border-border/70 [&>div:last-child]:shadow-[0_10px_30px_-18px_hsl(var(--foreground)/0.22)] [&_thead_tr]:border-border/70 [&_thead_tr]:bg-muted/55 [&_thead_th]:h-14 [&_thead_th]:text-xs [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-[0.06em] [&_tbody_td]:py-4 [&_tbody_tr]:border-border/65 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-primary/[0.025]"
              />
            )}
          </>
        )}
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

      <AlertDialog open={!!managerToDelete} onOpenChange={(open) => !open && !deletingManager && setManagerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete manager?</AlertDialogTitle>
            <AlertDialogDescription>
              {managerToDelete
                ? `${getManagerDisplayName(managerToDelete)} will be deleted and will no longer be able to log in. Their existing teams, delegations, and participants are kept for record-keeping.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingManager}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingManager}
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmDeleteManager();
              }}
            >
              {deletingManager ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManagerList;
