import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { LocalStore } from './LocalStore.js';
import { CryptoUtils } from './CryptoUtils.js';

const TEST_DIR = path.join(process.cwd(), 'server', 'src', 'lib', 'local-store', '__jest_test_data__');
const PACK_DIR = path.join(TEST_DIR, 'pack');
const STORE_DIR = path.join(TEST_DIR, 'store');
const TENANT_ID = 'test-tenant-jest';

// Deterministic RNG
let counter = 0;
const deterministicRng = (size: number): Buffer => {
  const buf = Buffer.alloc(size);
  for (let i = 0; i < size; i++) {
    buf[i] = (counter++) % 256;
  }
  return buf;
};

// Create a synthetic pack
async function createSyntheticPack(dir: string) {
  await fs.mkdir(dir, { recursive: true });
  await fs.mkdir(path.join(dir, 'cases'), { recursive: true });

  const caseData = { id: 'c1', title: 'Case 1' };
  const caseContent = JSON.stringify(caseData);
  await fs.writeFile(path.join(dir, 'cases', 'c1.json'), caseContent);
  const caseHash = crypto.createHash('sha256').update(caseContent).digest('hex');

  const manifest = {
    version: '1.0',
    cases: [{ id: 'c1', path: 'cases/c1.json', hash: caseHash }],
    evidence: [],
    notes: [],
    graph: { nodes: [], edges: [] },
    bundleHash: 'mock-bundle-hash'
  };

  await fs.writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

describe('LocalStore', () => {
  let store: LocalStore;

  beforeAll(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    await createSyntheticPack(PACK_DIR);
    CryptoUtils.setRandomBytesProvider(deterministicRng);
  });

  afterAll(async () => {
    CryptoUtils.resetRandomBytesProvider();
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  beforeEach(async () => {
    store = new LocalStore({ storePath: STORE_DIR });
  });

  it('initStore creates directory structure', async () => {
    await store.initStore();
    const stats = await fs.stat(path.join(STORE_DIR, 'tenants'));
    expect(stats.isDirectory()).toBe(true);
    const metadata = JSON.parse(await fs.readFile(path.join(STORE_DIR, 'metadata.json'), 'utf-8'));
    expect(metadata.version).toBe('1.0.0');
  });

  it('initTenant creates tenant keys and structure', async () => {
    await store.initTenant(TENANT_ID);
    const keyDir = path.join(STORE_DIR, 'tenants', TENANT_ID, 'keys');
    const activeKeyId = await fs.readFile(path.join(keyDir, 'active.key'), 'utf-8');
    expect(activeKeyId.startsWith('k-')).toBe(true);
  });

  it('ingestCasePack encrypts and stores data', async () => {
    await store.ingestCasePack(PACK_DIR, TENANT_ID);

    // Verify file exists
    const files = await fs.readdir(path.join(STORE_DIR, 'tenants', TENANT_ID, 'objects', 'case'));
    expect(files.length).toBe(1);

    // Verify it is encrypted
    const content = await fs.readFile(path.join(STORE_DIR, 'tenants', TENANT_ID, 'objects', 'case', 'c1.enc'), 'utf-8');
    const envelope = JSON.parse(content);
    expect(envelope.v).toBe(1);
    expect(envelope.aad.id).toBe('c1');
    expect(envelope.d).not.toBe('{"id":"c1","title":"Case 1"}'); // Not plaintext
  });

  it('getObject retrieves decrypted data', async () => {
    const data = await store.getObject(TENANT_ID, 'case', 'c1');
    const parsed = JSON.parse(data.toString());
    expect(parsed.id).toBe('c1');
    expect(parsed.title).toBe('Case 1');
  });

  it('verifyStoreIntegrity returns valid for clean store', async () => {
    const report = await store.verifyStoreIntegrity(TENANT_ID);
    expect(report.valid).toBe(true);
    expect(report.errors.length).toBe(0);
  });

  it('Tamper detection: Modified content', async () => {
    // Modify one byte of ciphertext
    const filePath = path.join(STORE_DIR, 'tenants', TENANT_ID, 'objects', 'case', 'c1.enc');
    const content = JSON.parse(await fs.readFile(filePath, 'utf-8'));

    // Flip a char in base64
    const d = Buffer.from(content.d, 'base64');
    d[0] = d[0] ^ 1;
    content.d = d.toString('base64');

    await fs.writeFile(filePath, JSON.stringify(content));

    const report = await store.verifyStoreIntegrity(TENANT_ID);
    expect(report.valid).toBe(false);
    expect(report.errors.find(e => e.type === 'decryption_failure')).toBeTruthy();

    // Restore
    await store.ingestCasePack(PACK_DIR, TENANT_ID);
  });

  it('Tamper detection: Mismatched AAD', async () => {
    const filePath = path.join(STORE_DIR, 'tenants', TENANT_ID, 'objects', 'case', 'c1.enc');
    const content = JSON.parse(await fs.readFile(filePath, 'utf-8'));

    content.aad.id = 'c2'; // Mismatched ID

    await fs.writeFile(filePath, JSON.stringify(content));

    const report = await store.verifyStoreIntegrity(TENANT_ID);
    expect(report.valid).toBe(false);
    expect(report.errors.find(e => e.type === 'decryption_failure')).toBeTruthy();

    // Restore
    await store.ingestCasePack(PACK_DIR, TENANT_ID);
  });

  it('Tamper detection: Extra file', async () => {
    // Add an extra file
    const extraFilePath = path.join(STORE_DIR, 'tenants', TENANT_ID, 'objects', 'case', 'c_rogue.enc');
    await fs.writeFile(extraFilePath, 'malicious data');

    const report = await store.verifyStoreIntegrity(TENANT_ID);
    expect(report.valid).toBe(false);
    expect(report.errors.find(e => e.type === 'extra_file')).toBeTruthy();
    expect(report.errors.find(e => e.details.includes('c_rogue.enc'))).toBeTruthy();

    // Clean up
    await fs.rm(extraFilePath);
  });

  it('rotateKeys updates key and re-encrypts', async () => {
    const keyDir = path.join(STORE_DIR, 'tenants', TENANT_ID, 'keys');
    const oldKeyId = await fs.readFile(path.join(keyDir, 'active.key'), 'utf-8');

    await store.rotateKeys(TENANT_ID);

    const newKeyId = await fs.readFile(path.join(keyDir, 'active.key'), 'utf-8');
    expect(oldKeyId).not.toBe(newKeyId);

    // Verify object still readable
    const data = await store.getObject(TENANT_ID, 'case', 'c1');
    const parsed = JSON.parse(data.toString());
    expect(parsed.id).toBe('c1');

    // Check envelope key ID
    const content = await fs.readFile(path.join(STORE_DIR, 'tenants', TENANT_ID, 'objects', 'case', 'c1.enc'), 'utf-8');
    const envelope = JSON.parse(content);
    expect(envelope.k).toBe(newKeyId);
  });
});
