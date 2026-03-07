import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import {
  AuditExporter,
  verifyChain,
  verifySignature,
  type AuditRecord,
} from "../src/lib/audit-exporter.js";

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "audit-export-"));

const sampleRecord = (overrides: Partial<AuditRecord> = {}): AuditRecord => ({
  sequence: overrides.sequence ?? 1,
  recorded_at: new Date().toISOString(),
  prev_hash: overrides.prev_hash ?? "GENESIS",
  payload_hash: overrides.payload_hash ?? "hash-payload",
  hash: overrides.hash ?? "hash-1",
  event: {
    version: "audit_event_v1",
    actor: { type: "service", id: "svc-1", ip_address: "10.0.0.1" },
    action: "policy_decision",
    resource: { type: "resource", id: "res-1", owner: "owner-1" },
    classification: "confidential" as const,
    policy_version: "v1",
    decision_id: "dec-1",
    trace_id: "trace-1",
    timestamp: new Date().toISOString(),
    customer: "customer-a",
    metadata: { info: "data" },
    ...overrides.event,
  },
});

const computeHash = (
  record: Pick<AuditRecord, "sequence" | "recorded_at" | "prev_hash" | "payload_hash">
) =>
  crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        sequence: record.sequence,
        recorded_at: record.recorded_at,
        prev_hash: record.prev_hash,
        payload_hash: record.payload_hash,
      })
    )
    .digest("hex");

describe("audit exporter", () => {
  it("redacts confidential fields and signs manifest", async () => {
    const dir = tmpDir();
    const storePath = path.join(dir, "store.jsonl");
    const record = sampleRecord();
    record.hash = computeHash(record);
    fs.writeFileSync(storePath, `${JSON.stringify(record)}\n`, "utf8");

    const exporter = new AuditExporter();
    const { manifest, directory } = await exporter.export({
      customer: "customer-a",
      storePath,
      outputDir: dir,
    });

    expect(manifest.event_count).toBe(1);
    expect(manifest.hash_chain.valid).toBe(true);
    expect(manifest.signature).toBeDefined();
    const events = fs
      .readFileSync(path.join(directory, "events.jsonl"), "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    expect(events[0].event.actor.id).toBeUndefined();
    expect(events[0].event.resource.id).toBeUndefined();
    expect(verifySignature(manifest)).toBe(true);
  });

  it("verifies hash chains", () => {
    const compute = (record: any) =>
      crypto
        .createHash("sha256")
        .update(
          JSON.stringify({
            sequence: record.sequence,
            recorded_at: record.recorded_at,
            prev_hash: record.prev_hash,
            payload_hash: record.payload_hash,
          })
        )
        .digest("hex");

    const record1 = sampleRecord({ payload_hash: "p1" });
    record1.hash = compute(record1);
    const record2 = sampleRecord({ sequence: 2, prev_hash: record1.hash, payload_hash: "p2" });
    record2.hash = compute(record2);

    expect(verifyChain([record1, record2])).toBe(true);
    record2.prev_hash = "tampered";
    expect(verifyChain([record1, record2])).toBe(false);
  });
});
