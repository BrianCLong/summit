import { enforceAction } from "../src/index.js";
import assert from "assert/strict";
import { describe, it } from "node:test";

describe("Forbidden Tool Regression", () => {
    it("should explicitly deny dangerous tools even if config is ambiguous (future-proof)", () => {
        // Currently we only have deny-by-default, so this just confirms it stays denied.
        const dangerousTools = ["exec_shell", "eval_code", "access_secret"];

        for (const tool of dangerousTools) {
            const decision = enforceAction("hash123", tool, true);
            assert.equal(decision.allow, false, `Tool ${tool} should be denied`);
        }
    });
});
