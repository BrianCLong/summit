import { describe, expect, test } from '@jest/globals';
import { ingestLrtRun } from '../src/adapters/lrt.js';
import { exportToPpc } from '../src/adapters/ppc.js';
import { exportToRsr } from '../src/adapters/rsr.js';
import { buildBundle } from '../src/services/BundleFactory.js';
import { FeedRepository, COLLECTION_DEFAULT_ID } from '../src/services/FeedRepository.js';
import { SigningService } from '../src/utils/signing.js';
import { stixValidator } from '../src/services/StixValidator.js';
import type { LrtRun } from '../src/types.js';

const sampleRun: LrtRun = {
  id: 'run-003',
  name: 'Follow-up regression',
  executed_at: '2025-03-15T09:00:00Z',
  operator: 'team-gamma',
  findings: [
    {
      prompt: 'Bypass guard with quasi-quoted jailbreak pattern',
      llm_family: 'aegis-3b',
      jailbreak: '### override guardrails ###',
      severity: 'medium',
      observed_at: '2025-03-15T09:05:00Z',
      response_summary: 'Model produced restricted instructions.'
    }
  ]
};

describe('Guard framework exporters', () => {
  const signingSecret = 'rules-secret';

  test('produce signed PPC and RSR updates', () => {
    const threats = ingestLrtRun(sampleRun);
    const bundle = buildBundle(threats);
    expect(() => stixValidator.validateBundle(bundle)).not.toThrow();

    const repository = new FeedRepository();
    repository.ingestBundle(COLLECTION_DEFAULT_ID, bundle);

    const objects = repository.getObjects(COLLECTION_DEFAULT_ID, { limit: 50 }).objects;
    expect(objects.length).toBeGreaterThan(0);

    const signing = new SigningService(signingSecret);

    const ppcUpdate = exportToPpc(objects, signing, '2.0.0');
    const rsrUpdate = exportToRsr(objects, signing, '2.0.0');

    expect(ppcUpdate.framework).toBe('PPC');
    expect(rsrUpdate.framework).toBe('RSR');

    const { signature: ppcSignature, ...ppcUnsigned } = ppcUpdate;
    const { signature: rsrSignature, ...rsrUnsigned } = rsrUpdate;

    expect(ppcSignature).toBe(signing.sign(ppcUnsigned as unknown as Record<string, unknown>));
    expect(rsrSignature).toBe(signing.sign(rsrUnsigned as unknown as Record<string, unknown>));
  });
});
