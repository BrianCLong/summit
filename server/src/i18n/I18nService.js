"use strict";
/**
 * Internationalization Service
 *
 * Provides multi-language support, locale detection, and regional compliance.
 *
 * SOC 2 Controls: CC6.1 | GDPR Article 12
 *
 * @module i18n/I18nService
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.i18nService = exports.I18nService = void 0;
const crypto_1 = require("crypto");
const database_js_1 = require("../config/database.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const data_envelope_js_1 = require("../types/data-envelope.js");
/**
 * Default i18n configuration
 */
const DEFAULT_CONFIG = {
    defaultLocale: 'en-US',
    supportedLocales: ['en-US', 'en-GB', 'es-ES', 'de-DE', 'fr-FR', 'ja-JP', 'pt-BR'],
    fallbackLocale: 'en-US',
    autoDetect: true,
    namespaces: ['common', 'auth', 'dashboard', 'policies', 'analytics', 'plugins', 'settings', 'compliance', 'governance', 'errors', 'onboarding', 'support'],
    loadPath: '/locales/{{lng}}/{{ns}}.json',
    cacheTTL: 3600000, // 1 hour
    missingKeyBehavior: 'fallback',
    debug: false,
};
/**
 * Locale configurations
 */
const LOCALE_CONFIGS = new Map([
    ['en-US', {
            code: 'en-US',
            name: 'English (United States)',
            nativeName: 'English (United States)',
            direction: 'ltr',
            dateFormat: 'MM/DD/YYYY',
            timeFormat: 'h:mm A',
            numberFormat: { decimalSeparator: '.', thousandsSeparator: ',', decimalPlaces: 2 },
            currencyCode: 'USD',
            enabled: true,
            completeness: 100,
        }],
    ['en-GB', {
            code: 'en-GB',
            name: 'English (United Kingdom)',
            nativeName: 'English (United Kingdom)',
            direction: 'ltr',
            dateFormat: 'DD/MM/YYYY',
            timeFormat: 'HH:mm',
            numberFormat: { decimalSeparator: '.', thousandsSeparator: ',', decimalPlaces: 2 },
            currencyCode: 'GBP',
            enabled: true,
            completeness: 100,
        }],
    ['es-ES', {
            code: 'es-ES',
            name: 'Spanish (Spain)',
            nativeName: 'Español (España)',
            direction: 'ltr',
            dateFormat: 'DD/MM/YYYY',
            timeFormat: 'HH:mm',
            numberFormat: { decimalSeparator: ',', thousandsSeparator: '.', decimalPlaces: 2 },
            currencyCode: 'EUR',
            enabled: true,
            completeness: 85,
        }],
    ['de-DE', {
            code: 'de-DE',
            name: 'German (Germany)',
            nativeName: 'Deutsch (Deutschland)',
            direction: 'ltr',
            dateFormat: 'DD.MM.YYYY',
            timeFormat: 'HH:mm',
            numberFormat: { decimalSeparator: ',', thousandsSeparator: '.', decimalPlaces: 2 },
            currencyCode: 'EUR',
            enabled: true,
            completeness: 80,
        }],
    ['fr-FR', {
            code: 'fr-FR',
            name: 'French (France)',
            nativeName: 'Français (France)',
            direction: 'ltr',
            dateFormat: 'DD/MM/YYYY',
            timeFormat: 'HH:mm',
            numberFormat: { decimalSeparator: ',', thousandsSeparator: ' ', decimalPlaces: 2 },
            currencyCode: 'EUR',
            enabled: true,
            completeness: 75,
        }],
    ['ja-JP', {
            code: 'ja-JP',
            name: 'Japanese (Japan)',
            nativeName: '日本語 (日本)',
            direction: 'ltr',
            dateFormat: 'YYYY/MM/DD',
            timeFormat: 'HH:mm',
            numberFormat: { decimalSeparator: '.', thousandsSeparator: ',', decimalPlaces: 0 },
            currencyCode: 'JPY',
            enabled: true,
            completeness: 70,
        }],
    ['pt-BR', {
            code: 'pt-BR',
            name: 'Portuguese (Brazil)',
            nativeName: 'Português (Brasil)',
            direction: 'ltr',
            dateFormat: 'DD/MM/YYYY',
            timeFormat: 'HH:mm',
            numberFormat: { decimalSeparator: ',', thousandsSeparator: '.', decimalPlaces: 2 },
            currencyCode: 'BRL',
            enabled: true,
            completeness: 65,
        }],
    ['ar-SA', {
            code: 'ar-SA',
            name: 'Arabic (Saudi Arabia)',
            nativeName: 'العربية (السعودية)',
            direction: 'rtl',
            dateFormat: 'DD/MM/YYYY',
            timeFormat: 'HH:mm',
            numberFormat: { decimalSeparator: '٫', thousandsSeparator: '٬', decimalPlaces: 2 },
            currencyCode: 'SAR',
            enabled: false, // Not yet fully translated
            completeness: 40,
        }],
]);
/**
 * Regional compliance configurations
 */
const REGIONAL_COMPLIANCE = new Map([
    ['EU', {
            region: 'EU',
            locales: ['en-GB', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'nl-NL'],
            complianceFrameworks: [
                { id: 'gdpr', name: 'GDPR', region: 'EU', requirements: ['consent', 'data-portability', 'right-to-erasure', 'dpo'], effectiveDate: new Date('2018-05-25') },
            ],
            dataResidencyRequired: true,
            dataResidencyRegions: ['eu-west-1', 'eu-central-1'],
            consentRequirements: {
                explicitConsentRequired: true,
                granularConsentRequired: true,
                consentAge: 16,
                parentalConsentRequired: true,
                withdrawalSupported: true,
                purposes: [
                    { id: 'essential', name: 'Essential Services', description: 'Required for platform operation', required: true, defaultValue: true },
                    { id: 'analytics', name: 'Analytics', description: 'Usage analytics and improvement', required: false, defaultValue: false },
                    { id: 'marketing', name: 'Marketing', description: 'Marketing communications', required: false, defaultValue: false },
                ],
            },
            dataRetentionPolicy: {
                defaultRetentionDays: 365,
                minRetentionDays: 30,
                maxRetentionDays: 2555, // ~7 years
                deletionMethod: 'hard',
                auditRetentionDays: 2555,
            },
            specialCategories: ['health', 'biometric', 'genetic', 'political', 'religious', 'sexual_orientation'],
        }],
    ['BR', {
            region: 'BR',
            locales: ['pt-BR'],
            complianceFrameworks: [
                { id: 'lgpd', name: 'LGPD', region: 'BR', requirements: ['consent', 'data-portability', 'right-to-erasure', 'dpo'], effectiveDate: new Date('2020-09-18') },
            ],
            dataResidencyRequired: false,
            dataResidencyRegions: ['sa-east-1'],
            consentRequirements: {
                explicitConsentRequired: true,
                granularConsentRequired: true,
                consentAge: 18,
                parentalConsentRequired: true,
                withdrawalSupported: true,
                purposes: [
                    { id: 'essential', name: 'Serviços Essenciais', description: 'Necessário para operação', required: true, defaultValue: true },
                    { id: 'analytics', name: 'Análise', description: 'Análise de uso', required: false, defaultValue: false },
                ],
            },
            dataRetentionPolicy: {
                defaultRetentionDays: 365,
                minRetentionDays: 30,
                maxRetentionDays: 1825, // 5 years
                deletionMethod: 'hard',
                auditRetentionDays: 1825,
            },
            specialCategories: ['health', 'biometric', 'genetic', 'political', 'religious'],
        }],
    ['US', {
            region: 'US',
            locales: ['en-US'],
            complianceFrameworks: [
                { id: 'ccpa', name: 'CCPA', region: 'US-CA', requirements: ['disclosure', 'opt-out', 'non-discrimination'], effectiveDate: new Date('2020-01-01') },
                { id: 'hipaa', name: 'HIPAA', region: 'US', requirements: ['phi-protection', 'access-controls', 'audit-logging'], effectiveDate: new Date('1996-08-21') },
            ],
            dataResidencyRequired: false,
            dataResidencyRegions: ['us-east-1', 'us-west-2'],
            consentRequirements: {
                explicitConsentRequired: false,
                granularConsentRequired: false,
                consentAge: 13,
                parentalConsentRequired: true,
                withdrawalSupported: true,
                purposes: [
                    { id: 'essential', name: 'Essential Services', description: 'Required for platform operation', required: true, defaultValue: true },
                    { id: 'analytics', name: 'Analytics', description: 'Usage analytics', required: false, defaultValue: true },
                ],
            },
            dataRetentionPolicy: {
                defaultRetentionDays: 730, // 2 years
                minRetentionDays: 30,
                maxRetentionDays: 2555,
                deletionMethod: 'soft',
                auditRetentionDays: 2555,
            },
            specialCategories: ['health'],
        }],
]);
/**
 * Internationalization Service
 */
class I18nService {
    static instance;
    config;
    translationCache;
    userPreferencesCache;
    constructor() {
        this.config = DEFAULT_CONFIG;
        this.translationCache = new Map();
        this.userPreferencesCache = new Map();
        this.initializeDefaultTranslations();
    }
    static getInstance() {
        if (!I18nService.instance) {
            I18nService.instance = new I18nService();
        }
        return I18nService.instance;
    }
    /**
     * Get all supported locales
     */
    getSupportedLocales() {
        const locales = Array.from(LOCALE_CONFIGS.values()).filter((l) => l.enabled);
        return this.wrapInEnvelope(locales, 'get_locales');
    }
    /**
     * Get locale configuration
     */
    getLocaleConfig(locale) {
        return LOCALE_CONFIGS.get(locale) || null;
    }
    /**
     * Detect locale from request
     */
    detectLocale(headers, cookies, userPreferences, tenantSettings) {
        const sources = [];
        let detectedLocale = this.config.defaultLocale;
        let confidence = 0;
        // Priority 1: User preferences (highest)
        if (userPreferences?.preferredLocale) {
            sources.push({
                type: 'user_preference',
                value: userPreferences.preferredLocale,
                priority: 100,
            });
            if (this.isLocaleSupported(userPreferences.preferredLocale)) {
                detectedLocale = userPreferences.preferredLocale;
                confidence = 1.0;
            }
        }
        // Priority 2: Cookie
        if (cookies.locale) {
            sources.push({
                type: 'cookie',
                value: cookies.locale,
                priority: 80,
            });
            if (confidence < 0.8 && this.isLocaleSupported(cookies.locale)) {
                detectedLocale = cookies.locale;
                confidence = 0.8;
            }
        }
        // Priority 3: Accept-Language header
        const acceptLanguage = headers['accept-language'];
        if (acceptLanguage) {
            const parsed = this.parseAcceptLanguage(acceptLanguage);
            if (parsed.length > 0) {
                sources.push({
                    type: 'header',
                    value: parsed[0],
                    priority: 60,
                });
                if (confidence < 0.6 && this.isLocaleSupported(parsed[0])) {
                    detectedLocale = parsed[0];
                    confidence = 0.6;
                }
            }
        }
        // Priority 4: Tenant default
        if (tenantSettings?.defaultLocale) {
            sources.push({
                type: 'tenant_default',
                value: tenantSettings.defaultLocale,
                priority: 40,
            });
            if (confidence < 0.4 && this.isLocaleSupported(tenantSettings.defaultLocale)) {
                detectedLocale = tenantSettings.defaultLocale;
                confidence = 0.4;
            }
        }
        return {
            detectedLocale,
            confidence,
            sources,
            fallbackApplied: confidence < 0.4,
        };
    }
    /**
     * Translate a key
     */
    translate(key, locale, namespace = 'common', interpolations, count) {
        // Get translation bundle
        const bundle = this.getTranslationBundle(locale, namespace);
        if (!bundle) {
            return this.handleMissingKey(key, locale, namespace);
        }
        // Get translation value
        let value = bundle.translations[key];
        if (!value) {
            return this.handleMissingKey(key, locale, namespace);
        }
        // Handle plural forms
        if (typeof value === 'object' && count !== undefined) {
            value = this.resolvePluralForm(value, count, locale);
        }
        // Apply interpolations
        if (typeof value === 'string' && interpolations) {
            value = this.applyInterpolations(value, interpolations);
        }
        return value;
    }
    /**
     * Localize content
     */
    async localize(request) {
        const sourceLocale = request.sourceLocale || 'en-US';
        let content = request.content;
        let fallbackUsed = false;
        let fallbackLocale;
        const missingKeys = [];
        if (typeof content === 'string') {
            // Simple string translation
            const translated = this.translate(content, request.targetLocale, request.namespace || 'common', request.interpolations);
            if (translated === content && request.targetLocale !== sourceLocale) {
                // Fallback was used
                fallbackUsed = true;
                fallbackLocale = this.config.fallbackLocale;
            }
            content = translated;
        }
        else if (typeof content === 'object') {
            // Recursive object translation
            content = await this.localizeObject(content, request.targetLocale, request.namespace || 'common', missingKeys);
            fallbackUsed = missingKeys.length > 0;
            if (fallbackUsed) {
                fallbackLocale = this.config.fallbackLocale;
            }
        }
        const response = {
            content,
            locale: request.targetLocale,
            fallbackUsed,
            fallbackLocale,
            missingKeys: missingKeys.length > 0 ? missingKeys : undefined,
            governanceVerdict: this.createGovernanceVerdict('localize'),
        };
        return this.wrapInEnvelope(response, 'localize');
    }
    /**
     * Format date for locale
     */
    formatDate(date, options) {
        try {
            const intlOptions = {
                dateStyle: options.dateStyle,
                timeStyle: options.timeStyle,
                timeZone: options.timezone,
                hour12: options.hour12,
            };
            return new Intl.DateTimeFormat(options.locale, intlOptions).format(date);
        }
        catch (error) {
            logger_js_1.default.error('Error formatting date', { error, locale: options.locale });
            return date.toISOString();
        }
    }
    /**
     * Format number for locale
     */
    formatNumber(value, locale) {
        try {
            return new Intl.NumberFormat(locale).format(value);
        }
        catch (error) {
            logger_js_1.default.error('Error formatting number', { error, locale });
            return value.toString();
        }
    }
    /**
     * Format currency for locale
     */
    formatCurrency(value, options) {
        try {
            return new Intl.NumberFormat(options.locale, {
                style: 'currency',
                currency: options.currency,
                currencyDisplay: options.display,
                minimumFractionDigits: options.minimumFractionDigits,
                maximumFractionDigits: options.maximumFractionDigits,
            }).format(value);
        }
        catch (error) {
            logger_js_1.default.error('Error formatting currency', { error, locale: options.locale });
            return `${options.currency} ${value}`;
        }
    }
    /**
     * Get regional compliance configuration
     */
    getRegionalCompliance(region) {
        const config = REGIONAL_COMPLIANCE.get(region) || null;
        return this.wrapInEnvelope(config, 'get_regional_compliance');
    }
    /**
     * Get compliance requirements for a locale
     */
    getComplianceForLocale(locale) {
        for (const [, config] of REGIONAL_COMPLIANCE) {
            if (config.locales.includes(locale)) {
                return config;
            }
        }
        return null;
    }
    /**
     * Get translation status
     */
    async getTranslationStatus(locale) {
        const localeConfig = LOCALE_CONFIGS.get(locale);
        const namespaceStatuses = new Map();
        let totalKeys = 0;
        let translatedKeys = 0;
        for (const namespace of this.config.namespaces) {
            const bundle = this.getTranslationBundle(locale, namespace);
            const defaultBundle = this.getTranslationBundle('en-US', namespace);
            const nsTotal = Object.keys(defaultBundle?.translations || {}).length;
            const nsTranslated = Object.keys(bundle?.translations || {}).length;
            totalKeys += nsTotal;
            translatedKeys += nsTranslated;
            namespaceStatuses.set(namespace, {
                namespace,
                totalKeys: nsTotal,
                translatedKeys: nsTranslated,
                completeness: nsTotal > 0 ? nsTranslated / nsTotal : 0,
            });
        }
        const status = {
            locale,
            totalKeys,
            translatedKeys,
            verifiedKeys: Math.floor(translatedKeys * 0.9), // Simplified
            completeness: localeConfig?.completeness || (totalKeys > 0 ? translatedKeys / totalKeys : 0),
            byNamespace: namespaceStatuses,
            lastUpdated: new Date(),
        };
        return this.wrapInEnvelope(status, 'get_translation_status');
    }
    /**
     * Set user locale preferences
     */
    async setUserLocalePreferences(userId, tenantId, preferences) {
        const pool = (0, database_js_1.getPostgresPool)();
        if (!pool)
            throw new Error('Database not available');
        await pool.query(`INSERT INTO user_locale_preferences (
        user_id, tenant_id, preferred_locale, fallback_locale, timezone,
        date_format, time_format, number_format, currency_display, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (user_id, tenant_id) DO UPDATE SET
        preferred_locale = COALESCE($3, user_locale_preferences.preferred_locale),
        fallback_locale = COALESCE($4, user_locale_preferences.fallback_locale),
        timezone = COALESCE($5, user_locale_preferences.timezone),
        date_format = COALESCE($6, user_locale_preferences.date_format),
        time_format = COALESCE($7, user_locale_preferences.time_format),
        number_format = COALESCE($8, user_locale_preferences.number_format),
        currency_display = COALESCE($9, user_locale_preferences.currency_display),
        updated_at = NOW()`, [
            userId,
            tenantId,
            preferences.preferredLocale,
            preferences.fallbackLocale,
            preferences.timezone,
            preferences.dateFormat,
            preferences.timeFormat,
            preferences.numberFormat ? JSON.stringify(preferences.numberFormat) : null,
            preferences.currencyDisplay,
        ]);
        // Clear cache
        this.userPreferencesCache.delete(`${tenantId}:${userId}`);
    }
    /**
     * Get user locale preferences
     */
    async getUserLocalePreferences(userId, tenantId) {
        const cacheKey = `${tenantId}:${userId}`;
        if (this.userPreferencesCache.has(cacheKey)) {
            return this.userPreferencesCache.get(cacheKey);
        }
        const pool = (0, database_js_1.getPostgresPool)();
        if (!pool)
            return null;
        const result = await pool.query('SELECT * FROM user_locale_preferences WHERE user_id = $1 AND tenant_id = $2', [userId, tenantId]);
        if (result.rowCount === 0)
            return null;
        const row = result.rows[0];
        const preferences = {
            userId: row.user_id,
            tenantId: row.tenant_id,
            preferredLocale: row.preferred_locale,
            fallbackLocale: row.fallback_locale,
            dateFormat: row.date_format,
            timeFormat: row.time_format,
            timezone: row.timezone,
            numberFormat: row.number_format,
            currencyDisplay: row.currency_display,
            updatedAt: row.updated_at,
        };
        this.userPreferencesCache.set(cacheKey, preferences);
        return preferences;
    }
    // Private helper methods
    isLocaleSupported(locale) {
        return this.config.supportedLocales.includes(locale);
    }
    parseAcceptLanguage(header) {
        return header
            .split(',')
            .map((lang) => {
            const [locale, quality] = lang.trim().split(';q=');
            return { locale: locale.trim(), quality: quality ? parseFloat(quality) : 1 };
        })
            .sort((a, b) => b.quality - a.quality)
            .map((l) => l.locale);
    }
    getTranslationBundle(locale, namespace) {
        const cacheKey = `${locale}:${namespace}`;
        return this.translationCache.get(cacheKey) || null;
    }
    handleMissingKey(key, locale, namespace) {
        if (this.config.debug) {
            logger_js_1.default.warn('Missing translation key', { key, locale, namespace });
        }
        switch (this.config.missingKeyBehavior) {
            case 'fallback':
                const fallbackBundle = this.getTranslationBundle(this.config.fallbackLocale, namespace);
                const fallbackValue = fallbackBundle?.translations[key];
                return typeof fallbackValue === 'string' ? fallbackValue : key;
            case 'empty':
                return '';
            case 'key':
            default:
                return key;
        }
    }
    resolvePluralForm(forms, count, locale) {
        // Simplified plural resolution
        if (count === 0 && forms.zero)
            return forms.zero;
        if (count === 1)
            return forms.one;
        if (count === 2 && forms.two)
            return forms.two;
        return forms.other;
    }
    applyInterpolations(value, interpolations) {
        let result = value;
        for (const [key, val] of Object.entries(interpolations)) {
            result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(val));
        }
        return result;
    }
    async localizeObject(obj, locale, namespace, missingKeys) {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                const translated = this.translate(key, locale, namespace);
                if (translated === key) {
                    missingKeys.push(key);
                }
                result[key] = translated;
            }
            else if (typeof value === 'object' && value !== null) {
                result[key] = await this.localizeObject(value, locale, namespace, missingKeys);
            }
            else {
                result[key] = value;
            }
        }
        return result;
    }
    createGovernanceVerdict(operation) {
        return {
            verdictId: (0, crypto_1.randomUUID)(),
            policyId: `i18n_${operation}`,
            result: data_envelope_js_1.GovernanceResult.ALLOW,
            decidedAt: new Date(),
            reason: 'Localization operation permitted',
            evaluator: 'i18n-service',
        };
    }
    wrapInEnvelope(data, operation) {
        return (0, data_envelope_js_1.createDataEnvelope)(data, {
            source: 'i18n-service',
            actor: 'system',
            version: '3.1.0',
            classification: data_envelope_js_1.DataClassification.INTERNAL,
            governanceVerdict: this.createGovernanceVerdict(operation),
        });
    }
    initializeDefaultTranslations() {
        // Initialize common translations for en-US
        const commonTranslations = {
            locale: 'en-US',
            namespace: 'common',
            version: '1.0.0',
            lastUpdated: new Date(),
            translations: {
                'app.name': 'Summit',
                'app.tagline': 'AI-Augmented Intelligence Platform',
                'nav.dashboard': 'Dashboard',
                'nav.search': 'Search',
                'nav.policies': 'Policies',
                'nav.analytics': 'Analytics',
                'nav.plugins': 'Plugins',
                'nav.settings': 'Settings',
                'nav.support': 'Support',
                'actions.save': 'Save',
                'actions.cancel': 'Cancel',
                'actions.delete': 'Delete',
                'actions.edit': 'Edit',
                'actions.create': 'Create',
                'actions.search': 'Search',
                'actions.filter': 'Filter',
                'actions.export': 'Export',
                'actions.import': 'Import',
                'status.loading': 'Loading...',
                'status.error': 'An error occurred',
                'status.success': 'Operation successful',
                'governance.approved': 'Approved',
                'governance.denied': 'Denied',
                'governance.pending': 'Pending Review',
            },
        };
        this.translationCache.set('en-US:common', commonTranslations);
        // Initialize error translations
        const errorTranslations = {
            locale: 'en-US',
            namespace: 'errors',
            version: '1.0.0',
            lastUpdated: new Date(),
            translations: {
                'error.generic': 'An unexpected error occurred. Please try again.',
                'error.network': 'Network error. Please check your connection.',
                'error.unauthorized': 'You are not authorized to perform this action.',
                'error.forbidden': 'Access denied.',
                'error.notFound': 'The requested resource was not found.',
                'error.validation': 'Please check your input and try again.',
                'error.governance.denied': 'This action was denied by governance policy.',
                'error.governance.review': 'This action requires review before proceeding.',
            },
        };
        this.translationCache.set('en-US:errors', errorTranslations);
        // Initialize onboarding translations
        const onboardingTranslations = {
            locale: 'en-US',
            namespace: 'onboarding',
            version: '1.0.0',
            lastUpdated: new Date(),
            translations: {
                'onboarding.welcome': 'Welcome to Summit',
                'onboarding.getStarted': 'Get Started',
                'onboarding.skip': 'Skip for now',
                'onboarding.next': 'Next',
                'onboarding.previous': 'Previous',
                'onboarding.complete': 'Complete',
                'onboarding.progress': 'Step {{current}} of {{total}}',
            },
        };
        this.translationCache.set('en-US:onboarding', onboardingTranslations);
    }
}
exports.I18nService = I18nService;
exports.i18nService = I18nService.getInstance();
