 import React, { useState, useEffect, useRef } from 'react';
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
 import { Input } from '@/components/ui/input';
 import { useManagerSession } from '@/contexts/ManagerSessionContext';
 import { teamMemberStore, teamStore, TeamMember } from '@/lib/teamStore';
 import { TeamDelegationSelector } from '@/components/manager/TeamDelegationSelector';
 import { visaStore, participantStore } from '@/lib/emsStore';
 import { 
   FileCheck2, Upload, Eye, Search, Globe, Clock, CheckCircle, XCircle, 
   AlertCircle, FileText, Image 
 } from 'lucide-react';
 import { toast } from 'sonner';
 import { StatusBadge } from '@/components/common/StatusBadge';
 
 // Storage key for visa documents
 const VISA_DOCS_KEY = 'ems_visa_documents';
 
 const storeDocumentFile = (docId: string, fileData: string): boolean => {
   try {
     const docs = JSON.parse(localStorage.getItem(VISA_DOCS_KEY) || '{}');
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
   try {
     const docs = JSON.parse(localStorage.getItem(VISA_DOCS_KEY) || '{}');
     return docs[docId] || null;
   } catch {
     return null;
   }
 };
 
 const ManagerVisaPage: React.FC = () => {
   const { manager } = useManagerSession();
   const [selectedDelegationId, setSelectedDelegationId] = useState<string | null>(null);
   const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
   const [searchTerm, setSearchTerm] = useState('');
   const [members, setMembers] = useState<TeamMember[]>([]);
   const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
   const [uploading, setUploading] = useState<string | null>(null);
   const [activeDocType, setActiveDocType] = useState<string | null>(null);
   const [viewingDoc, setViewingDoc] = useState<{ type: string; fileName: string; data: string } | null>(null);
   const fileInputRef = useRef<HTMLInputElement>(null);
 
   useEffect(() => {
     if (manager) {
       let allMembers = teamMemberStore.getByManager(manager.id);
       
       // Filter by team if selected
       if (selectedTeamId) {
         allMembers = allMembers.filter(m => m.teamId === selectedTeamId);
       }
       
       // Filter by search
       if (searchTerm) {
         allMembers = allMembers.filter(m => 
           m.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           m.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           m.nationality.toLowerCase().includes(searchTerm.toLowerCase())
         );
       }
       
       setMembers(allMembers);
     }
   }, [manager, selectedDelegationId, selectedTeamId, searchTerm]);
 
   const getVisaStatus = (member: TeamMember) => {
     // Check if member is registered and has a participant record
     const participant = participantStore.getAll().find(p => p.email === member.email);
     if (participant) {
       const visa = visaStore.getByParticipant(participant.id);
       return visa;
     }
     return null;
   };
 
   const getTeamName = (teamId: string) => {
     return teamStore.getById(teamId)?.name || 'Unknown Team';
   };
 
   const handleFileUpload = (docType: string) => {
     setActiveDocType(docType);
     fileInputRef.current?.click();
   };
 
   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
     const file = event.target.files?.[0];
     if (!file || !selectedMember || !activeDocType) return;
 
     if (file.size > 2 * 1024 * 1024) {
       toast.error('File too large. Maximum 2MB allowed.');
       setActiveDocType(null);
       if (fileInputRef.current) fileInputRef.current.value = '';
       return;
     }
 
     const docType = activeDocType;
     setUploading(docType);
 
     const reader = new FileReader();
     reader.onloadend = () => {
       const base64String = reader.result as string;
       
       // Get participant for this member
       const participant = participantStore.getAll().find(p => p.email === selectedMember.email);
       if (!participant) {
         toast.error('Member must be registered first before uploading visa documents');
         setUploading(null);
         setActiveDocType(null);
         return;
       }
       
       // Get or create visa application
       let visaApp = visaStore.getByParticipant(participant.id);
       if (!visaApp) {
         visaApp = visaStore.checkRequirement(participant.id);
       }
       
       if (!visaApp) {
         toast.error('Could not create visa application');
         setUploading(null);
         setActiveDocType(null);
         return;
       }
       
       // Store file
       const docId = `${visaApp.id}-${docType.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;
       if (!storeDocumentFile(docId, base64String)) {
         setUploading(null);
         setActiveDocType(null);
         return;
       }
       
       // Add document to visa application
       const newDoc = {
         type: docType,
         fileName: file.name,
         fileData: docId,
         uploadedAt: new Date().toISOString(),
         status: 'Pending' as const,
       };
       
       visaStore.addDocument(visaApp.id, newDoc);
       toast.success(`${docType} uploaded successfully`);
       setUploading(null);
       setActiveDocType(null);
       if (fileInputRef.current) fileInputRef.current.value = '';
     };
     reader.onerror = () => {
       toast.error('Failed to read file');
       setUploading(null);
       setActiveDocType(null);
     };
     reader.readAsDataURL(file);
   };
 
   const handleViewDocument = (doc: { type: string; fileName: string; fileData?: string }) => {
     if (!doc.fileData) {
       toast.error('Document not found');
       return;
     }
     
     let fileData = getDocumentFile(doc.fileData);
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
 
   const isImageFile = (fileName: string) => {
     return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
   };
 
   if (!manager) return null;
 
   return (
     <div className="space-y-6">
       <div>
         <h1 className="text-2xl font-bold">Team Visa Management</h1>
         <p className="text-muted-foreground">Upload visa documents for your team members.</p>
       </div>
 
       {/* Filters */}
       <Card>
         <CardContent className="pt-6">
           <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
             <TeamDelegationSelector
               selectedDelegationId={selectedDelegationId}
               selectedTeamId={selectedTeamId}
               onDelegationChange={setSelectedDelegationId}
               onTeamChange={setSelectedTeamId}
             />
             <div className="relative w-full md:w-64">
               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input
                 placeholder="Search members..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="pl-10"
               />
             </div>
           </div>
         </CardContent>
       </Card>
 
       {/* Members List */}
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <Globe className="h-5 w-5" />
             Team Members Visa Status ({members.length})
           </CardTitle>
         </CardHeader>
         <CardContent className="p-0">
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Member</TableHead>
                 <TableHead>Team</TableHead>
                 <TableHead>Nationality</TableHead>
                 <TableHead>Visa Status</TableHead>
                 <TableHead>Documents</TableHead>
                 <TableHead>Actions</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {members.length === 0 ? (
                 <TableRow>
                   <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                     No team members found
                   </TableCell>
                 </TableRow>
               ) : (
                 members.map((member) => {
                   const visa = getVisaStatus(member);
                   const uploadedCount = visa?.uploadedDocuments.length || 0;
                   const requiredCount = visa?.requiredDocuments.length || 0;
                   
                   return (
                     <TableRow key={member.id}>
                       <TableCell>
                         <div>
                           <p className="font-medium">{member.firstName} {member.lastName}</p>
                           <p className="text-sm text-muted-foreground">{member.role}</p>
                         </div>
                       </TableCell>
                       <TableCell>
                         <Badge variant="outline">{getTeamName(member.teamId)}</Badge>
                       </TableCell>
                       <TableCell>{member.nationality}</TableCell>
                       <TableCell>
                         {visa ? (
                           <StatusBadge status={visa.status} />
                         ) : (
                           <Badge variant="secondary">Not Registered</Badge>
                         )}
                       </TableCell>
                       <TableCell>
                         {visa ? (
                           <div className="flex items-center gap-2">
                             <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                               <div 
                                 className="h-full bg-primary transition-all"
                                 style={{ width: `${(uploadedCount / Math.max(requiredCount, 1)) * 100}%` }}
                               />
                             </div>
                             <span className="text-xs text-muted-foreground">{uploadedCount}/{requiredCount}</span>
                           </div>
                         ) : (
                           <span className="text-muted-foreground">—</span>
                         )}
                       </TableCell>
                       <TableCell>
                         <Button 
                           variant="outline" 
                           size="sm"
                           onClick={() => setSelectedMember(member)}
                           disabled={!visa}
                         >
                           <Upload className="h-4 w-4 mr-1" />
                           Manage
                         </Button>
                       </TableCell>
                     </TableRow>
                   );
                 })
               )}
             </TableBody>
           </Table>
         </CardContent>
       </Card>
 
       {/* Document Upload Dialog */}
       <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
         <DialogContent className="max-w-2xl">
           {selectedMember && (
             <>
               <DialogHeader>
                 <DialogTitle>
                   Visa Documents - {selectedMember.firstName} {selectedMember.lastName}
                 </DialogTitle>
               </DialogHeader>
               
               {(() => {
                 const visa = getVisaStatus(selectedMember);
                 if (!visa) return <p className="text-muted-foreground">Member not registered yet</p>;
                 
                 return (
                   <div className="space-y-4">
                     <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                       <Badge variant="outline">{visa.nationality}</Badge>
                       <StatusBadge status={visa.status} />
                     </div>
                     
                     {visa.requiredDocuments.map((docType) => {
                       const uploaded = visa.uploadedDocuments.find(d => d.type === docType);
                       return (
                         <div key={docType} className="flex items-center justify-between p-4 border rounded-lg">
                           <div className="flex items-center gap-3">
                             <FileCheck2 className={`h-5 w-5 ${uploaded ? 'text-primary' : 'text-muted-foreground'}`} />
                             <div>
                               <p className="font-medium">{docType}</p>
                               {uploaded && (
                                 <div className="flex items-center gap-2 mt-1">
                                   <span className="text-xs text-muted-foreground">{uploaded.fileName}</span>
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
                                 <Eye className="h-4 w-4" />
                               </Button>
                             )}
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => handleFileUpload(docType)}
                               disabled={uploading === docType}
                             >
                               {uploading === docType ? 'Uploading...' : (
                                 <>
                                   <Upload className="h-4 w-4 mr-1" />
                                   {uploaded ? 'Replace' : 'Upload'}
                                 </>
                               )}
                             </Button>
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 );
               })()}
             </>
           )}
         </DialogContent>
       </Dialog>
 
       {/* Document Viewer Dialog */}
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
 
       {/* Hidden file input */}
       <input
         type="file"
         ref={fileInputRef}
         className="hidden"
         onChange={handleFileChange}
         accept=".pdf,.jpg,.jpeg,.png"
       />
     </div>
   );
 };
 
 export default ManagerVisaPage;