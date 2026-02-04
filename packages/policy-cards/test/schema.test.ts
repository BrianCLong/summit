import { validatePolicy, canonicalizePolicy } from "../src/index.js";
import assert from "assert/strict";
import { describe, it } from "node:test";

describe("Policy Cards Schema", () => {
  it("should canonicalize strings", () => {
    const input = "  foo  \r\n  bar  ";
    const expected = "foo  \n  bar\n";
    assert.equal(canonicalizePolicy(input), expected);
  });

  it("should validate a simple policy", () => {
    const input = "some policy";
    const result = validatePolicy(input);
    assert.equal(result.ok, true);
    assert.equal(typeof result.hash, "string");
  });

  it("should fail invalid policy", () => {
    const input = "this is an INVALID_POLICY";
    const result = validatePolicy(input);
    assert.equal(result.ok, false);
    assert.ok(result.errors.length > 0);
  });
});
