import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const checkerPath = path.resolve(
  process.cwd(),
  'scripts/ci/verify-cosign-hardening.mjs',
);

function writeFile(targetPath, content) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf8');
}

function run(rootDir) {
  return spawnSync(
    'node',
    [checkerPath, '--root', rootDir, '--report-out', 'artifacts/cosign-hardening.json'],
    { encoding: 'utf8' },
  );
}

test('passes with pinned cosign and no insecure tlog flags', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cosign-hardening-pass-'));

  writeFile(
    path.join(rootDir, '.github/workflows/reusable/supply-chain-policy.yml'),
    `name: test
jobs:
  gate:
    steps:
      - name: Install Cosign
        uses: sigstore/cosign-installer@v3
        with:
          cosign-release: "v3.0.5"
`,
  );
  writeFile(
    path.join(rootDir, '.github/policies/supplychain/verify.rego'),
    `package supplychain
allow if {
  semver.compare(input.cosign.version, "3.0.5") >= 0
}
`,
  );
  writeFile(
    path.join(rootDir, 'scripts/release/verify.sh'),
    '#!/usr/bin/env bash\necho "ok"\n',
  );

  const result = run(rootDir);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PASS/);
});

test('fails when cosign-release is missing', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cosign-hardening-missing-'));

  writeFile(
    path.join(rootDir, '.github/workflows/reusable/supply-chain-policy.yml'),
    `name: test
jobs:
  gate:
    steps:
      - name: Install Cosign
        uses: sigstore/cosign-installer@v3
`,
  );
  writeFile(
    path.join(rootDir, '.github/policies/supplychain/verify.rego'),
    `package supplychain
allow if {
  semver.compare(input.cosign.version, "3.0.5") >= 0
}
`,
  );

  const result = run(rootDir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing cosign-release pin/);
});

test('fails when insecure tlog bypass flag is present', () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cosign-hardening-insecure-'));

  writeFile(
    path.join(rootDir, '.github/workflows/reusable/supply-chain-policy.yml'),
    `name: test
jobs:
  gate:
    steps:
      - name: Install Cosign
        uses: sigstore/cosign-installer@v3
        with:
          cosign-release: "v3.0.5"
`,
  );
  writeFile(
    path.join(rootDir, '.github/policies/supplychain/verify.rego'),
    `package supplychain
allow if {
  semver.compare(input.cosign.version, "3.0.5") >= 0
}
`,
  );
  writeFile(
    path.join(rootDir, 'scripts/release/attest.sh'),
    'cosign verify-blob-attestation --insecure-ignore-tlog --bundle x\n',
  );

  const result = run(rootDir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /forbidden --insecure-ignore-tlog/);
});
