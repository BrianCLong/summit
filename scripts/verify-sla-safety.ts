import fs from "node:fs";
import path from "node:path";

// Mock Capacity Model
const CAPACITY_MODEL = {
  max_rps_per_core: 100,
  current_provisioned_cores: 10,
  projected_peak_load_rps: 800,
  sla_safety_margin: 0.2, // 20% headroom required
};

function verifySlaSafety() {
  console.log("Starting SLA Safety Verification...");

  // 1. Verify Traceability: Do defined alerts exist?
  // Using simple string search to avoid dependencies
  const alertsPath = path.join(process.cwd(), "monitoring", "alerts.yaml");
  if (!fs.existsSync(alertsPath)) {
    console.warn("WARNING: monitoring/alerts.yaml not found. Skipping alert verification.");
  } else {
    const alertsContent = fs.readFileSync(alertsPath, "utf-8");
    const requiredAlerts = ["HighApplicationErrorRate", "HighResponseTime"];

    const missingAlerts = requiredAlerts.filter((alert) => !alertsContent.includes(alert));

    if (missingAlerts.length > 0) {
      console.error(
        `FAILURE: Missing required SLA alerts in configuration: ${missingAlerts.join(", ")}`
      );
      process.exit(1);
    }
    console.log("PASS: All required SLA alerts found in configuration.");
  }

  // 2. Capacity Safety Check
  const maxCapacity = CAPACITY_MODEL.max_rps_per_core * CAPACITY_MODEL.current_provisioned_cores;
  const requiredCapacity =
    CAPACITY_MODEL.projected_peak_load_rps * (1 + CAPACITY_MODEL.sla_safety_margin);

  console.log(
    `Capacity Check: Max=${maxCapacity} RPS, Required=${requiredCapacity} RPS (inc. ${CAPACITY_MODEL.sla_safety_margin * 100}% margin)`
  );

  if (maxCapacity < requiredCapacity) {
    console.error("FAILURE: Projected load exceeds safe capacity. SLA risk detected.");
    console.error(`Details: Need ${requiredCapacity} RPS, have ${maxCapacity} RPS.`);
    process.exit(1);
  }
  console.log("PASS: Capacity sufficient for SLA targets.");

  process.exit(0);
}

verifySlaSafety();
