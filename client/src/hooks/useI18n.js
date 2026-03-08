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
Object.defineProperty(exports, "__esModule", { value: true });
exports.useI18n = useI18n;
const react_1 = require("react");
// Cache for loaded messages
const messageCache = {};
// Locale configurations
const LOCALE_CONFIGS = {
    'en-US': {
        flag: '🇺🇸',
        name: 'English (US)',
        dateFormat: 'MM/dd/yyyy',
        numberFormat: {},
    },
    'en-GB': {
        flag: '🇬🇧',
        name: 'English (UK)',
        dateFormat: 'dd/MM/yyyy',
        numberFormat: {},
    },
    'fr-FR': {
        flag: '🇫🇷',
        name: 'Français',
        dateFormat: 'dd/MM/yyyy',
        numberFormat: {},
    },
    'de-DE': {
        flag: '🇩🇪',
        name: 'Deutsch',
        dateFormat: 'dd.MM.yyyy',
        numberFormat: { style: 'decimal' },
    },
    'it-IT': {
        flag: '🇮🇹',
        name: 'Italiano',
        dateFormat: 'dd/MM/yyyy',
        numberFormat: {},
    },
    'es-ES': {
        flag: '🇪🇸',
        name: 'Español',
        dateFormat: 'dd/MM/yyyy',
        numberFormat: {},
    },
    'pt-PT': {
        flag: '🇵🇹',
        name: 'Português',
        dateFormat: 'dd/MM/yyyy',
        numberFormat: {},
    },
    'nl-NL': {
        flag: '🇳🇱',
        name: 'Nederlands',
        dateFormat: 'dd-MM-yyyy',
        numberFormat: {},
    },
    'da-DK': {
        flag: '🇩🇰',
        name: 'Dansk',
        dateFormat: 'dd-MM-yyyy',
        numberFormat: {},
    },
    'no-NO': {
        flag: '🇳🇴',
        name: 'Norsk',
        dateFormat: 'dd.MM.yyyy',
        numberFormat: {},
    },
    'sv-SE': {
        flag: '🇸🇪',
        name: 'Svenska',
        dateFormat: 'yyyy-MM-dd',
        numberFormat: {},
    },
    'fi-FI': {
        flag: '🇫🇮',
        name: 'Suomi',
        dateFormat: 'dd.MM.yyyy',
        numberFormat: {},
    },
    'is-IS': {
        flag: '🇮🇸',
        name: 'Íslenska',
        dateFormat: 'dd.MM.yyyy',
        numberFormat: {},
    },
    'pl-PL': {
        flag: '🇵🇱',
        name: 'Polski',
        dateFormat: 'dd.MM.yyyy',
        numberFormat: {},
    },
    'cs-CZ': {
        flag: '🇨🇿',
        name: 'Čeština',
        dateFormat: 'dd.MM.yyyy',
        numberFormat: {},
    },
    'sk-SK': {
        flag: '🇸🇰',
        name: 'Slovenčina',
        dateFormat: 'dd.MM.yyyy',
        numberFormat: {},
    },
    'hu-HU': {
        flag: '🇭🇺',
        name: 'Magyar',
        dateFormat: 'yyyy.MM.dd',
        numberFormat: {},
    },
    'ro-RO': {
        flag: '🇷🇴',
        name: 'Română',
        dateFormat: 'dd.MM.yyyy',
        numberFormat: {},
    },
    'bg-BG': {
        flag: '🇧🇬',
        name: 'Български',
        dateFormat: 'dd.MM.yyyy',
        numberFormat: {},
    },
    'hr-HR': {
        flag: '🇭🇷',
        name: 'Hrvatski',
        dateFormat: 'dd.MM.yyyy',
        numberFormat: {},
    },
    'sl-SI': {
        flag: '🇸🇮',
        name: 'Slovenščina',
        dateFormat: 'dd.MM.yyyy',
        numberFormat: {},
    },
    'et-EE': {
        flag: '🇪🇪',
        name: 'Eesti',
        dateFormat: 'dd.MM.yyyy',
        numberFormat: {},
    },
    'lv-LV': {
        flag: '🇱🇻',
        name: 'Latviešu',
        dateFormat: 'dd.MM.yyyy',
        numberFormat: {},
    },
    'lt-LT': {
        flag: '🇱🇹',
        name: 'Lietuvių',
        dateFormat: 'yyyy-MM-dd',
        numberFormat: {},
    },
    'mt-MT': {
        flag: '🇲🇹',
        name: 'Malti',
        dateFormat: 'dd/MM/yyyy',
        numberFormat: {},
    },
    'tr-TR': {
        flag: '🇹🇷',
        name: 'Türkçe',
        dateFormat: 'dd.MM.yyyy',
        numberFormat: {},
    },
    'el-GR': {
        flag: '🇬🇷',
        name: 'Ελληνικά',
        dateFormat: 'dd/MM/yyyy',
        numberFormat: {},
    },
    'mk-MK': {
        flag: '🇲🇰',
        name: 'Македонски',
        dateFormat: 'dd.MM.yyyy',
        numberFormat: {},
    },
    'al-AL': {
        flag: '🇦🇱',
        name: 'Shqip',
        dateFormat: 'dd.MM.yyyy',
        numberFormat: {},
    },
    'me-ME': {
        flag: '🇲🇪',
        name: 'Crnogorski',
        dateFormat: 'dd.MM.yyyy',
        numberFormat: {},
    },
};
/**
 * Load messages for a specific locale
 */
async function loadMessages(locale) {
    // Return cached messages if available
    if (messageCache[locale]) {
        return messageCache[locale];
    }
    try {
        // Dynamically import the locale file
        const messages = await Promise.resolve(`${`../locales/${locale}.json`}`).then(s => __importStar(require(s)));
        messageCache[locale] = messages.default || messages;
        return messageCache[locale];
    }
    catch (error) {
        console.warn(`Failed to load locale ${locale}, falling back to en-US`, error);
        // Try to load en-US as fallback
        if (locale !== 'en-US' && !messageCache['en-US']) {
            try {
                const fallback = await Promise.resolve().then(() => __importStar(require(`../locales/en-US.json`)));
                messageCache['en-US'] = fallback.default || fallback;
            }
            catch (fallbackError) {
                console.error('Failed to load fallback locale en-US', fallbackError);
                messageCache['en-US'] = {};
            }
        }
        return messageCache['en-US'] || {};
    }
}
/**
 * i18n hook with NATO locale support
 */
function useI18n() {
    const [locale, setLocale] = (0, react_1.useState)(() => {
        const stored = localStorage.getItem('locale');
        return stored && stored in LOCALE_CONFIGS ? stored : 'en-US';
    });
    const [messages, setMessages] = (0, react_1.useState)({});
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    // Load messages for current locale
    (0, react_1.useEffect)(() => {
        let mounted = true;
        setIsLoading(true);
        loadMessages(locale).then((loadedMessages) => {
            if (mounted) {
                setMessages(loadedMessages);
                setIsLoading(false);
            }
        });
        return () => {
            mounted = false;
        };
    }, [locale]);
    // Persist locale preference
    (0, react_1.useEffect)(() => {
        localStorage.setItem('locale', locale);
        // Update HTML lang attribute for accessibility
        document.documentElement.lang = locale;
    }, [locale]);
    const t = (0, react_1.useMemo)(() => {
        return (key, params) => {
            const keys = key.split('.');
            let value = messages;
            for (const k of keys) {
                value = value?.[k];
            }
            if (typeof value !== 'string') {
                console.warn(`Translation key "${key}" not found`);
                return key;
            }
            // Simple parameter interpolation
            if (params) {
                return value.replace(/\{(\w+)\}/g, (match, param) => {
                    return params[param]?.toString() || match;
                });
            }
            return value;
        };
    }, [messages]);
    const formatDate = (0, react_1.useMemo)(() => {
        const config = LOCALE_CONFIGS[locale];
        return (date) => {
            const d = typeof date === 'string' ? new Date(date) : date;
            return d.toLocaleDateString(locale, {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            });
        };
    }, [locale]);
    const formatNumber = (0, react_1.useMemo)(() => {
        const config = LOCALE_CONFIGS[locale];
        return (num) => {
            return num.toLocaleString(locale, config.numberFormat);
        };
    }, [locale]);
    const formatCurrency = (0, react_1.useMemo)(() => {
        return (amount, currency = 'EUR') => {
            return amount.toLocaleString(locale, {
                style: 'currency',
                currency,
            });
        };
    }, [locale]);
    return {
        locale,
        setLocale,
        t,
        formatDate,
        formatNumber,
        formatCurrency,
        isLoading,
        availableLocales: Object.entries(LOCALE_CONFIGS).map(([code, config]) => ({
            code: code,
            name: config.name,
            flag: config.flag,
        })),
    };
}
