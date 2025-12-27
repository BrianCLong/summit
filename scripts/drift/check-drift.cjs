#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEFAULT_BASELINE = 'config/drift-baseline.json';

const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (!arg.startsWith('--')) {
    continue;
  }
  const [rawKey, rawValue] = arg.replace(/^--/, '').split('=');
  const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  const value = rawValue ?? args[i + 1];
  if (rawValue === undefined && value && !value.startsWith('--')) {
    options[key] = value;
    i += 1;
  } else if (rawValue !== undefined) {
    options[key] = rawValue;
  } else {
    options[key] = true;
  }
}

const mode = options.mode || 'check';
const baselinePath = options.baseline || DEFAULT_BASELINE;
const snapshotPath = options.snapshot || 'artifacts/drift/deploy-snapshot.json';
const env = options.env || 'staging';
const reportPath = options.out || 'artifacts/drift/drift-report.json';
const metricsPath = options.metrics || 'artifacts/drift/drift-metrics.prom';
const failOnDrift = options.failOnDrift !== 'false';

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function sha256File(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function loadBaselineConfig() {
  if (!fs.existsSync(baselinePath)) {
    throw new Error(`Baseline config not found at ${baselinePath}`);
  }
  const raw = fs.readFileSync(baselinePath, 'utf8');
  const config = JSON.parse(raw);
  if (!Array.isArray(config.sources)) {
    throw new Error('Baseline config must include a sources array.');
  }
  return config;
}

function buildBaselineEntries(config) {
  const entries = [];
  for (const source of config.sources) {
    if (!Array.isArray(source.paths)) {
      continue;
    }
    for (const relativePath of source.paths) {
      if (!fs.existsSync(relativePath)) {
        throw new Error(`Baseline path missing: ${relativePath}`);
      }
      const stat = fs.statSync(relativePath);
      if (!stat.isFile()) {
        continue;
      }
      entries.push({
        path: relativePath,
        source: source.name,
        sha256: sha256File(relativePath),
        bytes: stat.size,
      });
    }
  }
  return entries;
}

function writeSnapshot(entries) {
  const snapshot = {
    env,
    generatedAt: new Date().toISOString(),
    entries,
  };
  ensureDir(snapshotPath);
  fs.writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Snapshot written to ${snapshotPath}`);
}

function loadSnapshot() {
  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`Snapshot not found at ${snapshotPath}`);
  }
  return JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
}

function compare(baselineEntries, snapshotEntries) {
  const baselineMap = new Map(baselineEntries.map(entry => [entry.path, entry]));
  const snapshotMap = new Map(snapshotEntries.map(entry => [entry.path, entry]));
  const drifts = [];

  for (const [pathKey, baseline] of baselineMap) {
    const snapshot = snapshotMap.get(pathKey);
    if (!snapshot) {
      drifts.push({
        path: pathKey,
        driftType: 'MISSING_IN_SNAPSHOT',
        expected: baseline.sha256,
        actual: null,
      });
      continue;
    }
    if (baseline.sha256 !== snapshot.sha256) {
      drifts.push({
        path: pathKey,
        driftType: 'HASH_MISMATCH',
        expected: baseline.sha256,
        actual: snapshot.sha256,
      });
    }
  }

  for (const [pathKey, snapshot] of snapshotMap) {
    if (!baselineMap.has(pathKey)) {
      drifts.push({
        path: pathKey,
        driftType: 'EXTRA_IN_SNAPSHOT',
        expected: null,
        actual: snapshot.sha256,
      });
    }
  }

  return drifts;
}

function writeReport(drifts) {
  const report = {
    env,
    generatedAt: new Date().toISOString(),
    driftDetected: drifts.length > 0,
    driftCount: drifts.length,
    drifts,
  };
  ensureDir(reportPath);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Drift report written to ${reportPath}`);
  return report;
}

function writeMetrics(report) {
  if (!metricsPath) {
    return;
  }
  ensureDir(metricsPath);
  const metrics = [
    `config_drift_detected{env="${env}"} ${report.driftDetected ? 1 : 0}`,
    `config_drift_mismatches_total{env="${env}"} ${report.driftCount}`,
  ].join('\n');
  fs.writeFileSync(metricsPath, `${metrics}\n`);
  console.log(`Metrics written to ${metricsPath}`);
}

function logSummary(report) {
  if (!report.driftDetected) {
    console.log('✅ No config drift detected.');
    return;
  }
  console.warn('⚠️  Config drift detected.');
  for (const drift of report.drifts) {
    console.warn(` - [${drift.driftType}] ${drift.path}`);
  }
}

try {
  const config = loadBaselineConfig();
  const baselineEntries = buildBaselineEntries(config);

  if (mode === 'snapshot') {
    writeSnapshot(baselineEntries);
    process.exit(0);
  }

  if (!fs.existsSync(snapshotPath)) {
    console.log(`Snapshot ${snapshotPath} not found. Generating baseline snapshot for comparison.`);
    writeSnapshot(baselineEntries);
  }

  const snapshot = loadSnapshot();
  const drifts = compare(baselineEntries, snapshot.entries || []);
  const report = writeReport(drifts);
  writeMetrics(report);
  logSummary(report);

  if (report.driftDetected && failOnDrift) {
    process.exitCode = 2;
  }
} catch (error) {
  console.error(`Drift check failed: ${error.message}`);
  process.exit(1);
}
