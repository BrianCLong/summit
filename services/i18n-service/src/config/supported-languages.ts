import type { LanguageCode } from '../types/index.js';

/**
 * Comprehensive list of supported languages for translation
 * Prioritizing NATO member countries and major world languages
 */
export const SUPPORTED_LANGUAGES: LanguageCode[] = [
  // English
  'en',

  // Western European
  'fr', // French
  'de', // German
  'es', // Spanish
  'it', // Italian
  'pt', // Portuguese
  'nl', // Dutch

  // Nordic
  'da', // Danish
  'no', // Norwegian
  'sv', // Swedish
  'fi', // Finnish
  'is', // Icelandic

  // Central European
  'pl', // Polish
  'cs', // Czech
  'sk', // Slovak
  'hu', // Hungarian

  // Eastern & Southern European
  'ro', // Romanian
  'bg', // Bulgarian
  'hr', // Croatian
  'sl', // Slovenian
  'et', // Estonian
  'lv', // Latvian
  'lt', // Lithuanian
  'mt', // Maltese (official EU language)
  'tr', // Turkish
  'el', // Greek
  'mk', // Macedonian
  'sq', // Albanian
  'sr', // Serbian

  // RTL languages
  'ar', // Arabic
  'he', // Hebrew
  'fa', // Persian/Farsi
  'ur', // Urdu

  // Asian languages
  'zh', // Chinese
  'ja', // Japanese
  'ko', // Korean
  'vi', // Vietnamese
  'th', // Thai
  'id', // Indonesian
  'ms', // Malay
  'hi', // Hindi
  'bn', // Bengali
  'ta', // Tamil
  'te', // Telugu

  // Other important languages
  'ru', // Russian
  'uk', // Ukrainian
  'be', // Belarusian
  'ka', // Georgian
  'hy', // Armenian
  'az', // Azerbaijani
  'kk', // Kazakh
  'uz', // Uzbek
];

/**
 * Language names in English
 */
export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: 'English',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  da: 'Danish',
  no: 'Norwegian',
  sv: 'Swedish',
  fi: 'Finnish',
  is: 'Icelandic',
  pl: 'Polish',
  cs: 'Czech',
  sk: 'Slovak',
  hu: 'Hungarian',
  ro: 'Romanian',
  bg: 'Bulgarian',
  hr: 'Croatian',
  sl: 'Slovenian',
  et: 'Estonian',
  lv: 'Latvian',
  lt: 'Lithuanian',
  mt: 'Maltese',
  tr: 'Turkish',
  el: 'Greek',
  mk: 'Macedonian',
  sq: 'Albanian',
  sr: 'Serbian',
  ar: 'Arabic',
  he: 'Hebrew',
  fa: 'Persian',
  ur: 'Urdu',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  vi: 'Vietnamese',
  th: 'Thai',
  id: 'Indonesian',
  ms: 'Malay',
  hi: 'Hindi',
  bn: 'Bengali',
  ta: 'Tamil',
  te: 'Telugu',
  ru: 'Russian',
  uk: 'Ukrainian',
  be: 'Belarusian',
  ka: 'Georgian',
  hy: 'Armenian',
  az: 'Azerbaijani',
  kk: 'Kazakh',
  uz: 'Uzbek',
};

/**
 * RTL (Right-to-Left) languages
 */
export const RTL_LANGUAGES: LanguageCode[] = ['ar', 'he', 'fa', 'ur'];

/**
 * Check if a language is RTL
 */
export function isRTL(language: LanguageCode): boolean {
  return RTL_LANGUAGES.includes(language);
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(language: LanguageCode): boolean {
  return SUPPORTED_LANGUAGES.includes(language);
}

/**
 * Get language name
 */
export function getLanguageName(language: LanguageCode): string {
  return LANGUAGE_NAMES[language] || language;
}
