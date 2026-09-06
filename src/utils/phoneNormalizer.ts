/**
 * Client-side Canonical Phone Normalizer for Indian Mobile Numbers (+91)
 * Enforces the same canonical normalization as the backend.
 */

export interface NormalizedPhoneResult {
  isValid: boolean;
  canonical: string; // 10 digits: e.g. "9214211711"
  normalized: string;
  display: string; // e.g. "+91 92142 11711"
  e164: string; // "+919214211711"
  raw: string;
}

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
