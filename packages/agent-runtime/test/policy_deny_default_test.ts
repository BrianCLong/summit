import { DenyByDefaultPolicyEngine } from "../src/policy/PolicyEngine.js";
import assert from "node:assert";

console.log("Running policy_deny_default_test...");

const pe = new DenyByDefaultPolicyEngine();
const d = pe.authorize({ kind: "model.call", model: "any" }, { principalId: "p", sessionId: "s" });

assert.strictEqual(d.allow, false, "Should deny by default");
assert.strictEqual(d.reason, "deny-by-default", "Reason should be deny-by-default");

console.log("policy_deny_default_test passed.");
