"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCoverageReport = exports.validateICUFormat = exports.findUntranslatedStrings = exports.findDuplicateTranslations = exports.calculateTranslationStats = exports.validateTranslations = exports.extractInterpolations = exports.flattenMessages = exports.FullLanguageSelector = exports.CompactLanguageSelector = exports.FlagSelector = exports.LanguageSwitcher = exports.withI18n = exports.I18nProvider = exports.useI18n = exports.isI18nInitialized = exports.getI18nInstance = exports.loadTranslationBundle = exports.addTranslations = exports.initI18n = exports.getLocalesByRegion = exports.getAvailableLocales = exports.getLocaleConfig = exports.isRTLLocale = exports.RTL_LOCALES = exports.LOCALE_CONFIGS = void 0;
// Configuration
var locales_1 = require("./config/locales");
Object.defineProperty(exports, "LOCALE_CONFIGS", { enumerable: true, get: function () { return locales_1.LOCALE_CONFIGS; } });
Object.defineProperty(exports, "RTL_LOCALES", { enumerable: true, get: function () { return locales_1.RTL_LOCALES; } });
Object.defineProperty(exports, "isRTLLocale", { enumerable: true, get: function () { return locales_1.isRTLLocale; } });
Object.defineProperty(exports, "getLocaleConfig", { enumerable: true, get: function () { return locales_1.getLocaleConfig; } });
Object.defineProperty(exports, "getAvailableLocales", { enumerable: true, get: function () { return locales_1.getAvailableLocales; } });
Object.defineProperty(exports, "getLocalesByRegion", { enumerable: true, get: function () { return locales_1.getLocalesByRegion; } });
var i18next_1 = require("./config/i18next");
Object.defineProperty(exports, "initI18n", { enumerable: true, get: function () { return i18next_1.initI18n; } });
Object.defineProperty(exports, "addTranslations", { enumerable: true, get: function () { return i18next_1.addTranslations; } });
Object.defineProperty(exports, "loadTranslationBundle", { enumerable: true, get: function () { return i18next_1.loadTranslationBundle; } });
Object.defineProperty(exports, "getI18nInstance", { enumerable: true, get: function () { return i18next_1.getI18nInstance; } });
Object.defineProperty(exports, "isI18nInitialized", { enumerable: true, get: function () { return i18next_1.isI18nInitialized; } });
// Hooks
var useI18n_1 = require("./hooks/useI18n");
Object.defineProperty(exports, "useI18n", { enumerable: true, get: function () { return useI18n_1.useI18n; } });
// Components
var I18nProvider_1 = require("./components/I18nProvider");
Object.defineProperty(exports, "I18nProvider", { enumerable: true, get: function () { return I18nProvider_1.I18nProvider; } });
Object.defineProperty(exports, "withI18n", { enumerable: true, get: function () { return I18nProvider_1.withI18n; } });
var LanguageSwitcher_1 = require("./components/LanguageSwitcher");
Object.defineProperty(exports, "LanguageSwitcher", { enumerable: true, get: function () { return LanguageSwitcher_1.LanguageSwitcher; } });
Object.defineProperty(exports, "FlagSelector", { enumerable: true, get: function () { return LanguageSwitcher_1.FlagSelector; } });
Object.defineProperty(exports, "CompactLanguageSelector", { enumerable: true, get: function () { return LanguageSwitcher_1.CompactLanguageSelector; } });
Object.defineProperty(exports, "FullLanguageSelector", { enumerable: true, get: function () { return LanguageSwitcher_1.FullLanguageSelector; } });
// Utilities
var validation_1 = require("./utils/validation");
Object.defineProperty(exports, "flattenMessages", { enumerable: true, get: function () { return validation_1.flattenMessages; } });
Object.defineProperty(exports, "extractInterpolations", { enumerable: true, get: function () { return validation_1.extractInterpolations; } });
Object.defineProperty(exports, "validateTranslations", { enumerable: true, get: function () { return validation_1.validateTranslations; } });
Object.defineProperty(exports, "calculateTranslationStats", { enumerable: true, get: function () { return validation_1.calculateTranslationStats; } });
Object.defineProperty(exports, "findDuplicateTranslations", { enumerable: true, get: function () { return validation_1.findDuplicateTranslations; } });
Object.defineProperty(exports, "findUntranslatedStrings", { enumerable: true, get: function () { return validation_1.findUntranslatedStrings; } });
Object.defineProperty(exports, "validateICUFormat", { enumerable: true, get: function () { return validation_1.validateICUFormat; } });
Object.defineProperty(exports, "generateCoverageReport", { enumerable: true, get: function () { return validation_1.generateCoverageReport; } });
