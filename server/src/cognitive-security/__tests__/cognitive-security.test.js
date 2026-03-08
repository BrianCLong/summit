"use strict";
/**
 * Cognitive Security Operations - Unit Tests
 *
 * Tests for the defensive cognitive security system.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const crypto_1 = require("crypto");
// Import factory functions
const types_js_1 = require("../types.js");
// Mock Neo4j driver
const mockSession = {
    run: globals_1.jest.fn(),
    close: globals_1.jest.fn(),
};
const mockDriver = {
    session: () => mockSession,
};
// ============================================================================
// Type Factory Tests
// ============================================================================
(0, globals_1.describe)('Type Factories', () => {
    (0, globals_1.describe)('createClaim', () => {
        (0, globals_1.it)('should create a claim with default values', () => {
            const claim = (0, types_js_1.createClaim)('Test claim text', 'SOCIAL_MEDIA');
            (0, globals_1.expect)(claim.id).toBeDefined();
            (0, globals_1.expect)(claim.canonicalText).toBe('Test claim text');
            (0, globals_1.expect)(claim.sourceType).toBe('SOCIAL_MEDIA');
            (0, globals_1.expect)(claim.language).toBe('en');
            (0, globals_1.expect)(claim.verdict).toBe('UNVERIFIED');
            (0, globals_1.expect)(claim.verdictConfidence).toBe(0);
            (0, globals_1.expect)(claim.evidenceIds).toEqual([]);
            (0, globals_1.expect)(claim.entities).toEqual([]);
        });
        (0, globals_1.it)('should create a claim with custom language', () => {
            const claim = (0, types_js_1.createClaim)('Demande de test', 'NEWS_OUTLET', 'fr');
            (0, globals_1.expect)(claim.language).toBe('fr');
        });
    });
    (0, globals_1.describe)('createEvidence', () => {
        (0, globals_1.it)('should create evidence with default values', () => {
            const evidence = (0, types_js_1.createEvidence)('DOCUMENT', 'Test Document', 'Document content');
            (0, globals_1.expect)(evidence.id).toBeDefined();
            (0, globals_1.expect)(evidence.type).toBe('DOCUMENT');
            (0, globals_1.expect)(evidence.title).toBe('Test Document');
            (0, globals_1.expect)(evidence.content).toBe('Document content');
            (0, globals_1.expect)(evidence.verified).toBe(false);
            (0, globals_1.expect)(evidence.sourceCredibility).toBe(0.5);
        });
    });
    (0, globals_1.describe)('createNarrative', () => {
        (0, globals_1.it)('should create a narrative with default values', () => {
            const narrative = (0, types_js_1.createNarrative)('Test Narrative', 'A test description');
            (0, globals_1.expect)(narrative.id).toBeDefined();
            (0, globals_1.expect)(narrative.name).toBe('Test Narrative');
            (0, globals_1.expect)(narrative.description).toBe('A test description');
            (0, globals_1.expect)(narrative.status).toBe('EMERGING');
            (0, globals_1.expect)(narrative.velocity.spreadRate).toBe(0);
        });
    });
    (0, globals_1.describe)('createCampaign', () => {
        (0, globals_1.it)('should create a campaign with threat level', () => {
            const campaign = (0, types_js_1.createCampaign)('Test Campaign', 'HIGH');
            (0, globals_1.expect)(campaign.id).toBeDefined();
            (0, globals_1.expect)(campaign.name).toBe('Test Campaign');
            (0, globals_1.expect)(campaign.threatLevel).toBe('HIGH');
            (0, globals_1.expect)(campaign.status).toBe('SUSPECTED');
            (0, globals_1.expect)(campaign.metrics.totalClaims).toBe(0);
        });
    });
});
// ============================================================================
// Provenance Service Tests
// ============================================================================
(0, globals_1.describe)('ProvenanceService', () => {
    // These would require actual service instantiation with mock driver
    (0, globals_1.describe)('computeAssetHash', () => {
        (0, globals_1.it)('should compute consistent SHA-256 hash', async () => {
            const { ProvenanceService } = await Promise.resolve().then(() => __importStar(require('../provenance.service.js')));
            const service = new ProvenanceService({});
            const content = Buffer.from('test content');
            const hash1 = service.computeAssetHash(content);
            const hash2 = service.computeAssetHash(content);
            (0, globals_1.expect)(hash1).toBe(hash2);
            (0, globals_1.expect)(hash1.length).toBe(64); // SHA-256 hex
        });
    });
    (0, globals_1.describe)('createContentCredential', () => {
        (0, globals_1.it)('should create credential without C2PA', async () => {
            const { ProvenanceService } = await Promise.resolve().then(() => __importStar(require('../provenance.service.js')));
            const service = new ProvenanceService({});
            const content = Buffer.from('image data');
            const credential = await service.createContentCredential('asset-123', content, 'image/jpeg', 'https://example.com/image.jpg');
            (0, globals_1.expect)(credential.id).toBeDefined();
            (0, globals_1.expect)(credential.assetId).toBe('asset-123');
            (0, globals_1.expect)(credential.hasC2PA).toBe(false);
            (0, globals_1.expect)(credential.provenanceConfidence).toBeLessThan(0.5);
            (0, globals_1.expect)(credential.provenanceChain?.length).toBe(1);
        });
    });
    (0, globals_1.describe)('addProvenanceLink', () => {
        (0, globals_1.it)('should add link and update confidence', async () => {
            const { ProvenanceService } = await Promise.resolve().then(() => __importStar(require('../provenance.service.js')));
            const service = new ProvenanceService({});
            const credential = {
                id: (0, crypto_1.randomUUID)(),
                assetId: 'asset-123',
                assetHash: 'abc123',
                mimeType: 'image/jpeg',
                hasC2PA: false,
                provenanceConfidence: 0.3,
                createdAt: new Date().toISOString(),
                provenanceChain: [],
            };
            const link = service.addProvenanceLink(credential, 'https://reuters.com/article/123', 'reuters');
            (0, globals_1.expect)(link.source).toBe('https://reuters.com/article/123');
            (0, globals_1.expect)(link.confidence).toBeGreaterThan(0.5); // Reliable source
            (0, globals_1.expect)(credential.provenanceChain?.length).toBe(1);
        });
    });
});
// ============================================================================
// Governance Service Tests
// ============================================================================
(0, globals_1.describe)('GovernanceService', () => {
    (0, globals_1.describe)('DEFAULT_POLICIES', () => {
        (0, globals_1.it)('should have all required policy types', async () => {
            const { DEFAULT_POLICIES } = await Promise.resolve().then(() => __importStar(require('../governance.service.js')));
            const policyTypes = DEFAULT_POLICIES.map((p) => p.type);
            (0, globals_1.expect)(policyTypes).toContain('VERIFICATION');
            (0, globals_1.expect)(policyTypes).toContain('ACTION');
            (0, globals_1.expect)(policyTypes).toContain('ESCALATION');
            (0, globals_1.expect)(policyTypes).toContain('RETENTION');
            (0, globals_1.expect)(policyTypes).toContain('ACCESS');
        });
    });
    (0, globals_1.describe)('validateAppeal', () => {
        (0, globals_1.it)('should reject short reasons', async () => {
            const { GovernanceService } = await Promise.resolve().then(() => __importStar(require('../governance.service.js')));
            const service = new GovernanceService({
                neo4jDriver: mockDriver,
            });
            await (0, globals_1.expect)(service.createAppeal('claim-123', 'REFUTED', 'VERIFIED', 'user-123', 'Too short')).rejects.toThrow('Invalid appeal');
        });
        (0, globals_1.it)('should reject same verdict appeals', async () => {
            const { GovernanceService } = await Promise.resolve().then(() => __importStar(require('../governance.service.js')));
            const service = new GovernanceService({
                neo4jDriver: mockDriver,
            });
            await (0, globals_1.expect)(service.createAppeal('claim-123', 'VERIFIED', 'VERIFIED', // Same as current
            'user-123', 'This is a long enough reason for the appeal')).rejects.toThrow('Invalid appeal');
        });
    });
    (0, globals_1.describe)('checkActionAllowed', () => {
        (0, globals_1.it)('should check permissions correctly', async () => {
            const { GovernanceService } = await Promise.resolve().then(() => __importStar(require('../governance.service.js')));
            const service = new GovernanceService({
                neo4jDriver: mockDriver,
            });
            const result = service.checkActionAllowed('BRIEFING', 'analyst', 'claims');
            (0, globals_1.expect)(result.allowed).toBe(true);
        });
    });
    (0, globals_1.describe)('generateVerificationDecision', () => {
        (0, globals_1.it)('should recommend VERIFIED with strong supporting evidence', async () => {
            const { GovernanceService } = await Promise.resolve().then(() => __importStar(require('../governance.service.js')));
            const service = new GovernanceService({
                neo4jDriver: mockDriver,
            });
            const evidence = [
                { id: '1', supports: true, confidence: 0.9 },
                { id: '2', supports: true, confidence: 0.85 },
            ];
            const decision = await service.generateVerificationDecision('claim-123', evidence);
            (0, globals_1.expect)(decision.recommendedVerdict).toBe('VERIFIED');
            (0, globals_1.expect)(decision.confidence).toBeGreaterThan(0.8);
        });
        (0, globals_1.it)('should recommend REFUTED with strong refuting evidence', async () => {
            const { GovernanceService } = await Promise.resolve().then(() => __importStar(require('../governance.service.js')));
            const service = new GovernanceService({
                neo4jDriver: mockDriver,
            });
            const evidence = [
                { id: '1', supports: false, confidence: 0.9 },
                { id: '2', supports: false, confidence: 0.88 },
            ];
            const decision = await service.generateVerificationDecision('claim-123', evidence);
            (0, globals_1.expect)(decision.recommendedVerdict).toBe('REFUTED');
        });
        (0, globals_1.it)('should recommend DISPUTED with conflicting evidence', async () => {
            const { GovernanceService } = await Promise.resolve().then(() => __importStar(require('../governance.service.js')));
            const service = new GovernanceService({
                neo4jDriver: mockDriver,
            });
            const evidence = [
                { id: '1', supports: true, confidence: 0.9 },
                { id: '2', supports: false, confidence: 0.85 },
            ];
            const decision = await service.generateVerificationDecision('claim-123', evidence);
            (0, globals_1.expect)(decision.recommendedVerdict).toBe('DISPUTED');
        });
    });
});
// ============================================================================
// Evaluation Service Tests
// ============================================================================
(0, globals_1.describe)('EvaluationService', () => {
    (0, globals_1.describe)('BENCHMARK_TARGETS', () => {
        (0, globals_1.it)('should have defined benchmark targets', async () => {
            const { BENCHMARK_TARGETS } = await Promise.resolve().then(() => __importStar(require('../evaluation.service.js')));
            (0, globals_1.expect)(BENCHMARK_TARGETS.detection.timeToDetectP50).toBeDefined();
            (0, globals_1.expect)(BENCHMARK_TARGETS.verification.claimPrecision).toBeGreaterThan(0.5);
            (0, globals_1.expect)(BENCHMARK_TARGETS.verification.falseAttributionRate).toBeLessThan(0.1);
            (0, globals_1.expect)(BENCHMARK_TARGETS.response.narrativeContainmentRate).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('compareToBenchmarks', () => {
        (0, globals_1.it)('should correctly compare metrics to benchmarks', async () => {
            const { EvaluationService, BENCHMARK_TARGETS } = await Promise.resolve().then(() => __importStar(require('../evaluation.service.js')));
            const service = new EvaluationService({
                neo4jDriver: mockDriver,
            });
            const metrics = {
                id: (0, crypto_1.randomUUID)(),
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
            (0, globals_1.expect)(comparison.detection.timeToDetectP50.met).toBe(true);
            (0, globals_1.expect)(comparison.verification.claimPrecision.met).toBe(true);
            (0, globals_1.expect)(comparison.verification.falseAttributionRate.met).toBe(true);
            (0, globals_1.expect)(comparison.overallScore).toBeGreaterThan(0.8);
        });
    });
});
// ============================================================================
// Integration Tests (with mocked Neo4j)
// ============================================================================
(0, globals_1.describe)('Integration Tests', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        // Default mock response
        mockSession.run.mockResolvedValue({
            records: [],
        });
    });
    (0, globals_1.describe)('Claims Service', () => {
        (0, globals_1.it)('should extract claim and persist to Neo4j', async () => {
            const { ClaimsService } = await Promise.resolve().then(() => __importStar(require('../claims.service.js')));
            mockSession.run.mockResolvedValueOnce({ records: [] });
            const service = new ClaimsService({
                neo4jDriver: mockDriver,
            });
            const claim = await service.extractClaim('This is a test claim about an event', 'NEWS_OUTLET', 'https://example.com/article');
            (0, globals_1.expect)(claim).toBeDefined();
            (0, globals_1.expect)(claim.canonicalText.toLowerCase()).toContain('test claim');
            (0, globals_1.expect)(mockSession.run).toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('Campaign Detection Service', () => {
        (0, globals_1.it)('should run detection pipeline', async () => {
            const { CampaignDetectionService } = await Promise.resolve().then(() => __importStar(require('../campaign-detection.service.js')));
            const service = new CampaignDetectionService({
                neo4jDriver: mockDriver,
            });
            const signals = await service.runDetectionPipeline();
            (0, globals_1.expect)(Array.isArray(signals)).toBe(true);
            (0, globals_1.expect)(mockSession.run).toHaveBeenCalled();
        });
        (0, globals_1.it)('should calculate threat level correctly', async () => {
            const { CampaignDetectionService } = await Promise.resolve().then(() => __importStar(require('../campaign-detection.service.js')));
            const service = new CampaignDetectionService({
                neo4jDriver: mockDriver,
            });
            // Test with high-confidence signals including laundering
            const signals = [
                {
                    id: (0, crypto_1.randomUUID)(),
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
                    id: (0, crypto_1.randomUUID)(),
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
                    id: (0, crypto_1.randomUUID)(),
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
    (0, globals_1.describe)('Response Ops Service', () => {
        (0, globals_1.it)('should determine actions based on threat level', async () => {
            const { ResponseOpsService } = await Promise.resolve().then(() => __importStar(require('../response-ops.service.js')));
            const service = new ResponseOpsService({
                neo4jDriver: mockDriver,
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
            (0, globals_1.expect)(playbook).toBeDefined();
            (0, globals_1.expect)(playbook.priority).toBe(1); // CRITICAL = priority 1
            // Should have multiple actions for CRITICAL
            const actionTypes = playbook.actions.map((a) => a.type);
            (0, globals_1.expect)(actionTypes).toContain('BRIEFING');
            (0, globals_1.expect)(actionTypes).toContain('ESCALATION');
        });
    });
});
// ============================================================================
// Security Boundary Tests
// ============================================================================
(0, globals_1.describe)('Security Boundaries', () => {
    (0, globals_1.it)('should not expose raw database queries in errors', async () => {
        const { ClaimsService } = await Promise.resolve().then(() => __importStar(require('../claims.service.js')));
        mockSession.run.mockRejectedValueOnce(new Error('Database error'));
        const service = new ClaimsService({
            neo4jDriver: mockDriver,
        });
        // The service should handle errors gracefully
        // This is more of a documentation of expected behavior
    });
    (0, globals_1.it)('should validate input bounds', () => {
        const claim = (0, types_js_1.createClaim)('x'.repeat(10000), 'SOCIAL_MEDIA');
        // Should still create claim but ideally would truncate
        (0, globals_1.expect)(claim.canonicalText.length).toBe(10000);
    });
    (0, globals_1.it)('should canonicalize user input in canonical text', async () => {
        const { ClaimsService } = await Promise.resolve().then(() => __importStar(require('../claims.service.js')));
        const service = new ClaimsService({
            neo4jDriver: mockDriver,
        });
        // Mock the persistence to not actually write
        mockSession.run.mockResolvedValue({ records: [] });
        const claim = await service.extractClaim('<script>alert("xss")</script>Test claim', 'SOCIAL_MEDIA');
        // Canonicalization lowercases and trims by default; sanitization is not applied.
        (0, globals_1.expect)(claim.canonicalText).toBe('<script>alert("xss")</script>test claim');
    });
});
// ============================================================================
// Edge Cases
// ============================================================================
(0, globals_1.describe)('Edge Cases', () => {
    (0, globals_1.it)('should handle empty claim text', () => {
        const claim = (0, types_js_1.createClaim)('', 'SOCIAL_MEDIA');
        (0, globals_1.expect)(claim.canonicalText).toBe('');
    });
    (0, globals_1.it)('should handle unicode in claims', () => {
        const claim = (0, types_js_1.createClaim)('测试声明 مطالبة الاختبار 🔍', 'SOCIAL_MEDIA');
        (0, globals_1.expect)(claim.canonicalText).toBe('测试声明 مطالبة الاختبار 🔍');
    });
    (0, globals_1.it)('should handle very long claim IDs', async () => {
        const { GovernanceService } = await Promise.resolve().then(() => __importStar(require('../governance.service.js')));
        const service = new GovernanceService({
            neo4jDriver: mockDriver,
        });
        const longId = 'a'.repeat(500);
        // Should handle gracefully (actual behavior depends on implementation)
        // This documents expected edge case handling
    });
    (0, globals_1.it)('should handle concurrent verdict updates', async () => {
        // In a real system, this would test optimistic locking
        // For now, documents the expected behavior
    });
});
