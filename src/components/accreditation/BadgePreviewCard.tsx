import React from 'react';
import { QrCode, Calendar, MapPin } from 'lucide-react';
import { AccreditationCategory, BadgeRecord, accessZoneDefinitions } from '@/data/accreditationData';

interface BadgePreviewCardProps {
  badge: BadgeRecord;
  category: AccreditationCategory;
  participantName: string;
  organization: string;
  photo?: string;
  isCompact?: boolean;
}

export const BadgePreviewCard: React.FC<BadgePreviewCardProps> = ({
  badge,
  category,
  participantName,
  organization,
  photo,
  isCompact = false,
}) => {
  const zones = badge.zoneAccess.includes('all') 
    ? ['ALL ACCESS'] 
    : badge.zoneAccess.map(z => {
        const zone = accessZoneDefinitions.find(zd => zd.id === z);
        return zone?.code || z;
      });

  if (isCompact) {
    return (
      <div 
        className="w-full aspect-[3/2] rounded-lg p-3 flex items-center gap-3"
        style={{ backgroundColor: category.color, color: category.textColor }}
      >
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
          {photo ? (
            <img src={photo} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <span className="font-bold">{participantName.charAt(0)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{participantName}</p>
          <p className="text-xs opacity-80 truncate">{organization}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">{category.code}</span>
            <span className="text-xs opacity-70">#{badge.badgeNumber}</span>
          </div>
        </div>
        <div className="w-12 h-12 bg-white rounded flex items-center justify-center shrink-0">
          <QrCode className="h-10 w-10 text-gray-800" />
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-64 aspect-[3/4] rounded-xl p-4 flex flex-col items-center justify-between shadow-lg"
      style={{ backgroundColor: category.color, color: category.textColor }}
    >
      {/* Event Logo */}
      <div className="text-center mb-2">
        <div className="text-xs font-medium opacity-80">GLOBAL SPORTS CHAMPIONSHIP 2024</div>
      </div>

      {/* Photo */}
      <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
        {photo ? (
          <img src={photo} alt="" className="w-20 h-20 rounded-full object-cover" />
        ) : (
          <span className="text-3xl font-bold">{participantName.charAt(0)}</span>
        )}
      </div>

      {/* Name & Organization */}
      <div className="text-center mt-2">
        <p className="font-bold text-lg">{participantName}</p>
        <p className="text-sm opacity-80">{organization}</p>
      </div>

      {/* Category Badge */}
      <div 
        className="px-4 py-1.5 rounded-full text-sm font-medium mt-2"
        style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
      >
        {category.code} - {category.name}
      </div>

      {/* Zone Access */}
      <div className="flex flex-wrap justify-center gap-1 mt-2">
        {zones.slice(0, 4).map((zone, i) => (
          <span 
            key={i} 
            className="text-xs px-2 py-0.5 rounded bg-white/15"
          >
            {zone}
          </span>
        ))}
        {zones.length > 4 && (
          <span className="text-xs px-2 py-0.5 rounded bg-white/15">+{zones.length - 4}</span>
        )}
      </div>

      {/* QR Code */}
      <div className="w-24 h-24 bg-white rounded-lg mt-3 flex items-center justify-center">
        <QrCode className="h-20 w-20 text-gray-800" />
      </div>

      {/* Badge Number & Validity */}
      <div className="text-center mt-2 text-xs opacity-70">
        <div className="font-mono">{badge.badgeNumber}</div>
        <div className="flex items-center justify-center gap-1 mt-1">
          <Calendar className="h-3 w-3" />
          <span>Valid: {new Date(badge.validFrom).toLocaleDateString()} - {new Date(badge.validTo).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
};
