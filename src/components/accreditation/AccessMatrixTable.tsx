import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, X } from 'lucide-react';
import { accreditationCategories, accessZoneDefinitions } from '@/data/accreditationData';

export const AccessMatrixTable: React.FC = () => {
  const hasAccess = (categoryId: string, zoneId: string): boolean => {
    const category = accreditationCategories.find(c => c.id === categoryId);
    if (!category) return false;
    
    // All access categories
    if (category.allowedZones.includes('all')) return true;
    
    // Check specific zone access (simplified matching)
    const zone = accessZoneDefinitions.find(z => z.id === zoneId);
    if (!zone) return false;
    
    // Map zone codes to category allowed zones
    const zoneCodeMap: Record<string, string[]> = {
      'zone-all': ['all'],
      'zone-vip': ['vip-lounge', 'hospitality'],
      'zone-comp': ['competition-zone', 'main-arena', 'technical-area'],
      'zone-ath': ['athletes-village', 'warm-up', 'medical'],
      'zone-media': ['media-center', 'press-room'],
      'zone-mixed': ['mixed-zone', 'main-arena-media'],
      'zone-boh': ['back-of-house', 'staff-areas', 'service-areas'],
      'zone-public': ['public-areas', 'spectator-stands'],
    };
    
    const zoneAreas = zoneCodeMap[zoneId] || [];
    return zoneAreas.some(area => category.allowedZones.includes(area));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Access Control Matrix</CardTitle>
        <p className="text-sm text-muted-foreground">
          Shows which accreditation categories can access each zone
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background min-w-[120px]">Zone</TableHead>
                {accreditationCategories.map(cat => (
                  <TableHead 
                    key={cat.id} 
                    className="text-center min-w-[80px]"
                  >
                    <div 
                      className="inline-block px-2 py-1 rounded text-xs font-medium"
                      style={{ backgroundColor: cat.color, color: cat.textColor }}
                    >
                      {cat.code}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {accessZoneDefinitions.map(zone => (
                <TableRow key={zone.id}>
                  <TableCell className="sticky left-0 bg-background font-medium">
                    <div>
                      <div className="flex items-center gap-2">
                        <span>{zone.name}</span>
                        {zone.isRestricted && (
                          <span className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">
                            Restricted
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{zone.venue}</div>
                    </div>
                  </TableCell>
                  {accreditationCategories.map(cat => (
                    <TableCell key={cat.id} className="text-center">
                      {hasAccess(cat.id, zone.id) ? (
                        <div className="inline-flex items-center justify-center w-6 h-6 bg-success/20 text-success rounded-full">
                          <Check className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="inline-flex items-center justify-center w-6 h-6 bg-muted text-muted-foreground rounded-full">
                          <X className="h-4 w-4" />
                        </div>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
