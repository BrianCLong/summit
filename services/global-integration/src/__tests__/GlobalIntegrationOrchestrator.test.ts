/**
 * Tests for Global Integration Orchestrator
 */

import { GlobalIntegrationOrchestrator } from '../GlobalIntegrationOrchestrator';
import type { GlobalPartner, GlobalIntegrationConfig } from '../types';

describe('GlobalIntegrationOrchestrator', () => {
  let orchestrator: GlobalIntegrationOrchestrator;

  beforeEach(() => {
    orchestrator = new GlobalIntegrationOrchestrator({
      autoDiscovery: false, // Disable for testing
      autoGenerate: true,
      autoActivate: false,
      requireApproval: true,
    });
  });

  afterEach(async () => {
    await orchestrator.stop();
  });

  describe('start/stop', () => {
    it('should start and stop without errors', async () => {
      await expect(orchestrator.start()).resolves.not.toThrow();
      await expect(orchestrator.stop()).resolves.not.toThrow();
    });

    it('should not start twice', async () => {
      await orchestrator.start();
      await orchestrator.start(); // Should not throw
      await orchestrator.stop();
    });
  });

  describe('generateIntegration', () => {
    const mockPartner: GlobalPartner = {
      id: 'test-partner-001',
      name: 'Estonian Tax Board',
      type: 'government',
      region: 'Baltic',
      country: 'EE',
      languageCode: 'et',
      authMethod: 'x-road',
      complianceRequirements: ['GDPR', 'eIDAS'],
      dataClassification: 'confidential',
      status: 'discovered',
      discoveredAt: new Date(),
      metadata: {
        subsystemCode: 'emta',
        services: ['tax-declaration'],
      },
    };

    it('should generate integration layer for a partner', async () => {
      const integration = await orchestrator.generateIntegration(mockPartner);

      expect(integration).toBeDefined();
      expect(integration.partnerId).toBe(mockPartner.id);
      expect(integration.version).toBe('1.0.0');
      expect(integration.graphqlSchema).toContain('type EstonianTaxBoardEntity');
      expect(integration.restOpenAPI).toContain('"openapi": "3.1.0"');
      expect(integration.translationMappings.length).toBeGreaterThan(0);
      expect(integration.compliancePolicy).toContain('package global_integration');
    });

    it('should emit integration:generated event', async () => {
      const eventHandler = jest.fn();
      orchestrator.on('integration:generated', eventHandler);

      await orchestrator.generateIntegration(mockPartner);

      expect(eventHandler).toHaveBeenCalled();
      expect(eventHandler.mock.calls[0][0].partnerId).toBe(mockPartner.id);
    });

    it('should generate appropriate rate limits based on partner type', async () => {
      const integration = await orchestrator.generateIntegration(mockPartner);

      // Government partners get higher limits
      expect(integration.rateLimits.requestsPerMinute).toBe(200);
      expect(integration.rateLimits.requestsPerHour).toBe(10000);
    });

    it('should generate forensic audit config for confidential data', async () => {
      const integration = await orchestrator.generateIntegration(mockPartner);

      expect(integration.auditConfig.logLevel).toBe('forensic');
      expect(integration.auditConfig.retentionDays).toBe(2555); // 7 years
    });
  });

  describe('activateIntegration', () => {
    const mockPartner: GlobalPartner = {
      id: 'test-partner-002',
      name: 'Test Partner',
      type: 'business',
      region: 'EU',
      country: 'DE',
      languageCode: 'de',
      authMethod: 'oauth2',
      complianceRequirements: ['GDPR'],
      dataClassification: 'internal',
      status: 'discovered',
      discoveredAt: new Date(),
      metadata: {},
    };

    it('should throw error when partner not found', async () => {
      await expect(orchestrator.activateIntegration('non-existent')).rejects.toThrow(
        'Partner not found'
      );
    });

    it('should activate integration and emit event', async () => {
      const activatedHandler = jest.fn();
      orchestrator.on('partner:activated', activatedHandler);

      await orchestrator.generateIntegration(mockPartner);
      await orchestrator.activateIntegration(mockPartner.id);

      expect(activatedHandler).toHaveBeenCalled();
    });
  });

  describe('getMetrics', () => {
    it('should return initial metrics', async () => {
      const metrics = await orchestrator.getMetrics();

      expect(metrics).toHaveProperty('totalPartners');
      expect(metrics).toHaveProperty('activeIntegrations');
      expect(metrics).toHaveProperty('regionBreakdown');
      expect(metrics).toHaveProperty('partnerTypeBreakdown');
    });
  });

  describe('createExpansionPlan', () => {
    it('should create expansion plan', async () => {
      const plan = await orchestrator.createExpansionPlan({
        targetRegion: 'Nordic',
        targetCountries: ['FI', 'SE'],
        partnerTypes: ['government', 'academia'],
        estimatedPartners: 100,
        complianceRequirements: ['GDPR', 'eIDAS'],
        languagesRequired: ['fi', 'sv', 'en'],
        timeline: {
          discoveryPhase: new Date('2025-01-01'),
          integrationPhase: new Date('2025-02-01'),
          activationPhase: new Date('2025-03-01'),
        },
      });

      expect(plan).toBeDefined();
      expect(plan.id).toMatch(/^exp-/);
      expect(plan.status).toBe('planning');
      expect(plan.targetRegion).toBe('Nordic');
    });
  });

  describe('discoverPartnersInRegion', () => {
    it('should discover partners in Baltic region', async () => {
      const results = await orchestrator.discoverPartnersInRegion('Baltic');

      expect(results).toHaveProperty('partners');
      expect(results).toHaveProperty('apiSpecs');
      expect(results).toHaveProperty('complianceGaps');
      expect(results).toHaveProperty('recommendations');
    });

    it('should discover partners in EU region', async () => {
      const results = await orchestrator.discoverPartnersInRegion('EU');

      expect(results).toBeDefined();
      expect(Array.isArray(results.partners)).toBe(true);
    });
  });
});

describe('GlobalIntegrationOrchestrator - Multi-Language Support', () => {
  let orchestrator: GlobalIntegrationOrchestrator;

  beforeEach(() => {
    orchestrator = new GlobalIntegrationOrchestrator({
      supportedLanguages: ['en', 'et', 'de', 'fr', 'fi'],
    });
  });

  afterEach(async () => {
    await orchestrator.stop();
  });

  it('should generate translation mappings for all supported languages', async () => {
    const partner: GlobalPartner = {
      id: 'test-multilang',
      name: 'Finnish Registry',
      type: 'government',
      region: 'Nordic',
      country: 'FI',
      languageCode: 'fi',
      authMethod: 'x-road',
      complianceRequirements: ['GDPR'],
      dataClassification: 'public',
      status: 'discovered',
      discoveredAt: new Date(),
      metadata: {},
    };

    const integration = await orchestrator.generateIntegration(partner);

    // Should have mappings for fi -> other languages
    const targetLocales = integration.translationMappings.map((m) => m.targetLocale);
    expect(targetLocales).toContain('en');
    expect(targetLocales).toContain('et');
    expect(targetLocales).toContain('de');
    expect(targetLocales).toContain('fr');
    expect(targetLocales).not.toContain('fi'); // Source locale excluded
  });
});
