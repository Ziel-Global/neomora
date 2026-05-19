import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, Column } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { participantStore, invitationStore, registrationStore, EMSParticipant } from '@/lib/emsStore';
import { ParticipantRole } from '@/data/mockData';
import { AdminHomeHeader } from '@/components/layout/AdminHomeHeader';
import * as participantApi from '@/api/participantApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Download,
  Mail,
  Filter,
  Eye,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Loader2,
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
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

interface ParticipantWithStatus extends EMSParticipant {
  invitationStatus?: string;
  registrationStatus?: string;
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
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [participantToDelete, setParticipantToDelete] = useState<EMSParticipant | null>(null);
  const [editingParticipant, setEditingParticipant] = useState<EMSParticipant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const data = await participantApi.getParticipants();
      setParticipants(data);
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast.error('Failed to load participants');
      // Fallback to local store for demo persistence if local server not running
      setParticipants(participantStore.getAll());
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
      await participantApi.createParticipant(formData);
      toast.success(`Participant "${formData.firstName} ${formData.lastName}" added successfully`);
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

    return {
      ...p,
      invitationStatus: latestInvitation?.status,
      registrationStatus: latestRegistration?.status,
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Apply filters
  const filteredData = participantsWithStatus.filter(p => {
    if (roleFilter !== 'all' && p.role !== roleFilter) return false;
    return true;
  });

  const columns: Column<ParticipantWithStatus>[] = [
    {
      key: 'name',
      header: t('common.member'),
      sortable: true,
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-accent/10 text-accent text-sm">
              {row.firstName.charAt(0)}{row.lastName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{row.firstName} {row.lastName}</p>
            <p className="text-sm text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: t('participants.role'),
      sortable: true,
      accessor: (row) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
          {row.role ? t(`participants.roles.${row.role.toLowerCase()}`) : '-'}
        </span>
      ),
    },
    {
      key: 'nationality',
      header: t('participants.nationality'),
      sortable: true,
      accessor: (row) => row.nationality || '-',
    },
    {
      key: 'organization',
      header: t('participants.organization'),
      sortable: true,
      accessor: (row) => (
        <span className="text-sm">{row.organization || '-'}</span>
      ),
    },
    {
      key: 'invitation',
      header: t('common.invitation'),
      accessor: (row) => (
        row.invitationStatus ? (
          <StatusBadge status={row.invitationStatus} size="sm" />
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
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
          <span className="text-muted-foreground text-sm">-</span>
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
            <DropdownMenuItem asChild>
              <Link to={`/admin/participants/${row.id}`} className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                {t('participants.view_profile')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(row)} className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              {t('common.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {t('participants.send_message')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDeleteClick(row)}
              className="flex items-center gap-2 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const formFieldsJsx = (
    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="firstName">{t('participants.first_name')} *</Label>
          <Input
            id="firstName"
            placeholder="First name"
            value={formData.firstName}
            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lastName">{t('participants.last_name')} *</Label>
          <Input
            id="lastName"
            placeholder={t('participants.last_name')}
            value={formData.lastName}
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">{t('participants.email')} *</Label>
        <Input
          id="email"
          type="email"
          placeholder="email@example.com"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="phone">{t('common.phone')}</Label>
          <Input
            id="phone"
            placeholder="+971 50 123 4567"
            value={formData.phone}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9+]/g, '');
              // Ensure + only appears at the start and only once
              const sanitized = value.startsWith('+')
                ? '+' + value.slice(1).replace(/\+/g, '')
                : value.replace(/\+/g, '');
              setFormData(prev => ({ ...prev, phone: sanitized }));
            }}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="nationality">{t('participants.nationality')}</Label>
          <Input
            id="nationality"
            placeholder={t('participants.nationality')}
            value={formData.nationality}
            onChange={(e) => setFormData(prev => ({ ...prev, nationality: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="role">Role *</Label>
          <Select value={formData.role} onValueChange={(value: ParticipantRole) => setFormData(prev => ({ ...prev, role: value }))}>
            <SelectTrigger>
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
          <Label htmlFor="gender">{t('common.gender')} *</Label>
          <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">{t('common.male')}</SelectItem>
              <SelectItem value="female">{t('common.female')}</SelectItem>
              <SelectItem value="other">{t('common.other')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="organization">{t('participants.organization')}</Label>
          <Input
            id="organization"
            placeholder={t('participants.organization')}
            value={formData.organization}
            onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="jobTitle">{t('participants.job_title')}</Label>
          <Input
            id="jobTitle"
            placeholder={t('participants.job_title')}
            value={formData.jobTitle}
            onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="dietaryNotes">{t('participants.dietary')}</Label>
        <Input
          id="dietaryNotes"
          placeholder="e.g., Vegetarian, Halal, Gluten-free"
          value={formData.dietaryNotes}
          onChange={(e) => setFormData(prev => ({ ...prev, dietaryNotes: e.target.value }))}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="accessibilityNeeds">{t('participants.accessibility')}</Label>
        <Input
          id="accessibilityNeeds"
          placeholder="e.g., Wheelchair accessible"
          value={formData.accessibilityNeeds}
          onChange={(e) => setFormData(prev => ({ ...prev, accessibilityNeeds: e.target.value }))}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AdminHomeHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 animate-fade-in">
        <PageHeader
          title={t('members.title')}
          subtitle={t('common.members_count', { count: filteredData.length })}
          breadcrumbs={[{ label: t('members.title') }]}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 me-2" />
                {t('common.export')}
              </Button>
              <Button size="sm" onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4 me-2" />
                {t('members.add_member')}
              </Button>
            </div>
          }
        />

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center p-24 text-muted-foreground animate-pulse">
            <Loader2 className="h-10 w-10 animate-spin mb-4" />
            <p>Loading members...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && participants.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('members.no_members')}</h3>
              <p className="text-muted-foreground mb-4">{t('members.no_members_desc')}</p>
              <Button onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />{t('members.add_member')}
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && participants.length > 0 && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('common.filter')}:</span>
              </div>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all_roles')}</SelectItem>
                  {ROLES.map(role => (
                    <SelectItem key={role} value={role}>{t(`participants.roles.${role.toLowerCase()}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {roleFilter !== 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRoleFilter('all')}
                >
                  {t('participants.clear_filters')}
                </Button>
              )}
            </div>

            <DataTable
              data={filteredData}
              columns={columns}
              keyExtractor={(row) => row.id}
              searchable
              searchPlaceholder={t('participants.search_placeholder') || 'Search...'}
              searchKey={(row) => `${row.firstName} ${row.lastName} ${row.email} ${row.organization}`}
              selectable
              onSelectionChange={(ids) => console.log('Selected:', ids)}
            />
          </>
        )}
      </main>

      {/* Add Member Dialog */}
      <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('members.add_member')}</DialogTitle>
            <DialogDescription>{t('participants.add_desc')}</DialogDescription>
          </DialogHeader>
          {formFieldsJsx}
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={isSubmitting} onClick={() => { setIsAddOpen(false); resetForm(); }}>{t('common.cancel')}</Button>
            <Button disabled={isSubmitting} onClick={handleCreate}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Participant Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) { setEditingParticipant(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('members.edit_member')}</DialogTitle>
            <DialogDescription>{t('participants.edit_desc')}</DialogDescription>
          </DialogHeader>
          {formFieldsJsx}
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={isSubmitting} onClick={() => { setIsEditOpen(false); setEditingParticipant(null); resetForm(); }}>{t('common.cancel')}</Button>
            <Button disabled={isSubmitting} onClick={handleUpdate}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t('common.save_changes')}
            </Button>
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
