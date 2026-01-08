import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Configuration
const DIST_DIR = 'dist/plan-execution';
const SPRINT_PLANS_DIR = 'dist/sprint-plans';

interface Signals {
  plan: any;
  governanceScore: any;
  compliance: any;
  incidentDrills: any;
  exceptions: any;
}

function calculateHash(data: any): string {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

async function main() {
  const args = process.argv.slice(2);
  const planId = args[0]; // e.g. "2026-W02"

  if (!planId) {
    console.error("Usage: npx tsx scripts/reporting/collect_plan_execution_signals.ts <planId>");
    process.exit(1);
  }

  console.log(`Collecting signals for plan: ${planId}`);

  // 1. Load Sprint Plan
  const planPath = path.join(SPRINT_PLANS_DIR, planId, 'plans.json');
  if (!fs.existsSync(planPath)) {
    console.error(`Sprint plan not found at: ${planPath}`);
    process.exit(1);
  }
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf-8'));

  // 2. Load or Mock Signals
  // Governance Score (Mock: Total 85, which is > 80 baseline)
  let governanceScore = { total: 85, breakdown: { security: 90, reliability: 80 } };

  // Compliance (Mock: Include a passing gate for item B1, failing for B2)
  let compliance = {
      status: "GREEN",
      checks: [
          { id: "GATE-B1", status: "PASS" },
          { id: "GATE-B2", status: "FAIL" }
      ],
      performance_metrics: {
          "C1": { current: 100, baseline: 200 } // Improvement
      }
  };

  // Incident Drills
  let incidentDrills = { passed: 5, total: 5 };

  // Exceptions
  let exceptions = { active_exceptions: [] };

  // 3. Assemble Output
  const signals: Signals = {
    plan,
    governanceScore,
    compliance,
    incidentDrills,
    exceptions
  };

  const outputDir = path.join(DIST_DIR, planId);
  fs.mkdirSync(outputDir, { recursive: true });

  const signalsPath = path.join(outputDir, 'signals.json');
  fs.writeFileSync(signalsPath, JSON.stringify(signals, null, 2));

  // 4. Create Baseline Index
  const baselineIndex = {
    plan_id: planId,
    generated_at: new Date().toISOString(),
    artifacts: {
      plan: { path: planPath, hash: calculateHash(plan) },
      // Add other artifacts here if they were real files
    }
  };
  fs.writeFileSync(path.join(outputDir, 'baseline-index.json'), JSON.stringify(baselineIndex, null, 2));

  console.log(`Signals collected and saved to: ${signalsPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
