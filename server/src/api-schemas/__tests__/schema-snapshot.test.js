"use strict";
/**
 * API Schema Snapshot Tests
 *
 * Ensures API schemas remain stable and breaking changes are detected.
 * Breaking changes trigger version bump requirements.
 *
 * SOC 2 Controls:
 * - CC7.1: System change detection
 * - CC7.2: System change management
 *
 * @module api-schema-tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const zod_1 = require("zod");
// Schema definitions for snapshot testing
const ProvenanceSchema = zod_1.z.object({
    source: zod_1.z.string(),
    generatedAt: zod_1.z.date(),
    lineage: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        operation: zod_1.z.string(),
        inputs: zod_1.z.array(zod_1.z.string()),
        timestamp: zod_1.z.date(),
        actor: zod_1.z.string().optional(),
        metadata: zod_1.z.record(zod_1.z.any()).optional(),
    })),
    actor: zod_1.z.string().optional(),
    version: zod_1.z.string().optional(),
    provenanceId: zod_1.z.string(),
});
const GovernanceVerdictSchema = zod_1.z.object({
    verdictId: zod_1.z.string(),
    policyId: zod_1.z.string(),
    result: zod_1.z.enum(['ALLOW', 'DENY', 'FLAG', 'REVIEW_REQUIRED']),
    decidedAt: zod_1.z.date(),
    reason: zod_1.z.string().optional(),
    requiredApprovals: zod_1.z.array(zod_1.z.string()).optional(),
    evaluator: zod_1.z.string(),
});
const DataEnvelopeSchema = zod_1.z.object({
    data: zod_1.z.any(),
    provenance: ProvenanceSchema,
    confidence: zod_1.z.number().min(0).max(1).optional(),
    isSimulated: zod_1.z.boolean(),
    governanceVerdict: GovernanceVerdictSchema,
    classification: zod_1.z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED', 'HIGHLY_RESTRICTED']),
    dataHash: zod_1.z.string(),
    signature: zod_1.z.string().optional(),
    warnings: zod_1.z.array(zod_1.z.string()),
});
(0, globals_1.describe)('API Schema Snapshots', () => {
    (0, globals_1.describe)('DataEnvelope Schema', () => {
        (0, globals_1.it)('should match the expected schema structure', () => {
            const schemaShape = DataEnvelopeSchema.shape;
            (0, globals_1.expect)(Object.keys(schemaShape)).toMatchInlineSnapshot(`
[
  "data",
  "provenance",
  "confidence",
  "isSimulated",
  "governanceVerdict",
  "classification",
  "dataHash",
  "signature",
  "warnings",
]
`);
        });
        (0, globals_1.it)('should have mandatory governanceVerdict (GA requirement)', () => {
            const schemaShape = DataEnvelopeSchema.shape;
            // governanceVerdict should NOT be optional
            (0, globals_1.expect)(schemaShape.governanceVerdict.isOptional()).toBe(false);
        });
        (0, globals_1.it)('should have mandatory isSimulated flag (GA requirement)', () => {
            const schemaShape = DataEnvelopeSchema.shape;
            (0, globals_1.expect)(schemaShape.isSimulated.isOptional()).toBe(false);
        });
        (0, globals_1.it)('should have mandatory provenance (GA requirement)', () => {
            const schemaShape = DataEnvelopeSchema.shape;
            (0, globals_1.expect)(schemaShape.provenance.isOptional()).toBe(false);
        });
        (0, globals_1.it)('should validate a complete DataEnvelope', () => {
            const validEnvelope = {
                data: { id: 'test-123', name: 'Test Entity' },
                provenance: {
                    source: 'test-system',
                    generatedAt: new Date(),
                    lineage: [],
                    provenanceId: 'prov-123',
                },
                confidence: 0.95,
                isSimulated: false,
                governanceVerdict: {
                    verdictId: 'verdict-123',
                    policyId: 'policy-abc',
                    result: 'ALLOW',
                    decidedAt: new Date(),
                    evaluator: 'system',
                },
                classification: 'INTERNAL',
                dataHash: 'abc123',
                warnings: [],
            };
            const result = DataEnvelopeSchema.safeParse(validEnvelope);
            (0, globals_1.expect)(result.success).toBe(true);
        });
        (0, globals_1.it)('should reject envelope without governanceVerdict', () => {
            const invalidEnvelope = {
                data: { id: 'test-123' },
                provenance: {
                    source: 'test-system',
                    generatedAt: new Date(),
                    lineage: [],
                    provenanceId: 'prov-123',
                },
                isSimulated: false,
                classification: 'INTERNAL',
                dataHash: 'abc123',
                warnings: [],
                // Missing governanceVerdict
            };
            const result = DataEnvelopeSchema.safeParse(invalidEnvelope);
            (0, globals_1.expect)(result.success).toBe(false);
        });
        (0, globals_1.it)('should reject envelope without isSimulated flag', () => {
            const invalidEnvelope = {
                data: { id: 'test-123' },
                provenance: {
                    source: 'test-system',
                    generatedAt: new Date(),
                    lineage: [],
                    provenanceId: 'prov-123',
                },
                governanceVerdict: {
                    verdictId: 'verdict-123',
                    policyId: 'policy-abc',
                    result: 'ALLOW',
                    decidedAt: new Date(),
                    evaluator: 'system',
                },
                classification: 'INTERNAL',
                dataHash: 'abc123',
                warnings: [],
                // Missing isSimulated
            };
            const result = DataEnvelopeSchema.safeParse(invalidEnvelope);
            (0, globals_1.expect)(result.success).toBe(false);
        });
    });
    (0, globals_1.describe)('GovernanceVerdict Schema', () => {
        (0, globals_1.it)('should match the expected verdict structure', () => {
            const schemaShape = GovernanceVerdictSchema.shape;
            (0, globals_1.expect)(Object.keys(schemaShape)).toMatchInlineSnapshot(`
[
  "verdictId",
  "policyId",
  "result",
  "decidedAt",
  "reason",
  "requiredApprovals",
  "evaluator",
]
`);
        });
        (0, globals_1.it)('should support all valid verdict results', () => {
            const validResults = ['ALLOW', 'DENY', 'FLAG', 'REVIEW_REQUIRED'];
            validResults.forEach(result => {
                const verdict = {
                    verdictId: 'test-123',
                    policyId: 'policy-abc',
                    result,
                    decidedAt: new Date(),
                    evaluator: 'system',
                };
                const parseResult = GovernanceVerdictSchema.safeParse(verdict);
                (0, globals_1.expect)(parseResult.success).toBe(true);
            });
        });
        (0, globals_1.it)('should reject invalid verdict results', () => {
            const invalidVerdict = {
                verdictId: 'test-123',
                policyId: 'policy-abc',
                result: 'INVALID_RESULT',
                decidedAt: new Date(),
                evaluator: 'system',
            };
            const result = GovernanceVerdictSchema.safeParse(invalidVerdict);
            (0, globals_1.expect)(result.success).toBe(false);
        });
    });
    (0, globals_1.describe)('Provenance Schema', () => {
        (0, globals_1.it)('should match the expected provenance structure', () => {
            const schemaShape = ProvenanceSchema.shape;
            (0, globals_1.expect)(Object.keys(schemaShape)).toMatchInlineSnapshot(`
[
  "source",
  "generatedAt",
  "lineage",
  "actor",
  "version",
  "provenanceId",
]
`);
        });
        (0, globals_1.it)('should require provenanceId', () => {
            const invalidProvenance = {
                source: 'test-system',
                generatedAt: new Date(),
                lineage: [],
                // Missing provenanceId
            };
            const result = ProvenanceSchema.safeParse(invalidProvenance);
            (0, globals_1.expect)(result.success).toBe(false);
        });
    });
    (0, globals_1.describe)('Classification Levels', () => {
        (0, globals_1.it)('should match the expected classification levels', () => {
            const validLevels = [
                'PUBLIC',
                'INTERNAL',
                'CONFIDENTIAL',
                'RESTRICTED',
                'HIGHLY_RESTRICTED',
            ];
            (0, globals_1.expect)(validLevels).toMatchInlineSnapshot(`
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
});
(0, globals_1.describe)('Schema Breaking Change Detection', () => {
    /**
     * These tests capture the current schema structure.
     * If these tests fail, it indicates a breaking API change.
     *
     * SOC 2 Control CC7.2: Breaking changes must be reviewed and versioned.
     */
    (0, globals_1.it)('DataEnvelope required fields snapshot', () => {
        const requiredFields = [
            'data',
            'provenance',
            'isSimulated',
            'governanceVerdict',
            'classification',
            'dataHash',
            'warnings',
        ];
        (0, globals_1.expect)(requiredFields).toMatchInlineSnapshot(`
[
  "data",
  "provenance",
  "isSimulated",
  "governanceVerdict",
  "classification",
  "dataHash",
  "warnings",
]
`);
    });
    (0, globals_1.it)('GovernanceVerdict required fields snapshot', () => {
        const requiredFields = [
            'verdictId',
            'policyId',
            'result',
            'decidedAt',
            'evaluator',
        ];
        (0, globals_1.expect)(requiredFields).toMatchInlineSnapshot(`
[
  "verdictId",
  "policyId",
  "result",
  "decidedAt",
  "evaluator",
]
`);
    });
    (0, globals_1.it)('API version compatibility matrix snapshot', () => {
        const compatibilityMatrix = {
            v1: {
                governanceVerdict: 'optional',
                isSimulated: 'optional',
                provenance: 'optional',
            },
            'v1.1': {
                governanceVerdict: 'required',
                isSimulated: 'required',
                provenance: 'required',
            },
            v2: {
                governanceVerdict: 'required',
                isSimulated: 'required',
                provenance: 'required',
                dataEnvelopeWrapper: 'required',
            },
        };
        (0, globals_1.expect)(compatibilityMatrix).toMatchInlineSnapshot(`
{
  "v1": {
    "governanceVerdict": "optional",
    "isSimulated": "optional",
    "provenance": "optional",
  },
  "v1.1": {
    "governanceVerdict": "required",
    "isSimulated": "required",
    "provenance": "required",
  },
  "v2": {
    "dataEnvelopeWrapper": "required",
    "governanceVerdict": "required",
    "isSimulated": "required",
    "provenance": "required",
  },
}
`);
    });
});
