import { importECCPack } from '../packages/packs/src/index.js';
import { HookPolicy, validateMCPBudget } from '../packages/policy/src/index.js';
import { writeEvidence } from '../packages/evidence/src/index.js';
import * as assert from 'assert';

async function verify() {
  console.log("Starting MWS Verification...");

  // 1. Pack Import
  console.log("[1] Testing Pack Import...");
  const { manifest } = await importECCPack();
  assert.strictEqual(manifest.name, "ecc/everything-claude-code");
  console.log("    ✅ Manifest imported.");

  // 2. Policy Gates
  console.log("[2] Testing Policy Gates...");
  const policy = new HookPolicy('safe');

  // Test allowed hook
  const res1 = policy.validate('tmux-reminder', 'echo reminder');
  assert.strictEqual(res1.allowed, true);
  console.log("    ✅ Safe hook allowed.");

  // Test denied hook (unsafe command)
  const res2 = policy.validate('unknown', 'rm -rf /');
  assert.strictEqual(res2.allowed, false);
  console.log("    ✅ Unsafe/Unknown hook denied.");

  // Test MCP Budget
  const budgetRes = validateMCPBudget(new Array(5), 50); // 5 enabled, 50 total -> OK
  assert.strictEqual(budgetRes.valid, true);
  const budgetFail = validateMCPBudget(new Array(15), 50); // 15 enabled -> Fail
  assert.strictEqual(budgetFail.valid, false);
  console.log("    ✅ MCP Budget enforced.");

  // 3. Evidence
  console.log("[3] Testing Evidence Ledger...");
  const metrics = {
    duration: 100,
    toolsUsed: 5,
  };
  const report = {
    packName: manifest.name,
    runId: 'test-run-' + Date.now(),
    policyResults: {
      hooks: { 'tmux-reminder': true },
      mcp: true,
    },
    // metrics extracted
  };
  const evidenceDir = await writeEvidence(report, { outputDir: 'artifacts/evidence_test', metrics });
  console.log(`    ✅ Evidence written to ${evidenceDir}`);

  console.log("MWS Verification Completed Successfully.");
}

verify().catch((err) => {
  console.error("Verification Failed:", err);
  process.exit(1);
});
