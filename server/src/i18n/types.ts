/**
 * Internationalization (i18n) Types
 *
 * Types for multi-language support and regional compliance.
 *
 * SOC 2 Controls: CC6.1 | GDPR Article 12
 *
 * @module i18n/types
 */

import { DataClassification } from '../types/data-envelope.js';
import type { GovernanceVerdict } from '../types/data-envelope.js';

/**
 * Supported locale identifiers (BCP 47)
 */
export type SupportedLocale =
  | 'en-US'  // English (United States) - Default
  | 'en-GB'  // English (United Kingdom)
  | 'es-ES'  // Spanish (Spain)
  | 'es-MX'  // Spanish (Mexico)
  | 'de-DE'  // German (Germany)
  | 'fr-FR'  // French (France)
  | 'fr-CA'  // French (Canada)
  | 'ja-JP'  // Japanese (Japan)
  | 'pt-BR'  // Portuguese (Brazil)
  | 'zh-CN'  // Chinese (Simplified)
  | 'zh-TW'  // Chinese (Traditional)
  | 'ko-KR'  // Korean (Korea)
  | 'it-IT'  // Italian (Italy)
  | 'nl-NL'  // Dutch (Netherlands)
  | 'ru-RU'  // Russian (Russia)
  | 'ar-SA'; // Arabic (Saudi Arabia)

/**
 * Text direction
 */
export type TextDirection = 'ltr' | 'rtl';

/**
 * Translation namespace
 */
export type TranslationNamespace =
  | 'common'        // Common UI elements
  | 'auth'          // Authentication
  | 'dashboard'     // Dashboard
  | 'policies'      // Policy management
  | 'analytics'     // Analytics
  | 'plugins'       // Plugin marketplace
  | 'settings'      // Settings
  | 'compliance'    // Compliance
  | 'governance'    // Governance
  | 'errors'        // Error messages
  | 'onboarding'    // Onboarding
  | 'support';      // Support

/**
 * Locale configuration
 */
export interface LocaleConfig {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  direction: TextDirection;
  dateFormat: string;
  timeFormat: string;
  numberFormat: NumberFormatConfig;
  currencyCode: string;
  enabled: boolean;
  completeness: number; // Percentage of translations complete
}

/**
 * Number format configuration
 */
export interface NumberFormatConfig {
  decimalSeparator: string;
  thousandsSeparator: string;
  decimalPlaces: number;
}

/**
 * Translation entry
 */
export interface TranslationEntry {
  key: string;
  namespace: TranslationNamespace;
  value: string;
  pluralForms?: PluralForms;
  interpolations?: string[];
  context?: string;
  description?: string;
  lastUpdated: Date;
  verified: boolean;
}

/**
 * Plural forms for translations
 */
export interface PluralForms {
  zero?: string;
  one: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

/**
 * Translation bundle for a locale
 */
export interface TranslationBundle {
  locale: SupportedLocale;
  namespace: TranslationNamespace;
  translations: Record<string, string | PluralForms>;
  version: string;
  lastUpdated: Date;
}

/**
 * User locale preferences
 */
export interface UserLocalePreferences {
  userId: string;
  tenantId: string;
  preferredLocale: SupportedLocale;
  fallbackLocale: SupportedLocale;
  dateFormat?: string;
  timeFormat?: string;
  timezone: string;
  numberFormat?: NumberFormatConfig;
  currencyDisplay?: 'symbol' | 'code' | 'name';
  updatedAt: Date;
}

/**
 * Tenant locale settings
 */
export interface TenantLocaleSettings {
  tenantId: string;
  defaultLocale: SupportedLocale;
  enabledLocales: SupportedLocale[];
  fallbackLocale: SupportedLocale;
  autoDetect: boolean;
  customTranslations: Map<string, TranslationEntry>;
  updatedAt: Date;
}

/**
 * Regional compliance requirements
 */
export interface RegionalComplianceConfig {
  region: string;
  locales: SupportedLocale[];
  complianceFrameworks: ComplianceFramework[];
  dataResidencyRequired: boolean;
  dataResidencyRegions: string[];
  consentRequirements: ConsentRequirements;
  dataRetentionPolicy: DataRetentionPolicy;
  specialCategories: string[];
}

/**
 * Compliance framework reference
 */
export interface ComplianceFramework {
  id: string;
  name: string;
  region: string;
  requirements: string[];
  effectiveDate: Date;
}

/**
 * Consent requirements for a region
 */
export interface ConsentRequirements {
  explicitConsentRequired: boolean;
  granularConsentRequired: boolean;
  consentAge: number;
  parentalConsentRequired: boolean;
  withdrawalSupported: boolean;
  purposes: ConsentPurpose[];
}

/**
 * Consent purpose
 */
export interface ConsentPurpose {
  id: string;
  name: string;
  description: string;
  required: boolean;
  defaultValue: boolean;
}

/**
 * Data retention policy
 */
export interface DataRetentionPolicy {
  defaultRetentionDays: number;
  minRetentionDays: number;
  maxRetentionDays: number;
  deletionMethod: 'hard' | 'soft' | 'anonymize';
  auditRetentionDays: number;
}

/**
 * Localized content request
 */
export interface LocalizeRequest {
  content: string | Record<string, unknown>;
  targetLocale: SupportedLocale;
  sourceLocale?: SupportedLocale;
  namespace?: TranslationNamespace;
  interpolations?: Record<string, string | number>;
  context?: string;
}

/**
 * Localized content response
 */
export interface LocalizeResponse {
  content: string | Record<string, unknown>;
  locale: SupportedLocale;
  fallbackUsed: boolean;
  fallbackLocale?: SupportedLocale;
  missingKeys?: string[];
  governanceVerdict: GovernanceVerdict;
}

/**
 * Translation import/export format
 */
export interface TranslationExport {
  locale: SupportedLocale;
  namespaces: TranslationNamespace[];
  translations: Record<string, Record<string, string>>;
  exportedAt: Date;
  version: string;
}

/**
 * Translation status
 */
export interface TranslationStatus {
  locale: SupportedLocale;
  totalKeys: number;
  translatedKeys: number;
  verifiedKeys: number;
  completeness: number;
  byNamespace: Map<TranslationNamespace, NamespaceStatus>;
  lastUpdated: Date;
}

/**
 * Namespace translation status
 */
export interface NamespaceStatus {
  namespace: TranslationNamespace;
  totalKeys: number;
  translatedKeys: number;
  completeness: number;
}

/**
 * Locale detection result
 */
export interface LocaleDetectionResult {
  detectedLocale: SupportedLocale;
  confidence: number;
  sources: LocaleSource[];
  fallbackApplied: boolean;
}

/**
 * Locale detection source
 */
export interface LocaleSource {
  type: 'header' | 'cookie' | 'url' | 'user_preference' | 'tenant_default' | 'browser';
  value: string;
  priority: number;
}

/**
 * Date/time formatting options
 */
export interface DateTimeFormatOptions {
  locale: SupportedLocale;
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
  timezone?: string;
  calendar?: string;
  hour12?: boolean;
}

/**
 * Currency formatting options
 */
export interface CurrencyFormatOptions {
  locale: SupportedLocale;
  currency: string;
  display: 'symbol' | 'code' | 'name';
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * i18n configuration
 */
export interface I18nConfig {
  defaultLocale: SupportedLocale;
  supportedLocales: SupportedLocale[];
  fallbackLocale: SupportedLocale;
  autoDetect: boolean;
  namespaces: TranslationNamespace[];
  loadPath: string;
  cacheTTL: number;
  missingKeyBehavior: 'fallback' | 'key' | 'empty';
  debug: boolean;
}
