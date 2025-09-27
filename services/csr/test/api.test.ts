import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

const record = {
  recordId: "api-r-1",
  userId: "api-user",
  consentType: "sms",
  status: "granted",
  source: "crm",
  timestamp: "2024-05-06T00:00:00Z",
};

describe("CSR HTTP API", () => {
  it("ingests records, emits proofs, diff, and rollback", async () => {
    const { app } = createApp();

    const ingestResponse = await request(app)
      .post("/ingest")
      .send({ records: [record] })
      .expect(201);

    expect(ingestResponse.body.proofs[0].before.nodes.length).toBeGreaterThan(0);
    expect(ingestResponse.body.proofs[0].after.nodes.length).toBeGreaterThan(0);
    expect(ingestResponse.body.snapshotId).toBeTruthy();

    const diffResponse = await request(app).get("/diff").expect(200);
    expect(diffResponse.body.differences.length).toBeGreaterThan(0);

    const rollbackResponse = await request(app)
      .post("/rollback")
      .send({ snapshotId: ingestResponse.body.snapshotId })
      .expect(200);

    expect(rollbackResponse.body.restoredFrom).toEqual(ingestResponse.body.snapshotId);

    const snapshotsResponse = await request(app).get("/snapshots").expect(200);
    const snapshotIds = snapshotsResponse.body.snapshots.map((snapshot: { id: string }) => snapshot.id);
    expect(snapshotIds).toContain(ingestResponse.body.snapshotId);
    expect(snapshotIds).toContain(rollbackResponse.body.restoredSnapshotId);
  });
});
