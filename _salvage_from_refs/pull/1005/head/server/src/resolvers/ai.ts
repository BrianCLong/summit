import axios from "axios";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { pubsub } from "../realtime/pubsub";
import logger from "../utils/logger";

const ML_URL = process.env.ML_URL || "http://intelgraph-ml:8081";
const JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY!;
const JWT_ALGO = "RS256" as const;

async function mlCall(path: string, payload: any, ctx: any){
  const token = jwt.sign({ sub: ctx.user.id, roles: ctx.user.roles }, JWT_PRIVATE_KEY, { algorithm: JWT_ALGO, expiresIn: "5m" });
  try {
    const { data } = await axios.post(`${ML_URL}${path}`, payload, { headers: { Authorization: `Bearer ${token}` } });
    return data;
  } catch (err: any) {
    logger.error("ML request failed", { path, error: err.message });
    throw err;
  }
}

export const AIResolvers = {
  Query: {
    aiJob: async (_: any, { id }: any, { db }: any) => db.jobs.findById(id),
    insights: async (_: any, { status, kind }: any, { db }: any) => db.insights.findMany({ status, kind })
  },
  Mutation: {
    aiExtractEntities: async (_: any, { docs, jobId }: any, ctx: any) => queueJob(ctx, "nlp_entities", "/nlp/entities", { docs }, jobId),
    aiResolveEntities: async (_: any, { records, threshold, jobId }: any, ctx: any) => queueJob(ctx, "entity_resolution", "/er/resolve", { records, threshold }, jobId),
    aiLinkPredict: async (_: any, { graphSnapshotId, topK, jobId }: any, ctx: any) => {
      const edges = await fetchEdgesForSnapshot(ctx.neo4j, graphSnapshotId);
      return queueJob(ctx, "link_prediction", "/graph/link_predict", { graph_snapshot_id: graphSnapshotId, top_k: topK, edges }, jobId);
    },
    aiCommunityDetect: async (_: any, { graphSnapshotId, jobId }: any, ctx: any) => {
      const edges = await fetchEdgesForSnapshot(ctx.neo4j, graphSnapshotId);
      return queueJob(ctx, "community_detect", "/graph/community_detect", { graph_snapshot_id: graphSnapshotId, edges }, jobId);
    },
    approveInsight: async (_: any, { id }: any, { db, user }: any) => decideInsight(db, id, "APPROVED", user.id),
    rejectInsight: async (_: any, { id, reason }: any, { db, user }: any) => decideInsight(db, id, "REJECTED", user.id, reason)
  },
  Subscription: {
    aiJobProgress: { subscribe: (_: any, { jobId }: any, { subscriptions }: any) => subscriptions.asyncIterator(`AI_JOB_${jobId}`), resolve: (p: any)=>p },
    insightAdded: { subscribe: (_: any, { status, kind }: any, { subscriptions }: any) => subscriptions.asyncIterator(`INSIGHT_${status||'*'}_${kind||'*'}`), resolve: (p:any)=>p }
  }
};

async function queueJob(ctx: any, kind: string, path: string, body: any, jobId?: string){
  const id = jobId || uuid();
  const callbackUrl = `${ctx.config.publicBaseUrl}/ai/webhook`;
  const createdAt = new Date().toISOString();
  await ctx.db.jobs.insert({ id, kind, status: "QUEUED", createdAt, meta: { ...body } });
  try {
    await mlCall(path, { ...body, job_id: id, callback_url: callbackUrl }, ctx);
  } catch (err: any) {
    await ctx.db.jobs.update(id, { status: "FAILED", error: err.message, updatedAt: new Date().toISOString() });
    logger.error("AI job failed", { id, kind, error: err.message });
    throw err;
  }
  return { id, kind, status: "QUEUED", createdAt };
}

async function fetchEdgesForSnapshot(neo4j: any, snapshotId: string){
  const session = neo4j.session();
  try{
    const res = await session.run(`MATCH (a)-[r]->(b) WHERE r.snapshotId = $snapshotId RETURN a.id as u, b.id as v`, { snapshotId });
    return res.records.map((rec: any) => [rec.get("u"), rec.get("v")]);
  } finally { await session.close(); }
}

async function decideInsight(db: any, id: string, status: "APPROVED"|"REJECTED", userId: string, reason?: string){
  const now = new Date().toISOString();
  const ins = await db.insights.update(id, { status, decidedAt: now, decidedBy: userId });
  await db.audit.insert({ id: uuid(), type: "INSIGHT_DECISION", actorId: userId, createdAt: now, meta: { insightId: id, status, reason } });
  await db.feedback.insert({ id: uuid(), insightId: id, decision: status, createdAt: now });
  return ins;
}