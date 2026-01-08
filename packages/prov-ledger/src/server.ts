import Fastify from "fastify";
import { z } from "zod";
import { Ledger } from "./ledger";

const ledger = new Ledger({
  dataDir: process.env.LEDGER_DATA_DIR || "./data/ledger",
  enabled: process.env.LEDGER_ENABLED === "true",
});

const app = Fastify({ logger: true });

// POST /evidence
const evidenceSchema = z.object({
  contentHash: z.string(),
  licenseId: z.string(),
  source: z.string(),
  transforms: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.any()).optional(),
});

app.post("/evidence", (req, reply) => {
  try {
    const body = evidenceSchema.parse(req.body);
    const result = ledger.registerEvidence(body);
    return result;
  } catch (err) {
    reply.status(400).send(err);
  }
});

// POST /claims
const claimSchema = z.object({
  evidenceIds: z.array(z.string()),
  transformChainIds: z.array(z.string()).default([]),
  text: z.string(),
  signature: z.string().optional(),
  publicKey: z.string().optional(),
});

app.post("/claims", (req, reply) => {
  try {
    const body = claimSchema.parse(req.body);
    const result = ledger.createClaim(body);
    return result;
  } catch (err) {
    reply.status(400).send(err);
  }
});

// GET /claims/:id
app.get("/claims/:id", (req, reply) => {
  const { id } = req.params as { id: string };
  const claim = ledger.getClaim(id);
  if (!claim) {
    return reply.status(404).send({ error: "Not found" });
  }
  return claim;
});

// POST /exports/manifest
const manifestSchema = z.object({
  claimIds: z.array(z.string()),
});

app.post("/exports/manifest", (req, reply) => {
  try {
    const body = manifestSchema.parse(req.body);
    const manifest = ledger.generateManifest(body.claimIds);
    return manifest;
  } catch (err) {
    reply.status(400).send(err);
  }
});

// For testing purposes
export { app, ledger };

if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen({ port: Number(process.env.PORT) || 3000, host: "0.0.0.0" }).catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}
