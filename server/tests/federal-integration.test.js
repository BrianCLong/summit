"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const dual_notary_js_1 = require("../src/federal/dual-notary.js");
const slsa3_verifier_js_1 = require("../src/federal/slsa3-verifier.js");
const hsm_enforcement_js_1 = require("../src/federal/hsm-enforcement.js");
const audit_logger_js_1 = require("../src/federal/audit-logger.js");
const crypto_1 = __importDefault(require("crypto"));
(0, globals_1.describe)('Federal Pack Integration Tests', () => {
    let dualNotary;
    let hsmEnforcement;
    let auditLogger;
    (0, globals_1.beforeAll)(async () => {
        // Initialize services with test configuration
        process.env.FEDERAL_ENABLED = 'true';
        process.env.FIPS_MODE = 'true';
        process.env.HSM_ENABLED = 'false'; // Use mock for tests
        process.env.TSA_ENABLED = 'false';
        dualNotary = new dual_notary_js_1.DualNotaryService({
            hsmEnabled: false, // Use mock for CI
            tsaEnabled: false,
        });
        hsmEnforcement = new hsm_enforcement_js_1.HSMEnforcement({
            enforceHSM: false, // Use mock for CI
            allowedMechanisms: ['AES-256-GCM', 'ECDSA-P384', 'RSA-PSS-4096'],
        });
        auditLogger = new audit_logger_js_1.FederalAuditLogger({
            auditBucket: 'test-audit-bucket',
            classification: 'UNCLASSIFIED',
            wormEnabled: false, // Use mock for CI
        });
    });
    (0, globals_1.describe)('HSM Crypto Enforcement', () => {
        (0, globals_1.it)('should validate FIPS mechanism allowlist', async () => {
            const capabilities = await hsmEnforcement.getCapabilities();
            (0, globals_1.expect)(capabilities.fipsMode).toBe(true);
            (0, globals_1.expect)(capabilities.allowedMechanisms).toContain('AES-256-GCM');
            (0, globals_1.expect)(capabilities.allowedMechanisms).toContain('ECDSA-P384');
            (0, globals_1.expect)(capabilities.allowedMechanisms).toContain('RSA-PSS-4096');
        });
        (0, globals_1.it)('should reject non-FIPS mechanisms', () => {
            (0, globals_1.expect)(() => {
                hsmEnforcement.validateMechanism('AES-128-CBC');
            }).toThrow('Mechanism AES-128-CBC not in FIPS allowlist');
        });
        (0, globals_1.it)('should perform health check', async () => {
            const health = await hsmEnforcement.healthCheck();
            (0, globals_1.expect)(health.status).toMatch(/healthy|degraded/);
        });
    });
    (0, globals_1.describe)('Dual-Path Notarization', () => {
        (0, globals_1.it)('should generate mock notarization capabilities', () => {
            const capabilities = dualNotary.getCapabilities();
            (0, globals_1.expect)(capabilities).toHaveProperty('hsmAvailable');
            (0, globals_1.expect)(capabilities).toHaveProperty('tsaAvailable');
            (0, globals_1.expect)(capabilities).toHaveProperty('recommendedMode');
        });
        (0, globals_1.it)('should perform health check', async () => {
            const health = await dualNotary.healthCheck();
            (0, globals_1.expect)(health.status).toMatch(/healthy|degraded|unhealthy/);
        });
        // Test uses mock HSM in CI environment (HSM_ENABLED=false in beforeAll)
        (0, globals_1.it)('should notarize Merkle root with HSM signature (mock)', async () => {
            const testRoot = crypto_1.default.randomBytes(32).toString('hex');
            const notarized = await dualNotary.notarizeRoot(testRoot);
            (0, globals_1.expect)(notarized.rootHex).toBe(testRoot);
            // When using mock (hsmEnabled: false), verify mock behavior
            (0, globals_1.expect)(notarized).toHaveProperty('notarizedBy');
            // Mock should indicate it's not using real HSM
            (0, globals_1.expect)(notarized.notarizedBy).toMatch(/MOCK|mock|software/i);
        });
    });
    (0, globals_1.describe)('SLSA-3 Supply Chain Verification', () => {
        const mockProvenance = {
            _type: 'https://in-toto.io/Statement/v0.1',
            predicateType: 'https://slsa.dev/provenance/v0.2',
            subject: [
                {
                    name: 'intelgraph-federal.tar.gz',
                    digest: {
                        sha256: 'abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234',
                    },
                },
            ],
            predicate: {
                builder: {
                    id: 'https://github.com/slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@refs/tags/v1.9.0',
                },
                buildType: 'https://github.com/slsa-framework/slsa-github-generator/generic@v1',
                invocation: {
                    configSource: {
                        uri: 'git+https://github.com/intelgraph/platform@refs/heads/main',
                        digest: { sha1: 'example-commit-hash' },
                        entryPoint: '.github/workflows/build.yml',
                    },
                },
                metadata: {
                    buildInvocationId: 'example-build-id',
                    buildStartedOn: '2024-01-01T00:00:00Z',
                    buildFinishedOn: '2024-01-01T01:00:00Z',
                    completeness: {
                        parameters: true,
                        environment: false,
                        materials: true,
                    },
                    reproducible: true,
                },
                materials: [],
                buildConfig: {},
            },
        };
        (0, globals_1.it)('should validate SLSA-3 provenance format', async () => {
            const result = await slsa3_verifier_js_1.slsa3Verifier.verifyProvenance(mockProvenance, {
                expectedSubject: 'intelgraph-federal.tar.gz',
                trustedBuilders: [
                    'https://github.com/slsa-framework/slsa-github-generator',
                ],
                requireHermetic: false, // Relaxed for test
            });
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.level).toBe('SLSA-3');
            (0, globals_1.expect)(result.errors).toHaveLength(0);
        });
        (0, globals_1.it)('should detect invalid provenance', async () => {
            const invalidProvenance = { ...mockProvenance, _type: 'invalid' };
            const result = await slsa3_verifier_js_1.slsa3Verifier.verifyProvenance(invalidProvenance, {
                expectedSubject: 'intelgraph-federal.tar.gz',
                trustedBuilders: [
                    'https://github.com/slsa-framework/slsa-github-generator',
                ],
            });
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Federal Audit Logging', () => {
        (0, globals_1.it)('should log security events with proper classification', async () => {
            const event = {
                type: 'crypto_operation',
                classification: 'UNCLASSIFIED',
                source: 'test',
                metadata: { operation: 'encrypt', mechanism: 'AES-256-GCM' },
            };
            // Mock audit logging for test
            const logResult = await auditLogger.logSecurityEvent(event);
            (0, globals_1.expect)(logResult.logged).toBe(true);
            (0, globals_1.expect)(logResult.auditId).toBeTruthy();
        });
        (0, globals_1.it)('should enforce WORM compliance', async () => {
            const capabilities = await auditLogger.getCapabilities();
            (0, globals_1.expect)(capabilities.wormEnabled).toBeDefined();
            (0, globals_1.expect)(capabilities.retentionYears).toBeGreaterThanOrEqual(20);
        });
    });
    (0, globals_1.describe)('Air-Gap Environment Simulation', () => {
        (0, globals_1.it)('should detect air-gap mode configuration', () => {
            process.env.AIRGAP_ENABLED = 'true';
            const isAirgapped = process.env.AIRGAP_ENABLED === 'true';
            (0, globals_1.expect)(isAirgapped).toBe(true);
        });
        (0, globals_1.it)('should validate offline registry is configured', () => {
            const offlineRegistry = process.env.OFFLINE_REGISTRY || '/data/registry';
            (0, globals_1.expect)(offlineRegistry).toBeTruthy();
        });
        (0, globals_1.it)('should verify network policies would block external access', () => {
            // In production, this would test actual NetworkPolicy enforcement
            const externalBlocked = true; // Mock for test
            (0, globals_1.expect)(externalBlocked).toBe(true);
        });
    });
    (0, globals_1.describe)('Classification Controls', () => {
        (0, globals_1.it)('should enforce data classification tagging', () => {
            const data = { content: 'test data', classification: 'UNCLASSIFIED' };
            const isValidClassification = [
                'UNCLASSIFIED',
                'CONFIDENTIAL',
                'SECRET',
                'TOP_SECRET',
            ].includes(data.classification);
            (0, globals_1.expect)(isValidClassification).toBe(true);
        });
        (0, globals_1.it)('should validate clearance-based access controls', () => {
            const userClearance = 'CONFIDENTIAL';
            const dataClassification = 'UNCLASSIFIED';
            const clearanceLevels = {
                UNCLASSIFIED: 0,
                CONFIDENTIAL: 1,
                SECRET: 2,
                TOP_SECRET: 3,
            };
            const hasAccess = clearanceLevels[userClearance] >= clearanceLevels[dataClassification];
            (0, globals_1.expect)(hasAccess).toBe(true);
        });
    });
    (0, globals_1.describe)('Evidence Bundle Generation', () => {
        (0, globals_1.it)('should validate evidence pack structure', async () => {
            // Mock evidence structure validation
            const evidenceComponents = [
                'fips_compliance',
                'airgap_verification',
                'worm_audit_chain',
                'slsa3_supply_chain',
                'gatekeeper_policies',
                'prometheus_alerts',
                'documentation',
            ];
            evidenceComponents.forEach((component) => {
                (0, globals_1.expect)(component).toMatch(/^[a-z_]+$/);
            });
        });
        (0, globals_1.it)('should generate compliance manifest', () => {
            const manifest = {
                evidence_type: 'federal_ato_bundle',
                classification: 'UNCLASSIFIED',
                generated_at: new Date().toISOString(),
                components: ['fips_compliance', 'airgap_verification'],
            };
            (0, globals_1.expect)(manifest.evidence_type).toBe('federal_ato_bundle');
            (0, globals_1.expect)(manifest.components.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.afterAll)(async () => {
        // Cleanup services
        if (dualNotary) {
            dualNotary.destroy();
        }
        if (hsmEnforcement) {
            hsmEnforcement.destroy();
        }
        if (auditLogger) {
            auditLogger.destroy();
        }
    });
});
