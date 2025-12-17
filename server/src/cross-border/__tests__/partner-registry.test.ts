/**
 * Unit tests for Partner Registry
 */

import { PartnerRegistry } from '../partner-registry.js';
import type { PartnerNation, DataClassification } from '../types.js';

describe('PartnerRegistry', () => {
  let registry: PartnerRegistry;

  beforeEach(() => {
    registry = new PartnerRegistry(60000); // 60s health check interval
  });

  afterEach(async () => {
    await registry.shutdown();
  });

  describe('initialization', () => {
    it('should initialize with default partners', async () => {
      await registry.initialize();
      const partners = registry.getActivePartners();

      // Should have at least Estonia as active
      expect(partners.length).toBeGreaterThanOrEqual(1);

      const estonia = registry.getPartner('EE');
      expect(estonia).toBeDefined();
      expect(estonia?.name).toContain('Estonia');
    });
  });

  describe('partner registration', () => {
    it('should register a new partner', async () => {
      const partnerData: Omit<PartnerNation, 'id' | 'createdAt' | 'updatedAt'> = {
        code: 'DE',
        name: 'Germany Test',
        region: 'EU',
        status: 'active',
        endpoint: {
          baseUrl: 'https://api.test.de/v1',
          protocol: 'rest',
          version: '1.0.0',
          healthCheckPath: '/health',
          authMethod: 'jwt',
        },
        capabilities: {
          domains: ['tax', 'business'],
          operations: ['query'],
          maxContextSize: 16000,
          supportsStreaming: false,
          supportsMultimodal: false,
          responseTimeMs: 2000,
        },
        languages: ['de', 'en'],
        trustLevel: {
          level: 3,
          maxDataClassification: 'confidential',
          allowedOperations: ['query', 'verify'],
          requiresApproval: false,
          auditRequired: true,
        },
        dataAgreements: [],
      };

      const partner = await registry.registerPartner(partnerData);

      expect(partner.id).toBeDefined();
      expect(partner.code).toBe('DE');
      expect(partner.createdAt).toBeInstanceOf(Date);

      const retrieved = registry.getPartner('DE');
      expect(retrieved).toEqual(partner);
    });

    it('should emit event on partner registration', async () => {
      const eventPromise = new Promise<PartnerNation>((resolve) => {
        registry.on('partnerRegistered', resolve);
      });

      await registry.registerPartner({
        code: 'PL',
        name: 'Poland Test',
        region: 'EU',
        status: 'pending',
        endpoint: {
          baseUrl: 'https://api.test.pl/v1',
          protocol: 'rest',
          version: '1.0.0',
          healthCheckPath: '/health',
          authMethod: 'jwt',
        },
        capabilities: {
          domains: ['tax'],
          operations: ['query'],
          maxContextSize: 8000,
          supportsStreaming: false,
          supportsMultimodal: false,
          responseTimeMs: 3000,
        },
        languages: ['pl', 'en'],
        trustLevel: {
          level: 2,
          maxDataClassification: 'internal',
          allowedOperations: ['query'],
          requiresApproval: true,
          auditRequired: true,
        },
        dataAgreements: [],
      });

      const emittedPartner = await eventPromise;
      expect(emittedPartner.code).toBe('PL');
    });
  });

  describe('partner lookup', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should get partner by code (case insensitive)', () => {
      const partner1 = registry.getPartner('EE');
      const partner2 = registry.getPartner('ee');

      expect(partner1).toBeDefined();
      expect(partner2).toBeDefined();
    });

    it('should return undefined for unknown partner', () => {
      const partner = registry.getPartner('XX');
      expect(partner).toBeUndefined();
    });

    it('should get partners by domain', () => {
      const taxPartners = registry.getPartnersByDomain('tax');
      expect(taxPartners.length).toBeGreaterThan(0);
      expect(taxPartners.every((p) => p.capabilities.domains.includes('tax'))).toBe(true);
    });

    it('should get partners by language', () => {
      const englishPartners = registry.getPartnersByLanguage('en');
      expect(englishPartners.length).toBeGreaterThan(0);
      expect(englishPartners.every((p) => p.languages.includes('en'))).toBe(true);
    });
  });

  describe('data classification handling', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should check classification compatibility', () => {
      const partner = registry.getPartner('EE');
      expect(partner).toBeDefined();

      // Estonia has trust level 4 (restricted)
      expect(registry.canHandleClassification('EE', 'public')).toBe(true);
      expect(registry.canHandleClassification('EE', 'internal')).toBe(true);
      expect(registry.canHandleClassification('EE', 'confidential')).toBe(true);
      expect(registry.canHandleClassification('EE', 'restricted')).toBe(true);
      expect(registry.canHandleClassification('EE', 'top_secret')).toBe(false);
    });

    it('should return false for unknown partner', () => {
      expect(registry.canHandleClassification('XX', 'public')).toBe(false);
    });
  });

  describe('find best partner', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should find partner by domain', () => {
      const partner = registry.findBestPartner({ domain: 'tax' });
      expect(partner).toBeDefined();
      expect(partner?.capabilities.domains).toContain('tax');
    });

    it('should filter by language', () => {
      const partner = registry.findBestPartner({
        domain: 'tax',
        language: 'et',
      });
      expect(partner).toBeDefined();
      expect(partner?.languages).toContain('et');
    });

    it('should filter by classification', () => {
      const partner = registry.findBestPartner({
        domain: 'tax',
        classification: 'confidential' as DataClassification,
      });
      expect(partner).toBeDefined();
    });

    it('should return null when no match', () => {
      const partner = registry.findBestPartner({
        domain: 'nonexistent_domain',
      });
      expect(partner).toBeNull();
    });
  });

  describe('status updates', () => {
    beforeEach(async () => {
      await registry.initialize();
    });

    it('should update partner status', async () => {
      await registry.updateStatus('EE', 'suspended');
      const partner = registry.getPartner('EE');
      expect(partner?.status).toBe('suspended');
    });

    it('should emit event on status change', async () => {
      const eventPromise = new Promise<{ code: string; status: string }>((resolve) => {
        registry.on('partnerStatusChanged', resolve);
      });

      await registry.updateStatus('EE', 'inactive');
      const event = await eventPromise;

      expect(event.code).toBe('EE');
      expect(event.status).toBe('inactive');
    });
  });
});
