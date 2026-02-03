/**
 * Go-Live Pipeline Integration Tests
 *
 * Tests the full evidence generation and verification pipeline.
 * These tests use SKIP_CHECKS=1 to avoid running actual builds.
 *
 * Run with: node --test scripts/evidence/tests/go-live-pipeline.integration.test.mjs
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');

// Get the current git SHA - this is what the evidence generator uses
function getCurrentSha() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  return result.stdout?.trim() || 'unknown';
}

// Use the actual SHA-based directory that the generator creates
const CURRENT_SHA = getCurrentSha();
const EVIDENCE_DIR = path.join(ROOT, 'artifacts', 'evidence', 'go-live', CURRENT_SHA);

function runScript(script, args = [], env = {}) {
  const result = spawnSync('npx', ['tsx', script, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env, ...env },
  });
  return {
    success: result.status === 0,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status,
  };
}

describe('Go-Live Pipeline Integration', () => {
  before(() => {
    // Clean up any previous test artifacts for this SHA
    if (fs.existsSync(EVIDENCE_DIR)) {
      fs.rmSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  after(() => {
    // Clean up test artifacts
    if (fs.existsSync(EVIDENCE_DIR)) {
      fs.rmSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('evidence generator creates valid bundle with SKIP_CHECKS', async () => {
    // Run generator with SKIP_CHECKS
    const result = runScript(
      'scripts/evidence/generate-go-live-evidence.ts',
      [],
      { SKIP_CHECKS: '1' }
    );

    // Generator should succeed with skip checks
    assert.ok(
      result.stdout.includes('Evidence bundle generated') || result.status === 0,
      `Generator should succeed. Output: ${result.stdout}\nStderr: ${result.stderr}`
    );

    // Check files were created
    const expectedFiles = ['evidence.json', 'evidence.md', 'checksums.txt'];
    for (const file of expectedFiles) {
      const filePath = path.join(EVIDENCE_DIR, file);
      assert.ok(fs.existsSync(filePath), `${file} should be created at ${filePath}`);
    }

    // Validate evidence.json structure
    const evidence = JSON.parse(
      fs.readFileSync(path.join(EVIDENCE_DIR, 'evidence.json'), 'utf8')
    );

    assert.strictEqual(evidence.version, '1.0.0', 'Version should be 1.0.0');
    assert.ok(evidence.generatedAt, 'Should have generatedAt');
    assert.ok(evidence.git, 'Should have git info');
    assert.ok(evidence.toolchain, 'Should have toolchain info');
    assert.ok(evidence.checks, 'Should have checks');
    assert.ok(evidence.summary, 'Should have summary');

    // With SKIP_CHECKS, all checks should be skipped
    for (const [name, check] of Object.entries(evidence.checks)) {
      assert.strictEqual(
        check.status,
        'skipped',
        `Check ${name} should be skipped`
      );
    }
  });

  test('evidence verifier validates generated bundle', async () => {
    // Ensure we have evidence from previous test
    const evidencePath = path.join(EVIDENCE_DIR, 'evidence.json');
    if (!fs.existsSync(evidencePath)) {
      // Generate evidence first
      runScript(
        'scripts/evidence/generate-go-live-evidence.ts',
        [],
        { SKIP_CHECKS: '1' }
      );
    }

    // Run verifier
    const result = runScript(
      'scripts/evidence/verify-go-live-evidence.ts',
      [EVIDENCE_DIR]
    );

    assert.ok(
      result.stdout.includes('Schema validation passed'),
      `Schema validation should pass. Output: ${result.stdout}`
    );
    assert.ok(
      result.stdout.includes('Checksum verification passed'),
      `Checksum verification should pass. Output: ${result.stdout}`
    );
  });

  test('SBOM generator creates valid CycloneDX output', async () => {
    // Ensure evidence directory exists
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }

    // Run SBOM generator
    const result = runScript(
      'scripts/release/generate-go-live-sbom.ts',
      [EVIDENCE_DIR]
    );

    assert.ok(
      result.stdout.includes('SBOM Generation Complete') || result.status === 0,
      `SBOM generation should succeed. Output: ${result.stdout}`
    );

    // Check SBOM file
    const sbomPath = path.join(EVIDENCE_DIR, 'sbom.cdx.json');
    assert.ok(fs.existsSync(sbomPath), 'SBOM file should be created');

    // Validate SBOM structure
    const sbom = JSON.parse(fs.readFileSync(sbomPath, 'utf8'));
    assert.strictEqual(sbom.bomFormat, 'CycloneDX', 'Should be CycloneDX format');
    assert.strictEqual(sbom.specVersion, '1.5', 'Should be spec version 1.5');
    assert.ok(Array.isArray(sbom.components), 'Should have components array');
    assert.ok(sbom.components.length > 0, 'Should have at least one component');
  });

  test('provenance generator creates valid SLSA attestation', async () => {
    // Ensure evidence exists
    const evidencePath = path.join(EVIDENCE_DIR, 'evidence.json');
    if (!fs.existsSync(evidencePath)) {
      runScript(
        'scripts/evidence/generate-go-live-evidence.ts',
        [],
        { SKIP_CHECKS: '1' }
      );
    }

    // Run provenance generator
    const result = runScript(
      'scripts/release/generate-go-live-provenance.ts',
      [EVIDENCE_DIR]
    );

    assert.ok(
      result.stdout.includes('Provenance Attestation Generated') || result.status === 0,
      `Provenance generation should succeed. Output: ${result.stdout}\nStderr: ${result.stderr}`
    );

    // Check provenance file
    const provPath = path.join(EVIDENCE_DIR, 'provenance.json');
    assert.ok(fs.existsSync(provPath), 'Provenance file should be created');

    // Validate provenance structure
    const prov = JSON.parse(fs.readFileSync(provPath, 'utf8'));
    assert.strictEqual(
      prov._type,
      'https://in-toto.io/Statement/v0.1',
      'Should be in-toto statement'
    );
    assert.strictEqual(
      prov.predicateType,
      'https://slsa.dev/provenance/v0.2',
      'Should be SLSA v0.2 provenance'
    );
    assert.ok(Array.isArray(prov.subject), 'Should have subjects');
    assert.ok(prov.predicate, 'Should have predicate');
    assert.ok(prov.predicate.builder, 'Should have builder info');
    assert.ok(prov.predicate.invocation, 'Should have invocation info');
  });

  test('release notes generator creates markdown output', async () => {
    // Ensure evidence exists
    const evidencePath = path.join(EVIDENCE_DIR, 'evidence.json');
    if (!fs.existsSync(evidencePath)) {
      runScript(
        'scripts/evidence/generate-go-live-evidence.ts',
        [],
        { SKIP_CHECKS: '1' }
      );
    }

    // Run release notes generator
    const result = runScript(
      'scripts/release/generate-go-live-release-notes.ts',
      [EVIDENCE_DIR]
    );

    // Check outputs
    const mdPath = path.join(EVIDENCE_DIR, 'RELEASE_NOTES.md');
    const jsonPath = path.join(EVIDENCE_DIR, 'release-notes.json');

    assert.ok(fs.existsSync(mdPath), `RELEASE_NOTES.md should be created at ${mdPath}`);
    assert.ok(fs.existsSync(jsonPath), `release-notes.json should be created at ${jsonPath}`);

    // Validate markdown content
    const md = fs.readFileSync(mdPath, 'utf8');
    assert.ok(md.includes('## Go-Live Release'), 'Should have release header');
    assert.ok(md.includes('Verification Summary'), 'Should have verification summary');
    assert.ok(md.includes('Check Results'), 'Should have check results');

    // Validate JSON content
    const notes = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    assert.ok(notes.version, 'Should have version');
    assert.ok(notes.tagName, 'Should have tagName');
    assert.ok(notes.body, 'Should have body');
  });

  test('checksums are valid for all generated files', async () => {
    const checksumPath = path.join(EVIDENCE_DIR, 'checksums.txt');
    assert.ok(fs.existsSync(checksumPath), 'checksums.txt should exist');

    const checksums = fs.readFileSync(checksumPath, 'utf8');
    const lines = checksums.trim().split('\n').filter(Boolean);

    for (const line of lines) {
      const match = line.match(/^([a-f0-9]{64})\s{2}(.+)$/);
      assert.ok(match, `Invalid checksum line: ${line}`);

      const [, expectedHash, filename] = match;
      const filePath = path.join(EVIDENCE_DIR, filename);

      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath);
        const actualHash = crypto.createHash('sha256').update(content).digest('hex');
        assert.strictEqual(
          actualHash,
          expectedHash,
          `Checksum mismatch for ${filename}`
        );
      }
    }
  });

  test('tag creator works in dry-run mode', async () => {
    // Ensure evidence exists
    const evidencePath = path.join(EVIDENCE_DIR, 'evidence.json');
    if (!fs.existsSync(evidencePath)) {
      runScript(
        'scripts/evidence/generate-go-live-evidence.ts',
        [],
        { SKIP_CHECKS: '1' }
      );
    }

    // Run tag creator in dry-run mode
    const result = runScript(
      'scripts/release/create-go-live-tag.ts',
      [EVIDENCE_DIR, '--dry-run']
    );

    assert.ok(
      result.stdout.includes('DRY-RUN') || result.stdout.includes('dry-run'),
      'Should indicate dry-run mode'
    );
    // Note: May fail if tag already exists, which is expected
  });

  test('GitHub release creator works in dry-run mode', async () => {
    // Ensure all artifacts exist
    const notesPath = path.join(EVIDENCE_DIR, 'release-notes.json');
    if (!fs.existsSync(notesPath)) {
      runScript(
        'scripts/evidence/generate-go-live-evidence.ts',
        [],
        { SKIP_CHECKS: '1' }
      );
      runScript('scripts/release/generate-go-live-release-notes.ts', [EVIDENCE_DIR]);
    }

    // Run GitHub release creator in dry-run mode
    const result = runScript(
      'scripts/release/create-go-live-release.ts',
      [EVIDENCE_DIR, '--dry-run']
    );

    assert.ok(
      result.stdout.includes('DRY-RUN') || result.stdout.includes('dry-run'),
      'Should indicate dry-run mode'
    );
  });
});
