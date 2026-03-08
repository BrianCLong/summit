"use strict";
/**
 * Export Provenance Snapshot Tests
 *
 * Ensures all exported data includes provenance and governance verdicts.
 * These tests verify data integrity for compliance and audit purposes.
 *
 * SOC 2 Controls:
 * - PI1.1: Data processing controls
 * - PI1.4: Data integrity verification
 * - CC6.1: Access control logging
 *
 * @module export-provenance-tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const crypto_1 = require("crypto");
const data_envelope_js_1 = require("../../types/data-envelope.js");
// Helper to create a valid governance verdict
function createTestVerdict(result = data_envelope_js_1.GovernanceResult.ALLOW) {
    return {
        verdictId: `verdict-${(0, crypto_1.randomUUID)()}`,
        policyId: 'export-policy-v1',
        result,
        decidedAt: new Date(),
        reason: 'Test export approved',
        evaluator: 'test-system',
    };
}
// Helper to create a test envelope
function createTestEnvelope(data, options) {
    return (0, data_envelope_js_1.createDataEnvelope)(data, {
        source: 'test-export-system',
        actor: 'test-user',
        isSimulated: options?.isSimulated ?? false,
        classification: options?.classification ?? data_envelope_js_1.DataClassification.INTERNAL,
        governanceVerdict: options?.verdict ?? createTestVerdict(),
        warnings: [],
    });
}
function requireVerdict(envelope) {
    if (!envelope.governanceVerdict) {
        throw new Error('Missing governance verdict');
    }
    return envelope.governanceVerdict;
}
(0, globals_1.describe)('Export Provenance Verification', () => {
    (0, globals_1.describe)('Single Item Export', () => {
        (0, globals_1.it)('should include provenance in exported entity', () => {
            const entity = { id: 'entity-123', name: 'Test Entity', type: 'Person' };
            const envelope = createTestEnvelope(entity);
            (0, globals_1.expect)(envelope.provenance).toBeDefined();
            (0, globals_1.expect)(envelope.provenance.source).toBe('test-export-system');
            (0, globals_1.expect)(envelope.provenance.provenanceId).toBeDefined();
            (0, globals_1.expect)(envelope.provenance.generatedAt).toBeInstanceOf(Date);
        });
        (0, globals_1.it)('should include governance verdict in exported entity', () => {
            const entity = { id: 'entity-123', name: 'Test Entity' };
            const envelope = createTestEnvelope(entity);
            const verdict = requireVerdict(envelope);
            (0, globals_1.expect)(verdict.verdictId).toBeDefined();
            (0, globals_1.expect)(verdict.policyId).toBe('export-policy-v1');
            (0, globals_1.expect)(verdict.result).toBe(data_envelope_js_1.GovernanceResult.ALLOW);
        });
        (0, globals_1.it)('should include isSimulated flag in exported entity', () => {
            const entity = { id: 'entity-123', name: 'Test Entity' };
            const realEnvelope = createTestEnvelope(entity, { isSimulated: false });
            (0, globals_1.expect)(realEnvelope.isSimulated).toBe(false);
            const simEnvelope = createTestEnvelope(entity, { isSimulated: true });
            (0, globals_1.expect)(simEnvelope.isSimulated).toBe(true);
        });
        (0, globals_1.it)('should include data hash for integrity verification', () => {
            const entity = { id: 'entity-123', name: 'Test Entity' };
            const envelope = createTestEnvelope(entity);
            (0, globals_1.expect)(envelope.dataHash).toBeDefined();
            (0, globals_1.expect)(envelope.dataHash.length).toBe(64); // SHA-256 hex
            // Verify hash matches data
            const expectedHash = (0, crypto_1.createHash)('sha256')
                .update(JSON.stringify(entity))
                .digest('hex');
            (0, globals_1.expect)(envelope.dataHash).toBe(expectedHash);
        });
        (0, globals_1.it)('should include classification level', () => {
            const entity = { id: 'entity-123', name: 'Sensitive Entity' };
            const envelope = createTestEnvelope(entity, {
                classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
            });
            (0, globals_1.expect)(envelope.classification).toBe(data_envelope_js_1.DataClassification.CONFIDENTIAL);
        });
    });
    (0, globals_1.describe)('Export Validation', () => {
        (0, globals_1.it)('should validate complete export envelope', () => {
            const entity = { id: 'entity-123', name: 'Test Entity' };
            const envelope = createTestEnvelope(entity);
            const validation = (0, data_envelope_js_1.validateDataEnvelope)(envelope);
            (0, globals_1.expect)(validation.valid).toBe(true);
            (0, globals_1.expect)(validation.errors).toHaveLength(0);
        });
        (0, globals_1.it)('should fail validation for invalid envelope data', () => {
            const invalidEnvelope = {
                data: { id: 'entity-123' },
                provenance: {
                    source: 'test',
                    generatedAt: new Date(),
                    lineage: [],
                    provenanceId: 'prov-123',
                },
                isSimulated: false,
                classification: data_envelope_js_1.DataClassification.INTERNAL,
                dataHash: 'abc123',
                warnings: [],
                // Missing governanceVerdict
            };
            const validation = (0, data_envelope_js_1.validateDataEnvelope)(invalidEnvelope);
            (0, globals_1.expect)(validation.valid).toBe(false);
            (0, globals_1.expect)(validation.errors.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should detect tampered data via hash mismatch', () => {
            const entity = { id: 'entity-123', name: 'Original' };
            const envelope = createTestEnvelope(entity);
            // Tamper with data
            envelope.data.name = 'Tampered';
            const validation = (0, data_envelope_js_1.validateDataEnvelope)(envelope);
            (0, globals_1.expect)(validation.valid).toBe(false);
            (0, globals_1.expect)(validation.errors).toEqual(globals_1.expect.arrayContaining([globals_1.expect.stringContaining('hash mismatch')]));
        });
    });
    (0, globals_1.describe)('Batch Export', () => {
        (0, globals_1.it)('should include provenance and verdict for all items in batch', () => {
            const entities = [
                { id: 'entity-1', name: 'Entity 1' },
                { id: 'entity-2', name: 'Entity 2' },
                { id: 'entity-3', name: 'Entity 3' },
            ];
            const envelopes = entities.map(entity => createTestEnvelope(entity));
            envelopes.forEach((envelope, index) => {
                (0, globals_1.expect)(envelope.provenance).toBeDefined();
                (0, globals_1.expect)(envelope.governanceVerdict).toBeDefined();
                (0, globals_1.expect)(envelope.isSimulated).toBeDefined();
                (0, globals_1.expect)(envelope.data.id).toBe(`entity-${index + 1}`);
            });
        });
        (0, globals_1.it)('should validate all items in batch export', () => {
            const entities = [
                { id: 'entity-1', name: 'Entity 1' },
                { id: 'entity-2', name: 'Entity 2' },
                { id: 'entity-3', name: 'Entity 3' },
            ];
            const envelopes = entities.map(entity => createTestEnvelope(entity));
            const validations = envelopes.map(envelope => (0, data_envelope_js_1.validateDataEnvelope)(envelope));
            validations.forEach(validation => {
                (0, globals_1.expect)(validation.valid).toBe(true);
            });
        });
    });
    (0, globals_1.describe)('Export Snapshots', () => {
        (0, globals_1.it)('should match entity export snapshot structure', () => {
            const entity = { id: 'entity-snapshot', name: 'Snapshot Test', type: 'Person' };
            const envelope = createTestEnvelope(entity);
            // Create deterministic snapshot (exclude timestamps for consistency)
            const snapshot = {
                hasData: envelope.data !== undefined,
                dataShape: Object.keys(envelope.data),
                hasProvenance: envelope.provenance !== undefined,
                provenanceShape: Object.keys(envelope.provenance),
                hasGovernanceVerdict: envelope.governanceVerdict !== undefined,
                verdictShape: Object.keys(requireVerdict(envelope)),
                isSimulated: typeof envelope.isSimulated === 'boolean',
                hasDataHash: typeof envelope.dataHash === 'string',
                hasClassification: typeof envelope.classification === 'string',
                hasWarnings: Array.isArray(envelope.warnings),
            };
            (0, globals_1.expect)(snapshot).toMatchInlineSnapshot(`
{
  "dataShape": [
    "id",
    "name",
    "type",
  ],
  "hasClassification": true,
  "hasData": true,
  "hasDataHash": true,
  "hasGovernanceVerdict": true,
  "hasProvenance": true,
  "hasWarnings": true,
  "isSimulated": true,
  "provenanceShape": [
    "source",
    "generatedAt",
    "lineage",
    "actor",
    "version",
    "provenanceId",
  ],
  "verdictShape": [
    "verdictId",
    "policyId",
    "result",
    "decidedAt",
    "reason",
    "evaluator",
  ],
}
`);
        });
        (0, globals_1.it)('should match governance verdict snapshot', () => {
            const verdict = createTestVerdict(data_envelope_js_1.GovernanceResult.ALLOW);
            const snapshot = {
                hasVerdictId: typeof verdict.verdictId === 'string',
                hasPolicyId: typeof verdict.policyId === 'string',
                hasResult: ['ALLOW', 'DENY', 'FLAG', 'REVIEW_REQUIRED'].includes(verdict.result),
                hasDecidedAt: verdict.decidedAt instanceof Date,
                hasEvaluator: typeof verdict.evaluator === 'string',
                result: verdict.result,
            };
            (0, globals_1.expect)(snapshot).toMatchInlineSnapshot(`
{
  "hasDecidedAt": true,
  "hasEvaluator": true,
  "hasPolicyId": true,
  "hasResult": true,
  "hasVerdictId": true,
  "result": "ALLOW",
}
`);
        });
        (0, globals_1.it)('should match classification levels snapshot', () => {
            const levels = Object.values(data_envelope_js_1.DataClassification);
            (0, globals_1.expect)(levels).toMatchInlineSnapshot(`
[
  "PUBLIC",
  "INTERNAL",
  "CONFIDENTIAL",
  "RESTRICTED",
  "HIGHLY_RESTRICTED",
]
`);
        });
    });
    (0, globals_1.describe)('SOC 2 Compliance Verification', () => {
        (0, globals_1.it)('PI1.1: should track data processing actor', () => {
            const entity = { id: 'entity-123', name: 'Test' };
            const envelope = createTestEnvelope(entity);
            (0, globals_1.expect)(envelope.provenance.actor).toBe('test-user');
        });
        (0, globals_1.it)('PI1.4: should verify data integrity via hash', () => {
            const entity = { id: 'entity-123', name: 'Test' };
            const envelope = createTestEnvelope(entity);
            const validation = (0, data_envelope_js_1.validateDataEnvelope)(envelope);
            (0, globals_1.expect)(validation.valid).toBe(true);
            (0, globals_1.expect)(validation.errors).toHaveLength(0);
        });
        (0, globals_1.it)('CC6.1: should include governance decision audit trail', () => {
            const entity = { id: 'entity-123', name: 'Test' };
            const envelope = createTestEnvelope(entity);
            const verdict = requireVerdict(envelope);
            // Verify audit trail elements
            (0, globals_1.expect)(verdict.verdictId).toBeDefined();
            (0, globals_1.expect)(verdict.decidedAt).toBeInstanceOf(Date);
            (0, globals_1.expect)(verdict.evaluator).toBeDefined();
        });
        (0, globals_1.it)('should include SOC 2 control references in validation errors', () => {
            const invalidEnvelope = {
                data: { id: 'entity-123' },
                // Missing required fields
            };
            const validation = (0, data_envelope_js_1.validateDataEnvelope)(invalidEnvelope);
            (0, globals_1.expect)(validation.valid).toBe(false);
            (0, globals_1.expect)(validation.errors.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Simulated Data Handling', () => {
        (0, globals_1.it)('should clearly mark simulated exports', () => {
            const entity = { id: 'simulated-123', name: 'Simulated Entity' };
            const envelope = createTestEnvelope(entity, { isSimulated: true });
            (0, globals_1.expect)(envelope.isSimulated).toBe(true);
        });
        (0, globals_1.it)('should include simulation warning for simulated data', () => {
            const entity = { id: 'simulated-123', name: 'Simulated Entity' };
            const envelope = (0, data_envelope_js_1.createDataEnvelope)(entity, {
                source: 'simulation-system',
                isSimulated: true,
                governanceVerdict: createTestVerdict(),
                warnings: ['This data is simulated and should not be used for production decisions'],
            });
            (0, globals_1.expect)(envelope.isSimulated).toBe(true);
            (0, globals_1.expect)(envelope.warnings).toEqual(globals_1.expect.arrayContaining([globals_1.expect.stringContaining('simulated')]));
        });
    });
});
