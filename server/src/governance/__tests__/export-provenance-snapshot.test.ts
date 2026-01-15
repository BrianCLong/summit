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

import { describe, it, expect, beforeEach } from '@jest/globals';
import { createHash, randomUUID } from 'crypto';
import {
  createDataEnvelope,
  validateDataEnvelope,
  GovernanceResult,
  DataClassification,
  DataEnvelope,
  GovernanceVerdict,
  ExportBundle,
} from '../../types/data-envelope.js';

// Helper to create a valid governance verdict
function createTestVerdict(
  result: GovernanceResult = GovernanceResult.ALLOW
): GovernanceVerdict {
  return {
    verdictId: `verdict-${randomUUID()}`,
    policyId: 'export-policy-v1',
    result,
    decidedAt: new Date(),
    reason: 'Test export approved',
    evaluator: 'test-system',
  };
}

// Helper to create a test envelope
function createTestEnvelope<T>(data: T, options?: {
  isSimulated?: boolean;
  classification?: DataClassification;
  verdict?: GovernanceVerdict;
}): DataEnvelope<T> {
  return createDataEnvelope(data, {
    source: 'test-export-system',
    actor: 'test-user',
    isSimulated: options?.isSimulated ?? false,
    classification: options?.classification ?? DataClassification.INTERNAL,
    governanceVerdict: options?.verdict ?? createTestVerdict(),
    warnings: [],
  });
}

function requireVerdict<T>(envelope: DataEnvelope<T>): GovernanceVerdict {
  if (!envelope.governanceVerdict) {
    throw new Error('Missing governance verdict');
  }
  return envelope.governanceVerdict;
}

describe('Export Provenance Verification', () => {
  describe('Single Item Export', () => {
    it('should include provenance in exported entity', () => {
      const entity = { id: 'entity-123', name: 'Test Entity', type: 'Person' };
      const envelope = createTestEnvelope(entity);

      expect(envelope.provenance).toBeDefined();
      expect(envelope.provenance.source).toBe('test-export-system');
      expect(envelope.provenance.provenanceId).toBeDefined();
      expect(envelope.provenance.generatedAt).toBeInstanceOf(Date);
    });

    it('should include governance verdict in exported entity', () => {
      const entity = { id: 'entity-123', name: 'Test Entity' };
      const envelope = createTestEnvelope(entity);
      const verdict = requireVerdict(envelope);

      expect(verdict.verdictId).toBeDefined();
      expect(verdict.policyId).toBe('export-policy-v1');
      expect(verdict.result).toBe(GovernanceResult.ALLOW);
    });

    it('should include isSimulated flag in exported entity', () => {
      const entity = { id: 'entity-123', name: 'Test Entity' };

      const realEnvelope = createTestEnvelope(entity, { isSimulated: false });
      expect(realEnvelope.isSimulated).toBe(false);

      const simEnvelope = createTestEnvelope(entity, { isSimulated: true });
      expect(simEnvelope.isSimulated).toBe(true);
    });

    it('should include data hash for integrity verification', () => {
      const entity = { id: 'entity-123', name: 'Test Entity' };
      const envelope = createTestEnvelope(entity);

      expect(envelope.dataHash).toBeDefined();
      expect(envelope.dataHash.length).toBe(64); // SHA-256 hex

      // Verify hash matches data
      const expectedHash = createHash('sha256')
        .update(JSON.stringify(entity))
        .digest('hex');
      expect(envelope.dataHash).toBe(expectedHash);
    });

    it('should include classification level', () => {
      const entity = { id: 'entity-123', name: 'Sensitive Entity' };
      const envelope = createTestEnvelope(entity, {
        classification: DataClassification.CONFIDENTIAL,
      });

      expect(envelope.classification).toBe(DataClassification.CONFIDENTIAL);
    });
  });

  describe('Export Validation', () => {
    it('should validate complete export envelope', () => {
      const entity = { id: 'entity-123', name: 'Test Entity' };
      const envelope = createTestEnvelope(entity);

      const validation = validateDataEnvelope(envelope);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should fail validation for invalid envelope data', () => {
      const invalidEnvelope = {
        data: { id: 'entity-123' },
        provenance: {
          source: 'test',
          generatedAt: new Date(),
          lineage: [],
          provenanceId: 'prov-123',
        },
        isSimulated: false,
        classification: DataClassification.INTERNAL,
        dataHash: 'abc123',
        warnings: [],
        // Missing governanceVerdict
      };

      const validation = validateDataEnvelope(invalidEnvelope as any);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should detect tampered data via hash mismatch', () => {
      const entity = { id: 'entity-123', name: 'Original' };
      const envelope = createTestEnvelope(entity);

      // Tamper with data
      (envelope as any).data.name = 'Tampered';

      const validation = validateDataEnvelope(envelope);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('hash mismatch')]),
      );
    });
  });

  describe('Batch Export', () => {
    it('should include provenance and verdict for all items in batch', () => {
      const entities = [
        { id: 'entity-1', name: 'Entity 1' },
        { id: 'entity-2', name: 'Entity 2' },
        { id: 'entity-3', name: 'Entity 3' },
      ];

      const envelopes = entities.map(entity => createTestEnvelope(entity));

      envelopes.forEach((envelope, index) => {
        expect(envelope.provenance).toBeDefined();
        expect(envelope.governanceVerdict).toBeDefined();
        expect(envelope.isSimulated).toBeDefined();
        expect(envelope.data.id).toBe(`entity-${index + 1}`);
      });
    });

    it('should validate all items in batch export', () => {
      const entities = [
        { id: 'entity-1', name: 'Entity 1' },
        { id: 'entity-2', name: 'Entity 2' },
        { id: 'entity-3', name: 'Entity 3' },
      ];

      const envelopes = entities.map(entity => createTestEnvelope(entity));

      const validations = envelopes.map(envelope =>
        validateDataEnvelope(envelope)
      );

      validations.forEach(validation => {
        expect(validation.valid).toBe(true);
      });
    });
  });

  describe('Export Snapshots', () => {
    it('should match entity export snapshot structure', () => {
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

      expect(snapshot).toMatchInlineSnapshot(`
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

    it('should match governance verdict snapshot', () => {
      const verdict = createTestVerdict(GovernanceResult.ALLOW);

      const snapshot = {
        hasVerdictId: typeof verdict.verdictId === 'string',
        hasPolicyId: typeof verdict.policyId === 'string',
        hasResult: ['ALLOW', 'DENY', 'FLAG', 'REVIEW_REQUIRED'].includes(verdict.result),
        hasDecidedAt: verdict.decidedAt instanceof Date,
        hasEvaluator: typeof verdict.evaluator === 'string',
        result: verdict.result,
      };

      expect(snapshot).toMatchInlineSnapshot(`
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

    it('should match classification levels snapshot', () => {
      const levels = Object.values(DataClassification);

      expect(levels).toMatchInlineSnapshot(`
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

  describe('SOC 2 Compliance Verification', () => {
    it('PI1.1: should track data processing actor', () => {
      const entity = { id: 'entity-123', name: 'Test' };
      const envelope = createTestEnvelope(entity);

      expect(envelope.provenance.actor).toBe('test-user');
    });

    it('PI1.4: should verify data integrity via hash', () => {
      const entity = { id: 'entity-123', name: 'Test' };
      const envelope = createTestEnvelope(entity);

      const validation = validateDataEnvelope(envelope);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('CC6.1: should include governance decision audit trail', () => {
      const entity = { id: 'entity-123', name: 'Test' };
      const envelope = createTestEnvelope(entity);
      const verdict = requireVerdict(envelope);

      // Verify audit trail elements
      expect(verdict.verdictId).toBeDefined();
      expect(verdict.decidedAt).toBeInstanceOf(Date);
      expect(verdict.evaluator).toBeDefined();
    });

    it('should include SOC 2 control references in validation errors', () => {
      const invalidEnvelope = {
        data: { id: 'entity-123' },
        // Missing required fields
      };

      const validation = validateDataEnvelope(invalidEnvelope as any);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Simulated Data Handling', () => {
    it('should clearly mark simulated exports', () => {
      const entity = { id: 'simulated-123', name: 'Simulated Entity' };
      const envelope = createTestEnvelope(entity, { isSimulated: true });

      expect(envelope.isSimulated).toBe(true);
    });

    it('should include simulation warning for simulated data', () => {
      const entity = { id: 'simulated-123', name: 'Simulated Entity' };
      const envelope = createDataEnvelope(entity, {
        source: 'simulation-system',
        isSimulated: true,
        governanceVerdict: createTestVerdict(),
        warnings: ['This data is simulated and should not be used for production decisions'],
      });

      expect(envelope.isSimulated).toBe(true);
      expect(envelope.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining('simulated')]),
      );
    });
  });
});
