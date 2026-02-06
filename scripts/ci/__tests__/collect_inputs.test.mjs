import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { buildInputs } from '../collect_inputs.mjs';

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

test('buildInputs produces deterministic artifact metadata', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'collect-inputs-'));
  const sbomPath = path.join(tmpDir, 'sbom.json');
  const sbomContent = '{"sbom":"ok"}';
  fs.writeFileSync(sbomPath, sbomContent);

  const inputs = buildInputs({
    env: {
      SBOM_PATH: 'sbom.json',
      GITHUB_REPOSITORY: 'acme/summit',
      GITHUB_SHA: 'deadbeef',
      GITHUB_EVENT_NUMBER: '42',
      REQUIRED_CHECKS: 'lint,test',
      COSIGN_SIGNED: 'true',
      PROVENANCE_SLSA_LEVEL: '2',
      PROVENANCE_ATTESTATION_PATH: 'attestation.jsonl',
      IMAGE_DIGEST: 'sha256:abc123',
    },
    repoRoot: tmpDir,
  });

  assert.strictEqual(inputs.artifacts.sbom.path, 'sbom.json');
  assert.strictEqual(inputs.artifacts.sbom.sha256, sha256(sbomContent));
  assert.deepStrictEqual(inputs.required_checks, ['lint', 'test']);
  assert.strictEqual(inputs.repo.owner, 'acme');
  assert.strictEqual(inputs.repo.name, 'summit');
  assert.strictEqual(inputs.repo.pr, 42);
  assert.strictEqual(inputs.artifacts.image.signatures.cosign, true);
  assert.strictEqual(inputs.artifacts.provenance.slsa_level, 2);
});
