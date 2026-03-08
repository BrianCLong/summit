"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const PolicyEngine_js_1 = require("../src/policy/PolicyEngine.js");
const node_assert_1 = __importDefault(require("node:assert"));
console.log("Running policy_deny_default_test...");
const pe = new PolicyEngine_js_1.DenyByDefaultPolicyEngine();
const d = pe.authorize({ kind: "model.call", model: "any" }, { principalId: "p", sessionId: "s" });
node_assert_1.default.strictEqual(d.allow, false, "Should deny by default");
node_assert_1.default.strictEqual(d.reason, "deny-by-default", "Reason should be deny-by-default");
console.log("policy_deny_default_test passed.");
