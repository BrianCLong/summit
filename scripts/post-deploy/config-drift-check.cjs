#!/usr/bin/env node
/**
 * Config Drift Check Script
 *
 * Detects configuration drift between Git baseline and deployed snapshots.
 * Generates alerts and metrics when drift is detected.
 *
 * Usage:
 *   node scripts/post-deploy/config-drift-check.cjs --env staging
 *   node scripts/post-deploy/config-drift-check.cjs --write-snapshot
 *   node scripts/post-deploy/config-drift-check.cjs --simulate-mismatch
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const args = new Set(process.argv.slice(2));
const getArgValue = (flag) => {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
};

const configPath = process.env.DRIFT_CONFIG || "config/drift-baseline.json";
const envName = getArgValue("--env") || process.env.DRIFT_ENV || "staging";
const outputDir = process.env.DRIFT_OUTPUT_DIR || "artifacts/drift";
const forceMismatch = args.has("--simulate-mismatch") || process.env.DRIFT_FORCE_MISMATCH === "1";
const writeSnapshot = args.has("--write-snapshot");
const failOnDrift = process.env.DRIFT_FAIL_ON_DRIFT !== "0";

/**
 * Read drift configuration
 */
const readConfig = () => {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
};

/**
 * Collect files from directory matching extensions
 */
const collectFiles = (dir, extensions, rootDir = dir) => {
  const files = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, extensions, rootDir));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (extensions.includes(ext)) {
        files.push({
          relativePath: path.relative(rootDir, fullPath),
          content: fs.readFileSync(fullPath, "utf8"),
        });
      }
    }
  }

  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
};

/**
 * Compute hash of file collection
 */
const computeHash = (files) => {
  const hash = crypto.createHash("sha256");
  for (const file of files) {
    hash.update(file.relativePath);
    hash.update("\0");
    hash.update(file.content);
    hash.update("\0");
  }
  return hash.digest("hex");
};

/**
 * Generate Prometheus metrics
 */
const generatePromMetrics = (drifted, env, source) => {
  return `# HELP intelgraph_config_drift_detected Config drift detected between Git baseline and deployed snapshot.
# TYPE intelgraph_config_drift_detected gauge
intelgraph_config_drift_detected{env="${env}",source="${source}"} ${drifted ? 1 : 0}
`;
};

/**
 * Write snapshot file
 */
const writeSnapshotFile = (snapshotPath, baseline, hash) => {
  const snapshot = {
    env: envName,
    baseline: {
      name: baseline.name,
      path: baseline.path,
      fileCount: collectFiles(baseline.path, baseline.extensions).length,
    },
    baselineHash: hash,
    generatedAt: new Date().toISOString(),
  };

  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
  console.log(`Snapshot written: ${snapshotPath}`);
};

/**
 * Main drift check
 */
const main = () => {
  console.log("Config Drift Check");
  console.log("==================");
  console.log(`Environment: ${envName}`);
  console.log(`Config: ${configPath}`);
  console.log("");

  const config = readConfig();
  const baseline = config.baseline;
  const snapshotPath = config.snapshots[envName];

  if (!snapshotPath) {
    throw new Error(`No snapshot configured for environment: ${envName}`);
  }

  // Collect baseline files
  const files = collectFiles(baseline.path, baseline.extensions);
  const baselineHash = computeHash(files);

  console.log(`Baseline: ${baseline.name} (${files.length} files)`);
  console.log(`Baseline hash: ${baselineHash}`);

  // Write snapshot mode
  if (writeSnapshot) {
    writeSnapshotFile(snapshotPath, baseline, baselineHash);
    process.exit(0);
  }

  // Read existing snapshot
  if (!fs.existsSync(snapshotPath)) {
    console.log(`Snapshot not found: ${snapshotPath}`);
    console.log("Run with --write-snapshot to create initial snapshot");
    process.exit(1);
  }

  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
  const snapshotHash = snapshot.baselineHash;

  console.log(`Snapshot: ${snapshotPath}`);
  console.log(`Snapshot hash: ${snapshotHash}`);
  console.log("");

  // Check for drift
  let drifted = baselineHash !== snapshotHash;

  // Force mismatch for testing
  if (forceMismatch) {
    console.log("⚠️  Simulating drift mismatch");
    drifted = true;
  }

  // Generate output
  fs.mkdirSync(outputDir, { recursive: true });

  // Summary JSON
  const summary = {
    env: envName,
    baseline: {
      name: baseline.name,
      path: baseline.path,
      fileCount: files.length,
    },
    baselineHash,
    snapshotHash,
    drifted,
    checkedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(outputDir, "config-drift-summary.json"),
    JSON.stringify(summary, null, 2)
  );

  // Prometheus metrics
  fs.writeFileSync(
    path.join(outputDir, "config-drift.prom"),
    generatePromMetrics(drifted, envName, baseline.name)
  );

  // Result
  if (drifted) {
    console.log("❌ DRIFT DETECTED");
    console.log("");
    console.log("Config has changed since the snapshot was taken.");
    console.log("Review changes and update snapshot with:");
    console.log(
      `  node scripts/post-deploy/config-drift-check.cjs --write-snapshot --env ${envName}`
    );

    // Alert JSON
    const alert = {
      alert: "IntelGraphConfigDriftDetected",
      severity: "critical",
      env: envName,
      source: baseline.name,
      detected: true,
      reportPath: path.join(outputDir, "config-drift-summary.json"),
      detectedAt: new Date().toISOString(),
    };
    fs.writeFileSync(
      path.join(outputDir, "config-drift-alert.json"),
      JSON.stringify(alert, null, 2)
    );

    if (failOnDrift) {
      process.exit(1);
    }
  } else {
    console.log("✅ No drift detected");
  }

  console.log("");
  console.log(`Output: ${outputDir}/`);
};

// Export for testing
module.exports = {
  collectFiles,
  computeHash,
  generatePromMetrics,
};

// Run if called directly
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
