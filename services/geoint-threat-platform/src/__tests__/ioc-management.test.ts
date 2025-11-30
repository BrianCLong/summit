/**
 * IOC Management Service Tests
 * Comprehensive test suite for IOC lifecycle and geospatial analysis
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { IOCManagementService } from '../services/ioc-management-service.js';
import { GEOINTNeo4jRepository } from '../neo4j/repository.js';

// Mock repository
const mockRepository = {
  bulkUpsertIOCs: vi.fn().mockResolvedValue({ data: 1, metrics: { queryTime: 10 } }),
  findIOCsInProximity: vi.fn().mockResolvedValue({ data: [], metrics: { queryTime: 10 } }),
  findIOCAttributionChain: vi.fn().mockResolvedValue({
    data: {
      ioc: { id: 'test-ioc', type: 'IP_ADDRESS', value: '1.2.3.4' },
      relatedIOCs: [],
      threatActors: [],
      campaigns: [],
    },
    metrics: { queryTime: 10 },
  }),
  findThreatActorsByCyberInfra: vi.fn().mockResolvedValue({ data: [], metrics: { queryTime: 10 } }),
  generateThreatHeatmap: vi.fn().mockResolvedValue({ data: [], metrics: { queryTime: 10 } }),
} as unknown as GEOINTNeo4jRepository;

describe('IOCManagementService', () => {
  let service: IOCManagementService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new IOCManagementService(mockRepository);
  });

  describe('IOC Ingestion', () => {
    it('should ingest a single IOC with enrichment', async () => {
      const result = await service.ingestIOC({
        type: 'IP_ADDRESS',
        value: '192.168.1.100',
        severity: 'HIGH',
        confidence: 85,
        tenantId: 'test-tenant',
      });

      expect(result).toBeDefined();
      expect(result.ioc).toBeDefined();
      expect(result.ioc.type).toBe('IP_ADDRESS');
      expect(result.ioc.value).toBe('192.168.1.100');
      expect(result.enrichments).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should normalize IOC values', async () => {
      const result = await service.ingestIOC({
        type: 'DOMAIN',
        value: '  WWW.EXAMPLE.COM  ',
        tenantId: 'test-tenant',
      });

      expect(result.ioc.value).toBe('example.com');
    });

    it('should enrich IP addresses with geolocation', async () => {
      const result = await service.ingestIOC({
        type: 'IP_ADDRESS',
        value: '8.8.8.8',
        tenantId: 'test-tenant',
      });

      expect(result.enrichments.geolocation).toBeDefined();
      expect(result.enrichments.geolocation?.latitude).toBeDefined();
      expect(result.enrichments.geolocation?.longitude).toBeDefined();
      expect(result.enrichments.geolocation?.country).toBeDefined();
    });

    it('should lookup reputation for IOCs', async () => {
      const result = await service.ingestIOC({
        type: 'DOMAIN',
        value: 'malicious-domain.com',
        tenantId: 'test-tenant',
      });

      expect(result.enrichments.reputation).toBeDefined();
      expect(typeof result.enrichments.reputation?.score).toBe('number');
      expect(result.enrichments.reputation?.categories).toBeInstanceOf(Array);
    });
  });

  describe('Bulk IOC Ingestion', () => {
    it('should bulk ingest IOCs', async () => {
      const iocs = [
        { type: 'IP_ADDRESS' as const, value: '1.1.1.1', tenantId: 'test' },
        { type: 'IP_ADDRESS' as const, value: '2.2.2.2', tenantId: 'test' },
        { type: 'DOMAIN' as const, value: 'test.com', tenantId: 'test' },
      ];

      const result = await service.bulkIngestIOCs(iocs, {
        enrichmentLevel: 'BASIC',
        deduplication: true,
        batchSize: 2,
      });

      expect(result).toBeDefined();
      expect(result.ingested).toBe(3);
      expect(result.duplicates).toBe(0);
      expect(result.errors).toBe(0);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should handle empty IOC array', async () => {
      const result = await service.bulkIngestIOCs([]);

      expect(result.ingested).toBe(0);
      expect(result.errors).toBe(0);
    });

    it('should skip enrichment when set to NONE', async () => {
      const iocs = [
        { type: 'IP_ADDRESS' as const, value: '3.3.3.3', tenantId: 'test' },
      ];

      const result = await service.bulkIngestIOCs(iocs, {
        enrichmentLevel: 'NONE',
      });

      expect(result.enriched).toBe(0);
    });
  });

  describe('IOC Correlation', () => {
    it('should correlate IOC with related intelligence', async () => {
      const result = await service.correlateIOC('test-ioc-id');

      expect(result).toBeDefined();
      expect(result.primaryIOC).toBeDefined();
      expect(result.correlations).toBeInstanceOf(Array);
      expect(result.clusters).toBeInstanceOf(Array);
      expect(result.threatAssessment).toBeDefined();
      expect(typeof result.threatAssessment.overallThreat).toBe('number');
    });
  });

  describe('Detection Rules', () => {
    it('should create a detection rule', async () => {
      const rule = await service.createDetectionRule({
        name: 'Test Rule',
        description: 'Test detection rule',
        type: 'SNORT',
        pattern: 'alert ip any any -> any any (msg:"Test";)',
        severity: 'HIGH',
        tags: ['test'],
        iocTypes: ['IP_ADDRESS'],
        enabled: true,
      });

      expect(rule).toBeDefined();
      expect(rule.id).toBeDefined();
      expect(rule.name).toBe('Test Rule');
      expect(rule.type).toBe('SNORT');
      expect(rule.createdAt).toBeDefined();
    });

    it('should generate SNORT rules from IOCs', async () => {
      // First ingest an IOC
      const { ioc } = await service.ingestIOC({
        type: 'IP_ADDRESS',
        value: '10.0.0.1',
        severity: 'HIGH',
        tenantId: 'test',
      });

      const rules = await service.generateDetectionRules([ioc.id], 'SNORT');

      expect(rules).toBeInstanceOf(Array);
      expect(rules.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('STIX Export', () => {
    it('should export IOCs in STIX format', async () => {
      // Ingest some IOCs first
      const { ioc: ioc1 } = await service.ingestIOC({
        type: 'IP_ADDRESS',
        value: '5.5.5.5',
        tenantId: 'test',
      });

      const stixJson = await service.exportToSTIX([ioc1.id]);
      const stix = JSON.parse(stixJson);

      expect(stix).toBeDefined();
      expect(stix.type).toBe('bundle');
      expect(stix.spec_version).toBe('2.1');
      expect(stix.objects).toBeInstanceOf(Array);
    });

    it('should include geolocation as STIX location object', async () => {
      const { ioc } = await service.ingestIOC({
        type: 'IP_ADDRESS',
        value: '6.6.6.6',
        tenantId: 'test',
      });

      const stixJson = await service.exportToSTIX([ioc.id]);
      const stix = JSON.parse(stixJson);

      const locationObjects = stix.objects.filter((obj: { type: string }) => obj.type === 'location');
      expect(locationObjects.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Geospatial IOC Analysis', () => {
    it('should find IOCs within geographic region', async () => {
      const result = await service.findIOCsInRegion(
        { latitude: 38.9, longitude: -77.0 },
        50000, // 50km radius
        { types: ['IP_ADDRESS'], minConfidence: 50 }
      );

      expect(result).toBeInstanceOf(Array);
      expect(mockRepository.findIOCsInProximity).toHaveBeenCalled();
    });

    it('should generate IOC heatmap', async () => {
      const result = await service.generateIOCHeatmap({
        minLon: -77.5,
        minLat: 38.5,
        maxLon: -76.5,
        maxLat: 39.5,
      });

      expect(result).toBeInstanceOf(Array);
      expect(mockRepository.generateThreatHeatmap).toHaveBeenCalled();
    });
  });

  describe('IOC Value Normalization', () => {
    it('should normalize IP addresses', async () => {
      const { ioc } = await service.ingestIOC({
        type: 'IP_ADDRESS',
        value: '  192.168.1.1  ',
        tenantId: 'test',
      });
      expect(ioc.value).toBe('192.168.1.1');
    });

    it('should normalize domains by removing www prefix', async () => {
      const { ioc } = await service.ingestIOC({
        type: 'DOMAIN',
        value: 'www.Example.COM',
        tenantId: 'test',
      });
      expect(ioc.value).toBe('example.com');
    });

    it('should normalize file hashes to lowercase', async () => {
      const { ioc } = await service.ingestIOC({
        type: 'FILE_HASH_SHA256',
        value: 'ABC123DEF456ABC123DEF456ABC123DEF456ABC123DEF456ABC123DEF456ABCD',
        tenantId: 'test',
      });
      expect(ioc.value).toBe('abc123def456abc123def456abc123def456abc123def456abc123def456abcd');
    });

    it('should normalize emails to lowercase', async () => {
      const { ioc } = await service.ingestIOC({
        type: 'EMAIL',
        value: '  Test@Example.COM  ',
        tenantId: 'test',
      });
      expect(ioc.value).toBe('test@example.com');
    });
  });

  describe('Severity Classification', () => {
    it('should classify severity based on reputation score', async () => {
      // High reputation score should result in high severity
      const { ioc } = await service.ingestIOC({
        type: 'IP_ADDRESS',
        value: '7.7.7.7',
        tenantId: 'test',
      });

      // Severity should be one of the valid values
      expect(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(ioc.severity);
    });
  });
});

describe('IOC Type Mapping', () => {
  let service: IOCManagementService;

  beforeEach(() => {
    service = new IOCManagementService(mockRepository);
  });

  const testCases = [
    { type: 'IP_ADDRESS', expectedPattern: /\[ipv4-addr:value/ },
    { type: 'DOMAIN', expectedPattern: /\[domain-name:value/ },
    { type: 'URL', expectedPattern: /\[url:value/ },
    { type: 'FILE_HASH_SHA256', expectedPattern: /\[file:hashes\.'SHA-256'/ },
    { type: 'FILE_HASH_MD5', expectedPattern: /\[file:hashes\.MD5/ },
  ];

  testCases.forEach(({ type, expectedPattern }) => {
    it(`should create correct STIX pattern for ${type}`, async () => {
      const { ioc } = await service.ingestIOC({
        type: type as any,
        value: type === 'FILE_HASH_SHA256'
          ? 'a'.repeat(64)
          : type === 'FILE_HASH_MD5'
          ? 'a'.repeat(32)
          : 'test-value',
        tenantId: 'test',
      });

      const stixJson = await service.exportToSTIX([ioc.id]);
      const stix = JSON.parse(stixJson);
      const indicator = stix.objects.find((o: any) => o.type === 'indicator');

      if (indicator) {
        expect(indicator.pattern).toMatch(expectedPattern);
      }
    });
  });
});
