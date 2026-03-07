import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { createApp } from "../src/app.js";

test("nl query sandbox endpoint returns cypher and estimates", async () => {
  const { app } = createApp({ enableNlQuerySandbox: true });
  const response = await request(app)
    .post("/v1/nl-query/sandbox")
    .set("x-tenant", "sandbox-tenant")
    .set("x-purpose", "investigation")
    .send({
      prompt: 'List all persons connected to the "Orion Breach" case',
      caseScope: { caseId: "case-1" },
    });

  assert.equal(response.status, 200);
  assert.ok(response.body.cypher.includes("MATCH"));
  assert.ok(response.body.estimate.depth >= 0);
  assert.equal(response.body.allowExecute, false);
  assert.ok(Array.isArray(response.body.warnings));
});

test("nl query sandbox honors approval flag for deeper traversals", async () => {
  const { app } = createApp({
    enableNlQuerySandbox: true,
    sandboxMaxDepth: 0,
  });
  const blocked = await request(app)
    .post("/v1/nl-query/sandbox")
    .set("x-tenant", "sandbox-tenant")
    .set("x-purpose", "investigation")
    .send({
      prompt: "Show actors from Berlin connected to Helios Analytics",
      caseScope: { caseId: "case-2" },
    });
  assert.equal(blocked.status, 200);
  assert.equal(blocked.body.allowExecute, false);
  assert.ok(blocked.body.warnings.some((warning) => warning.includes("sandbox cap")));

  const approved = await request(app)
    .post("/v1/nl-query/sandbox")
    .set("x-tenant", "sandbox-tenant")
    .set("x-purpose", "investigation")
    .send({
      prompt: "Show actors from Berlin connected to Helios Analytics",
      caseScope: { caseId: "case-2" },
      approvedExecution: true,
    });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.allowExecute, true);
});
