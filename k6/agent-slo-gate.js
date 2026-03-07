/**
 * Agent SLO Gate
 *
 * Validates Agent Workload SLOs:
 * - Read-Only Query Availability > 99.9%
 * - Read-Only Query Latency p95 < 250ms
 * - Planning Success Rate > 99.5%
 * - Planning Latency p95 < 5s
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

// Re-export metrics logic from the scale test, but simplified for a quick gate check
// Note: In a real CI, we might run the full scale test. Here we run a lighter version.

export { options } from "./agent-scale-test.js";
import agentTest from "./agent-scale-test.js";

export default function () {
  agentTest();
}

export function handleSummary(data) {
  const summary = {};

  // Helper to get metric values safely
  const getMetric = (name, type) => {
    if (!data.metrics[name]) return 0;
    if (type === "rate") return data.metrics[name].values.rate;
    if (type === "p95") return data.metrics[name].values["p(95)"];
    return 0;
  };

  const queryDurationP95 = getMetric("query_duration", "p95");
  const queryFailRate = getMetric("query_failures", "rate");
  const planDurationP95 = getMetric("plan_job_duration", "p95");
  const planFailRate = getMetric("plan_job_failures", "rate");

  const passed =
    queryDurationP95 < 250 &&
    queryFailRate < 0.001 &&
    planDurationP95 < 5000 &&
    planFailRate < 0.005;

  if (__ENV.OUTPUT_JSON) {
    summary["slo-results.json"] = JSON.stringify({
      agent_workloads: {
        read_only_p95: queryDurationP95,
        read_only_error_rate: queryFailRate,
        planning_p95: planDurationP95,
        planning_error_rate: planFailRate,
        status: passed ? "passing" : "failing",
      },
      timestamp: new Date().toISOString(),
    });
  }

  console.log("--------------------------------------------------");
  console.log("Agent Workload SLO Results");
  console.log(`Read-Only P95: ${queryDurationP95.toFixed(2)}ms (Limit: 250ms)`);
  console.log(`Read-Only Error: ${(queryFailRate * 100).toFixed(2)}% (Limit: 0.1%)`);
  console.log(`Planning P95: ${planDurationP95.toFixed(2)}ms (Limit: 5000ms)`);
  console.log(`Planning Error: ${(planFailRate * 100).toFixed(2)}% (Limit: 0.5%)`);
  console.log(`Status: ${passed ? "PASS" : "FAIL"}`);
  console.log("--------------------------------------------------");

  return summary;
}
