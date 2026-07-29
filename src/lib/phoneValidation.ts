/** Phone must include international country code, e.g. +92 326 5488525 */
export const INTERNATIONAL_PHONE_PLACEHOLDER = '+92 326 5488525';

export const validateInternationalPhone = (phone: string): string | null => {
  const trimmed = phone.trim();
  if (!trimmed) return 'Phone number is required';

  const digitsOnly = trimmed.replace(/\D/g, '');

  if (trimmed.startsWith('0') || /^0\d/.test(digitsOnly)) {
    return 'Please enter the number with country code (e.g. +92 326 5488525), not a local number starting with 0';
  }

  if (!trimmed.startsWith('+')) {
    return 'Phone number must start with country code (e.g. +92)';
  }

  if (digitsOnly.length < 10) {
    return 'Phone number must be at least 10 digits including country code';
  }

  return null;
};

export const sanitizePhoneInput = (value: string): string =>
  value.replace(/[^\d+\s-]/g, '');
