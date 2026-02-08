import { EvidenceLedger } from '../ledger';
import * as fs from 'fs';
import * as path from 'path';

const TEST_LEDGER_FILE = 'test_ledger.json';

describe('EvidenceLedger', () => {
  let ledger: EvidenceLedger;

  beforeEach(() => {
    if (fs.existsSync(TEST_LEDGER_FILE)) {
      fs.unlinkSync(TEST_LEDGER_FILE);
    }
    ledger = new EvidenceLedger(TEST_LEDGER_FILE);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_LEDGER_FILE)) {
      fs.unlinkSync(TEST_LEDGER_FILE);
    }
  });

  it('should initialize empty', () => {
    const entry = ledger.getEntry(0);
    expect(entry).toBeUndefined();
  });

  it('should append entry and generate hash', () => {
    const data = { foo: 'bar' };
    const entry = ledger.append(data);

    expect(entry).toBeDefined();
    expect(entry.index).toBe(0);
    expect(entry.data).toEqual(data);
    expect(entry.previousHash).toBe('0000000000000000000000000000000000000000000000000000000000000000');
    expect(entry.hash).toBeDefined();
    expect(entry.hash.length).toBe(64); // SHA-256 hex
  });

  it('should chain hashes correctly', () => {
    const data1 = { id: 1 };
    const entry1 = ledger.append(data1);

    const data2 = { id: 2 };
    const entry2 = ledger.append(data2);

    expect(entry2.previousHash).toBe(entry1.hash);
    expect(ledger.verifyIntegrity()).toBe(true);
  });

  it('should persist data', () => {
    const data = { persisted: true };
    ledger.append(data);

    const newLedger = new EvidenceLedger(TEST_LEDGER_FILE);
    const entry = newLedger.getEntry(0);
    expect(entry).toBeDefined();
    expect(entry?.data).toEqual(data);
  });

  // Simple tampering test (would fail in real world if file modified, here we verify the logic detects it if loaded)
  it('should detect tampering if content changed (simulated)', () => {
    ledger.append({ a: 1 });
    // Manually corrupt file
    const content = JSON.parse(fs.readFileSync(TEST_LEDGER_FILE, 'utf-8'));
    content[0].data.a = 2; // Modify data but keep hash same
    fs.writeFileSync(TEST_LEDGER_FILE, JSON.stringify(content));

    const corruptedLedger = new EvidenceLedger(TEST_LEDGER_FILE);
    expect(corruptedLedger.verifyIntegrity()).toBe(false);
  });
});
