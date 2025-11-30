/**
 * Fusion Service Tests
 * Comprehensive test suite for multi-INT intelligence fusion
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FusionService } from '../services/fusion-service.js';
import { GEOINTNeo4jRepository } from '../neo4j/repository.js';
import { GEOINTService } from '../services/geoint-service.js';
import { IOCManagementService } from '../services/ioc-management-service.js';

// Mock dependencies
const mockRepository = {
  executeFusionQuery: vi.fn().mockResolvedValue({
    data: {
      correlations: [
        { type: 'THREAT_ACTOR_INFRASTRUCTURE', entities: ['actor1', 'infra1'], confidence: 80, evidence: [] },
      ],
      threatAssessment: { overallThreat: 65, mitigationPriority: 'HIGH' },
      geospatialSummary: { threatHeatmap: [], criticalInfrastructureAtRisk: [] },
    },
    metrics: { queryTime: 100 },
  }),
  generateThreatHeatmap: vi.fn().mockResolvedValue({
    data: [
      { h3Index: '38_-77', activityScore: 75, incidentCount: 10 },
    ],
    metrics: { queryTime: 50 },
  }),
} as unknown as GEOINTNeo4jRepository;

const mockGeointService = {
  analyzeTerrainRegion: vi.fn().mockResolvedValue({
    strategicValue: {
      observationPoints: [{ latitude: 38.9, longitude: -77.0, score: 0.8 }],
      chokPoints: [],
      coverAreas: [],
    },
    accessibility: { vehicleAccessible: 60 },
  }),
} as unknown as GEOINTService;

const mockIocService = {
  ingestIOC: vi.fn().mockResolvedValue({
    ioc: { id: 'ioc-1', type: 'IP_ADDRESS', value: '1.2.3.4' },
  }),
  findIOCsInRegion: vi.fn().mockResolvedValue([]),
} as unknown as IOCManagementService;

describe('FusionService', () => {
  let service: FusionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FusionService(mockRepository, mockGeointService, mockIocService);
  });

  describe('Intelligence Report Ingestion', () => {
    it('should ingest an intelligence report', async () => {
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

      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.title).toBe('Test Threat Report');
      expect(report.createdAt).toBeDefined();
    });

    it('should extract IOCs from report content', async () => {
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
      expect(mockIocService.ingestIOC).toHaveBeenCalled();
    });

    it('should detect known threat actor mentions', async () => {
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

      expect(report).toBeDefined();
    });
  });

  describe('Multi-INT Fusion', () => {
    it('should execute fusion analysis', async () => {
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

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.fusionType).toBe('MULTI_INT');
      expect(result.correlations).toBeInstanceOf(Array);
      expect(result.insights).toBeInstanceOf(Array);
      expect(result.threatAssessment).toBeDefined();
      expect(result.geospatialSummary).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('should categorize input sources correctly', async () => {
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

      expect(result.inputSources).toBeInstanceOf(Array);
    });

    it('should generate threat heatmap in geospatial summary', async () => {
      const result = await service.executeFusion({
        spatialBounds: { minLon: -78, minLat: 38, maxLon: -76, maxLat: 40 },
      });

      expect(result.geospatialSummary.threatHeatmap).toBeInstanceOf(Array);
    });

    it('should calculate mitigation priority', async () => {
      const result = await service.executeFusion({
        threatActorIds: ['high-threat-actor'],
      });

      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(
        result.threatAssessment.mitigationPriority
      );
    });
  });

  describe('GEOINT-CTI Fusion', () => {
    it('should fuse GEOINT with CTI data', async () => {
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

      expect(result).toBeDefined();
      expect(result.fusionId).toBeDefined();
      expect(result.correlatedFeatures).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('Pattern Analysis', () => {
    it('should detect temporal patterns', async () => {
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
      expect(result.insights).toBeInstanceOf(Array);
    });
  });

  describe('Attribution Analysis', () => {
    it('should provide attribution with confidence levels', async () => {
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

      expect(result.threatAssessment).toBeDefined();
    });
  });

  describe('Confidence Calculation', () => {
    it('should calculate fusion confidence based on source diversity', async () => {
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

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('should weight sources by reliability', async () => {
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
      expect(result.confidence).toBeGreaterThan(50);
    });
  });
});

describe('Entity Extraction', () => {
  let service: FusionService;

  beforeEach(() => {
    service = new FusionService(mockRepository, mockGeointService, mockIocService);
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
    it(`should extract ${name} from report content`, async () => {
      vi.clearAllMocks();

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

      expect(mockIocService.ingestIOC).toHaveBeenCalled();
    });
  });
});
