"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initI18n = initI18n;
exports.addTranslations = addTranslations;
exports.loadTranslationBundle = loadTranslationBundle;
exports.getI18nInstance = getI18nInstance;
exports.isI18nInitialized = isI18nInitialized;
const i18next_1 = __importDefault(require("i18next"));
const react_i18next_1 = require("react-i18next");
const i18next_browser_languagedetector_1 = __importDefault(require("i18next-browser-languagedetector"));
const i18next_icu_1 = __importDefault(require("i18next-icu"));
const locales_1 = require("./locales");
/**
 * Initialize i18next with configuration
 */
async function initI18n(config = {}) {
    const { defaultLocale = 'en-US', fallbackLocale = 'en-US', debug = false, namespaces = ['common', 'auth', 'navigation', 'dashboard', 'errors'], defaultNamespace = 'common', } = config;
    // Initialize i18next
    await i18next_1.default
        .use(i18next_icu_1.default) // ICU message format for advanced pluralization
        .use(i18next_browser_languagedetector_1.default) // Automatic language detection
        .use(react_i18next_1.initReactI18next) // React integration
        .init({
        // Supported languages
        supportedLngs: Object.keys(locales_1.LOCALE_CONFIGS),
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
                console.warn(`[i18n] Missing translation key: ${key} (namespace: ${ns}, languages: ${lngs.join(', ')})`);
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
    return i18next_1.default;
}
/**
 * Add translations dynamically
 */
function addTranslations(locale, namespace, translations) {
    i18next_1.default.addResourceBundle(locale, namespace, translations, true, true);
}
/**
 * Load translation bundle
 */
async function loadTranslationBundle(locale, namespace) {
    try {
        const translations = await Promise.resolve(`${`../../locales/${locale}/${namespace}.json`}`).then(s => __importStar(require(s)));
        addTranslations(locale, namespace, translations.default || translations);
    }
    catch (error) {
        console.error(`Failed to load translation bundle: ${locale}/${namespace}`, error);
    }
}
/**
 * Get current i18n instance
 */
function getI18nInstance() {
    return i18next_1.default;
}
/**
 * Check if i18n is initialized
 */
function isI18nInitialized() {
    return i18next_1.default.isInitialized;
}
exports.default = i18next_1.default;
