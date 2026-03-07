import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import request from "supertest";

import { createApp } from "../src/app.js";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/er-golden.json", import.meta.url), "utf8")
);

function buildApp() {
  return createApp({
    erExplainEnabled: true,
    clock: () => new Date("2024-04-04T00:00:00Z"),
  }).app;
}

test("ER candidates endpoint returns deterministic payload", async () => {
  const app = buildApp();
  const response = await request(app)
    .post("/er/candidates")
    .set("x-tenant", fixture.tenantId)
    .set("x-purpose", "investigation")
    .send({
      tenantId: fixture.tenantId,
      entity: fixture.entities[0],
      population: fixture.entities,
      topK: 2,
      seed: "seed-abc",
    });
  assert.equal(response.status, 200);
  assert.ok(response.body.requestId);
  assert.equal(response.body.candidates[0].entityId, "p-2");
  assert.equal(response.body.candidates[0].seed, "seed-abc");
  assert.ok(response.body.candidates[0].contributions.length > 0);
});

test("ER explain endpoint surfaces contribution ranking", async () => {
  const app = buildApp();
  const response = await request(app)
    .post("/er/explain")
    .set("x-tenant", fixture.tenantId)
    .set("x-purpose", "investigation")
    .send({
      tenantId: fixture.tenantId,
      entity: fixture.entities[0],
      candidate: fixture.entities[1],
      seed: "seed-abc",
    });
  assert.equal(response.status, 200);
  assert.equal(response.body.seed, "seed-abc");
  assert.equal(response.body.rationale.at(-1), `Final score ${response.body.score}`);
  assert.equal(response.body.contributions[0].rank, 1);
});

test("ER merge + split record adjudication events", async () => {
  const app = buildApp();
  const mergeResponse = await request(app)
    .post("/er/merge")
    .set("x-tenant", fixture.tenantId)
    .set("x-purpose", "investigation")
    .send({
      merge: {
        tenantId: fixture.tenantId,
        primaryId: "p-1",
        duplicateId: "p-2",
        actor: "analyst@example.com",
        reason: "Deduplicate person record",
        policyTags: ["er:manual-review"],
      },
      entity: fixture.entities[0],
      candidate: fixture.entities[1],
      seed: "seed-abc",
    });
  assert.equal(mergeResponse.status, 200);
  const mergeId = mergeResponse.body.merge.mergeId;
  assert.ok(mergeResponse.body.adjudication.id);
  const splitResponse = await request(app)
    .post("/er/split")
    .set("x-tenant", fixture.tenantId)
    .set("x-purpose", "investigation")
    .send({
      mergeId,
      actor: "lead@example.com",
      reason: "False positive",
    });
  assert.equal(splitResponse.status, 200);
  assert.equal(splitResponse.body.status, "reverted");
  assert.equal(splitResponse.body.adjudication.action, "split");
});
