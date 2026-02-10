import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatsCard } from '@/components/common/StatsCard';
import { StatusBadge } from '@/components/common/StatusBadge';
// import { visaCases } from '@/data/mockData'; // Deprecated mock data
import { visaRequirements } from '@/data/additionalMockData';
import { FileCheck2, Clock, CheckCircle, AlertTriangle, Search, Eye, Upload, Globe, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { visaStore, participantStore, EMSVisaApplication } from '@/lib/emsStore';
import { toast } from 'sonner';

// Document storage key (same as participant portal)
const VISA_DOCS_KEY = 'ems_visa_documents';

// Helper to retrieve actual file data from dedicated storage
const getDocumentFileData = (fileDataOrRef: string | undefined): string | null => {
  if (!fileDataOrRef) return null;
  
  // If it's already base64 data, return as-is (legacy support)
  if (fileDataOrRef.startsWith('data:')) {
    return fileDataOrRef;
  }
  
  // Otherwise, it's a reference ID - look up in dedicated storage
  try {
    const stored = localStorage.getItem(VISA_DOCS_KEY);
    if (stored) {
      const docStorage = JSON.parse(stored);
      return docStorage[fileDataOrRef] || null;
    }
  } catch (e) {
    console.error('Failed to retrieve document:', e);
  }
  return null;
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'Approved': return 'success';
    case 'Submitted': return 'info';
    case 'Ready': return 'info';
    case 'Reviewing': return 'warning';
    case 'Pending Docs': return 'warning';
    case 'Rejected': return 'destructive';
    case 'Not Required': return 'secondary';
    default: return 'default';
  }
};

const VisasPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('cases');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCase, setSelectedCase] = useState<EMSVisaApplication | null>(null);

  // Real data state
  const [visaApplications, setVisaApplications] = useState<EMSVisaApplication[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Review state
  const [reviewNotes, setReviewNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<{ type: string; fileName: string; fileData?: string } | null>(null);

  useEffect(() => {
    const apps = visaStore.getAll();
    setVisaApplications(apps);
  }, [refreshTrigger]);

  const refreshData = () => setRefreshTrigger(prev => prev + 1);

  const getParticipant = (id: string) => participantStore.getById(id);

  const stats = {
    approved: visaApplications.filter(v => v.status === 'Approved').length,
    submitted: visaApplications.filter(v => v.status === 'Submitted').length,
    pending: visaApplications.filter(v => v.status === 'Pending Docs' || v.status === 'Reviewing').length,
    total: visaApplications.length,
  };

  const filteredCases = visaApplications.filter(vc => {
    const participant = getParticipant(vc.participantId);
    const matchesSearch = participant?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vc.nationality.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = (status: 'Approved' | 'Rejected' | 'More Info') => {
    if (!selectedCase) return;
    setIsProcessing(true);

    const updates: Partial<EMSVisaApplication> = {
      status,
      adminNotes: reviewNotes
    };

    if (status === 'Rejected') {
      updates.rejectionReason = reviewNotes;
    }

    visaStore.update(selectedCase.id, updates);
    toast.success(`Visa application marked as ${status}`);
    setIsProcessing(false);
    setSelectedCase(null);
    setReviewNotes('');
    refreshData();
  };

  const handleVerifyDoc = (docFileName: string, status: 'Verified' | 'Rejected') => {
    if (!selectedCase) return;
    const updated = visaStore.verifyDocument(selectedCase.id, docFileName, status);
    if (updated) {
      setSelectedCase(updated);
      toast.success(`Document ${status}`);
      refreshData();
    }
  };

  const handleViewDoc = (doc: { type: string; fileName: string; fileData?: string }) => {
    // Try to get the actual file data (from reference or legacy base64)
    const actualFileData = getDocumentFileData(doc.fileData);
    
    if (!actualFileData) {
      toast.error('No file data available for this document');
      return;
    }
    
    // Set viewing doc with the actual file data
    setViewingDoc({
      ...doc,
      fileData: actualFileData
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visas & Documents"
        description="Manage visa applications and document verification"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Approved" value={stats.approved} icon={CheckCircle} trend={{ value: 33, isPositive: true }} />
        <StatsCard title="Submitted" value={stats.submitted} icon={FileCheck2} />
        <StatsCard title="Pending" value={stats.pending} icon={Clock} />
        <StatsCard title="Total Cases" value={stats.total} icon={Globe} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="cases">Visa Cases</TabsTrigger>
          <TabsTrigger value="requirements">Requirements Library</TabsTrigger>
          <TabsTrigger value="batches">Submission Batches</TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or nationality..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pending Docs">Pending Docs</SelectItem>
                <SelectItem value="Reviewing">Reviewing</SelectItem>
                <SelectItem value="Submitted">Submitted</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participant</TableHead>
                  <TableHead>Nationality</TableHead>
                  <TableHead>Docs Status</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No visa applications found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCases.map((vc) => {
                    const participant = getParticipant(vc.participantId);
                    const uploadedCount = vc.uploadedDocuments.length;
                    const requiredCount = vc.requiredDocuments.length;

                    return (
                      <TableRow key={vc.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{participant?.firstName} {participant?.lastName}</p>
                            <p className="text-sm text-muted-foreground">{participant?.organization}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{vc.nationality}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={(uploadedCount / Math.max(requiredCount, 1)) * 100} className="w-16 h-2" />
                            <span className="text-xs text-muted-foreground">{uploadedCount}/{requiredCount}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {vc.submissionBatch ? (
                            <Badge variant="secondary" className="font-mono text-xs">{vc.submissionBatch}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={vc.status} variant={getStatusVariant(vc.status)} />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedCase(vc)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="requirements" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Visa Requirements by Country</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Country</TableHead>
                  <TableHead>Visa Required</TableHead>
                  <TableHead>Required Documents</TableHead>
                  <TableHead>Processing Time</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visaRequirements.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.country}</TableCell>
                    <TableCell>
                      {req.visaRequired ? (
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Required</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">Not Required</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {req.requiredDocs.slice(0, 2).map((doc, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{doc}</Badge>
                        ))}
                        {req.requiredDocs.length > 2 && (
                          <Badge variant="secondary" className="text-xs">+{req.requiredDocs.length - 2}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{req.processingDays > 0 ? `${req.processingDays} days` : 'Instant'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{req.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="batches" className="space-y-4 mt-4">
          <div className="text-center py-8 text-muted-foreground">
            Batch management is coming soon.
          </div>
        </TabsContent>
      </Tabs>

      {/* Case Detail Dialog */}
      <Dialog open={!!selectedCase} onOpenChange={() => setSelectedCase(null)}>
        <DialogContent className="max-w-2xl">
          {selectedCase && (
            <>
              <DialogHeader>
                <DialogTitle>Visa Application Review</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="flex justify-between items-start p-4 bg-muted/30 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-lg">{getParticipant(selectedCase.participantId)?.firstName} {getParticipant(selectedCase.participantId)?.lastName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{selectedCase.nationality}</Badge>
                    </div>
                  </div>
                  <StatusBadge status={selectedCase.status} variant={getStatusVariant(selectedCase.status)} />
                </div>

                <div>
                  <Label className="text-muted-foreground text-sm font-semibold">Document Verification</Label>
                  <div className="space-y-3 mt-3">
                    {selectedCase.requiredDocuments.map((docType, i) => {
                      const uploadedDoc = selectedCase.uploadedDocuments.find(d => d.type === docType);
                      return (
                        <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-card group">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${uploadedDoc ? (uploadedDoc.status === 'Verified' ? 'bg-green-50 text-green-600' : uploadedDoc.status === 'Rejected' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600') : 'bg-gray-100 text-gray-400'}`}>
                              <FileCheck2 className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{docType}</p>
                                {uploadedDoc?.status === 'Verified' && <Badge className="h-4 px-1 text-[10px] bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Verified</Badge>}
                                {uploadedDoc?.status === 'Rejected' && <Badge className="h-4 px-1 text-[10px] bg-red-100 text-red-700 hover:bg-red-100 border-red-200" variant="destructive">Rejected</Badge>}
                              </div>
                              {uploadedDoc ? (
                                <p className="text-xs text-muted-foreground">Uploaded: {new Date(uploadedDoc.uploadedAt).toLocaleDateString()}</p>
                              ) : (
                                <p className="text-xs text-amber-600">Pending Upload</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {uploadedDoc && (
                              <>
                                {uploadedDoc.status !== 'Verified' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs text-green-600 border-green-200 hover:bg-green-50"
                                    onClick={() => handleVerifyDoc(uploadedDoc.fileName, 'Verified')}
                                  >
                                    Approve
                                  </Button>
                                )}
                                {uploadedDoc.status !== 'Rejected' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => handleVerifyDoc(uploadedDoc.fileName, 'Rejected')}
                                  >
                                    Reject
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-xs"
                                  onClick={() => handleViewDoc(uploadedDoc)}
                                >
                                  View
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Review Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add comments or rejection reasons..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setSelectedCase(null)}>Close</Button>

                {['Pending Docs', 'Reviewing', 'More Info'].includes(selectedCase.status) && (
                  <>
                    <Button
                      variant="destructive"
                      disabled={isProcessing}
                      onClick={() => handleUpdateStatus('Rejected')}
                    >
                      Reject
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      disabled={isProcessing}
                      onClick={() => handleUpdateStatus('Approved')}
                    >
                      Approve Visa
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Document Viewer Dialog */}
      <Dialog open={!!viewingDoc} onOpenChange={(open) => !open && setViewingDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
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
          <DialogFooter>
            <Button variant="ghost" onClick={() => setViewingDoc(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VisasPage;

