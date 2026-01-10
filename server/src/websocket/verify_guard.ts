
import { checkCounterGate } from './ga-guard.js';

console.log('Verifying GA Guard Logic...');
let errors = 0;

function assert(condition: boolean, msg: string) {
    if (!condition) {
        console.error(`❌ FAILED: ${msg}`);
        errors++;
    } else {
        console.log(`✅ PASSED: ${msg}`);
    }
}

// 1. PII Block
const piiResult = checkCounterGate({ type: 'counter', pii: true });
assert(piiResult.allowed === false && piiResult.action === 'BLOCK', 'PII should be BLOCKED');

// 2. Unsafe Mode Block
const unsafeResult = checkCounterGate({ type: 'counter', mode: 'attack', human_approved: true });
assert(unsafeResult.allowed === false && unsafeResult.action === 'BLOCK', 'Unsafe mode should be BLOCKED');

// 3. No Approval Hold
const noApprovalResult = checkCounterGate({ type: 'counter', mode: 'prebunk', human_approved: false });
assert(noApprovalResult.allowed === false && noApprovalResult.action === 'HOLD', 'No approval should be HELD');

// 4. Safe & Approved
const safeResult = checkCounterGate({ type: 'counter', mode: 'prebunk', human_approved: true });
assert(safeResult.allowed === true, 'Safe & Approved should be ALLOWED');

if (errors > 0) {
    console.error(`\nVerification FAILED with ${errors} errors.`);
    process.exit(1);
} else {
    console.log('\nAll Guard checks passed.');
}
