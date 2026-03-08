"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../packages/packs/src/index.js");
const index_js_2 = require("../packages/policy/src/index.js");
const index_js_3 = require("../packages/evidence/src/index.js");
const assert = __importStar(require("assert"));
async function verify() {
    console.log("Starting MWS Verification...");
    // 1. Pack Import
    console.log("[1] Testing Pack Import...");
    const { manifest } = await (0, index_js_1.importECCPack)();
    assert.strictEqual(manifest.name, "ecc/everything-claude-code");
    console.log("    ✅ Manifest imported.");
    // 2. Policy Gates
    console.log("[2] Testing Policy Gates...");
    const policy = new index_js_2.HookPolicy('safe');
    // Test allowed hook
    const res1 = policy.validate('tmux-reminder', 'echo reminder');
    assert.strictEqual(res1.allowed, true);
    console.log("    ✅ Safe hook allowed.");
    // Test denied hook (unsafe command)
    const res2 = policy.validate('unknown', 'rm -rf /');
    assert.strictEqual(res2.allowed, false);
    console.log("    ✅ Unsafe/Unknown hook denied.");
    // Test MCP Budget
    const budgetRes = (0, index_js_2.validateMCPBudget)(new Array(5), 50); // 5 enabled, 50 total -> OK
    assert.strictEqual(budgetRes.valid, true);
    const budgetFail = (0, index_js_2.validateMCPBudget)(new Array(15), 50); // 15 enabled -> Fail
    assert.strictEqual(budgetFail.valid, false);
    console.log("    ✅ MCP Budget enforced.");
    // 3. Evidence
    console.log("[3] Testing Evidence Ledger...");
    const report = {
        packName: manifest.name,
        runId: 'test-run-' + Date.now(),
        policyResults: {
            hooks: { 'tmux-reminder': true },
            mcp: true,
        },
        metrics: {
            duration: 100,
            toolsUsed: 5,
        },
    };
    const evidenceDir = await (0, index_js_3.writeEvidence)(report, 'artifacts/evidence_test');
    console.log(`    ✅ Evidence written to ${evidenceDir}`);
    console.log("MWS Verification Completed Successfully.");
}
verify().catch((err) => {
    console.error("Verification Failed:", err);
    process.exit(1);
});
