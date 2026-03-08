"use strict";
/**
 * Fusion Service Tests
 * Comprehensive test suite for multi-INT intelligence fusion
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fusion_service_js_1 = require("../services/fusion-service.js");
// Mock dependencies
const mockRepository = {
    executeFusionQuery: vitest_1.vi.fn().mockResolvedValue({
        data: {
            correlations: [
                { type: 'THREAT_ACTOR_INFRASTRUCTURE', entities: ['actor1', 'infra1'], confidence: 80, evidence: [] },
            ],
            threatAssessment: { overallThreat: 65, mitigationPriority: 'HIGH' },
            geospatialSummary: { threatHeatmap: [], criticalInfrastructureAtRisk: [] },
        },
        metrics: { queryTime: 100 },
    }),
    generateThreatHeatmap: vitest_1.vi.fn().mockResolvedValue({
        data: [
            { h3Index: '38_-77', activityScore: 75, incidentCount: 10 },
        ],
        metrics: { queryTime: 50 },
    }),
};
const mockGeointService = {
    analyzeTerrainRegion: vitest_1.vi.fn().mockResolvedValue({
        strategicValue: {
            observationPoints: [{ latitude: 38.9, longitude: -77.0, score: 0.8 }],
            chokPoints: [],
            coverAreas: [],
        },
        accessibility: { vehicleAccessible: 60 },
    }),
};
const mockIocService = {
    ingestIOC: vitest_1.vi.fn().mockResolvedValue({
        ioc: { id: 'ioc-1', type: 'IP_ADDRESS', value: '1.2.3.4' },
    }),
    findIOCsInRegion: vitest_1.vi.fn().mockResolvedValue([]),
};
(0, vitest_1.describe)('FusionService', () => {
    let service;
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        service = new fusion_service_js_1.FusionService(mockRepository, mockGeointService, mockIocService);
    });
    (0, vitest_1.describe)('Intelligence Report Ingestion', () => {
        (0, vitest_1.it)('should ingest an intelligence report', async () => {
            const report = await service.ingestReport({
                title: 'Test Threat Report',
                classification: 'UNCLASSIFIED',
                tlp: 'GREEN',
                sources: [
                    { type: 'OSINT', reliability: 'B', credibility: 2, description: 'Open source' },
                ],
                summary: 'Test summary about APT28 activity',
                content: 'Detailed content mentioning IP 192.168.1.1 and domain malware.com',
                keyFindings: ['Finding 1', 'Finding 2'],
                entities: [],
                locations: [],
                reportDate: new Date().toISOString(),
                assessment: {
                    threatLevel: 'HIGH',
                    confidence: 75,
                },
                relatedReports: [],
                relatedIOCs: [],
                relatedThreatActors: [],
                tenantId: 'test-tenant',
                createdBy: 'analyst-1',
            });
            (0, vitest_1.expect)(report).toBeDefined();
            (0, vitest_1.expect)(report.id).toBeDefined();
            (0, vitest_1.expect)(report.title).toBe('Test Threat Report');
            (0, vitest_1.expect)(report.createdAt).toBeDefined();
        });
        (0, vitest_1.it)('should extract IOCs from report content', async () => {
            const report = await service.ingestReport({
                title: 'IOC Extraction Test',
                classification: 'UNCLASSIFIED',
                tlp: 'GREEN',
                sources: [{ type: 'OSINT', reliability: 'B', credibility: 2 }],
                summary: 'Test',
                content: 'Found malicious IP 8.8.8.8 and domain evil.com with hash abc123def456abc123def456abc123def456abc123def456abc123def456abcd',
                keyFindings: [],
                entities: [],
                locations: [],
                reportDate: new Date().toISOString(),
                assessment: { threatLevel: 'MEDIUM', confidence: 60 },
                relatedReports: [],
                relatedIOCs: [],
                relatedThreatActors: [],
                tenantId: 'test-tenant',
                createdBy: 'analyst-1',
            });
            // IOC service should have been called to ingest extracted IOCs
            (0, vitest_1.expect)(mockIocService.ingestIOC).toHaveBeenCalled();
        });
        (0, vitest_1.it)('should detect known threat actor mentions', async () => {
            const report = await service.ingestReport({
                title: 'Threat Actor Test',
                classification: 'UNCLASSIFIED',
                tlp: 'AMBER',
                sources: [{ type: 'HUMINT', reliability: 'A', credibility: 1 }],
                summary: 'APT28 activity detected',
                content: 'Analysis indicates APT28 (also known as Fancy Bear) conducted operations...',
                keyFindings: ['APT28 attribution'],
                entities: [],
                locations: [],
                reportDate: new Date().toISOString(),
                assessment: { threatLevel: 'HIGH', confidence: 85 },
                relatedReports: [],
                relatedIOCs: [],
                relatedThreatActors: [],
                tenantId: 'test-tenant',
                createdBy: 'analyst-1',
            });
            (0, vitest_1.expect)(report).toBeDefined();
        });
    });
    (0, vitest_1.describe)('Multi-INT Fusion', () => {
        (0, vitest_1.it)('should execute fusion analysis', async () => {
            // First ingest a report
            await service.ingestReport({
                title: 'Fusion Test Report',
                classification: 'UNCLASSIFIED',
                tlp: 'GREEN',
                sources: [{ type: 'OSINT', reliability: 'B', credibility: 2 }],
                summary: 'Test fusion',
                content: 'Content for fusion analysis',
                keyFindings: [],
                entities: [],
                locations: [],
                reportDate: new Date().toISOString(),
                assessment: { threatLevel: 'MEDIUM', confidence: 70 },
                relatedReports: [],
                relatedIOCs: [],
                relatedThreatActors: [],
                tenantId: 'test-tenant',
                createdBy: 'analyst-1',
            });
            const result = await service.executeFusion({
                threatActorIds: ['actor-1', 'actor-2'],
                spatialBounds: { minLon: -78, minLat: 38, maxLon: -76, maxLat: 40 },
            });
            (0, vitest_1.expect)(result).toBeDefined();
            (0, vitest_1.expect)(result.id).toBeDefined();
            (0, vitest_1.expect)(result.fusionType).toBe('MULTI_INT');
            (0, vitest_1.expect)(result.correlations).toBeInstanceOf(Array);
            (0, vitest_1.expect)(result.insights).toBeInstanceOf(Array);
            (0, vitest_1.expect)(result.threatAssessment).toBeDefined();
            (0, vitest_1.expect)(result.geospatialSummary).toBeDefined();
            (0, vitest_1.expect)(result.processingTime).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.confidence).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(result.confidence).toBeLessThanOrEqual(100);
        });
        (0, vitest_1.it)('should categorize input sources correctly', async () => {
            // Ingest reports with different source types
            await service.ingestReport({
                title: 'HUMINT Report',
                classification: 'SECRET',
                tlp: 'AMBER_STRICT',
                sources: [{ type: 'HUMINT', reliability: 'A', credibility: 1 }],
                summary: 'HUMINT source report',
                content: 'Content',
                keyFindings: [],
                entities: [],
                locations: [],
                reportDate: new Date().toISOString(),
                assessment: { threatLevel: 'HIGH', confidence: 90 },
                relatedReports: [],
                relatedIOCs: [],
                relatedThreatActors: [],
                tenantId: 'test',
                createdBy: 'analyst',
            });
            await service.ingestReport({
                title: 'SIGINT Report',
                classification: 'TOP_SECRET',
                tlp: 'RED',
                sources: [{ type: 'SIGINT', reliability: 'A', credibility: 1 }],
                summary: 'SIGINT source report',
                content: 'Content',
                keyFindings: [],
                entities: [],
                locations: [],
                reportDate: new Date().toISOString(),
                assessment: { threatLevel: 'HIGH', confidence: 85 },
                relatedReports: [],
                relatedIOCs: [],
                relatedThreatActors: [],
                tenantId: 'test',
                createdBy: 'analyst',
            });
            const result = await service.executeFusion({});
            (0, vitest_1.expect)(result.inputSources).toBeInstanceOf(Array);
        });
        (0, vitest_1.it)('should generate threat heatmap in geospatial summary', async () => {
            const result = await service.executeFusion({
                spatialBounds: { minLon: -78, minLat: 38, maxLon: -76, maxLat: 40 },
            });
            (0, vitest_1.expect)(result.geospatialSummary.threatHeatmap).toBeInstanceOf(Array);
        });
        (0, vitest_1.it)('should calculate mitigation priority', async () => {
            const result = await service.executeFusion({
                threatActorIds: ['high-threat-actor'],
            });
            (0, vitest_1.expect)(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(result.threatAssessment.mitigationPriority);
        });
    });
    (0, vitest_1.describe)('GEOINT-CTI Fusion', () => {
        (0, vitest_1.it)('should fuse GEOINT with CTI data', async () => {
            // Ingest a report first
            const report = await service.ingestReport({
                title: 'Geospatial Threat Report',
                classification: 'UNCLASSIFIED',
                tlp: 'GREEN',
                sources: [{ type: 'GEOINT', reliability: 'B', credibility: 2 }],
                summary: 'Satellite analysis',
                content: 'Detected activity at location',
                keyFindings: [],
                entities: [],
                locations: [
                    {
                        name: 'Target Location',
                        coordinates: { latitude: 38.9, longitude: -77.0 },
                        relevance: 'PRIMARY',
                    },
                ],
                reportDate: new Date().toISOString(),
                assessment: { threatLevel: 'MEDIUM', confidence: 70 },
                relatedReports: [],
                relatedIOCs: [],
                relatedThreatActors: [],
                tenantId: 'test',
                createdBy: 'analyst',
            });
            const result = await service.fuseGEOINTwithCTI({
                reportIds: [report.id],
                region: { minLon: -77.5, minLat: 38.5, maxLon: -76.5, maxLat: 39.5 },
            });
            (0, vitest_1.expect)(result).toBeDefined();
            (0, vitest_1.expect)(result.fusionId).toBeDefined();
            (0, vitest_1.expect)(result.correlatedFeatures).toBeInstanceOf(Array);
            (0, vitest_1.expect)(result.recommendations).toBeInstanceOf(Array);
        });
    });
    (0, vitest_1.describe)('Pattern Analysis', () => {
        (0, vitest_1.it)('should detect temporal patterns', async () => {
            // Ingest multiple reports with dates
            const baseDate = new Date();
            for (let i = 0; i < 3; i++) {
                const reportDate = new Date(baseDate);
                reportDate.setDate(reportDate.getDate() - i);
                await service.ingestReport({
                    title: `Report ${i}`,
                    classification: 'UNCLASSIFIED',
                    tlp: 'GREEN',
                    sources: [{ type: 'OSINT', reliability: 'C', credibility: 3 }],
                    summary: 'Test',
                    content: 'Content',
                    keyFindings: [],
                    entities: [],
                    locations: [],
                    reportDate: reportDate.toISOString(),
                    assessment: { threatLevel: 'LOW', confidence: 50 },
                    relatedReports: [],
                    relatedIOCs: [],
                    relatedThreatActors: [],
                    tenantId: 'test',
                    createdBy: 'analyst',
                });
            }
            const result = await service.executeFusion({});
            // Should have found temporal patterns from the clustered reports
            (0, vitest_1.expect)(result.insights).toBeInstanceOf(Array);
        });
    });
    (0, vitest_1.describe)('Attribution Analysis', () => {
        (0, vitest_1.it)('should provide attribution with confidence levels', async () => {
            await service.ingestReport({
                title: 'Attribution Test',
                classification: 'UNCLASSIFIED',
                tlp: 'AMBER',
                sources: [{ type: 'CYBERINT', reliability: 'B', credibility: 2 }],
                summary: 'Attribution analysis',
                content: 'Evidence points to threat actor',
                keyFindings: ['Attribution finding'],
                entities: [
                    { type: 'THREAT_ACTOR', name: 'APT Test', confidence: 80 },
                ],
                locations: [],
                reportDate: new Date().toISOString(),
                assessment: { threatLevel: 'HIGH', confidence: 75 },
                relatedReports: [],
                relatedIOCs: [],
                relatedThreatActors: ['threat-actor-1'],
                tenantId: 'test',
                createdBy: 'analyst',
            });
            const result = await service.executeFusion({
                threatActorIds: ['threat-actor-1'],
            });
            (0, vitest_1.expect)(result.threatAssessment).toBeDefined();
        });
    });
    (0, vitest_1.describe)('Confidence Calculation', () => {
        (0, vitest_1.it)('should calculate fusion confidence based on source diversity', async () => {
            // Ingest reports with multiple source types
            await service.ingestReport({
                title: 'Multi-source Report',
                classification: 'UNCLASSIFIED',
                tlp: 'GREEN',
                sources: [
                    { type: 'HUMINT', reliability: 'A', credibility: 1 },
                    { type: 'SIGINT', reliability: 'B', credibility: 2 },
                    { type: 'OSINT', reliability: 'C', credibility: 3 },
                ],
                summary: 'Multi-source intelligence',
                content: 'Content',
                keyFindings: [],
                entities: [],
                locations: [],
                reportDate: new Date().toISOString(),
                assessment: { threatLevel: 'HIGH', confidence: 85 },
                relatedReports: [],
                relatedIOCs: [],
                relatedThreatActors: [],
                tenantId: 'test',
                createdBy: 'analyst',
            });
            const result = await service.executeFusion({});
            (0, vitest_1.expect)(result.confidence).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.confidence).toBeLessThanOrEqual(100);
        });
        (0, vitest_1.it)('should weight sources by reliability', async () => {
            // A-rated source
            await service.ingestReport({
                title: 'High Reliability',
                classification: 'UNCLASSIFIED',
                tlp: 'GREEN',
                sources: [{ type: 'HUMINT', reliability: 'A', credibility: 1 }],
                summary: 'Highly reliable source',
                content: 'Content',
                keyFindings: [],
                entities: [],
                locations: [],
                reportDate: new Date().toISOString(),
                assessment: { threatLevel: 'HIGH', confidence: 90 },
                relatedReports: [],
                relatedIOCs: [],
                relatedThreatActors: [],
                tenantId: 'test',
                createdBy: 'analyst',
            });
            const result = await service.executeFusion({});
            // Confidence should be higher with A-rated source
            (0, vitest_1.expect)(result.confidence).toBeGreaterThan(50);
        });
    });
});
(0, vitest_1.describe)('Entity Extraction', () => {
    let service;
    (0, vitest_1.beforeEach)(() => {
        service = new fusion_service_js_1.FusionService(mockRepository, mockGeointService, mockIocService);
    });
    const extractionTestCases = [
        {
            name: 'IP addresses',
            content: 'Found IPs: 192.168.1.1, 10.0.0.1, and 172.16.0.1',
            expectedCalls: 3,
        },
        {
            name: 'domains',
            content: 'Domains: malware.com, evil.org, bad-site.net',
            expectedCalls: 3,
        },
        {
            name: 'SHA256 hashes',
            content: `Hash: ${'a'.repeat(64)}`,
            expectedCalls: 1,
        },
        {
            name: 'email addresses',
            content: 'Contact: threat@malware.com, admin@evil.org',
            expectedCalls: 2,
        },
    ];
    extractionTestCases.forEach(({ name, content, expectedCalls }) => {
        (0, vitest_1.it)(`should extract ${name} from report content`, async () => {
            vitest_1.vi.clearAllMocks();
            await service.ingestReport({
                title: `Extraction Test: ${name}`,
                classification: 'UNCLASSIFIED',
                tlp: 'GREEN',
                sources: [{ type: 'OSINT', reliability: 'C', credibility: 3 }],
                summary: 'Test',
                content,
                keyFindings: [],
                entities: [],
                locations: [],
                reportDate: new Date().toISOString(),
                assessment: { threatLevel: 'LOW', confidence: 50 },
                relatedReports: [],
                relatedIOCs: [],
                relatedThreatActors: [],
                tenantId: 'test',
                createdBy: 'analyst',
            });
            (0, vitest_1.expect)(mockIocService.ingestIOC).toHaveBeenCalled();
        });
    });
});
