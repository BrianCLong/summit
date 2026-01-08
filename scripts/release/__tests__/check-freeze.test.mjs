// scripts/release/__tests__/check-freeze.test.mjs

import { test, describe } from "node:test";
import assert from "node:assert";
import { isFrozen, validateOverride } from "../check-freeze.mjs";

describe("Release Scripts: check-freeze", () => {
  const policy = {
    weekends: ["Saturday", "Sunday"],
    ranges: [{ from: "2024-12-24T00:00:00Z", to: "2024-12-26T23:59:59Z" }],
    overrideMinLength: 10,
  };

  describe("isFrozen()", () => {
    test("should identify a weekend freeze", () => {
      const now = "2024-07-28T10:00:00Z"; // A Sunday in UTC
      assert.strictEqual(isFrozen(policy, now), true);
    });

    test("should identify a date range freeze", () => {
      const now = "2024-12-25T10:00:00Z";
      assert.strictEqual(isFrozen(policy, now), true);
    });

    test("should not freeze on a weekday outside of a range", () => {
      const now = "2024-07-29T10:00:00Z"; // A Monday in UTC
      assert.strictEqual(isFrozen(policy, now), false);
    });
  });

  describe("validateOverride()", () => {
    test("should not throw an error if override is false", () => {
      assert.doesNotThrow(() => validateOverride(policy, false, ""));
    });

    test("should not throw an error for a valid override reason", () => {
      assert.doesNotThrow(() => validateOverride(policy, true, "This is a valid reason."));
    });

    test("should throw an error for an invalid override reason", () => {
      assert.throws(() => validateOverride(policy, true, "Too short"), {
        message: "Override reason must be at least 10 characters long.",
      });
    });
  });
});
