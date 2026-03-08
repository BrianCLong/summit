"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../src/index.js");
const strict_1 = __importDefault(require("assert/strict"));
const node_test_1 = require("node:test");
(0, node_test_1.describe)("Policy Cards Schema", () => {
    (0, node_test_1.it)("should canonicalize strings", () => {
        const input = "  foo  \r\n  bar  ";
        const expected = "foo  \n  bar\n";
        strict_1.default.equal((0, index_js_1.canonicalizePolicy)(input), expected);
    });
    (0, node_test_1.it)("should validate a simple policy", () => {
        const input = "some policy";
        const result = (0, index_js_1.validatePolicy)(input);
        strict_1.default.equal(result.ok, true);
        strict_1.default.equal(typeof result.hash, "string");
    });
    (0, node_test_1.it)("should fail invalid policy", () => {
        const input = "this is an INVALID_POLICY";
        const result = (0, index_js_1.validatePolicy)(input);
        strict_1.default.equal(result.ok, false);
        strict_1.default.ok(result.errors.length > 0);
    });
});
