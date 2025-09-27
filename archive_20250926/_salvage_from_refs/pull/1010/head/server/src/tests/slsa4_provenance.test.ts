import { makeProvenance, submitProvenance } from '../supplychain/slsa/InToto';
import fs from 'fs';

describe('SLSA4 provenance', () => {
  const log = 'prov-ledger/log.json';
  beforeEach(() => {
    if (fs.existsSync(log)) fs.unlinkSync(log);
  });

  it('creates provenance with digest', () => {
    const prov = makeProvenance('abc');
    expect(prov.digest).toBe('abc');
  });

  it('anchors digest on submit', () => {
    submitProvenance('abc');
    const data = JSON.parse(fs.readFileSync(log, 'utf-8'));
    expect(data[0].meta.bundleSha).toBe('abc');
  });
});
