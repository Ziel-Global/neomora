import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useParticipantSession } from '@/contexts/ParticipantSessionContext';
import { visaStore, EMSVisaApplication, VisaDocument } from '@/lib/emsStore';
import { StatusBadge } from '@/components/common/StatusBadge';
import { FileCheck2, Upload, AlertCircle, CheckCircle2, Clock, Globe, Eye, X, FileText, Image } from 'lucide-react';
import { toast } from 'sonner';

// Separate storage key for document files to avoid quota issues
const VISA_DOCS_KEY = 'ems_visa_documents';

const getStoredDocuments = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(VISA_DOCS_KEY) || '{}');
  } catch {
    return {};
  }
};

const storeDocumentFile = (docId: string, fileData: string): boolean => {
  try {
    const docs = getStoredDocuments();
    docs[docId] = fileData;
    localStorage.setItem(VISA_DOCS_KEY, JSON.stringify(docs));
    return true;
  } catch (e) {
    if (e instanceof Error && e.name === 'QuotaExceededError') {
      toast.error('Storage full. Please clear browser data or use smaller files.');
    }
    return false;
  }
};

const getDocumentFile = (docId: string): string | null => {
  // Try visa documents storage first
  const visaDocs = getStoredDocuments();
  if (visaDocs[docId]) return visaDocs[docId];
  
  // Fall back to registration documents storage (for passport scans uploaded during registration)
  try {
    const regDocs = localStorage.getItem('ems_registration_documents');
    if (regDocs) {
      const docs = JSON.parse(regDocs);
      if (docs[docId]) return docs[docId];
    }
  } catch {
    // Ignore errors
  }
  
  return null;
};

const PortalVisaPage: React.FC = () => {
  const { participant } = useParticipantSession();
  const [application, setApplication] = useState<EMSVisaApplication | null>(null);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [activeDocType, setActiveDocType] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<{ type: string; fileName: string; data: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (participant) {
      const app = visaStore.checkRequirement(participant.id);
      setApplication(app);
    }
  }, [participant]);

  const handleFileUpload = (docType: string) => {
    if (!application) return;
    setActiveDocType(docType);
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !application || !activeDocType) return;

    // Validate file size (max 2MB to avoid quota issues)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large. Maximum 2MB allowed.');
      setActiveDocType(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const docType = activeDocType;
    setIsUploading(docType);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      
      // Generate unique doc ID
      const docId = `${application.id}-${docType.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;
      
      // Store file data separately
      const stored = storeDocumentFile(docId, base64String);
      if (!stored) {
        setIsUploading(null);
        setActiveDocType(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const newDoc: VisaDocument = {
        type: docType,
        fileName: file.name,
        fileData: docId, // Store only the reference ID, not the actual data
        uploadedAt: new Date().toISOString(),
        status: 'Pending',
      };

      const updated = visaStore.addDocument(application.id, newDoc);
      if (updated) {
        setApplication(updated);
        toast.success(`${docType} uploaded successfully`);
      }
      setIsUploading(null);
      setActiveDocType(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
      setIsUploading(null);
      setActiveDocType(null);
    };
    reader.readAsDataURL(file);
  };

  const handleViewDocument = (doc: VisaDocument) => {
    // Try to get the stored file data
    let fileData = getDocumentFile(doc.fileData);
    
    // Fallback: if fileData is already base64 (old format), use it directly
    if (!fileData && doc.fileData.startsWith('data:')) {
      fileData = doc.fileData;
    }
    
    if (!fileData) {
      toast.error('Document file not found in storage');
      return;
    }
    
    setViewingDoc({
      type: doc.type,
      fileName: doc.fileName,
      data: fileData
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'text-green-600 bg-green-50 border-green-200';
      case 'Rejected': return 'text-red-600 bg-red-50 border-red-200';
      case 'Submitted': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Not Required': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-amber-600 bg-amber-50 border-amber-200';
    }
  };

  const isImageFile = (fileName: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
  };

  if (!participant || !application) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Visa & Travel Documents</h1>
        <p className="text-muted-foreground">Manage your visa application and entry requirements.</p>
      </div>

      {/* Status Overview */}
      <Card className={getStatusColor(application.status)}>
        <CardContent className="pt-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {application.status === 'Approved' ? <CheckCircle2 className="h-8 w-8" /> :
              application.status === 'Not Required' ? <Globe className="h-8 w-8" /> :
                <Clock className="h-8 w-8" />}
            <div>
              <h2 className="text-lg font-bold">Visa Status: {application.status}</h2>
              <p className="text-sm opacity-90">
                {application.status === 'Not Required' ? 'You can travel with your passport.' :
                  application.status === 'Approved' ? 'Your visa has been approved. Safe travels!' :
                    'Please complete the requirements below.'}
              </p>
            </div>
          </div>
          {application.status === 'Approved' && (
            <Button variant="outline" className="bg-white/50 hover:bg-white/80">
              Download Visa
            </Button>
          )}
        </CardContent>
      </Card>

      {application.status === 'Not Required' ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Start your journey</h3>
            </div>
            <p className="text-muted-foreground">
              Based on your nationality ({application.nationality}), you do not require a visa for this event.
              Please ensure your passport is valid for at least 6 months from your travel date.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Required Documents</CardTitle>
            <CardDescription>Please upload clear scans of the following documents (max 2MB each).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {application.requiredDocuments.map((docType) => {
              const uploaded = application.uploadedDocuments.find(d => d.type === docType);
              return (
                <div key={docType} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
                  <div className="flex items-center gap-3">
                    <FileCheck2 className={`h-5 w-5 ${uploaded ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="font-medium">{docType}</p>
                      {uploaded && (
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{uploaded.fileName}</Badge>
                          <StatusBadge status={uploaded.status} size="sm" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {uploaded && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDocument(uploaded)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    )}
                    
                    {(!uploaded || uploaded.status === 'Rejected') ? (
                      <Button
                        onClick={() => handleFileUpload(docType)}
                        disabled={!!isUploading}
                        variant={uploaded?.status === 'Rejected' ? "destructive" : "outline"}
                      >
                        {isUploading === docType ? 'Uploading...' : uploaded?.status === 'Rejected' ? 'Re-upload' : 'Upload Document'}
                        <Upload className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" disabled className={uploaded.status === 'Verified' ? "text-green-600" : "text-blue-600"}>
                        {uploaded.status === 'Verified' ? (
                          <><CheckCircle2 className="h-4 w-4 mr-2" /> Verified</>
                        ) : (
                          <><Clock className="h-4 w-4 mr-2" /> Reviewing</>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Admin Notes / Rejection Reason */}
      {(application.rejectionReason || application.adminNotes) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Attention Needed</AlertTitle>
          <AlertDescription>
            {application.rejectionReason || application.adminNotes}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        accept=".pdf,.jpg,.jpeg,.png"
      />

      {/* Document Viewer Modal */}
      <Dialog open={!!viewingDoc} onOpenChange={() => setViewingDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewingDoc && isImageFile(viewingDoc.fileName) ? (
                <Image className="h-5 w-5" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
              {viewingDoc?.type} - {viewingDoc?.fileName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4 overflow-auto max-h-[70vh]">
            {viewingDoc && (
              isImageFile(viewingDoc.fileName) ? (
                <img 
                  src={viewingDoc.data} 
                  alt={viewingDoc.type}
                  className="max-w-full h-auto rounded-lg border"
                />
              ) : viewingDoc.data.includes('application/pdf') ? (
                <iframe 
                  src={viewingDoc.data}
                  className="w-full h-[60vh] rounded-lg border"
                  title={viewingDoc.type}
                />
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Preview not available for this file type.</p>
                  <a 
                    href={viewingDoc.data} 
                    download={viewingDoc.fileName}
                    className="text-primary underline mt-2 inline-block"
                  >
                    Download file
                  </a>
                </div>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PortalVisaPage;
