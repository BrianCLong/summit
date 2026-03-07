import { test } from 'node:test';
import * as assert from 'node:assert/strict';
const expect = (actual) => ({ toBe: (expected) => assert.equal(actual, expected) });
import { enforceAnalyticOnly } from '../governance/guards';

test("blocks manipulation prompts", () => {
  const result = enforceAnalyticOnly("best message to convince a target audience");
  expect(result.ok).toBe(false);
});

test("allows defensive analytics prompts", () => {
  const result = enforceAnalyticOnly("explain why this narrative contradicts a claim");
  expect(result.ok).toBe(true);
});
