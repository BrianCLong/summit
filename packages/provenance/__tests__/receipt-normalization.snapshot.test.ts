import { readFileSync } from 'fs';
import path from 'path';
import { canonicalizeReceiptPayload } from '../src/index.js';
import { buildSampleReceipt } from '../../../test/fixtures/golden/samples.js';

const fixturePath = path.resolve(
  __dirname,
  '../../../test/fixtures/golden/receipt_v0_1.json',
);

describe('receipt ingestion normalization', () => {
  it('produces canonicalized receipts matching the golden fixture', () => {
    const receipt = buildSampleReceipt();
    const canonical = canonicalizeReceiptPayload(receipt);
    const fixture = readFileSync(fixturePath, 'utf-8').trim();

    expect(canonical).toBe(fixture);
  });

  it('detects structural changes that would alter the canonical payload', () => {
    const receipt = buildSampleReceipt();
    receipt.metadata = { ...receipt.metadata, priority: 6 };

    const canonical = canonicalizeReceiptPayload(receipt);
    const fixture = readFileSync(fixturePath, 'utf-8').trim();

    expect(canonical).not.toBe(fixture);
  });
});
