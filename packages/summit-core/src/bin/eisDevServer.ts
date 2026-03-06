import express from "express";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from 'url';

// Handling ESM dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { MemoryQuarantineStore } from "../epistemics/quarantine/quarantineStore.js";
import { writeArtifacts } from "../writeset/writeArtifacts.js";

const app = express();
app.use(express.json());

const quarantineStore = new MemoryQuarantineStore();
const cfg = {
  burstWindowSec: 120,
  burstThreshold: 100,
  minEvidenceLinks: 1,
  provenanceRequiredFields: ["source", "collected_at", "collector"],
  quarantineScoreThreshold: 0.8,
  allowWithFlagsThreshold: 0.4
};

app.get("/api/eis/quarantine", async (_req, res) => {
  res.json(await quarantineStore.listCases({ status: "open", limit: 200 }));
});

app.post("/api/eis/ingest", async (req, res) => {
  const decision = await writeArtifacts(req.body, { quarantineStore, cfg });
  res.json(decision);
});

app.post("/api/eis/ingest-fixtures", async (_req, res) => {
  const dir = path.join(__dirname, "../fixtures/eis/writesets");
  const files = readdirSync(dir).filter(f => f.endsWith(".json")).sort();
  const decisions = [];
  for (const f of files) {
    const ws = JSON.parse(readFileSync(path.join(dir, f), "utf-8"));
    decisions.push({ file: f, decision: await writeArtifacts(ws, { quarantineStore, cfg }) });
  }
  res.json({ ingested: files.length, decisions });
});

const port = Number(process.env.PORT ?? 4317);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`EIS dev server on http://localhost:${port}`);
  console.log(`POST /api/eis/ingest-fixtures to watch quarantines populate`);
});
