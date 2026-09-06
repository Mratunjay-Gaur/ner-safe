/**
 * Canonical Phone Normalization Utility for Indian Mobile Numbers (+91)
 * Enforces one standard normalization logic across the entire application.
 */

export interface NormalizedPhoneResult {
  isValid: boolean;
  canonical: string; // Canonical 10-digit format, e.g. "9214211711"
  normalized: string; // Alias for canonical
  display: string; // Formatted display, e.g. "+91 92142 11711"
  e164: string; // E.164 format, e.g. "+919214211711"
  raw: string;
}

/**
 * Normalizes any Indian phone number representation into its canonical 10-digit number.
 * Examples:
 *   "+91 92142 11711" -> "9214211711"
 *   "+919214211711"   -> "9214211711"
 *   "9214211711"      -> "9214211711"
 *   "09214211711"     -> "9214211711"
 */
export function normalizeCanonicalPhone(input?: string | null): NormalizedPhoneResult {
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      canonical: '',
      normalized: '',
      display: '',
      e164: '',
      raw: '',
    };
  }

  const raw = input.trim();
  const digits = raw.replace(/\D/g, '');

  let canonical = '';

  if (digits.length === 12 && digits.startsWith('91')) {
    canonical = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    canonical = digits.slice(1);
  } else if (digits.length === 10) {
    canonical = digits;
  } else {
    canonical = digits;
  }

  // Indian mobile numbers must be 10 digits and start with 6, 7, 8, or 9
  const isValid = canonical.length === 10 && /^[6-9]\d{9}$/.test(canonical);

  const display = isValid
    ? `+91 ${canonical.slice(0, 5)} ${canonical.slice(5)}`
    : raw;

  const e164 = isValid ? `+91${canonical}` : raw;

  return {
    isValid,
    canonical: isValid ? canonical : digits,
    normalized: isValid ? canonical : digits,
    display,
    e164,
    raw,
  };
}

/**
 * Masks phone number safely for logging/UI (e.g. ******1711)
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone || typeof phone !== 'string') return '******';
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '******' + digits;
  return `******${digits.slice(-4)}`;
}
