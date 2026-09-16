/**
 * Language Configuration & State-to-Language Mapping Service
 * NER-SAFE Multilingual Notification System (SIH26001)
 */

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  script: string;
  isRtl?: boolean;
}

export const SUPPORTED_LANGUAGES: Record<string, SupportedLanguage> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    script: 'Latin',
  },
  as: {
    code: 'as',
    name: 'Assamese',
    nativeName: 'অসমীয়া',
    script: 'Bengali-Assamese',
  },
  bn: {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    script: 'Bengali',
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    script: 'Devanagari',
  },
  brx: {
    code: 'brx',
    name: 'Bodo',
    nativeName: 'बड़ो',
    script: 'Devanagari',
  },
  lus: {
    code: 'lus',
    name: 'Mizo',
    nativeName: 'Mizo ṭawng',
    script: 'Latin',
  },
  kha: {
    code: 'kha',
    name: 'Khasi',
    nativeName: 'Ka Ktien Khasi',
    script: 'Latin',
  },
  grt: {
    code: 'grt',
    name: 'Garo',
    nativeName: 'A·chik',
    script: 'Latin',
  },
  mni: {
    code: 'mni',
    name: 'Meitei / Manipuri',
    nativeName: 'মৈতৈলোন্',
    script: 'Bengali / Meitei Mayek',
  },
  ne: {
    code: 'ne',
    name: 'Nepali',
    nativeName: 'नेपाली',
    script: 'Devanagari',
  },
};

/**
 * Configurable default language mapping by state.
 * Fallback to English ('en') if outside North Eastern Region or unknown.
 */
export const STATE_DEFAULT_LANGUAGE: Record<string, string> = {
  'Arunachal Pradesh': 'en',
  'Assam': 'as',
  'Manipur': 'mni',
  'Meghalaya': 'kha',
  'Mizoram': 'lus',
  'Nagaland': 'en',
  'Sikkim': 'ne',
  'Tripura': 'bn',
};

/**
 * Returns list of all supported languages as an array
 */
export function getAllSupportedLanguages(): SupportedLanguage[] {
  return Object.values(SUPPORTED_LANGUAGES);
}

/**
 * Checks if a language code is supported
 */
export function isValidLanguageCode(code?: string): boolean {
  if (!code || typeof code !== 'string') return false;
  const normalized = code.trim().toLowerCase();
  return Boolean(SUPPORTED_LANGUAGES[normalized]);
}

/**
 * Returns language details or English fallback
 */
export function getLanguageMetadata(code?: string): SupportedLanguage {
  if (!code || typeof code !== 'string') return SUPPORTED_LANGUAGES['en'];
  const normalized = code.trim().toLowerCase();
  return SUPPORTED_LANGUAGES[normalized] || SUPPORTED_LANGUAGES['en'];
}

/**
 * Determines suggested/default alert language based on user's selected state.
 * If state is unrecognized, returns 'en'.
 */
export function getDefaultLanguageForState(state?: string): string {
  if (!state || typeof state !== 'string') return 'en';
  const cleanState = state.trim();

  // Direct match
  if (STATE_DEFAULT_LANGUAGE[cleanState]) {
    return STATE_DEFAULT_LANGUAGE[cleanState];
  }

  // Case-insensitive match
  const lower = cleanState.toLowerCase();
  for (const [key, lang] of Object.entries(STATE_DEFAULT_LANGUAGE)) {
    if (key.toLowerCase() === lower) {
      return lang;
    }
  }

  // Fallback for states outside NER or unspecified
  return 'en';
}

/**
 * Normalizes input language code with state fallback
 */
export function resolveUserLanguage(preferredLanguage?: string, state?: string): string {
  if (preferredLanguage && isValidLanguageCode(preferredLanguage)) {
    return preferredLanguage.trim().toLowerCase();
  }
  return getDefaultLanguageForState(state);
}
