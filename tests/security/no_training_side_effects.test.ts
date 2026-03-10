import test from 'node:test';
import assert from 'node:assert';
import { writeQuarantinedExample, getReviewQueue, CandidateExample } from '../../summit/evaluation/quarantine_training_candidates.js';

test('writeQuarantinedExample appends to review queue without auto-training', async () => {
  const ex: CandidateExample = {
    id: 'e1',
    input: 'test',
    output: 'test output',
    source: 'agent1'
  };

  const initialCount = getReviewQueue().length;
  await writeQuarantinedExample(ex);

  const finalCount = getReviewQueue().length;
  assert.strictEqual(finalCount, initialCount + 1);
  assert.strictEqual(getReviewQueue()[finalCount - 1].id, 'e1');
});
