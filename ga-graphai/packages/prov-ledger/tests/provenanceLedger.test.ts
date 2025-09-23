import { describe, expect, it } from 'vitest';

import {
  ProvenanceLedger,
  createProvenanceRecord,
  hashPayload,
  signRecord,
  verifySignature,
} from '../src/index.js';

const policy = {
  purpose: 'engineering',
  retention: 'standard-365d',
  licenseClass: 'MIT-OK',
  pii: false,
};

describe('provenance ledger', () => {
  it('hashes payloads deterministically', () => {
    const payload = { a: 1, b: ['x', 'y'] };
    expect(hashPayload(payload)).toEqual(hashPayload(payload));
    expect(hashPayload(payload)).not.toEqual(hashPayload({ a: 1 }));
  });

  it('creates signed records that can be verified', () => {
    const record = createProvenanceRecord({
      reqId: 'req-1',
      step: 'router',
      input: { foo: 'bar' },
      output: { ok: true },
      modelId: 'router-v1',
      ckpt: '1',
      prompt: 'route this task',
      params: { temp: 0.1 },
      policy,
    });
    const secret = 'test-secret';
    const signed = signRecord(record, secret);
    expect(verifySignature(signed, secret)).toBe(true);
    expect(verifySignature(signed, 'wrong')).toBe(false);
  });

  it('appends records to the ledger and verifies them', () => {
    const ledger = new ProvenanceLedger('ledger-secret');
    ledger.append({
      reqId: 'req-2',
      step: 'generator',
      input: { goal: 'test' },
      output: { result: 'ok' },
      modelId: 'gen',
      ckpt: '2',
      prompt: 'do it',
      params: { temp: 0.2 },
      policy,
    });
    ledger.append({
      reqId: 'req-2',
      step: 'critic',
      input: { artifact: 'ok' },
      output: { issues: [] },
      modelId: 'critic',
      ckpt: '2',
      prompt: 'critique',
      params: { temp: 0 },
      policy,
    });

    expect(ledger.list('req-2')).toHaveLength(2);
    expect(ledger.verifyAll('ledger-secret')).toBe(true);
  });
});
