import { DecisionLedger } from '../../packages/decision-ledger/src/index.ts';
import fs from 'fs';
import path from 'path';

// This script simulates rolling back a decision.
// Usage: node scripts/decision/rollback_policy.mjs <decision_id>

const decisionId = process.argv[2];
const ledgerPath = 'packages/decision-ledger/decision_ledger.json';

const ledger = new DecisionLedger(ledgerPath);

if (!decisionId) {
    console.error("Please provide a decision ID to rollback.");
    process.exit(1);
}

try {
    // Define the undo action
    const undoAction = async (decision) => {
        console.log(`Reverting action: ${decision.decision.action}`);
        console.log(`Restoring state prior to decision ${decision.id}...`);
        // In a real system, this would call infrastructure APIs
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log(`State restored.`);
    };

    await ledger.rollback(decisionId, undoAction);
    console.log(`Successfully rolled back decision ${decisionId}`);

} catch (error) {
    console.error('Error rolling back decision:', error);
    process.exit(1);
}
