import { Router } from "express";
import crypto from "crypto";
import { pubsub } from "../realtime/pubsub.js";
import { v4 as uuid } from "uuid";

const router = Router();
const SECRET = process.env.ML_WEBHOOK_SECRET;

function verifySignature(body, sig) {
  const h = crypto.createHmac("sha256", SECRET).update(body).digest("hex");
  try { 
    return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(sig || "")); 
  } catch { 
    return false; 
  }
}

router.post("/ai/webhook", async (req, res) => {
  const sig = req.header("X-IntelGraph-Signature") || "";
  const raw = req.rawBody || JSON.stringify(req.body);
  if (!verifySignature(raw, sig)) return res.status(401).json({ error: "invalid signature" });
  
  const evt = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { job_id, kind } = evt;
  const db = req.db;

  await db.jobs.update(job_id, { status: "SUCCESS", finishedAt: new Date().toISOString() });

  const insights = normalizeInsights(evt);
  for (const payload of insights) {
    const ins = await db.insights.insert({ 
      id: uuid(), 
      jobId: job_id, 
      kind, 
      payload, 
      status: "PENDING", 
      createdAt: new Date().toISOString() 
    });
    pubsub.publish(`INSIGHT_PENDING_${kind || '*'}`, ins);
  }
  
  pubsub.publish(`AI_JOB_${job_id}`, { id: job_id, kind, status: "SUCCESS" });
  await db.audit.insert({ 
    id: uuid(), 
    type: "ML_WEBHOOK", 
    actorId: "ml-service", 
    createdAt: new Date().toISOString(), 
    meta: { jobId: job_id, kind, count: insights.length } 
  });
  
  res.json({ ok: true });
});

function normalizeInsights(evt) {
  if (evt.kind === 'nlp_entities') return evt.results;
  if (evt.kind === 'entity_resolution') return evt.links;
  if (evt.kind === 'link_prediction') return evt.predictions;
  if (evt.kind === 'community_detect') return evt.communities;
  return [evt];
}

export default router;