#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

const args = process.argv.slice(2);
let summaryPath = "perf/reports/k6-summary.json";
let tolerance = 0.1;
let reportPath = "perf/reports/latency-budget-report.json";
let journeyId = "GP-001";

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (!arg) continue;
  if (!arg.startsWith("--")) {
    summaryPath = arg;
    continue;
  }
  if (arg === "--tolerance") {
    const value = Number(args[index + 1]);
    if (Number.isNaN(value) || value < 0) {
      console.error("⚠️  --tolerance requires a non-negative number");
      process.exit(1);
    }
    tolerance = value;
    index += 1;
    continue;
  }
  if (arg === "--report") {
    reportPath = args[index + 1];
    index += 1;
    continue;
  }
  if (arg === "--journey") {
    journeyId = args[index + 1];
    index += 1;
    continue;
  }
}

const resolveJson = (filePath) => {
  const resolved = path.resolve(process.cwd(), filePath);
  const contents = fs.readFileSync(resolved, "utf8");
  return JSON.parse(contents);
};

const summary = resolveJson(summaryPath);
const budgetsDoc = YAML.parse(fs.readFileSync(path.resolve("perf/models.yaml"), "utf8"));

const journeys = Array.isArray(budgetsDoc?.journeys) ? budgetsDoc.journeys : [];
if (journeys.length === 0) {
  console.error("No journeys defined in perf/models.yaml; cannot evaluate budgets.");
  process.exit(1);
}

const journeyBudget = journeys.find((journey) => journey.id === journeyId) ?? journeys[0];
if (!journeyBudget?.budgets?.latency_ms) {
  console.error("Latency budgets missing for selected journey; failing.");
  process.exit(1);
}

const getPercentile = (metric, key) => {
  if (!metric) return Number.NaN;
  const source = metric.percentiles || metric.values || metric.thresholds || metric.data;
  if (!source || typeof source !== "object") return Number.NaN;
  const candidates = [
    key,
    key.replace("p(", "p"),
    key.replace("(", "").replace(")", ""),
    key.replace("p", ""),
  ];
  for (const candidate of candidates) {
    if (candidate in source) return Number(source[candidate]);
  }
  return Number.NaN;
};

const httpMetrics = summary.metrics?.http_req_duration;
const p95 = getPercentile(httpMetrics, "p(95)");
const p99 = getPercentile(httpMetrics, "p(99)");
const errorMetric = summary.metrics?.http_req_failed || summary.metrics?.checks;
const errorRate = (() => {
  if (!errorMetric || typeof errorMetric !== "object") return Number.NaN;
  if (typeof errorMetric.rate === "number") return Number(errorMetric.rate);
  if (errorMetric.values && typeof errorMetric.values.rate === "number")
    return Number(errorMetric.values.rate);
  if (typeof errorMetric.value === "number") return Number(errorMetric.value);
  return Number.NaN;
})();

const budgetP95 = Number(journeyBudget.budgets.latency_ms.p95);
const budgetP99 = Number(journeyBudget.budgets.latency_ms.p99);
const budgetError = Number(journeyBudget.budgets.error_rate ?? 0.01);

const allowedP95 = budgetP95 * (1 + tolerance);
const allowedP99 = budgetP99 * (1 + tolerance);
const allowedError = budgetError * (1 + tolerance);

const report = {
  journey: journeyBudget.id,
  budgets: {
    p95: budgetP95,
    p99: budgetP99,
    errorRate: budgetError,
    tolerance,
  },
  observed: {
    p95,
    p99,
    errorRate,
  },
  allowed: {
    p95: allowedP95,
    p99: allowedP99,
    errorRate: allowedError,
  },
  regressions: [],
};

const fail = (condition, message, field) => {
  if (condition) {
    report.regressions.push({ field, message });
  }
};

fail(Number.isNaN(p95), "p95 latency missing from k6 summary output", "p95");
fail(Number.isNaN(p99), "p99 latency missing from k6 summary output", "p99");
fail(Number.isNaN(errorRate), "Error rate missing from k6 summary output", "errorRate");

fail(p95 > allowedP95, `p95 ${p95.toFixed(2)}ms exceeds budget ${allowedP95.toFixed(2)}ms`, "p95");
fail(p99 > allowedP99, `p99 ${p99.toFixed(2)}ms exceeds budget ${allowedP99.toFixed(2)}ms`, "p99");
fail(
  !Number.isNaN(errorRate) && errorRate > allowedError,
  `Error rate ${(errorRate * 100).toFixed(3)}% exceeds budget ${(allowedError * 100).toFixed(3)}%`,
  "errorRate"
);

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

if (report.regressions.length) {
  console.error("Latency/quality regressions detected:");
  for (const regression of report.regressions) {
    console.error(`- [${regression.field}] ${regression.message}`);
  }
  process.exit(1);
}

console.log("Latency budgets met for journey", report.journey);
