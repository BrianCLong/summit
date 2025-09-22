import axios from 'axios';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import logger from '../utils/logger';
import { wrapResolversWithPolicy } from './policyWrapper';
const ML_URL = process.env.ML_URL || 'http://intelgraph-ml:8081';
const JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY;
const JWT_ALGO = 'RS256';
async function mlCall(path, payload, ctx) {
    const token = jwt.sign({ sub: ctx.user.id, roles: ctx.user.roles }, JWT_PRIVATE_KEY, {
        algorithm: JWT_ALGO,
        expiresIn: '5m',
    });
    try {
        const { data } = await axios.post(`${ML_URL}${path}`, payload, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return data;
    }
    catch (err) {
        logger.error('ML request failed', { path, error: err.message });
        throw err;
    }
}
const resolvers = {
    Query: {
        aiJob: async (_, { id }, { db }) => db.jobs.findById(id),
        insights: async (_, { status, kind }, { db }) => db.insights.findMany({ status, kind }),
    },
    Mutation: {
        aiExtractEntities: async (_, { docs, jobId }, ctx) => queueJob(ctx, 'nlp_entities', '/nlp/entities', { docs }, jobId),
        aiResolveEntities: async (_, { records, threshold, jobId }, ctx) => queueJob(ctx, 'entity_resolution', '/er/resolve', { records, threshold }, jobId),
        aiLinkPredict: async (_, { graphSnapshotId, topK, jobId }, ctx) => {
            const edges = await fetchEdgesForSnapshot(ctx.neo4j, graphSnapshotId);
            return queueJob(ctx, 'link_prediction', '/graph/link_predict', { graph_snapshot_id: graphSnapshotId, top_k: topK, edges }, jobId);
        },
        aiCommunityDetect: async (_, { graphSnapshotId, jobId }, ctx) => {
            const edges = await fetchEdgesForSnapshot(ctx.neo4j, graphSnapshotId);
            return queueJob(ctx, 'community_detect', '/graph/community_detect', { graph_snapshot_id: graphSnapshotId, edges }, jobId);
        },
        approveInsight: async (_, { id }, { db, user }) => decideInsight(db, id, 'APPROVED', user.id),
        rejectInsight: async (_, { id, reason }, { db, user }) => decideInsight(db, id, 'REJECTED', user.id, reason),
    },
    Subscription: {
        aiJobProgress: {
            subscribe: (_, { jobId }, { subscriptions }) => subscriptions.asyncIterator(`AI_JOB_${jobId}`),
            resolve: (p) => p,
        },
        insightAdded: {
            subscribe: (_, { status, kind }, { subscriptions }) => subscriptions.asyncIterator(`INSIGHT_${status || '*'}_${kind || '*'}`),
            resolve: (p) => p,
        },
    },
};
export const AIResolvers = wrapResolversWithPolicy('AI', resolvers);
async function queueJob(ctx, kind, path, body, jobId) {
    const id = jobId || uuid();
    const callbackUrl = `${ctx.config.publicBaseUrl}/ai/webhook`;
    const createdAt = new Date().toISOString();
    await ctx.db.jobs.insert({
        id,
        kind,
        status: 'QUEUED',
        createdAt,
        meta: { ...body },
    });
    try {
        await mlCall(path, { ...body, job_id: id, callback_url: callbackUrl }, ctx);
    }
    catch (err) {
        await ctx.db.jobs.update(id, {
            status: 'FAILED',
            error: err.message,
            updatedAt: new Date().toISOString(),
        });
        logger.error('AI job failed', { id, kind, error: err.message });
        throw err;
    }
    return { id, kind, status: 'QUEUED', createdAt };
}
async function fetchEdgesForSnapshot(neo4j, snapshotId) {
    const session = neo4j.session();
    try {
        const res = await session.run(`MATCH (a)-[r]->(b) WHERE r.snapshotId = $snapshotId RETURN a.id as u, b.id as v`, { snapshotId });
        return res.records.map((rec) => [rec.get('u'), rec.get('v')]);
    }
    finally {
        await session.close();
    }
}
async function decideInsight(db, id, status, userId, reason) {
    const now = new Date().toISOString();
    const ins = await db.insights.update(id, {
        status,
        decidedAt: now,
        decidedBy: userId,
    });
    await db.audit.insert({
        id: uuid(),
        type: 'INSIGHT_DECISION',
        actorId: userId,
        createdAt: now,
        meta: { insightId: id, status, reason },
    });
    await db.feedback.insert({
        id: uuid(),
        insightId: id,
        decision: status,
        createdAt: now,
    });
    return ins;
}
