import fs from 'fs';
import path from 'path';
import { execFileSync, execSync } from 'child_process';
import {
  ROOT_DIR,
  ensureEmptyDir,
  normalizePath,
  parseArgs,
  readPolicy,
  sha256File,
  writeJson,
} from './evidence-utils.mjs';

const DEFAULT_POLICY = path.join(
  ROOT_DIR,
  'docs/ga/EVIDENCE_BUNDLE_POLICY.yml',
);

const getGitSha = () =>
  execSync('git rev-parse HEAD', { cwd: ROOT_DIR }).toString().trim();

const getGitRef = () => {
  if (process.env.GITHUB_REF) {
    return process.env.GITHUB_REF;
  }
  return execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT_DIR })
    .toString()
    .trim();
};

const getRepoUrl = () => {
  if (process.env.GITHUB_REPOSITORY) {
    return `https://github.com/${process.env.GITHUB_REPOSITORY}`;
  }
  const remote = execSync('git config --get remote.origin.url', {
    cwd: ROOT_DIR,
  })
    .toString()
    .trim();
  if (remote.startsWith('git@')) {
    return remote.replace(':', '/').replace('git@', 'https://').replace(/\.git$/, '');
  }
  return remote.replace(/\.git$/, '');
};

const getPnpmVersion = () => {
  try {
    return execSync('pnpm -v', { cwd: ROOT_DIR }).toString().trim();
  } catch (error) {
    return 'intentionally-constrained';
  }
};

const listFiles = (rootDir) => {
  const results = [];
  const walk = (current) => {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }
  };
  walk(rootDir);
  return results.sort();
};

const main = () => {
  const startTime = new Date();
  const args = parseArgs(process.argv.slice(2));
  const policyPath = args.policy || DEFAULT_POLICY;
  const policy = readPolicy(policyPath);
  const sha = getGitSha();
  const bundleRoot =
    args.out || path.join(ROOT_DIR, 'artifacts/evidence', sha);

  ensureEmptyDir(bundleRoot);

  execFileSync(
    'node',
    [
      'scripts/ci/generate_sbom.mjs',
      '--policy',
      policyPath,
      '--out',
      path.join(bundleRoot, 'sbom'),
    ],
    { stdio: 'inherit', cwd: ROOT_DIR },
  );

  execFileSync(
    'node',
    [
      'scripts/ci/capture_provenance.mjs',
      '--policy',
      policyPath,
      '--out',
      path.join(bundleRoot, 'provenance'),
    ],
    { stdio: 'inherit', cwd: ROOT_DIR },
  );

  const sbomDir = path.join(bundleRoot, 'sbom');
  const workspaceDir = path.join(sbomDir, 'workspaces');
  const sbomFiles =
    fs.existsSync(sbomDir)
      ? listFiles(sbomDir).filter((file) => file.endsWith('.json'))
      : [];
  const workspaceSboms = fs.existsSync(workspaceDir)
    ? listFiles(workspaceDir).filter((file) => file.endsWith('.json'))
    : [];

  const hashesPath = path.join(bundleRoot, 'provenance', 'hashes.json');
  const hashes = fs.existsSync(hashesPath)
    ? JSON.parse(fs.readFileSync(hashesPath, 'utf8'))
    : { files: [] };

  const receipt = {
    schema_version: '1.0',
    status: 'passed',
    started_at: startTime.toISOString(),
    finished_at: new Date().toISOString(),
    summary: {
      sbom_count: sbomFiles.length,
      workspace_count: workspaceSboms.length,
      hashed_artifacts: hashes.files.length,
    },
  };

  writeJson(path.join(bundleRoot, 'receipt.json'), receipt);

  const manifestExclude = new Set(
    (policy?.bundle?.manifest_exclude || []).map((value) =>
      normalizePath(value),
    ),
  );
  manifestExclude.add('manifest.json');

  const files = listFiles(bundleRoot)
    .map((filePath) => normalizePath(path.relative(bundleRoot, filePath)))
    .filter((relativePath) => !manifestExclude.has(relativePath));

  const fileEntries = files.map((relativePath) => {
    const fullPath = path.join(bundleRoot, relativePath);
    return {
      path: relativePath,
      sha256: sha256File(fullPath),
      size: fs.statSync(fullPath).size,
    };
  });

  const manifest = {
    schema_version: '1.0',
    repo: getRepoUrl(),
    sha,
    ref: getGitRef(),
    policy_sha256: sha256File(policyPath),
    tooling: {
      node: process.version,
      pnpm: getPnpmVersion(),
    },
    files: fileEntries.sort((a, b) => a.path.localeCompare(b.path)),
  };

  writeJson(path.join(bundleRoot, 'manifest.json'), manifest);

  console.log(`Evidence bundle assembled at ${bundleRoot}`);
};

main();
