import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  BadgeCheck, MapPin, Clock, Calendar, AlertCircle, 
  CheckCircle2, Download, Navigation, Phone, Mail,
  Loader2
} from 'lucide-react';
import { accreditationCategories, collectionPoints } from '@/data/accreditationData';
import { useParticipantSession } from '@/contexts/ParticipantSessionContext';

const ParticipantAccreditation: React.FC = () => {
  const { participant } = useParticipantSession();
  const [badgeInfo, setBadgeInfo] = useState<any>(null);
  const [collectionPoint, setCollectionPoint] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBadgeInfo = () => {
      if (!participant?.id) {
        setLoading(false);
        return;
      }
      
      // Load badge details directly from localStorage
      const badges = JSON.parse(localStorage.getItem('ems_accreditation_badges') || '[]');
      const profiles = JSON.parse(localStorage.getItem('ems_accreditation_profiles') || '[]');
      
      const profile = profiles.find((p: any) => p.participantId === participant.id);
      if (profile) {
        const badge = badges.find((b: any) => b.profileId === profile.id);
        if (badge) {
          const category = accreditationCategories.find(c => c.id === badge.categoryId);
          setBadgeInfo({ ...badge, category, profile });
          
          // Get collection point info directly from badge data
          if (badge.collectionPoint) {
            const point = collectionPoints.find(cp => cp.id === badge.collectionPoint);
            setCollectionPoint(point);
          }
        }
      }
      setLoading(false);
    };

    loadBadgeInfo();
    
    // Poll for updates every 5 seconds
    const interval = setInterval(loadBadgeInfo, 5000);
    
    return () => clearInterval(interval);
  }, [participant]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Accreditation"
          description="Your event accreditation and badge information"
        />
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading your accreditation details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!badgeInfo) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Accreditation"
          description="Your event accreditation and badge information"
        />

        <Card>
          <CardContent className="py-12 text-center">
            <BadgeCheck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Badge Information</h3>
            <p className="text-muted-foreground">
              Your accreditation is being processed. You will be notified when your badge is ready for collection.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accreditation"
        description="Your event accreditation and badge collection details"
      />

      {/* Status Alert */}
      {badgeInfo?.productionStatus === 'Ready' && badgeInfo?.distributionStatus === 'Assigned' && collectionPoint && (
        <Alert className="border-success bg-success/10">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <AlertDescription>
            <span className="font-semibold text-success text-base">Your badge is ready for collection!</span>
            <p className="text-sm mt-1.5 text-foreground">
              Please collect your accreditation badge from <strong>{collectionPoint.name}</strong>.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {badgeInfo?.distributionStatus === 'Collected' && (
        <Alert className="border-blue-500 bg-blue-50">
          <BadgeCheck className="h-5 w-5 text-blue-600" />
          <AlertDescription>
            <span className="font-semibold text-blue-800 text-base">Badge Collected</span>
            <p className="text-sm mt-1.5 text-blue-700">
              You have collected your badge on {new Date(badgeInfo.collectedAt).toLocaleString()}. 
              It will be activated when you first enter the venue.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {badgeInfo?.distributionStatus === 'Activated' && (
        <Alert className="border-success bg-success/10">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <AlertDescription>
            <span className="font-semibold text-success text-base">Badge Active</span>
            <p className="text-sm mt-1.5 text-foreground">
              Your accreditation badge was activated on {new Date(badgeInfo.activatedAt).toLocaleString()} and is ready to use at all authorized zones.
            </p>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Badge Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5" />
              Badge Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {badgeInfo?.category && (
              <div className="flex items-center justify-center p-6 rounded-lg" style={{ backgroundColor: badgeInfo.category.color + '15' }}>
                <div className="text-center">
                  <div 
                    className="inline-block px-6 py-3 rounded-lg text-lg font-bold mb-2"
                    style={{ backgroundColor: badgeInfo.category.color, color: badgeInfo.category.textColor }}
                  >
                    {badgeInfo.category.code}
                  </div>
                  <p className="text-sm font-medium">{badgeInfo.category.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{badgeInfo.category.description}</p>
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Badge Number</p>
                <code className="text-base font-mono bg-muted px-3 py-1.5 rounded inline-block mt-1">
                  {badgeInfo?.badgeNumber}
                </code>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">
                  {badgeInfo?.profile?.profileData?.firstName} {badgeInfo?.profile?.profileData?.lastName}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Organization</p>
                <p className="font-medium">{badgeInfo?.profile?.profileData?.organization}</p>
              </div>

              {badgeInfo?.validFrom && (
                <div>
                  <p className="text-sm text-muted-foreground">Valid Period</p>
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(badgeInfo.validFrom).toLocaleDateString()} - {new Date(badgeInfo.validTo).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge 
                  className="mt-1"
                  variant={
                    badgeInfo?.distributionStatus === 'Activated' ? 'default' :
                    badgeInfo?.distributionStatus === 'Collected' ? 'secondary' :
                    'outline'
                  }
                >
                  {badgeInfo?.distributionStatus === 'Activated' ? '✓ Active' :
                   badgeInfo?.distributionStatus === 'Collected' ? 'Collected' :
                   'Ready for Collection'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Collection Point Information - Show when ready or collected */}
        {collectionPoint && badgeInfo?.distributionStatus !== 'Activated' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {badgeInfo?.distributionStatus === 'Collected' ? 'Collection Point (Badge Collected)' : 'Collection Point'}
              </CardTitle>
              <CardDescription>
                {badgeInfo?.distributionStatus === 'Collected' 
                  ? 'You collected your badge from this location'
                  : 'Please visit the location below to collect your badge'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`border-2 rounded-lg p-4 ${
                badgeInfo?.distributionStatus === 'Collected' 
                  ? 'bg-muted/50 border-muted' 
                  : 'bg-primary/5 border-primary/20'
              }`}>
                <h3 className="font-semibold text-lg mb-3">{collectionPoint.name}</h3>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">{collectionPoint.venue}</p>
                      <p className="text-sm text-muted-foreground">{collectionPoint.location}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <p className="font-medium">{collectionPoint.operatingHours}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {badgeInfo?.distributionStatus === 'Collected' ? (
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <div>
                      <p className="font-medium">Badge Collected</p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(badgeInfo.collectedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">What to Bring:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Valid photo ID or passport</li>
                      <li>This notification or badge number</li>
                      <li>Confirmation email (if available)</li>
                    </ul>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1" size="sm">
                      <Navigation className="h-4 w-4 mr-2" />
                      Get Directions
                    </Button>
                    <Button variant="outline" className="flex-1" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Badge Timeline - Show when collected or activated */}
      {(badgeInfo?.distributionStatus === 'Collected' || badgeInfo?.distributionStatus === 'Activated') && (
        <Card>
          <CardHeader>
            <CardTitle>Badge Status Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Badge Ready</p>
                  <p className="text-sm text-muted-foreground">
                    Your badge was prepared for collection
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                  badgeInfo?.collectedAt ? 'bg-success/20' : 'bg-muted'
                }`}>
                  <CheckCircle2 className={`h-4 w-4 ${badgeInfo?.collectedAt ? 'text-success' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Badge Collected</p>
                  <p className="text-sm text-muted-foreground">
                    {badgeInfo?.collectedAt 
                      ? new Date(badgeInfo.collectedAt).toLocaleString()
                      : 'Pending collection'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                  badgeInfo?.activatedAt ? 'bg-success/20' : 'bg-muted'
                }`}>
                  <CheckCircle2 className={`h-4 w-4 ${badgeInfo?.activatedAt ? 'text-success' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Badge Activated</p>
                  <p className="text-sm text-muted-foreground">
                    {badgeInfo?.activatedAt 
                      ? new Date(badgeInfo.activatedAt).toLocaleString()
                      : 'Will be activated at venue entrance'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Access Zones */}
      {badgeInfo?.zoneAccess && (
        <Card>
          <CardHeader>
            <CardTitle>Access Permissions</CardTitle>
            <CardDescription>Areas you can access with your badge</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {badgeInfo.zoneAccess.includes('all') ? (
                <Badge variant="default" className="text-sm px-3 py-1">ALL ACCESS</Badge>
              ) : (
                badgeInfo.zoneAccess.map((zone: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-sm px-3 py-1">
                    {zone}
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Accreditation Helpline</p>
              <p className="font-medium">+971 4 XXX XXXX</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Email Support</p>
              <p className="font-medium">accreditation@event.ae</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ParticipantAccreditation;
