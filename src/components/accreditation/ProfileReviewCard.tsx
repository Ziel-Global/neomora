import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { CategoryBadge } from './CategoryBadge';
import { AccreditationProfile, AccreditationCategory, accreditationCategories } from '@/data/accreditationData';
import { Check, X, Shield, Eye, User, Building, Globe, FileText } from 'lucide-react';

// Helper to retrieve document file data from dedicated storage
const REG_DOCS_KEY = 'ems_registration_documents';
const getPhotoUrl = (photo: string | undefined): string | null => {
  if (!photo) return null;
  // If it starts with data:image, it's already base64
  if (photo.startsWith('data:image')) return photo;
  // Otherwise, it's a docId reference - retrieve from storage
  try {
    const stored = localStorage.getItem(REG_DOCS_KEY);
    if (!stored) return null;
    const docs = JSON.parse(stored);
    return docs[photo] || null;
  } catch {
    return null;
  }
};

interface ProfileReviewCardProps {
  profile: AccreditationProfile;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onSecurityCheck: (id: string) => void;
  onSecurityCheckPass?: (id: string) => void;
  onSecurityCheckFail?: (id: string) => void;
  onView: (id: string) => void;
}

export const ProfileReviewCard: React.FC<ProfileReviewCardProps> = ({
  profile,
  onApprove,
  onReject,
  onSecurityCheck,
  onSecurityCheckPass,
  onSecurityCheckFail,
  onView,
}) => {
  const category = accreditationCategories.find(c => c.id === profile.categoryId);
  
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

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
              {getPhotoUrl(profile.profileData.photo) ? (
                <img 
                  src={getPhotoUrl(profile.profileData.photo)!} 
                  alt="Profile" 
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <User className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <CardTitle className="text-base">
                {profile.profileData.firstName} {profile.profileData.lastName}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{profile.profileData.organization}</p>
            </div>
          </div>
          <StatusBadge status={profile.status} variant={getStatusVariant(profile.status)} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category */}
        {category && <CategoryBadge category={category} size="sm" />}

        {/* Profile Details */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Globe className="h-3.5 w-3.5" />
            <span>{profile.profileData.nationality}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building className="h-3.5 w-3.5" />
            <span>{profile.profileData.role}</span>
          </div>
          {profile.profileData.passportNumber && (
            <div className="flex items-center gap-2 text-muted-foreground col-span-2">
              <FileText className="h-3.5 w-3.5" />
              <span>Passport: {profile.profileData.passportNumber}</span>
            </div>
          )}
        </div>

        {/* Security Check Status */}
        {profile.securityCheck.required && (
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="text-sm">Security Check</span>
            </div>
            <StatusBadge 
              status={profile.securityCheck.status} 
              variant={getSecurityStatusVariant(profile.securityCheck.status)} 
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onView(profile.id)}>
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          
          {profile.status === 'Security Check' && profile.securityCheck.status === 'Pending' ? (
            <>
              <Button 
                variant="default" 
                size="sm" 
                className="flex-1"
                onClick={() => onSecurityCheckPass?.(profile.id)}
              >
                <Check className="h-4 w-4 mr-1" />
                Pass
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => onSecurityCheckFail?.(profile.id)}
              >
                <X className="h-4 w-4" />
                Fail
              </Button>
            </>
          ) : profile.status === 'Pending Review' && (
            <>
              {profile.securityCheck.required && profile.securityCheck.status === 'Not Required' ? (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => onSecurityCheck(profile.id)}
                >
                  <Shield className="h-4 w-4 mr-1" />
                  Security
                </Button>
              ) : (
                <>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => onApprove(profile.id)}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => onReject(profile.id, 'Profile rejected')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
