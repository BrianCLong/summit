"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../src/index.js");
const strict_1 = __importDefault(require("assert/strict"));
const node_test_1 = require("node:test");
(0, node_test_1.describe)("Policy Bypass Attempt", () => {
    (0, node_test_1.it)("should deny action when enabled (deny-by-default)", () => {
        const decision = (0, index_js_1.enforceAction)("hash123", "some_tool_call", true);
        strict_1.default.equal(decision.allow, false);
        strict_1.default.ok(decision.reason.includes("DENY_DEFAULT"));
    });
    (0, node_test_1.it)("should allow action when disabled", () => {
        const decision = (0, index_js_1.enforceAction)("hash123", "some_tool_call", false);
        strict_1.default.equal(decision.allow, true);
        strict_1.default.equal(decision.reason, "POLICY_DISABLED");
    });
    (0, node_test_1.it)("should always return evidenceId", () => {
        const decision = (0, index_js_1.enforceAction)("hash123", "action", true);
        strict_1.default.ok(decision.evidenceId.startsWith("EVID-POLICY-"));
    });
});
