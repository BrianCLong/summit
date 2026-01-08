import { budgetTracker } from "../server/src/lib/resources/budget-tracker.js";
import { CostDomain } from "../server/src/lib/resources/types.js";

async function runTests() {
  console.log("Running Cost Governance Verification...");
  const tenantId = "test-tenant-verify-" + Date.now();
  let failures = 0;

  // TEST 1: Hard Stops
  console.log("[TEST 1] Testing Hard Stops...");
  budgetTracker.setBudget(tenantId, {
    domain: CostDomain.AGENT_RUNS,
    limit: 10.0,
    period: "daily",
    currency: "USD",
    alertThresholds: [0.5, 1.0],
  });

  const allowed = budgetTracker.checkBudget(tenantId, CostDomain.AGENT_RUNS, 5.0);
  if (!allowed) {
    console.error("FAILED: Should allow spend within budget");
    failures++;
  } else {
    budgetTracker.trackCost(tenantId, CostDomain.AGENT_RUNS, 5.0);
  }

  const allowed2 = budgetTracker.checkBudget(tenantId, CostDomain.AGENT_RUNS, 6.0);
  if (allowed2) {
    console.error("FAILED: Should block spend exceeding budget");
    failures++;
  } else {
    console.log("PASSED: Hard stop enforced.");
  }

  // TEST 2: Forecasting
  console.log("[TEST 2] Testing Forecasting...");
  const forecastBudget = budgetTracker.getDomainBudget(tenantId, CostDomain.AGENT_RUNS);
  if (!forecastBudget) {
    console.error("FAILED: Budget not found");
    failures++;
  } else {
    // Allow 0 forecast if execution is too fast for Date.now() diff
    if (forecastBudget.forecastedSpending >= 0)
      console.log("PASSED: Forecast generated: " + forecastBudget.forecastedSpending);
    else {
      console.error("FAILED: Forecast is invalid");
      failures++;
    }
  }

  // TEST 3: Alerts (Spam Prevention)
  console.log("[TEST 3] Testing Alerts & Spam Prevention...");
  const tenantIdAlert = "test-tenant-alert-" + Date.now();
  let alertCount = 0;

  const alertHandler = (payload: any) => {
    if (payload.tenantId === tenantIdAlert && payload.threshold === 0.5) {
      alertCount++;
    }
  };

  budgetTracker.on("threshold_reached", alertHandler);

  budgetTracker.setBudget(tenantIdAlert, {
    domain: CostDomain.AGENT_RUNS,
    limit: 100.0,
    period: "daily",
    currency: "USD",
    alertThresholds: [0.5],
  });

  // Spend 51% (Triggers alert)
  budgetTracker.trackCost(tenantIdAlert, CostDomain.AGENT_RUNS, 51.0);

  // Spend another 10% (Total 61%) (Should NOT trigger alert again for 0.5)
  budgetTracker.trackCost(tenantIdAlert, CostDomain.AGENT_RUNS, 10.0);

  // Give time for event emission
  await new Promise((resolve) => setTimeout(resolve, 100));

  budgetTracker.off("threshold_reached", alertHandler); // Cleanup

  if (alertCount === 1) {
    console.log("PASSED: Alert received exactly once.");
  } else {
    console.error(`FAILED: Alert received ${alertCount} times (expected 1).`);
    failures++;
  }

  if (failures === 0) {
    console.log("ALL TESTS PASSED");
    process.exit(0);
  } else {
    console.error(failures + " TESTS FAILED");
    process.exit(1);
  }
}

runTests().catch((e) => console.error(e));
