import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import enCommon from './locales/en/common.json';
import esCommon from './locales/es/common.json';
import arCommon from './locales/ar/common.json';

export const RTL_LANGUAGES = new Set(['ar', 'he', 'fa', 'ur']);

const resources = {
  en: { common: enCommon },
  'en-US': { common: enCommon },
  es: { common: esCommon },
  'es-ES': { common: esCommon },
  ar: { common: arCommon },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'en-US', 'es', 'es-ES', 'ar'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    defaultNS: 'common',
    ns: ['common'],
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

const updateDocumentLanguage = (lng?: string) => {
  if (typeof document === 'undefined') return;
  const language = lng || i18n.resolvedLanguage || i18n.language || 'en';
  document.documentElement.lang = language;
  document.documentElement.dir = RTL_LANGUAGES.has(language) ? 'rtl' : 'ltr';
};

if (i18n.isInitialized) {
  updateDocumentLanguage();
}

i18n.on('initialized', (options) => {
  updateDocumentLanguage(options?.lng);
});

i18n.on('languageChanged', updateDocumentLanguage);

if (typeof window !== 'undefined') {
  (window as typeof window & { __i18n?: typeof i18n }).__i18n = i18n;
}

export default i18n;
