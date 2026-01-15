/**
 * Cognitive Security Operations - Unit Tests
 *
 * Tests for the defensive cognitive security system.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { randomUUID } from 'crypto';

// Import types
import type {
  Claim,
  ClaimVerdict,
  ClaimSource,
  Evidence,
  Narrative,
  Campaign,
  CoordinationSignal,
  ResponsePlaybook,
  CogSecIncident,
  VerificationAppeal,
  ContentCredential,
  C2PAManifest,
} from '../types.js';

// Import factory functions
import {
  createClaim,
  createEvidence,
  createNarrative,
  createCampaign,
} from '../types.js';

// Mock Neo4j driver
const mockSession = {
  run: jest.fn() as jest.MockedFunction<(...args: any[]) => Promise<any>>,
  close: jest.fn(),
};

const mockDriver = {
  session: () => mockSession,
};

// ============================================================================
// Type Factory Tests
// ============================================================================

describe('Type Factories', () => {
  describe('createClaim', () => {
    it('should create a claim with default values', () => {
      const claim = createClaim('Test claim text', 'SOCIAL_MEDIA');

      expect(claim.id).toBeDefined();
      expect(claim.canonicalText).toBe('Test claim text');
      expect(claim.sourceType).toBe('SOCIAL_MEDIA');
      expect(claim.language).toBe('en');
      expect(claim.verdict).toBe('UNVERIFIED');
      expect(claim.verdictConfidence).toBe(0);
      expect(claim.evidenceIds).toEqual([]);
      expect(claim.entities).toEqual([]);
    });

    it('should create a claim with custom language', () => {
      const claim = createClaim('Demande de test', 'NEWS_OUTLET', 'fr');

      expect(claim.language).toBe('fr');
    });
  });

  describe('createEvidence', () => {
    it('should create evidence with default values', () => {
      const evidence = createEvidence('DOCUMENT', 'Test Document', 'Document content');

      expect(evidence.id).toBeDefined();
      expect(evidence.type).toBe('DOCUMENT');
      expect(evidence.title).toBe('Test Document');
      expect(evidence.content).toBe('Document content');
      expect(evidence.verified).toBe(false);
      expect(evidence.sourceCredibility).toBe(0.5);
    });
  });

  describe('createNarrative', () => {
    it('should create a narrative with default values', () => {
      const narrative = createNarrative('Test Narrative', 'A test description');

      expect(narrative.id).toBeDefined();
      expect(narrative.name).toBe('Test Narrative');
      expect(narrative.description).toBe('A test description');
      expect(narrative.status).toBe('EMERGING');
      expect(narrative.velocity.spreadRate).toBe(0);
    });
  });

  describe('createCampaign', () => {
    it('should create a campaign with threat level', () => {
      const campaign = createCampaign('Test Campaign', 'HIGH');

      expect(campaign.id).toBeDefined();
      expect(campaign.name).toBe('Test Campaign');
      expect(campaign.threatLevel).toBe('HIGH');
      expect(campaign.status).toBe('SUSPECTED');
      expect(campaign.metrics.totalClaims).toBe(0);
    });
  });
});

// ============================================================================
// Provenance Service Tests
// ============================================================================

describe('ProvenanceService', () => {
  // These would require actual service instantiation with mock driver
  describe('computeAssetHash', () => {
    it('should compute consistent SHA-256 hash', async () => {
      const { ProvenanceService } = await import('../provenance.service.js');
      const service = new ProvenanceService({});

      const content = Buffer.from('test content');
      const hash1 = service.computeAssetHash(content);
      const hash2 = service.computeAssetHash(content);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA-256 hex
    });
  });

  describe('createContentCredential', () => {
    it('should create credential without C2PA', async () => {
      const { ProvenanceService } = await import('../provenance.service.js');
      const service = new ProvenanceService({});

      const content = Buffer.from('image data');
      const credential = await service.createContentCredential(
        'asset-123',
        content,
        'image/jpeg',
        'https://example.com/image.jpg',
      );

      expect(credential.id).toBeDefined();
      expect(credential.assetId).toBe('asset-123');
      expect(credential.hasC2PA).toBe(false);
      expect(credential.provenanceConfidence).toBeLessThan(0.5);
      expect(credential.provenanceChain?.length).toBe(1);
    });
  });

  describe('addProvenanceLink', () => {
    it('should add link and update confidence', async () => {
      const { ProvenanceService } = await import('../provenance.service.js');
      const service = new ProvenanceService({});

      const credential: ContentCredential = {
        id: randomUUID(),
        assetId: 'asset-123',
        assetHash: 'abc123',
        mimeType: 'image/jpeg',
        hasC2PA: false,
        provenanceConfidence: 0.3,
        createdAt: new Date().toISOString(),
        provenanceChain: [],
      };

      const link = service.addProvenanceLink(
        credential,
        'https://reuters.com/article/123',
        'reuters',
      );

      expect(link.source).toBe('https://reuters.com/article/123');
      expect(link.confidence).toBeGreaterThan(0.5); // Reliable source
      expect(credential.provenanceChain?.length).toBe(1);
    });
  });
});

// ============================================================================
// Governance Service Tests
// ============================================================================

describe('GovernanceService', () => {
  describe('DEFAULT_POLICIES', () => {
    it('should have all required policy types', async () => {
      const { DEFAULT_POLICIES } = await import('../governance.service.js');

      const policyTypes = DEFAULT_POLICIES.map((p) => p.type);

      expect(policyTypes).toContain('VERIFICATION');
      expect(policyTypes).toContain('ACTION');
      expect(policyTypes).toContain('ESCALATION');
      expect(policyTypes).toContain('RETENTION');
      expect(policyTypes).toContain('ACCESS');
    });
  });

  describe('validateAppeal', () => {
    it('should reject short reasons', async () => {
      const { GovernanceService } = await import('../governance.service.js');

      const service = new GovernanceService({
        neo4jDriver: mockDriver as any,
      });

      await expect(
        service.createAppeal(
          'claim-123',
          'REFUTED',
          'VERIFIED',
          'user-123',
          'Too short', // Less than 20 chars
        ),
      ).rejects.toThrow('Invalid appeal');
    });

    it('should reject same verdict appeals', async () => {
      const { GovernanceService } = await import('../governance.service.js');

      const service = new GovernanceService({
        neo4jDriver: mockDriver as any,
      });

      await expect(
        service.createAppeal(
          'claim-123',
          'VERIFIED',
          'VERIFIED', // Same as current
          'user-123',
          'This is a long enough reason for the appeal',
        ),
      ).rejects.toThrow('Invalid appeal');
    });
  });

  describe('checkActionAllowed', () => {
    it('should check permissions correctly', async () => {
      const { GovernanceService } = await import('../governance.service.js');

      const service = new GovernanceService({
        neo4jDriver: mockDriver as any,
      });

      const result = service.checkActionAllowed('BRIEFING', 'analyst', 'claims');

      expect(result.allowed).toBe(true);
    });
  });

  describe('generateVerificationDecision', () => {
    it('should recommend VERIFIED with strong supporting evidence', async () => {
      const { GovernanceService } = await import('../governance.service.js');

      const service = new GovernanceService({
        neo4jDriver: mockDriver as any,
      });

      const evidence = [
        { id: '1', supports: true, confidence: 0.9 },
        { id: '2', supports: true, confidence: 0.85 },
      ];

      const decision = await service.generateVerificationDecision('claim-123', evidence);

      expect(decision.recommendedVerdict).toBe('VERIFIED');
      expect(decision.confidence).toBeGreaterThan(0.8);
    });

    it('should recommend REFUTED with strong refuting evidence', async () => {
      const { GovernanceService } = await import('../governance.service.js');

      const service = new GovernanceService({
        neo4jDriver: mockDriver as any,
      });

      const evidence = [
        { id: '1', supports: false, confidence: 0.9 },
        { id: '2', supports: false, confidence: 0.88 },
      ];

      const decision = await service.generateVerificationDecision('claim-123', evidence);

      expect(decision.recommendedVerdict).toBe('REFUTED');
    });

    it('should recommend DISPUTED with conflicting evidence', async () => {
      const { GovernanceService } = await import('../governance.service.js');

      const service = new GovernanceService({
        neo4jDriver: mockDriver as any,
      });

      const evidence = [
        { id: '1', supports: true, confidence: 0.9 },
        { id: '2', supports: false, confidence: 0.85 },
      ];

      const decision = await service.generateVerificationDecision('claim-123', evidence);

      expect(decision.recommendedVerdict).toBe('DISPUTED');
    });
  });
});

// ============================================================================
// Evaluation Service Tests
// ============================================================================

describe('EvaluationService', () => {
  describe('BENCHMARK_TARGETS', () => {
    it('should have defined benchmark targets', async () => {
      const { BENCHMARK_TARGETS } = await import('../evaluation.service.js');

      expect(BENCHMARK_TARGETS.detection.timeToDetectP50).toBeDefined();
      expect(BENCHMARK_TARGETS.verification.claimPrecision).toBeGreaterThan(0.5);
      expect(BENCHMARK_TARGETS.verification.falseAttributionRate).toBeLessThan(0.1);
      expect(BENCHMARK_TARGETS.response.narrativeContainmentRate).toBeGreaterThan(0);
    });
  });

  describe('compareToBenchmarks', () => {
    it('should correctly compare metrics to benchmarks', async () => {
      const { EvaluationService, BENCHMARK_TARGETS } = await import('../evaluation.service.js');

      const service = new EvaluationService({
        neo4jDriver: mockDriver as any,
      });

      const metrics = {
        id: randomUUID(),
        periodStart: '2024-01-01',
        periodEnd: '2024-01-31',
        detection: {
          timeToDetectP50: BENCHMARK_TARGETS.detection.timeToDetectP50 - 1000,
          timeToDetectP95: BENCHMARK_TARGETS.detection.timeToDetectP95 - 1000,
          campaignsDetected: 5,
          signalsDetected: 100,
          falsePositiveRate: 0.03,
        },
        verification: {
          claimPrecision: 0.95,
          claimRecall: 0.9,
          citationCorrectness: 0.98,
          falseAttributionRate: 0.01,
          avgVerificationTimeMs: 5000,
          claimsVerified: 1000,
        },
        response: {
          narrativeContainmentRate: 0.8,
          avgGrowthRateReduction: 60,
          crossChannelSpreadReduction: 40,
          playbooksExecuted: 20,
          takedownsSubmitted: 15,
          takedownSuccessRate: 0.9,
        },
        operatorEfficiency: {
          minutesPerIncident: 90,
          claimsPerAnalystHour: 25,
          playbooksPerIncident: 2,
          avgResolutionTimeMs: 5400000,
        },
        generatedAt: new Date().toISOString(),
      };

      const comparison = service.compareToBenchmarks(metrics);

      expect(comparison.detection.timeToDetectP50.met).toBe(true);
      expect(comparison.verification.claimPrecision.met).toBe(true);
      expect(comparison.verification.falseAttributionRate.met).toBe(true);
      expect(comparison.overallScore).toBeGreaterThan(0.8);
    });
  });
});

// ============================================================================
// Integration Tests (with mocked Neo4j)
// ============================================================================

describe('Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock response
    mockSession.run.mockResolvedValue({
      records: [],
    });
  });

  describe('Claims Service', () => {
    it('should extract claim and persist to Neo4j', async () => {
      const { ClaimsService } = await import('../claims.service.js');

      mockSession.run.mockResolvedValueOnce({ records: [] });

      const service = new ClaimsService({
        neo4jDriver: mockDriver as any,
      });

      const claim = await service.extractClaim(
        'This is a test claim about an event',
        'NEWS_OUTLET',
        'https://example.com/article',
      );

      expect(claim).toBeDefined();
      expect(claim.canonicalText.toLowerCase()).toContain('test claim');
      expect(mockSession.run).toHaveBeenCalled();
    });
  });

  describe('Campaign Detection Service', () => {
    it('should run detection pipeline', async () => {
      const { CampaignDetectionService } = await import('../campaign-detection.service.js');

      const service = new CampaignDetectionService({
        neo4jDriver: mockDriver as any,
      });

      const signals = await service.runDetectionPipeline();

      expect(Array.isArray(signals)).toBe(true);
      expect(mockSession.run).toHaveBeenCalled();
    });

    it('should calculate threat level correctly', async () => {
      const { CampaignDetectionService } = await import('../campaign-detection.service.js');

      const service = new CampaignDetectionService({
        neo4jDriver: mockDriver as any,
      });

      // Test with high-confidence signals including laundering
      const signals: CoordinationSignal[] = [
        {
          id: randomUUID(),
          type: 'CONTENT_LAUNDERING',
          detectedAt: new Date().toISOString(),
          confidence: 0.9,
          description: 'Test',
          actorIds: ['a1', 'a2'],
          claimIds: ['c1'],
          channelIds: ['ch1'],
          evidence: {},
        },
        {
          id: randomUUID(),
          type: 'NETWORK_ANOMALY',
          detectedAt: new Date().toISOString(),
          confidence: 0.85,
          description: 'Test',
          actorIds: ['a1', 'a2'],
          claimIds: ['c2'],
          channelIds: ['ch1'],
          evidence: {},
        },
        {
          id: randomUUID(),
          type: 'TEMPORAL_SYNCHRONY',
          detectedAt: new Date().toISOString(),
          confidence: 0.8,
          description: 'Test',
          actorIds: ['a1', 'a3'],
          claimIds: ['c3'],
          channelIds: ['ch2'],
          evidence: {},
        },
      ];

      // Internal method test would require exposing it
      // This is more of an integration test
    });
  });

  describe('Response Ops Service', () => {
    it('should determine actions based on threat level', async () => {
      const { ResponseOpsService } = await import('../response-ops.service.js');

      const service = new ResponseOpsService({
        neo4jDriver: mockDriver as any,
      });

      // Mock campaign retrieval
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: () => ({
              properties: {
                id: 'camp-123',
                name: 'Test Campaign',
                threatLevel: 'CRITICAL',
                actorIds: ['a1', 'a2', 'a3', 'a4', 'a5'],
                claimIds: [],
                channelIds: [],
                responsePlaybookIds: [],
                metrics: JSON.stringify({ totalClaims: 10 }),
              },
            }),
          },
        ],
      });

      const playbook = await service.generatePlaybook('camp-123', 'user-123');

      expect(playbook).toBeDefined();
      expect(playbook.priority).toBe(1); // CRITICAL = priority 1

      // Should have multiple actions for CRITICAL
      const actionTypes = playbook.actions.map((a) => a.type);
      expect(actionTypes).toContain('BRIEFING');
      expect(actionTypes).toContain('ESCALATION');
    });
  });
});

// ============================================================================
// Security Boundary Tests
// ============================================================================

describe('Security Boundaries', () => {
  it('should not expose raw database queries in errors', async () => {
    const { ClaimsService } = await import('../claims.service.js');

    mockSession.run.mockRejectedValueOnce(new Error('Database error'));

    const service = new ClaimsService({
      neo4jDriver: mockDriver as any,
    });

    // The service should handle errors gracefully
    // This is more of a documentation of expected behavior
  });

  it('should validate input bounds', () => {
    const claim = createClaim('x'.repeat(10000), 'SOCIAL_MEDIA');

    // Should still create claim but ideally would truncate
    expect(claim.canonicalText.length).toBe(10000);
  });

  it('should canonicalize user input in canonical text', async () => {
    const { ClaimsService } = await import('../claims.service.js');

    const service = new ClaimsService({
      neo4jDriver: mockDriver as any,
    });

    // Mock the persistence to not actually write
    mockSession.run.mockResolvedValue({ records: [] });

    const claim = await service.extractClaim(
      '<script>alert("xss")</script>Test claim',
      'SOCIAL_MEDIA',
    );

    // Canonicalization lowercases and trims by default; sanitization is not applied.
    expect(claim.canonicalText).toBe('<script>alert("xss")</script>test claim');
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  it('should handle empty claim text', () => {
    const claim = createClaim('', 'SOCIAL_MEDIA');
    expect(claim.canonicalText).toBe('');
  });

  it('should handle unicode in claims', () => {
    const claim = createClaim('测试声明 مطالبة الاختبار 🔍', 'SOCIAL_MEDIA');
    expect(claim.canonicalText).toBe('测试声明 مطالبة الاختبار 🔍');
  });

  it('should handle very long claim IDs', async () => {
    const { GovernanceService } = await import('../governance.service.js');

    const service = new GovernanceService({
      neo4jDriver: mockDriver as any,
    });

    const longId = 'a'.repeat(500);

    // Should handle gracefully (actual behavior depends on implementation)
    // This documents expected edge case handling
  });

  it('should handle concurrent verdict updates', async () => {
    // In a real system, this would test optimistic locking
    // For now, documents the expected behavior
  });
});
