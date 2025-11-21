/**
 * @intelgraph/i18n
 *
 * Comprehensive internationalization (i18n) system for Summit/IntelGraph platform
 *
 * Features:
 * - 40+ language support including RTL languages
 * - i18next integration with ICU message format
 * - React hooks and components
 * - Language detection and persistence
 * - Date, number, and currency formatting
 * - Translation validation and QA tools
 * - Pluralization and context support
 *
 * @example
 * ```tsx
 * import { I18nProvider, useI18n, LanguageSwitcher } from '@intelgraph/i18n';
 *
 * function App() {
 *   return (
 *     <I18nProvider defaultLocale="en-US">
 *       <MyApp />
 *     </I18nProvider>
 *   );
 * }
 *
 * function MyComponent() {
 *   const { t, locale, setLocale, formatDate, isRTL } = useI18n();
 *
 *   return (
 *     <div dir={isRTL ? 'rtl' : 'ltr'}>
 *       <h1>{t('common.welcome')}</h1>
 *       <LanguageSwitcher variant="dropdown" showFlags showNames />
 *     </div>
 *   );
 * }
 * ```
 */

// Types
export type {
  Locale,
  TextDirection,
  LocaleConfig,
  Messages,
  TranslationParams,
  TranslationContext,
  PluralRules,
  ValidationResult,
  TranslationStats,
  ExtractedString,
  I18nHook,
  I18nProviderProps,
} from './types';

// Configuration
export {
  LOCALE_CONFIGS,
  RTL_LOCALES,
  isRTLLocale,
  getLocaleConfig,
  getAvailableLocales,
  getLocalesByRegion,
} from './config/locales';

export {
  initI18n,
  addTranslations,
  loadTranslationBundle,
  getI18nInstance,
  isI18nInitialized,
} from './config/i18next';

// Hooks
export { useI18n } from './hooks/useI18n';

// Components
export { I18nProvider, withI18n } from './components/I18nProvider';
export {
  LanguageSwitcher,
  FlagSelector,
  CompactLanguageSelector,
  FullLanguageSelector,
} from './components/LanguageSwitcher';

// Utilities
export {
  flattenMessages,
  extractInterpolations,
  validateTranslations,
  calculateTranslationStats,
  findDuplicateTranslations,
  findUntranslatedStrings,
  validateICUFormat,
  generateCoverageReport,
} from './utils/validation';
