import { enforceAction } from "../src/index.js";
import assert from "assert/strict";
import { describe, it } from "node:test";

describe("Policy Bypass Attempt", () => {
    it("should deny action when enabled (deny-by-default)", () => {
        const decision = enforceAction("hash123", "some_tool_call", true);
        assert.equal(decision.allow, false);
        assert.ok(decision.reason.includes("DENY_DEFAULT"));
    });

    it("should allow action when disabled", () => {
        const decision = enforceAction("hash123", "some_tool_call", false);
        assert.equal(decision.allow, true);
        assert.equal(decision.reason, "POLICY_DISABLED");
    });

    it("should always return evidenceId", () => {
        const decision = enforceAction("hash123", "action", true);
        assert.ok(decision.evidenceId.startsWith("EVID-POLICY-"));
    });
});
