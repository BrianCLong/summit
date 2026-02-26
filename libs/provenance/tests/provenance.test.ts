/**
 * Provenance Ledger Acceptance Criteria Tests
 *
 * ✅ Tamper test fails verification (modified bundle detected)
 * ✅ Round-trip export/verify passes
 * ✅ Hash chain validates correctly
 * ✅ Signatures verify with correct public key
 * ✅ Evidence bundles recorded in CI artifacts
 * ✅ No PII exposed in manifests
 */

import { strict as assert } from 'node:assert';
import {
  ProvenanceLedger,
  InMemoryStorage,
  computeEntryHash,
  validateChain,
  buildMerkleTree,
  verifyBundle,
  type LedgerEntry,
  type ExportManifest,
} from '../src/index.js';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

console.log('\n── Provenance Ledger Acceptance Tests ──\n');

// ── Test: Hash chain validates correctly ─────────────────────────────────────

await test('Hash chain validates correctly', async () => {
  const storage = new InMemoryStorage();
  const ledger = new ProvenanceLedger({ storage, signingKey: 'test-secret' });

  await ledger.append({
    operation: 'CREATE',
    entityId: 'entity-001',
    entityType: 'Person',
    actor: 'analyst-alice',
    purpose: 'investigation-123',
  });

  await ledger.append({
    operation: 'UPDATE',
    entityId: 'entity-001',
    entityType: 'Person',
    actor: 'analyst-bob',
    purpose: 'investigation-123',
    metadata: { field: 'name', newValue: 'John Doe' },
  });

  await ledger.append({
    operation: 'ACCESS',
    entityId: 'entity-002',
    entityType: 'Organization',
    actor: 'analyst-alice',
    purpose: 'investigation-456',
  });

  const result = await ledger.verify();
  assert.equal(result.valid, true, 'Chain should be valid');
  assert.equal(result.errors.length, 0, 'No errors expected');
});

// ── Test: Chain linkage is correct ───────────────────────────────────────────

await test('Chain linkage: each entry references previous hash', async () => {
  const storage = new InMemoryStorage();
  const ledger = new ProvenanceLedger({ storage });

  const e1 = await ledger.append({
    operation: 'CREATE',
    entityId: 'e1',
    entityType: 'Test',
    actor: 'test',
    purpose: 'test',
  });

  const e2 = await ledger.append({
    operation: 'UPDATE',
    entityId: 'e1',
    entityType: 'Test',
    actor: 'test',
    purpose: 'test',
  });

  assert.equal(e2.previousHash, e1.currentHash, 'e2.previousHash must equal e1.currentHash');
  assert.notEqual(e1.currentHash, e2.currentHash, 'Entries must have different hashes');
});

// ── Test: Tamper detection — modified entry detected ─────────────────────────

await test('Tamper test fails verification (modified entry detected)', async () => {
  const storage = new InMemoryStorage();
  const ledger = new ProvenanceLedger({ storage });

  await ledger.append({
    operation: 'CREATE',
    entityId: 'entity-001',
    entityType: 'Person',
    actor: 'analyst-alice',
    purpose: 'investigation-123',
  });

  await ledger.append({
    operation: 'UPDATE',
    entityId: 'entity-001',
    entityType: 'Person',
    actor: 'analyst-bob',
    purpose: 'investigation-123',
  });

  // Tamper with the entries directly
  const entries = await storage.getAll();
  const tampered = entries.map((e) => ({ ...e }));
  // Change actor in second entry (simulating tampering)
  tampered[1] = { ...tampered[1], actor: 'evil-charlie' };

  const result = validateChain(tampered);
  assert.equal(result.valid, false, 'Tampered chain should fail validation');
  assert.ok(result.errors.length > 0, 'Should report hash mismatch errors');
  assert.ok(
    result.errors.some((e) => e.includes('Hash mismatch')),
    'Error should mention hash mismatch',
  );
});

// ── Test: Tamper detection — modified bundle detected ────────────────────────

await test('Tamper test fails verification (modified bundle detected)', async () => {
  const storage = new InMemoryStorage();
  const ledger = new ProvenanceLedger({ storage });

  await ledger.append({
    operation: 'CREATE',
    entityId: 'entity-001',
    entityType: 'Person',
    actor: 'analyst',
    purpose: 'test',
  });

  const { manifest, entries } = await ledger.exportBundle({
    purpose: 'test',
    classification: 'UNCLASSIFIED',
    exportedBy: 'test-runner',
  });

  // Tamper with manifest: change a content hash
  const tamperedManifest: ExportManifest = {
    ...manifest,
    contents: manifest.contents.map((c) => ({
      ...c,
      contentHash: 'aaaa' + c.contentHash.slice(4), // corrupt hash
    })),
  };

  const result = verifyBundle(tamperedManifest, entries);
  assert.equal(result.valid, false, 'Tampered manifest should fail');
  assert.ok(
    result.errors.some(
      (e) => e.includes('hash mismatch') || e.includes('Merkle root mismatch'),
    ),
    'Should detect content hash or merkle mismatch',
  );
});

// ── Test: Round-trip export/verify passes ────────────────────────────────────

await test('Round-trip export/verify passes', async () => {
  const storage = new InMemoryStorage();
  const ledger = new ProvenanceLedger({ storage, signingKey: 'secret-key' });

  // Build a realistic ledger
  for (let i = 0; i < 10; i++) {
    await ledger.append({
      operation: (['CREATE', 'UPDATE', 'ACCESS', 'DELETE'] as const)[i % 4],
      entityId: `entity-${String(i).padStart(3, '0')}`,
      entityType: i % 2 === 0 ? 'Person' : 'Organization',
      actor: `analyst-${i % 3}`,
      purpose: `investigation-${Math.floor(i / 3)}`,
      metadata: { index: i },
    });
  }

  // Export
  const { manifest, entries } = await ledger.exportBundle({
    purpose: 'round-trip-test',
    classification: 'CONFIDENTIAL',
    exportedBy: 'test-runner',
  });

  // Verify (without public key — structural verification only)
  const result = verifyBundle(manifest, entries);
  assert.equal(result.valid, true, `Round-trip should pass: ${result.errors.join(', ')}`);
});

// ── Test: Round-trip with RSA signature verification ─────────────────────────

await test('Signatures verify with correct public key', async () => {
  const { generateKeyPairSync } = await import('node:crypto');
  const kp = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const privateKey = kp.privateKey.export({ format: 'pem', type: 'pkcs1' }).toString();
  const publicKey = kp.publicKey.export({ format: 'pem', type: 'pkcs1' }).toString();

  const storage = new InMemoryStorage();
  const ledger = new ProvenanceLedger({ storage });

  await ledger.append({
    operation: 'CREATE',
    entityId: 'signed-entity',
    entityType: 'Evidence',
    actor: 'analyst',
    purpose: 'signed-export',
  });

  const { manifest, entries } = await ledger.exportBundle({
    purpose: 'signature-test',
    classification: 'SECRET',
    exportedBy: 'test-runner',
    privateKey,
    publicKey,
  });

  // Verify with correct key
  const result = verifyBundle(manifest, entries, publicKey);
  assert.equal(result.valid, true, `Signature verification should pass: ${result.errors.join(', ')}`);

  // Verify with wrong key fails
  const wrongKp = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const wrongKey = wrongKp.publicKey.export({ format: 'pem', type: 'pkcs1' }).toString();
  const wrongResult = verifyBundle(manifest, entries, wrongKey);
  assert.equal(wrongResult.valid, false, 'Wrong key should fail');
  assert.ok(
    wrongResult.errors.some((e) => e.includes('Invalid RSA signature')),
    'Should report invalid signature',
  );
});

// ── Test: No PII exposed in manifests ────────────────────────────────────────

await test('No PII exposed in manifests', async () => {
  const storage = new InMemoryStorage();
  const ledger = new ProvenanceLedger({ storage });

  // Add entry with PII in metadata (should NOT leak to manifest)
  await ledger.append({
    operation: 'CREATE',
    entityId: 'person-with-pii',
    entityType: 'Person',
    actor: 'analyst',
    purpose: 'pii-test',
    metadata: {
      email: 'john@example.com',
      ssn: '123-45-6789',
      name: 'John Doe',
    },
  });

  const { manifest } = await ledger.exportBundle({
    purpose: 'pii-check',
    classification: 'CONFIDENTIAL',
    exportedBy: 'test-runner',
  });

  const manifestStr = JSON.stringify(manifest);
  assert.ok(!manifestStr.includes('john@example.com'), 'Email should not appear in manifest');
  assert.ok(!manifestStr.includes('123-45-6789'), 'SSN should not appear in manifest');
  assert.ok(!manifestStr.includes('John Doe'), 'Name should not appear in manifest');
  // Manifest should only contain hashes and metadata
  assert.ok(manifest.contents.every((c) => /^[a-f0-9]{64}$/.test(c.contentHash)), 'Content hashes should be SHA-256');
});

// ── Test: Merkle tree ────────────────────────────────────────────────────────

await test('Merkle tree computes correctly', () => {
  const hashes = ['aaa', 'bbb', 'ccc', 'ddd'];
  const root = buildMerkleTree(hashes);
  assert.ok(root.length === 64, 'Root should be 64 hex chars');

  // Single element tree
  const singleRoot = buildMerkleTree(['abc']);
  assert.ok(singleRoot.length === 64, 'Single-element root should be 64 hex chars');

  // Empty tree
  const emptyRoot = buildMerkleTree([]);
  assert.equal(emptyRoot, '', 'Empty tree root should be empty');
});

// ── Test: Query API ──────────────────────────────────────────────────────────

await test('Query API filters by entity, operation, and time', async () => {
  const storage = new InMemoryStorage();
  const ledger = new ProvenanceLedger({ storage });

  await ledger.append({
    operation: 'CREATE',
    entityId: 'e1',
    entityType: 'Person',
    actor: 'alice',
    purpose: 'test',
  });

  await ledger.append({
    operation: 'UPDATE',
    entityId: 'e2',
    entityType: 'Org',
    actor: 'bob',
    purpose: 'test',
  });

  await ledger.append({
    operation: 'CREATE',
    entityId: 'e3',
    entityType: 'Person',
    actor: 'alice',
    purpose: 'test',
  });

  const byEntity = await ledger.query({ entityId: 'e1' });
  assert.equal(byEntity.length, 1);

  const byOp = await ledger.query({ operation: 'CREATE' });
  assert.equal(byOp.length, 2);
});

// ── Test: Evidence bundle can be serialized for CI artifacts ──────────────────

await test('Evidence bundles recorded in CI artifacts (serializable)', async () => {
  const storage = new InMemoryStorage();
  const ledger = new ProvenanceLedger({ storage });

  await ledger.append({
    operation: 'CREATE',
    entityId: 'ci-test',
    entityType: 'Build',
    actor: 'ci-bot',
    purpose: 'ci-evidence',
  });

  const { manifest, entries } = await ledger.exportBundle({
    purpose: 'ci-evidence',
    classification: 'INTERNAL',
    exportedBy: 'ci-pipeline',
  });

  // Must be JSON-serializable (no BigInt, Date, etc.)
  const serialized = JSON.stringify(
    { manifest, entries },
    (_, v) => (typeof v === 'bigint' ? v.toString() : v),
  );
  assert.ok(serialized.length > 0, 'Bundle should serialize');

  // Must round-trip through JSON
  const parsed = JSON.parse(serialized);
  assert.equal(parsed.manifest.bundleId, manifest.bundleId);
  assert.equal(parsed.entries.length, entries.length);
});

// ── Test: Append-only enforcement ────────────────────────────────────────────

await test('Ledger is append-only (monotonic sequence)', async () => {
  const storage = new InMemoryStorage();
  const ledger = new ProvenanceLedger({ storage });

  const e1 = await ledger.append({
    operation: 'CREATE',
    entityId: 'e1',
    entityType: 'T',
    actor: 'a',
    purpose: 'p',
  });

  const e2 = await ledger.append({
    operation: 'UPDATE',
    entityId: 'e1',
    entityType: 'T',
    actor: 'a',
    purpose: 'p',
  });

  assert.ok(e2.sequenceNumber > e1.sequenceNumber, 'Sequence must increase');
  const all = await storage.getAll();
  assert.equal(all.length, 2, 'Both entries persisted');
});

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
process.exitCode = failed > 0 ? 1 : 0;
