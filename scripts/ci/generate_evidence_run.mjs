#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { sha256File, writeRunManifest } from './lib/cas.mjs';

const require = createRequire(import.meta.url);
const { generateSupplyChainArtifacts } = require('../supply-chain/supply-chain-artifacts.js');

const resolveGitSha = () => {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
  return result.status === 0 ? result.stdout.trim() : 'unknown';
};

const maybeHash = async (filePath) => {
  try {
    return await sha256File(filePath);
  } catch (error) {
    return null;
  }
};

const main = async () => {
  const sha = process.env.GITHUB_SHA || resolveGitSha();
  const runRoot = path.join('artifacts', 'evidence', sha);
  const sbomDir = path.join(runRoot, 'sbom');
  const provenanceDir = path.join(runRoot, 'provenance');
  const auditDir = path.join(runRoot, 'audit');
  const provenancePath = path.join(provenanceDir, 'provenance.json');
  const auditPath = path.join(auditDir, 'dependency-audit.json');
  const stampPath = path.join(runRoot, 'stamp.json');
  const startedAt = new Date().toISOString();

  await Promise.all([
    fs.mkdir(sbomDir, { recursive: true }),
    fs.mkdir(provenanceDir, { recursive: true }),
    fs.mkdir(auditDir, { recursive: true }),
  ]);

  let status = 'passed';
  let failure = null;

  try {
    generateSupplyChainArtifacts({
      commitSha: sha,
      artifactsDir: sbomDir,
      provenancePath,
      auditPath,
    });
  } catch (error) {
    status = 'failed';
    failure = error?.message || 'Evidence generation failed';
  }

  const policyHashes = {
    verification_map: await maybeHash('docs/ga/verification-map.json'),
    cas_spec: await maybeHash('docs/ga/CAS_ARTIFACTS.md'),
  };

  const stamp = {
    sha,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    status,
    failure,
  };

  await fs.writeFile(stampPath, `${JSON.stringify(stamp, null, 2)}\n`);

  await writeRunManifest({
    runRoot,
    casRoot: path.join('artifacts', 'cas'),
    category: 'evidence',
    sha,
    toolVersions: {
      node: process.version,
      pnpm: process.env.npm_config_user_agent ?? null,
    },
    policyHashes,
  });

  if (status !== 'passed') {
    process.exit(1);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
