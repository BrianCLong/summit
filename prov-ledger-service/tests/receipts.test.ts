import request from "supertest";
import tar from "tar-stream";
import { createGunzip } from "zlib";
import app from "../src/server";
import { verifyReceiptSignature } from "@intelgraph/provenance";

function bufferParser(res: NodeJS.ReadableStream, callback: any) {
  const data: Uint8Array[] = [];
  res.on("data", (chunk) => data.push(chunk));
  res.on("end", () => callback(null, Buffer.concat(data)));
}

describe("receipt routes", () => {
  it("issues, retrieves, and exports receipts with redaction metadata", async () => {
    const ev = await request(app.server).post("/evidence/register").send({
      contentHash: "abcd",
      licenseId: "MIT",
      source: "sensor-A",
      transforms: [],
    });

    expect(ev.status).toBe(200);

    const claim = await request(app.server)
      .post("/claims")
      .send({
        evidenceId: [ev.body.evidenceId],
        text: "receipt claim",
        confidence: 0.9,
        links: [],
        caseId: "case-42",
        actor: { id: "agent-1", role: "analyst" },
        redactions: [{ path: "actor.id", reason: "privacy" }],
      });

    expect(claim.status).toBe(200);
    expect(claim.body.receiptId).toBeDefined();
    const receiptId = claim.body.receiptId;

    const receiptRes = await request(app.server).get(`/receipts/${receiptId}`);
    expect(receiptRes.status).toBe(200);
    expect(receiptRes.body.valid).toBe(true);
    expect(verifyReceiptSignature(receiptRes.body.receipt)).toBe(true);

    const exportRes = await request(app.server)
      .post("/receipts/export")
      .send({
        receiptIds: [receiptId],
        includeProvenance: true,
        redactions: [{ path: "actor.role", reason: "least-privilege" }],
      })
      .buffer()
      .parse(bufferParser);

    expect(exportRes.status).toBe(200);

    const entries: string[] = [];
    const gunzip = createGunzip();
    const extract = tar.extract();

    const bundleBuffer: Buffer = exportRes.body as Buffer;

    await new Promise<void>((resolve, reject) => {
      extract.on("entry", (header, stream, next) => {
        entries.push(header.name);
        stream.on("end", next);
        stream.on("error", reject);
        stream.resume();
      });
      extract.on("finish", resolve);
      gunzip.on("error", reject);
      extract.on("error", reject);

      gunzip.pipe(extract);
      gunzip.end(bundleBuffer);
    });

    expect(entries).toContain(`receipts/full/${receiptId}.json`);
    expect(entries).toContain(`receipts/redacted/${receiptId}.json`);
    expect(entries.some((e) => e.startsWith("provenance/"))).toBe(true);
  });
});
