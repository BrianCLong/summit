#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  casConstants,
  casPathForDigest,
  sha256File,
} from './lib/cas.mjs';

const parseArgs = (argv) => {
  const config = {
    casRoot: path.join('artifacts', 'cas'),
    runRoot: null,
    mode: 'all',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--cas') {
      config.casRoot = argv[++i];
    } else if (arg === '--run') {
      config.runRoot = argv[++i];
    } else if (arg === '--mode') {
      config.mode = argv[++i];
    }
  }

  return config;
};

const resolveGitSha = () => {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
  return result.status === 0 ? result.stdout.trim() : null;
};

const normalizePath = (value) => value.split(path.sep).join('/');

const listCasBlobs = async (casRoot) => {
  const root = path.join(casRoot, casConstants.namespace);
  const blobs = [];

  const walk = async (dir) => {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
      } else if (entry.isFile() && entry.name.endsWith('.blob')) {
        blobs.push(entryPath);
      }
    }
  };

  await walk(root);
  return blobs.sort();
};

const loadRunManifest = async (runRoot) => {
  const manifestPath = path.join(runRoot, 'run-manifest.json');
  const raw = await fs.readFile(manifestPath, 'utf8');
  return JSON.parse(raw);
};

const verifyCas = async (casRoot, report) => {
  const blobs = await listCasBlobs(casRoot);
  for (const blob of blobs) {
    const digest = path.basename(blob, '.blob');
    const expectedPath = casPathForDigest(digest);
    const actualRelative = normalizePath(
      path.relative(path.resolve(casRoot), blob),
    );
    if (actualRelative !== expectedPath) {
      report.errors.push({
        type: 'cas-path-mismatch',
        path: actualRelative,
        expected: expectedPath,
      });
      continue;
    }
    const computed = await sha256File(blob);
    if (computed !== digest) {
      report.errors.push({
        type: 'cas-digest-mismatch',
        path: actualRelative,
        expected: digest,
        actual: computed,
      });
    }
    report.cas.checked += 1;
  }
};

const verifyRun = async (runRoot, casRoot, report) => {
  let manifest;
  try {
    manifest = await loadRunManifest(runRoot);
  } catch (error) {
    report.errors.push({
      type: 'run-manifest-missing',
      path: path.join(runRoot, 'run-manifest.json'),
      message: error?.message || 'Unable to load run manifest',
    });
    return;
  }
  report.run.manifest = manifest;

  for (const entry of manifest.files || []) {
    const runPath = path.join(runRoot, entry.path);
    const runExists = await fs
      .access(runPath)
      .then(() => true)
      .catch(() => false);

    if (!runExists && !manifest.thin_mode) {
      report.errors.push({
        type: 'run-missing-file',
        path: entry.path,
      });
      continue;
    }

    if (runExists) {
      const computed = await sha256File(runPath);
      if (computed !== entry.sha256) {
        report.errors.push({
          type: 'run-digest-mismatch',
          path: entry.path,
          expected: entry.sha256,
          actual: computed,
        });
      }
    }

    const casPath = path.join(casRoot, entry.cas);
    const casExists = await fs
      .access(casPath)
      .then(() => true)
      .catch(() => false);

    if (!casExists) {
      report.errors.push({
        type: 'cas-missing-blob',
        path: entry.cas,
        runPath: entry.path,
      });
      continue;
    }

    const casDigest = await sha256File(casPath);
    if (casDigest !== entry.sha256) {
      report.errors.push({
        type: 'cas-digest-mismatch',
        path: entry.cas,
        expected: entry.sha256,
        actual: casDigest,
      });
    }
    report.run.checked += 1;
  }
};

const formatReportMarkdown = (report) => {
  const lines = [
    '# CAS Integrity Report',
    '',
    `- Status: ${report.status}`,
    `- Mode: ${report.mode}`,
    `- Run Root: ${report.run.root || 'N/A'}`,
    `- CAS Root: ${report.cas.root}`,
    `- CAS Blobs Checked: ${report.cas.checked}`,
    `- Run Files Checked: ${report.run.checked}`,
    `- Errors: ${report.errors.length}`,
    '',
  ];

  if (report.errors.length) {
    lines.push('## Errors');
    report.errors.forEach((error, index) => {
      lines.push(`- ${index + 1}. ${error.type}: ${error.path || ''}`);
    });
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
};

const writeOutputs = async (outputDir, report, stamp) => {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(
    path.join(outputDir, 'report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  await fs.writeFile(
    path.join(outputDir, 'report.md'),
    formatReportMarkdown(report),
  );
  await fs.writeFile(
    path.join(outputDir, 'stamp.json'),
    `${JSON.stringify(stamp, null, 2)}\n`,
  );
};

const main = async () => {
  const { casRoot, runRoot, mode } = parseArgs(process.argv.slice(2));
  const startedAt = new Date().toISOString();

  const report = {
    schema_version: '1',
    status: 'running',
    mode,
    started_at: startedAt,
    finished_at: null,
    cas: {
      root: casRoot,
      checked: 0,
    },
    run: {
      root: runRoot,
      checked: 0,
      manifest: null,
    },
    errors: [],
  };

  let manifestSha = null;
  let status = 'passed';
  let exitCode = 0;

  try {
    const casExists = await fs
      .access(casRoot)
      .then(() => true)
      .catch(() => false);
    if (!casExists) {
      report.errors.push({
        type: 'cas-root-missing',
        path: casRoot,
      });
    }

    if (mode === 'cas-only' || mode === 'all') {
      await verifyCas(casRoot, report);
    }

    if ((mode === 'run-only' || mode === 'all') && runRoot) {
      await verifyRun(runRoot, casRoot, report);
      manifestSha = report.run.manifest?.sha || null;
    } else if (mode !== 'cas-only' && !runRoot) {
      report.errors.push({
        type: 'run-root-missing',
        message: 'Run root required for run-only or all mode',
      });
    }
  } catch (error) {
    status = 'error';
    exitCode = 2;
    report.errors.push({
      type: 'operational-error',
      message: error?.message || 'Unknown error',
    });
  }

  if (report.errors.length && exitCode === 0) {
    status = 'failed';
    exitCode = 1;
  }

  report.status = status;
  report.finished_at = new Date().toISOString();

  const sha = manifestSha || resolveGitSha();
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '')
    .replace('Z', 'Z');
  const suffix = sha ? sha : `manual-${timestamp}`;
  const outputDir = path.join('artifacts', 'governance', 'cas-verify', suffix);

  const stamp = {
    sha: sha || null,
    started_at: startedAt,
    finished_at: report.finished_at,
    status,
    mode,
    run_root: runRoot,
    cas_root: casRoot,
    error_count: report.errors.length,
  };

  await writeOutputs(outputDir, report, stamp);
  process.exit(exitCode);
};

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
