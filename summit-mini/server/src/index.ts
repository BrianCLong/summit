import express from "express";
import crypto from "node:crypto";
import { nanoid } from "nanoid";
import { openDb } from "./db.js";
import { extractGraph } from "./ingest.js";
import { evaluatePolicy } from "./policy.js";
import type { ReceiptV01 } from "./types.js";

const app = express();
app.use(express.json({ limit: "2mb" }));

const db = openDb(process.env.DB_PATH ?? "summit-mini.sqlite");

function sha256(s: string) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/ingest", (req, res) => {
  const source = String(req.body?.source ?? "manual");
  const content = String(req.body?.content ?? "");
  const actorId = String(req.body?.actorId ?? "local-user");

  if (!content.trim()) {return res.status(400).json({ error: "content_required" });}

  const createdAt = new Date().toISOString();
  const extracted = extractGraph(content);

  // Store doc
  db.prepare("INSERT INTO docs (id, source, content, created_at) VALUES (?, ?, ?, ?)")
    .run(extracted.docId, source, content, createdAt);

  // Store nodes/edges
  const insN = db.prepare("INSERT OR REPLACE INTO nodes (id, label, kind, score) VALUES (?, ?, ?, ?)");
  const insE = db.prepare("INSERT OR REPLACE INTO edges (id, src, dst, kind, weight) VALUES (?, ?, ?, ?, ?)");

  const nodeIds: string[] = [];
  for (const n of extracted.nodes) {
    insN.run(n.id, n.label, n.kind, n.score);
    nodeIds.push(n.id);
  }

  const edgeIds: string[] = [];
  for (const e of extracted.edges) {
    insE.run(e.id, e.src, e.dst, e.kind, e.weight);
    edgeIds.push(e.id);
  }

  // Create receipt
  const receipt: ReceiptV01 = {
    schemaVersion: "urn:summit:Receipt:v0.1",
    receiptId: `r_${nanoid(10)}`,
    ts: createdAt,
    actor: { id: actorId, type: "user" },
    action: "ingest.text",
    inputs: [{ kind: "text", ref: extracted.docId, meta: { source } }],
    outputs: [
      { kind: "doc", ref: extracted.docId },
      ...nodeIds.map((id) => ({ kind: "node" as const, ref: id })),
      ...edgeIds.map((id) => ({ kind: "edge" as const, ref: id }))
    ],
    hashes: { inputSha256: extracted.inputSha256 }
  };

  db.prepare("INSERT INTO receipts (id, ts, json) VALUES (?, ?, ?)")
    .run(receipt.receiptId, receipt.ts, JSON.stringify(receipt));

  // Policy decision (references receipt)
  const decision = evaluatePolicy({ content, receiptRef: receipt.receiptId });
  db.prepare("INSERT INTO decisions (id, ts, json) VALUES (?, ?, ?)")
    .run(decision.decisionId, decision.ts, JSON.stringify(decision));

  // Optional output hash (receipt+decision)
  receipt.hashes.outputSha256 = sha256(JSON.stringify({ receipt, decision }));
  db.prepare("UPDATE receipts SET json = ? WHERE id = ?")
    .run(JSON.stringify(receipt), receipt.receiptId);

  res.json({ docId: extracted.docId, receipt, decision });
});

app.get("/api/graph", (_req, res) => {
  const nodes = db.prepare("SELECT id, label, kind, score FROM nodes ORDER BY score DESC LIMIT 200").all();
  const edges = db.prepare("SELECT id, src, dst, kind, weight FROM edges LIMIT 400").all();
  res.json({ nodes, edges });
});

app.get("/api/receipts", (_req, res) => {
  const rows = db.prepare("SELECT id, ts, json FROM receipts ORDER BY ts DESC LIMIT 50").all();
  res.json(rows.map((r: any) => ({ id: r.id, ts: r.ts, receipt: JSON.parse(r.json) })));
});

app.get("/api/decisions", (_req, res) => {
  const rows = db.prepare("SELECT id, ts, json FROM decisions ORDER BY ts DESC LIMIT 50").all();
  res.json(rows.map((r: any) => ({ id: r.id, ts: r.ts, decision: JSON.parse(r.json) })));
});

const port = Number(process.env.PORT ?? 4317);
app.listen(port, () => process.stdout.write(`summit-mini server on http://localhost:${port}\n`));
