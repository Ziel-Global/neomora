// Auto-generated "sports board" (federation) name for a given country + sport.
// Real federation names vary too much to hand-curate accurately for every
// country, so this uses a consistent naming pattern instead.
export const getSportsBoardName = (country: string, sport: string): string => {
  if (!country || !sport) return '';
  return `${country} ${sport} Federation`;
};

// One board name per sport, for events with multiple sport categories.
export const getSportsBoardsForEvent = (country: string, sports: string[]): string[] => {
  if (!country) return [];
  const names = sports
    .map((sport) => getSportsBoardName(country, sport))
    .filter(Boolean);
  return Array.from(new Set(names));
};
