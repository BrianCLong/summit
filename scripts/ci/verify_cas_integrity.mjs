import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256File, stableStringify } from './lib/cas.mjs';

const parseArgs = (argv) => {
  const args = {
    cas: 'artifacts/cas',
    mode: 'all',
    run: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--cas') {
      args.cas = argv[i + 1];
      i += 1;
    } else if (arg === '--mode') {
      args.mode = argv[i + 1];
      i += 1;
    } else if (arg === '--run') {
      args.run = argv[i + 1];
      i += 1;
    }
  }

  return args;
};

const resolveCommitSha = () => {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  if (process.env.COMMIT_SHA) return process.env.COMMIT_SHA;
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
  if (result.status === 0 && result.stdout) {
    return result.stdout.trim();
  }
  return null;
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

const verifyCas = async (casRoot, errors) => {
  const casDir = path.join(casRoot, 'sha256');
  let blobsChecked = 0;

  let files = [];
  try {
    files = await listFiles(casDir);
  } catch (error) {
    errors.push({
      type: 'cas-missing',
      message: `CAS directory not found at ${casDir}`,
    });
    return { blobsChecked };
  }

  const blobs = files.filter((file) => file.endsWith('.blob'));

  for (const blobPath of blobs) {
    blobsChecked += 1;
    const digest = path.basename(blobPath, '.blob');
    const expectedDir = path.join(
      casDir,
      digest.slice(0, 2),
      digest.slice(2, 4),
    );
    if (!blobPath.startsWith(expectedDir)) {
      errors.push({
        type: 'cas-path-mismatch',
        path: blobPath,
        message: `CAS blob path does not match digest ${digest}`,
      });
      continue;
    }

    const actualDigest = await sha256File(blobPath);
    if (actualDigest !== digest) {
      errors.push({
        type: 'cas-digest-mismatch',
        path: blobPath,
        expected: digest,
        actual: actualDigest,
      });
    }
  }

  return { blobsChecked };
};

const verifyRun = async (runRoot, casRoot, errors) => {
  const manifestPath = path.join(runRoot, 'run-manifest.json');
  let runManifest;

  try {
    const manifestRaw = await fs.readFile(manifestPath, 'utf8');
    runManifest = JSON.parse(manifestRaw);
  } catch (error) {
    errors.push({
      type: 'run-manifest-missing',
      path: manifestPath,
      message: 'Run manifest not found or invalid JSON',
    });
    return { runFilesChecked: 0 };
  }

  const runFiles = Array.isArray(runManifest.files) ? runManifest.files : [];
  let runFilesChecked = 0;

  for (const entry of runFiles) {
    const filePath = path.join(runRoot, entry.path);
    const casPath = path.join(casRoot, entry.cas);

    runFilesChecked += 1;

    try {
      await fs.access(filePath);
    } catch (error) {
      errors.push({
        type: 'run-file-missing',
        path: entry.path,
        message: 'Run file missing in run directory',
      });
      continue;
    }

    const actualDigest = await sha256File(filePath);
    if (actualDigest !== entry.sha256) {
      errors.push({
        type: 'run-file-digest-mismatch',
        path: entry.path,
        expected: entry.sha256,
        actual: actualDigest,
      });
    }

    try {
      await fs.access(casPath);
    } catch (error) {
      errors.push({
        type: 'cas-reference-missing',
        path: entry.cas,
        message: 'CAS blob missing for run file',
      });
      continue;
    }

    const casDigest = await sha256File(casPath);
    if (casDigest !== entry.sha256) {
      errors.push({
        type: 'cas-reference-digest-mismatch',
        path: entry.cas,
        expected: entry.sha256,
        actual: casDigest,
      });
    }
  }

  return { runFilesChecked };
};

const buildReportMarkdown = (report) => {
  const lines = [
    '# CAS Integrity Report',
    '',
    `Status: ${report.status.toUpperCase()}`,
    `Mode: ${report.mode}`,
    `CAS Root: ${report.cas_root}`,
    report.run_root ? `Run Root: ${report.run_root}` : null,
    '',
    '## Stats',
    `- CAS blobs checked: ${report.stats.cas_blobs_checked}`,
    `- Run files checked: ${report.stats.run_files_checked}`,
    '',
  ].filter(Boolean);

  if (report.errors.length) {
    lines.push('## Errors');
    report.errors.forEach((error) => {
      lines.push(`- ${error.type}: ${error.path ?? ''}`.trim());
    });
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const errors = [];
  const startedAt = new Date().toISOString();
  const sha = resolveCommitSha();
  const runId = sha || `manual-${startedAt.replace(/[:.]/g, '')}`;
  const outputDir = path.join('artifacts', 'governance', 'cas-verify', runId);

  let casStats = { blobsChecked: 0 };
  let runStats = { runFilesChecked: 0 };

  if (args.mode === 'cas-only' || args.mode === 'all') {
    casStats = await verifyCas(args.cas, errors);
  }

  if (args.mode === 'run-only' || args.mode === 'all') {
    if (!args.run) {
      errors.push({
        type: 'run-root-missing',
        message: 'Run root is required for run-only or all mode',
      });
    } else {
      runStats = await verifyRun(args.run, args.cas, errors);
    }
  }

  const status = errors.length === 0 ? 'passed' : 'failed';
  const finishedAt = new Date().toISOString();

  const report = {
    schema_version: '1',
    sha: sha ?? 'unknown',
    mode: args.mode,
    cas_root: args.cas,
    run_root: args.run,
    started_at: startedAt,
    finished_at: finishedAt,
    status,
    stats: {
      cas_blobs_checked: casStats.blobsChecked,
      run_files_checked: runStats.runFilesChecked,
    },
    errors,
  };

  const stamp = {
    sha: sha ?? 'unknown',
    status,
    created_at: finishedAt,
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(
    path.join(outputDir, 'report.json'),
    stableStringify(report),
  );
  await fs.writeFile(
    path.join(outputDir, 'report.md'),
    buildReportMarkdown(report),
  );
  await fs.writeFile(
    path.join(outputDir, 'stamp.json'),
    stableStringify(stamp),
  );

  if (status === 'failed') {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
