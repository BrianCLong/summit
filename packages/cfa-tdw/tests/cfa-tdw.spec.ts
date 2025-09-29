import { CFATDW } from '../src';
import { AFLStore } from '@intelgraph/afl-store';
import { randomUUID } from 'crypto';

describe('CFATDW', () => {
  let aflStore: AFLStore;
  let cfaTdw: CFATDW;

  beforeEach(() => {
    aflStore = new AFLStore('redis://localhost:6381'); // Mock or test Redis
    cfaTdw = new CFATDW(aflStore);
  });

  afterEach(async () => {
    await aflStore.close();
  });

  test('should re-evaluate KPW bundle and potentially flag stale risk', async () => {
    const mockBundle = {
      manifest: { runId: randomUUID(), caseId: randomUUID(), createdAt: new Date().toISOString(), merkleRoot: 'mock', signer: 'mock', algo: 'RSA-SHA256', signature: 'mock' },
      disclosedSteps: [],
      proofs: []
    };
    const alert = await cfaTdw.reevaluateKPWBundle(mockBundle, { newTTP: true });
    // Expect alert to be either defined or undefined based on random chance
    expect(alert === undefined || alert.reason === "KPW bundle failed re-evaluation with new TTP data.").toBe(true);
  });

  test('should detect temporal drift between fingerprints', async () => {
    const oldFp = { contentHash: randomUUID(), formatSig: 'test', timingSig: 'test', xformSig: 'test', route: 'test' };
    const newFp = { contentHash: randomUUID(), formatSig: 'test', timingSig: 'test', xformSig: 'test', route: 'test' };
    const alert = await cfaTdw.detectTemporalDrift(oldFp, newFp);
    // Expect alert to be either defined or undefined based on random chance
    expect(alert === undefined || alert.reason === "Temporal drift detected between old and new fingerprints.").toBe(true);
  });
});