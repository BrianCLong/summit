import { test } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

test('generate_provenance_bundle.mjs', async (t) => {
  const testDir = path.join(process.cwd(), 'temp-test-provenance');
  fs.mkdirSync(testDir, { recursive: true });

  const verifyDir = path.join(testDir, 'verify');
  fs.mkdirSync(path.join(verifyDir, 'verify-lane1'), { recursive: true });
  fs.writeFileSync(path.join(verifyDir, 'verify-lane1', 'file1.json'), '{"a":1}');

  const sbomFile = path.join(testDir, 'sbom.json');
  fs.writeFileSync(sbomFile, '{"bom":1}');

  const outFile = path.join(testDir, 'provenance.json');

  try {
    execSync(`node scripts/release/generate_provenance_bundle.mjs --verify-evidence ${verifyDir} --sbom ${sbomFile} --out ${outFile}`, {
      env: { ...process.env, GITHUB_SHA: 'test-sha', GITHUB_REPOSITORY: 'test/repo' }
    });

    const content = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    assert.strictEqual(content.sha, 'test-sha');
    assert.strictEqual(content.repo, 'test/repo');
    assert.strictEqual(content.verifyArtifacts.length, 1);
    assert.strictEqual(content.verifyArtifacts[0].lane, 'lane1');
    assert.ok(content.sbom.sha256);
  } finally {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
});
