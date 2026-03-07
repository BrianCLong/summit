import assert from 'node:assert/strict';
import test from 'node:test';

import { renderReport } from '../src/render.js';

test('renderReport is deterministic and claim-bound', () => {
  const report = renderReport({
    case_id: 'case-1',
    claims: [
      { claim_cid: 'cid-2', evidence_cids: ['e2'], verified: true },
      { claim_cid: 'cid-1', evidence_cids: ['e1'], verified: true },
    ],
    sections: [
      {
        title: 'Z Findings',
        statement_claims: [{ text: 'Statement B', claim_cids: ['cid-2', 'cid-1', 'cid-2'] }],
      },
      {
        title: 'A Findings',
        statement_claims: [{ text: 'Statement A', claim_cids: ['cid-1'] }],
      },
    ],
  });

  assert.deepEqual(report.claims_used, ['cid-1', 'cid-2']);
  assert.deepEqual(report.evidence_cids, ['e1', 'e2']);
  assert.equal(report.sections[0].title, 'A Findings');
  assert.deepEqual(report.sections[1].statements[0].claim_cids, ['cid-1', 'cid-2']);
});

test('renderReport rejects unverified claims by reference', () => {
  assert.throws(
    () =>
      renderReport({
        case_id: 'case-2',
        claims: [{ claim_cid: 'cid-1', evidence_cids: ['e1'], verified: true }],
        sections: [
          {
            title: 'Findings',
            statement_claims: [{ text: 'Statement B', claim_cids: ['cid-9'] }],
          },
        ],
      }),
    /UNVERIFIED_CLAIM_REFERENCED:cid-9/
  );
});

test('renderReport rejects unverified claim inputs', () => {
  assert.throws(
    () =>
      renderReport({
        case_id: 'case-3',
        claims: [{ claim_cid: 'cid-1', evidence_cids: ['e1'], verified: false }],
        sections: [
          {
            title: 'Findings',
            statement_claims: [{ text: 'Statement C', claim_cids: ['cid-1'] }],
          },
        ],
      }),
    /UNVERIFIED_CLAIM_INPUT/
  );
});
