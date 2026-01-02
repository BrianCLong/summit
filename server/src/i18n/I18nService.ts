/**
 * Internationalization Service
 *
 * Provides multi-language support, locale detection, and regional compliance.
 *
 * SOC 2 Controls: CC6.1 | GDPR Article 12
 *
 * @module i18n/I18nService
 */

import { randomUUID } from 'crypto';
import { getPostgresPool } from '../config/database.js';
import logger from '../utils/logger.js';
import {
  SupportedLocale,
  TextDirection,
  TranslationNamespace,
  LocaleConfig,
  TranslationBundle,
  TranslationEntry,
  UserLocalePreferences,
  TenantLocaleSettings,
  RegionalComplianceConfig,
  LocalizeRequest,
  LocalizeResponse,
  TranslationStatus,
  LocaleDetectionResult,
  LocaleSource,
  DateTimeFormatOptions,
  CurrencyFormatOptions,
  I18nConfig,
  PluralForms,
} from './types.js';
import {
  DataEnvelope,
  GovernanceVerdict,
  GovernanceResult,
  DataClassification,
  createDataEnvelope,
} from '../types/data-envelope.js';

/**
 * Default i18n configuration
 */
const DEFAULT_CONFIG: I18nConfig = {
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
const LOCALE_CONFIGS: Map<SupportedLocale, LocaleConfig> = new Map([
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
const REGIONAL_COMPLIANCE: Map<string, RegionalComplianceConfig> = new Map([
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
export class I18nService {
  private static instance: I18nService;
  private config: I18nConfig;
  private translationCache: Map<string, TranslationBundle>;
  private userPreferencesCache: Map<string, UserLocalePreferences>;

  private constructor() {
    this.config = DEFAULT_CONFIG;
    this.translationCache = new Map();
    this.userPreferencesCache = new Map();
    this.initializeDefaultTranslations();
  }

  public static getInstance(): I18nService {
    if (!I18nService.instance) {
      I18nService.instance = new I18nService();
    }
    return I18nService.instance;
  }

  /**
   * Get all supported locales
   */
  getSupportedLocales(): DataEnvelope<LocaleConfig[]> {
    const locales = Array.from(LOCALE_CONFIGS.values()).filter((l) => l.enabled);
    return this.wrapInEnvelope(locales, 'get_locales');
  }

  /**
   * Get locale configuration
   */
  getLocaleConfig(locale: SupportedLocale): LocaleConfig | null {
    return LOCALE_CONFIGS.get(locale) || null;
  }

  /**
   * Detect locale from request
   */
  detectLocale(
    headers: Record<string, string>,
    cookies: Record<string, string>,
    userPreferences?: UserLocalePreferences,
    tenantSettings?: TenantLocaleSettings
  ): LocaleDetectionResult {
    const sources: LocaleSource[] = [];
    let detectedLocale: SupportedLocale = this.config.defaultLocale;
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
      if (confidence < 0.8 && this.isLocaleSupported(cookies.locale as SupportedLocale)) {
        detectedLocale = cookies.locale as SupportedLocale;
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
        if (confidence < 0.6 && this.isLocaleSupported(parsed[0] as SupportedLocale)) {
          detectedLocale = parsed[0] as SupportedLocale;
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
  translate(
    key: string,
    locale: SupportedLocale,
    namespace: TranslationNamespace = 'common',
    interpolations?: Record<string, string | number>,
    count?: number
  ): string {
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
      value = this.resolvePluralForm(value as PluralForms, count, locale);
    }

    // Apply interpolations
    if (typeof value === 'string' && interpolations) {
      value = this.applyInterpolations(value, interpolations);
    }

    return value as string;
  }

  /**
   * Localize content
   */
  async localize(request: LocalizeRequest): Promise<DataEnvelope<LocalizeResponse>> {
    const sourceLocale = request.sourceLocale || 'en-US';
    let content = request.content;
    let fallbackUsed = false;
    let fallbackLocale: SupportedLocale | undefined;
    const missingKeys: string[] = [];

    if (typeof content === 'string') {
      // Simple string translation
      const translated = this.translate(
        content,
        request.targetLocale,
        request.namespace || 'common',
        request.interpolations,
      );

      if (translated === content && request.targetLocale !== sourceLocale) {
        // Fallback was used
        fallbackUsed = true;
        fallbackLocale = this.config.fallbackLocale;
      }

      content = translated;
    } else if (typeof content === 'object') {
      // Recursive object translation
      content = await this.localizeObject(
        content as Record<string, unknown>,
        request.targetLocale,
        request.namespace || 'common',
        missingKeys
      );
      fallbackUsed = missingKeys.length > 0;
      if (fallbackUsed) {
        fallbackLocale = this.config.fallbackLocale;
      }
    }

    const response: LocalizeResponse = {
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
  formatDate(date: Date, options: DateTimeFormatOptions): string {
    try {
      const intlOptions: Intl.DateTimeFormatOptions = {
        dateStyle: options.dateStyle,
        timeStyle: options.timeStyle,
        timeZone: options.timezone,
        hour12: options.hour12,
      };

      return new Intl.DateTimeFormat(options.locale, intlOptions).format(date);
    } catch (error: any) {
      logger.error('Error formatting date', { error, locale: options.locale });
      return date.toISOString();
    }
  }

  /**
   * Format number for locale
   */
  formatNumber(value: number, locale: SupportedLocale): string {
    try {
      return new Intl.NumberFormat(locale).format(value);
    } catch (error: any) {
      logger.error('Error formatting number', { error, locale });
      return value.toString();
    }
  }

  /**
   * Format currency for locale
   */
  formatCurrency(value: number, options: CurrencyFormatOptions): string {
    try {
      return new Intl.NumberFormat(options.locale, {
        style: 'currency',
        currency: options.currency,
        currencyDisplay: options.display,
        minimumFractionDigits: options.minimumFractionDigits,
        maximumFractionDigits: options.maximumFractionDigits,
      }).format(value);
    } catch (error: any) {
      logger.error('Error formatting currency', { error, locale: options.locale });
      return `${options.currency} ${value}`;
    }
  }

  /**
   * Get regional compliance configuration
   */
  getRegionalCompliance(region: string): DataEnvelope<RegionalComplianceConfig | null> {
    const config = REGIONAL_COMPLIANCE.get(region) || null;
    return this.wrapInEnvelope(config, 'get_regional_compliance');
  }

  /**
   * Get compliance requirements for a locale
   */
  getComplianceForLocale(locale: SupportedLocale): RegionalComplianceConfig | null {
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
  async getTranslationStatus(locale: SupportedLocale): Promise<DataEnvelope<TranslationStatus>> {
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

    const status: TranslationStatus = {
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
  async setUserLocalePreferences(
    userId: string,
    tenantId: string,
    preferences: Partial<UserLocalePreferences>
  ): Promise<void> {
    const pool = getPostgresPool();
    if (!pool) throw new Error('Database not available');

    await pool.query(
      `INSERT INTO user_locale_preferences (
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
        updated_at = NOW()`,
      [
        userId,
        tenantId,
        preferences.preferredLocale,
        preferences.fallbackLocale,
        preferences.timezone,
        preferences.dateFormat,
        preferences.timeFormat,
        preferences.numberFormat ? JSON.stringify(preferences.numberFormat) : null,
        preferences.currencyDisplay,
      ]
    );

    // Clear cache
    this.userPreferencesCache.delete(`${tenantId}:${userId}`);
  }

  /**
   * Get user locale preferences
   */
  async getUserLocalePreferences(
    userId: string,
    tenantId: string
  ): Promise<UserLocalePreferences | null> {
    const cacheKey = `${tenantId}:${userId}`;
    if (this.userPreferencesCache.has(cacheKey)) {
      return this.userPreferencesCache.get(cacheKey)!;
    }

    const pool = getPostgresPool();
    if (!pool) return null;

    const result = await pool.query(
      'SELECT * FROM user_locale_preferences WHERE user_id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );

    if (result.rowCount === 0) return null;

    const row = result.rows[0];
    const preferences: UserLocalePreferences = {
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

  private isLocaleSupported(locale: SupportedLocale): boolean {
    return this.config.supportedLocales.includes(locale);
  }

  private parseAcceptLanguage(header: string): string[] {
    return header
      .split(',')
      .map((lang) => {
        const [locale, quality] = lang.trim().split(';q=');
        return { locale: locale.trim(), quality: quality ? parseFloat(quality) : 1 };
      })
      .sort((a, b) => b.quality - a.quality)
      .map((l) => l.locale);
  }

  private getTranslationBundle(
    locale: SupportedLocale,
    namespace: TranslationNamespace
  ): TranslationBundle | null {
    const cacheKey = `${locale}:${namespace}`;
    return this.translationCache.get(cacheKey) || null;
  }

  private handleMissingKey(
    key: string,
    locale: SupportedLocale,
    namespace: TranslationNamespace
  ): string {
    if (this.config.debug) {
      logger.warn('Missing translation key', { key, locale, namespace });
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

  private resolvePluralForm(forms: PluralForms, count: number, locale: SupportedLocale): string {
    // Simplified plural resolution
    if (count === 0 && forms.zero) return forms.zero;
    if (count === 1) return forms.one;
    if (count === 2 && forms.two) return forms.two;
    return forms.other;
  }

  private applyInterpolations(
    value: string,
    interpolations: Record<string, string | number>
  ): string {
    let result = value;
    for (const [key, val] of Object.entries(interpolations)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(val));
    }
    return result;
  }

  private async localizeObject(
    obj: Record<string, unknown>,
    locale: SupportedLocale,
    namespace: TranslationNamespace,
    missingKeys: string[]
  ): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        const translated = this.translate(key, locale, namespace);
        if (translated === key) {
          missingKeys.push(key);
        }
        result[key] = translated;
      } else if (typeof value === 'object' && value !== null) {
        result[key] = await this.localizeObject(
          value as Record<string, unknown>,
          locale,
          namespace,
          missingKeys
        );
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private createGovernanceVerdict(operation: string): GovernanceVerdict {
    return {
      verdictId: randomUUID(),
      policyId: `i18n_${operation}`,
      result: GovernanceResult.ALLOW,
      decidedAt: new Date(),
      reason: 'Localization operation permitted',
      evaluator: 'i18n-service',
    };
  }

  private wrapInEnvelope<T>(data: T, operation: string): DataEnvelope<T> {
    return createDataEnvelope(data, {
      source: 'i18n-service',
      actor: 'system',
      version: '3.1.0',
      classification: DataClassification.INTERNAL,
      governanceVerdict: this.createGovernanceVerdict(operation),
    });
  }

  private initializeDefaultTranslations(): void {
    // Initialize common translations for en-US
    const commonTranslations: TranslationBundle = {
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
    const errorTranslations: TranslationBundle = {
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
    const onboardingTranslations: TranslationBundle = {
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

export const i18nService = I18nService.getInstance();
