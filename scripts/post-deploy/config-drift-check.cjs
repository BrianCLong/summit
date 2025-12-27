#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const args = new Set(process.argv.slice(2));
const getArgValue = (flag) => {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
};

const configPath = process.env.DRIFT_CONFIG || 'config/drift-baseline.json';
const envName = getArgValue('--env') || process.env.DRIFT_ENV || 'staging';
const outputDir = process.env.DRIFT_OUTPUT_DIR || 'artifacts/drift';
const forceMismatch = args.has('--simulate-mismatch') || process.env.DRIFT_FORCE_MISMATCH === '1';
const writeSnapshot = args.has('--write-snapshot');
const failOnDrift = process.env.DRIFT_FAIL_ON_DRIFT !== '0';

const readConfig = () => {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
};

const collectFiles = (dir, extensions, rootDir = dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, extensions, rootDir));
    } else if (extensions.includes(path.extname(entry.name))) {
      files.push(path.relative(rootDir, fullPath));
    }
  }
  return files;
};

const hashFiles = (basePath, files) => {
  const hash = crypto.createHash('sha256');
  for (const file of files) {
    const content = fs.readFileSync(path.join(basePath, file));
    hash.update(file);
    hash.update(content);
  }
  return hash.digest('hex');
};

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const main = () => {
  const config = readConfig();
  const baseline = config.baseline;
  const snapshotPath = config.snapshots?.[envName];

  if (!snapshotPath) {
    throw new Error(`No snapshot path configured for env: ${envName}`);
  }

  const basePath = baseline.path;
  const extensions = baseline.extensions || ['.yaml', '.yml'];
  const files = collectFiles(basePath, extensions).sort();
  const baselineHash = hashFiles(basePath, files);

  if (writeSnapshot) {
    ensureDir(path.dirname(snapshotPath));
    const snapshot = {
      env: envName,
      baseline: {
        name: baseline.name,
        path: basePath,
        fileCount: files.length
      },
      baselineHash,
      generatedAt: new Date().toISOString()
    };
    fs.writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
    console.log(`✅ Wrote snapshot to ${snapshotPath}`);
    return;
  }

  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`Snapshot not found: ${snapshotPath}`);
  }

  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  const snapshotHash = snapshot.baselineHash;
  const drifted = forceMismatch || snapshotHash !== baselineHash;

  ensureDir(outputDir);

  const report = {
    env: envName,
    baseline: {
      name: baseline.name,
      path: basePath,
      fileCount: files.length
    },
    baselineHash,
    snapshotHash,
    drifted,
    checkedAt: new Date().toISOString()
  };

  const reportPath = path.join(outputDir, 'config-drift-summary.json');
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  const alertPayload = {
    alert: 'IntelGraphConfigDriftDetected',
    severity: drifted ? 'critical' : 'none',
    env: envName,
    source: baseline.name,
    detected: drifted,
    reportPath,
    detectedAt: report.checkedAt
  };
  const alertPath = path.join(outputDir, 'config-drift-alert.json');
  fs.writeFileSync(alertPath, `${JSON.stringify(alertPayload, null, 2)}\n`);

  const metricLines = [
    '# HELP intelgraph_config_drift_detected Config drift detected between Git baseline and deployed snapshot.',
    '# TYPE intelgraph_config_drift_detected gauge',
    `intelgraph_config_drift_detected{env="${envName}",source="${baseline.name}"} ${drifted ? 1 : 0}`
  ];
  const metricsPath = path.join(outputDir, 'config-drift.prom');
  fs.writeFileSync(metricsPath, `${metricLines.join('\n')}\n`);

  console.log(`Baseline: ${basePath} (${files.length} files)`);
  console.log(`Snapshot: ${snapshotPath}`);
  console.log(`Baseline hash: ${baselineHash}`);
  console.log(`Snapshot hash: ${snapshotHash}`);

  if (drifted) {
    console.error('ALERT: Config drift detected between baseline and snapshot.');
    console.error(`Alert payload: ${alertPath}`);
    if (failOnDrift) {
      process.exit(2);
    }
  } else {
    console.log('✅ No config drift detected.');
  }
};

try {
  main();
} catch (error) {
  console.error(`Drift check failed: ${error.message}`);
  process.exit(1);
}
