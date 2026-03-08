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
        title: 'Findings',
        statement_claims: [{ text: 'Statement A', claim_cids: ['cid-2', 'cid-1'] }],
      },
    ],
  });

  assert.deepEqual(report.claims_used, ['cid-1', 'cid-2']);
  assert.deepEqual(report.evidence_cids, ['e1', 'e2']);
  assert.deepEqual(report.sections[0].statements[0].claim_cids, ['cid-1', 'cid-2']);
});

test('renderReport rejects unverified claims', () => {
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
