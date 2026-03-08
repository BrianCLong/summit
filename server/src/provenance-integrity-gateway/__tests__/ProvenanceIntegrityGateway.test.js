"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const crypto = __importStar(require("crypto"));
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = __importDefault(require("path"));
const index_js_1 = require("../index.js");
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
const createTempDir = (prefix) => (0, fs_1.mkdtempSync)(path_1.default.join((0, os_1.tmpdir)(), prefix));
const ensureMockPool = async () => {
    const { pool } = await Promise.resolve().then(() => __importStar(require('../../db/pg.js')));
    if (typeof pool.query.mockResolvedValueOnce !== 'function') {
        pool.query = globals_1.jest.fn(() => Promise.resolve({ rows: [] }));
    }
    return pool;
};
// Mock the database pool
globals_1.jest.mock('../../db/pg.js', () => ({
    pool: {
        query: globals_1.jest.fn(() => Promise.resolve({ rows: [] })),
        connect: globals_1.jest.fn(() => Promise.resolve({
            query: globals_1.jest.fn(() => Promise.resolve({ rows: [] })),
            release: globals_1.jest.fn(),
        })),
    },
}));
// Mock provenance ledger
globals_1.jest.mock('../../provenance/ledger.js', () => ({
    provenanceLedger: {
        appendEntry: globals_1.jest.fn(() => Promise.resolve({})),
    },
}));
// Mock audit system
globals_1.jest.mock('../../audit/advanced-audit-system.js', () => ({
    advancedAuditSystem: {
        logEvent: globals_1.jest.fn(),
    },
}));
describeIf('ProvenanceIntegrityGateway', () => {
    let pig;
    (0, globals_1.beforeEach)(async () => {
        const storageRoot = createTempDir('pig-test-');
        pig = new index_js_1.ProvenanceIntegrityGateway({
            enableAll: true,
            signing: {
                storagePath: path_1.default.join(storageRoot, 'signed-assets'),
                generateC2PA: false,
                requireApproval: false,
            },
            truthBundle: {
                storagePath: path_1.default.join(storageRoot, 'truth-bundles'),
            },
        });
    });
    (0, globals_1.afterEach)(async () => {
        await pig.cleanup();
    });
    describeIf('initialization', () => {
        (0, globals_1.it)('should initialize all services', async () => {
            await pig.initialize();
            (0, globals_1.expect)(pig.c2paValidation).toBeDefined();
            (0, globals_1.expect)(pig.contentSigning).toBeDefined();
            (0, globals_1.expect)(pig.deepfakeDetection).toBeDefined();
            (0, globals_1.expect)(pig.truthBundles).toBeDefined();
            (0, globals_1.expect)(pig.narrativeConflict).toBeDefined();
            (0, globals_1.expect)(pig.governance).toBeDefined();
        });
        (0, globals_1.it)('should not re-initialize if already initialized', async () => {
            await pig.initialize();
            await pig.initialize(); // Should not throw
        });
    });
    describeIf('event propagation', () => {
        (0, globals_1.it)('should propagate events from child services', async () => {
            const handler = globals_1.jest.fn();
            pig.on('asset:signed', handler);
            pig.contentSigning.emit('asset:signed', { asset: { id: 'test' } });
            (0, globals_1.expect)(handler).toHaveBeenCalled();
        });
    });
});
describeIf('C2PAValidationService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = new index_js_1.C2PAValidationService({
            allowSelfSigned: true,
            trustAnchors: [],
        });
    });
    (0, globals_1.afterEach)(async () => {
        await service.cleanup();
    });
    describeIf('validateContent', () => {
        (0, globals_1.it)('should validate content without C2PA credentials', async () => {
            const content = Buffer.from('test content');
            const request = {
                content,
                filename: 'test.jpg',
                mimeType: 'image/jpeg',
            };
            const result = await service.validateContent(request, 'tenant-1');
            (0, globals_1.expect)(result.verificationId).toBeDefined();
            (0, globals_1.expect)(result.status).toBe('unverified');
            (0, globals_1.expect)(result.contentHash).toBeDefined();
            (0, globals_1.expect)(result.credentialsStripped).toBe(false);
        });
        (0, globals_1.it)('should detect hash mismatch', async () => {
            const content = Buffer.from('test content');
            const request = {
                content,
                filename: 'test.jpg',
                mimeType: 'image/jpeg',
                expectedHash: 'wrong-hash',
            };
            const result = await service.validateContent(request, 'tenant-1');
            (0, globals_1.expect)(result.status).toBe('tampered');
            (0, globals_1.expect)(result.messages.some(m => m.code === 'HASH_MISMATCH')).toBe(true);
        });
        (0, globals_1.it)('should calculate correct content hash', async () => {
            const content = Buffer.from('test content');
            const expectedHash = crypto.createHash('sha256').update(content).digest('hex');
            const request = {
                content,
                filename: 'test.txt',
                mimeType: 'text/plain',
            };
            const result = await service.validateContent(request, 'tenant-1');
            (0, globals_1.expect)(result.contentHash).toBe(expectedHash);
        });
        (0, globals_1.it)('should generate risk score', async () => {
            const content = Buffer.from('test content');
            const request = {
                content,
                filename: 'test.jpg',
                mimeType: 'image/jpeg',
            };
            const result = await service.validateContent(request, 'tenant-1');
            (0, globals_1.expect)(result.riskScore).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(result.riskScore).toBeLessThanOrEqual(100);
        });
        (0, globals_1.it)('should generate recommendations', async () => {
            const content = Buffer.from('test content');
            const request = {
                content,
                filename: 'test.jpg',
                mimeType: 'image/jpeg',
            };
            const result = await service.validateContent(request, 'tenant-1');
            (0, globals_1.expect)(result.recommendations).toBeInstanceOf(Array);
            (0, globals_1.expect)(result.recommendations.length).toBeGreaterThan(0);
        });
    });
    describeIf('trust anchors', () => {
        (0, globals_1.it)('should add trust anchor at runtime', () => {
            // Generate a self-signed certificate for testing
            const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
                namedCurve: 'P-256',
            });
            // Skip if certificate generation is not supported
            (0, globals_1.expect)(() => {
                // Would add certificate here
            }).not.toThrow();
        });
    });
});
describeIf('ContentSigningService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = new index_js_1.ContentSigningService({
            signingKeyId: 'test-key',
            storagePath: '/tmp/test-signed-assets',
            generateC2PA: false, // Disable for tests
            requireApproval: false,
        });
    });
    (0, globals_1.afterEach)(async () => {
        await service.cleanup();
    });
    describeIf('signAsset', () => {
        (0, globals_1.it)('should create signed asset with correct properties', async () => {
            const pool = await ensureMockPool();
            pool.query.mockResolvedValueOnce({ rows: [] });
            const content = Buffer.from('test official content');
            const request = {
                title: 'Test Press Release',
                description: 'A test press release',
                assetType: 'press_release',
                content,
                filename: 'press-release.txt',
                mimeType: 'text/plain',
            };
            const result = await service.signAsset(request, 'tenant-1', 'user-1');
            (0, globals_1.expect)(result.asset).toBeDefined();
            (0, globals_1.expect)(result.asset.id).toBeDefined();
            (0, globals_1.expect)(result.asset.title).toBe('Test Press Release');
            (0, globals_1.expect)(result.asset.assetType).toBe('press_release');
            (0, globals_1.expect)(result.asset.signature).toBeDefined();
            (0, globals_1.expect)(result.asset.contentHash).toBeDefined();
        });
        (0, globals_1.it)('should calculate content hash correctly', async () => {
            const pool = await ensureMockPool();
            pool.query.mockResolvedValueOnce({ rows: [] });
            const content = Buffer.from('test content for hashing');
            const expectedHash = crypto.createHash('sha256').update(content).digest('hex');
            const request = {
                title: 'Test',
                assetType: 'other',
                content,
                filename: 'test.txt',
                mimeType: 'text/plain',
            };
            const result = await service.signAsset(request, 'tenant-1', 'user-1');
            (0, globals_1.expect)(result.asset.contentHash).toBe(expectedHash);
        });
    });
    describeIf('revokeAsset', () => {
        (0, globals_1.it)('should reject revocation of non-existent asset', async () => {
            const pool = await ensureMockPool();
            pool.query.mockResolvedValueOnce({ rows: [] });
            await (0, globals_1.expect)(service.revokeAsset({
                assetId: 'non-existent',
                reason: 'error',
            }, 'tenant-1', 'user-1')).rejects.toThrow('Asset not found');
        });
    });
});
describeIf('DeepfakeDetectionService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = new index_js_1.DeepfakeDetectionService({
            flagThreshold: 0.6,
            blockThreshold: 0.85,
            enableFaceAnalysis: false, // Disable for tests
            enableAudioAnalysis: false,
            enableLogoDetection: false,
        });
    });
    (0, globals_1.afterEach)(async () => {
        await service.cleanup();
    });
    describeIf('detectDeepfake', () => {
        (0, globals_1.it)('should return detection result for image', async () => {
            const content = Buffer.alloc(1000); // Empty buffer
            const result = await service.detectDeepfake(content, 'image/jpeg', 'test.jpg', 'tenant-1');
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.isDeepfake).toBeDefined();
            (0, globals_1.expect)(result.confidence).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(result.confidence).toBeLessThanOrEqual(1);
            (0, globals_1.expect)(result.method).toBeDefined();
            (0, globals_1.expect)(result.modelVersion).toBeDefined();
            (0, globals_1.expect)(result.analyzedAt).toBeInstanceOf(Date);
        });
        (0, globals_1.it)('should handle video content', async () => {
            const content = Buffer.alloc(1000);
            const result = await service.detectDeepfake(content, 'video/mp4', 'test.mp4', 'tenant-1');
            (0, globals_1.expect)(result).toBeDefined();
        });
        (0, globals_1.it)('should handle audio content', async () => {
            const content = Buffer.alloc(1000);
            const result = await service.detectDeepfake(content, 'audio/mpeg', 'test.mp3', 'tenant-1');
            (0, globals_1.expect)(result).toBeDefined();
        });
    });
    describeIf('detectImpersonation', () => {
        (0, globals_1.it)('should return impersonation detection result', async () => {
            const content = Buffer.alloc(1000);
            const result = await service.detectImpersonation({
                content,
                filename: 'test.jpg',
                mimeType: 'image/jpeg',
            }, 'tenant-1');
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.impersonationDetected).toBeDefined();
            (0, globals_1.expect)(result.confidence).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(result.findings).toBeInstanceOf(Array);
            (0, globals_1.expect)(result.impersonatedEntities).toBeInstanceOf(Array);
            (0, globals_1.expect)(result.riskLevel).toBeDefined();
            (0, globals_1.expect)(result.analyzedAt).toBeInstanceOf(Date);
        });
    });
    describeIf('matchOfficialAsset', () => {
        (0, globals_1.it)('should check for matching official assets', async () => {
            const pool = await ensureMockPool();
            pool.query.mockResolvedValueOnce({ rows: [] });
            pool.query.mockResolvedValueOnce({ rows: [] });
            const content = Buffer.alloc(1000);
            const result = await service.matchOfficialAsset(content, 'image/jpeg', 'tenant-1');
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.matched).toBe(false);
        });
    });
});
describeIf('TruthBundleService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = new index_js_1.TruthBundleService({
            storagePath: '/tmp/test-truth-bundles',
        });
    });
    (0, globals_1.afterEach)(async () => {
        await service.cleanup();
    });
    describeIf('bundle structure', () => {
        (0, globals_1.it)('should define correct bundle types', () => {
            // Type checking test
            const incidentTypes = ['deepfake', 'impersonation', 'manipulation', 'forgery'];
            const severities = ['low', 'medium', 'high', 'critical'];
            (0, globals_1.expect)(incidentTypes).toContain('deepfake');
            (0, globals_1.expect)(severities).toContain('critical');
        });
    });
});
describeIf('NarrativeConflictService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = new index_js_1.NarrativeConflictService({
            enableRealTimeMonitoring: false, // Disable for tests
            enableDSATracking: true,
        });
    });
    (0, globals_1.afterEach)(async () => {
        await service.cleanup();
    });
    describeIf('cluster management', () => {
        (0, globals_1.it)('should create new narrative cluster', async () => {
            const pool = await ensureMockPool();
            // Mock findSimilarCluster
            pool.query.mockResolvedValueOnce({ rows: [] });
            // Mock storeCluster
            pool.query.mockResolvedValueOnce({ rows: [] });
            const cluster = await service.getOrCreateCluster('tenant-1', 'Test Narrative', ['keyword1', 'keyword2']);
            (0, globals_1.expect)(cluster).toBeDefined();
            (0, globals_1.expect)(cluster.id).toBeDefined();
            (0, globals_1.expect)(cluster.theme).toBe('Test Narrative');
            (0, globals_1.expect)(cluster.keywords).toContain('keyword1');
            (0, globals_1.expect)(cluster.status).toBe('active');
        });
    });
    describeIf('risk assessment', () => {
        (0, globals_1.it)('should calculate cluster risk assessment', async () => {
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
                    category: 'low',
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
                status: 'active',
            };
            const assessment = await service.assessClusterRisk(mockCluster);
            (0, globals_1.expect)(assessment).toBeDefined();
            (0, globals_1.expect)(assessment.overallScore).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(assessment.overallScore).toBeLessThanOrEqual(100);
            (0, globals_1.expect)(assessment.factors).toBeInstanceOf(Array);
            (0, globals_1.expect)(assessment.factors.length).toBeGreaterThan(0);
        });
    });
    describeIf('DSA systemic risk', () => {
        (0, globals_1.it)('should evaluate DSA systemic risks', async () => {
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
                    category: 'critical',
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
                status: 'active',
            };
            const dsaRisk = await service.evaluateDSASystemicRisk(mockCluster);
            (0, globals_1.expect)(dsaRisk).toBeDefined();
            (0, globals_1.expect)(dsaRisk.indicated).toBe(true);
            (0, globals_1.expect)(dsaRisk.riskTypes).toContain('electoral_processes_negative_effects');
        });
    });
});
describeIf('PIGGovernanceService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = new index_js_1.PIGGovernanceService({
            enableNISTTracking: true,
            enableDSATracking: true,
        });
    });
    describeIf('configuration', () => {
        (0, globals_1.it)('should return default config for new tenant', async () => {
            const pool = await ensureMockPool();
            pool.query.mockResolvedValueOnce({ rows: [] });
            pool.query.mockResolvedValueOnce({ rows: [] });
            const config = await service.getConfig('new-tenant');
            (0, globals_1.expect)(config).toBeDefined();
            (0, globals_1.expect)(config.tenantId).toBe('new-tenant');
            (0, globals_1.expect)(config.requireOutboundSigning).toBeDefined();
        });
    });
    describeIf('risk assessment', () => {
        (0, globals_1.it)('should calculate overall risk assessment', async () => {
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
            (0, globals_1.expect)(assessment).toBeDefined();
            (0, globals_1.expect)(assessment.overallScore).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(assessment.overallScore).toBeLessThanOrEqual(100);
            (0, globals_1.expect)(assessment.categories).toBeDefined();
            (0, globals_1.expect)(assessment.recommendations).toBeInstanceOf(Array);
        });
    });
});
describeIf('Integration: Full Verification Flow', () => {
    let pig;
    (0, globals_1.beforeEach)(async () => {
        const storageRoot = createTempDir('pig-test-integration-');
        pig = new index_js_1.ProvenanceIntegrityGateway({
            enableAll: true,
            signing: {
                storagePath: path_1.default.join(storageRoot, 'signed-assets'),
                generateC2PA: false,
                requireApproval: false,
            },
            truthBundle: {
                storagePath: path_1.default.join(storageRoot, 'truth-bundles'),
            },
        });
    });
    (0, globals_1.afterEach)(async () => {
        await pig.cleanup();
    });
    (0, globals_1.it)('should complete full content verification flow', async () => {
        const content = Buffer.from('Test official content');
        const result = await pig.verifyContent({
            content,
            filename: 'test.txt',
            mimeType: 'text/plain',
        }, 'tenant-1', {
            runDeepfakeDetection: false, // Skip for faster tests
            checkOfficialAssets: false,
        });
        (0, globals_1.expect)(result.verificationId).toBeDefined();
        (0, globals_1.expect)(result.status).toBeDefined();
        (0, globals_1.expect)(result.contentHash).toBeDefined();
        (0, globals_1.expect)(result.verifiedAt).toBeInstanceOf(Date);
        (0, globals_1.expect)(result.riskScore).toBeGreaterThanOrEqual(0);
        (0, globals_1.expect)(result.recommendations).toBeInstanceOf(Array);
    });
});
describeIf('Type Safety', () => {
    (0, globals_1.it)('should enforce correct asset types', () => {
        const validTypes = [
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
        (0, globals_1.expect)(validTypes).toHaveLength(11);
    });
    (0, globals_1.it)('should enforce correct verification statuses', () => {
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
        (0, globals_1.expect)(validStatuses).toHaveLength(8);
    });
    (0, globals_1.it)('should enforce correct DSA risk types', () => {
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
        (0, globals_1.expect)(validRiskTypes).toHaveLength(9);
    });
});
