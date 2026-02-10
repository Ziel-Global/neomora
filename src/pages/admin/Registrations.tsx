import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, Column } from '@/components/common/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { registrationStore, participantStore, EMSRegistration, EMSParticipant, RegistrationStatus, travelStore } from '@/lib/emsStore';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Download,
  Filter,
  Eye,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  AlertTriangle,
  Users,
  Upload,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

// Document storage keys (visa portal and registration)
const VISA_DOCS_KEY = 'ems_visa_documents';
const REG_DOCS_KEY = 'ems_registration_documents';

// Helper to retrieve actual file data from dedicated storage
const getDocumentFileData = (fileDataOrRef: string | undefined): string | null => {
  if (!fileDataOrRef) return null;
  
  // If it's already base64 data, return as-is (legacy support)
  if (fileDataOrRef.startsWith('data:')) {
    return fileDataOrRef;
  }
  
  // Try registration documents storage first
  try {
    const regStored = localStorage.getItem(REG_DOCS_KEY);
    if (regStored) {
      const docStorage = JSON.parse(regStored);
      if (docStorage[fileDataOrRef]) {
        return docStorage[fileDataOrRef];
      }
    }
  } catch (e) {
    console.error('Failed to retrieve from reg docs:', e);
  }
  
  // Fallback to visa documents storage
  try {
    const visaStored = localStorage.getItem(VISA_DOCS_KEY);
    if (visaStored) {
      const docStorage = JSON.parse(visaStored);
      if (docStorage[fileDataOrRef]) {
        return docStorage[fileDataOrRef];
      }
    }
  } catch (e) {
    console.error('Failed to retrieve from visa docs:', e);
  }
  
  return null;
};

interface RegistrationWithParticipant extends EMSRegistration {
  participant: EMSParticipant;
  documentCount: number;
  pendingDocs: number;
}

const RegistrationsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [registrations, setRegistrations] = useState<EMSRegistration[]>([]);
  const [participants, setParticipants] = useState<EMSParticipant[]>([]);

  // Dialog states
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [requestUpdateDialogOpen, setRequestUpdateDialogOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<RegistrationWithParticipant | null>(null);
  const [reason, setReason] = useState('');
  const [viewDocsDialogOpen, setViewDocsDialogOpen] = useState(false);

  // Load data from localStorage
  const loadData = () => {
    setRegistrations(registrationStore.getAll());
    setParticipants(participantStore.getAll());
  };

  useEffect(() => {
    loadData();
  }, []);

  // Combine registration data with participant info
  const registrationsWithParticipants: RegistrationWithParticipant[] = registrations
    .map(reg => {
      const participant = participants.find(p => p.id === reg.participantId);
      if (!participant) return null;
      return {
        ...reg,
        participant,
        documentCount: reg.documents?.length || 0,
        pendingDocs: reg.documents?.filter(d => d.status === 'Pending').length || 0,
      };
    })
    .filter((reg): reg is RegistrationWithParticipant => reg !== null);

  // Apply filters
  const filteredData = registrationsWithParticipants.filter(reg => {
    if (statusFilter !== 'all' && reg.status !== statusFilter) return false;
    return true;
  });

  // Stats
  const stats = {
    submitted: registrations.filter(r => r.status === 'Submitted').length,
    underReview: registrations.filter(r => r.status === 'Under Review').length,
    approved: registrations.filter(r => r.status === 'Approved').length,
    rejected: registrations.filter(r => r.status === 'Rejected').length,
  };

  // Action handlers
  const handleApprove = (reg: RegistrationWithParticipant) => {
    registrationStore.approve(reg.id, 'Admin');
    // Auto-generate travel itinerary if participant needs transport
    if (reg.formData.needsTransport) {
      const travel = travelStore.generateForApprovedRegistration(reg.id);
      if (travel) {
        toast.success(`Travel itinerary generated for ${reg.participant.firstName}`);
      }
    }
    loadData();
    toast.success(`Registration ${reg.registrationId} approved`);
  };

  const handleStartReview = (reg: RegistrationWithParticipant) => {
    registrationStore.startReview(reg.id);
    loadData();
    toast.info(`Registration ${reg.registrationId} marked as under review`);
  };

  const handleReject = () => {
    if (!selectedRegistration || !reason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    registrationStore.reject(selectedRegistration.id, 'Admin', reason);
    loadData();
    toast.success(`Registration ${selectedRegistration.registrationId} rejected`);
    setRejectDialogOpen(false);
    setSelectedRegistration(null);
    setReason('');
  };

  const handleRequestUpdate = () => {
    if (!selectedRegistration || !reason.trim()) {
      toast.error('Please provide a reason for the update request');
      return;
    }
    registrationStore.requestUpdate(selectedRegistration.id, 'Admin', reason);
    loadData();
    toast.success(`Update requested for ${selectedRegistration.registrationId}`);
    setRequestUpdateDialogOpen(false);
    setSelectedRegistration(null);
    setReason('');
  };

  const openRejectDialog = (reg: RegistrationWithParticipant) => {
    setSelectedRegistration(reg);
    setReason('');
    setRejectDialogOpen(true);
  };

  const openRequestUpdateDialog = (reg: RegistrationWithParticipant) => {
    setSelectedRegistration(reg);
    setReason('');
    setRequestUpdateDialogOpen(true);
  };

  const openViewDocsDialog = (reg: RegistrationWithParticipant) => {
    setSelectedRegistration(reg);
    setViewDocsDialogOpen(true);
  };

  const columns: Column<RegistrationWithParticipant>[] = [
    {
      key: 'registrationId',
      header: 'Reg. ID',
      sortable: true,
      accessor: (row) => (
        <span className="font-mono text-sm">{row.registrationId}</span>
      ),
    },
    {
      key: 'participant',
      header: 'Participant',
      sortable: true,
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-accent/10 text-accent text-xs">
              {row.participant.firstName.charAt(0)}{row.participant.lastName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{row.participant.firstName} {row.participant.lastName}</p>
            <p className="text-xs text-muted-foreground">{row.participant.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'nationality',
      header: 'Nationality',
      sortable: true,
      accessor: (row) => row.participant.nationality,
    },
    {
      key: 'role',
      header: 'Role',
      accessor: (row) => (
        <span className="text-sm">{row.participant.role}</span>
      ),
    },
    {
      key: 'documents',
      header: 'Documents',
      accessor: (row) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto py-1 px-2 -ml-2"
          onClick={(e) => {
            e.stopPropagation();
            openViewDocsDialog(row);
          }}
        >
          <div className="flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{row.documentCount}</span>
            {row.pendingDocs > 0 && (
              <span className="text-xs text-status-warning">({row.pendingDocs} pending)</span>
            )}
          </div>
        </Button>
      ),
    },
    {
      key: 'submittedAt',
      header: 'Submitted',
      sortable: true,
      accessor: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.status} />,
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
              <Link to={`/admin/participants/${row.participantId}`} className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                View Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {row.status === 'Submitted' && (
              <DropdownMenuItem
                className="flex items-center gap-2 text-status-info"
                onClick={() => handleStartReview(row)}
              >
                <Clock className="h-4 w-4" />
                Start Review
              </DropdownMenuItem>
            )}
            {(row.status === 'Submitted' || row.status === 'Under Review') && (
              <>
                <DropdownMenuItem
                  className="flex items-center gap-2 text-status-success"
                  onClick={() => handleApprove(row)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex items-center gap-2 text-status-error"
                  onClick={() => openRejectDialog(row)}
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex items-center gap-2 text-status-warning"
                  onClick={() => openRequestUpdateDialog(row)}
                >
                  <AlertTriangle className="h-4 w-4" />
                  Request Update
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Registrations"
        subtitle="Review and manage participant registrations"
        breadcrumbs={[{ label: 'Registrations' }]}
        actions={
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('Submitted')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Submitted</p>
                <p className="text-2xl font-bold">{stats.submitted}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-status-info-bg flex items-center justify-center">
                <FileText className="h-5 w-5 text-status-info" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('Under Review')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Under Review</p>
                <p className="text-2xl font-bold">{stats.underReview}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-status-warning-bg flex items-center justify-center">
                <Clock className="h-5 w-5 text-status-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('Approved')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-status-success-bg flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-status-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('Rejected')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-status-error-bg flex items-center justify-center">
                <XCircle className="h-5 w-5 text-status-error" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-8">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Submitted">Submitted</SelectItem>
            <SelectItem value="Under Review">Under Review</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
            <SelectItem value="Update Requested">Update Requested</SelectItem>
          </SelectContent>
        </Select>

        {statusFilter !== 'all' && (
          <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Empty State or Data Table */}
      {registrationsWithParticipants.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Registrations Yet</h3>
            <p className="text-muted-foreground max-w-md">
              Registrations will appear here when participants accept invitations and complete their registration forms.
            </p>
          </div>
        </Card>
      ) : (
        <DataTable
          data={filteredData}
          columns={columns}
          keyExtractor={(row) => row.registrationId}
          searchable
          searchPlaceholder="Search by name, email, registration ID..."
          searchKey={(row) => `${row.participant.firstName} ${row.participant.lastName} ${row.participant.email} ${row.registrationId}`}
          selectable
          onSelectionChange={(ids) => console.log('Selected:', ids)}
        />
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Registration</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this registration. This will be visible to the participant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Rejection Reason</Label>
              <Textarea
                id="reject-reason"
                placeholder="Enter the reason for rejection..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject Registration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Update Dialog */}
      <Dialog open={requestUpdateDialogOpen} onOpenChange={setRequestUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Update</DialogTitle>
            <DialogDescription>
              Specify what information needs to be updated by the participant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="update-reason">Required Updates</Label>
              <Textarea
                id="update-reason"
                placeholder="Describe what needs to be updated..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRequestUpdate}>
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Documents Dialog */}
      <Dialog open={viewDocsDialogOpen} onOpenChange={setViewDocsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Documents</DialogTitle>
            <DialogDescription>
              Documents submitted by {selectedRegistration?.participant.firstName} {selectedRegistration?.participant.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!selectedRegistration?.documents || selectedRegistration.documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No documents submitted yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedRegistration.documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center bg-muted`}>
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{doc.type}</p>
                        <p className="text-xs text-muted-foreground truncate">{doc.fileName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const actualFileData = getDocumentFileData(doc.fileData);
                          if (actualFileData) {
                            // Open in modal for better viewing
                            const newWindow = window.open();
                            if (newWindow) {
                              if (actualFileData.startsWith('data:image/')) {
                                newWindow.document.write(
                                  `<html><head><title>${doc.fileName}</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#1a1a1a;"><img src="${actualFileData}" style="max-width:100%;max-height:100vh;object-fit:contain;" /></body></html>`
                                );
                              } else {
                                newWindow.document.write(
                                  `<iframe src="${actualFileData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
                                );
                              }
                            } else {
                              toast.error('Pop-up blocked. Please allow pop-ups to view documents.');
                            }
                          } else {
                            toast.info('Document not found or not yet uploaded.');
                          }
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <StatusBadge status={doc.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setViewDocsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RegistrationsPage;
