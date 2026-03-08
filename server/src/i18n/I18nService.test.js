"use strict";
/**
 * I18n Service Tests
 *
 * Tests for internationalization and regional compliance.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const I18nService_js_1 = require("./I18nService.js");
// Mock the database pool
globals_1.jest.mock('../config/database.js', () => ({
    getPostgresPool: globals_1.jest.fn(() => null),
}));
(0, globals_1.describe)('I18nService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = I18nService_js_1.I18nService.getInstance();
    });
    (0, globals_1.describe)('getSupportedLocales', () => {
        (0, globals_1.it)('should return list of supported locales', () => {
            const result = service.getSupportedLocales();
            (0, globals_1.expect)(result.data).toBeInstanceOf(Array);
            (0, globals_1.expect)(result.data.length).toBeGreaterThan(0);
            // Check that en-US is supported
            const enUS = result.data.find((l) => l.code === 'en-US');
            (0, globals_1.expect)(enUS).toBeDefined();
            (0, globals_1.expect)(enUS?.enabled).toBe(true);
        });
        (0, globals_1.it)('should include locale configuration details', () => {
            const result = service.getSupportedLocales();
            result.data.forEach((locale) => {
                (0, globals_1.expect)(locale.code).toBeDefined();
                (0, globals_1.expect)(locale.name).toBeDefined();
                (0, globals_1.expect)(locale.nativeName).toBeDefined();
                (0, globals_1.expect)(locale.direction).toMatch(/^(ltr|rtl)$/);
                (0, globals_1.expect)(locale.dateFormat).toBeDefined();
                (0, globals_1.expect)(locale.currencyCode).toBeDefined();
            });
        });
    });
    (0, globals_1.describe)('getLocaleConfig', () => {
        (0, globals_1.it)('should return config for valid locale', () => {
            const config = service.getLocaleConfig('en-US');
            (0, globals_1.expect)(config).toBeDefined();
            (0, globals_1.expect)(config?.code).toBe('en-US');
            (0, globals_1.expect)(config?.direction).toBe('ltr');
            (0, globals_1.expect)(config?.currencyCode).toBe('USD');
        });
        (0, globals_1.it)('should return null for unsupported locale', () => {
            const config = service.getLocaleConfig('xx-XX');
            (0, globals_1.expect)(config).toBeNull();
        });
        (0, globals_1.it)('should correctly identify RTL languages', () => {
            const arabicConfig = service.getLocaleConfig('ar-SA');
            if (arabicConfig) {
                (0, globals_1.expect)(arabicConfig.direction).toBe('rtl');
            }
        });
    });
    (0, globals_1.describe)('detectLocale', () => {
        (0, globals_1.it)('should detect locale from Accept-Language header', () => {
            const result = service.detectLocale({ 'accept-language': 'de-DE,de;q=0.9,en-US;q=0.8' }, {}, undefined, undefined);
            (0, globals_1.expect)(result.detectedLocale).toBe('de-DE');
            (0, globals_1.expect)(result.sources.some((s) => s.type === 'header')).toBe(true);
        });
        (0, globals_1.it)('should prefer user preferences over headers', () => {
            const result = service.detectLocale({ 'accept-language': 'de-DE' }, {}, {
                userId: 'user-1',
                tenantId: 'tenant-1',
                preferredLocale: 'fr-FR',
                fallbackLocale: 'en-US',
                timezone: 'Europe/Paris',
                updatedAt: new Date(),
            }, undefined);
            (0, globals_1.expect)(result.detectedLocale).toBe('fr-FR');
            (0, globals_1.expect)(result.confidence).toBe(1.0);
        });
        (0, globals_1.it)('should use cookie as secondary preference', () => {
            const result = service.detectLocale({ 'accept-language': 'de-DE' }, { locale: 'es-ES' }, undefined, undefined);
            (0, globals_1.expect)(result.detectedLocale).toBe('es-ES');
            (0, globals_1.expect)(result.confidence).toBe(0.8);
        });
        (0, globals_1.it)('should fall back to default when no locale detected', () => {
            const result = service.detectLocale({}, {}, undefined, undefined);
            (0, globals_1.expect)(result.detectedLocale).toBe('en-US');
            (0, globals_1.expect)(result.fallbackApplied).toBe(true);
        });
    });
    (0, globals_1.describe)('translate', () => {
        (0, globals_1.it)('should translate known keys', () => {
            const result = service.translate('app.name', 'en-US', 'common');
            (0, globals_1.expect)(result).toBe('Summit');
        });
        (0, globals_1.it)('should return key for unknown translations', () => {
            const result = service.translate('unknown.key', 'en-US', 'common');
            (0, globals_1.expect)(result).toBe('unknown.key');
        });
        (0, globals_1.it)('should apply interpolations', () => {
            const result = service.translate('onboarding.progress', 'en-US', 'onboarding', { current: 2, total: 5 });
            (0, globals_1.expect)(result).toContain('2');
            (0, globals_1.expect)(result).toContain('5');
        });
    });
    (0, globals_1.describe)('formatDate', () => {
        (0, globals_1.it)('should format dates according to locale', () => {
            const date = new Date('2024-12-28T12:00:00Z');
            const usResult = service.formatDate(date, {
                locale: 'en-US',
                dateStyle: 'short',
                timezone: 'UTC',
            });
            const deResult = service.formatDate(date, {
                locale: 'de-DE',
                dateStyle: 'short',
                timezone: 'UTC',
            });
            // US format: MM/DD/YY
            (0, globals_1.expect)(usResult).toMatch(/12\/28\/24/);
            // German format: DD.MM.YY
            (0, globals_1.expect)(deResult).toMatch(/28\.12\.24/);
        });
    });
    (0, globals_1.describe)('formatNumber', () => {
        (0, globals_1.it)('should format numbers according to locale', () => {
            const value = 1234567.89;
            const usResult = service.formatNumber(value, 'en-US');
            const deResult = service.formatNumber(value, 'de-DE');
            // US uses comma as thousands separator
            (0, globals_1.expect)(usResult).toContain(',');
            // German uses period as thousands separator
            (0, globals_1.expect)(deResult).toContain('.');
        });
    });
    (0, globals_1.describe)('formatCurrency', () => {
        (0, globals_1.it)('should format currency according to locale', () => {
            const value = 1234.56;
            const usdResult = service.formatCurrency(value, {
                locale: 'en-US',
                currency: 'USD',
                display: 'symbol',
            });
            const eurResult = service.formatCurrency(value, {
                locale: 'de-DE',
                currency: 'EUR',
                display: 'symbol',
            });
            (0, globals_1.expect)(usdResult).toContain('$');
            (0, globals_1.expect)(eurResult).toContain('€');
        });
    });
    (0, globals_1.describe)('regional compliance', () => {
        (0, globals_1.it)('should return EU GDPR requirements', () => {
            const result = service.getRegionalCompliance('EU');
            (0, globals_1.expect)(result.data).toBeDefined();
            (0, globals_1.expect)(result.data?.complianceFrameworks).toBeInstanceOf(Array);
            (0, globals_1.expect)(result.data?.complianceFrameworks.some((f) => f.id === 'gdpr')).toBe(true);
            (0, globals_1.expect)(result.data?.consentRequirements.explicitConsentRequired).toBe(true);
        });
        (0, globals_1.it)('should return Brazil LGPD requirements', () => {
            const result = service.getRegionalCompliance('BR');
            (0, globals_1.expect)(result.data).toBeDefined();
            (0, globals_1.expect)(result.data?.complianceFrameworks.some((f) => f.id === 'lgpd')).toBe(true);
        });
        (0, globals_1.it)('should return null for unknown region', () => {
            const result = service.getRegionalCompliance('XX');
            (0, globals_1.expect)(result.data).toBeNull();
        });
    });
    (0, globals_1.describe)('getComplianceForLocale', () => {
        (0, globals_1.it)('should return EU compliance for German locale', () => {
            const result = service.getComplianceForLocale('de-DE');
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result?.region).toBe('EU');
        });
        (0, globals_1.it)('should return BR compliance for Portuguese locale', () => {
            const result = service.getComplianceForLocale('pt-BR');
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result?.region).toBe('BR');
        });
    });
    (0, globals_1.describe)('governance compliance', () => {
        (0, globals_1.it)('should include governance verdict in responses', () => {
            const result = service.getSupportedLocales();
            (0, globals_1.expect)(result.governanceVerdict).toBeDefined();
            (0, globals_1.expect)(result.governanceVerdict?.result).toBe('ALLOW');
            (0, globals_1.expect)(result.governanceVerdict?.policyId).toContain('i18n');
        });
        (0, globals_1.it)('should include provenance metadata', () => {
            const result = service.getSupportedLocales();
            (0, globals_1.expect)(result.provenance).toBeDefined();
            (0, globals_1.expect)(result.provenance.source).toBe('i18n-service');
        });
    });
});
