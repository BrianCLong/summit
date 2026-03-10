import { test, describe } from 'node:test';
import * as assert from 'node:assert/strict';
const expect = (actual) => ({ toBe: (expected) => assert.equal(actual, expected), toBeTrue: () => assert.equal(actual, true), toBeFalse: () => assert.equal(actual, false), toContain: (expected) => assert.ok(actual.includes(expected)), toBeCloseTo: (expected) => assert.ok(Math.abs(actual - expected) < 0.001), toMatch: (expected) => assert.match(actual, expected), toBeTruthy: () => assert.ok(actual) });
import { laneAllowed } from "../retrieval/lanePolicy";

test("promoted only excludes lower lanes", () => {
  expect(laneAllowed("PROMOTED", "PROMOTED_ONLY")).toBe(true);
  expect(laneAllowed("TRUSTED", "PROMOTED_ONLY")).toBe(false);
  expect(laneAllowed("OBSERVED", "PROMOTED_ONLY")).toBe(false);
});

test("trusted and up excludes candidate and observed", () => {
  expect(laneAllowed("PROMOTED", "TRUSTED_AND_UP")).toBe(true);
  expect(laneAllowed("TRUSTED", "TRUSTED_AND_UP")).toBe(true);
  expect(laneAllowed("OBSERVED", "TRUSTED_AND_UP")).toBe(false);
  expect(laneAllowed("CANDIDATE", "TRUSTED_AND_UP")).toBe(false);
});
