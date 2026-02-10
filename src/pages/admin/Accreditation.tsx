import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatsCard } from '@/components/common/StatsCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { CategoryBadge } from '@/components/accreditation/CategoryBadge';
import { ProfileReviewCard } from '@/components/accreditation/ProfileReviewCard';
import { BadgePreviewCard } from '@/components/accreditation/BadgePreviewCard';
import { AccessMatrixTable } from '@/components/accreditation/AccessMatrixTable';
import { DistributionPlanCard } from '@/components/accreditation/DistributionPlanCard';
import {
  accreditationCategories,
  accessZoneDefinitions,
  collectionPoints,
  roleToCategoryMap,
  generateQRCode,
  generateBadgeNumber,
  AccreditationProfile,
  BadgeRecord,
  AccreditationCategory,
  BadgeProductionStatus,
} from '@/data/accreditationData';
import { registrationStore, participantStore, accreditationStore, EMSRegistration, EMSParticipant } from '@/lib/emsStore';
import {
  BadgeCheck, Printer, QrCode, Shield, Search, Eye, Check, Users,
  ClipboardCheck, FileCheck, Truck, Zap, Filter, UserCheck, X,
  Download, RefreshCw, ChevronRight, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

// Helper to retrieve document file data from dedicated storage
const REG_DOCS_KEY = 'ems_registration_documents';
const getDocumentFileData = (docId: string): string | null => {
  try {
    const stored = localStorage.getItem(REG_DOCS_KEY);
    if (!stored) return null;
    const docs = JSON.parse(stored);
    return docs[docId] || null;
  } catch {
    return null;
  }
};

// Helper to get photo URL from profile (handles both docId references and direct base64)
const getPhotoUrl = (photo: string | undefined): string | null => {
  if (!photo) return null;
  // If it starts with data:image, it's already base64
  if (photo.startsWith('data:image')) return photo;
  // Otherwise, it's a docId reference - retrieve from storage
  return getDocumentFileData(photo);
};

const AccreditationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profiles');
  const [profiles, setProfiles] = useState<AccreditationProfile[]>([]);
  const [badges, setBadges] = useState<BadgeRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [previewBadge, setPreviewBadge] = useState<BadgeRecord | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; profileId: string }>({ open: false, profileId: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [viewProfile, setViewProfile] = useState<AccreditationProfile | null>(null);
  const [verifyDialog, setVerifyDialog] = useState<{ open: boolean; badgeId: string }>({ open: false, badgeId: '' });
  const [verificationId, setVerificationId] = useState('');

  // Load data on mount
  useEffect(() => {
    setProfiles(accreditationStore.getProfiles());
    setBadges(accreditationStore.getBadges());
  }, []);

  // Sync profiles from approved registrations
  const syncFromRegistrations = () => {
    try {
      console.log('Syncing registrations...');
      const { count, profiles: newProfiles } = accreditationStore.syncFromRegistrations();

      if (count > 0) {
        setProfiles(newProfiles);
        toast.success(`Synced ${count} new profile(s) from registrations`);
      } else {
        const message = 'No new approved registrations to sync';
        toast.info(message);
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync registrations: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Stats calculations
  const stats = useMemo(() => ({
    pendingReview: profiles.filter(p => p.status === 'Pending Review').length,
    approved: profiles.filter(p => p.status === 'Approved').length,
    securityCheck: profiles.filter(p => p.status === 'Security Check').length,
    badgesReady: badges.filter(b => b.productionStatus === 'Ready').length,
    badgesPrinted: badges.filter(b => b.productionStatus === 'Printed').length,
    collected: badges.filter(b => b.distributionStatus === 'Collected' || b.distributionStatus === 'Activated').length,
    activated: badges.filter(b => b.distributionStatus === 'Activated').length,
  }), [profiles, badges]);

  // Filtered profiles
  const filteredProfiles = useMemo(() => {
    return profiles.filter(profile => {
      const matchesSearch =
        profile.profileData.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.profileData.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.profileData.organization.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || profile.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || profile.categoryId === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [profiles, searchTerm, statusFilter, categoryFilter]);

  // Handlers
  const handleApproveProfile = (profileId: string) => {
    const updatedProfiles = profiles.map(p => {
      if (p.id === profileId) {
        return { ...p, status: 'Approved' as const, reviewedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      }
      return p;
    });
    accreditationStore.saveProfiles(updatedProfiles);
    setProfiles(updatedProfiles);

    // Create badge for approved profile
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
      createBadgeForProfile(profile);
    }

    toast.success('Profile approved and badge queued for production');
  };

  const handleRejectProfile = () => {
    if (!rejectDialog.profileId) return;

    const updatedProfiles = profiles.map(p => {
      if (p.id === rejectDialog.profileId) {
        return {
          ...p,
          status: 'Rejected' as const,
          rejectionReason: rejectReason,
          reviewedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      return p;
    });
    accreditationStore.saveProfiles(updatedProfiles);
    setProfiles(updatedProfiles);
    setRejectDialog({ open: false, profileId: '' });
    setRejectReason('');
    toast.success('Profile rejected');
  };

  const handleSecurityCheck = (profileId: string) => {
    const updatedProfiles = profiles.map(p => {
      if (p.id === profileId) {
        return {
          ...p,
          status: 'Security Check' as const,
          securityCheck: { ...p.securityCheck, status: 'Pending' as const },
          updatedAt: new Date().toISOString()
        };
      }
      return p;
    });
    accreditationStore.saveProfiles(updatedProfiles);
    setProfiles(updatedProfiles);
    toast.info('Profile sent for security check');
  };

  const handleSecurityCheckPass = (profileId: string) => {
    const updatedProfiles = profiles.map(p => {
      if (p.id === profileId) {
        return {
          ...p,
          status: 'Approved' as const,
          securityCheck: {
            ...p.securityCheck,
            status: 'Passed' as const,
            checkedAt: new Date().toISOString(),
            checkedBy: 'Admin'
          },
          reviewedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      return p;
    });
    accreditationStore.saveProfiles(updatedProfiles);
    setProfiles(updatedProfiles);

    // Create badge for approved profile
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
      createBadgeForProfile(profile);
    }

    toast.success('Security check passed - Profile approved and badge queued');
  };

  const handleSecurityCheckFail = (profileId: string) => {
    const updatedProfiles = profiles.map(p => {
      if (p.id === profileId) {
        return {
          ...p,
          status: 'Rejected' as const,
          securityCheck: {
            ...p.securityCheck,
            status: 'Failed' as const,
            checkedAt: new Date().toISOString(),
            checkedBy: 'Admin'
          },
          rejectionReason: 'Failed security check',
          reviewedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      return p;
    });
    accreditationStore.saveProfiles(updatedProfiles);
    setProfiles(updatedProfiles);
    toast.error('Security check failed - Profile rejected');
  };

  const createBadgeForProfile = (profile: AccreditationProfile) => {
    const category = accreditationCategories.find(c => c.id === profile.categoryId);
    if (!category) return;

    const newBadge: BadgeRecord = {
      id: `badge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      profileId: profile.id,
      participantId: profile.participantId,
      qrCode: generateQRCode(),
      badgeNumber: generateBadgeNumber(category.code),
      categoryId: profile.categoryId,
      zoneAccess: category.allowedZones,
      validFrom: new Date().toISOString(),
      validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      productionStatus: 'Queued',
      distributionStatus: 'Not Distributed',
      isDigital: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedBadges = [...badges, newBadge];
    accreditationStore.saveBadges(updatedBadges);
    setBadges(updatedBadges);
  };

  const handleUpdateBadgeStatus = (badgeId: string, newStatus: BadgeProductionStatus) => {
    const updatedBadges = badges.map(b => {
      if (b.id === badgeId) {
        const updates: any = {
          productionStatus: newStatus,
          updatedAt: new Date().toISOString()
        };
        if (newStatus === 'Printed') {
          updates.printedAt = new Date().toISOString();
        }
        if (newStatus === 'Ready') {
          updates.distributionStatus = 'Assigned';
          updates.collectionPoint = b.collectionPoint || 'cp-main';

          // Send notification to participant
          const profile = profiles.find(p => p.id === b.profileId);
          const point = collectionPoints.find(p => p.id === (b.collectionPoint || 'cp-main'));

          if (profile && point) {
            const notifications = JSON.parse(localStorage.getItem('ems_participant_notifications') || '[]');
            notifications.push({
              id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              participantId: profile.participantId,
              type: 'badge_ready',
              title: 'Badge Ready for Collection',
              message: `Your accreditation badge is ready for collection at ${point.name}.`,
              collectionPoint: {
                name: point.name,
                venue: point.venue,
                location: point.location,
                operatingHours: point.operatingHours,
              },
              badgeNumber: b.badgeNumber,
              createdAt: new Date().toISOString(),
              read: false,
            });
            localStorage.setItem('ems_participant_notifications', JSON.stringify(notifications));
          }
        }
        return { ...b, ...updates };
      }
      return b;
    });
    accreditationStore.saveBadges(updatedBadges);
    setBadges(updatedBadges);
    toast.success(newStatus === 'Ready' ? 'Badge ready and participant notified' : 'Badge status updated');
  };

  const handlePrintBadges = (badgeIds: string[]) => {
    const updatedBadges = badges.map(b => {
      if (badgeIds.includes(b.id) && b.productionStatus === 'Queued') {
        return {
          ...b,
          productionStatus: 'Printed' as const,
          printedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      return b;
    });
    accreditationStore.saveBadges(updatedBadges);
    setBadges(updatedBadges);
    setSelectedItems([]);
    toast.success(`${badgeIds.length} badge(s) marked as printed`);
  };

  const handleMarkReady = (badgeIds: string[]) => {
    const updatedBadges = badges.map(b => {
      if (badgeIds.includes(b.id) && b.productionStatus === 'Printed') {
        // Send notification to participant
        const profile = profiles.find(p => p.id === b.profileId);
        const point = collectionPoints.find(p => p.id === (b.collectionPoint || 'cp-main'));

        if (profile && point) {
          // Store notification for participant
          const notifications = JSON.parse(localStorage.getItem('ems_participant_notifications') || '[]');
          notifications.push({
            id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            participantId: profile.participantId,
            type: 'badge_ready',
            title: 'Badge Ready for Collection',
            message: `Your accreditation badge is ready for collection at ${point.name}.`,
            collectionPoint: {
              name: point.name,
              venue: point.venue,
              location: point.location,
              operatingHours: point.operatingHours,
            },
            badgeNumber: b.badgeNumber,
            createdAt: new Date().toISOString(),
            read: false,
          });
          localStorage.setItem('ems_participant_notifications', JSON.stringify(notifications));
        }

        return {
          ...b,
          productionStatus: 'Ready' as const,
          distributionStatus: 'Assigned' as const,
          collectionPoint: b.collectionPoint || 'cp-main',
          updatedAt: new Date().toISOString()
        };
      }
      return b;
    });
    accreditationStore.saveBadges(updatedBadges);
    setBadges(updatedBadges);
    setSelectedItems([]);
    toast.success(`${badgeIds.length} badge(s) ready for distribution`);
  };

  const handleVerifyAndCollect = () => {
    if (!verifyDialog.badgeId || !verificationId.trim()) {
      toast.error('Please enter ID/Passport number');
      return;
    }

    const badge = badges.find(b => b.id === verifyDialog.badgeId);
    const profile = badge ? profiles.find(p => p.id === badge.profileId) : null;

    if (!profile) {
      toast.error('Profile not found');
      return;
    }

    // Verify ID matches
    const storedId = profile.profileData.passportNumber?.toLowerCase().trim();
    const enteredId = verificationId.toLowerCase().trim();

    if (storedId && storedId !== enteredId) {
      toast.error('ID verification failed. Number does not match.');
      return;
    }

    // Collect badge
    const updatedBadges = badges.map(b => {
      if (b.id === verifyDialog.badgeId) {
        return {
          ...b,
          distributionStatus: 'Collected' as const,
          collectedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      return b;
    });
    accreditationStore.saveBadges(updatedBadges);
    setBadges(updatedBadges);
    setVerifyDialog({ open: false, badgeId: '' });
    setVerificationId('');
    toast.success('Identity verified and badge collected');
  };

  const handleCollectBadge = (badgeId: string) => {
    // Open verification dialog instead of direct collection
    setVerifyDialog({ open: true, badgeId });
  };

  const handleActivateBadge = (badgeId: string) => {
    const updatedBadges = badges.map(b => {
      if (b.id === badgeId) {
        return {
          ...b,
          distributionStatus: 'Activated' as const,
          activatedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      return b;
    });
    accreditationStore.saveBadges(updatedBadges);
    setBadges(updatedBadges);
    toast.success('Badge activated in access control system');
  };

  const getProfile = (profileId: string) => profiles.find(p => p.id === profileId);
  const getParticipant = (participantId: string) => participantStore.getById(participantId);

  const getProductionStatusVariant = (status: string) => {
    switch (status) {
      case 'Ready': return 'success';
      case 'Printed': return 'info';
      case 'Queued': return 'warning';
      case 'Printing': return 'warning';
      default: return 'default';
    }
  };

  const getDistributionStatusVariant = (status: string) => {
    switch (status) {
      case 'Activated': return 'success';
      case 'Collected': return 'info';
      case 'Assigned': return 'warning';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accreditation"
        description="Manage accreditation categories, profile validation, badge production & distribution"
        actions={
          <Button onClick={syncFromRegistrations}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync from Registrations
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <StatsCard title="Pending Review" value={stats.pendingReview} icon={ClipboardCheck} />
        <StatsCard title="Security Check" value={stats.securityCheck} icon={Shield} />
        <StatsCard title="Approved" value={stats.approved} icon={UserCheck} trend={{ value: stats.approved, isPositive: true }} />
        <StatsCard title="Queued" value={badges.filter(b => b.productionStatus === 'Queued').length} icon={Printer} />
        <StatsCard title="Printed" value={stats.badgesPrinted} icon={BadgeCheck} />
        <StatsCard title="Ready" value={stats.badgesReady} icon={FileCheck} />
        <StatsCard title="Activated" value={stats.activated} icon={Zap} />
      </div>

      {/* Info Banner */}
      {profiles.length === 0 && (
        <Card className="border-info bg-info/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-info mt-0.5" />
              <div>
                <p className="font-medium">No profiles synced yet</p>
                <p className="text-sm text-muted-foreground">
                  Click "Sync from Registrations" to import approved registrations. Profile data (photos, passport details, roles)
                  will be automatically integrated from the Registration module.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="profiles">Profile Review</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="matrix">Access Matrix</TabsTrigger>
          <TabsTrigger value="production">Badge Production</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="activation">Activation</TabsTrigger>
        </TabsList>

        {/* Profile Review Tab */}
        <TabsContent value="profiles" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or organization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pending Review">Pending Review</SelectItem>
                <SelectItem value="Security Check">Security Check</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {accreditationCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.code} - {cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredProfiles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No profiles found matching your criteria</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProfiles.map(profile => (
                <ProfileReviewCard
                  key={profile.id}
                  profile={profile}
                  onApprove={handleApproveProfile}
                  onReject={(id, reason) => setRejectDialog({ open: true, profileId: id })}
                  onSecurityCheck={handleSecurityCheck}
                  onSecurityCheckPass={handleSecurityCheckPass}
                  onSecurityCheckFail={handleSecurityCheckFail}
                  onView={(id) => {
                    const prof = profiles.find(p => p.id === id);
                    if (prof) {
                      // If approved, show badge. Otherwise show profile details
                      if (prof.status === 'Approved') {
                        const badge = badges.find(b => b.profileId === id);
                        if (badge) {
                          setPreviewBadge(badge);
                        } else {
                          setViewProfile(prof);
                        }
                      } else {
                        setViewProfile(prof);
                      }
                    }
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {accreditationCategories.map(cat => (
              <Card key={cat.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-bold"
                      style={{ backgroundColor: cat.color, color: cat.textColor }}
                    >
                      {cat.code}
                    </div>
                    <div>
                      <CardTitle className="text-base">{cat.name}</CardTitle>
                      <CardDescription className="text-xs">Priority: {cat.priority}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{cat.description}</p>
                  <div>
                    <Label className="text-xs text-muted-foreground">Zone Access</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {cat.allowedZones.slice(0, 4).map((zone, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{zone}</Badge>
                      ))}
                      {cat.allowedZones.length > 4 && (
                        <Badge variant="outline" className="text-xs">+{cat.allowedZones.length - 4}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Profiles: </span>
                    <span className="font-medium">{profiles.filter(p => p.categoryId === cat.id).length}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Access Matrix Tab */}
        <TabsContent value="matrix" className="mt-4">
          <AccessMatrixTable />
        </TabsContent>

        {/* Badge Production Tab */}
        <TabsContent value="production" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium">Production Queue</h3>
              <p className="text-sm text-muted-foreground">
                {badges.filter(b => b.productionStatus === 'Queued').length} badges queued for printing
              </p>
            </div>
            <div className="flex gap-2">
              {selectedItems.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handlePrintBadges(selectedItems)}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print ({selectedItems.length})
                  </Button>
                  <Button
                    onClick={() => handleMarkReady(selectedItems)}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Mark Ready ({selectedItems.length})
                  </Button>
                </>
              )}
            </div>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Badge #</TableHead>
                  <TableHead>Production</TableHead>
                  <TableHead>Distribution</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {badges.map((badge) => {
                  const profile = getProfile(badge.profileId);
                  const category = accreditationCategories.find(c => c.id === badge.categoryId);
                  return (
                    <TableRow key={badge.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.includes(badge.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedItems([...selectedItems, badge.id]);
                            } else {
                              setSelectedItems(selectedItems.filter(id => id !== badge.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {profile?.profileData.firstName} {profile?.profileData.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">{profile?.profileData.organization}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {category && <CategoryBadge category={category} size="sm" />}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{badge.badgeNumber}</code>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={badge.productionStatus} variant={getProductionStatusVariant(badge.productionStatus)} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={badge.distributionStatus} variant={getDistributionStatusVariant(badge.distributionStatus)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={badge.productionStatus}
                            onValueChange={(value) => handleUpdateBadgeStatus(badge.id, value as BadgeProductionStatus)}
                            disabled={badge.productionStatus === 'Ready' || badge.distributionStatus !== 'Not Distributed'}
                          >
                            <SelectTrigger className="h-8 w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Queued">Queued</SelectItem>
                              <SelectItem value="Printing">Printing</SelectItem>
                              <SelectItem value="Printed">Printed</SelectItem>
                              <SelectItem value="Quality Check">Quality Check</SelectItem>
                              <SelectItem value="Ready">Ready</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="sm" onClick={() => setPreviewBadge(badge)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {badges.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No badges in production queue. Approve profiles to generate badges.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="mt-4">
          <DistributionPlanCard
            badges={badges}
            profiles={profiles}
            onAssignCollection={(badgeId, pointId) => {
              const updatedBadges = badges.map(b => {
                if (b.id === badgeId) {
                  return { ...b, collectionPoint: pointId, distributionStatus: 'Assigned' as const, updatedAt: new Date().toISOString() };
                }
                return b;
              });
              accreditationStore.saveBadges(updatedBadges);
              setBadges(updatedBadges);
            }}
            onAutoAssign={(assignments) => {
              const updatedBadges = badges.map(b => {
                const assignment = assignments.find(a => a.badgeId === b.id);
                if (assignment) {
                  return {
                    ...b,
                    collectionPoint: assignment.pointId,
                    distributionStatus: 'Assigned' as const,
                    updatedAt: new Date().toISOString()
                  };
                }
                return b;
              });
              accreditationStore.saveBadges(updatedBadges);
              setBadges(updatedBadges);
              toast.success(`${assignments.length} badge(s) auto-assigned to collection points`);
            }}
          />
        </TabsContent>

        {/* Activation Tab */}
        <TabsContent value="activation" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Badge Collection & Activation</CardTitle>
              <CardDescription>
                Verify identity, hand over badge, and activate in access control system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Participant</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Badge #</TableHead>
                    <TableHead>Collection Point</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {badges.filter(b => b.productionStatus === 'Ready' || b.distributionStatus === 'Collected').map((badge) => {
                    const profile = getProfile(badge.profileId);
                    const category = accreditationCategories.find(c => c.id === badge.categoryId);
                    const point = collectionPoints.find(p => p.id === badge.collectionPoint);

                    return (
                      <TableRow key={badge.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                              {getPhotoUrl(profile?.profileData.photo) ? (
                                <img
                                  src={getPhotoUrl(profile?.profileData.photo)!}
                                  alt=""
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <span className="font-medium">
                                  {profile?.profileData.firstName?.charAt(0)}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-medium">
                                {profile?.profileData.firstName} {profile?.profileData.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {profile?.profileData.passportNumber || 'No passport'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {category && <CategoryBadge category={category} size="sm" />}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{badge.badgeNumber}</code>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{point?.name || 'Not assigned'}</span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={badge.distributionStatus}
                            variant={getDistributionStatusVariant(badge.distributionStatus)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {badge.distributionStatus === 'Assigned' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCollectBadge(badge.id)}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Collect
                              </Button>
                            )}
                            {badge.distributionStatus === 'Collected' && (
                              <Button
                                size="sm"
                                onClick={() => handleActivateBadge(badge.id)}
                              >
                                <Zap className="h-4 w-4 mr-1" />
                                Activate
                              </Button>
                            )}
                            {badge.distributionStatus === 'Activated' && (
                              <Badge variant="outline" className="text-success border-success">
                                <Check className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {badges.filter(b => b.productionStatus === 'Ready' || b.distributionStatus === 'Collected').length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No badges ready for collection or activation
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Badge Preview Dialog */}
      <Dialog open={!!previewBadge} onOpenChange={() => setPreviewBadge(null)}>
        <DialogContent className="max-w-sm">
          {previewBadge && (() => {
            const profile = getProfile(previewBadge.profileId);
            const category = accreditationCategories.find(c => c.id === previewBadge.categoryId);
            if (!profile || !category) return null;

            return (
              <>
                <DialogHeader>
                  <DialogTitle>Badge Preview</DialogTitle>
                </DialogHeader>
                <div className="flex justify-center py-4">
                  <BadgePreviewCard
                    badge={previewBadge}
                    category={category}
                    participantName={`${profile.profileData.firstName} ${profile.profileData.lastName}`}
                    organization={profile.profileData.organization}
                    photo={getPhotoUrl(profile.profileData.photo)}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPreviewBadge(null)}>Close</Button>
                  <Button>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ open, profileId: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rejection Reason</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, profileId: '' })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectProfile}>
              Reject Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile View Dialog */}
      <Dialog open={!!viewProfile} onOpenChange={() => setViewProfile(null)}>
        <DialogContent className="max-w-2xl">
          {viewProfile && (() => {
            const category = accreditationCategories.find(c => c.id === viewProfile.categoryId);
            const participant = participantStore.getById(viewProfile.participantId);

            return (
              <>
                <DialogHeader>
                  <DialogTitle>Profile Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                      {getPhotoUrl(viewProfile.profileData.photo) ? (
                        <img
                          src={getPhotoUrl(viewProfile.profileData.photo)!}
                          alt="Profile"
                          className="w-24 h-24 object-cover"
                        />
                      ) : (
                        <Users className="h-12 w-12 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Full Name</Label>
                        <p className="font-semibold text-lg">
                          {viewProfile.profileData.firstName} {viewProfile.profileData.lastName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Status:</Label>
                        <StatusBadge status={viewProfile.status} variant={getStatusVariant(viewProfile.status)} />
                      </div>
                      {category && <CategoryBadge category={category} size="sm" />}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Organization</Label>
                      <p className="font-medium">{viewProfile.profileData.organization}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Role</Label>
                      <p className="font-medium">{viewProfile.profileData.role}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Nationality</Label>
                      <p className="font-medium">{viewProfile.profileData.nationality}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Passport/ID Number</Label>
                      <p className="font-medium">{viewProfile.profileData.passportNumber || 'N/A'}</p>
                    </div>
                  </div>

                  {participant && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <p className="text-sm">{participant.email}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Phone</Label>
                        <p className="text-sm">{participant.phone}</p>
                      </div>
                    </div>
                  )}

                  {viewProfile.securityCheck.required && (
                    <Card className="bg-muted/50">
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            <span className="font-medium text-sm">Security Check</span>
                          </div>
                          <StatusBadge
                            status={viewProfile.securityCheck.status}
                            variant={getSecurityStatusVariant(viewProfile.securityCheck.status)}
                          />
                        </div>
                        {viewProfile.securityCheck.notes && (
                          <p className="text-xs text-muted-foreground mt-2">{viewProfile.securityCheck.notes}</p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {category && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Zone Access</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {category.allowedZones.map((zone, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{zone}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewProfile.rejectionReason && (
                    <Card className="bg-destructive/10 border-destructive/20">
                      <CardContent className="py-3">
                        <Label className="text-xs text-destructive">Rejection Reason</Label>
                        <p className="text-sm mt-1">{viewProfile.rejectionReason}</p>
                      </CardContent>
                    </Card>
                  )}

                  <div className="text-xs text-muted-foreground">
                    <p>Created: {new Date(viewProfile.createdAt).toLocaleString()}</p>
                    <p>Updated: {new Date(viewProfile.updatedAt).toLocaleString()}</p>
                    {viewProfile.reviewedAt && (
                      <p>Reviewed: {new Date(viewProfile.reviewedAt).toLocaleString()}</p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setViewProfile(null)}>Close</Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Identity Verification Dialog */}
      <Dialog open={verifyDialog.open} onOpenChange={(open) => {
        if (!open) {
          setVerifyDialog({ open: false, badgeId: '' });
          setVerificationId('');
        }
      }}>
        <DialogContent>
          {(() => {
            const badge = badges.find(b => b.id === verifyDialog.badgeId);
            const profile = badge ? profiles.find(p => p.id === badge.profileId) : null;

            return (
              <>
                <DialogHeader>
                  <DialogTitle>Verify Identity & Collect Badge</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {profile && (
                    <Card className="bg-muted/50">
                      <CardContent className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center overflow-hidden">
                            {getPhotoUrl(profile.profileData.photo) ? (
                              <img
                                src={getPhotoUrl(profile.profileData.photo)!}
                                alt=""
                                className="w-12 h-12 object-cover"
                              />
                            ) : (
                              <Users className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold">
                              {profile.profileData.firstName} {profile.profileData.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {profile.profileData.organization}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="space-y-2">
                    <Label>Enter Passport/ID Number</Label>
                    <Input
                      type="text"
                      placeholder="Enter ID to verify identity..."
                      value={verificationId}
                      onChange={(e) => setVerificationId(e.target.value)}
                      className="font-mono"
                    />
                    {profile?.profileData.passportNumber && (
                      <p className="text-xs text-muted-foreground">
                        Verify against provided ID: {profile.profileData.passportNumber.substring(0, 3)}***
                      </p>
                    )}
                  </div>

                  <Card className="border-warning bg-warning/5">
                    <CardContent className="py-3">
                      <div className="flex items-start gap-2">
                        <Shield className="h-4 w-4 text-warning mt-0.5" />
                        <div className="text-xs text-muted-foreground">
                          <p className="font-medium text-foreground mb-1">Identity Verification Required</p>
                          <ul className="list-disc list-inside space-y-0.5">
                            <li>Check participant's physical ID document</li>
                            <li>Verify photo matches the person</li>
                            <li>Enter exact ID number to confirm</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setVerifyDialog({ open: false, badgeId: '' });
                      setVerificationId('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleVerifyAndCollect}>
                    <Check className="h-4 w-4 mr-2" />
                    Verify & Collect
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'Approved': return 'success';
    case 'Rejected': return 'destructive';
    case 'Security Check': return 'warning';
    case 'Under Review': return 'info';
    default: return 'default';
  }
};

const getSecurityStatusVariant = (status: string) => {
  switch (status) {
    case 'Passed': return 'success';
    case 'Failed': return 'destructive';
    case 'Pending': return 'warning';
    default: return 'default';
  }
};

export default AccreditationPage;
