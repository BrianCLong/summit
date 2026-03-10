import test from 'node:test';
import assert from 'node:assert';
import { critiqueCandidates, Candidate } from '../../summit/reasoning/debate_critic.js';

test('critiqueCandidates performs critique but disables auto-adoption', async () => {
  const candidates: Candidate[] = [
    { id: 'c1', response: 'Candidate A' },
    { id: 'c2', response: 'Candidate B' }
  ];

  const report = await critiqueCandidates(candidates);

  assert.strictEqual(report.autoAdopt, false);
  assert.strictEqual(report.winnerId, 'c1');
  assert.strictEqual(report.critiques.length, 2);
});
