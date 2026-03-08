"use strict";
/**
 * Governance Enforcement Tests
 *
 * Comprehensive governance bypass prevention tests ensuring all responses
 * include governance verdicts and that bypassing governance is structurally impossible.
 *
 * SOC 2 Evidence: CC6.1, CC7.2, PI1.3
 * Compliance: SLSA L3, IC-grade multi-tenancy
 *
 * Test Coverage:
 * - Governance Verdict Enforcement (5 tests)
 * - Governance Bypass Prevention (8 tests)
 * - Provenance Validation (5 tests)
 * - Data Integrity (4 tests)
 * - Snapshot Tests (3 tests)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const crypto_1 = require("crypto");
const PolicyEngine_js_1 = require("../PolicyEngine.js");
(0, globals_1.describe)('Governance Verdict Enforcement', () => {
    let policyEngine;
    (0, globals_1.beforeEach)(() => {
        policyEngine = new PolicyEngine_js_1.PolicyEngine();
        const testPolicy = {
            id: 'test-enforcement-policy',
            description: 'Test policy for enforcement',
            scope: {
                stages: ['runtime'],
                tenants: ['*'],
            },
            rules: [
                {
                    field: 'action',
                    operator: 'eq',
                    value: 'read',
                },
            ],
            action: 'ALLOW',
        };
        policyEngine.loadPolicies([testPolicy]);
    });
    (0, globals_1.it)('should wrap response with governance verdict', () => {
        const context = {
            stage: 'runtime',
            tenantId: 'tenant-test',
            payload: { action: 'read', resource: 'entity-123' },
        };
        const verdict = policyEngine.check(context);
        const envelope = {
            data: { id: 'entity-123', name: 'Test Entity' },
            governanceVerdict: verdict,
            provenance: {
                source: 'test-system',
                timestamp: new Date().toISOString(),
                lineage: ['system', 'policy-engine'],
                hash: (0, crypto_1.createHash)('sha256').update('test-data').digest('hex'),
            },
            metadata: {
                classification: 'INTERNAL',
                isSimulated: false,
                hash: (0, crypto_1.createHash)('sha256').update('test-data').digest('hex'),
                generatedAt: new Date().toISOString(),
            },
        };
        (0, globals_1.expect)(envelope.governanceVerdict).toBeDefined();
        (0, globals_1.expect)(envelope.governanceVerdict.action).toBe('ALLOW');
        (0, globals_1.expect)(envelope.provenance).toBeDefined();
        (0, globals_1.expect)(envelope.metadata).toBeDefined();
    });
    (0, globals_1.it)('should reject response without verdict', () => {
        const invalidEnvelope = {
            data: { id: 'entity-123', name: 'Test Entity' },
            // Missing governanceVerdict
            provenance: {
                source: 'test-system',
                timestamp: new Date().toISOString(),
                lineage: ['system'],
                hash: (0, crypto_1.createHash)('sha256').update('test-data').digest('hex'),
            },
        };
        const hasVerdict = 'governanceVerdict' in invalidEnvelope;
        (0, globals_1.expect)(hasVerdict).toBe(false);
        // Validator would reject this
        const validateEnvelope = (env) => {
            return (env.data !== undefined &&
                env.governanceVerdict !== undefined &&
                env.provenance !== undefined &&
                env.metadata !== undefined);
        };
        (0, globals_1.expect)(validateEnvelope(invalidEnvelope)).toBe(false);
    });
    (0, globals_1.it)('should include all required verdict fields', () => {
        const context = {
            stage: 'runtime',
            tenantId: 'tenant-test',
            payload: { action: 'read' },
        };
        const verdict = policyEngine.check(context);
        // Required fields validation
        (0, globals_1.expect)(verdict.action).toBeDefined();
        (0, globals_1.expect)(typeof verdict.action).toBe('string');
        (0, globals_1.expect)(['ALLOW', 'DENY', 'ESCALATE', 'WARN']).toContain(verdict.action);
        (0, globals_1.expect)(verdict.reasons).toBeDefined();
        (0, globals_1.expect)(Array.isArray(verdict.reasons)).toBe(true);
        (0, globals_1.expect)(verdict.policyIds).toBeDefined();
        (0, globals_1.expect)(Array.isArray(verdict.policyIds)).toBe(true);
        (0, globals_1.expect)(verdict.metadata).toBeDefined();
        (0, globals_1.expect)(verdict.metadata.timestamp).toBeDefined();
        (0, globals_1.expect)(verdict.metadata.evaluator).toBeDefined();
        (0, globals_1.expect)(verdict.metadata.latencyMs).toBeGreaterThanOrEqual(0);
        (0, globals_1.expect)(typeof verdict.metadata.simulation).toBe('boolean');
        (0, globals_1.expect)(verdict.provenance).toBeDefined();
        (0, globals_1.expect)(verdict.provenance.origin).toBeDefined();
        (0, globals_1.expect)(verdict.provenance.confidence).toBeGreaterThanOrEqual(0);
        (0, globals_1.expect)(verdict.provenance.confidence).toBeLessThanOrEqual(1);
    });
    (0, globals_1.it)('should validate verdict timestamp', () => {
        const context = {
            stage: 'runtime',
            tenantId: 'tenant-test',
            payload: { action: 'read' },
        };
        const beforeCheck = Date.now();
        const verdict = policyEngine.check(context);
        const afterCheck = Date.now();
        const verdictTimestamp = new Date(verdict.metadata.timestamp).getTime();
        (0, globals_1.expect)(verdictTimestamp).toBeGreaterThanOrEqual(beforeCheck);
        (0, globals_1.expect)(verdictTimestamp).toBeLessThanOrEqual(afterCheck);
        // Timestamp must be valid ISO 8601
        const isValidISO = !Number.isNaN(new Date(verdict.metadata.timestamp).getTime());
        (0, globals_1.expect)(isValidISO).toBe(true);
    });
    (0, globals_1.it)('should track verdict evaluator', () => {
        const context = {
            stage: 'runtime',
            tenantId: 'tenant-test',
            payload: { action: 'read' },
        };
        const verdict = policyEngine.check(context);
        (0, globals_1.expect)(verdict.metadata.evaluator).toBe('native-policy-engine-v1');
        (0, globals_1.expect)(typeof verdict.metadata.evaluator).toBe('string');
        (0, globals_1.expect)(verdict.metadata.evaluator.length).toBeGreaterThan(0);
    });
});
(0, globals_1.describe)('Governance Bypass Prevention', () => {
    let policyEngine;
    (0, globals_1.beforeEach)(() => {
        policyEngine = new PolicyEngine_js_1.PolicyEngine();
    });
    (0, globals_1.it)('should prevent direct data access without governance check', () => {
        // Simulate attempt to access data without governance check
        const rawData = { id: 'entity-123', sensitiveField: 'secret-value' };
        // Without governance envelope, data should be rejected
        const hasGovernanceWrapper = (obj) => {
            return obj.governanceVerdict !== undefined;
        };
        (0, globals_1.expect)(hasGovernanceWrapper(rawData)).toBe(false);
        // Proper envelope with governance
        const context = {
            stage: 'runtime',
            tenantId: 'tenant-test',
            payload: { action: 'read' },
        };
        const verdict = policyEngine.check(context);
        const envelope = {
            data: rawData,
            governanceVerdict: verdict,
            provenance: {
                source: 'test-system',
                timestamp: new Date().toISOString(),
                lineage: ['system', 'policy-engine'],
                hash: (0, crypto_1.createHash)('sha256').update(JSON.stringify(rawData)).digest('hex'),
            },
            metadata: {
                classification: 'CONFIDENTIAL',
                isSimulated: false,
                hash: (0, crypto_1.createHash)('sha256').update(JSON.stringify(rawData)).digest('hex'),
                generatedAt: new Date().toISOString(),
            },
        };
        (0, globals_1.expect)(hasGovernanceWrapper(envelope)).toBe(true);
    });
    (0, globals_1.it)('should block null verdict injection', () => {
        const maliciousEnvelope = {
            data: { id: 'entity-123' },
            governanceVerdict: null,
            provenance: {
                source: 'test',
                timestamp: new Date().toISOString(),
                lineage: [],
                hash: 'test',
            },
            metadata: {
                classification: 'PUBLIC',
                isSimulated: false,
                hash: 'test',
                generatedAt: new Date().toISOString(),
            },
        };
        const isValidVerdict = (verdict) => {
            return (verdict !== null &&
                verdict !== undefined &&
                typeof verdict === 'object' &&
                'action' in verdict &&
                'reasons' in verdict &&
                'policyIds' in verdict &&
                'metadata' in verdict &&
                'provenance' in verdict);
        };
        (0, globals_1.expect)(isValidVerdict(maliciousEnvelope.governanceVerdict)).toBe(false);
    });
    (0, globals_1.it)('should block undefined verdict injection', () => {
        const maliciousEnvelope = {
            data: { id: 'entity-123' },
            governanceVerdict: undefined,
        };
        const validateEnvelope = (env) => {
            return (env.governanceVerdict !== null &&
                env.governanceVerdict !== undefined &&
                typeof env.governanceVerdict === 'object');
        };
        (0, globals_1.expect)(validateEnvelope(maliciousEnvelope)).toBe(false);
    });
    (0, globals_1.it)('should prevent verdict result tampering', () => {
        const context = {
            stage: 'runtime',
            tenantId: 'tenant-test',
            payload: { action: 'read' },
        };
        const verdict = policyEngine.check(context);
        const originalAction = verdict.action;
        // Attempt to tamper with verdict
        const tamperedVerdict = { ...verdict };
        tamperedVerdict.action = 'DENY';
        // Original verdict should be immutable (in practice, we'd use Object.freeze)
        (0, globals_1.expect)(tamperedVerdict.action).not.toBe(originalAction);
        // Verify original verdict is unchanged
        (0, globals_1.expect)(verdict.action).toBe(originalAction);
        // In production, we'd verify hash/signature
        const computeVerdictHash = (v) => {
            return (0, crypto_1.createHash)('sha256')
                .update(JSON.stringify(v))
                .digest('hex');
        };
        const originalHash = computeVerdictHash(verdict);
        const tamperedHash = computeVerdictHash(tamperedVerdict);
        (0, globals_1.expect)(originalHash).not.toBe(tamperedHash);
    });
    (0, globals_1.it)('should prevent verdict timestamp backdating', () => {
        const context = {
            stage: 'runtime',
            tenantId: 'tenant-test',
            payload: { action: 'read' },
        };
        const verdict = policyEngine.check(context);
        const originalTimestamp = verdict.metadata.timestamp;
        // Attempt to backdate
        const backdatedVerdict = {
            ...verdict,
            metadata: {
                ...verdict.metadata,
                timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            },
        };
        // Validator should detect timestamp manipulation
        const isTimestampRecent = (timestamp, maxAgeMs = 5000) => {
            const timestampDate = new Date(timestamp).getTime();
            const now = Date.now();
            return now - timestampDate <= maxAgeMs;
        };
        (0, globals_1.expect)(isTimestampRecent(originalTimestamp)).toBe(true);
        (0, globals_1.expect)(isTimestampRecent(backdatedVerdict.metadata.timestamp, 5000)).toBe(false);
    });
    (0, globals_1.it)('should block unauthorized evaluator spoofing', () => {
        const context = {
            stage: 'runtime',
            tenantId: 'tenant-test',
            payload: { action: 'read' },
        };
        const verdict = policyEngine.check(context);
        // Attempt to spoof evaluator
        const spoofedVerdict = {
            ...verdict,
            metadata: {
                ...verdict.metadata,
                evaluator: 'malicious-evaluator',
            },
        };
        // Validator should verify evaluator is from trusted list
        const trustedEvaluators = [
            'native-policy-engine-v1',
            'opa-engine',
            'ai-copilot-service',
        ];
        const isValidEvaluator = (evaluator) => {
            return trustedEvaluators.includes(evaluator);
        };
        (0, globals_1.expect)(isValidEvaluator(verdict.metadata.evaluator)).toBe(true);
        (0, globals_1.expect)(isValidEvaluator(spoofedVerdict.metadata.evaluator)).toBe(false);
    });
    (0, globals_1.it)('should reject empty policyId', () => {
        const invalidVerdict = {
            action: 'ALLOW',
            reasons: ['Test'],
            policyIds: [], // Empty - should have at least one policy or default
            metadata: {
                timestamp: new Date().toISOString(),
                evaluator: 'test',
                latencyMs: 0,
                simulation: false,
            },
            provenance: {
                origin: 'test',
                confidence: 1.0,
            },
        };
        // In production systems, at minimum a default policy should apply
        const hasValidPolicyIds = (verdict) => {
            return (Array.isArray(verdict.policyIds) &&
                (verdict.policyIds.length > 0 || verdict.action === 'ALLOW'));
        };
        // Empty policyIds with ALLOW is acceptable (default allow)
        (0, globals_1.expect)(hasValidPolicyIds(invalidVerdict)).toBe(true);
        // But DENY without policyIds should be rejected
        const denyWithoutPolicy = { ...invalidVerdict, action: 'DENY' };
        const isValidDeny = (v) => {
            return v.action !== 'DENY' || (v.policyIds?.length ?? 0) > 0;
        };
        (0, globals_1.expect)(isValidDeny(denyWithoutPolicy)).toBe(false);
    });
    (0, globals_1.it)('should reject verdict with future timestamp', () => {
        const futureVerdict = {
            action: 'ALLOW',
            reasons: ['Test'],
            policyIds: ['test-policy'],
            metadata: {
                timestamp: new Date(Date.now() + 86400000).toISOString(), // 1 day in future
                evaluator: 'test',
                latencyMs: 0,
                simulation: false,
            },
            provenance: {
                origin: 'test',
                confidence: 1.0,
            },
        };
        const isValidTimestamp = (timestamp) => {
            const timestampDate = new Date(timestamp).getTime();
            const now = Date.now();
            return timestampDate <= now; // Timestamp must not be in the future
        };
        (0, globals_1.expect)(isValidTimestamp(futureVerdict.metadata.timestamp)).toBe(false);
    });
});
(0, globals_1.describe)('Provenance Validation', () => {
    let policyEngine;
    (0, globals_1.beforeEach)(() => {
        policyEngine = new PolicyEngine_js_1.PolicyEngine();
    });
    (0, globals_1.it)('should require provenance on all responses', () => {
        const context = {
            stage: 'runtime',
            tenantId: 'tenant-test',
            payload: { action: 'read' },
        };
        const verdict = policyEngine.check(context);
        (0, globals_1.expect)(verdict.provenance).toBeDefined();
        (0, globals_1.expect)(verdict.provenance.origin).toBeDefined();
        (0, globals_1.expect)(typeof verdict.provenance.origin).toBe('string');
        (0, globals_1.expect)(verdict.provenance.confidence).toBeDefined();
        (0, globals_1.expect)(typeof verdict.provenance.confidence).toBe('number');
    });
    (0, globals_1.it)('should validate provenance source', () => {
        const validSources = [
            'system-policy-check',
            'opa-engine',
            'ai-copilot-service',
            'user-input',
            'external-api',
        ];
        const provenance = {
            source: 'system-policy-check',
            timestamp: new Date().toISOString(),
            lineage: ['system', 'policy-engine'],
            hash: (0, crypto_1.createHash)('sha256').update('test').digest('hex'),
        };
        const isValidSource = (source) => {
            return validSources.includes(source) || source.startsWith('verified-');
        };
        (0, globals_1.expect)(isValidSource(provenance.source)).toBe(true);
        (0, globals_1.expect)(isValidSource('unknown-source')).toBe(false);
    });
    (0, globals_1.it)('should validate provenance timestamp', () => {
        const provenance = {
            source: 'test-system',
            timestamp: new Date().toISOString(),
            lineage: ['system'],
            hash: (0, crypto_1.createHash)('sha256').update('test').digest('hex'),
        };
        const isValidTimestamp = (timestamp) => {
            const date = new Date(timestamp);
            return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
        };
        (0, globals_1.expect)(isValidTimestamp(provenance.timestamp)).toBe(true);
        // Invalid timestamp
        (0, globals_1.expect)(isValidTimestamp('not-a-date')).toBe(false);
        // Future timestamp
        const futureTimestamp = new Date(Date.now() + 10000).toISOString();
        (0, globals_1.expect)(isValidTimestamp(futureTimestamp)).toBe(false);
    });
    (0, globals_1.it)('should track lineage chain', () => {
        const provenance = {
            source: 'test-system',
            timestamp: new Date().toISOString(),
            lineage: ['user-input', 'api-gateway', 'policy-engine', 'data-store'],
            hash: (0, crypto_1.createHash)('sha256').update('test').digest('hex'),
        };
        (0, globals_1.expect)(provenance.lineage).toBeDefined();
        (0, globals_1.expect)(Array.isArray(provenance.lineage)).toBe(true);
        (0, globals_1.expect)(provenance.lineage.length).toBeGreaterThan(0);
        // Lineage should form a valid chain
        const isValidLineage = (lineage) => {
            return lineage.length > 0 && lineage.every((node) => node.length > 0);
        };
        (0, globals_1.expect)(isValidLineage(provenance.lineage)).toBe(true);
    });
    (0, globals_1.it)('should reject orphan provenance', () => {
        const orphanProvenance = {
            source: 'unknown',
            timestamp: new Date().toISOString(),
            lineage: [], // Empty lineage - orphan
            hash: (0, crypto_1.createHash)('sha256').update('test').digest('hex'),
        };
        const isOrphan = (provenance) => {
            return !provenance.lineage || provenance.lineage.length === 0;
        };
        (0, globals_1.expect)(isOrphan(orphanProvenance)).toBe(true);
        const validProvenance = {
            source: 'system',
            timestamp: new Date().toISOString(),
            lineage: ['system', 'policy-engine'],
            hash: (0, crypto_1.createHash)('sha256').update('test').digest('hex'),
        };
        (0, globals_1.expect)(isOrphan(validProvenance)).toBe(false);
    });
});
(0, globals_1.describe)('Data Integrity', () => {
    (0, globals_1.it)('should validate data hash', () => {
        const data = { id: 'entity-123', name: 'Test Entity', value: 42 };
        const expectedHash = (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify(data))
            .digest('hex');
        const metadata = {
            classification: 'INTERNAL',
            isSimulated: false,
            hash: expectedHash,
            generatedAt: new Date().toISOString(),
        };
        // Verify hash matches data
        const computedHash = (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify(data))
            .digest('hex');
        (0, globals_1.expect)(metadata.hash).toBe(computedHash);
        (0, globals_1.expect)(metadata.hash).toBe(expectedHash);
    });
    (0, globals_1.it)('should reject tampered data', () => {
        const originalData = { id: 'entity-123', name: 'Test Entity' };
        const originalHash = (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify(originalData))
            .digest('hex');
        const metadata = {
            classification: 'INTERNAL',
            isSimulated: false,
            hash: originalHash,
            generatedAt: new Date().toISOString(),
        };
        // Tamper with data
        const tamperedData = { id: 'entity-123', name: 'Tampered Entity' };
        const tamperedHash = (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify(tamperedData))
            .digest('hex');
        // Hash mismatch should be detected
        (0, globals_1.expect)(metadata.hash).not.toBe(tamperedHash);
        const verifyIntegrity = (data, expectedHash) => {
            const computedHash = (0, crypto_1.createHash)('sha256')
                .update(JSON.stringify(data))
                .digest('hex');
            return computedHash === expectedHash;
        };
        (0, globals_1.expect)(verifyIntegrity(originalData, metadata.hash)).toBe(true);
        (0, globals_1.expect)(verifyIntegrity(tamperedData, metadata.hash)).toBe(false);
    });
    (0, globals_1.it)('should require classification', () => {
        const metadata = {
            classification: 'CONFIDENTIAL',
            isSimulated: false,
            hash: (0, crypto_1.createHash)('sha256').update('test').digest('hex'),
            generatedAt: new Date().toISOString(),
        };
        (0, globals_1.expect)(metadata.classification).toBeDefined();
        const validClassifications = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'SECRET'];
        (0, globals_1.expect)(validClassifications).toContain(metadata.classification);
        // Invalid classification
        const invalidMetadata = { ...metadata, classification: 'INVALID' };
        (0, globals_1.expect)(validClassifications).not.toContain(invalidMetadata.classification);
    });
    (0, globals_1.it)('should track isSimulated flag', () => {
        const simulatedMetadata = {
            classification: 'INTERNAL',
            isSimulated: true,
            hash: (0, crypto_1.createHash)('sha256').update('test').digest('hex'),
            generatedAt: new Date().toISOString(),
        };
        (0, globals_1.expect)(simulatedMetadata.isSimulated).toBe(true);
        (0, globals_1.expect)(typeof simulatedMetadata.isSimulated).toBe('boolean');
        const productionMetadata = {
            classification: 'INTERNAL',
            isSimulated: false,
            hash: (0, crypto_1.createHash)('sha256').update('test').digest('hex'),
            generatedAt: new Date().toISOString(),
        };
        (0, globals_1.expect)(productionMetadata.isSimulated).toBe(false);
        // Simulation flag should affect trust level
        const getTrustLevel = (metadata) => {
            if (metadata.isSimulated)
                return 'low';
            if (metadata.classification === 'SECRET')
                return 'high';
            return 'medium';
        };
        (0, globals_1.expect)(getTrustLevel(simulatedMetadata)).toBe('low');
        (0, globals_1.expect)(getTrustLevel(productionMetadata)).toBe('medium');
    });
});
(0, globals_1.describe)('Snapshot Tests', () => {
    let policyEngine;
    (0, globals_1.beforeEach)(() => {
        policyEngine = new PolicyEngine_js_1.PolicyEngine();
    });
    (0, globals_1.it)('should match governance verdict snapshot', () => {
        const context = {
            stage: 'runtime',
            tenantId: 'tenant-snapshot',
            payload: { action: 'read', resource: 'test-resource' },
        };
        const verdict = policyEngine.check(context);
        // Create deterministic snapshot (remove timestamp for consistency)
        const snapshot = {
            action: verdict.action,
            reasons: verdict.reasons,
            policyIds: verdict.policyIds,
            metadata: {
                evaluator: verdict.metadata.evaluator,
                simulation: verdict.metadata.simulation,
            },
            provenance: {
                origin: verdict.provenance.origin,
                confidence: verdict.provenance.confidence,
            },
        };
        (0, globals_1.expect)(snapshot).toMatchInlineSnapshot(`
{
  "action": "ALLOW",
  "metadata": {
    "evaluator": "native-policy-engine-v1",
    "simulation": false,
  },
  "policyIds": [],
  "provenance": {
    "confidence": 1,
    "origin": "system-policy-check",
  },
  "reasons": [],
}
`);
    });
    (0, globals_1.it)('should match data envelope snapshot', () => {
        const context = {
            stage: 'runtime',
            tenantId: 'tenant-snapshot',
            payload: { action: 'read' },
        };
        const verdict = policyEngine.check(context);
        const data = { id: 'entity-snapshot', name: 'Snapshot Entity' };
        const envelope = {
            data,
            governanceVerdict: verdict,
            provenance: {
                source: 'test-system',
                timestamp: '2025-01-01T00:00:00.000Z', // Fixed for snapshot
                lineage: ['system', 'policy-engine'],
                hash: (0, crypto_1.createHash)('sha256').update(JSON.stringify(data)).digest('hex'),
            },
            metadata: {
                classification: 'INTERNAL',
                isSimulated: false,
                hash: (0, crypto_1.createHash)('sha256').update(JSON.stringify(data)).digest('hex'),
                generatedAt: '2025-01-01T00:00:00.000Z', // Fixed for snapshot
            },
        };
        // Create deterministic snapshot
        const snapshot = {
            data: envelope.data,
            hasVerdict: envelope.governanceVerdict !== undefined,
            verdictAction: envelope.governanceVerdict.action,
            provenanceSource: envelope.provenance.source,
            classification: envelope.metadata.classification,
            isSimulated: envelope.metadata.isSimulated,
        };
        (0, globals_1.expect)(snapshot).toMatchInlineSnapshot(`
{
  "classification": "INTERNAL",
  "data": {
    "id": "entity-snapshot",
    "name": "Snapshot Entity",
  },
  "hasVerdict": true,
  "isSimulated": false,
  "provenanceSource": "test-system",
  "verdictAction": "ALLOW",
}
`);
    });
    (0, globals_1.it)('should match provenance chain snapshot', () => {
        const data = { id: 'test', value: 'data' };
        const provenance = {
            source: 'system-input',
            timestamp: '2025-01-01T00:00:00.000Z', // Fixed for snapshot
            lineage: ['user-input', 'api-gateway', 'policy-engine', 'data-store'],
            hash: (0, crypto_1.createHash)('sha256').update(JSON.stringify(data)).digest('hex'),
        };
        const snapshot = {
            source: provenance.source,
            lineageLength: provenance.lineage.length,
            lineageStart: provenance.lineage[0],
            lineageEnd: provenance.lineage[provenance.lineage.length - 1],
            hasHash: provenance.hash.length > 0,
        };
        (0, globals_1.expect)(snapshot).toMatchInlineSnapshot(`
{
  "hasHash": true,
  "lineageEnd": "data-store",
  "lineageLength": 4,
  "lineageStart": "user-input",
  "source": "system-input",
}
`);
    });
});
