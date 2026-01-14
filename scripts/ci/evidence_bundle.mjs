import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_OUT_ROOT = 'artifacts/evidence';

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--sha') {
      options.sha = args[i + 1];
      i += 1;
    } else if (arg === '--out') {
      options.out = args[i + 1];
      i += 1;
    } else if (arg === '--ref') {
      options.ref = args[i + 1];
      i += 1;
    } else if (arg === '--run-id') {
      options.runId = args[i + 1];
      i += 1;
    }
  }
  return options;
}

function getGitSha() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
  return result.stdout?.trim() || 'unknown';
}

function resolveTimestamp() {
  const sourceEpoch = process.env.SOURCE_DATE_EPOCH;
  if (sourceEpoch) {
    const millis = Number(sourceEpoch) * 1000;
    if (!Number.isNaN(millis)) {
      return new Date(millis).toISOString();
    }
  }
  return new Date().toISOString();
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function sha256File(filePath) {
  const content = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function resolveRepoUrl() {
  const envRepo = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`
    : null;
  return envRepo ?? 'https://example.invalid/summit';
}

async function buildSbom(outputPath, sha, timestamp) {
  const sbom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.4',
    serialNumber: `urn:sha256:${sha}`,
    version: 1,
    metadata: {
      timestamp,
      tools: [
        {
          vendor: 'Summit',
          name: 'evidence-bundle',
          version: '1.0.0',
        },
      ],
      component: {
        type: 'application',
        name: 'intelgraph-platform',
        version: '4.x',
      },
    },
    components: [],
  };

  await writeJson(outputPath, sbom);
}

async function buildProvenance(outputPath, sha, sbomPath, timestamp, runId, ref) {
  const sbomDigest = await sha256File(sbomPath);
  const provenance = {
    subject: [
      {
        name: 'intelgraph-platform',
        digest: { sha256: sbomDigest },
      },
    ],
    builder: {
      id: 'summit-ci',
    },
    invocation: {
      configSource: {
        uri: `git+${resolveRepoUrl()}`,
        digest: { sha1: sha },
      },
      environment: {
        ref,
      },
    },
    metadata: {
      buildInvocationId: runId,
      buildStartedOn: timestamp,
      buildFinishedOn: timestamp,
    },
    sha,
  };

  await writeJson(outputPath, provenance);
}

async function buildManifest(outputPath, sha, timestamp, entries, ref, runId) {
  const manifest = {
    schema_version: '1',
    sha,
    generated_at: timestamp,
    metadata: {
      ref,
      run_id: runId,
    },
    entries,
  };
  await writeJson(outputPath, manifest);
}

async function main() {
  const options = parseArgs(process.argv);
  const sha = options.sha ?? process.env.GITHUB_SHA ?? getGitSha();
  const ref = options.ref ?? process.env.GITHUB_REF ?? process.env.GITHUB_REF_NAME ?? 'local';
  const runId = options.runId ?? process.env.GITHUB_RUN_ID ?? 'local';
  const timestamp = resolveTimestamp();

  const outRoot = options.out ?? DEFAULT_OUT_ROOT;
  const baseDir = path.join(outRoot, sha);

  const sbomPath = path.join(baseDir, 'sbom', 'monorepo.cdx.json');
  const provenancePath = path.join(baseDir, 'provenance', 'slsa-provenance.json');

  await buildSbom(sbomPath, sha, timestamp);
  await buildProvenance(provenancePath, sha, sbomPath, timestamp, runId, ref);

  const entries = [
    {
      id: 'sbom_monorepo',
      path: path.relative(process.cwd(), sbomPath),
      sha256: await sha256File(sbomPath),
      producer: 'pnpm ci:evidence:bundle',
    },
    {
      id: 'slsa_provenance',
      path: path.relative(process.cwd(), provenancePath),
      sha256: await sha256File(provenancePath),
      producer: 'pnpm ci:evidence:bundle',
    },
  ].sort((a, b) => a.id.localeCompare(b.id));

  const manifestPath = path.join(baseDir, 'manifest.json');
  await buildManifest(manifestPath, sha, timestamp, entries, ref, runId);

  console.log(`Evidence bundle generated at ${baseDir}`);
}

main().catch((error) => {
  console.error(error?.stack ?? error);
  process.exit(2);
});
