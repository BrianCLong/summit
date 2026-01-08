import request from "supertest";
import { createGunzip } from "zlib";
import tar from "tar-stream";
import { Readable } from "stream";
import app from "../src/server";
import { createClaim, registerEvidence } from "../src/ledger";

async function unpackBundle(buffer: Buffer): Promise<Record<string, string>> {
  const extract = tar.extract();
  const files: Record<string, string> = {};
  return new Promise((resolve, reject) => {
    extract.on("entry", (header, stream, next) => {
      const chunks: Buffer[] = [];
      stream.on("data", (d) => chunks.push(d as Buffer));
      stream.on("end", () => {
        files[header.name] = Buffer.concat(chunks).toString();
        next();
      });
      stream.on("error", reject);
    });
    extract.on("finish", () => resolve(files));
    extract.on("error", reject);
    Readable.from(buffer).pipe(createGunzip()).pipe(extract);
  });
}

describe("export bundle assembler", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("bundles receipts, policy decisions, and redaction metadata", async () => {
    const evidence = registerEvidence({
      contentHash: "hash-export",
      licenseId: "MIT",
      source: "source-a",
      transforms: [],
    });
    const claim = createClaim({
      evidenceIds: [evidence.id],
      text: "exportable claim",
      confidence: 0.92,
      links: ["ref"],
    });

    const receipts = [
      {
        id: "rec-1",
        subject: "case-123",
        type: "ingest",
        issuedAt: new Date().toISOString(),
        actor: "analyst",
        payload: { exposure: "secret", safe: "ok", pii: "123-45-6789" },
      },
      {
        id: "rec-2",
        subject: "case-123",
        type: "decision",
        issuedAt: new Date().toISOString(),
        actor: "ops",
        payload: { note: "drop-me" },
      },
    ];

    const policyDecisions = [
      {
        id: "pol-1",
        decision: "allow" as const,
        rationale: "approved for export",
        policy: "opa/bundle",
        createdAt: new Date().toISOString(),
        attributes: { visibility: "internal" },
      },
    ];

    const response = await request(app.server)
      .post("/prov/export/case-123")
      .send({
        claimId: [claim.id],
        context: {
          user_id: "user-1",
          user_role: "analyst",
          tenant_id: "tenant-1",
          purpose: "analysis",
          export_type: "report",
          approvals: ["compliance-officer"],
          step_up_verified: true,
        },
        receipts,
        policyDecisions,
        redaction: {
          allowReceiptIds: ["rec-1"],
          redactFields: ["pii", "exposure"],
          maskFields: ["actor"],
        },
      })
      .buffer(true)
      .parse((res, callback) => {
        const data: Buffer[] = [];
        res.on("data", (chunk: Buffer) => data.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(data)));
      })
      .expect(200);

    const files = await unpackBundle(response.body as Buffer);
    const manifest = JSON.parse(files["manifest.json"]);
    const bundledReceipts = JSON.parse(files["receipts.json"]);
    const bundledPolicy = JSON.parse(files["policy-decisions.json"]);
    const metadata = JSON.parse(files["metadata.json"]);

    expect(manifest.export.receipts).toBe(1);
    expect(manifest.export.policyDecisions).toBe(1);
    expect(bundledReceipts).toHaveLength(1);
    expect(bundledReceipts[0].payload.pii).toBeUndefined();
    expect(bundledReceipts[0].payload.exposure).toBeUndefined();
    expect(bundledReceipts[0].actor).toBe("[REDACTED]");
    expect(bundledPolicy[0].attributes.visibility).toBe("internal");
    expect(metadata.redaction.applied).toBe(true);
    expect(metadata.redaction.droppedReceipts).toEqual(["rec-2"]);
    expect(metadata.redaction.redactedFields).toEqual(
      expect.arrayContaining(["payload.pii", "payload.exposure"])
    );
    expect(metadata.redaction.maskedFields).toContain("actor");
  });
});
