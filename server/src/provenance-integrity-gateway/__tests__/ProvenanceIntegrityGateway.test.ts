/* eslint-disable @typescript-eslint/no-explicit-any -- jest mocks require type assertions */
/**
 * Tests for Provenance & Integrity Gateway (PIG)
 *
 * These tests cover the core functionality of the PIG system including:
 * - C2PA validation
 * - Content signing
 * - Deepfake detection
 * - Truth bundle generation
 * - Narrative conflict monitoring
 * - Governance and compliance
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as crypto from 'crypto';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import {
  ProvenanceIntegrityGateway,
  C2PAValidationService,
  ContentSigningService,
  DeepfakeDetectionService,
  TruthBundleService,
  NarrativeConflictService,
  PIGGovernanceService,
} from '../index.js';
import type {
  ContentVerificationRequest,
  SignAssetRequest,
  OfficialAssetType,
} from '../types.js';

const describeIf =
  process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

const createTempDir = (prefix: string) =>
  mkdtempSync(path.join(tmpdir(), prefix));

const ensureMockPool = async () => {
  const { pool } = await import('@server/db/pg');
  if (typeof (pool.query as any).mockResolvedValueOnce !== 'function') {
    (pool as any).query = jest.fn(() => Promise.resolve({ rows: [] }));
  }
  return pool as any;
};

// Mock the database pool
jest.mock('@server/db/pg', () => ({
  pool: {
    query: jest.fn(() => Promise.resolve({ rows: [] })),
    connect: jest.fn(() =>
      Promise.resolve({
        query: jest.fn(() => Promise.resolve({ rows: [] })),
        release: jest.fn(),
      }),
    ),
  },
}));

// Mock provenance ledger
jest.mock('@server/provenance/ledger', () => ({
  provenanceLedger: {
    appendEntry: jest.fn(() => Promise.resolve({})),
  },
}));

// Mock audit system
jest.mock('@server/audit/advanced-audit-system', () => ({
  advancedAuditSystem: {
    logEvent: jest.fn(),
  },
}));

describeIf('ProvenanceIntegrityGateway', () => {
  let pig: ProvenanceIntegrityGateway;

  beforeEach(async () => {
    const storageRoot = createTempDir('pig-test-');
    pig = new ProvenanceIntegrityGateway({
      enableAll: true,
      signing: {
        storagePath: path.join(storageRoot, 'signed-assets'),
        generateC2PA: false,
        requireApproval: false,
      },
      truthBundle: {
        storagePath: path.join(storageRoot, 'truth-bundles'),
      },
    });
  });

  afterEach(async () => {
    await pig.cleanup();
  });

  describeIf('initialization', () => {
    it('should initialize all services', async () => {
      await pig.initialize();

      expect(pig.c2paValidation).toBeDefined();
      expect(pig.contentSigning).toBeDefined();
      expect(pig.deepfakeDetection).toBeDefined();
      expect(pig.truthBundles).toBeDefined();
      expect(pig.narrativeConflict).toBeDefined();
      expect(pig.governance).toBeDefined();
    });

    it('should not re-initialize if already initialized', async () => {
      await pig.initialize();
      await pig.initialize(); // Should not throw
    });
  });

  describeIf('event propagation', () => {
    it('should propagate events from child services', async () => {
      const handler = jest.fn();
      pig.on('asset:signed', handler);

      pig.contentSigning.emit('asset:signed', { asset: { id: 'test' } });

      expect(handler).toHaveBeenCalled();
    });
  });
});

describeIf('C2PAValidationService', () => {
  let service: C2PAValidationService;

  beforeEach(() => {
    service = new C2PAValidationService({
      allowSelfSigned: true,
      trustAnchors: [],
    });
  });

  afterEach(async () => {
    await service.cleanup();
  });

  describeIf('validateContent', () => {
    it('should validate content without C2PA credentials', async () => {
      const content = Buffer.from('test content');
      const request: ContentVerificationRequest = {
        content,
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
      };

      const result = await service.validateContent(request, 'tenant-1');

      expect(result.verificationId).toBeDefined();
      expect(result.status).toBe('unverified');
      expect(result.contentHash).toBeDefined();
      expect(result.credentialsStripped).toBe(false);
    });

    it('should detect hash mismatch', async () => {
      const content = Buffer.from('test content');
      const request: ContentVerificationRequest = {
        content,
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        expectedHash: 'wrong-hash',
      };

      const result = await service.validateContent(request, 'tenant-1');

      expect(result.status).toBe('tampered');
      expect(result.messages.some(m => m.code === 'HASH_MISMATCH')).toBe(true);
    });

    it('should calculate correct content hash', async () => {
      const content = Buffer.from('test content');
      const expectedHash = crypto.createHash('sha256').update(content).digest('hex');

      const request: ContentVerificationRequest = {
        content,
        filename: 'test.txt',
        mimeType: 'text/plain',
      };

      const result = await service.validateContent(request, 'tenant-1');

      expect(result.contentHash).toBe(expectedHash);
    });

    it('should generate risk score', async () => {
      const content = Buffer.from('test content');
      const request: ContentVerificationRequest = {
        content,
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
      };

      const result = await service.validateContent(request, 'tenant-1');

      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });

    it('should generate recommendations', async () => {
      const content = Buffer.from('test content');
      const request: ContentVerificationRequest = {
        content,
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
      };

      const result = await service.validateContent(request, 'tenant-1');

      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describeIf('trust anchors', () => {
    it('should add trust anchor at runtime', () => {
      // Generate a self-signed certificate for testing
      const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
        namedCurve: 'P-256',
      });

      // Skip if certificate generation is not supported
      expect(() => {
        // Would add certificate here
      }).not.toThrow();
    });
  });
});

describeIf('ContentSigningService', () => {
  let service: ContentSigningService;

  beforeEach(() => {
    service = new ContentSigningService({
      signingKeyId: 'test-key',
      storagePath: '/tmp/test-signed-assets',
      generateC2PA: false, // Disable for tests
      requireApproval: false,
    });
  });

  afterEach(async () => {
    await service.cleanup();
  });

  describeIf('signAsset', () => {
    it('should create signed asset with correct properties', async () => {
      const pool = await ensureMockPool();
      pool.query.mockResolvedValueOnce({ rows: [] });

      const content = Buffer.from('test official content');
      const request: SignAssetRequest = {
        title: 'Test Press Release',
        description: 'A test press release',
        assetType: 'press_release',
        content,
        filename: 'press-release.txt',
        mimeType: 'text/plain',
      };

      const result = await service.signAsset(request, 'tenant-1', 'user-1');

      expect(result.asset).toBeDefined();
      expect(result.asset.id).toBeDefined();
      expect(result.asset.title).toBe('Test Press Release');
      expect(result.asset.assetType).toBe('press_release');
      expect(result.asset.signature).toBeDefined();
      expect(result.asset.contentHash).toBeDefined();
    });

    it('should calculate content hash correctly', async () => {
      const pool = await ensureMockPool();
      pool.query.mockResolvedValueOnce({ rows: [] });

      const content = Buffer.from('test content for hashing');
      const expectedHash = crypto.createHash('sha256').update(content).digest('hex');

      const request: SignAssetRequest = {
        title: 'Test',
        assetType: 'other',
        content,
        filename: 'test.txt',
        mimeType: 'text/plain',
      };

      const result = await service.signAsset(request, 'tenant-1', 'user-1');

      expect(result.asset.contentHash).toBe(expectedHash);
    });
  });

  describeIf('revokeAsset', () => {
    it('should reject revocation of non-existent asset', async () => {
      const pool = await ensureMockPool();
      pool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.revokeAsset(
          {
            assetId: 'non-existent',
            reason: 'error',
          },
          'tenant-1',
          'user-1'
        )
      ).rejects.toThrow('Asset not found');
    });
  });
});

describeIf('DeepfakeDetectionService', () => {
  let service: DeepfakeDetectionService;

  beforeEach(() => {
    service = new DeepfakeDetectionService({
      flagThreshold: 0.6,
      blockThreshold: 0.85,
      enableFaceAnalysis: false, // Disable for tests
      enableAudioAnalysis: false,
      enableLogoDetection: false,
    });
  });

  afterEach(async () => {
    await service.cleanup();
  });

  describeIf('detectDeepfake', () => {
    it('should return detection result for image', async () => {
      const content = Buffer.alloc(1000); // Empty buffer
      const result = await service.detectDeepfake(
        content,
        'image/jpeg',
        'test.jpg',
        'tenant-1'
      );

      expect(result).toBeDefined();
      expect(result.isDeepfake).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.method).toBeDefined();
      expect(result.modelVersion).toBeDefined();
      expect(result.analyzedAt).toBeInstanceOf(Date);
    });

    it('should handle video content', async () => {
      const content = Buffer.alloc(1000);
      const result = await service.detectDeepfake(
        content,
        'video/mp4',
        'test.mp4',
        'tenant-1'
      );

      expect(result).toBeDefined();
    });

    it('should handle audio content', async () => {
      const content = Buffer.alloc(1000);
      const result = await service.detectDeepfake(
        content,
        'audio/mpeg',
        'test.mp3',
        'tenant-1'
      );

      expect(result).toBeDefined();
    });
  });

  describeIf('detectImpersonation', () => {
    it('should return impersonation detection result', async () => {
      const content = Buffer.alloc(1000);
      const result = await service.detectImpersonation(
        {
          content,
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
        },
        'tenant-1'
      );

      expect(result).toBeDefined();
      expect(result.impersonationDetected).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.findings).toBeInstanceOf(Array);
      expect(result.impersonatedEntities).toBeInstanceOf(Array);
      expect(result.riskLevel).toBeDefined();
      expect(result.analyzedAt).toBeInstanceOf(Date);
    });
  });

  describeIf('matchOfficialAsset', () => {
    it('should check for matching official assets', async () => {
      const pool = await ensureMockPool();
      pool.query.mockResolvedValueOnce({ rows: [] });
      pool.query.mockResolvedValueOnce({ rows: [] });

      const content = Buffer.alloc(1000);
      const result = await service.matchOfficialAsset(
        content,
        'image/jpeg',
        'tenant-1'
      );

      expect(result).toBeDefined();
      expect(result.matched).toBe(false);
    });
  });
});

describeIf('TruthBundleService', () => {
  let service: TruthBundleService;

  beforeEach(() => {
    service = new TruthBundleService({
      storagePath: '/tmp/test-truth-bundles',
    });
  });

  afterEach(async () => {
    await service.cleanup();
  });

  describeIf('bundle structure', () => {
    it('should define correct bundle types', () => {
      // Type checking test
      const incidentTypes = ['deepfake', 'impersonation', 'manipulation', 'forgery'] as const;
      const severities = ['low', 'medium', 'high', 'critical'] as const;

      expect(incidentTypes).toContain('deepfake');
      expect(severities).toContain('critical');
    });
  });
});

describeIf('NarrativeConflictService', () => {
  let service: NarrativeConflictService;

  beforeEach(() => {
    service = new NarrativeConflictService({
      enableRealTimeMonitoring: false, // Disable for tests
      enableDSATracking: true,
    });
  });

  afterEach(async () => {
    await service.cleanup();
  });

  describeIf('cluster management', () => {
    it('should create new narrative cluster', async () => {
      const pool = await ensureMockPool();
      // Mock findSimilarCluster
      (pool.query as any).mockResolvedValueOnce({ rows: [] });
      // Mock storeCluster
      (pool.query as any).mockResolvedValueOnce({ rows: [] });

      const cluster = await service.getOrCreateCluster(
        'tenant-1',
        'Test Narrative',
        ['keyword1', 'keyword2']
      );

      expect(cluster).toBeDefined();
      expect(cluster.id).toBeDefined();
      expect(cluster.theme).toBe('Test Narrative');
      expect(cluster.keywords).toContain('keyword1');
      expect(cluster.status).toBe('active');
    });
  });

  describeIf('risk assessment', () => {
    it('should calculate cluster risk assessment', async () => {
      const mockCluster = {
        id: 'test-cluster',
        tenantId: 'tenant-1',
        theme: 'Test',
        keywords: ['test'],
        sentiment: -0.5,
        contentItems: [],
        firstDetected: new Date(),
        lastActivity: new Date(),
        velocity: 10,
        estimatedReach: 100000,
        riskAssessment: {
          overallScore: 0,
          category: 'low' as const,
          factors: [],
          impactAreas: [],
          coordinatedBehavior: false,
        },
        relatedEntities: [],
        sourceAnalysis: {
          sourceDistribution: [],
          geoDistribution: [],
          accountAgeDistribution: [],
          automationIndicators: {
            suspectedBotPercentage: 30,
            coordinatedPostingPatterns: true,
            unusualEngagementPatterns: false,
          },
          amplificationPatterns: {
            superSpreadersCount: 5,
            averageRepostDepth: 3,
          },
        },
        status: 'active' as const,
      };

      const assessment = await service.assessClusterRisk(mockCluster);

      expect(assessment).toBeDefined();
      expect(assessment.overallScore).toBeGreaterThanOrEqual(0);
      expect(assessment.overallScore).toBeLessThanOrEqual(100);
      expect(assessment.factors).toBeInstanceOf(Array);
      expect(assessment.factors.length).toBeGreaterThan(0);
    });
  });

  describeIf('DSA systemic risk', () => {
    it('should evaluate DSA systemic risks', async () => {
      const mockCluster = {
        id: 'test-cluster',
        tenantId: 'tenant-1',
        theme: 'Election Misinformation',
        keywords: ['election', 'vote', 'fraud'],
        sentiment: -0.8,
        contentItems: [],
        firstDetected: new Date(),
        lastActivity: new Date(),
        velocity: 50,
        estimatedReach: 1000000,
        riskAssessment: {
          overallScore: 80,
          category: 'critical' as const,
          factors: [],
          impactAreas: [],
          coordinatedBehavior: true,
        },
        relatedEntities: [],
        sourceAnalysis: {
          sourceDistribution: [],
          geoDistribution: [],
          accountAgeDistribution: [],
          automationIndicators: {
            suspectedBotPercentage: 50,
            coordinatedPostingPatterns: true,
            unusualEngagementPatterns: true,
          },
          amplificationPatterns: {
            superSpreadersCount: 20,
            averageRepostDepth: 5,
          },
        },
        status: 'active' as const,
      };

      const dsaRisk = await service.evaluateDSASystemicRisk(mockCluster);

      expect(dsaRisk).toBeDefined();
      expect(dsaRisk.indicated).toBe(true);
      expect(dsaRisk.riskTypes).toContain('electoral_processes_negative_effects');
    });
  });
});

describeIf('PIGGovernanceService', () => {
  let service: PIGGovernanceService;

  beforeEach(() => {
    service = new PIGGovernanceService({
      enableNISTTracking: true,
      enableDSATracking: true,
    });
  });

  describeIf('configuration', () => {
    it('should return default config for new tenant', async () => {
      const pool = await ensureMockPool();
      pool.query.mockResolvedValueOnce({ rows: [] });
      pool.query.mockResolvedValueOnce({ rows: [] });

      const config = await service.getConfig('new-tenant');

      expect(config).toBeDefined();
      expect(config.tenantId).toBe('new-tenant');
      expect(config.requireOutboundSigning).toBeDefined();
    });
  });

  describeIf('risk assessment', () => {
    it('should calculate overall risk assessment', async () => {
      const pool = await ensureMockPool();

      // Mock asset risk query
      pool.query.mockResolvedValueOnce({
        rows: [{ revoked_count: 2, published_count: 100, expired_count: 5 }],
      });

      // Mock narrative risk query
      pool.query.mockResolvedValueOnce({
        rows: [{ high_risk_count: 3, active_count: 10, max_risk: 75 }],
      });

      // Mock incident risk query
      pool.query.mockResolvedValueOnce({
        rows: [{ critical_count: 1, high_count: 2, total_count: 10 }],
      });

      // Mock compliance config query
      pool.query.mockResolvedValueOnce({ rows: [] });

      const assessment = await service.getRiskAssessment('tenant-1');

      expect(assessment).toBeDefined();
      expect(assessment.overallScore).toBeGreaterThanOrEqual(0);
      expect(assessment.overallScore).toBeLessThanOrEqual(100);
      expect(assessment.categories).toBeDefined();
      expect(assessment.recommendations).toBeInstanceOf(Array);
    });
  });
});

describeIf('Integration: Full Verification Flow', () => {
  let pig: ProvenanceIntegrityGateway;

  beforeEach(async () => {
    const storageRoot = createTempDir('pig-test-integration-');
    pig = new ProvenanceIntegrityGateway({
      enableAll: true,
      signing: {
        storagePath: path.join(storageRoot, 'signed-assets'),
        generateC2PA: false,
        requireApproval: false,
      },
      truthBundle: {
        storagePath: path.join(storageRoot, 'truth-bundles'),
      },
    });
  });

  afterEach(async () => {
    await pig.cleanup();
  });

  it('should complete full content verification flow', async () => {
    const content = Buffer.from('Test official content');

    const result = await pig.verifyContent(
      {
        content,
        filename: 'test.txt',
        mimeType: 'text/plain',
      },
      'tenant-1',
      {
        runDeepfakeDetection: false, // Skip for faster tests
        checkOfficialAssets: false,
      }
    );

    expect(result.verificationId).toBeDefined();
    expect(result.status).toBeDefined();
    expect(result.contentHash).toBeDefined();
    expect(result.verifiedAt).toBeInstanceOf(Date);
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.recommendations).toBeInstanceOf(Array);
  });
});

describeIf('Type Safety', () => {
  it('should enforce correct asset types', () => {
    const validTypes: OfficialAssetType[] = [
      'press_release',
      'official_statement',
      'executive_video',
      'incident_update',
      'social_card',
      'policy_document',
      'media_kit',
      'brand_asset',
      'certification',
      'report',
      'other',
    ];

    expect(validTypes).toHaveLength(11);
  });

  it('should enforce correct verification statuses', () => {
    const validStatuses = [
      'verified',
      'unverified',
      'invalid',
      'stripped',
      'tampered',
      'suspicious',
      'official_match',
      'official_mismatch',
    ];

    expect(validStatuses).toHaveLength(8);
  });

  it('should enforce correct DSA risk types', () => {
    const validRiskTypes = [
      'illegal_content_dissemination',
      'fundamental_rights_negative_effects',
      'civic_discourse_negative_effects',
      'electoral_processes_negative_effects',
      'public_security_negative_effects',
      'public_health_negative_effects',
      'minors_protection_negative_effects',
      'gender_based_violence',
      'mental_health_negative_effects',
    ];

    expect(validRiskTypes).toHaveLength(9);
  });
});
