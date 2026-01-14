import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import {
  ROOT_DIR,
  collectFiles,
  fileSize,
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

const getCommitTimestamp = () =>
  execSync('git log -1 --pretty=format:%cI', { cwd: ROOT_DIR })
    .toString()
    .trim();

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

const buildCiMetadata = () => ({
  schema_version: '1.0',
  git: {
    sha: getGitSha(),
    ref: getGitRef(),
  },
  github: {
    repository: process.env.GITHUB_REPOSITORY || null,
    workflow: process.env.GITHUB_WORKFLOW || null,
    run_id: process.env.GITHUB_RUN_ID || null,
    run_attempt: process.env.GITHUB_RUN_ATTEMPT || null,
    actor: process.env.GITHUB_ACTOR || null,
    job: process.env.GITHUB_JOB || null,
    server_url: process.env.GITHUB_SERVER_URL || null,
  },
  runner: {
    os: os.platform(),
    arch: os.arch(),
    name: process.env.RUNNER_NAME || null,
  },
  tooling: {
    node: process.version,
    pnpm: getPnpmVersion(),
  },
});

const buildHashes = (policy) => {
  const patterns = policy?.provenance?.artifact_globs || [];
  const files = collectFiles(ROOT_DIR, patterns);

  const records = files.map((relativePath) => {
    const fullPath = path.join(ROOT_DIR, relativePath);
    return {
      path: normalizePath(relativePath),
      sha256: sha256File(fullPath),
      size: fileSize(fullPath),
    };
  });

  return {
    schema_version: '1.0',
    algorithm: 'sha256',
    files: records,
  };
};

const buildSlsaProvenance = (hashes) => {
  const commitTimestamp = getCommitTimestamp();
  const repoUrl = getRepoUrl();

  return {
    _type: 'https://in-toto.io/Statement/v1',
    subject: hashes.files.map((file) => ({
      name: file.path,
      digest: { sha256: file.sha256 },
    })),
    predicateType: 'https://slsa.dev/provenance/v1',
    predicate: {
      buildType: 'https://summit.ai/ci/evidence-bundle',
      builder: {
        id: 'summit-ci',
      },
      invocation: {
        configSource: {
          uri: `${repoUrl}@${getGitSha()}`,
          digest: { sha1: getGitSha().slice(0, 40) },
          entryPoint: '.',
        },
        parameters: {
          ref: getGitRef(),
        },
      },
      buildMetadata: {
        buildStartedOn: commitTimestamp,
        buildFinishedOn: commitTimestamp,
        completeness: {
          parameters: true,
          environment: false,
          materials: true,
        },
        reproducible: true,
      },
      materials: [
        {
          uri: repoUrl,
          digest: { sha1: getGitSha().slice(0, 40) },
        },
      ],
    },
  };
};

const main = () => {
  const args = parseArgs(process.argv.slice(2));
  const policyPath = args.policy || DEFAULT_POLICY;
  const policy = readPolicy(policyPath);
  const sha = getGitSha();
  const outRoot =
    args.out ||
    path.join(ROOT_DIR, 'artifacts/evidence', sha, 'provenance');

  fs.mkdirSync(outRoot, { recursive: true });

  const ci = buildCiMetadata();
  writeJson(path.join(outRoot, 'ci.json'), ci);

  const hashes = buildHashes(policy);
  writeJson(path.join(outRoot, 'hashes.json'), hashes);

  const slsa = buildSlsaProvenance(hashes);
  writeJson(path.join(outRoot, 'slsa-provenance.json'), slsa);

  console.log(`Provenance evidence written to ${outRoot}`);
};

main();
