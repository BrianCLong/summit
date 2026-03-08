"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ai_grounding_js_1 = require("../src/gates/ai_grounding.js");
const assert_1 = __importDefault(require("assert"));
async function test() {
    console.log('Running manual verification for AI Grounding Gate logic...');
    const recs = [
        { name: 'test-pkg', version: '1.0.0', ecosystem: 'npm' }
    ];
    // Test Pass Case
    const res1 = await (0, ai_grounding_js_1.evaluateAIGrounding)(recs, async () => true);
    assert_1.default.strictEqual(res1.ok, true, 'Should pass when resolver returns true');
    assert_1.default.strictEqual(res1.findings.length, 0, 'Should have no findings');
    console.log('✅ PASS case verified');
    // Test Fail Case
    const res2 = await (0, ai_grounding_js_1.evaluateAIGrounding)(recs, async () => false);
    assert_1.default.strictEqual(res2.ok, false, 'Should fail when resolver returns false');
    assert_1.default.ok(res2.findings[0].includes('Unresolvable'), 'Should report unresolvable recommendation');
    console.log('✅ FAIL case verified');
}
test().catch(e => {
    console.error('❌ Verification Failed:', e);
    process.exit(1);
});
