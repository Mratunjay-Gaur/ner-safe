import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './locales/en';
import { as } from './locales/as';
import { mni } from './locales/mni';
import { kha } from './locales/kha';
import { lus } from './locales/lus';
import { ne } from './locales/ne';
import { bn } from './locales/bn';
import { hi } from './locales/hi';

export const SUPPORTED_LANGUAGES_META = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', region: 'Global / Inter-state' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', flag: '🇮🇳', region: 'Assam' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳', region: 'Tripura / Barak Valley' },
  { code: 'mni', name: 'Meitei (Manipuri)', nativeName: 'মৈতৈলোন্', flag: '🇮🇳', region: 'Manipur' },
  { code: 'kha', name: 'Khasi', nativeName: 'Ka Ktien Khasi', flag: '🇮🇳', region: 'Meghalaya' },
  { code: 'lus', name: 'Mizo', nativeName: 'Mizo ṭawng', flag: '🇮🇳', region: 'Mizoram' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', flag: '🇮🇳', region: 'Sikkim / NER Hills' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', region: 'National / Official' },
] as const;

export type SupportedLanguageCode = typeof SUPPORTED_LANGUAGES_META[number]['code'];

const STORAGE_KEY = 'ner_safe_lang';
const savedLanguage = (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null) || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      as: { translation: as },
      bn: { translation: bn },
      mni: { translation: mni },
      kha: { translation: kha },
      lus: { translation: lus },
      ne: { translation: ne },
      hi: { translation: hi },
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
    },
  });

i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, lng);
    document.documentElement.lang = lng;
  }
});

export default i18n;
