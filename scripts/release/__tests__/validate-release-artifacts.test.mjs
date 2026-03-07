import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  cpSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  mkdirSync,
} from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

const SCRIPT_PATH = join(
  process.cwd(),
  'scripts',
  'release',
  'validate-release-artifacts.mjs',
);

function createTempDir() {
  return mkdtempSync(join(tmpdir(), 'validate-artifacts-'));
}

function getSha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function runScript(dir, expectFail = false) {
  try {
    const output = execSync(`node "${SCRIPT_PATH}" --dir="${dir}"`, {
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: dir,
    });
    return { output, error: null };
  } catch (error) {
    if (!expectFail) throw error;
    return { output: error.stdout + '\n' + error.stderr, error };
  }
}

describe('validate-release-artifacts', () => {
  it('passes for a valid bundle', () => {
    const tempDir = createTempDir();
    try {
      mkdirSync(join(tempDir, 'sbom'));
      const sbomContent = '{"bomFormat":"CycloneDX"}';
      writeFileSync(join(tempDir, 'sbom', 'bundle.cdx.json'), sbomContent);
      writeFileSync(join(tempDir, 'sbom', 'bundle.cdx.json.sig'), 'sig');

      const evidenceContent = '{"data":"evidence"}';
      writeFileSync(join(tempDir, 'evidence.json'), evidenceContent);
      writeFileSync(join(tempDir, 'evidence.json.sig'), 'sig');

      const provenanceContent = '{"_type":"https://in-toto.io/Statement/v0.1"}';
      writeFileSync(join(tempDir, 'provenance.json'), provenanceContent);
      writeFileSync(join(tempDir, 'provenance.json.sig'), 'sig');

      const hashes = [
        `${getSha256(sbomContent)}  sbom/bundle.cdx.json`,
        `${getSha256(evidenceContent)}  evidence.json`,
        `${getSha256(provenanceContent)}  provenance.json`
      ].join('\n');

      writeFileSync(join(tempDir, 'SHA256SUMS'), hashes);
      writeFileSync(join(tempDir, 'SHA256SUMS.sig'), 'sig');

      const { output, error } = runScript(tempDir, false);
      assert(!error, `Script failed unexpectedly: ${output}`);
      assert(output.includes('release-readiness: PASS'), `Expected PASS badge in: ${output}`);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('fails if SBOM is missing', () => {
    const tempDir = createTempDir();
    try {
      writeFileSync(join(tempDir, 'evidence.json'), '{}');
      writeFileSync(join(tempDir, 'evidence.json.sig'), 'sig');
      writeFileSync(join(tempDir, 'provenance.json'), '{}');
      writeFileSync(join(tempDir, 'provenance.json.sig'), 'sig');

      const { output, error } = runScript(tempDir, true);
      assert(error, 'Script should have failed');
      assert(output.includes('release-readiness: FAIL'), 'Expected FAIL badge');
      assert(output.includes('MISSING_ARTIFACT'), 'Expected MISSING_ARTIFACT error code');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('fails if schema is invalid JSON', () => {
    const tempDir = createTempDir();
    try {
      mkdirSync(join(tempDir, 'sbom'));
      writeFileSync(join(tempDir, 'sbom', 'bundle.cdx.json'), 'invalid json');
      writeFileSync(join(tempDir, 'sbom', 'bundle.cdx.json.sig'), 'sig');
      writeFileSync(join(tempDir, 'evidence.json'), '{}');
      writeFileSync(join(tempDir, 'evidence.json.sig'), 'sig');
      writeFileSync(join(tempDir, 'provenance.json'), '{}');
      writeFileSync(join(tempDir, 'provenance.json.sig'), 'sig');

      const { output, error } = runScript(tempDir, true);
      assert(error, 'Script should have failed');
      assert(output.includes('INVALID_SCHEMA'), 'Expected INVALID_SCHEMA error code');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('fails if signatures are missing', () => {
    const tempDir = createTempDir();
    try {
      mkdirSync(join(tempDir, 'sbom'));
      writeFileSync(join(tempDir, 'sbom', 'bundle.cdx.json'), '{}');
      writeFileSync(join(tempDir, 'evidence.json'), '{}');
      writeFileSync(join(tempDir, 'provenance.json'), '{}');

      const { output, error } = runScript(tempDir, true);
      assert(error, 'Script should have failed');
      assert(output.includes('MISSING_SIGNATURE'), 'Expected MISSING_SIGNATURE error code');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('fails if non-deterministic timestamps are found outside stamp.json', () => {
    const tempDir = createTempDir();
    try {
      mkdirSync(join(tempDir, 'sbom'));
      writeFileSync(join(tempDir, 'sbom', 'bundle.cdx.json'), '{}');
      writeFileSync(join(tempDir, 'sbom', 'bundle.cdx.json.sig'), 'sig');

      // evidence.json has a timestamp, which is bad unless it's in stamp.json
      writeFileSync(join(tempDir, 'evidence.json'), '{"timestamp":"2024-01-01T00:00:00Z"}');
      writeFileSync(join(tempDir, 'evidence.json.sig'), 'sig');
      writeFileSync(join(tempDir, 'provenance.json'), '{}');
      writeFileSync(join(tempDir, 'provenance.json.sig'), 'sig');

      const { output, error } = runScript(tempDir, true);
      assert(error, 'Script should have failed');
      assert(output.includes('TIMESTAMP_VIOLATION'), 'Expected TIMESTAMP_VIOLATION error code');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
