import { describe, expect, it } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  HaplLedger,
  buildDatasetProvenanceOverlay,
  verifyHaplEntries,
} from '../src/index';

function createKeys() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  return {
    privateKey: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
    publicKey: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
  };
}

function createNowSequence() {
  let counter = 0;
  return () => new Date(Date.UTC(2024, 0, 1, 0, 0, counter++));
}

const testDir = fileURLToPath(new URL('.', import.meta.url));
const packageRoot = join(testDir, '..');

describe('HaplLedger', () => {
  it('detects tampering through signature and hash verification', () => {
    const keys = createKeys();
    const ledger = new HaplLedger({
      privateKey: keys.privateKey,
      publicKey: keys.publicKey,
      now: createNowSequence(),
    });

    ledger.appendLabel({
      datasetId: 'dataset-1',
      itemId: 'item-1',
      labelerId: 'alice',
      label: { sentiment: 'positive' },
      rubricVersion: 'r1',
      toolVersion: 'tool-1',
    });

    const snapshot = ledger.toJSON();
    expect(verifyHaplEntries(snapshot.entries, keys.publicKey).valid).toBe(true);

    snapshot.entries[0].payload.label = { sentiment: 'tampered' };
    const tampered = verifyHaplEntries(snapshot.entries, keys.publicKey);
    expect(tampered.valid).toBe(false);
    expect(tampered.error).toMatch(/hash mismatch|signature mismatch/i);
  });

  it('builds a dataset overlay that preserves full label lineage', () => {
    const keys = createKeys();
    const ledger = new HaplLedger({
      privateKey: keys.privateKey,
      publicKey: keys.publicKey,
      now: createNowSequence(),
    });

    ledger.appendLabel({
      datasetId: 'dataset-1',
      itemId: 'item-1',
      labelerId: 'alice',
      label: { sentiment: 'positive' },
      rubricVersion: 'r1',
      toolVersion: 'tool-1',
      metadata: { note: 'first-pass' },
    });
    ledger.appendPayment({
      datasetId: 'dataset-1',
      itemId: 'item-1',
      payerId: 'ops',
      labelerId: 'alice',
      amount: 5,
      currency: 'USD',
    });
    ledger.appendConflict({
      datasetId: 'dataset-1',
      itemId: 'item-1',
      raisedBy: 'reviewer',
      actors: ['alice'],
      reason: 'disagreement',
      resolution: 'relabel',
    });

    const overlay = buildDatasetProvenanceOverlay(ledger.getEntries());
    expect(overlay.root).toBe(ledger.getRootHash());
    expect(overlay.signerId).toBe(ledger.getSignerId());

    const dataset = overlay.datasets['dataset-1'];
    expect(dataset).toBeDefined();
    const item = dataset.items['item-1'];
    expect(item.labels).toHaveLength(1);
    expect(item.payments).toHaveLength(1);
    expect(item.conflicts).toHaveLength(1);

    expect(item.labels[0]).toMatchObject({
      labelerId: 'alice',
      rubricVersion: 'r1',
      toolVersion: 'tool-1',
      metadata: { note: 'first-pass' },
    });
    expect(item.labels[0].hash).toBeDefined();
    expect(item.payments[0]).toMatchObject({
      payerId: 'ops',
      labelerId: 'alice',
      amount: 5,
      currency: 'USD',
    });
    expect(item.conflicts[0]).toMatchObject({
      raisedBy: 'reviewer',
      actors: ['alice', 'reviewer'],
      reason: 'disagreement',
      resolution: 'relabel',
    });
  });

  it('produces identical ledger roots for identical inputs', () => {
    const keys = createKeys();
    const ledgerA = new HaplLedger({
      privateKey: keys.privateKey,
      publicKey: keys.publicKey,
      now: createNowSequence(),
    });
    const ledgerB = new HaplLedger({
      privateKey: keys.privateKey,
      publicKey: keys.publicKey,
      now: createNowSequence(),
    });

    const appendEvents = (ledger) => {
      ledger.appendLabel({
        datasetId: 'dataset-1',
        itemId: 'item-1',
        labelerId: 'alice',
        label: { sentiment: 'positive' },
        rubricVersion: 'r1',
        toolVersion: 'tool-1',
      });
      ledger.appendPayment({
        datasetId: 'dataset-1',
        itemId: 'item-1',
        payerId: 'ops',
        labelerId: 'alice',
        amount: 5,
        currency: 'USD',
      });
    };

    appendEvents(ledgerA);
    appendEvents(ledgerB);

    expect(ledgerA.getRootHash()).toBe(ledgerB.getRootHash());
    expect(ledgerA.toJSON().entries).toEqual(ledgerB.toJSON().entries);
  });

  it('verifies ledgers via CLI and flags tampering', () => {
    const keys = createKeys();
    const ledger = new HaplLedger({
      privateKey: keys.privateKey,
      publicKey: keys.publicKey,
      now: createNowSequence(),
    });

    ledger.appendLabel({
      datasetId: 'dataset-1',
      itemId: 'item-1',
      labelerId: 'alice',
      label: { sentiment: 'positive' },
      rubricVersion: 'r1',
      toolVersion: 'tool-1',
    });

    const tmpDir = mkdtempSync(join(tmpdir(), 'hapl-ledger-'));
    const ledgerPath = join(tmpDir, 'ledger.json');
    const keyPath = join(tmpDir, 'public.pem');

    writeFileSync(ledgerPath, JSON.stringify(ledger.toJSON(), null, 2));
    writeFileSync(keyPath, keys.publicKey);

    const verify = spawnSync(
      'node',
      ['src/cli/hapl-verify.js', ledgerPath, '--public-key', keyPath, '--overlay'],
      { cwd: packageRoot, encoding: 'utf8' }
    );

    expect(verify.status).toBe(0);
    expect(verify.stdout).toMatch(/Ledger verified/);
    expect(verify.stdout).toMatch(/"datasets"/);

    const tampered = ledger.toJSON();
    tampered.entries[0].payload.label = { sentiment: 'tampered' };
    writeFileSync(ledgerPath, JSON.stringify(tampered, null, 2));

    const failed = spawnSync(
      'node',
      ['src/cli/hapl-verify.js', ledgerPath, '--public-key', keyPath],
      { cwd: packageRoot, encoding: 'utf8' }
    );

    expect(failed.status).toBe(1);
    expect(failed.stderr).toMatch(/Ledger verification failed/);
  });
});
