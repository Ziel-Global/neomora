import React, { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, UserPlus, Shield, Edit, Trash2, UserX } from 'lucide-react';
import { toast } from 'sonner';

interface Permission {
  id: string;
  label: string;
  description: string;
}

interface SubAdmin {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  permissions: string[];
  createdAt: string;
  lastLogin: string | null;
}

const allPermissions: Permission[] = [
  { id: 'invitations', label: 'Manage Invitations', description: 'Create, edit, and send invitations' },
  { id: 'registrations', label: 'Review Registrations', description: 'Approve or reject participant registrations' },
  { id: 'travel', label: 'Manage Travel', description: 'Handle travel bookings and itineraries' },
  { id: 'accommodation', label: 'Manage Accommodation', description: 'Allocate rooms and manage bookings' },
  { id: 'visas', label: 'Process Visas', description: 'Review visa applications and documents' },
  { id: 'transportation', label: 'Manage Transportation', description: 'Plan routes and assign vehicles' },
  { id: 'accreditation', label: 'Handle Accreditation', description: 'Review profiles and print badges' },
  { id: 'equipment', label: 'Track Equipment', description: 'Monitor equipment and customs' },
  { id: 'crowd', label: 'Crowd Management', description: 'Update zones and log incidents' },
  { id: 'analytics', label: 'View Analytics', description: 'Access dashboard and reports (view only)' },
];

const initialSubAdmins: SubAdmin[] = [
  {
    id: 'sa-001',
    name: 'Sarah Operations',
    email: 'ops@eventems.com',
    status: 'active',
    permissions: ['invitations', 'registrations', 'travel', 'accommodation', 'analytics'],
    createdAt: '2024-01-15',
    lastLogin: '2024-12-24',
  },
  {
    id: 'sa-002',
    name: 'Mike Logistics',
    email: 'mike.logistics@eventems.com',
    status: 'active',
    permissions: ['transportation', 'equipment', 'crowd'],
    createdAt: '2024-02-10',
    lastLogin: '2024-12-23',
  },
  {
    id: 'sa-003',
    name: 'Anna Credentials',
    email: 'anna.cred@eventems.com',
    status: 'inactive',
    permissions: ['visas', 'accreditation'],
    createdAt: '2024-03-05',
    lastLogin: '2024-11-15',
  },
];

const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const SubAdminsPage: React.FC = () => {
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>(initialSubAdmins);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSubAdmin, setEditingSubAdmin] = useState<SubAdmin | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPermissions, setFormPermissions] = useState<string[]>([]);

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormPermissions([]);
  };

  const handleCreate = () => {
    if (!formName || !formEmail || !formPassword) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!isValidEmail(formEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    const newSubAdmin: SubAdmin = {
      id: `sa-${Date.now()}`,
      name: formName,
      email: formEmail,
      status: 'active',
      permissions: formPermissions,
      createdAt: new Date().toISOString().split('T')[0],
      lastLogin: null,
    };

    setSubAdmins([...subAdmins, newSubAdmin]);
    setIsCreateOpen(false);
    resetForm();
    toast.success('Sub-Admin created successfully');
  };

  const handleEdit = (subAdmin: SubAdmin) => {
    setEditingSubAdmin(subAdmin);
    setFormName(subAdmin.name);
    setFormEmail(subAdmin.email);
    setFormPermissions(subAdmin.permissions);
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editingSubAdmin) return;

    if (!formName || !formEmail) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!isValidEmail(formEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSubAdmins(subAdmins.map(sa =>
      sa.id === editingSubAdmin.id
        ? { ...sa, name: formName, email: formEmail, permissions: formPermissions }
        : sa
    ));
    setIsEditOpen(false);
    setEditingSubAdmin(null);
    resetForm();
    toast.success('Sub-Admin updated successfully');
  };

  const handleToggleStatus = (id: string) => {
    setSubAdmins(subAdmins.map(sa =>
      sa.id === id
        ? { ...sa, status: sa.status === 'active' ? 'inactive' : 'active' }
        : sa
    ));
    toast.success('Status updated');
  };

  const handleDelete = (id: string) => {
    setSubAdmins(subAdmins.filter(sa => sa.id !== id));
    toast.success('Sub-Admin deleted');
  };

  const togglePermission = (permId: string) => {
    setFormPermissions(prev =>
      prev.includes(permId)
        ? prev.filter(p => p !== permId)
        : [...prev, permId]
    );
  };

  const PermissionsForm = () => (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {allPermissions.map(perm => (
        <div key={perm.id} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-muted/50">
          <Checkbox
            id={perm.id}
            checked={formPermissions.includes(perm.id)}
            onCheckedChange={() => togglePermission(perm.id)}
          />
          <div className="grid gap-1">
            <Label htmlFor={perm.id} className="font-medium cursor-pointer">
              {perm.label}
            </Label>
            <p className="text-xs text-muted-foreground">{perm.description}</p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Sub-Admins"
        description="Create and manage staff accounts with specific access privileges"
        actions={
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Sub-Admin
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Sub-Admin</DialogTitle>
                <DialogDescription>
                  Set up a new staff account with specific permissions
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter full name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="staff@eventems.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Temporary Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a temporary password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    User will be prompted to change this on first login
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Access Privileges</Label>
                  <Card>
                    <CardContent className="pt-4">
                      <PermissionsForm />
                    </CardContent>
                  </Card>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate}>Create Sub-Admin</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Staff</p>
                <p className="text-2xl font-bold">{subAdmins.length}</p>
              </div>
              <Shield className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {subAdmins.filter(s => s.status === 'active').length}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold text-muted-foreground">
                  {subAdmins.filter(s => s.status === 'inactive').length}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Accounts</CardTitle>
          <CardDescription>Manage sub-administrator access and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subAdmins.map((subAdmin) => (
                <TableRow key={subAdmin.id}>
                  <TableCell className="font-medium">{subAdmin.name}</TableCell>
                  <TableCell>{subAdmin.email}</TableCell>
                  <TableCell>
                    <Badge variant={subAdmin.status === 'active' ? 'default' : 'secondary'}>
                      {subAdmin.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {subAdmin.permissions.slice(0, 3).map(perm => (
                        <Badge key={perm} variant="outline" className="text-xs">
                          {allPermissions.find(p => p.id === perm)?.label.replace('Manage ', '').replace('Handle ', '') || perm}
                        </Badge>
                      ))}
                      {subAdmin.permissions.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{subAdmin.permissions.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {subAdmin.lastLogin || 'Never'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(subAdmin)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(subAdmin.id)}>
                          <UserX className="h-4 w-4 mr-2" />
                          {subAdmin.status === 'active' ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(subAdmin.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Sub-Admin</DialogTitle>
            <DialogDescription>
              Update staff account details and permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email Address</Label>
              <Input
                id="edit-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Access Privileges</Label>
              <Card>
                <CardContent className="pt-4">
                  <PermissionsForm />
                </CardContent>
              </Card>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubAdminsPage;
