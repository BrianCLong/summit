import { test } from "node:test";
import * as assert from "node:assert";
import {
  trustAuthMiddleware,
  getRiskSummary,
  getGovernanceSummary,
  getAutomationSummary
} from "../../src/trust/api.js";

function mockReq(headers: any = {}) {
  return { headers };
}

function mockRes() {
  const res: any = {};
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.body = data;
    return res;
  };
  return res;
}

test("trustAuthMiddleware should reject missing auth header with 401", () => {
  const req = mockReq();
  const res = mockRes();
  let nextCalled = false;

  trustAuthMiddleware(req, res, () => { nextCalled = true; });

  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(nextCalled, false);
});

test("trustAuthMiddleware should reject invalid token with 403", () => {
  const req = mockReq({ authorization: "Bearer invalid-token" });
  const res = mockRes();
  let nextCalled = false;

  trustAuthMiddleware(req, res, () => { nextCalled = true; });

  assert.strictEqual(res.statusCode, 403);
  assert.strictEqual(nextCalled, false);
});

test("trustAuthMiddleware should accept valid token and call next", () => {
  const req = mockReq({ authorization: "Bearer valid-trust-read-token" });
  const res = mockRes();
  let nextCalled = false;

  trustAuthMiddleware(req, res, () => { nextCalled = true; });

  assert.strictEqual(nextCalled, true);
});

test("getRiskSummary returns redacted summary JSON", async () => {
  const req = mockReq();
  const res = mockRes();

  await getRiskSummary(req, res);

  assert.strictEqual(res.body.highRiskAlertsHandled, 1);
  assert.deepStrictEqual(res.body.topNarrativeRisks, ["disinformation", "spam"]);
});

test("getGovernanceSummary returns redacted summary JSON", async () => {
  const req = mockReq();
  const res = mockRes();

  await getGovernanceSummary(req, res);

  assert.strictEqual(res.body.tier2And3Decisions, 1);
});

test("getAutomationSummary returns redacted summary JSON", async () => {
  const req = mockReq();
  const res = mockRes();

  await getAutomationSummary(req, res);

  assert.strictEqual(res.body.councilApprovalsRequired, 1);
  assert.strictEqual(res.body.autoApprovals, 1);
});
