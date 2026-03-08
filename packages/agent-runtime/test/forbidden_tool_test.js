"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../src/index.js");
const strict_1 = __importDefault(require("assert/strict"));
const node_test_1 = require("node:test");
(0, node_test_1.describe)("Forbidden Tool Regression", () => {
    (0, node_test_1.it)("should explicitly deny dangerous tools even if config is ambiguous (future-proof)", () => {
        // Currently we only have deny-by-default, so this just confirms it stays denied.
        const dangerousTools = ["exec_shell", "eval_code", "access_secret"];
        for (const tool of dangerousTools) {
            const decision = (0, index_js_1.enforceAction)("hash123", tool, true);
            strict_1.default.equal(decision.allow, false, `Tool ${tool} should be denied`);
        }
    });
});
