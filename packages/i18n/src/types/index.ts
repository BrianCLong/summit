/**
 * Supported locale codes
 * Covering NATO member countries, major world languages, and RTL languages
 */
export type Locale =
  // English variants
  | 'en-US' // English (United States)
  | 'en-GB' // English (United Kingdom)
  // Western European languages
  | 'fr-FR' // French (France)
  | 'de-DE' // German (Germany)
  | 'es-ES' // Spanish (Spain)
  | 'it-IT' // Italian (Italy)
  | 'pt-PT' // Portuguese (Portugal)
  | 'nl-NL' // Dutch (Netherlands)
  // Nordic languages
  | 'da-DK' // Danish (Denmark)
  | 'no-NO' // Norwegian (Norway)
  | 'sv-SE' // Swedish (Sweden)
  | 'fi-FI' // Finnish (Finland)
  | 'is-IS' // Icelandic (Iceland)
  // Central European languages
  | 'pl-PL' // Polish (Poland)
  | 'cs-CZ' // Czech (Czech Republic)
  | 'sk-SK' // Slovak (Slovakia)
  | 'hu-HU' // Hungarian (Hungary)
  // Eastern & Southern European languages
  | 'ro-RO' // Romanian (Romania)
  | 'bg-BG' // Bulgarian (Bulgaria)
  | 'hr-HR' // Croatian (Croatia)
  | 'sl-SI' // Slovenian (Slovenia)
  | 'et-EE' // Estonian (Estonia)
  | 'lv-LV' // Latvian (Latvia)
  | 'lt-LT' // Lithuanian (Lithuania)
  | 'mt-MT' // Maltese (Malta)
  | 'tr-TR' // Turkish (Turkey)
  | 'el-GR' // Greek (Greece)
  | 'mk-MK' // Macedonian (North Macedonia)
  | 'al-AL' // Albanian (Albania)
  | 'me-ME' // Montenegrin (Montenegro)
  // RTL (Right-to-Left) languages
  | 'ar-SA' // Arabic (Saudi Arabia)
  | 'ar-EG' // Arabic (Egypt)
  | 'he-IL' // Hebrew (Israel)
  | 'fa-IR' // Persian/Farsi (Iran)
  | 'ur-PK' // Urdu (Pakistan)
  // Asian languages
  | 'zh-CN' // Chinese (Simplified)
  | 'zh-TW' // Chinese (Traditional)
  | 'ja-JP' // Japanese
  | 'ko-KR'; // Korean

/**
 * Text direction
 */
export type TextDirection = 'ltr' | 'rtl';

/**
 * Locale configuration
 */
export interface LocaleConfig {
  /** Locale code */
  code: Locale;
  /** Display name in the target language */
  name: string;
  /** Display name in English */
  englishName: string;
  /** Flag emoji */
  flag: string;
  /** Text direction */
  direction: TextDirection;
  /** Date format pattern */
  dateFormat: string;
  /** Number format options */
  numberFormat: Intl.NumberFormatOptions;
  /** Currency code */
  currency?: string;
}

/**
 * Translation messages (nested structure)
 */
export interface Messages {
  [key: string]: string | Messages;
}

/**
 * Translation parameters for interpolation
 */
export interface TranslationParams {
  [key: string]: string | number | boolean | Date;
}

/**
 * Pluralization rules
 */
export interface PluralRules {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

/**
 * Translation context for disambiguation
 */
export interface TranslationContext {
  context?: string;
  count?: number;
  defaultValue?: string;
}

/**
 * Translation validation result
 */
export interface ValidationResult {
  locale: Locale;
  missingKeys: string[];
  extraKeys: string[];
  emptyValues: string[];
  invalidInterpolations: string[];
  coverage: number;
}

/**
 * Translation statistics
 */
export interface TranslationStats {
  locale: Locale;
  totalKeys: number;
  translatedKeys: number;
  coverage: number;
  lastUpdated?: string;
}

/**
 * String extraction result
 */
export interface ExtractedString {
  key: string;
  value: string;
  file: string;
  line: number;
  context?: string;
}

/**
 * i18n hook return type
 */
export interface I18nHook {
  /** Current locale */
  locale: Locale;
  /** Set locale */
  setLocale: (locale: Locale) => void;
  /** Translation function */
  t: (key: string, params?: TranslationParams, context?: TranslationContext) => string;
  /** Format date */
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  /** Format number */
  formatNumber: (num: number, options?: Intl.NumberFormatOptions) => string;
  /** Format currency */
  formatCurrency: (amount: number, currency?: string) => string;
  /** Format relative time */
  formatRelativeTime: (date: Date | string) => string;
  /** Check if locale is RTL */
  isRTL: boolean;
  /** Text direction */
  direction: TextDirection;
  /** Available locales */
  availableLocales: LocaleConfig[];
  /** Loading state */
  isLoading: boolean;
  /** Change language (alias for setLocale) */
  changeLanguage: (locale: Locale) => void;
}

/**
 * i18n provider props
 */
export interface I18nProviderProps {
  children: React.ReactNode;
  /** Default locale */
  defaultLocale?: Locale;
  /** Fallback locale */
  fallbackLocale?: Locale;
  /** Load locales on demand */
  lazyLoad?: boolean;
  /** Debug mode */
  debug?: boolean;
}
