import assert from 'node:assert/strict';
import test from 'node:test';

import { renderReport } from '../src/render.js';
import { validateReport } from '../src/validate.js';

test('validateReport accepts rendered reports', () => {
  const report = renderReport({
    case_id: 'case-validated',
    claims: [{ claim_cid: 'cid-1', evidence_cids: ['e1'], verified: true }],
    sections: [{ title: 'Findings', statement_claims: [{ text: 'A', claim_cids: ['cid-1'] }] }],
  });

  assert.deepEqual(validateReport(report), { valid: true });
});

test('validateReport rejects malformed reports with readable errors', () => {
  const invalidReport = {
    schema_version: '1',
    case_id: 'broken',
    claims_used: ['cid-1'],
    evidence_cids: ['e1'],
    sections: [{ title: 'Bad', statements: [{ text: 'Missing claim references' }] }],
  };

  const result = validateReport(invalidReport);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('claim_cids')));
});
