import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ICU from 'i18next-icu';
import type { Locale } from '../types';
import { LOCALE_CONFIGS } from './locales';

/**
 * i18next configuration options
 */
export interface I18nConfig {
  /** Default locale */
  defaultLocale?: Locale;
  /** Fallback locale */
  fallbackLocale?: Locale;
  /** Enable debug mode */
  debug?: boolean;
  /** Load locales on demand */
  lazyLoad?: boolean;
  /** Supported namespaces */
  namespaces?: string[];
  /** Default namespace */
  defaultNamespace?: string;
}

/**
 * Initialize i18next with configuration
 */
export async function initI18n(config: I18nConfig = {}) {
  const {
    defaultLocale = 'en-US',
    fallbackLocale = 'en-US',
    debug = false,
    namespaces = ['common', 'auth', 'navigation', 'dashboard', 'errors'],
    defaultNamespace = 'common',
  } = config;

  // Initialize i18next
  await i18n
    .use(ICU) // ICU message format for advanced pluralization
    .use(LanguageDetector) // Automatic language detection
    .use(initReactI18next) // React integration
    .init({
      // Supported languages
      supportedLngs: Object.keys(LOCALE_CONFIGS),

      // Fallback configuration
      fallbackLng: fallbackLocale,
      lng: defaultLocale,

      // Namespaces
      ns: namespaces,
      defaultNS: defaultNamespace,

      // Debug
      debug,

      // Interpolation
      interpolation: {
        escapeValue: false, // React already escapes
        prefix: '{',
        suffix: '}',
      },

      // Language detection
      detection: {
        // Order of detection methods
        order: [
          'localStorage',
          'sessionStorage',
          'navigator',
          'htmlTag',
          'path',
          'subdomain',
        ],

        // Cache user language
        caches: ['localStorage', 'sessionStorage'],

        // localStorage key
        lookupLocalStorage: 'i18nextLng',
        lookupSessionStorage: 'i18nextLng',

        // Exclude cache for these languages (optional)
        excludeCacheFor: ['cimode'],
      },

      // React options
      react: {
        useSuspense: true,
        bindI18n: 'languageChanged loaded',
        bindI18nStore: 'added removed',
        transEmptyNodeValue: '',
        transSupportBasicHtmlNodes: true,
        transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'em', 'b', 'code'],
      },

      // Load paths (for lazy loading)
      backend: {
        loadPath: '/locales/{{lng}}/{{ns}}.json',
      },

      // Missing key handler
      saveMissing: debug,
      missingKeyHandler: (lngs, ns, key, fallbackValue) => {
        if (debug) {
          console.warn(
            `[i18n] Missing translation key: ${key} (namespace: ${ns}, languages: ${lngs.join(', ')})`
          );
        }
      },

      // Load strategy
      load: 'currentOnly', // Only load current language
      preload: [], // Don't preload any languages

      // Key separator
      keySeparator: '.',
      nsSeparator: ':',

      // Pluralization
      pluralSeparator: '_',
      contextSeparator: '_',

      // Return objects for nested translations
      returnObjects: false,
      returnEmptyString: false,
      returnNull: false,

      // Join arrays
      joinArrays: false,

      // Performance
      updateMissing: false,

      // Compatibility
      compatibilityJSON: 'v4',
    });

  return i18n;
}

/**
 * Add translations dynamically
 */
export function addTranslations(
  locale: Locale,
  namespace: string,
  translations: Record<string, any>
) {
  i18n.addResourceBundle(locale, namespace, translations, true, true);
}

/**
 * Load translation bundle
 */
export async function loadTranslationBundle(
  locale: Locale,
  namespace: string
): Promise<void> {
  try {
    const translations = await import(
      `../../locales/${locale}/${namespace}.json`
    );
    addTranslations(locale, namespace, translations.default || translations);
  } catch (error) {
    console.error(
      `Failed to load translation bundle: ${locale}/${namespace}`,
      error
    );
  }
}

/**
 * Get current i18n instance
 */
export function getI18nInstance() {
  return i18n;
}

/**
 * Check if i18n is initialized
 */
export function isI18nInitialized(): boolean {
  return i18n.isInitialized;
}

export default i18n;
