import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  buildManifest,
  copyFixtureEntries,
  EVIDENCE_SCHEMA,
  hashString,
  readFixtureConfig,
  resolveFixtureEntries,
  stableStringify,
  writeDeterministicFile,
} from './bundle-lib.mjs';

function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value.startsWith('--')) {
      const key = value.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args.set(key, true);
      } else {
        args.set(key, next);
        i += 1;
      }
    }
  }
  return args;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const fixture = args.get('fixture');
  if (!fixture || typeof fixture !== 'string') {
    throw new Error('Missing required --fixture <name> argument.');
  }
  const evidenceId =
    typeof args.get('evidence-id') === 'string'
      ? args.get('evidence-id')
      : `local-${fixture}`;
  const rootDir = process.cwd();
  const fixtureDir = path.join(rootDir, 'fixtures', 'inference', fixture);
  const outputDir = path.join(rootDir, 'artifacts', 'inference', evidenceId);
  const stagingDir = path.join(outputDir, 'bundle-staging');
  const bundleZip = path.join(outputDir, 'bundle.zip');

  await fs.rm(stagingDir, { recursive: true, force: true });
  await fs.mkdir(stagingDir, { recursive: true });

  const config = await readFixtureConfig(fixtureDir);
  const includePaths = config.include ?? [];
  const entrypoints = config.entrypoints ?? {};
  const parameters = config.parameters ?? {};

  const entries = await resolveFixtureEntries(fixtureDir, includePaths);
  const manifest = await buildManifest(entrypoints, entries, parameters);
  const manifestContent = stableStringify(manifest);
  const manifestSha = hashString(manifestContent);

  await copyFixtureEntries(stagingDir, entries);
  await writeDeterministicFile(
    path.join(stagingDir, 'manifest.json'),
    manifestContent,
  );

  const evidence = {
    schema: EVIDENCE_SCHEMA,
    fixture,
    evidence_id: evidenceId,
    manifest_sha256: manifestSha,
    entry_count: entries.length,
    entrypoints: Object.keys(entrypoints).sort(),
    parameters,
  };
  const evidenceContent = stableStringify(evidence);
  await writeDeterministicFile(
    path.join(stagingDir, 'evidence.json'),
    evidenceContent,
  );

  const filesToZip = [
    'evidence.json',
    'manifest.json',
    ...entries.map((entry) => entry.relativePath),
  ].sort();

  await fs.mkdir(outputDir, { recursive: true });

  const zipResult = spawnSync('zip', ['-X', '-q', bundleZip, '-@'], {
    cwd: stagingDir,
    input: `${filesToZip.join('\n')}\n`,
    stdio: ['pipe', 'inherit', 'inherit'],
  });

  if (zipResult.status !== 0) {
    throw new Error('Failed to create bundle.zip via zip CLI.');
  }

  await fs.rm(stagingDir, { recursive: true, force: true });
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
