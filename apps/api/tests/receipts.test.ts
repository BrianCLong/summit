import request from "supertest";
import { ExecutionReceipt } from "@intelgraph/provenance";
import { app, store } from "../src/index";

const receipt: ExecutionReceipt = {
  id: "receipt-123",
  createdAt: new Date().toISOString(),
  executionId: "exec-123",
  hashes: { inputs: [], outputs: [], manifest: "manifest" },
  signer: { keyId: "local", algorithm: "ed25519" },
  signature: "sig",
};

describe("receipt routes", () => {
  beforeAll(() => {
    store.seed(receipt, { log: Buffer.from("hello") });
  });

  it("returns receipts by id", async () => {
    const res = await request(app).get(`/receipts/${receipt.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(receipt.id);
  });

  it("exports receipts with optional redaction", async () => {
    const res = await request(app)
      .post("/receipts/export")
      .send({ id: receipt.id, redactions: ["log"], reason: "minimize" });
    expect(res.status).toBe(200);
    expect(res.body.artifacts).not.toContain("log");
    expect(res.body.disclosure.redactions).toContain("log");
  });
});
