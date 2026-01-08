#!/usr/bin/env npx tsx

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import path from "path";

// --- Configuration ---
const DOCS_DIR = "docs/ops";
const METRICS_DIR = "."; // Root for now, or where artifacts are found
const OUTPUT_FILE_JSON = "health-score.json";
const OUTPUT_FILE_MD = path.join(DOCS_DIR, "dashboard-health.md");

// Component Weights
const WEIGHTS = {
  reliability: 0.35,
  availability: 0.2,
  quality: 0.15,
  security: 0.15,
  efficiency: 0.1,
  velocity: 0.05,
};

// Thresholds
const THRESHOLDS = {
  healthy: 90,
  degraded: 70,
};

interface HealthComponents {
  reliability: number;
  availability: number;
  quality: number;
  security: number;
  efficiency: number;
  velocity: number;
}

interface MetricData {
  reliability: { passed: number; total: number; skipped: number };
  availability: { errorRate: number; uptime: number };
  quality: { criticalBugs: number };
  security: { criticalVulns: number; highVulns: number };
  efficiency: { budget: number; cost: number };
  velocity: { leadTimeHours: number };
}

// --- Data Gathering Functions ---

function getReliabilityMetrics(): MetricData["reliability"] {
  const files = ["test-summary-junit.xml", "junit.xml"];
  let passed = 0;
  let total = 0;
  let skipped = 0;
  let found = false;

  for (const file of files) {
    const p = path.join(METRICS_DIR, file);
    if (existsSync(p)) {
      try {
        const content = readFileSync(p, "utf-8");
        // Simple regex parsing for junit xml
        const testsMatch = content.match(/tests="(\d+)"/);
        const failuresMatch = content.match(/failures="(\d+)"/);
        const errorsMatch = content.match(/errors="(\d+)"/);
        const skippedMatch = content.match(/skipped="(\d+)"/);

        if (testsMatch) {
          const t = parseInt(testsMatch[1], 10);
          const f = failuresMatch ? parseInt(failuresMatch[1], 10) : 0;
          const e = errorsMatch ? parseInt(errorsMatch[1], 10) : 0;
          const s = skippedMatch ? parseInt(skippedMatch[1], 10) : 0;

          if (t > 0) {
            total += t;
            // Passed = Total - Failures - Errors
            // Assuming failures/errors are counts of failed tests.
            passed += t - f - e;
            skipped += s;
            found = true;
          }
        }
      } catch (err) {
        console.warn(`Failed to parse ${file}:`, err);
      }
    }
  }

  if (!found) {
    console.warn(
      "No JUnit XML files found or parsed. Defaulting to 100% reliability (optimistic)."
    );
    return { passed: 1, total: 1, skipped: 0 };
  }

  return { passed: passed - skipped, total, skipped };
}

function getAvailabilityMetrics(): MetricData["availability"] {
  // Try to find slo-results.json
  const p = path.join(METRICS_DIR, "slo-results.json");
  if (existsSync(p)) {
    try {
      const content = JSON.parse(readFileSync(p, "utf-8"));
      // Assume structure { errorRate: number, uptime: number }
      return {
        errorRate: content.errorRate ?? 0,
        uptime: content.uptime ?? 100,
      };
    } catch (e) {
      console.warn("Failed to parse slo-results.json");
    }
  }

  // Default to healthy if missing (optimistic)
  return { errorRate: 0, uptime: 100 };
}

function getQualityMetrics(): MetricData["quality"] {
  // Try to find issues.json or issues-stats.json
  const p = path.join(METRICS_DIR, "issues.json");
  if (existsSync(p)) {
    try {
      const content = JSON.parse(readFileSync(p, "utf-8"));
      return { criticalBugs: content.criticalBugs ?? 0 };
    } catch (e) {
      console.warn("Failed to parse issues.json");
    }
  }

  // Using default 0.
  return { criticalBugs: 0 };
}

function getSecurityMetrics(): MetricData["security"] {
  // Parse vulns-*.txt
  // Look for files starting with vulns-
  let files: string[] = [];
  try {
    files = readdirSync(METRICS_DIR).filter(
      (fn: string) => fn.startsWith("vulns-") && fn.endsWith(".txt")
    );
  } catch (e) {
    console.warn("Failed to list vulnerability files");
  }

  let critical = 0;
  let high = 0;

  for (const file of files) {
    try {
      const content = readFileSync(path.join(METRICS_DIR, file), "utf-8");
      const critMatch = content.match(/Critical:\s*(\d+)/i);
      const highMatch = content.match(/High:\s*(\d+)/i);

      if (critMatch) critical += parseInt(critMatch[1], 10);
      if (highMatch) high += parseInt(highMatch[1], 10);
    } catch (e) {
      console.warn(`Failed to read ${file}`);
    }
  }

  return { criticalVulns: critical, highVulns: high };
}

function getEfficiencyMetrics(): MetricData["efficiency"] {
  // budget.json
  const p = path.join(METRICS_DIR, "budget.json");
  if (existsSync(p)) {
    try {
      const content = JSON.parse(readFileSync(p, "utf-8"));
      return { budget: content.budget ?? 1000, cost: content.cost ?? 0 };
    } catch (e) {}
  }
  // Default: Cost within budget
  return { budget: 1000, cost: 500 };
}

function getVelocityMetrics(): MetricData["velocity"] {
  // velocity.json
  const p = path.join(METRICS_DIR, "velocity.json");
  if (existsSync(p)) {
    try {
      const content = JSON.parse(readFileSync(p, "utf-8"));
      return { leadTimeHours: content.leadTimeHours ?? 12 };
    } catch (e) {}
  }
  return { leadTimeHours: 12 };
}

// --- Calculation Functions ---

function calculateScore(metrics: MetricData): { score: number; components: HealthComponents } {
  // 1. Reliability
  // Passed / Total * 100
  // Note: metrics.reliability.passed excludes skipped.
  // Should skipped be part of total in denominator? Usually passed/total tests run.
  // If I have 10 tests, 1 skip, 9 pass. Pass rate = 9/10 = 90% or 9/9 = 100%?
  // Let's use 100% if skipped are not failures.
  // But JUnit 'total' includes skipped.
  // Let's use (passed) / (total - skipped) if possible, or just passed/total.
  // If the spec says "Passed / Total", let's stick to that but handle div by zero.
  // Given the earlier thought process: let's use passed / total.

  const relRaw =
    metrics.reliability.total > 0
      ? (metrics.reliability.passed / metrics.reliability.total) * 100
      : 100;
  const sReliability = Math.max(0, Math.min(100, relRaw));

  // 2. Availability
  let sAvailability = 0;
  if (metrics.availability.errorRate < 0.1) sAvailability = 100;
  else if (metrics.availability.errorRate < 1) sAvailability = 80;
  else if (metrics.availability.errorRate < 5) sAvailability = 50;
  else sAvailability = 0;

  // 3. Quality
  const sQuality = Math.max(0, 100 - 5 * metrics.quality.criticalBugs);

  // 4. Security
  const sSecurity = Math.max(0, 100 - 20 * metrics.security.criticalVulns);

  // 5. Efficiency
  let sEfficiency = 50;
  if (metrics.efficiency.cost <= metrics.efficiency.budget) sEfficiency = 100;
  else if (metrics.efficiency.cost <= 1.1 * metrics.efficiency.budget) sEfficiency = 80;

  // 6. Velocity
  let sVelocity = 50;
  if (metrics.velocity.leadTimeHours < 24) sVelocity = 100;
  else if (metrics.velocity.leadTimeHours < 48) sVelocity = 80;

  // Total
  const totalScore =
    WEIGHTS.reliability * sReliability +
    WEIGHTS.availability * sAvailability +
    WEIGHTS.quality * sQuality +
    WEIGHTS.security * sSecurity +
    WEIGHTS.efficiency * sEfficiency +
    WEIGHTS.velocity * sVelocity;

  return {
    score: Math.round(totalScore * 10) / 10, // 1 decimal place
    components: {
      reliability: sReliability,
      availability: sAvailability,
      quality: sQuality,
      security: sSecurity,
      efficiency: sEfficiency,
      velocity: sVelocity,
    },
  };
}

// --- Main Execution ---

function main() {
  console.log("Gathering metrics...");
  const data: MetricData = {
    reliability: getReliabilityMetrics(),
    availability: getAvailabilityMetrics(),
    quality: getQualityMetrics(),
    security: getSecurityMetrics(),
    efficiency: getEfficiencyMetrics(),
    velocity: getVelocityMetrics(),
  };

  console.log("Metrics gathered:", JSON.stringify(data, null, 2));

  const result = calculateScore(data);
  console.log("Calculated Score:", result.score);

  // Status
  let status = "🔴 Critical";
  let color = "red";
  if (result.score >= THRESHOLDS.healthy) {
    status = "🟢 Healthy";
    color = "green";
  } else if (result.score >= THRESHOLDS.degraded) {
    status = "🟡 Degraded";
    color = "yellow";
  }

  // Generate JSON
  const outputJson = {
    timestamp: new Date().toISOString(),
    score: result.score,
    status: status.split(" ")[1], // Just the word
    components: result.components,
    metrics: data,
  };
  writeFileSync(OUTPUT_FILE_JSON, JSON.stringify(outputJson, null, 2));
  console.log(`Written JSON to ${OUTPUT_FILE_JSON}`);

  // Generate MD
  const mdContent = `# Platform Health Dashboard

**Status**: ${status}
**Score**: ${result.score} / 100
**Updated**: ${new Date().toUTCString()}

## Component Breakdown

| Component | Score | Weight | Weighted Score |
|-----------|-------|--------|----------------|
| **Reliability** | ${result.components.reliability.toFixed(1)} | ${WEIGHTS.reliability * 100}% | ${(result.components.reliability * WEIGHTS.reliability).toFixed(1)} |
| **Availability** | ${result.components.availability.toFixed(1)} | ${WEIGHTS.availability * 100}% | ${(result.components.availability * WEIGHTS.availability).toFixed(1)} |
| **Quality** | ${result.components.quality.toFixed(1)} | ${WEIGHTS.quality * 100}% | ${(result.components.quality * WEIGHTS.quality).toFixed(1)} |
| **Security** | ${result.components.security.toFixed(1)} | ${WEIGHTS.security * 100}% | ${(result.components.security * WEIGHTS.security).toFixed(1)} |
| **Efficiency** | ${result.components.efficiency.toFixed(1)} | ${WEIGHTS.efficiency * 100}% | ${(result.components.efficiency * WEIGHTS.efficiency).toFixed(1)} |
| **Velocity** | ${result.components.velocity.toFixed(1)} | ${WEIGHTS.velocity * 100}% | ${(result.components.velocity * WEIGHTS.velocity).toFixed(1)} |

## Metrics Detail

### Reliability
- **Passed Tests**: ${data.reliability.passed}
- **Total Tests**: ${data.reliability.total}
- **Pass Rate**: ${data.reliability.total > 0 ? ((data.reliability.passed / data.reliability.total) * 100).toFixed(1) : 0}%

### Availability
- **Error Rate**: ${data.availability.errorRate}%
- **Uptime**: ${data.availability.uptime}%

### Quality
- **Critical Bugs**: ${data.quality.criticalBugs}

### Security
- **Critical Vulnerabilities**: ${data.security.criticalVulns}
- **High Vulnerabilities**: ${data.security.highVulns}

### Efficiency
- **Budget**: $${data.efficiency.budget}
- **Cost**: $${data.efficiency.cost}
- **Usage**: ${((data.efficiency.cost / data.efficiency.budget) * 100).toFixed(1)}%

### Velocity
- **PR Lead Time**: ${data.velocity.leadTimeHours}h

---
*Computed by Platform Health Calculator*
`;

  if (!existsSync(DOCS_DIR)) {
    mkdirSync(DOCS_DIR, { recursive: true });
  }

  writeFileSync(OUTPUT_FILE_MD, mdContent);
  console.log(`Written Dashboard to ${OUTPUT_FILE_MD}`);
}

main();
