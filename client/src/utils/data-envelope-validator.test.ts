
import { describe, it, expect } from 'vitest';
import { validateDataEnvelope, DataEnvelope, DataClassification } from './data-envelope-validator';

describe('validateDataEnvelope - Compatibility', () => {
  const baseEnvelope: DataEnvelope = {
    data: { id: 1 },
    provenance: {
      source: 'test',
      generatedAt: new Date().toISOString(),
      provenanceId: '123',
      lineage: []
    },
    isSimulated: false,
    classification: DataClassification.PUBLIC,
    dataHash: '0000000000000000000000000000000000000000000000000000000000000000', // 64 chars
    warnings: []
  };

  it('should accept an envelope with a populated governanceVerdict', () => {
    const envelopeWithVerdict = {
      ...baseEnvelope,
      governanceVerdict: {
        action: 'ALLOW',
        reasons: [],
        policyIds: ['runtime-governance-v1'],
        metadata: {
          timestamp: new Date().toISOString(),
          evaluator: 'runtime-governance-middleware',
          simulation: true
        }
      }
    };

    const result = validateDataEnvelope(envelopeWithVerdict, { verifyHash: false });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should accept an envelope without governanceVerdict', () => {
     const result = validateDataEnvelope(baseEnvelope, { verifyHash: false });
     expect(result.valid).toBe(true);
  });
});
