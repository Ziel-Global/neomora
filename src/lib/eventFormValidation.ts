export interface EventFormValues {
  name: string;
  theme: string;
  startDate: string;
  endDate: string;
  city: string;
  country: string;
  venues: string;
  status: string;
  eventType: 'individual' | 'team-based' | 'hybrid';
  selectedSports: string[];
}

export type EventFormField =
  | 'name'
  | 'theme'
  | 'startDate'
  | 'endDate'
  | 'city'
  | 'country'
  | 'venues'
  | 'status'
  | 'eventType'
  | 'selectedSports';

export type EventFormErrors = Partial<Record<EventFormField, string>>;

export interface EventFormValidationResult {
  valid: boolean;
  errors: EventFormErrors;
  firstError?: string;
}

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

export const validateEventForm = (
  values: EventFormValues,
  t: TranslateFn,
): EventFormValidationResult => {
  const errors: EventFormErrors = {};
  const todayStr = new Date().toISOString().split('T')[0];

  if (!values.name.trim()) {
    errors.name = t('events.validation.name_required');
  }

  if (!values.theme.trim()) {
    errors.theme = t('events.validation.theme_required');
  }

  if (!values.startDate) {
    errors.startDate = t('events.validation.start_date_required');
  }

  if (!values.endDate) {
    errors.endDate = t('events.validation.end_date_required');
  }

  if (!values.city.trim()) {
    errors.city = t('events.validation.city_required');
  }

  if (!values.country.trim()) {
    errors.country = t('events.validation.country_required', { defaultValue: 'Country is required' });
  }

  if (!values.venues.trim()) {
    errors.venues = t('events.validation.venues_required');
  }

  if (!values.eventType) {
    errors.eventType = t('events.validation.event_type_required');
  }

  if (!values.status) {
    errors.status = t('events.validation.status_required');
  }

  if (
    (values.eventType === 'team-based' || values.eventType === 'hybrid') &&
    values.selectedSports.length === 0
  ) {
    errors.selectedSports = t('events.validation.sport_required');
  }

  if (values.startDate && values.endDate && values.endDate < values.startDate) {
    errors.endDate = t('events.validation.end_before_start');
  }

  if (values.startDate && values.startDate < todayStr) {
    errors.startDate = t('events.validation.start_in_past');
  }

  const firstError = Object.values(errors)[0];
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    firstError,
  };
};
