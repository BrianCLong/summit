import { spawnSync, execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import yaml from 'js-yaml';
import { minimatch } from 'minimatch';

const DEFAULT_POLICY_PATH = 'docs/ci/REPRO_BUILD_POLICY.yml';
const DEFAULT_MODE = 'fast';
const MAX_DIFFS = 15;
const MAX_DIFF_BYTES = 50000;

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--policy') {
      options.policyPath = args[i + 1];
      i += 1;
    } else if (arg === '--mode') {
      options.mode = args[i + 1];
      i += 1;
    } else if (arg === '--sha') {
      options.sha = args[i + 1];
      i += 1;
    } else if (arg === '--out') {
      options.outDir = args[i + 1];
      i += 1;
    }
  }
  return options;
}

function inferMode() {
  const eventName = process.env.GITHUB_EVENT_NAME;
  const ref = process.env.GITHUB_REF;
  if (eventName === 'pull_request' || eventName === 'pull_request_target') {
    return 'fast';
  }
  if (eventName === 'schedule' || eventName === 'workflow_dispatch') {
    return 'full';
  }
  if (ref === 'refs/heads/main') {
    return 'full';
  }
  return DEFAULT_MODE;
}

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function toPosixPath(value) {
  return value.split(path.sep).join('/');
}

function loadPolicy(policyPath) {
  const raw = fs.readFileSync(policyPath, 'utf8');
  const policy = yaml.load(raw);
  if (!policy || typeof policy !== 'object') {
    throw new Error('Policy file is empty or invalid YAML.');
  }
  if (policy.schema_version !== '1') {
    throw new Error('Policy schema_version must be "1".');
  }
  if (!policy.modes || typeof policy.modes !== 'object') {
    throw new Error('Policy modes are required.');
  }
  if (!policy.normalization || typeof policy.normalization !== 'object') {
    throw new Error('Policy normalization section is required.');
  }
  if (policy.normalization.binary_handling !== 'hash-only') {
    throw new Error('Policy normalization binary_handling must be "hash-only".');
  }
  if (!policy.output || typeof policy.output !== 'object') {
    throw new Error('Policy output section is required.');
  }
  return { policy, raw };
}

function validateMode(policy, mode) {
  const modeConfig = policy.modes[mode];
  if (!modeConfig) {
    throw new Error(`Mode ${mode} is not defined in policy.`);
  }
  if (!Array.isArray(modeConfig.workspaces)) {
    throw new Error(`Mode ${mode} must define workspaces.`);
  }
  if (!Array.isArray(modeConfig.artifact_globs)) {
    throw new Error(`Mode ${mode} must define artifact_globs.`);
  }
  return modeConfig;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function runCommand(command, args, options) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

function runCommandCapture(command, args, options) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
  return result.stdout ?? '';
}

function getGitSha() {
  return runCommandCapture('git', ['rev-parse', 'HEAD'], { stdio: ['ignore', 'pipe', 'inherit'] }).trim();
}

function copyRepoTo(targetDir, sha) {
  try {
    execSync(`git archive --format=tar ${sha} | tar -x -C ${targetDir}`);
    return;
  } catch (error) {
    const rsyncArgs = [
      '-a',
      '--delete',
      '--exclude',
      '.git',
      '--exclude',
      'node_modules',
      '--exclude',
      'artifacts',
      '--exclude',
      '.repro-build',
      './',
      targetDir,
    ];
    runCommand('rsync', rsyncArgs, { cwd: process.cwd() });
  }
}

function listFiles(rootDir, excludedDirs) {
  const entries = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    const dirents = fs.readdirSync(current, { withFileTypes: true });
    for (const dirent of dirents) {
      const fullPath = path.join(current, dirent.name);
      if (dirent.isDirectory()) {
        if (excludedDirs.has(dirent.name)) {
          continue;
        }
        stack.push(fullPath);
      } else if (dirent.isFile()) {
        entries.push(fullPath);
      }
    }
  }
  return entries;
}

function isBinary(buffer) {
  const sampleSize = Math.min(buffer.length, 8000);
  for (let i = 0; i < sampleSize; i += 1) {
    if (buffer[i] === 0) {
      return true;
    }
  }
  return false;
}

function compileNormalizations(normalizations) {
  return normalizations.map((rule) => ({
    id: rule.id,
    regex: new RegExp(rule.pattern, 'g'),
    replace: rule.replace ?? '',
  }));
}

function applyNormalizations(text, rules) {
  let output = text;
  for (const rule of rules) {
    rule.regex.lastIndex = 0;
    output = output.replace(rule.regex, rule.replace);
  }
  return output;
}

function collectIndicators(text, rules) {
  const indicators = [];
  for (const rule of rules) {
    rule.regex.lastIndex = 0;
    const matches = text.match(rule.regex);
    if (matches && matches.length > 0) {
      indicators.push({ id: rule.id, count: matches.length });
    }
  }
  return indicators;
}

function collectArtifacts(rootDir, policy, modeConfig) {
  const ignoreGlobs = policy.normalization.ignore_globs ?? [];
  const normalizations = compileNormalizations(policy.normalization.text_normalizations ?? []);
  const artifactPatterns = modeConfig.artifact_globs;
  const excludedDirs = new Set(['node_modules', '.git', '.pnpm-store']);
  const allFiles = listFiles(rootDir, excludedDirs);
  const artifacts = [];
  const indicatorHits = [];
  let totalBytes = 0;

  for (const filePath of allFiles) {
    const relPath = toPosixPath(path.relative(rootDir, filePath));
    if (!artifactPatterns.some((pattern) => minimatch(relPath, pattern, { dot: true }))) {
      continue;
    }
    if (ignoreGlobs.some((pattern) => minimatch(relPath, pattern, { dot: true }))) {
      continue;
    }

    const buffer = fs.readFileSync(filePath);
    const size = buffer.length;
    totalBytes += size;
    const record = {
      path: relPath,
      size,
      digest: '',
      text: false,
    };

    if (!isBinary(buffer)) {
      const text = buffer.toString('utf8');
      const indicators = collectIndicators(text, normalizations);
      if (indicators.length > 0) {
        indicatorHits.push({ path: relPath, indicators });
      }
      const normalized = applyNormalizations(text, normalizations);
      record.digest = sha256(normalized);
      record.text = true;
    } else {
      record.digest = sha256(buffer);
    }

    artifacts.push(record);
  }

  if (modeConfig.max_total_bytes && totalBytes > modeConfig.max_total_bytes) {
    throw new Error(`Artifact size ${totalBytes} exceeds max_total_bytes ${modeConfig.max_total_bytes}.`);
  }

  artifacts.sort((a, b) => a.path.localeCompare(b.path));
  indicatorHits.sort((a, b) => a.path.localeCompare(b.path));

  return { artifacts, indicatorHits, totalBytes };
}

function buildWorkspaceFilters(workspaces) {
  if (workspaces.length === 1 && workspaces[0] === '*') {
    return [];
  }
  return workspaces.map((ws) => (ws.startsWith('.') ? ws : `./${ws}`));
}

function runBuild(rootDir, workspaces, offline) {
  const installArgs = ['install', '--frozen-lockfile'];
  if (offline) {
    installArgs.push('--offline');
  }
  installArgs.push('--store-dir', path.join(rootDir, '.pnpm-store'));
  runCommand('pnpm', installArgs, { cwd: rootDir });

  const filters = buildWorkspaceFilters(workspaces);
  const buildArgs = ['-r'];
  for (const filter of filters) {
    buildArgs.push('--filter', filter);
  }
  buildArgs.push('build');
  runCommand('pnpm', buildArgs, { cwd: rootDir });
}

function loadNormalizedText(rootDir, relPath, rules) {
  const filePath = path.join(rootDir, relPath);
  const text = fs.readFileSync(filePath, 'utf8');
  return applyNormalizations(text, rules);
}

function detectLineOrderingVariance(textA, textB) {
  const linesA = textA.split(/\r?\n/);
  const linesB = textB.split(/\r?\n/);
  if (linesA.length !== linesB.length) {
    return false;
  }
  const sortedA = [...linesA].sort();
  const sortedB = [...linesB].sort();
  return sortedA.join('\n') === sortedB.join('\n');
}

function safeDiffName(relPath) {
  return relPath.replace(/[\/]/g, '__');
}

function writeDiff(diffDir, relPath, contentA, contentB) {
  ensureDir(diffDir);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repro-diff-'));
  const fileA = path.join(tempDir, 'run1.txt');
  const fileB = path.join(tempDir, 'run2.txt');
  fs.writeFileSync(fileA, contentA, 'utf8');
  fs.writeFileSync(fileB, contentB, 'utf8');

  let diffOutput = '';
  try {
    const result = spawnSync('diff', ['-u', fileA, fileB], { encoding: 'utf8' });
    if (result.status === 0 || result.status === 1) {
      diffOutput = result.stdout ?? '';
    } else {
      diffOutput = result.stderr ?? `diff command failed for ${relPath}.\n`;
    }
  } catch (error) {
    diffOutput = `diff command failed for ${relPath}.\n`;
  }

  if (diffOutput.length > MAX_DIFF_BYTES) {
    diffOutput = `${diffOutput.slice(0, MAX_DIFF_BYTES)}\n...diff truncated...\n`;
  }

  fs.rmSync(tempDir, { recursive: true, force: true });
  const diffFile = path.join(diffDir, `${safeDiffName(relPath)}.diff`);
  fs.writeFileSync(diffFile, diffOutput, 'utf8');
  return path.relative(process.cwd(), diffFile);
}

function buildReport({ sha, mode, policyPath, policyHash, run1, run2, comparison, indicators }) {
  return {
    schema_version: '1',
    sha,
    mode,
    policy: {
      path: policyPath,
      hash: policyHash,
    },
    artifact_summary: {
      run1: {
        count: run1.artifacts.length,
        total_bytes: run1.totalBytes,
      },
      run2: {
        count: run2.artifacts.length,
        total_bytes: run2.totalBytes,
      },
    },
    comparison,
    nondeterminism_indicators: indicators,
  };
}

function writeReportMarkdown(outDir, report, status) {
  const lines = [];
  lines.push(`# Reproducible Build Report (${status})`);
  lines.push('');
  lines.push(`- Commit: ${report.sha}`);
  lines.push(`- Mode: ${report.mode}`);
  lines.push(`- Policy: ${report.policy.path}`);
  lines.push('');
  lines.push('## Summary');
  lines.push(`- Run 1 artifacts: ${report.artifact_summary.run1.count} (${report.artifact_summary.run1.total_bytes} bytes)`);
  lines.push(`- Run 2 artifacts: ${report.artifact_summary.run2.count} (${report.artifact_summary.run2.total_bytes} bytes)`);
  lines.push(`- Missing in run2: ${report.comparison.missing_in_run2.length}`);
  lines.push(`- Extra in run2: ${report.comparison.extra_in_run2.length}`);
  lines.push(`- Digest mismatches: ${report.comparison.digest_mismatches.length}`);
  lines.push(`- Indicators: ${report.nondeterminism_indicators.summary.total_hits}`);
  lines.push('');

  if (report.comparison.missing_in_run2.length > 0) {
    lines.push('## Missing in Run 2');
    report.comparison.missing_in_run2.forEach((entry) => lines.push(`- ${entry}`));
    lines.push('');
  }

  if (report.comparison.extra_in_run2.length > 0) {
    lines.push('## Extra in Run 2');
    report.comparison.extra_in_run2.forEach((entry) => lines.push(`- ${entry}`));
    lines.push('');
  }

  if (report.comparison.digest_mismatches.length > 0) {
    lines.push('## Digest Mismatches');
    report.comparison.digest_mismatches.forEach((entry) => {
      lines.push(`- ${entry.path}`);
    });
    lines.push('');
  }

  if (report.nondeterminism_indicators.summary.total_hits > 0) {
    lines.push('## Nondeterminism Indicators');
    report.nondeterminism_indicators.entries.forEach((entry) => {
      const indicators = entry.indicators.map((item) => `${item.id}(${item.count})`).join(', ');
      lines.push(`- ${entry.path}: ${indicators}`);
    });
    lines.push('');
  }

  lines.push('## Remediation Suggestions');
  lines.push('- Remove embedded timestamps or inject deterministic build metadata.');
  lines.push('- Ensure deterministic file ordering (stable sort, fixed locale, fixed seed).');
  lines.push('- Audit bundler config for nondeterministic chunk hashing or build IDs.');
  lines.push('');

  fs.writeFileSync(path.join(outDir, 'report.md'), `${lines.join('\n')}\n`, 'utf8');
}

function main() {
  const options = parseArgs(process.argv);
  const policyPath = options.policyPath ?? DEFAULT_POLICY_PATH;
  const { policy, raw } = loadPolicy(policyPath);
  const policyHash = sha256(raw);
  const sha = options.sha ?? getGitSha();
  const mode = options.mode ?? inferMode();
  const modeConfig = validateMode(policy, mode);
  const outDirTemplate = options.outDir ?? policy.output.out_dir;
  const outDir = outDirTemplate.replace(/\$\{sha\}/g, sha);

  const rootWorkDir = path.join(process.cwd(), '.repro-build');
  const run1Dir = path.join(rootWorkDir, 'run1');
  const run2Dir = path.join(rootWorkDir, 'run2');

  fs.rmSync(rootWorkDir, { recursive: true, force: true });
  ensureDir(run1Dir);
  ensureDir(run2Dir);

  copyRepoTo(run1Dir, sha);
  copyRepoTo(run2Dir, sha);

  const offline = process.env.REPRO_BUILD_OFFLINE === '1';
  runBuild(run1Dir, modeConfig.workspaces, offline);
  runBuild(run2Dir, modeConfig.workspaces, offline);

  const run1 = collectArtifacts(run1Dir, policy, modeConfig);
  const run2 = collectArtifacts(run2Dir, policy, modeConfig);
  if (run1.artifacts.length === 0 || run2.artifacts.length === 0) {
    throw new Error('No artifacts collected; check policy artifact globs and build outputs.');
  }

  const map1 = new Map(run1.artifacts.map((entry) => [entry.path, entry]));
  const map2 = new Map(run2.artifacts.map((entry) => [entry.path, entry]));
  const missingInRun2 = [];
  const extraInRun2 = [];
  const digestMismatches = [];
  const diffEntries = [];
  const orderingIndicators = [];

  for (const pathKey of map1.keys()) {
    if (!map2.has(pathKey)) {
      missingInRun2.push(pathKey);
    }
  }
  for (const pathKey of map2.keys()) {
    if (!map1.has(pathKey)) {
      extraInRun2.push(pathKey);
    }
  }

  const normalizationRules = compileNormalizations(policy.normalization.text_normalizations ?? []);
  const diffDir = path.join(outDir, 'diffs');

  for (const [pathKey, entry1] of map1.entries()) {
    const entry2 = map2.get(pathKey);
    if (!entry2) {
      continue;
    }
    if (entry1.digest !== entry2.digest) {
      digestMismatches.push({
        path: pathKey,
        run1_digest: entry1.digest,
        run2_digest: entry2.digest,
      });
      if (entry1.text && entry2.text && diffEntries.length < MAX_DIFFS) {
        const textA = loadNormalizedText(run1Dir, pathKey, normalizationRules);
        const textB = loadNormalizedText(run2Dir, pathKey, normalizationRules);
        if (detectLineOrderingVariance(textA, textB)) {
          orderingIndicators.push({ path: pathKey, type: 'unstable_line_ordering' });
        }
        const diffPath = writeDiff(diffDir, pathKey, textA, textB);
        diffEntries.push({ path: pathKey, diff: diffPath });
      }
    }
  }

  missingInRun2.sort();
  extraInRun2.sort();
  digestMismatches.sort((a, b) => a.path.localeCompare(b.path));
  diffEntries.sort((a, b) => a.path.localeCompare(b.path));
  orderingIndicators.sort((a, b) => a.path.localeCompare(b.path));

  const indicatorEntries = run1.indicatorHits.map((entry) => ({
    path: entry.path,
    indicators: entry.indicators,
  }));
  const indicatorSummary = {
    total_hits: indicatorEntries.reduce((acc, entry) => acc + entry.indicators.reduce((sum, item) => sum + item.count, 0), 0),
  };

  const bundlerVariancePaths = [...missingInRun2, ...extraInRun2].filter((item) => /[.-][a-f0-9]{8,}(?=\.)/i.test(item));

  const comparison = {
    missing_in_run2: missingInRun2,
    extra_in_run2: extraInRun2,
    digest_mismatches: digestMismatches,
    diff_samples: diffEntries,
    bundler_variance_paths: bundlerVariancePaths.sort(),
  };

  const indicators = {
    summary: indicatorSummary,
    entries: indicatorEntries,
    unstable_line_ordering: orderingIndicators,
  };

  const hasIndicatorHits = indicatorSummary.total_hits > 0;
  const hasOrderingVariance = orderingIndicators.length > 0;
  const hasMismatches = missingInRun2.length > 0 || extraInRun2.length > 0 || digestMismatches.length > 0;
  const status = hasMismatches || hasIndicatorHits || hasOrderingVariance ? 'non-reproducible' : 'reproducible';

  ensureDir(outDir);
  const report = buildReport({
    sha,
    mode,
    policyPath,
    policyHash,
    run1,
    run2,
    comparison,
    indicators,
  });
  const reportJson = `${JSON.stringify(report, null, 2)}\n`;
  fs.writeFileSync(path.join(outDir, 'report.json'), reportJson, 'utf8');
  writeReportMarkdown(outDir, report, status);

  const reportHash = sha256(reportJson);
  const stamp = {
    status,
    sha,
    mode,
    policy_hash: policyHash,
    report_hash: reportHash,
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(outDir, 'stamp.json'), `${JSON.stringify(stamp, null, 2)}\n`, 'utf8');

  if (status === 'non-reproducible') {
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  console.error('Repro build gate failed:', error.message);
  process.exit(2);
}
