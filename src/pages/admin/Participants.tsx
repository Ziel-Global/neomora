import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DataTable, Column } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { CountryCombobox } from '@/components/common/CountryCombobox';
import { participantStore, invitationStore, registrationStore, EMSParticipant } from '@/lib/emsStore';
import { ParticipantRole } from '@/data/mockData';
import { AdminHomeHeader } from '@/components/layout/AdminHomeHeader';
import * as participantApi from '@/api/participantApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Download,
  Mail,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Loader2,
  UserPlus,
  UserRound,
  Heart,
  Home,
  ChevronRight,
  Search,
  Globe2,
  BadgeCheck,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

interface ParticipantWithStatus extends EMSParticipant {
  invitationStatus?: string;
  registrationStatus?: string;
  registrationId?: string;
}

const ROLES: ParticipantRole[] = ['VVIP', 'VIP', 'Athlete', 'Official', 'Judge', 'Media', 'Fan'];

const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};


const ParticipantsPage: React.FC = () => {
  const { t } = useTranslation();
  const [participants, setParticipants] = useState<EMSParticipant[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [participantToDelete, setParticipantToDelete] = useState<EMSParticipant | null>(null);
  const [editingParticipant, setEditingParticipant] = useState<EMSParticipant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendingParticipantId, setResendingParticipantId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: 'male' as string,
    nationality: '',
    organization: '',
    jobTitle: '',
    role: 'Athlete' as ParticipantRole,
    dietaryNotes: '',
    accessibilityNeeds: '',
  });

  useEffect(() => {
    loadParticipants();
  }, []);

  const loadParticipants = async () => {
    setIsLoading(true);
    try {
      const data = await participantApi.getAdminMembers();
      setParticipants(data);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
      setParticipants([]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      gender: 'male',
      nationality: '',
      organization: '',
      jobTitle: '',
      role: 'Athlete',
      dietaryNotes: '',
      accessibilityNeeds: '',
    });
  };

  const handleCreate = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error('Please fill in required fields (First Name, Last Name, Email)');
      return;
    }

    if (!isValidEmail(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await participantApi.createParticipant(formData);
      toast.success(
        result.setupEmailSent
          ? `Participant "${formData.firstName} ${formData.lastName}" was added and invited to set their portal password.`
          : `Participant "${formData.firstName} ${formData.lastName}" was added, but the setup email could not be sent.`,
      );
      setIsAddOpen(false);
      resetForm();
      loadParticipants();
    } catch (error: any) {
      console.error('Error creating participant:', error);
      toast.error(error.response?.data?.message || 'Failed to create participant');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (participant: EMSParticipant) => {
    setEditingParticipant(participant);
    setFormData({
      firstName: participant.firstName,
      lastName: participant.lastName,
      email: participant.email,
      phone: participant.phone,
      gender: participant.gender || 'male',
      nationality: participant.nationality,
      organization: participant.organization,
      jobTitle: participant.jobTitle || '',
      role: participant.role,
      dietaryNotes: participant.dietaryNotes,
      accessibilityNeeds: participant.accessibilityNeeds,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingParticipant) return;

    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error('Please fill in required fields (First Name, Last Name, Email)');
      return;
    }

    if (!isValidEmail(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      await participantApi.updateParticipant(editingParticipant.id, formData);
      toast.success('Participant updated successfully');
      setIsEditOpen(false);
      setEditingParticipant(null);
      resetForm();
      loadParticipants();
    } catch (error: any) {
      console.error('Error updating participant:', error);
      toast.error(error.response?.data?.message || 'Failed to update participant');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (participant: EMSParticipant) => {
    setParticipantToDelete(participant);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!participantToDelete) return;

    try {
      await participantApi.deleteParticipant(participantToDelete.id);
      loadParticipants();
      toast.success(`Participant "${participantToDelete.firstName} ${participantToDelete.lastName}" deleted`);
      setIsDeleteConfirmOpen(false);
      setParticipantToDelete(null);
    } catch (error) {
      console.error('Error deleting participant:', error);
      toast.error('Failed to delete participant');
    }
  };

  const handleSendPortalInvite = async (participant: EMSParticipant) => {
    setResendingParticipantId(participant.id);
    try {
      await participantApi.sendParticipantSetupEmail(participant.id);
      toast.success(`A password setup email was sent to ${participant.email}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send the portal invite');
    } finally {
      setResendingParticipantId(null);
    }
  };

  // Combine participant data with their invitation/registration status
  const participantsWithStatus: ParticipantWithStatus[] = participants.map(p => {
    const invitations = invitationStore.getByParticipant(p.id);
    const registrations = registrationStore.getByParticipant(p.id);

    // Get latest status
    const latestInvitation = invitations.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    const latestRegistration = registrations.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    const approvedParticipant = p as participantApi.AdminApprovedParticipant;

    return {
      ...p,
      invitationStatus: latestInvitation?.status,
      registrationStatus: approvedParticipant.registrationStatus || latestRegistration?.status,
      registrationId: approvedParticipant.registrationId,
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return participantsWithStatus.filter((p) => {
      if (roleFilter !== 'all' && p.role !== roleFilter) return false;
      if (!query) return true;
      return (
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(query) ||
        (p.email && p.email.toLowerCase().includes(query)) ||
        (p.organization && p.organization.toLowerCase().includes(query)) ||
        (p.nationality && p.nationality.toLowerCase().includes(query)) ||
        (p.role && p.role.toLowerCase().includes(query))
      );
    });
  }, [participantsWithStatus, roleFilter, searchQuery]);

  const registeredCount = useMemo(
    () =>
      participantsWithStatus.filter(
        (p) => p.registrationStatus && p.registrationStatus !== 'Draft',
      ).length,
    [participantsWithStatus],
  );

  const columns: Column<ParticipantWithStatus>[] = [
    {
      key: 'name',
      header: t('common.member'),
      sortable: true,
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-primary/10 shadow-sm">
            <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
              {row.firstName.charAt(0)}{row.lastName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{row.firstName} {row.lastName}</p>
            <p className="truncate text-sm text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: t('participants.role'),
      sortable: true,
      accessor: (row) => (
        <span className="inline-flex items-center rounded-full border border-primary/10 bg-primary/[0.07] px-2.5 py-1 text-xs font-semibold text-primary">
          {row.role ? t(`participants.roles.${row.role.toLowerCase()}`) : '—'}
        </span>
      ),
    },
    {
      key: 'nationality',
      header: t('participants.nationality'),
      sortable: true,
      className: 'hidden md:table-cell',
      accessor: (row) => (
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/85">
          <Globe2 className="h-3.5 w-3.5 text-muted-foreground" />
          {row.nationality || '—'}
        </span>
      ),
    },
    {
      key: 'organization',
      header: t('participants.organization'),
      sortable: true,
      accessor: (row) => (
        <span className="font-medium text-foreground/85">{row.organization || '—'}</span>
      ),
    },
    {
      key: 'added',
      header: t('participants.added'),
      className: 'hidden 2xl:table-cell whitespace-nowrap',
      accessor: (row) => {
        const createdAt = new Date(row.createdAt);
        const addedDate = Number.isNaN(createdAt.getTime())
          ? '—'
          : createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

        return <span className="text-sm font-medium text-muted-foreground">{addedDate}</span>;
      },
    },
    {
      key: 'invitation',
      header: t('common.invitation'),
      className: 'hidden 2xl:table-cell',
      accessor: (row) => (
        row.invitationStatus ? (
          <StatusBadge status={row.invitationStatus} size="sm" />
        ) : (
          <span className="inline-flex items-center rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {t('participants.not_registered')}
          </span>
        )
      ),
    },
    {
      key: 'registration',
      header: t('common.registration'),
      accessor: (row) => (
        row.registrationStatus ? (
          <StatusBadge status={row.registrationStatus} size="sm" />
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )
      ),
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
            <DropdownMenuItem onClick={() => handleEdit(row)} className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              {t('common.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={resendingParticipantId === row.id}
              onClick={() => handleSendPortalInvite(row)}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              {resendingParticipantId === row.id ? 'Sending portal invite…' : t('participants.send_portal_invite')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDeleteClick(row)}
              className="flex items-center gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const fieldClassName = 'h-11 rounded-xl border-border/80 bg-background px-3.5 shadow-sm transition-shadow focus-visible:ring-primary/25';
  const selectClassName = 'h-11 rounded-xl border-border/80 bg-background px-3.5 shadow-sm focus:ring-primary/25';

  const formFieldsJsx = (
    <div className="min-h-0 space-y-5 overflow-y-auto bg-muted/20 px-5 py-5 sm:px-7 sm:py-6">
      <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5" aria-labelledby="contact-information-heading">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserRound className="h-[18px] w-[18px]" />
          </div>
          <div>
            <h3 id="contact-information-heading" className="text-sm font-semibold text-foreground">
              {t('participants.contact_information')}
            </h3>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              {t('participants.contact_information_desc')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="firstName">{t('participants.first_name')} <span className="text-destructive">*</span></Label>
            <Input
              id="firstName"
              autoComplete="given-name"
              placeholder={t('participants.first_name')}
              value={formData.firstName}
              className={fieldClassName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lastName">{t('participants.last_name')} <span className="text-destructive">*</span></Label>
            <Input
              id="lastName"
              autoComplete="family-name"
              placeholder={t('participants.last_name')}
              value={formData.lastName}
              className={fieldClassName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">{t('participants.email')} <span className="text-destructive">*</span></Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={formData.email}
              className={fieldClassName}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">{t('common.phone')}</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+971 50 123 4567"
              value={formData.phone}
              className={fieldClassName}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9+]/g, '');
                const sanitized = value.startsWith('+')
                  ? '+' + value.slice(1).replace(/\+/g, '')
                  : value.replace(/\+/g, '');
                setFormData(prev => ({ ...prev, phone: sanitized }));
              }}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5" aria-labelledby="participant-details-heading">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-[18px] w-[18px]" />
          </div>
          <div>
            <h3 id="participant-details-heading" className="text-sm font-semibold text-foreground">
              {t('participants.participant_details')}
            </h3>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              {t('participants.participant_details_desc')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="role">{t('participants.role')} <span className="text-destructive">*</span></Label>
            <Select value={formData.role} onValueChange={(value: ParticipantRole) => setFormData(prev => ({ ...prev, role: value }))}>
              <SelectTrigger id="role" className={selectClassName}>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(role => (
                  <SelectItem key={role} value={role}>{t(`participants.roles.${role.toLowerCase()}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="gender">{t('common.gender')} <span className="text-destructive">*</span></Label>
            <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
              <SelectTrigger id="gender" className={selectClassName}>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{t('common.male')}</SelectItem>
                <SelectItem value="female">{t('common.female')}</SelectItem>
                <SelectItem value="other">{t('common.other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nationality">{t('participants.nationality')}</Label>
            <CountryCombobox
              id="nationality"
              value={formData.nationality}
              onChange={(nationality) => setFormData(prev => ({ ...prev, nationality }))}
              placeholder={t('participants.nationality')}
              className={fieldClassName}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="organization">{t('participants.organization')}</Label>
            <Input
              id="organization"
              autoComplete="organization"
              placeholder={t('participants.organization')}
              value={formData.organization}
              className={fieldClassName}
              onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="jobTitle">{t('participants.job_title')}</Label>
            <Input
              id="jobTitle"
              autoComplete="organization-title"
              placeholder={t('participants.job_title')}
              value={formData.jobTitle}
              className={fieldClassName}
              onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5" aria-labelledby="additional-needs-heading">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Heart className="h-[18px] w-[18px]" />
          </div>
          <div>
            <h3 id="additional-needs-heading" className="text-sm font-semibold text-foreground">
              {t('participants.additional_needs')}
            </h3>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              {t('participants.additional_needs_desc')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="dietaryNotes">{t('participants.dietary')}</Label>
            <Textarea
              id="dietaryNotes"
              rows={3}
              placeholder="e.g., Vegetarian, Halal, Gluten-free"
              value={formData.dietaryNotes}
              className="min-h-[88px] resize-none rounded-xl border-border/80 bg-background px-3.5 py-3 shadow-sm focus-visible:ring-primary/25"
              onChange={(e) => setFormData(prev => ({ ...prev, dietaryNotes: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="accessibilityNeeds">{t('participants.accessibility')}</Label>
            <Textarea
              id="accessibilityNeeds"
              rows={3}
              placeholder="e.g., Wheelchair access or assistance"
              value={formData.accessibilityNeeds}
              className="min-h-[88px] resize-none rounded-xl border-border/80 bg-background px-3.5 py-3 shadow-sm focus-visible:ring-primary/25"
              onChange={(e) => setFormData(prev => ({ ...prev, accessibilityNeeds: e.target.value }))}
            />
          </div>
        </div>
      </section>
    </div>
  );

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
              <span className="font-medium text-foreground">Team Members</span>
            </nav>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-xl space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                  Event operations
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Team Members
                </h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  View and manage all members across the system.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/15">
                    <Users className="h-3.5 w-3.5" />
                    <span className="tabular-nums">{participants.length}</span>
                    total
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-status-success-bg px-2.5 py-1 text-xs font-semibold text-status-success ring-1 ring-inset ring-status-success/20">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    <span className="tabular-nums">{registeredCount}</span>
                    registered
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" className="h-10 shrink-0 gap-1.5 bg-card shadow-sm">
                  <Download className="h-4 w-4" />
                  {t('common.export')}
                </Button>
                <Button className="h-10 shrink-0 gap-1.5 shadow-sm" onClick={() => setIsAddOpen(true)}>
                  <UserPlus className="h-4 w-4" />
                  {t('members.add_member')}
                </Button>
              </div>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 py-24">
            <Loader2 className="h-9 w-9 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading members…</p>
          </div>
        ) : participants.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-20 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Users className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">{t('members.no_members')}</h3>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
              {t('members.no_members_desc')}
            </p>
            <Button className="mt-5 gap-1.5 shadow-sm" onClick={() => setIsAddOpen(true)}>
              <UserPlus className="h-4 w-4" />
              {t('members.add_member')}
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
                  Member list
                </div>

                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-9 w-36 rounded-xl border-border/80 bg-background shadow-sm">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all_roles')}</SelectItem>
                    {ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {t(`participants.roles.${role.toLowerCase()}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {roleFilter !== 'all' && (
                  <Button variant="ghost" size="sm" onClick={() => setRoleFilter('all')}>
                    {t('participants.clear_filters')}
                  </Button>
                )}

                <span className="text-xs font-medium text-muted-foreground">
                  {filteredData.length === participants.length
                    ? `${participants.length} registered`
                    : `${filteredData.length} of ${participants.length} matching`}
                </span>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('participants.search_placeholder') || 'Search members...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 rounded-xl border-border/80 bg-background pl-9 shadow-sm"
                />
              </div>
            </div>

            {filteredData.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
                <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                <p className="font-medium text-foreground">No matching members</p>
                <p className="mt-1 text-sm text-muted-foreground">Try another name, email, role, or organization.</p>
              </div>
            ) : (
              <DataTable
                data={filteredData}
                columns={columns}
                keyExtractor={(row) => row.id}
                searchable={false}
                pageSize={25}
                emptyMessage={t('members.no_members')}
                className="space-y-5 [&>div:last-child]:overflow-hidden [&>div:last-child]:rounded-2xl [&>div:last-child]:border-border/70 [&>div:last-child]:shadow-[0_10px_30px_-18px_hsl(var(--foreground)/0.22)] [&_thead_tr]:border-border/70 [&_thead_tr]:bg-muted/55 [&_thead_th]:h-14 [&_thead_th]:text-xs [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-[0.06em] [&_tbody_td]:py-4 [&_tbody_tr]:border-border/65 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-primary/[0.025]"
              />
            )}
          </>
        )}
      </main>

      {/* Add Member Dialog */}
      <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="grid max-h-[92vh] w-[calc(100%-1.5rem)] max-w-3xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden border-0 p-0 shadow-2xl sm:rounded-2xl [&>button]:right-5 [&>button]:top-5 [&>button]:rounded-full [&>button]:p-1.5 [&>button]:transition-colors [&>button:hover]:bg-muted">
          <DialogHeader className="border-b border-border/70 bg-gradient-to-r from-primary/[0.09] via-primary/[0.035] to-transparent px-5 py-5 pr-14 sm:px-7 sm:py-6">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
                <UserPlus className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-xl font-semibold tracking-tight sm:text-2xl">{t('members.add_member')}</DialogTitle>
                <DialogDescription className="mt-1 text-sm leading-5">{t('participants.add_desc')}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {formFieldsJsx}
          <div className="flex flex-col-reverse gap-2 border-t border-border/70 bg-background px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p className="text-xs text-muted-foreground">{t('participants.required_hint')}</p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button className="h-10 rounded-xl px-5" variant="outline" disabled={isSubmitting} onClick={() => { setIsAddOpen(false); resetForm(); }}>{t('common.cancel')}</Button>
              <Button className="h-10 rounded-xl px-6 shadow-md shadow-primary/15" disabled={isSubmitting} onClick={handleCreate}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Participant Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) { setEditingParticipant(null); resetForm(); } }}>
        <DialogContent className="grid max-h-[92vh] w-[calc(100%-1.5rem)] max-w-3xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden border-0 p-0 shadow-2xl sm:rounded-2xl [&>button]:right-5 [&>button]:top-5 [&>button]:rounded-full [&>button]:p-1.5 [&>button]:transition-colors [&>button:hover]:bg-muted">
          <DialogHeader className="border-b border-border/70 bg-gradient-to-r from-primary/[0.09] via-primary/[0.035] to-transparent px-5 py-5 pr-14 sm:px-7 sm:py-6">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
                <Edit className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-xl font-semibold tracking-tight sm:text-2xl">{t('members.edit_member')}</DialogTitle>
                <DialogDescription className="mt-1 text-sm leading-5">{t('participants.edit_desc')}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {formFieldsJsx}
          <div className="flex flex-col-reverse gap-2 border-t border-border/70 bg-background px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p className="text-xs text-muted-foreground">{t('participants.required_hint')}</p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button className="h-10 rounded-xl px-5" variant="outline" disabled={isSubmitting} onClick={() => { setIsEditOpen(false); setEditingParticipant(null); resetForm(); }}>{t('common.cancel')}</Button>
              <Button className="h-10 rounded-xl px-6 shadow-md shadow-primary/15" disabled={isSubmitting} onClick={handleUpdate}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t('common.save_changes')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.are_you_sure') || 'Are you sure?'}</DialogTitle>
            <DialogDescription>
              This will permanently delete the participant <strong>{participantToDelete?.firstName} {participantToDelete?.lastName}</strong>. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>{t('common.delete')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ParticipantsPage;
