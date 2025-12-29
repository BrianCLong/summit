/**
 * I18n Service Tests
 *
 * Tests for internationalization and regional compliance.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { I18nService } from './I18nService.js';

// Mock the database pool
jest.mock('../config/database.js', () => ({
  getPostgresPool: jest.fn(() => null),
}));

describe('I18nService', () => {
  let service: I18nService;

  beforeEach(() => {
    service = I18nService.getInstance();
  });

  describe('getSupportedLocales', () => {
    it('should return list of supported locales', () => {
      const result = service.getSupportedLocales();

      expect(result.data).toBeInstanceOf(Array);
      expect(result.data.length).toBeGreaterThan(0);

      // Check that en-US is supported
      const enUS = result.data.find((l) => l.code === 'en-US');
      expect(enUS).toBeDefined();
      expect(enUS?.enabled).toBe(true);
    });

    it('should include locale configuration details', () => {
      const result = service.getSupportedLocales();

      result.data.forEach((locale) => {
        expect(locale.code).toBeDefined();
        expect(locale.name).toBeDefined();
        expect(locale.nativeName).toBeDefined();
        expect(locale.direction).toMatch(/^(ltr|rtl)$/);
        expect(locale.dateFormat).toBeDefined();
        expect(locale.currencyCode).toBeDefined();
      });
    });
  });

  describe('getLocaleConfig', () => {
    it('should return config for valid locale', () => {
      const config = service.getLocaleConfig('en-US');

      expect(config).toBeDefined();
      expect(config?.code).toBe('en-US');
      expect(config?.direction).toBe('ltr');
      expect(config?.currencyCode).toBe('USD');
    });

    it('should return null for unsupported locale', () => {
      const config = service.getLocaleConfig('xx-XX' as any);

      expect(config).toBeNull();
    });

    it('should correctly identify RTL languages', () => {
      const arabicConfig = service.getLocaleConfig('ar-SA');

      if (arabicConfig) {
        expect(arabicConfig.direction).toBe('rtl');
      }
    });
  });

  describe('detectLocale', () => {
    it('should detect locale from Accept-Language header', () => {
      const result = service.detectLocale(
        { 'accept-language': 'de-DE,de;q=0.9,en-US;q=0.8' },
        {},
        undefined,
        undefined
      );

      expect(result.detectedLocale).toBe('de-DE');
      expect(result.sources.some((s) => s.type === 'header')).toBe(true);
    });

    it('should prefer user preferences over headers', () => {
      const result = service.detectLocale(
        { 'accept-language': 'de-DE' },
        {},
        {
          userId: 'user-1',
          tenantId: 'tenant-1',
          preferredLocale: 'fr-FR',
          fallbackLocale: 'en-US',
          timezone: 'Europe/Paris',
          updatedAt: new Date(),
        },
        undefined
      );

      expect(result.detectedLocale).toBe('fr-FR');
      expect(result.confidence).toBe(1.0);
    });

    it('should use cookie as secondary preference', () => {
      const result = service.detectLocale(
        { 'accept-language': 'de-DE' },
        { locale: 'es-ES' },
        undefined,
        undefined
      );

      expect(result.detectedLocale).toBe('es-ES');
      expect(result.confidence).toBe(0.8);
    });

    it('should fall back to default when no locale detected', () => {
      const result = service.detectLocale({}, {}, undefined, undefined);

      expect(result.detectedLocale).toBe('en-US');
      expect(result.fallbackApplied).toBe(true);
    });
  });

  describe('translate', () => {
    it('should translate known keys', () => {
      const result = service.translate('app.name', 'en-US', 'common');

      expect(result).toBe('Summit');
    });

    it('should return key for unknown translations', () => {
      const result = service.translate('unknown.key', 'en-US', 'common');

      expect(result).toBe('unknown.key');
    });

    it('should apply interpolations', () => {
      const result = service.translate(
        'onboarding.progress',
        'en-US',
        'onboarding',
        { current: 2, total: 5 }
      );

      expect(result).toContain('2');
      expect(result).toContain('5');
    });
  });

  describe('formatDate', () => {
    it('should format dates according to locale', () => {
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
      expect(usResult).toMatch(/12\/28\/24/);

      // German format: DD.MM.YY
      expect(deResult).toMatch(/28\.12\.24/);
    });
  });

  describe('formatNumber', () => {
    it('should format numbers according to locale', () => {
      const value = 1234567.89;

      const usResult = service.formatNumber(value, 'en-US');
      const deResult = service.formatNumber(value, 'de-DE');

      // US uses comma as thousands separator
      expect(usResult).toContain(',');

      // German uses period as thousands separator
      expect(deResult).toContain('.');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency according to locale', () => {
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

      expect(usdResult).toContain('$');
      expect(eurResult).toContain('€');
    });
  });

  describe('regional compliance', () => {
    it('should return EU GDPR requirements', () => {
      const result = service.getRegionalCompliance('EU');

      expect(result.data).toBeDefined();
      expect(result.data?.complianceFrameworks).toBeInstanceOf(Array);
      expect(result.data?.complianceFrameworks.some((f) => f.id === 'gdpr')).toBe(true);
      expect(result.data?.consentRequirements.explicitConsentRequired).toBe(true);
    });

    it('should return Brazil LGPD requirements', () => {
      const result = service.getRegionalCompliance('BR');

      expect(result.data).toBeDefined();
      expect(result.data?.complianceFrameworks.some((f) => f.id === 'lgpd')).toBe(true);
    });

    it('should return null for unknown region', () => {
      const result = service.getRegionalCompliance('XX');

      expect(result.data).toBeNull();
    });
  });

  describe('getComplianceForLocale', () => {
    it('should return EU compliance for German locale', () => {
      const result = service.getComplianceForLocale('de-DE');

      expect(result).toBeDefined();
      expect(result?.region).toBe('EU');
    });

    it('should return BR compliance for Portuguese locale', () => {
      const result = service.getComplianceForLocale('pt-BR');

      expect(result).toBeDefined();
      expect(result?.region).toBe('BR');
    });
  });

  describe('governance compliance', () => {
    it('should include governance verdict in responses', () => {
      const result = service.getSupportedLocales();

      expect(result.governanceVerdict).toBeDefined();
      expect(result.governanceVerdict?.result).toBe('ALLOW');
      expect(result.governanceVerdict?.policyId).toContain('i18n');
    });

    it('should include provenance metadata', () => {
      const result = service.getSupportedLocales();

      expect(result.provenance).toBeDefined();
      expect(result.provenance.source).toBe('i18n-service');
    });
  });
});
