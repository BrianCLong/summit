"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ga_guard_js_1 = require("./ga-guard.js");
console.log('Verifying GA Guard Logic...');
let errors = 0;
function assert(condition, msg) {
    if (!condition) {
        console.error(`❌ FAILED: ${msg}`);
        errors++;
    }
    else {
        console.log(`✅ PASSED: ${msg}`);
    }
}
// 1. PII Block
const piiResult = (0, ga_guard_js_1.checkCounterGate)({ type: 'counter', pii: true });
assert(piiResult.allowed === false && piiResult.action === 'BLOCK', 'PII should be BLOCKED');
// 2. Unsafe Mode Block
const unsafeResult = (0, ga_guard_js_1.checkCounterGate)({ type: 'counter', mode: 'attack', human_approved: true });
assert(unsafeResult.allowed === false && unsafeResult.action === 'BLOCK', 'Unsafe mode should be BLOCKED');
// 3. No Approval Hold
const noApprovalResult = (0, ga_guard_js_1.checkCounterGate)({ type: 'counter', mode: 'prebunk', human_approved: false });
assert(noApprovalResult.allowed === false && noApprovalResult.action === 'HOLD', 'No approval should be HELD');
// 4. Safe & Approved
const safeResult = (0, ga_guard_js_1.checkCounterGate)({ type: 'counter', mode: 'prebunk', human_approved: true });
assert(safeResult.allowed === true, 'Safe & Approved should be ALLOWED');
if (errors > 0) {
    console.error(`\nVerification FAILED with ${errors} errors.`);
    process.exit(1);
}
else {
    console.log('\nAll Guard checks passed.');
}
