import { describe, it, expect, vi } from 'vitest';
import { TruthScanOracle } from '../../src/connectors/cis/plugins/truthscan/mapper';

// Mock the client
vi.mock('../../src/connectors/cis/plugins/truthscan/client', () => {
  return {
    TruthScanClient: vi.fn(function() {
      return {
        scan: vi.fn().mockResolvedValue({
          id: "ts-fixture-123",
          timestamp: "2023-10-27T10:00:00Z",
          modality: "text",
          results: {
            ai_generated_score: 0.98,
            manipulated_score: 0.05,
            spoof_score: 0.01
          },
          confidence: 0.99,
          model_version: "ts-v4-enterprise"
        })
      };
    })
  };
});

describe('TruthScanOracle', () => {
  it('should map API response to IntegritySignal', async () => {
    const oracle = new TruthScanOracle('mock-key');
    const result = await oracle.analyze('artifact-123', 'suspicious text content');

    expect(result).toEqual({
      artifact_id: 'artifact-123',
      artifact_hash: 'hash-placeholder',
      modality: 'text',
      scores: {
        ai_generated: 0.98,
        manipulated: 0.05,
        spoof: 0.01
      },
      confidence: 0.99,
      provider: 'TruthScan',
      model_id: 'ts-v4-enterprise',
      evidence_ids: ['ts-fixture-123']
    });
  });
});
