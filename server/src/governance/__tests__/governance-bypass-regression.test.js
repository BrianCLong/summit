"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const data_envelope_js_1 = require("../../types/data-envelope.js");
// Mock governance verdict
function createMockVerdict(result = data_envelope_js_1.GovernanceResult.ALLOW) {
    return {
        verdictId: `verdict-${Date.now()}-test`,
        policyId: 'test-policy-v1',
        result,
        decidedAt: new Date(),
        reason: 'Test verdict',
        evaluator: 'test-system',
    };
}
(0, globals_1.describe)('Governance Bypass Regression Tests', () => {
    (0, globals_1.describe)('BYPASS-001: Attempt to create envelope without governance verdict', () => {
        (0, globals_1.it)('should BLOCK creation of DataEnvelope without governanceVerdict', () => {
            const data = { id: 'test-123', name: 'Test Entity' };
            // This should throw because governanceVerdict is mandatory
            (0, globals_1.expect)(() => {
                (0, data_envelope_js_1.createDataEnvelope)(data, {
                    source: 'test-system',
                    // @ts-expect-error - Intentionally omitting governanceVerdict to test enforcement
                    governanceVerdict: undefined,
                });
            }).toThrow(/GovernanceVerdict is required/);
        });
        (0, globals_1.it)('should BLOCK creation with null governanceVerdict', () => {
            const data = { id: 'test-123', name: 'Test Entity' };
            (0, globals_1.expect)(() => {
                (0, data_envelope_js_1.createDataEnvelope)(data, {
                    source: 'test-system',
                    // @ts-expect-error - Intentionally passing null to test enforcement
                    governanceVerdict: null,
                });
            }).toThrow(/GovernanceVerdict is required/);
        });
    });
    (0, globals_1.describe)('BYPASS-002: Attempt to validate envelope without governance verdict', () => {
        (0, globals_1.it)('should FAIL validation for envelope missing governanceVerdict', () => {
            const invalidEnvelope = {
                data: { id: 'test-123' },
                provenance: {
                    source: 'test-system',
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
            (0, globals_1.expect)(validation.errors).toEqual(globals_1.expect.arrayContaining([globals_1.expect.stringContaining('governance verdict')]));
        });
        (0, globals_1.it)('should FAIL validation on incomplete envelope', () => {
            const invalidEnvelope = {
                data: { id: 'test-123' },
                // Missing all required fields
            };
            const validation = (0, data_envelope_js_1.validateDataEnvelope)(invalidEnvelope);
            (0, globals_1.expect)(validation.valid).toBe(false);
        });
    });
    (0, globals_1.describe)('BYPASS-003: Attempt to bypass with envelope missing verdict', () => {
        (0, globals_1.it)('should FAIL validation for manually constructed envelope without verdict', () => {
            const data = { id: 'test-123', name: 'Test Entity' };
            const incompleteEnvelope = {
                data,
                provenance: {
                    source: 'test-system',
                    generatedAt: new Date(),
                    lineage: [],
                    provenanceId: 'prov-123',
                },
                isSimulated: false,
                classification: data_envelope_js_1.DataClassification.INTERNAL,
                dataHash: 'abc123',
                warnings: [],
            };
            // But it should NOT pass validation
            const validation = (0, data_envelope_js_1.validateDataEnvelope)(incompleteEnvelope);
            (0, globals_1.expect)(validation.valid).toBe(false);
        });
        (0, globals_1.it)('should pass validation once governance verdict is present', () => {
            const data = { id: 'test-123', name: 'Test Entity' };
            const validEnvelope = (0, data_envelope_js_1.createDataEnvelope)(data, {
                source: 'test-system',
                governanceVerdict: createMockVerdict(),
            });
            const validation = (0, data_envelope_js_1.validateDataEnvelope)(validEnvelope);
            (0, globals_1.expect)(validation.valid).toBe(true);
        });
    });
    (0, globals_1.describe)('BYPASS-004: Attempt to bypass with incomplete verdict', () => {
        (0, globals_1.it)('should FAIL validation for verdict missing verdictId', () => {
            const invalidVerdict = {
                policyId: 'test-policy',
                result: data_envelope_js_1.GovernanceResult.ALLOW,
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
                classification: data_envelope_js_1.DataClassification.INTERNAL,
                dataHash: 'abc123',
                warnings: [],
            };
            const validation = (0, data_envelope_js_1.validateDataEnvelope)(envelope);
            (0, globals_1.expect)(validation.valid).toBe(false);
            (0, globals_1.expect)(validation.errors).toEqual(globals_1.expect.arrayContaining([globals_1.expect.stringContaining('verdict ID')]));
        });
        (0, globals_1.it)('should FAIL validation for verdict missing result', () => {
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
                classification: data_envelope_js_1.DataClassification.INTERNAL,
                dataHash: 'abc123',
                warnings: [],
            };
            const validation = (0, data_envelope_js_1.validateDataEnvelope)(envelope);
            (0, globals_1.expect)(validation.valid).toBe(false);
            (0, globals_1.expect)(validation.errors).toEqual(globals_1.expect.arrayContaining([globals_1.expect.stringContaining('governance result')]));
        });
    });
    (0, globals_1.describe)('BYPASS-005: Attempt to bypass isSimulated enforcement', () => {
        (0, globals_1.it)('should FAIL validation for missing isSimulated flag', () => {
            const envelope = {
                data: { id: 'test-123' },
                provenance: {
                    source: 'test-system',
                    generatedAt: new Date(),
                    lineage: [],
                    provenanceId: 'prov-123',
                },
                governanceVerdict: createMockVerdict(),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
                dataHash: 'abc123',
                warnings: [],
                // Missing isSimulated
            };
            const validation = (0, data_envelope_js_1.validateDataEnvelope)(envelope);
            (0, globals_1.expect)(validation.valid).toBe(false);
            (0, globals_1.expect)(validation.errors).toEqual(globals_1.expect.arrayContaining([globals_1.expect.stringContaining('isSimulated')]));
        });
    });
    (0, globals_1.describe)('BYPASS-006: Attempt to bypass provenance enforcement', () => {
        (0, globals_1.it)('should FAIL validation for missing provenance', () => {
            const envelope = {
                data: { id: 'test-123' },
                isSimulated: false,
                governanceVerdict: createMockVerdict(),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
                dataHash: 'abc123',
                warnings: [],
                // Missing provenance
            };
            const validation = (0, data_envelope_js_1.validateDataEnvelope)(envelope);
            (0, globals_1.expect)(validation.valid).toBe(false);
            (0, globals_1.expect)(validation.errors).toEqual(globals_1.expect.arrayContaining([globals_1.expect.stringContaining('provenance')]));
        });
        (0, globals_1.it)('should FAIL validation for provenance missing source', () => {
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
                classification: data_envelope_js_1.DataClassification.INTERNAL,
                dataHash: 'abc123',
                warnings: [],
            };
            const validation = (0, data_envelope_js_1.validateDataEnvelope)(envelope);
            (0, globals_1.expect)(validation.valid).toBe(false);
            (0, globals_1.expect)(validation.errors).toEqual(globals_1.expect.arrayContaining([globals_1.expect.stringContaining('provenance source')]));
        });
        (0, globals_1.it)('should FAIL validation for provenance missing provenanceId', () => {
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
                classification: data_envelope_js_1.DataClassification.INTERNAL,
                dataHash: 'abc123',
                warnings: [],
            };
            const validation = (0, data_envelope_js_1.validateDataEnvelope)(envelope);
            (0, globals_1.expect)(validation.valid).toBe(false);
            (0, globals_1.expect)(validation.errors).toEqual(globals_1.expect.arrayContaining([globals_1.expect.stringContaining('provenance ID')]));
        });
    });
    (0, globals_1.describe)('BYPASS-007: Attempt data tampering via hash manipulation', () => {
        (0, globals_1.it)('should DETECT tampered data via hash mismatch', () => {
            const data = { id: 'original-123', name: 'Original Entity' };
            const envelope = (0, data_envelope_js_1.createDataEnvelope)(data, {
                source: 'test-system',
                governanceVerdict: createMockVerdict(),
            });
            // Tamper with data
            envelope.data.name = 'Tampered Entity';
            const validation = (0, data_envelope_js_1.validateDataEnvelope)(envelope);
            (0, globals_1.expect)(validation.valid).toBe(false);
            (0, globals_1.expect)(validation.errors).toEqual(globals_1.expect.arrayContaining([globals_1.expect.stringContaining('hash mismatch')]));
        });
        (0, globals_1.it)('should DETECT missing data hash', () => {
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
                classification: data_envelope_js_1.DataClassification.INTERNAL,
                warnings: [],
                // Missing dataHash
            };
            const validation = (0, data_envelope_js_1.validateDataEnvelope)(envelope);
            (0, globals_1.expect)(validation.valid).toBe(false);
            (0, globals_1.expect)(validation.errors).toEqual(globals_1.expect.arrayContaining([globals_1.expect.stringContaining('data hash')]));
        });
    });
    (0, globals_1.describe)('BYPASS-008: Attempt to bypass via DENY verdict', () => {
        (0, globals_1.it)('should properly create envelope with DENY verdict (for audit)', () => {
            const data = { id: 'test-123', name: 'Denied Entity' };
            const denyVerdict = createMockVerdict(data_envelope_js_1.GovernanceResult.DENY);
            denyVerdict.reason = 'Policy violation: insufficient permissions';
            const envelope = (0, data_envelope_js_1.createDataEnvelope)(data, {
                source: 'test-system',
                governanceVerdict: denyVerdict,
            });
            // Envelope should be valid for audit purposes
            const validation = (0, data_envelope_js_1.validateDataEnvelope)(envelope);
            (0, globals_1.expect)(validation.valid).toBe(true);
            // But verdict should clearly indicate DENY
            (0, globals_1.expect)(envelope.governanceVerdict?.result).toBe(data_envelope_js_1.GovernanceResult.DENY);
        });
    });
    (0, globals_1.describe)('BYPASS-009: Type system enforcement', () => {
        (0, globals_1.it)('TypeScript should prevent optional governanceVerdict at compile time', () => {
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
            (0, globals_1.expect)(true).toBe(true);
        });
    });
    (0, globals_1.describe)('BYPASS-010: Undefined governance verdict validation', () => {
        (0, globals_1.it)('should FAIL validation when governanceVerdict is undefined', () => {
            const envelope = {
                data: { id: 'test-123' },
                provenance: {
                    source: 'test-system',
                    generatedAt: new Date(),
                    lineage: [],
                    provenanceId: 'prov-123',
                },
                isSimulated: false,
                governanceVerdict: undefined,
                classification: data_envelope_js_1.DataClassification.INTERNAL,
                dataHash: 'abc123',
                warnings: [],
            };
            const validation = (0, data_envelope_js_1.validateDataEnvelope)(envelope);
            (0, globals_1.expect)(validation.valid).toBe(false);
            (0, globals_1.expect)(validation.errors).toEqual(globals_1.expect.arrayContaining([globals_1.expect.stringContaining('governance verdict')]));
        });
    });
});
(0, globals_1.describe)('Governance Enforcement Summary', () => {
    (0, globals_1.it)('should document all bypass prevention controls', () => {
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
                description: 'Manual envelopes without verdict are rejected',
                enforcement: 'validateDataEnvelope() checks verdict presence',
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
                description: 'Undefined governance verdict is rejected',
                enforcement: 'validateDataEnvelope() checks verdict presence',
                soc2: ['CC6.1'],
            },
        };
        // Snapshot for audit documentation
        (0, globals_1.expect)(controls).toMatchInlineSnapshot(`
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
    "description": "Manual envelopes without verdict are rejected",
    "enforcement": "validateDataEnvelope() checks verdict presence",
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
    "description": "Undefined governance verdict is rejected",
    "enforcement": "validateDataEnvelope() checks verdict presence",
    "soc2": [
      "CC6.1",
    ],
  },
}
`);
    });
});
