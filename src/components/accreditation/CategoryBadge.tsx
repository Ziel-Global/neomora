import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AccreditationCategory } from '@/data/accreditationData';

interface CategoryBadgeProps {
  category: AccreditationCategory;
  size?: 'sm' | 'md' | 'lg';
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  return (
    <Badge
      className={sizeClasses[size]}
      style={{
        backgroundColor: category.color,
        color: category.textColor,
      }}
    >
      {category.code} - {category.name}
    </Badge>
  );
};
