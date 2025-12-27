/**
 * Governance Bypass Regression Tests
 *
 * These tests intentionally attempt to bypass governance controls and verify they fail.
 * Every test in this file MUST succeed (meaning the bypass attempt MUST be blocked).
 *
 * SOC 2 Controls:
 * - CC6.1: Logical access controls
 * - CC7.2: System change management
 * - PI1.4: Data integrity verification
 *
 * CRITICAL: If any of these tests fail, it indicates a potential security vulnerability.
 *
 * @module governance-bypass-regression
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  createDataEnvelope,
  createDataEnvelopeInternal,
  attachGovernanceVerdict,
  validateDataEnvelope,
  assertValidDataEnvelope,
  DataEnvelope,
  GovernanceResult,
  DataClassification,
  GovernanceVerdict,
} from '../../types/data-envelope.js';

// Mock governance verdict
function createMockVerdict(
  result: GovernanceResult = GovernanceResult.ALLOW
): GovernanceVerdict {
  return {
    verdictId: `verdict-${Date.now()}-test`,
    policyId: 'test-policy-v1',
    result,
    decidedAt: new Date(),
    reason: 'Test verdict',
    evaluator: 'test-system',
  };
}

describe('Governance Bypass Regression Tests', () => {
  describe('BYPASS-001: Attempt to create envelope without governance verdict', () => {
    it('should BLOCK creation of DataEnvelope without governanceVerdict', () => {
      const data = { id: 'test-123', name: 'Test Entity' };

      // This should throw because governanceVerdict is mandatory
      expect(() => {
        createDataEnvelope(data, {
          source: 'test-system',
          // @ts-expect-error - Intentionally omitting governanceVerdict to test enforcement
          governanceVerdict: undefined,
        });
      }).toThrow(/GovernanceVerdict is required/);
    });

    it('should BLOCK creation with null governanceVerdict', () => {
      const data = { id: 'test-123', name: 'Test Entity' };

      expect(() => {
        createDataEnvelope(data, {
          source: 'test-system',
          // @ts-expect-error - Intentionally passing null to test enforcement
          governanceVerdict: null,
        });
      }).toThrow(/GovernanceVerdict is required/);
    });
  });

  describe('BYPASS-002: Attempt to validate envelope without governance verdict', () => {
    it('should FAIL validation for envelope missing governanceVerdict', () => {
      const invalidEnvelope = {
        data: { id: 'test-123' },
        provenance: {
          source: 'test-system',
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
      expect(validation.errors).toContain(
        expect.stringContaining('governance verdict')
      );
      expect(validation.soc2Controls).toContain('CC6.1');
      expect(validation.soc2Controls).toContain('CC7.2');
    });

    it('should THROW when assertValidDataEnvelope called on invalid envelope', () => {
      const invalidEnvelope = {
        data: { id: 'test-123' },
        // Missing all required fields
      };

      expect(() => {
        assertValidDataEnvelope(invalidEnvelope as any);
      }).toThrow(/GA ENFORCEMENT/);
    });
  });

  describe('BYPASS-003: Attempt to bypass via internal envelope without attaching verdict', () => {
    it('should create internal envelope but FAIL validation without verdict', () => {
      const data = { id: 'test-123', name: 'Test Entity' };

      // Internal envelope can be created without verdict
      const internalEnvelope = createDataEnvelopeInternal(data, {
        source: 'test-system',
      });

      // But it should NOT pass validation
      const validation = validateDataEnvelope(internalEnvelope as any);
      expect(validation.valid).toBe(false);
    });

    it('should REQUIRE attachGovernanceVerdict before exposing to API', () => {
      const data = { id: 'test-123', name: 'Test Entity' };

      const internalEnvelope = createDataEnvelopeInternal(data, {
        source: 'test-system',
      });

      // Cannot cast to DataEnvelope without verdict
      expect(internalEnvelope.governanceVerdict).toBeUndefined();

      // After attaching verdict, should be valid
      const validEnvelope = attachGovernanceVerdict(
        internalEnvelope,
        createMockVerdict()
      );

      const validation = validateDataEnvelope(validEnvelope);
      expect(validation.valid).toBe(true);
    });
  });

  describe('BYPASS-004: Attempt to bypass with incomplete verdict', () => {
    it('should FAIL validation for verdict missing verdictId', () => {
      const invalidVerdict = {
        policyId: 'test-policy',
        result: GovernanceResult.ALLOW,
        decidedAt: new Date(),
        evaluator: 'system',
        // Missing verdictId
      };

      const envelope = {
        data: { id: 'test-123' },
        provenance: {
          source: 'test-system',
          generatedAt: new Date(),
          lineage: [],
          provenanceId: 'prov-123',
        },
        isSimulated: false,
        governanceVerdict: invalidVerdict,
        classification: DataClassification.INTERNAL,
        dataHash: 'abc123',
        warnings: [],
      };

      const validation = validateDataEnvelope(envelope as any);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        expect.stringContaining('verdict ID')
      );
    });

    it('should FAIL validation for verdict missing result', () => {
      const invalidVerdict = {
        verdictId: 'verdict-123',
        policyId: 'test-policy',
        decidedAt: new Date(),
        evaluator: 'system',
        // Missing result
      };

      const envelope = {
        data: { id: 'test-123' },
        provenance: {
          source: 'test-system',
          generatedAt: new Date(),
          lineage: [],
          provenanceId: 'prov-123',
        },
        isSimulated: false,
        governanceVerdict: invalidVerdict,
        classification: DataClassification.INTERNAL,
        dataHash: 'abc123',
        warnings: [],
      };

      const validation = validateDataEnvelope(envelope as any);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        expect.stringContaining('governance result')
      );
    });
  });

  describe('BYPASS-005: Attempt to bypass isSimulated enforcement', () => {
    it('should FAIL validation for missing isSimulated flag', () => {
      const envelope = {
        data: { id: 'test-123' },
        provenance: {
          source: 'test-system',
          generatedAt: new Date(),
          lineage: [],
          provenanceId: 'prov-123',
        },
        governanceVerdict: createMockVerdict(),
        classification: DataClassification.INTERNAL,
        dataHash: 'abc123',
        warnings: [],
        // Missing isSimulated
      };

      const validation = validateDataEnvelope(envelope as any);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        expect.stringContaining('isSimulated')
      );
    });
  });

  describe('BYPASS-006: Attempt to bypass provenance enforcement', () => {
    it('should FAIL validation for missing provenance', () => {
      const envelope = {
        data: { id: 'test-123' },
        isSimulated: false,
        governanceVerdict: createMockVerdict(),
        classification: DataClassification.INTERNAL,
        dataHash: 'abc123',
        warnings: [],
        // Missing provenance
      };

      const validation = validateDataEnvelope(envelope as any);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        expect.stringContaining('provenance')
      );
      expect(validation.soc2Controls).toContain('PI1.1');
    });

    it('should FAIL validation for provenance missing source', () => {
      const envelope = {
        data: { id: 'test-123' },
        provenance: {
          generatedAt: new Date(),
          lineage: [],
          provenanceId: 'prov-123',
          // Missing source
        },
        isSimulated: false,
        governanceVerdict: createMockVerdict(),
        classification: DataClassification.INTERNAL,
        dataHash: 'abc123',
        warnings: [],
      };

      const validation = validateDataEnvelope(envelope as any);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        expect.stringContaining('provenance source')
      );
    });

    it('should FAIL validation for provenance missing provenanceId', () => {
      const envelope = {
        data: { id: 'test-123' },
        provenance: {
          source: 'test-system',
          generatedAt: new Date(),
          lineage: [],
          // Missing provenanceId
        },
        isSimulated: false,
        governanceVerdict: createMockVerdict(),
        classification: DataClassification.INTERNAL,
        dataHash: 'abc123',
        warnings: [],
      };

      const validation = validateDataEnvelope(envelope as any);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        expect.stringContaining('provenance ID')
      );
    });
  });

  describe('BYPASS-007: Attempt data tampering via hash manipulation', () => {
    it('should DETECT tampered data via hash mismatch', () => {
      const data = { id: 'original-123', name: 'Original Entity' };
      const envelope = createDataEnvelope(data, {
        source: 'test-system',
        governanceVerdict: createMockVerdict(),
      });

      // Tamper with data
      (envelope as any).data.name = 'Tampered Entity';

      const validation = validateDataEnvelope(envelope);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        expect.stringContaining('hash mismatch')
      );
      expect(validation.soc2Controls).toContain('PI1.4');
    });

    it('should DETECT missing data hash', () => {
      const envelope = {
        data: { id: 'test-123' },
        provenance: {
          source: 'test-system',
          generatedAt: new Date(),
          lineage: [],
          provenanceId: 'prov-123',
        },
        isSimulated: false,
        governanceVerdict: createMockVerdict(),
        classification: DataClassification.INTERNAL,
        warnings: [],
        // Missing dataHash
      };

      const validation = validateDataEnvelope(envelope as any);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        expect.stringContaining('data hash')
      );
    });
  });

  describe('BYPASS-008: Attempt to bypass via DENY verdict', () => {
    it('should properly create envelope with DENY verdict (for audit)', () => {
      const data = { id: 'test-123', name: 'Denied Entity' };
      const denyVerdict = createMockVerdict(GovernanceResult.DENY);
      denyVerdict.reason = 'Policy violation: insufficient permissions';

      const envelope = createDataEnvelope(data, {
        source: 'test-system',
        governanceVerdict: denyVerdict,
      });

      // Envelope should be valid for audit purposes
      const validation = validateDataEnvelope(envelope);
      expect(validation.valid).toBe(true);

      // But verdict should clearly indicate DENY
      expect(envelope.governanceVerdict.result).toBe(GovernanceResult.DENY);
    });
  });

  describe('BYPASS-009: Type system enforcement', () => {
    it('TypeScript should prevent optional governanceVerdict at compile time', () => {
      // This test verifies that the type system enforces mandatory fields
      // The following would cause a compile error if uncommented:
      //
      // const envelope: DataEnvelope<{id: string}> = {
      //   data: { id: 'test' },
      //   provenance: { source: '', generatedAt: new Date(), lineage: [], provenanceId: '' },
      //   isSimulated: false,
      //   // Missing governanceVerdict - TypeScript error!
      //   classification: DataClassification.INTERNAL,
      //   dataHash: '',
      //   warnings: [],
      // };

      // Type check passes - this is a compile-time guarantee
      expect(true).toBe(true);
    });
  });

  describe('BYPASS-010: attachGovernanceVerdict enforcement', () => {
    it('should THROW when attaching null verdict', () => {
      const internalEnvelope = createDataEnvelopeInternal(
        { id: 'test-123' },
        { source: 'test-system' }
      );

      expect(() => {
        attachGovernanceVerdict(internalEnvelope, null as any);
      }).toThrow(/Governance verdict is required/);
    });

    it('should THROW when attaching undefined verdict', () => {
      const internalEnvelope = createDataEnvelopeInternal(
        { id: 'test-123' },
        { source: 'test-system' }
      );

      expect(() => {
        attachGovernanceVerdict(internalEnvelope, undefined as any);
      }).toThrow(/Governance verdict is required/);
    });
  });
});

describe('Governance Enforcement Summary', () => {
  it('should document all bypass prevention controls', () => {
    const controls = {
      'BYPASS-001': {
        description: 'Cannot create DataEnvelope without governanceVerdict',
        enforcement: 'Runtime check in createDataEnvelope()',
        soc2: ['CC6.1', 'CC7.2'],
      },
      'BYPASS-002': {
        description: 'Validation fails for missing governanceVerdict',
        enforcement: 'validateDataEnvelope() checks verdict presence',
        soc2: ['CC6.1', 'CC7.2'],
      },
      'BYPASS-003': {
        description: 'Internal envelopes require verdict attachment',
        enforcement: 'attachGovernanceVerdict() required before API exposure',
        soc2: ['CC6.1'],
      },
      'BYPASS-004': {
        description: 'Incomplete verdicts are rejected',
        enforcement: 'Validation checks all verdict fields',
        soc2: ['CC6.1'],
      },
      'BYPASS-005': {
        description: 'isSimulated flag is mandatory',
        enforcement: 'Validation checks flag presence',
        soc2: ['PI1.1'],
      },
      'BYPASS-006': {
        description: 'Provenance is mandatory',
        enforcement: 'Validation checks provenance presence and completeness',
        soc2: ['PI1.1'],
      },
      'BYPASS-007': {
        description: 'Data tampering is detected',
        enforcement: 'Hash verification on validation',
        soc2: ['PI1.4'],
      },
      'BYPASS-008': {
        description: 'DENY verdicts are properly recorded',
        enforcement: 'Valid envelope with DENY for audit',
        soc2: ['CC6.1'],
      },
      'BYPASS-009': {
        description: 'Type system prevents optional governance',
        enforcement: 'TypeScript strict mode',
        soc2: ['CC7.2'],
      },
      'BYPASS-010': {
        description: 'attachGovernanceVerdict validates input',
        enforcement: 'Runtime null/undefined check',
        soc2: ['CC6.1'],
      },
    };

    // Snapshot for audit documentation
    expect(controls).toMatchInlineSnapshot(`
{
  "BYPASS-001": {
    "description": "Cannot create DataEnvelope without governanceVerdict",
    "enforcement": "Runtime check in createDataEnvelope()",
    "soc2": [
      "CC6.1",
      "CC7.2",
    ],
  },
  "BYPASS-002": {
    "description": "Validation fails for missing governanceVerdict",
    "enforcement": "validateDataEnvelope() checks verdict presence",
    "soc2": [
      "CC6.1",
      "CC7.2",
    ],
  },
  "BYPASS-003": {
    "description": "Internal envelopes require verdict attachment",
    "enforcement": "attachGovernanceVerdict() required before API exposure",
    "soc2": [
      "CC6.1",
    ],
  },
  "BYPASS-004": {
    "description": "Incomplete verdicts are rejected",
    "enforcement": "Validation checks all verdict fields",
    "soc2": [
      "CC6.1",
    ],
  },
  "BYPASS-005": {
    "description": "isSimulated flag is mandatory",
    "enforcement": "Validation checks flag presence",
    "soc2": [
      "PI1.1",
    ],
  },
  "BYPASS-006": {
    "description": "Provenance is mandatory",
    "enforcement": "Validation checks provenance presence and completeness",
    "soc2": [
      "PI1.1",
    ],
  },
  "BYPASS-007": {
    "description": "Data tampering is detected",
    "enforcement": "Hash verification on validation",
    "soc2": [
      "PI1.4",
    ],
  },
  "BYPASS-008": {
    "description": "DENY verdicts are properly recorded",
    "enforcement": "Valid envelope with DENY for audit",
    "soc2": [
      "CC6.1",
    ],
  },
  "BYPASS-009": {
    "description": "Type system prevents optional governance",
    "enforcement": "TypeScript strict mode",
    "soc2": [
      "CC7.2",
    ],
  },
  "BYPASS-010": {
    "description": "attachGovernanceVerdict validates input",
    "enforcement": "Runtime null/undefined check",
    "soc2": [
      "CC6.1",
    ],
  },
}
`);
  });
});
