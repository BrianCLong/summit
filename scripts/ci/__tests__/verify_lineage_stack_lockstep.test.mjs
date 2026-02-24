import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';

const SCRIPT_PATH = path.resolve(
  process.cwd(),
  'scripts/ci/verify_lineage_stack_lockstep.mjs'
);

async function writeFixture(
  root,
  {
    composeImage = 'marquezproject/marquez:0.51.1',
    k8sImage = 'marquezproject/marquez:0.51.1',
    chartRepository = 'marquezproject/marquez',
    chartTag = '0.51.1',
    extraRequirements = [],
  } = {}
) {
  await fs.mkdir(path.join(root, 'deploy', 'compose'), { recursive: true });
  await fs.mkdir(path.join(root, 'k8s', 'marquez'), { recursive: true });
  await fs.mkdir(path.join(root, 'charts', 'ig-platform'), { recursive: true });

  await fs.writeFile(
    path.join(root, 'requirements.in'),
    [
      'openlineage-python==1.44.*',
      'openlineage-dbt==1.44.*',
      ...extraRequirements,
      '',
    ].join('\n'),
    'utf8'
  );

  await fs.writeFile(
    path.join(root, 'deploy', 'compose', 'docker-compose.full.yml'),
    [
      "version: '3.9'",
      'services:',
      '  openlineage:',
      `    image: ${composeImage}`,
      '',
    ].join('\n'),
    'utf8'
  );

  await fs.writeFile(
    path.join(root, 'k8s', 'marquez', 'deploy.yaml'),
    [
      'apiVersion: apps/v1',
      'kind: Deployment',
      'metadata: { name: marquez, namespace: prod }',
      'spec:',
      '  template:',
      '    spec:',
      '      containers:',
      '        - name: marquez',
      `          image: ${k8sImage}`,
      '',
    ].join('\n'),
    'utf8'
  );

  await fs.writeFile(
    path.join(root, 'charts', 'ig-platform', 'values.yaml'),
    [
      'openlineage:',
      '  enabled: true',
      '  image:',
      `    repository: ${chartRepository}`,
      `    tag: '${chartTag}'`,
      '',
    ].join('\n'),
    'utf8'
  );
}

test('lineage lockstep gate passes for pinned dependencies and images', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lineage-lockstep-pass-'));
  await writeFixture(tempDir);

  const result = spawnSync('node', [SCRIPT_PATH], {
    cwd: tempDir,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /PASS/u);
});

test('lineage lockstep gate fails on latest image tag', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lineage-lockstep-latest-'));
  await writeFixture(tempDir, { composeImage: 'marquezproject/marquez:latest' });

  const result = spawnSync('node', [SCRIPT_PATH], {
    cwd: tempDir,
    encoding: 'utf8',
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /services\.openlineage\.image must not use :latest/u
  );
});

test('lineage lockstep gate fails on repository and tag mismatch', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lineage-lockstep-mismatch-'));
  await writeFixture(tempDir, {
    composeImage: 'marquezproject/marquez:0.51.1',
    k8sImage: 'marquezproject/marquez:0.50.0',
    chartRepository: 'openlineage/marquez',
    chartTag: '0.51.1',
  });

  const result = spawnSync('node', [SCRIPT_PATH], {
    cwd: tempDir,
    encoding: 'utf8',
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /openlineage\.image\.repository must be marquezproject\/marquez/u
  );
  assert.match(
    result.stderr,
    /Marquez image tag mismatch across configs/u
  );
});

test('lineage lockstep gate fails when OpenMetadata required fields are missing', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lineage-lockstep-om-'));
  await writeFixture(tempDir);
  await fs.mkdir(path.join(tempDir, 'ingestion'), { recursive: true });
  await fs.writeFile(
    path.join(tempDir, 'ingestion', 'openmetadata.yaml'),
    [
      'connector: openmetadata',
      'queryStatementSource: parser',
      '# parser options intentionally omitted',
      '# lookback window intentionally omitted',
      '',
    ].join('\n'),
    'utf8'
  );

  const result = spawnSync('node', [SCRIPT_PATH], {
    cwd: tempDir,
    encoding: 'utf8',
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /missing OpenMetadata 1\.12 required fields \(queryParserConfig, statusLookbackDays\)/u
  );
});

test('lineage lockstep gate fails when optional lockstep dependency is off-minor', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lineage-lockstep-deps-'));
  await writeFixture(tempDir, {
    extraRequirements: ['openmetadata-ingestion==1.11.*'],
  });

  const result = spawnSync('node', [SCRIPT_PATH], {
    cwd: tempDir,
    encoding: 'utf8',
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /openmetadata-ingestion must be pinned to 1\.12\.x when present/u
  );
});
