import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, Column } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { participantStore, invitationStore, registrationStore, EMSParticipant } from '@/lib/emsStore';
import { ParticipantRole } from '@/data/mockData';
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
  const [participants, setParticipants] = useState<EMSParticipant[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<EMSParticipant | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
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

  const loadParticipants = () => {
    setParticipants(participantStore.getAll());
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      nationality: '',
      organization: '',
      jobTitle: '',
      role: 'Athlete',
      dietaryNotes: '',
      accessibilityNeeds: '',
    });
  };

  const handleCreate = () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error('Please fill in required fields (First Name, Last Name, Email)');
      return;
    }

    // Check for duplicate email
    const existing = participantStore.getByEmail(formData.email);
    if (existing) {
      toast.error('A participant with this email already exists');
      return;
    }

    if (!isValidEmail(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    participantStore.create(formData);
    loadParticipants();
    setIsAddOpen(false);
    resetForm();
    toast.success(`Participant "${formData.firstName} ${formData.lastName}" added successfully`);
  };

  const handleEdit = (participant: EMSParticipant) => {
    setEditingParticipant(participant);
    setFormData({
      firstName: participant.firstName,
      lastName: participant.lastName,
      email: participant.email,
      phone: participant.phone,
      nationality: participant.nationality,
      organization: participant.organization,
      jobTitle: participant.jobTitle || '',
      role: participant.role,
      dietaryNotes: participant.dietaryNotes,
      accessibilityNeeds: participant.accessibilityNeeds,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editingParticipant) return;

    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error('Please fill in required fields (First Name, Last Name, Email)');
      return;
    }

    if (!isValidEmail(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    participantStore.update(editingParticipant.id, formData);
    loadParticipants();
    setIsEditOpen(false);
    setEditingParticipant(null);
    resetForm();
    toast.success('Participant updated successfully');
  };

  const handleDelete = (participant: EMSParticipant) => {
    participantStore.delete(participant.id);
    loadParticipants();
    toast.success(`Participant "${participant.firstName} ${participant.lastName}" deleted`);
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
      header: 'Participant',
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
      header: 'Role',
      sortable: true,
      accessor: (row) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
          {row.role}
        </span>
      ),
    },
    {
      key: 'nationality',
      header: 'Nationality',
      sortable: true,
      accessor: (row) => row.nationality || '-',
    },
    {
      key: 'organization',
      header: 'Organization',
      sortable: true,
      accessor: (row) => (
        <span className="text-sm">{row.organization || '-'}</span>
      ),
    },
    {
      key: 'invitation',
      header: 'Invitation',
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
      header: 'Registration',
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
                View Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(row)} className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Send Message
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDelete(row)}
              className="flex items-center gap-2 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete
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
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            placeholder="First name"
            value={formData.firstName}
            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            placeholder="Last name"
            value={formData.lastName}
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email *</Label>
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
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            placeholder="1234567890"
            value={formData.phone}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, '');
              setFormData(prev => ({ ...prev, phone: value }));
            }}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="nationality">Nationality</Label>
          <Input
            id="nationality"
            placeholder="e.g., USA"
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
                <SelectItem key={role} value={role}>{role}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="organization">Organization</Label>
          <Input
            id="organization"
            placeholder="Organization name"
            value={formData.organization}
            onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="jobTitle">Job Title</Label>
          <Input
            id="jobTitle"
            placeholder="Job title"
            value={formData.jobTitle}
            onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="dietaryNotes">Dietary Requirements</Label>
        <Input
          id="dietaryNotes"
          placeholder="e.g., Vegetarian, Halal, Gluten-free"
          value={formData.dietaryNotes}
          onChange={(e) => setFormData(prev => ({ ...prev, dietaryNotes: e.target.value }))}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="accessibilityNeeds">Accessibility Needs</Label>
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
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Participants"
        subtitle={`${filteredData.length} participants`}
        breadcrumbs={[{ label: 'Participants' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm" onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Participant
            </Button>
          </div>
        }
      />

      {/* Empty State */}
      {participants.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No participants yet</h3>
            <p className="text-muted-foreground mb-4">Add your first participant to start managing invitations and registrations.</p>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Add Participant
            </Button>
          </CardContent>
        </Card>
      )}

      {participants.length > 0 && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ROLES.map(role => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {roleFilter !== 'all' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRoleFilter('all')}
              >
                Clear Filters
              </Button>
            )}
          </div>

          <DataTable
            data={filteredData}
            columns={columns}
            keyExtractor={(row) => row.id}
            searchable
            searchPlaceholder="Search by name, email, organization..."
            searchKey={(row) => `${row.firstName} ${row.lastName} ${row.email} ${row.organization}`}
            selectable
            onSelectionChange={(ids) => console.log('Selected:', ids)}
          />
        </>
      )}

      {/* Add Participant Dialog */}
      <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Participant</DialogTitle>
            <DialogDescription>Add a new participant to the system.</DialogDescription>
          </DialogHeader>
          {formFieldsJsx}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleCreate}>Add Participant</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Participant Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) { setEditingParticipant(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Participant</DialogTitle>
            <DialogDescription>Update participant details.</DialogDescription>
          </DialogHeader>
          {formFieldsJsx}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setIsEditOpen(false); setEditingParticipant(null); resetForm(); }}>Cancel</Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ParticipantsPage;
