import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AppendOnlyLedger } from '../src/ledger.js';
import { ComplianceEvaluator } from '../src/evaluator.js';

class FakeOpa {
  async evaluate(_input: any) {
    return {
      result: {
        allow: true,
        decision: {
          control_id: 'sec-AUTHZ-001',
          result: 'PASS',
          reasons: ['ok']
        }
      }
    };
  }
}

test('evaluator writes PASS attestation on allow', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-'));
  const file = path.join(dir, 'attest.ndjson');
  const ledger = new AppendOnlyLedger(file);

  const evaluator = new ComplianceEvaluator(new FakeOpa() as any, ledger);

  const evidence = {
    spec: 'summit.evidence.authz.v1',
    control_id: 'sec-AUTHZ-001',
    event_type: 'authz.decision',
    occurred_at: '2025-12-26T00:00:00Z',
    decision: 'allow',
    actor: { id: 'u1' },
    resource: { id: 'r1' }
  };

  const att = await evaluator.handleEvidence(
    evidence as any,
    '2025-12-26T00:00:00Z'
  );
  expect(att.result).toBe('PASS');
  expect(att.control_id).toBe('sec-AUTHZ-001');
});
