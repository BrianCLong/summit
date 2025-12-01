import type { Locale, LocaleConfig } from '../types';

/**
 * RTL (Right-to-Left) locales
 */
export const RTL_LOCALES: Locale[] = [
  'ar-SA',
  'ar-EG',
  'he-IL',
  'fa-IR',
  'ur-PK',
];

/**
 * Check if a locale uses RTL direction
 */
export function isRTLLocale(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

/**
 * Complete locale configurations for all supported languages
 */
export const LOCALE_CONFIGS: Record<Locale, LocaleConfig> = {
  // English variants
  'en-US': {
    code: 'en-US',
    name: 'English (US)',
    englishName: 'English (United States)',
    flag: '🇺🇸',
    direction: 'ltr',
    dateFormat: 'MM/dd/yyyy',
    numberFormat: {},
    currency: 'USD',
  },
  'en-GB': {
    code: 'en-GB',
    name: 'English (UK)',
    englishName: 'English (United Kingdom)',
    flag: '🇬🇧',
    direction: 'ltr',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: {},
    currency: 'GBP',
  },

  // Western European languages
  'fr-FR': {
    code: 'fr-FR',
    name: 'Français',
    englishName: 'French',
    flag: '🇫🇷',
    direction: 'ltr',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: {},
    currency: 'EUR',
  },
  'de-DE': {
    code: 'de-DE',
    name: 'Deutsch',
    englishName: 'German',
    flag: '🇩🇪',
    direction: 'ltr',
    dateFormat: 'dd.MM.yyyy',
    numberFormat: {},
    currency: 'EUR',
  },
  'es-ES': {
    code: 'es-ES',
    name: 'Español',
    englishName: 'Spanish',
    flag: '🇪🇸',
    direction: 'ltr',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: {},
    currency: 'EUR',
  },
  'it-IT': {
    code: 'it-IT',
    name: 'Italiano',
    englishName: 'Italian',
    flag: '🇮🇹',
    direction: 'ltr',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: {},
    currency: 'EUR',
  },
  'pt-PT': {
    code: 'pt-PT',
    name: 'Português',
    englishName: 'Portuguese',
    flag: '🇵🇹',
    direction: 'ltr',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: {},
    currency: 'EUR',
  },
  'nl-NL': {
    code: 'nl-NL',
    name: 'Nederlands',
    englishName: 'Dutch',
    flag: '🇳🇱',
    direction: 'ltr',
    dateFormat: 'dd-MM-yyyy',
    numberFormat: {},
    currency: 'EUR',
  },

  // Nordic languages
  'da-DK': {
    code: 'da-DK',
    name: 'Dansk',
    englishName: 'Danish',
    flag: '🇩🇰',
    direction: 'ltr',
    dateFormat: 'dd-MM-yyyy',
    numberFormat: {},
    currency: 'DKK',
  },
  'no-NO': {
    code: 'no-NO',
    name: 'Norsk',
    englishName: 'Norwegian',
    flag: '🇳🇴',
    direction: 'ltr',
    dateFormat: 'dd.MM.yyyy',
    numberFormat: {},
    currency: 'NOK',
  },
  'sv-SE': {
    code: 'sv-SE',
    name: 'Svenska',
    englishName: 'Swedish',
    flag: '🇸🇪',
    direction: 'ltr',
    dateFormat: 'yyyy-MM-dd',
    numberFormat: {},
    currency: 'SEK',
  },
  'fi-FI': {
    code: 'fi-FI',
    name: 'Suomi',
    englishName: 'Finnish',
    flag: '🇫🇮',
    direction: 'ltr',
    dateFormat: 'dd.MM.yyyy',
    numberFormat: {},
    currency: 'EUR',
  },
  'is-IS': {
    code: 'is-IS',
    name: 'Íslenska',
    englishName: 'Icelandic',
    flag: '🇮🇸',
    direction: 'ltr',
    dateFormat: 'dd.MM.yyyy',
    numberFormat: {},
    currency: 'ISK',
  },

  // Central European languages
  'pl-PL': {
    code: 'pl-PL',
    name: 'Polski',
    englishName: 'Polish',
    flag: '🇵🇱',
    direction: 'ltr',
    dateFormat: 'dd.MM.yyyy',
    numberFormat: {},
    currency: 'PLN',
  },
  'cs-CZ': {
    code: 'cs-CZ',
    name: 'Čeština',
    englishName: 'Czech',
    flag: '🇨🇿',
    direction: 'ltr',
    dateFormat: 'dd.MM.yyyy',
    numberFormat: {},
    currency: 'CZK',
  },
  'sk-SK': {
    code: 'sk-SK',
    name: 'Slovenčina',
    englishName: 'Slovak',
    flag: '🇸🇰',
    direction: 'ltr',
    dateFormat: 'dd.MM.yyyy',
    numberFormat: {},
    currency: 'EUR',
  },
  'hu-HU': {
    code: 'hu-HU',
    name: 'Magyar',
    englishName: 'Hungarian',
    flag: '🇭🇺',
    direction: 'ltr',
    dateFormat: 'yyyy.MM.dd',
    numberFormat: {},
    currency: 'HUF',
  },

  // Eastern & Southern European languages
  'ro-RO': {
    code: 'ro-RO',
    name: 'Română',
    englishName: 'Romanian',
    flag: '🇷🇴',
    direction: 'ltr',
    dateFormat: 'dd.MM.yyyy',
    numberFormat: {},
    currency: 'RON',
  },
  'bg-BG': {
    code: 'bg-BG',
    name: 'Български',
    englishName: 'Bulgarian',
    flag: '🇧🇬',
    direction: 'ltr',
    dateFormat: 'dd.MM.yyyy',
    numberFormat: {},
    currency: 'BGN',
  },
  'hr-HR': {
    code: 'hr-HR',
    name: 'Hrvatski',
    englishName: 'Croatian',
    flag: '🇭🇷',
    direction: 'ltr',
    dateFormat: 'dd.MM.yyyy',
    numberFormat: {},
    currency: 'EUR',
  },
  'sl-SI': {
    code: 'sl-SI',
    name: 'Slovenščina',
    englishName: 'Slovenian',
    flag: '🇸🇮',
    direction: 'ltr',
    dateFormat: 'dd.MM.yyyy',
    numberFormat: {},
    currency: 'EUR',
  },
  'et-EE': {
    code: 'et-EE',
    name: 'Eesti',
    englishName: 'Estonian',
    flag: '🇪🇪',
    direction: 'ltr',
    dateFormat: 'dd.MM.yyyy',
    numberFormat: {},
    currency: 'EUR',
  },
  'lv-LV': {
    code: 'lv-LV',
    name: 'Latviešu',
    englishName: 'Latvian',
    flag: '🇱🇻',
    direction: 'ltr',
    dateFormat: 'dd.MM.yyyy',
    numberFormat: {},
    currency: 'EUR',
  },
  'lt-LT': {
    code: 'lt-LT',
    name: 'Lietuvių',
    englishName: 'Lithuanian',
    flag: '🇱🇹',
    direction: 'ltr',
    dateFormat: 'yyyy-MM-dd',
    numberFormat: {},
    currency: 'EUR',
  },
  'mt-MT': {
    code: 'mt-MT',
    name: 'Malti',
    englishName: 'Maltese',
    flag: '🇲🇹',
    direction: 'ltr',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: {},
    currency: 'EUR',
  },
  'tr-TR': {
    code: 'tr-TR',
    name: 'Türkçe',
    englishName: 'Turkish',
    flag: '🇹🇷',
    direction: 'ltr',
    dateFormat: 'dd.MM.yyyy',
    numberFormat: {},
    currency: 'TRY',
  },
  'el-GR': {
    code: 'el-GR',
    name: 'Ελληνικά',
    englishName: 'Greek',
    flag: '🇬🇷',
    direction: 'ltr',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: {},
    currency: 'EUR',
  },
  'mk-MK': {
    code: 'mk-MK',
    name: 'Македонски',
    englishName: 'Macedonian',
    flag: '🇲🇰',
    direction: 'ltr',
    dateFormat: 'dd.MM.yyyy',
    numberFormat: {},
    currency: 'MKD',
  },
  'al-AL': {
    code: 'al-AL',
    name: 'Shqip',
    englishName: 'Albanian',
    flag: '🇦🇱',
    direction: 'ltr',
    dateFormat: 'dd.MM.yyyy',
    numberFormat: {},
    currency: 'ALL',
  },
  'me-ME': {
    code: 'me-ME',
    name: 'Crnogorski',
    englishName: 'Montenegrin',
    flag: '🇲🇪',
    direction: 'ltr',
    dateFormat: 'dd.MM.yyyy',
    numberFormat: {},
    currency: 'EUR',
  },

  // RTL (Right-to-Left) languages
  'ar-SA': {
    code: 'ar-SA',
    name: 'العربية (السعودية)',
    englishName: 'Arabic (Saudi Arabia)',
    flag: '🇸🇦',
    direction: 'rtl',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: {},
    currency: 'SAR',
  },
  'ar-EG': {
    code: 'ar-EG',
    name: 'العربية (مصر)',
    englishName: 'Arabic (Egypt)',
    flag: '🇪🇬',
    direction: 'rtl',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: {},
    currency: 'EGP',
  },
  'he-IL': {
    code: 'he-IL',
    name: 'עברית',
    englishName: 'Hebrew',
    flag: '🇮🇱',
    direction: 'rtl',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: {},
    currency: 'ILS',
  },
  'fa-IR': {
    code: 'fa-IR',
    name: 'فارسی',
    englishName: 'Persian/Farsi',
    flag: '🇮🇷',
    direction: 'rtl',
    dateFormat: 'yyyy/MM/dd',
    numberFormat: {},
    currency: 'IRR',
  },
  'ur-PK': {
    code: 'ur-PK',
    name: 'اردو',
    englishName: 'Urdu',
    flag: '🇵🇰',
    direction: 'rtl',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: {},
    currency: 'PKR',
  },

  // Asian languages
  'zh-CN': {
    code: 'zh-CN',
    name: '简体中文',
    englishName: 'Chinese (Simplified)',
    flag: '🇨🇳',
    direction: 'ltr',
    dateFormat: 'yyyy/MM/dd',
    numberFormat: {},
    currency: 'CNY',
  },
  'zh-TW': {
    code: 'zh-TW',
    name: '繁體中文',
    englishName: 'Chinese (Traditional)',
    flag: '🇹🇼',
    direction: 'ltr',
    dateFormat: 'yyyy/MM/dd',
    numberFormat: {},
    currency: 'TWD',
  },
  'ja-JP': {
    code: 'ja-JP',
    name: '日本語',
    englishName: 'Japanese',
    flag: '🇯🇵',
    direction: 'ltr',
    dateFormat: 'yyyy/MM/dd',
    numberFormat: {},
    currency: 'JPY',
  },
  'ko-KR': {
    code: 'ko-KR',
    name: '한국어',
    englishName: 'Korean',
    flag: '🇰🇷',
    direction: 'ltr',
    dateFormat: 'yyyy. MM. dd',
    numberFormat: {},
    currency: 'KRW',
  },
};

/**
 * Get locale configuration
 */
export function getLocaleConfig(locale: Locale): LocaleConfig {
  return LOCALE_CONFIGS[locale] || LOCALE_CONFIGS['en-US'];
}

/**
 * Get all available locales
 */
export function getAvailableLocales(): LocaleConfig[] {
  return Object.values(LOCALE_CONFIGS);
}

/**
 * Get locales by region
 */
export function getLocalesByRegion(): Record<string, LocaleConfig[]> {
  return {
    'North America': [LOCALE_CONFIGS['en-US']],
    'Western Europe': [
      LOCALE_CONFIGS['en-GB'],
      LOCALE_CONFIGS['fr-FR'],
      LOCALE_CONFIGS['de-DE'],
      LOCALE_CONFIGS['es-ES'],
      LOCALE_CONFIGS['it-IT'],
      LOCALE_CONFIGS['pt-PT'],
      LOCALE_CONFIGS['nl-NL'],
    ],
    'Nordic Countries': [
      LOCALE_CONFIGS['da-DK'],
      LOCALE_CONFIGS['no-NO'],
      LOCALE_CONFIGS['sv-SE'],
      LOCALE_CONFIGS['fi-FI'],
      LOCALE_CONFIGS['is-IS'],
    ],
    'Central Europe': [
      LOCALE_CONFIGS['pl-PL'],
      LOCALE_CONFIGS['cs-CZ'],
      LOCALE_CONFIGS['sk-SK'],
      LOCALE_CONFIGS['hu-HU'],
    ],
    'Eastern & Southern Europe': [
      LOCALE_CONFIGS['ro-RO'],
      LOCALE_CONFIGS['bg-BG'],
      LOCALE_CONFIGS['hr-HR'],
      LOCALE_CONFIGS['sl-SI'],
      LOCALE_CONFIGS['et-EE'],
      LOCALE_CONFIGS['lv-LV'],
      LOCALE_CONFIGS['lt-LT'],
      LOCALE_CONFIGS['mt-MT'],
      LOCALE_CONFIGS['tr-TR'],
      LOCALE_CONFIGS['el-GR'],
      LOCALE_CONFIGS['mk-MK'],
      LOCALE_CONFIGS['al-AL'],
      LOCALE_CONFIGS['me-ME'],
    ],
    'Middle East': [
      LOCALE_CONFIGS['ar-SA'],
      LOCALE_CONFIGS['ar-EG'],
      LOCALE_CONFIGS['he-IL'],
      LOCALE_CONFIGS['fa-IR'],
      LOCALE_CONFIGS['ur-PK'],
    ],
    'East Asia': [
      LOCALE_CONFIGS['zh-CN'],
      LOCALE_CONFIGS['zh-TW'],
      LOCALE_CONFIGS['ja-JP'],
      LOCALE_CONFIGS['ko-KR'],
    ],
  };
}
