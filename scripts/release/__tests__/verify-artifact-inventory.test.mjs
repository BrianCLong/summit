import { test, describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const SCRIPT_PATH = join(
  process.cwd(),
  'scripts',
  'release',
  'verify_artifact_inventory.mjs'
);

const getSha256 = (content) =>
  createHash('sha256').update(content).digest('hex');

const runVerifier = (dir, expectFail = false) => {
  try {
    const output = execSync(`node ${SCRIPT_PATH} --bundle-dir ${dir}`, {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return { output, error: null };
  } catch (error) {
    if (!expectFail) throw error;
    return { output: error.stderr, error };
  }
};

describe('verify_artifact_inventory.mjs', () => {
  let tempDir;

  before(() => {
    tempDir = mkdtempSync('artifact-inventory-test-');
  });

  after(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  const writeBundle = ({ fileContent, inventoryEntries, sumsEntries }) => {
    writeFileSync(join(tempDir, 'artifact.txt'), fileContent);
    writeFileSync(
      join(tempDir, 'inventory.json'),
      JSON.stringify(inventoryEntries)
    );
    writeFileSync(join(tempDir, 'SHA256SUMS'), sumsEntries.join('\n') + '\n');
  };

  it('passes when inventory and SHA256SUMS match bundle contents', () => {
    const content = 'hello world';
    const digest = getSha256(content);
    const inventoryEntries = [
      {
        path: 'artifact.txt',
        size: Buffer.byteLength(content),
        sha256: digest,
      },
    ];
    const inventoryDigest = getSha256(JSON.stringify(inventoryEntries));
    const sumsEntries = [
      `${digest}  artifact.txt`,
      `${inventoryDigest}  inventory.json`,
    ];

    writeBundle({ fileContent: content, inventoryEntries, sumsEntries });

    const { error } = runVerifier(tempDir);
    assert.equal(error, null, 'Expected verifier to succeed.');
  });

  it('fails when inventory is missing a bundle file', () => {
    const content = 'hello world';
    const digest = getSha256(content);
    const inventoryEntries = [];
    const inventoryDigest = getSha256(JSON.stringify(inventoryEntries));
    const sumsEntries = [
      `${digest}  artifact.txt`,
      `${inventoryDigest}  inventory.json`,
    ];

    writeBundle({ fileContent: content, inventoryEntries, sumsEntries });

    const { output, error } = runVerifier(tempDir, true);
    assert(error, 'Expected verifier to fail.');
    assert(
      output.includes('INVENTORY_MISSING_ENTRY'),
      `Expected INVENTORY_MISSING_ENTRY, got: ${output}`
    );
  });

  it('fails when inventory digest mismatches bundle content', () => {
    const content = 'hello world';
    const digest = getSha256(content);
    const inventoryEntries = [
      {
        path: 'artifact.txt',
        size: Buffer.byteLength(content),
        sha256: '0'.repeat(64),
      },
    ];
    const inventoryDigest = getSha256(JSON.stringify(inventoryEntries));
    const sumsEntries = [
      `${digest}  artifact.txt`,
      `${inventoryDigest}  inventory.json`,
    ];

    writeBundle({ fileContent: content, inventoryEntries, sumsEntries });

    const { output, error } = runVerifier(tempDir, true);
    assert(error, 'Expected verifier to fail.');
    assert(
      output.includes('INVENTORY_DIGEST_MISMATCH'),
      `Expected INVENTORY_DIGEST_MISMATCH, got: ${output}`
    );
  });
});
