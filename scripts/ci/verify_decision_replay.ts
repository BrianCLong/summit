import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Verification script for Decision Replay and Rollback
// This script simulates a full lifecycle of decision making and rollback.

const ledgerPath = 'packages/decision-ledger/decision_ledger.json';

try {
    console.log("Starting Decision Replay Verification...");

    // Clean up previous ledger
    if (fs.existsSync(ledgerPath)) {
        fs.unlinkSync(ledgerPath);
    }

    // 1. Apply a policy
    console.log("Step 1: Applying Policy...");
    const applyOutput = execSync('npx tsx scripts/decision/apply_policy.ts packages/decision-policy/policy.v1.yaml \'{"cpu_usage": "90%"}\'').toString();
    console.log(applyOutput);

    // Extract Decision ID
    const match = applyOutput.match(/Decision recorded: ([a-z0-9]+)/);
    if (!match) {
        throw new Error("Failed to extract decision ID from output.");
    }
    const decisionId = match[1];
    console.log(`Captured Decision ID: ${decisionId}`);

    // Verify Ledger content
    const ledgerContent = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    if (ledgerContent.length !== 1 || ledgerContent[0].id !== decisionId) {
        throw new Error("Ledger content mismatch.");
    }
    console.log("Ledger verified.");

    // 2. Rollback the decision
    console.log("Step 2: Rolling back Policy...");
    const rollbackOutput = execSync(`npx tsx scripts/decision/rollback_policy.ts ${decisionId}`).toString();
    console.log(rollbackOutput);

    // Verify Ledger content after rollback
    const updatedLedger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    if (!updatedLedger[0].reverted) {
        throw new Error("Decision was not marked as reverted in ledger.");
    }
    console.log("Rollback verified in ledger.");

    console.log("✅ Decision Replay Verification Passed!");

} catch (error) {
    console.error("❌ Verification Failed:", error);
    process.exit(1);
}
