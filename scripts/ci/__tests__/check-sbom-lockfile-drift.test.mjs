import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const scriptPath = path.resolve(
  process.cwd(),
  'scripts/ci/check-sbom-lockfile-drift.mjs',
);

function writeFile(targetPath, contents) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, contents, 'utf8');
}

function runCheck(tmpDir) {
  const evidencePath = path.join(tmpDir, 'artifacts/sbom-lockfile-drift.json');
  const result = spawnSync(
    'node',
    [
      scriptPath,
      '--lockfile',
      path.join(tmpDir, 'pnpm-lock.yaml'),
      '--package-json',
      path.join(tmpDir, 'package.json'),
      '--sbom-cdx',
      path.join(tmpDir, 'artifacts/sbom.cdx.json'),
      '--sbom-spdx',
      path.join(tmpDir, 'artifacts/sbom.spdx.json'),
      '--evidence-out',
      evidencePath,
    ],
    {
      encoding: 'utf8',
      cwd: tmpDir,
    },
  );

  return { result, evidencePath };
}

test('passes when SBOM npm packages are represented in lockfile', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sbom-lockfile-pass-'));

  writeFile(
    path.join(tmpDir, 'pnpm-lock.yaml'),
    `lockfileVersion: '9.0'
packages:
  '@scope/lib@1.2.3':
    resolution: { integrity: sha512-test }
  'lodash@4.17.21':
    resolution: { integrity: sha512-test }
`,
  );
  writeFile(
    path.join(tmpDir, 'package.json'),
    JSON.stringify(
      {
        name: 'summit',
        dependencies: {
          lodash: '^4.17.21',
        },
      },
      null,
      2,
    ),
  );
  writeFile(
    path.join(tmpDir, 'artifacts/sbom.cdx.json'),
    JSON.stringify(
      {
        bomFormat: 'CycloneDX',
        components: [
          { name: 'lodash', purl: 'pkg:npm/lodash@4.17.21' },
          { name: '@scope/lib', purl: 'pkg:npm/%40scope/lib@1.2.3' },
        ],
      },
      null,
      2,
    ),
  );
  writeFile(
    path.join(tmpDir, 'artifacts/sbom.spdx.json'),
    JSON.stringify(
      {
        packages: [],
      },
      null,
      2,
    ),
  );

  const { result, evidencePath } = runCheck(tmpDir);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  assert.equal(report.pass, true);
});

test('fails when SBOM contains npm packages not present in lockfile', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sbom-lockfile-fail-'));

  writeFile(
    path.join(tmpDir, 'pnpm-lock.yaml'),
    `lockfileVersion: '9.0'
packages:
  'lodash@4.17.21':
    resolution: { integrity: sha512-test }
`,
  );
  writeFile(
    path.join(tmpDir, 'package.json'),
    JSON.stringify(
      {
        name: 'summit',
        dependencies: {
          lodash: '^4.17.21',
        },
      },
      0,
      2,
    ),
  );
  writeFile(
    path.join(tmpDir, 'artifacts/sbom.cdx.json'),
    JSON.stringify(
      {
        bomFormat: 'CycloneDX',
        components: [
          { name: 'lodash', purl: 'pkg:npm/lodash@4.17.21' },
          { name: 'left-pad', purl: 'pkg:npm/left-pad@1.3.0' },
        ],
      },
      0,
      2,
    ),
  );
  writeFile(
    path.join(tmpDir, 'artifacts/sbom.spdx.json'),
    JSON.stringify(
      {
        packages: [],
      },
      0,
      2,
    ),
  );

  const { result } = runCheck(tmpDir);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Unexpected npm packages in SBOM not present in lockfile/,
  );
});
