import { budgetTracker } from "../server/src/lib/resources/budget-tracker.js";
import { CostDomain } from "../server/src/lib/resources/types.js";
import fs from "fs";

// Standard Workload Definition
// 100 Agent Runs
// 500 Coordination messages
// 1000 DB Writes

const TENANT_ID = "benchmark-tenant";

async function runBenchmark() {
  console.log("Starting Cost Benchmark...");

  // Reset (conceptually) - Set budgets for ALL domains to ensure tracking
  budgetTracker.setBudget(TENANT_ID, {
    domain: CostDomain.AGENT_RUNS,
    limit: 1000000,
    period: "monthly",
    currency: "USD",
    alertThresholds: [],
  });

  budgetTracker.setBudget(TENANT_ID, {
    domain: CostDomain.COORDINATION,
    limit: 1000000,
    period: "monthly",
    currency: "USD",
    alertThresholds: [],
  });

  budgetTracker.setBudget(TENANT_ID, {
    domain: CostDomain.WRITE_ACTIONS,
    limit: 1000000,
    period: "monthly",
    currency: "USD",
    alertThresholds: [],
  });

  let totalCost = 0;

  // Simulate 100 Agent Runs (Cost: $0.10 each)
  for (let i = 0; i < 100; i++) {
    const cost = 0.1;
    budgetTracker.trackCost(TENANT_ID, CostDomain.AGENT_RUNS, cost);
    totalCost += cost;
  }

  // Simulate 500 Coordination Messages (Cost: $0.001 each)
  for (let i = 0; i < 500; i++) {
    const cost = 0.001;
    budgetTracker.trackCost(TENANT_ID, CostDomain.COORDINATION, cost);
    totalCost += cost;
  }

  // Simulate 1000 DB Writes (Cost: $0.05 each)
  for (let i = 0; i < 1000; i++) {
    const cost = 0.05;
    budgetTracker.trackCost(TENANT_ID, CostDomain.WRITE_ACTIONS, cost);
    totalCost += cost;
  }

  const report = budgetTracker.getTenantReport(TENANT_ID);

  // Calculate total explicitly from report to verify aggregation
  let aggregatedCost = 0;
  Object.values(report).forEach((b) => {
    if (b) aggregatedCost += b.currentSpending;
  });

  const results = {
    timestamp: new Date().toISOString(),
    totalCost: aggregatedCost,
    breakdown: report,
  };

  console.log(`Benchmark Complete. Total Cost: $${aggregatedCost.toFixed(4)}`);

  fs.writeFileSync("cost-benchmark-results.json", JSON.stringify(results, null, 2));
}

runBenchmark();
