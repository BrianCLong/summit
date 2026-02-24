import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CapsuleLedger, ActionReceipt } from '../src/lib/switchboard-ledger.js';
import { computeDigest } from '@summit/receipts';

describe('Switchboard Action Receipts', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'switchboard-receipts-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('records action receipts in ledger', () => {
    const ledger = new CapsuleLedger(tempDir, 'session-1');
    ledger.recordAction({
      toolId: 'ls',
      capability: 'exec',
      inputDigest: 'input-hash',
      outputDigest: 'output-hash',
      status: 'success',
      metadata: { args: ['-la'] }
    });

    const entries = fs.readFileSync(path.join(tempDir, 'ledger.jsonl'), 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line));

    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe('action_receipt');
    const receipt = entries[0].data as ActionReceipt;
    expect(receipt.tool_id).toBe('ls');
    expect(receipt.input_digest).toBe('input-hash');
    expect(receipt.hash).toBeDefined();
  });

  it('computes consistent digests for strings', () => {
    const d1 = computeDigest('hello');
    const d2 = computeDigest('hello');
    expect(d1).toBe(d2);
  });
});
