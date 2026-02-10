 import React, { useState, useEffect } from 'react';
 import { useSearchParams, useNavigate } from 'react-router-dom';
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { useManagerSession } from '@/contexts/ManagerSessionContext';
 import { teamMemberStore, TeamMember } from '@/lib/teamStore';
 import { ArrowLeft, Upload, FileText, Eye, Trash2, CheckCircle, Clock, XCircle } from 'lucide-react';
 import { toast } from 'sonner';
 
 const MEMBER_DOCS_KEY = 'ems_member_documents';
 
 const REQUIRED_DOCS = [
   { type: 'Passport', label: 'Passport Copy' },
   { type: 'Photo', label: 'ID Photo' },
   { type: 'Medical Certificate', label: 'Medical Certificate' },
   { type: 'Insurance', label: 'Insurance Document' },
 ];
 
 // Store document in dedicated storage
 const storeDocument = (docId: string, fileData: string): boolean => {
   try {
     const stored = localStorage.getItem(MEMBER_DOCS_KEY);
     const docStorage = stored ? JSON.parse(stored) : {};
     docStorage[docId] = fileData;
     localStorage.setItem(MEMBER_DOCS_KEY, JSON.stringify(docStorage));
     return true;
   } catch (e) {
     console.error('Failed to store document:', e);
     return false;
   }
 };
 
 // Retrieve document from storage
 const getDocumentData = (fileDataOrRef: string | undefined): string | null => {
   if (!fileDataOrRef) return null;
   if (fileDataOrRef.startsWith('data:')) return fileDataOrRef;
   
   try {
     const stored = localStorage.getItem(MEMBER_DOCS_KEY);
     if (stored) {
       const docStorage = JSON.parse(stored);
       return docStorage[fileDataOrRef] || null;
     }
   } catch (e) {
     console.error('Failed to retrieve document:', e);
   }
   return null;
 };
 
 const MemberDocumentsPage: React.FC = () => {
   const { manager } = useManagerSession();
   const navigate = useNavigate();
   const [searchParams] = useSearchParams();
   const memberId = searchParams.get('memberId');
   const [member, setMember] = useState<TeamMember | null>(null);
   const [uploading, setUploading] = useState<string | null>(null);
 
   useEffect(() => {
     if (memberId) {
       const found = teamMemberStore.getById(memberId);
       setMember(found || null);
     }
   }, [memberId]);
 
   const handleFileUpload = async (docType: string, file: File) => {
     if (!member) return;
     
     // Validate file size (2MB limit)
     if (file.size > 2 * 1024 * 1024) {
       toast.error('File size must be less than 2MB');
       return;
     }
     
     setUploading(docType);
     
     try {
       const reader = new FileReader();
       reader.onload = (e) => {
         const base64 = e.target?.result as string;
         const docId = `mbr-doc-${member.id}-${docType}-${Date.now()}`;
         
         // Store in dedicated storage
         if (!storeDocument(docId, base64)) {
           toast.error('Storage limit reached. Please delete some documents first.');
           setUploading(null);
           return;
         }
         
         // Update member with document reference
         const existingDocs = member.documents || [];
         const filteredDocs = existingDocs.filter(d => d.type !== docType);
         const newDocs = [
           ...filteredDocs,
           {
             type: docType,
             fileName: file.name,
             fileData: docId,
             uploadedAt: new Date().toISOString(),
             status: 'Pending' as const,
           }
         ];
         
         teamMemberStore.update(member.id, { documents: newDocs });
         setMember({ ...member, documents: newDocs });
         toast.success(`${docType} uploaded successfully`);
         setUploading(null);
       };
       reader.readAsDataURL(file);
     } catch (error) {
       toast.error('Failed to upload file');
       setUploading(null);
     }
   };
 
   const handleDeleteDoc = (docType: string) => {
     if (!member) return;
     const existingDocs = member.documents || [];
     const newDocs = existingDocs.filter(d => d.type !== docType);
     teamMemberStore.update(member.id, { documents: newDocs });
     setMember({ ...member, documents: newDocs });
     toast.success('Document removed');
   };
 
   const getDocStatus = (docType: string) => {
     const doc = member?.documents?.find(d => d.type === docType);
     return doc || null;
   };
 
   const getStatusBadge = (status: string) => {
     switch (status) {
       case 'Verified':
        return <Badge className="bg-status-success-bg text-status-success"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
       case 'Rejected':
        return <Badge className="bg-status-error-bg text-status-error"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
       default:
        return <Badge className="bg-status-warning-bg text-status-warning"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
     }
   };
 
   if (!member) {
     return (
       <div className="space-y-6">
         <Button variant="ghost" onClick={() => navigate(-1)}>
           <ArrowLeft className="h-4 w-4 mr-2" />
           Back
         </Button>
         <Card className="p-8 text-center">
           <p className="text-muted-foreground">Team member not found.</p>
         </Card>
       </div>
     );
   }
 
   return (
     <div className="space-y-6">
       <div className="flex items-center gap-4">
         <Button variant="ghost" onClick={() => navigate(-1)}>
           <ArrowLeft className="h-4 w-4 mr-2" />
           Back
         </Button>
         <div>
           <h1 className="text-2xl font-bold">{member.firstName} {member.lastName}</h1>
           <p className="text-muted-foreground">{member.role} • {member.sportCategory}</p>
         </div>
       </div>
 
       <Card>
         <CardHeader>
           <CardTitle>Documents</CardTitle>
           <CardDescription>
             Upload required documents for this team member. Max file size: 2MB.
           </CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
           {REQUIRED_DOCS.map(doc => {
             const uploadedDoc = getDocStatus(doc.type);
             
             return (
               <div key={doc.type} className="flex items-center justify-between p-4 border rounded-lg">
                 <div className="flex items-center gap-3">
                   <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                     <FileText className="h-5 w-5 text-muted-foreground" />
                   </div>
                   <div>
                     <p className="font-medium">{doc.label}</p>
                     {uploadedDoc ? (
                       <p className="text-xs text-muted-foreground">{uploadedDoc.fileName}</p>
                     ) : (
                       <p className="text-xs text-muted-foreground">Not uploaded</p>
                     )}
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-2">
                   {uploadedDoc && getStatusBadge(uploadedDoc.status)}
                   
                   {uploadedDoc && (
                     <>
                       <Button
                         size="sm"
                         variant="ghost"
                         onClick={() => {
                           const data = getDocumentData(uploadedDoc.fileData);
                           if (data) {
                             window.open(data, '_blank');
                           } else {
                             toast.error('Document not found');
                           }
                         }}
                       >
                         <Eye className="h-4 w-4" />
                       </Button>
                       <Button
                         size="sm"
                         variant="ghost"
                        className="text-destructive"
                         onClick={() => handleDeleteDoc(doc.type)}
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     </>
                   )}
                   
                   <Label className="cursor-pointer">
                     <Input
                       type="file"
                       className="hidden"
                       accept="image/*,.pdf"
                       onChange={(e) => {
                         const file = e.target.files?.[0];
                         if (file) handleFileUpload(doc.type, file);
                       }}
                       disabled={uploading === doc.type}
                     />
                     <Button
                       size="sm"
                       variant="outline"
                       className="pointer-events-none"
                       disabled={uploading === doc.type}
                     >
                       {uploading === doc.type ? (
                         'Uploading...'
                       ) : (
                         <>
                           <Upload className="h-4 w-4 mr-1" />
                           {uploadedDoc ? 'Replace' : 'Upload'}
                         </>
                       )}
                     </Button>
                   </Label>
                 </div>
               </div>
             );
           })}
         </CardContent>
       </Card>
 
       {/* Member Info Summary */}
       <Card>
         <CardHeader>
           <CardTitle>Member Information</CardTitle>
         </CardHeader>
         <CardContent>
           <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
             <div>
               <p className="text-muted-foreground">Email</p>
               <p className="font-medium">{member.email}</p>
             </div>
             <div>
               <p className="text-muted-foreground">Nationality</p>
               <p className="font-medium">{member.nationality}</p>
             </div>
             <div>
               <p className="text-muted-foreground">Passport</p>
               <p className="font-medium">{member.passportNumber}</p>
             </div>
             <div>
               <p className="text-muted-foreground">Date of Birth</p>
               <p className="font-medium">{new Date(member.dateOfBirth).toLocaleDateString()}</p>
             </div>
             <div>
               <p className="text-muted-foreground">Gender</p>
               <p className="font-medium">{member.gender}</p>
             </div>
             <div>
               <p className="text-muted-foreground">Emergency Contact</p>
               <p className="font-medium">{member.emergencyContact || 'Not provided'}</p>
             </div>
           </div>
         </CardContent>
       </Card>
     </div>
   );
 };
 
 export default MemberDocumentsPage;