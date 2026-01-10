import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

// File paths - referencing existing repo assets
const PATHS = {
  budgets: path.join(ROOT_DIR, 'performance-budgets.json'),
  cost: path.join(ROOT_DIR, 'cost-baseline.json'),
  metrics: path.join(ROOT_DIR, 'metrics.json'),
  // Build artifacts (may not exist if build hasn't run)
  serverBuild: path.join(ROOT_DIR, 'server/dist/server.js'),
  clientBuild: path.join(ROOT_DIR, 'client/dist/index.html'),
};

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function loadJson(filepath) {
  if (!fs.existsSync(filepath)) {
    console.warn(`⚠️  Warning: Configuration file not found at ${path.relative(ROOT_DIR, filepath)}`);
    console.warn(`    Ensure this file exists in the repo root.`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (err) {
    console.error(`❌ Error reading ${path.relative(ROOT_DIR, filepath)}:`, err.message);
    return null;
  }
}

function measureBundleSize() {
    let size = 0;
    // Check known build locations
    if (fs.existsSync(PATHS.serverBuild)) {
        size += fs.statSync(PATHS.serverBuild).size;
    }
    // Only return size if we found artifacts, otherwise 0 implies "not built"
    return size;
}

function main() {
  console.log("📊 Summit Performance & Cost Measurement");
  console.log("========================================");
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Repo: ${ROOT_DIR}\n`);

  // Explicit status check for configs
  console.log("🔹 Configuration Check");
  const budgets = loadJson(PATHS.budgets);
  console.log(`   - performance-budgets.json: ${budgets ? '[FOUND]' : '[MISSING]'}`);

  const cost = loadJson(PATHS.cost);
  console.log(`   - cost-baseline.json:       ${cost ? '[FOUND]' : '[MISSING]'}`);

  const metrics = loadJson(PATHS.metrics);
  console.log(`   - metrics.json:             ${metrics ? '[FOUND]' : '[MISSING]'}`);
  console.log("");

  const report = {
    timestamp: new Date().toISOString(),
    performance: {
      endpoints: [],
      bundle_size: {}
    },
    cost: {
      total_hourly: 0,
      status: 'UNKNOWN'
    }
  };

  // 1. Performance Budgets (Latency)
  if (budgets && budgets.endpoints) {
    console.log("🔹 Latency Budgets (Defined in performance-budgets.json)");
    Object.entries(budgets.endpoints).forEach(([path, limits]) => {
      const isCritical = limits.critical ? "CRITICAL" : "Standard";
      console.log(`   - ${path.padEnd(25)} [${isCritical}] p95: ${limits.p95_budget_ms}ms | p99: ${limits.p99_budget_ms}ms`);

      report.performance.endpoints.push({
        path,
        critical: limits.critical,
        p95_limit: limits.p95_budget_ms
      });
    });
    console.log("");
  } else {
    console.log("⚠️  Latency Budgets: No configuration found or empty.\n");
  }

  // 2. Bundle Size (Live Measurement vs Baseline)
  console.log("🔹 Artifact Size");
  const baselineSize = metrics ? metrics.bundle_size_bytes : 0;

  console.log(`   - Baseline (metrics.json): ${formatBytes(baselineSize)}`);

  const currentSize = measureBundleSize();
  if (currentSize > 0) {
      console.log(`   - Measured (dist/):        ${formatBytes(currentSize)}`);
      const diff = currentSize - baselineSize;
      const diffPercent = baselineSize > 0 ? (diff / baselineSize) * 100 : 0;
      console.log(`   - Drift:                   ${diffPercent.toFixed(2)}%`);

      report.performance.bundle_size = {
          baseline: baselineSize,
          current: currentSize,
          drift_percent: diffPercent
      };
  } else {
      console.log(`   - Measured (dist/):        Not found (run 'npm run build:server' to measure)`);
      report.performance.bundle_size = {
          baseline: baselineSize,
          current: null,
          note: "Build artifacts not present"
      };
  }
  console.log("");

  // 3. Cost Posture
  if (cost) {
    console.log("🔹 Cost Posture");
    console.log(`   - Target Hourly Cost:      $${cost.totalCost.toFixed(2)}`);
    console.log(`   - Allowed Drift:           ${cost.allowedDriftPercent}%`);

    report.cost.total_hourly = cost.totalCost;
    report.cost.allowed_drift = cost.allowedDriftPercent;

    console.log(`   - Status:                  MODELED (Static Baseline from cost-baseline.json)`);
  } else {
    console.log("⚠️  Cost Posture: No cost-baseline.json found.\n");
  }

  // Output JSON artifact
  const reportPath = path.join(ROOT_DIR, 'perf-cost-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Report saved to: ${path.relative(ROOT_DIR, reportPath)}`);
}

main();
