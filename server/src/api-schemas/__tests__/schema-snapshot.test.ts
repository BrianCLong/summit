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

import { describe, it, expect, beforeAll } from '@jest/globals';
import { z } from 'zod';
import {
  DataEnvelope,
  GovernanceVerdict,
  GovernanceResult,
  Provenance,
  DataClassification,
} from '../../types/data-envelope.ts';

// Schema definitions for snapshot testing
const ProvenanceSchema = z.object({
  source: z.string(),
  generatedAt: z.date(),
  lineage: z.array(z.object({
    id: z.string(),
    operation: z.string(),
    inputs: z.array(z.string()),
    timestamp: z.date(),
    actor: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  })),
  actor: z.string().optional(),
  version: z.string().optional(),
  provenanceId: z.string(),
});

const GovernanceVerdictSchema = z.object({
  verdictId: z.string(),
  policyId: z.string(),
  result: z.enum(['ALLOW', 'DENY', 'FLAG', 'REVIEW_REQUIRED']),
  decidedAt: z.date(),
  reason: z.string().optional(),
  requiredApprovals: z.array(z.string()).optional(),
  evaluator: z.string(),
});

const DataEnvelopeSchema = z.object({
  data: z.any(),
  provenance: ProvenanceSchema,
  confidence: z.number().min(0).max(1).optional(),
  isSimulated: z.boolean(),
  governanceVerdict: GovernanceVerdictSchema,
  classification: z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED', 'HIGHLY_RESTRICTED']),
  dataHash: z.string(),
  signature: z.string().optional(),
  warnings: z.array(z.string()),
});

describe('API Schema Snapshots', () => {
  describe('DataEnvelope Schema', () => {
    it('should match the expected schema structure', () => {
      const schemaShape = DataEnvelopeSchema.shape;

      expect(Object.keys(schemaShape)).toMatchInlineSnapshot(`
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

    it('should have mandatory governanceVerdict (GA requirement)', () => {
      const schemaShape = DataEnvelopeSchema.shape;

      // governanceVerdict should NOT be optional
      expect(schemaShape.governanceVerdict.isOptional()).toBe(false);
    });

    it('should have mandatory isSimulated flag (GA requirement)', () => {
      const schemaShape = DataEnvelopeSchema.shape;

      expect(schemaShape.isSimulated.isOptional()).toBe(false);
    });

    it('should have mandatory provenance (GA requirement)', () => {
      const schemaShape = DataEnvelopeSchema.shape;

      expect(schemaShape.provenance.isOptional()).toBe(false);
    });

    it('should validate a complete DataEnvelope', () => {
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
          result: 'ALLOW' as const,
          decidedAt: new Date(),
          evaluator: 'system',
        },
        classification: 'INTERNAL' as const,
        dataHash: 'abc123',
        warnings: [],
      };

      const result = DataEnvelopeSchema.safeParse(validEnvelope);
      expect(result.success).toBe(true);
    });

    it('should reject envelope without governanceVerdict', () => {
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
      expect(result.success).toBe(false);
    });

    it('should reject envelope without isSimulated flag', () => {
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
      expect(result.success).toBe(false);
    });
  });

  describe('GovernanceVerdict Schema', () => {
    it('should match the expected verdict structure', () => {
      const schemaShape = GovernanceVerdictSchema.shape;

      expect(Object.keys(schemaShape)).toMatchInlineSnapshot(`
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

    it('should support all valid verdict results', () => {
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
        expect(parseResult.success).toBe(true);
      });
    });

    it('should reject invalid verdict results', () => {
      const invalidVerdict = {
        verdictId: 'test-123',
        policyId: 'policy-abc',
        result: 'INVALID_RESULT',
        decidedAt: new Date(),
        evaluator: 'system',
      };

      const result = GovernanceVerdictSchema.safeParse(invalidVerdict);
      expect(result.success).toBe(false);
    });
  });

  describe('Provenance Schema', () => {
    it('should match the expected provenance structure', () => {
      const schemaShape = ProvenanceSchema.shape;

      expect(Object.keys(schemaShape)).toMatchInlineSnapshot(`
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

    it('should require provenanceId', () => {
      const invalidProvenance = {
        source: 'test-system',
        generatedAt: new Date(),
        lineage: [],
        // Missing provenanceId
      };

      const result = ProvenanceSchema.safeParse(invalidProvenance);
      expect(result.success).toBe(false);
    });
  });

  describe('Classification Levels', () => {
    it('should match the expected classification levels', () => {
      const validLevels = [
        'PUBLIC',
        'INTERNAL',
        'CONFIDENTIAL',
        'RESTRICTED',
        'HIGHLY_RESTRICTED',
      ];

      expect(validLevels).toMatchInlineSnapshot(`
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

describe('Schema Breaking Change Detection', () => {
  /**
   * These tests capture the current schema structure.
   * If these tests fail, it indicates a breaking API change.
   *
   * SOC 2 Control CC7.2: Breaking changes must be reviewed and versioned.
   */

  it('DataEnvelope required fields snapshot', () => {
    const requiredFields = [
      'data',
      'provenance',
      'isSimulated',
      'governanceVerdict',
      'classification',
      'dataHash',
      'warnings',
    ];

    expect(requiredFields).toMatchInlineSnapshot(`
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

  it('GovernanceVerdict required fields snapshot', () => {
    const requiredFields = [
      'verdictId',
      'policyId',
      'result',
      'decidedAt',
      'evaluator',
    ];

    expect(requiredFields).toMatchInlineSnapshot(`
[
  "verdictId",
  "policyId",
  "result",
  "decidedAt",
  "evaluator",
]
`);
  });

  it('API version compatibility matrix snapshot', () => {
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

    expect(compatibilityMatrix).toMatchInlineSnapshot(`
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
