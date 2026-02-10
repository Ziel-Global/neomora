import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ProfileSkeleton } from '@/components/common/LoadingSkeleton';
import {
  participantStore,
  invitationStore,
  registrationStore,
  eventStore,
  initializeStore,
  visaStore,
  EMSParticipant,
  EMSInvitation,
  EMSRegistration,
  EMSVisaApplication,
} from '@/lib/emsStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Mail,
  Phone,
  MapPin,
  Building2,
  FileText,
  Plane,
  Hotel,
  BadgeCheck,
  Edit,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  ExternalLink,
  Globe,
  FileCheck2,
  Upload,
} from 'lucide-react';
import { format } from 'date-fns';

const ParticipantProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [participant, setParticipant] = useState<EMSParticipant | null>(null);
  const [invitations, setInvitations] = useState<EMSInvitation[]>([]);
  const [registrations, setRegistrations] = useState<EMSRegistration[]>([]);
  const [visaApp, setVisaApp] = useState<EMSVisaApplication | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{ type: string; fileName: string; fileData?: string } | null>(null);

  useEffect(() => {
    initializeStore();

    const timer = setTimeout(() => {
      if (id) {
        const p = participantStore.getById(id);
        setParticipant(p || null);

        if (p) {
          // Get invitations for this participant
          const invs = invitationStore.getAll().filter(inv => inv.participantId === p.id);
          setInvitations(invs);

          // Get registrations for this participant
          const regs = registrationStore.getAll().filter(reg => reg.participantId === p.id);
          setRegistrations(regs);

          // Get visa application
          const visa = visaStore.getByParticipant(p.id);
          setVisaApp(visa || null);
        }
      }
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [id]);

  const getEventName = (eventId: string) => {
    return eventStore.getById(eventId)?.name || 'Unknown Event';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Loading..."
          breadcrumbs={[
            { label: 'Participants', href: '/admin/participants' },
            { label: 'Profile' }
          ]}
        />
        <Card>
          <CardContent className="pt-6">
            <ProfileSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Participant Not Found"
          breadcrumbs={[
            { label: 'Participants', href: '/admin/participants' },
            { label: 'Profile' }
          ]}
        />
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            The requested participant could not be found.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get latest invitation and registration statuses
  const latestInvitation = invitations[0];
  const latestRegistration = registrations[0];

  const journeySteps = [
    {
      label: 'Invitation',
      status: latestInvitation?.status === 'Accepted' ? 'complete'
        : latestInvitation?.status === 'Declined' ? 'rejected'
          : latestInvitation ? 'pending' : 'not-started',
      value: latestInvitation?.status || 'Not Invited'
    },
    {
      label: 'Registration',
      status: latestRegistration?.status === 'Approved' ? 'complete'
        : latestRegistration?.status === 'Rejected' ? 'rejected'
          : latestRegistration ? 'pending' : 'not-started',
      value: latestRegistration?.status || 'Not Registered'
    },
    {
      label: 'Documents',
      status: latestRegistration?.documents?.every(d => d.status === 'Verified') ? 'complete'
        : latestRegistration?.documents?.some(d => d.status === 'Rejected') ? 'rejected'
          : latestRegistration?.documents?.length ? 'pending' : 'not-started',
      value: latestRegistration?.documents?.length
        ? `${latestRegistration.documents.filter(d => d.status === 'Verified').length}/${latestRegistration.documents.length}`
        : '-'
    },
    {
      label: 'Visa',
      status: visaApp?.status === 'Approved' || visaApp?.status === 'Not Required' ? 'complete'
        : visaApp?.status === 'Rejected' ? 'rejected'
          : visaApp ? 'pending' : 'not-started',
      value: visaApp?.status || 'Not Required'
    },
    {
      label: 'Badge',
      status: latestRegistration?.status === 'Approved' ? 'complete' : 'not-started',
      value: latestRegistration?.status === 'Approved' ? 'Ready' : 'Pending'
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`${participant.firstName} ${participant.lastName}`}
        breadcrumbs={[
          { label: 'Participants', href: '/admin/participants' },
          { label: `${participant.firstName} ${participant.lastName}` },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        }
      />

      {/* Profile Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Avatar className="h-20 w-20 text-2xl">
              <AvatarFallback className="bg-accent text-accent-foreground">
                {participant.firstName.charAt(0)}{participant.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div>
                  <h2 className="text-xl font-semibold">
                    {participant.firstName} {participant.lastName}
                  </h2>
                  <p className="text-muted-foreground">{participant.organization}</p>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-accent/10 text-accent w-fit">
                  {participant.role}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{participant.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{participant.phone || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{participant.nationality || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>ID: {latestRegistration?.registrationId || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Journey Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Participant Journey</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {journeySteps.map((step, index) => (
              <div key={step.label} className="flex items-center">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${step.status === 'complete' ? 'bg-status-success-bg border-status-success/30' :
                  step.status === 'rejected' ? 'bg-status-error-bg border-status-error/30' :
                    step.status === 'pending' ? 'bg-status-warning-bg border-status-warning/30' :
                      'bg-muted border-border'
                  }`}>
                  {step.status === 'complete' && <CheckCircle2 className="h-4 w-4 text-status-success" />}
                  {step.status === 'rejected' && <XCircle className="h-4 w-4 text-status-error" />}
                  {step.status === 'pending' && <Clock className="h-4 w-4 text-status-warning" />}
                  {step.status === 'not-started' && <AlertCircle className="h-4 w-4 text-muted-foreground" />}
                  <div>
                    <p className="text-xs font-medium">{step.label}</p>
                    <p className="text-xs text-muted-foreground">{step.value || '-'}</p>
                  </div>
                </div>
                {index < journeySteps.length - 1 && (
                  <div className="h-px w-4 bg-border mx-1 hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
          <TabsTrigger value="registrations">Registrations</TabsTrigger>
          <TabsTrigger value="visa">Visa</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Personal Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Full Name</p>
                    <p className="text-sm font-medium">{participant.firstName} {participant.lastName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Nationality</p>
                    <p className="text-sm font-medium">{participant.nationality || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Organization</p>
                    <p className="text-sm font-medium">{participant.organization}</p>
                  </div>
                  {participant.dietaryNotes && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Dietary Requirements</p>
                      <p className="text-sm font-medium">{participant.dietaryNotes}</p>
                    </div>
                  )}
                  {participant.accessibilityNeeds && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Accessibility Needs</p>
                      <p className="text-sm font-medium">{participant.accessibilityNeeds}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Status Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Status Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Invitation Status</span>
                  <StatusBadge status={latestInvitation?.status || 'Not Invited'} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Registration</span>
                  <StatusBadge status={latestRegistration?.status || 'Not Registered'} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Documents</span>
                  <span className="text-sm text-muted-foreground">
                    {latestRegistration?.documents?.length
                      ? `${latestRegistration.documents.filter(d => d.status === 'Verified').length}/${latestRegistration.documents.length}`
                      : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Badge Status</span>
                  <StatusBadge status={latestRegistration?.status === 'Approved' ? 'Ready' : 'Pending'} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invitations">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Invitations</CardTitle>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No invitations sent yet</p>
              ) : (
                <div className="space-y-3">
                  {invitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{getEventName(inv.eventId)}</p>
                          <p className="text-xs text-muted-foreground">
                            RSVP by: {inv.rsvpDeadline}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={inv.status} size="sm" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/invite/${inv.token}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="registrations">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Registrations</CardTitle>
            </CardHeader>
            <CardContent>
              {registrations.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No registrations yet</p>
              ) : (
                <div className="space-y-3">
                  {registrations.map((reg) => (
                    <div
                      key={reg.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{getEventName(reg.eventId)}</p>
                          <p className="text-xs text-muted-foreground">
                            ID: {reg.registrationId}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={reg.status} size="sm" />
                        {reg.submittedAt && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(reg.submittedAt), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visa">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Visa Information</CardTitle>
            </CardHeader>
            <CardContent>
              {!visaApp ? (
                <p className="text-center py-8 text-muted-foreground">No visa application found</p>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Visa Status</p>
                        <p className="text-xs text-muted-foreground">{visaApp.nationality} Application</p>
                      </div>
                    </div>
                    <StatusBadge status={visaApp.status} />
                  </div>

                  {visaApp.status !== 'Not Required' && (
                    <div className="space-y-4">
                      <p className="text-sm font-semibold">Uploaded Documents</p>
                      <div className="grid gap-3">
                        {visaApp.requiredDocuments.map((docType, i) => {
                          const doc = visaApp.uploadedDocuments.find(d => d.type === docType);
                          return (
                            <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <FileCheck2 className={`h-4 w-4 ${doc ? 'text-blue-500' : 'text-muted-foreground'}`} />
                                <span className="text-sm">{docType}</span>
                              </div>
                              {doc ? (
                                <div className="flex items-center gap-2">
                                  {doc.status === 'Verified' && <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 text-[10px] h-5">Verified</Badge>}
                                  {doc.status === 'Rejected' && <Badge variant="destructive" className="text-[10px] h-5">Rejected</Badge>}
                                  <span className="text-xs text-muted-foreground">{format(new Date(doc.uploadedAt), 'MMM d')}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => setViewingDoc(doc)}
                                  >
                                    View
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-amber-600">Pending</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {visaApp.rejectionReason && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm font-semibold text-destructive">Rejection Reason</p>
                      <p className="text-sm text-destructive/80 mt-1">{visaApp.rejectionReason}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { action: 'Profile viewed', user: 'Admin User', time: 'Just now' },
                  ...(latestRegistration ? [
                    { action: `Registration ${latestRegistration.status.toLowerCase()}`, user: 'System', time: latestRegistration.updatedAt ? format(new Date(latestRegistration.updatedAt), 'MMM d, HH:mm') : '-' }
                  ] : []),
                  ...(latestInvitation ? [
                    { action: `Invitation ${latestInvitation.status.toLowerCase()}`, user: 'System', time: latestInvitation.updatedAt ? format(new Date(latestInvitation.updatedAt), 'MMM d, HH:mm') : '-' }
                  ] : []),
                  { action: 'Participant created', user: 'System', time: participant.createdAt ? format(new Date(participant.createdAt), 'MMM d, yyyy') : '-' },
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">{item.action}</p>
                      <p className="text-muted-foreground">by {item.user}</p>
                    </div>
                    <span className="text-muted-foreground text-xs">{item.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Document Viewer Dialog */}
      <Dialog open={!!viewingDoc} onOpenChange={(open) => !open && setViewingDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col font-sans">
          <DialogHeader>
            <DialogTitle>{viewingDoc?.type} - {viewingDoc?.fileName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-muted/20 rounded-lg p-4 flex items-center justify-center">
            {viewingDoc?.fileData ? (
              viewingDoc.fileData.startsWith('data:image/') ? (
                <img
                  src={viewingDoc.fileData}
                  alt={viewingDoc.fileName}
                  className="max-w-full h-auto shadow-sm rounded border"
                />
              ) : viewingDoc.fileData.startsWith('data:application/pdf') ? (
                <iframe
                  src={viewingDoc.fileData}
                  title={viewingDoc.fileName}
                  className="w-full h-[70vh] rounded border"
                />
              ) : (
                <div className="text-center p-12">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">This file format cannot be previewed directly.</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = viewingDoc.fileData!;
                      link.download = viewingDoc.fileName;
                      link.click();
                    }}
                  >
                    Download File
                  </Button>
                </div>
              )
            ) : (
              <p className="text-muted-foreground">No preview available</p>
            )}
          </div>
          <div className="flex justify-end pt-4">
            <Button variant="ghost" onClick={() => setViewingDoc(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ParticipantProfile;