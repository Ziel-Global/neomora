export interface DelegationCategory {
  group: string;
  label: string;
}

export const DELEGATION_CATEGORIES: DelegationCategory[] = [
  { group: 'Athletes/Players', label: 'Athletes/Players' },
  { group: 'Team Officials', label: 'Head Coach/Coach' },
  { group: 'Team Officials', label: 'Assistant Coach' },
  { group: 'Team Officials', label: 'Manager' },
  { group: 'Team Officials', label: 'Team Captain' },
  { group: 'Support Staff', label: 'Physiotherapist/Medical Officer' },
  { group: 'Support Staff', label: 'Trainer/Fitness Coach' },
  { group: 'Support Staff', label: 'Nutritionist' },
  { group: 'Administrative', label: 'Chef de Mission/Delegation Head' },
  { group: 'Administrative', label: 'Liaison Officer' },
  { group: 'Administrative', label: 'Admin/Federation Representative' },
  { group: 'Others', label: 'Media/Press Officer' },
  { group: 'Others', label: 'Security Personnel' },
];

export const DELEGATION_CATEGORY_LABELS: string[] = DELEGATION_CATEGORIES.map((c) => c.label);

export const DELEGATION_CATEGORY_GROUPS: string[] = Array.from(
  new Set(DELEGATION_CATEGORIES.map((c) => c.group)),
);

export const groupedDelegationCategories = (): Record<string, DelegationCategory[]> => {
  const grouped: Record<string, DelegationCategory[]> = {};
  for (const category of DELEGATION_CATEGORIES) {
    if (!grouped[category.group]) grouped[category.group] = [];
    grouped[category.group].push(category);
  }
  return grouped;
};
