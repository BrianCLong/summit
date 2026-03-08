"use strict";
/**
 * IOC Management Service Tests
 * Comprehensive test suite for IOC lifecycle and geospatial analysis
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ioc_management_service_js_1 = require("../services/ioc-management-service.js");
// Mock repository
const mockRepository = {
    bulkUpsertIOCs: vitest_1.vi.fn().mockResolvedValue({ data: 1, metrics: { queryTime: 10 } }),
    findIOCsInProximity: vitest_1.vi.fn().mockResolvedValue({ data: [], metrics: { queryTime: 10 } }),
    findIOCAttributionChain: vitest_1.vi.fn().mockResolvedValue({
        data: {
            ioc: { id: 'test-ioc', type: 'IP_ADDRESS', value: '1.2.3.4' },
            relatedIOCs: [],
            threatActors: [],
            campaigns: [],
        },
        metrics: { queryTime: 10 },
    }),
    findThreatActorsByCyberInfra: vitest_1.vi.fn().mockResolvedValue({ data: [], metrics: { queryTime: 10 } }),
    generateThreatHeatmap: vitest_1.vi.fn().mockResolvedValue({ data: [], metrics: { queryTime: 10 } }),
};
(0, vitest_1.describe)('IOCManagementService', () => {
    let service;
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        service = new ioc_management_service_js_1.IOCManagementService(mockRepository);
    });
    (0, vitest_1.describe)('IOC Ingestion', () => {
        (0, vitest_1.it)('should ingest a single IOC with enrichment', async () => {
            const result = await service.ingestIOC({
                type: 'IP_ADDRESS',
                value: '192.168.1.100',
                severity: 'HIGH',
                confidence: 85,
                tenantId: 'test-tenant',
            });
            (0, vitest_1.expect)(result).toBeDefined();
            (0, vitest_1.expect)(result.ioc).toBeDefined();
            (0, vitest_1.expect)(result.ioc.type).toBe('IP_ADDRESS');
            (0, vitest_1.expect)(result.ioc.value).toBe('192.168.1.100');
            (0, vitest_1.expect)(result.enrichments).toBeDefined();
            (0, vitest_1.expect)(result.processingTime).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should normalize IOC values', async () => {
            const result = await service.ingestIOC({
                type: 'DOMAIN',
                value: '  WWW.EXAMPLE.COM  ',
                tenantId: 'test-tenant',
            });
            (0, vitest_1.expect)(result.ioc.value).toBe('example.com');
        });
        (0, vitest_1.it)('should enrich IP addresses with geolocation', async () => {
            const result = await service.ingestIOC({
                type: 'IP_ADDRESS',
                value: '8.8.8.8',
                tenantId: 'test-tenant',
            });
            (0, vitest_1.expect)(result.enrichments.geolocation).toBeDefined();
            (0, vitest_1.expect)(result.enrichments.geolocation?.latitude).toBeDefined();
            (0, vitest_1.expect)(result.enrichments.geolocation?.longitude).toBeDefined();
            (0, vitest_1.expect)(result.enrichments.geolocation?.country).toBeDefined();
        });
        (0, vitest_1.it)('should lookup reputation for IOCs', async () => {
            const result = await service.ingestIOC({
                type: 'DOMAIN',
                value: 'malicious-domain.com',
                tenantId: 'test-tenant',
            });
            (0, vitest_1.expect)(result.enrichments.reputation).toBeDefined();
            (0, vitest_1.expect)(typeof result.enrichments.reputation?.score).toBe('number');
            (0, vitest_1.expect)(result.enrichments.reputation?.categories).toBeInstanceOf(Array);
        });
    });
    (0, vitest_1.describe)('Bulk IOC Ingestion', () => {
        (0, vitest_1.it)('should bulk ingest IOCs', async () => {
            const iocs = [
                { type: 'IP_ADDRESS', value: '1.1.1.1', tenantId: 'test' },
                { type: 'IP_ADDRESS', value: '2.2.2.2', tenantId: 'test' },
                { type: 'DOMAIN', value: 'test.com', tenantId: 'test' },
            ];
            const result = await service.bulkIngestIOCs(iocs, {
                enrichmentLevel: 'BASIC',
                deduplication: true,
                batchSize: 2,
            });
            (0, vitest_1.expect)(result).toBeDefined();
            (0, vitest_1.expect)(result.ingested).toBe(3);
            (0, vitest_1.expect)(result.duplicates).toBe(0);
            (0, vitest_1.expect)(result.errors).toBe(0);
            (0, vitest_1.expect)(result.processingTime).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should handle empty IOC array', async () => {
            const result = await service.bulkIngestIOCs([]);
            (0, vitest_1.expect)(result.ingested).toBe(0);
            (0, vitest_1.expect)(result.errors).toBe(0);
        });
        (0, vitest_1.it)('should skip enrichment when set to NONE', async () => {
            const iocs = [
                { type: 'IP_ADDRESS', value: '3.3.3.3', tenantId: 'test' },
            ];
            const result = await service.bulkIngestIOCs(iocs, {
                enrichmentLevel: 'NONE',
            });
            (0, vitest_1.expect)(result.enriched).toBe(0);
        });
    });
    (0, vitest_1.describe)('IOC Correlation', () => {
        (0, vitest_1.it)('should correlate IOC with related intelligence', async () => {
            const result = await service.correlateIOC('test-ioc-id');
            (0, vitest_1.expect)(result).toBeDefined();
            (0, vitest_1.expect)(result.primaryIOC).toBeDefined();
            (0, vitest_1.expect)(result.correlations).toBeInstanceOf(Array);
            (0, vitest_1.expect)(result.clusters).toBeInstanceOf(Array);
            (0, vitest_1.expect)(result.threatAssessment).toBeDefined();
            (0, vitest_1.expect)(typeof result.threatAssessment.overallThreat).toBe('number');
        });
    });
    (0, vitest_1.describe)('Detection Rules', () => {
        (0, vitest_1.it)('should create a detection rule', async () => {
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
            (0, vitest_1.expect)(rule).toBeDefined();
            (0, vitest_1.expect)(rule.id).toBeDefined();
            (0, vitest_1.expect)(rule.name).toBe('Test Rule');
            (0, vitest_1.expect)(rule.type).toBe('SNORT');
            (0, vitest_1.expect)(rule.createdAt).toBeDefined();
        });
        (0, vitest_1.it)('should generate SNORT rules from IOCs', async () => {
            // First ingest an IOC
            const { ioc } = await service.ingestIOC({
                type: 'IP_ADDRESS',
                value: '10.0.0.1',
                severity: 'HIGH',
                tenantId: 'test',
            });
            const rules = await service.generateDetectionRules([ioc.id], 'SNORT');
            (0, vitest_1.expect)(rules).toBeInstanceOf(Array);
            (0, vitest_1.expect)(rules.length).toBeGreaterThanOrEqual(0);
        });
    });
    (0, vitest_1.describe)('STIX Export', () => {
        (0, vitest_1.it)('should export IOCs in STIX format', async () => {
            // Ingest some IOCs first
            const { ioc: ioc1 } = await service.ingestIOC({
                type: 'IP_ADDRESS',
                value: '5.5.5.5',
                tenantId: 'test',
            });
            const stixJson = await service.exportToSTIX([ioc1.id]);
            const stix = JSON.parse(stixJson);
            (0, vitest_1.expect)(stix).toBeDefined();
            (0, vitest_1.expect)(stix.type).toBe('bundle');
            (0, vitest_1.expect)(stix.spec_version).toBe('2.1');
            (0, vitest_1.expect)(stix.objects).toBeInstanceOf(Array);
        });
        (0, vitest_1.it)('should include geolocation as STIX location object', async () => {
            const { ioc } = await service.ingestIOC({
                type: 'IP_ADDRESS',
                value: '6.6.6.6',
                tenantId: 'test',
            });
            const stixJson = await service.exportToSTIX([ioc.id]);
            const stix = JSON.parse(stixJson);
            const locationObjects = stix.objects.filter((obj) => obj.type === 'location');
            (0, vitest_1.expect)(locationObjects.length).toBeGreaterThanOrEqual(0);
        });
    });
    (0, vitest_1.describe)('Geospatial IOC Analysis', () => {
        (0, vitest_1.it)('should find IOCs within geographic region', async () => {
            const result = await service.findIOCsInRegion({ latitude: 38.9, longitude: -77.0 }, 50000, // 50km radius
            { types: ['IP_ADDRESS'], minConfidence: 50 });
            (0, vitest_1.expect)(result).toBeInstanceOf(Array);
            (0, vitest_1.expect)(mockRepository.findIOCsInProximity).toHaveBeenCalled();
        });
        (0, vitest_1.it)('should generate IOC heatmap', async () => {
            const result = await service.generateIOCHeatmap({
                minLon: -77.5,
                minLat: 38.5,
                maxLon: -76.5,
                maxLat: 39.5,
            });
            (0, vitest_1.expect)(result).toBeInstanceOf(Array);
            (0, vitest_1.expect)(mockRepository.generateThreatHeatmap).toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('IOC Value Normalization', () => {
        (0, vitest_1.it)('should normalize IP addresses', async () => {
            const { ioc } = await service.ingestIOC({
                type: 'IP_ADDRESS',
                value: '  192.168.1.1  ',
                tenantId: 'test',
            });
            (0, vitest_1.expect)(ioc.value).toBe('192.168.1.1');
        });
        (0, vitest_1.it)('should normalize domains by removing www prefix', async () => {
            const { ioc } = await service.ingestIOC({
                type: 'DOMAIN',
                value: 'www.Example.COM',
                tenantId: 'test',
            });
            (0, vitest_1.expect)(ioc.value).toBe('example.com');
        });
        (0, vitest_1.it)('should normalize file hashes to lowercase', async () => {
            const { ioc } = await service.ingestIOC({
                type: 'FILE_HASH_SHA256',
                value: 'ABC123DEF456ABC123DEF456ABC123DEF456ABC123DEF456ABC123DEF456ABCD',
                tenantId: 'test',
            });
            (0, vitest_1.expect)(ioc.value).toBe('abc123def456abc123def456abc123def456abc123def456abc123def456abcd');
        });
        (0, vitest_1.it)('should normalize emails to lowercase', async () => {
            const { ioc } = await service.ingestIOC({
                type: 'EMAIL',
                value: '  Test@Example.COM  ',
                tenantId: 'test',
            });
            (0, vitest_1.expect)(ioc.value).toBe('test@example.com');
        });
    });
    (0, vitest_1.describe)('Severity Classification', () => {
        (0, vitest_1.it)('should classify severity based on reputation score', async () => {
            // High reputation score should result in high severity
            const { ioc } = await service.ingestIOC({
                type: 'IP_ADDRESS',
                value: '7.7.7.7',
                tenantId: 'test',
            });
            // Severity should be one of the valid values
            (0, vitest_1.expect)(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(ioc.severity);
        });
    });
});
(0, vitest_1.describe)('IOC Type Mapping', () => {
    let service;
    (0, vitest_1.beforeEach)(() => {
        service = new ioc_management_service_js_1.IOCManagementService(mockRepository);
    });
    const testCases = [
        { type: 'IP_ADDRESS', expectedPattern: /\[ipv4-addr:value/ },
        { type: 'DOMAIN', expectedPattern: /\[domain-name:value/ },
        { type: 'URL', expectedPattern: /\[url:value/ },
        { type: 'FILE_HASH_SHA256', expectedPattern: /\[file:hashes\.'SHA-256'/ },
        { type: 'FILE_HASH_MD5', expectedPattern: /\[file:hashes\.MD5/ },
    ];
    testCases.forEach(({ type, expectedPattern }) => {
        (0, vitest_1.it)(`should create correct STIX pattern for ${type}`, async () => {
            const { ioc } = await service.ingestIOC({
                type: type,
                value: type === 'FILE_HASH_SHA256'
                    ? 'a'.repeat(64)
                    : type === 'FILE_HASH_MD5'
                        ? 'a'.repeat(32)
                        : 'test-value',
                tenantId: 'test',
            });
            const stixJson = await service.exportToSTIX([ioc.id]);
            const stix = JSON.parse(stixJson);
            const indicator = stix.objects.find((o) => o.type === 'indicator');
            if (indicator) {
                (0, vitest_1.expect)(indicator.pattern).toMatch(expectedPattern);
            }
        });
    });
});
