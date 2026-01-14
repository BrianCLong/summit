import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import { casPutFile, stableStringify } from './lib/cas.mjs';

const require = createRequire(import.meta.url);
const {
  generateSupplyChainArtifacts,
} = require('../supply-chain/supply-chain-artifacts.js');

const resolveCommitSha = () => {
  if (process.env.EVIDENCE_SHA) return process.env.EVIDENCE_SHA;
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
  if (result.status === 0 && result.stdout) {
    return result.stdout.trim();
  }
  return 'unknown';
};

const listFiles = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const resolved = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const childFiles = await listFiles(resolved);
      files.push(...childFiles);
    } else if (entry.isFile()) {
      files.push(resolved);
    }
  }
  return files.sort();
};

const writeStamp = async (stampPath, stamp) => {
  await fs.mkdir(path.dirname(stampPath), { recursive: true });
  await fs.writeFile(stampPath, stableStringify(stamp));
};

const main = async () => {
  const sha = resolveCommitSha();
  const runRoot = path.join('artifacts', 'evidence', sha);
  const sbomDir = path.join(runRoot, 'sbom');
  const provenancePath = path.join(runRoot, 'provenance', 'provenance.json');
  const auditPath = path.join(runRoot, 'dependency-audit.json');
  const stampPath = path.join(runRoot, 'stamp.json');
  const casRoot = path.join('artifacts', 'cas');

  const stamp = {
    sha,
    started_at: new Date().toISOString(),
    status: 'running',
    toolchain: {
      node: process.version,
      pnpm: process.env.npm_config_user_agent ?? null,
    },
  };

  await writeStamp(stampPath, stamp);

  try {
    generateSupplyChainArtifacts({
      commitSha: sha,
      artifactsDir: sbomDir,
      provenancePath,
      auditPath,
      rootDir: process.cwd(),
      workflowName: process.env.GITHUB_WORKFLOW || 'cas-evidence-run',
    });

    stamp.status = 'passed';
    stamp.finished_at = new Date().toISOString();
    await writeStamp(stampPath, stamp);
  } catch (error) {
    stamp.status = 'failed';
    stamp.finished_at = new Date().toISOString();
    stamp.failure = {
      message: error?.message ?? 'Unknown failure',
    };
    await writeStamp(stampPath, stamp);
    throw error;
  }

  const files = await listFiles(runRoot);
  const manifestFiles = [];

  for (const filePath of files) {
    const relPath = path.relative(runRoot, filePath);
    if (relPath === 'run-manifest.json') continue;
    const casEntry = await casPutFile({ casRoot, filePath });
    manifestFiles.push({
      path: relPath,
      sha256: casEntry.digest,
      size: casEntry.size,
      cas: casEntry.casRelativePath,
    });
  }

  const manifest = {
    schema_version: '1',
    category: 'evidence',
    sha,
    created_at: new Date().toISOString(),
    files: manifestFiles.sort((a, b) => a.path.localeCompare(b.path)),
    tool_versions: {
      node: process.version,
      pnpm: process.env.npm_config_user_agent ?? null,
    },
    policy_hashes: {},
  };

  await fs.writeFile(
    path.join(runRoot, 'run-manifest.json'),
    stableStringify(manifest),
  );

  console.log(
    `Evidence run manifest written to ${path.join(
      runRoot,
      'run-manifest.json',
    )}`,
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
