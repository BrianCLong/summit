const fs = require("fs");
const path = require("path");
const { scanCodebase } = require("../compliance/debt-lib.cjs");

const ROOT_DIR = process.cwd();
const REGISTRY_FILE = path.join(ROOT_DIR, "debt/registry.json");
const BUDGETS_FILE = path.join(ROOT_DIR, "debt/budgets.json");
const REPORT_FILE = path.join(ROOT_DIR, "debt-report.json");

function main() {
  console.log("Starting Debt Regression Check...");

  // 1. Load Registry
  if (!fs.existsSync(REGISTRY_FILE)) {
    console.error(
      "❌ Registry not found! Run scripts/compliance/generate_debt_registry.cjs first."
    );
    process.exit(1);
  }
  const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf-8"));
  const registryMap = new Set(registry.debt.map((d) => d.id));
  console.log(`✅ Loaded ${registryMap.size} items from registry.`);

  // 2. Scan Codebase
  console.log("Running debt scan...");
  const currentDebt = scanCodebase(ROOT_DIR);
  console.log(`Found ${currentDebt.length} current debt items.`);

  // 3. Compare
  const newDebt = [];
  const retiredDebt = [];

  // Check for new items
  currentDebt.forEach((item) => {
    if (!registryMap.has(item.id)) {
      newDebt.push(item);
    }
  });

  // Check for retired items (optional check, for reporting)
  const currentIdMap = new Set(currentDebt.map((d) => d.id));
  registry.debt.forEach((item) => {
    if (!currentIdMap.has(item.id)) {
      retiredDebt.push(item);
    }
  });

  // 4. Report
  console.log(`New Debt Items: ${newDebt.length}`);
  console.log(`Retired Debt Items: ${retiredDebt.length}`);

  const report = {
    timestamp: new Date().toISOString(),
    total_debt: currentDebt.length,
    new_items: newDebt.length,
    retired_items: retiredDebt.length,
    new_debt_details: newDebt,
    retired_debt_details: retiredDebt.map((d) => d.id),
  };
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

  // 5. Fail if new debt exists
  if (newDebt.length > 0) {
    console.error("❌ CHECK FAILED: New debt detected!");
    newDebt.slice(0, 5).forEach((d) => {
      console.error(`  - [${d.id}] ${d.description} at ${d.locations[0]}`);
    });
    if (newDebt.length > 5) console.error(`  ... and ${newDebt.length - 5} more.`);
    console.error("\nIf this debt is intentional, register it in debt/registry.json.");
    process.exit(1);
  }

  console.log("✅ CHECK PASSED: No new debt detected.");

  if (retiredDebt.length > 0) {
    console.log(
      `💡 NOTE: ${retiredDebt.length} items have been retired. Consider updating the registry.`
    );
    // Note: We don't fail here, allowing "lazy" cleanup of registry, but ideally we'd want strict sync.
    // Prompt says "No deletion of exit criteria" implies registry management.
    // But also "Allows incremental cleanup".
  }
}

main();
