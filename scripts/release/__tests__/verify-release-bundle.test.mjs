import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  cpSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
} from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

const SCRIPT_PATH_VERIFY = join(
  process.cwd(),
  'scripts',
  'release',
  'verify-release-bundle.mjs',
);
const SCRIPT_PATH_BUILD_INDEX = join(
  process.cwd(),
  'scripts',
  'release',
  'build-bundle-index.mjs',
);
const FIXTURE_DIR = join(
  process.cwd(),
  'scripts',
  'release',
  '__tests__',
  'fixtures',
  'verify-release-bundle',
  'basic',
);

function getSha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function createTempDir() {
  return mkdtempSync(join(tmpdir(), 'release-bundle-'));
}

function setupFixture(tempDir) {
  cpSync(FIXTURE_DIR, tempDir, { recursive: true });
}

function writeSha256Sums(dir, entries) {
  const lines = entries.map(({ path, hash }) => {
    const resolvedHash = hash ?? getSha256(readFileSync(join(dir, path)));
    return `${resolvedHash}  ${path}`;
  });
  writeFileSync(join(dir, 'SHA256SUMS'), `${lines.join('\n')}\n`);
}

function runVerifyScript(dir, expectFail = false) {
  try {
    const output = execSync(`node "${SCRIPT_PATH_VERIFY}" --path="${dir}"`, {
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: dir,
    });
    return { output, error: null };
  } catch (error) {
    if (!expectFail) throw error;
    return { output: error.stderr, error };
  }
}

describe('verify-release-bundle checks', () => {
  it('detects tampered files via SHA256SUMS', () => {
    const tempDir = createTempDir();
    try {
      setupFixture(tempDir);
      writeSha256Sums(tempDir, [
        { path: 'alpha.txt' },
        { path: 'bravo.txt' },
      ]);
      writeFileSync(join(tempDir, 'alpha.txt'), 'tampered');

      const { output, error } = runVerifyScript(tempDir, true);
      assert(error, 'Expected non-zero exit code');
      assert(
        output.includes('[HASH_MISMATCH]'),
        `Expected HASH_MISMATCH, got: ${output}`,
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('detects missing files listed in SHA256SUMS', () => {
    const tempDir = createTempDir();
    try {
      setupFixture(tempDir);
      writeSha256Sums(tempDir, [
        { path: 'alpha.txt' },
        { path: 'bravo.txt' },
        { path: 'missing.txt', hash: 'a'.repeat(64) },
      ]);

      const { output, error } = runVerifyScript(tempDir, true);
      assert(error, 'Expected non-zero exit code');
      assert(
        output.includes('[DIR_MISSING_FILE]'),
        `Expected DIR_MISSING_FILE, got: ${output}`,
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('detects extra files not listed in SHA256SUMS', () => {
    const tempDir = createTempDir();
    try {
      setupFixture(tempDir);
      writeSha256Sums(tempDir, [{ path: 'alpha.txt' }]);

      const { output, error } = runVerifyScript(tempDir, true);
      assert(error, 'Expected non-zero exit code');
      assert(
        output.includes('[DIR_EXTRA_FILE]'),
        `Expected DIR_EXTRA_FILE, got: ${output}`,
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('flags invalid SHA256SUMS formatting', () => {
    const tempDir = createTempDir();
    try {
      setupFixture(tempDir);
      writeFileSync(join(tempDir, 'SHA256SUMS'), 'not-a-hash alpha.txt\n');

      const { output, error } = runVerifyScript(tempDir, true);
      assert(error, 'Expected non-zero exit code');
      assert(
        output.includes('[SHA256SUMS_INVALID_FORMAT]'),
        `Expected SHA256SUMS_INVALID_FORMAT, got: ${output}`,
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe('bundle index determinism', () => {
  it('writes bundle-index.json with deterministic ordering', () => {
    const tempDir = createTempDir();
    try {
      setupFixture(tempDir);
      writeFileSync(join(tempDir, 'zeta.txt'), 'z');

      execSync(`node "${SCRIPT_PATH_BUILD_INDEX}" "${tempDir}"`, {
        encoding: 'utf8',
        stdio: 'pipe',
      });

      const index = JSON.parse(
        readFileSync(join(tempDir, 'bundle-index.json'), 'utf8'),
      );
      const filePaths = index.files.map(file => file.path);
      const sorted = [...filePaths].sort();
      assert.deepEqual(
        filePaths,
        sorted,
        `Expected sorted file order, got: ${filePaths.join(', ')}`,
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
