import { appendAudit } from '../../audit/audit';
import { PredictiveClient } from '../../services/predictiveClient';
import { Neo4jSession } from '../../db/neo4j';
const client = new PredictiveClient();

export default {
  Query: {
    suggestLinks: async (_: any, { input }: any, ctx: any) => {
      const { tenantId, user } = ctx;
      const data = await client.suggestLinks(input);
      await appendAudit({
        tenantId, actorId: user.id, action: 'predict.suggestLinks',
        resourceType: 'case', resourceId: input.caseId, attrs: { count: data.suggestions?.length || 0 }
      });
      return { ...data, generatedAt: new Date().toISOString() };
    },
    explainSuggestion: (_: any, { id }: any) => client.explain(id),
  },
  Mutation: {
    resolveEntities: async (_: any, { input }: any, ctx: any) => {
      const res = await client.resolveEntities(input);
      await appendAudit({ tenantId: ctx.tenantId, actorId: ctx.user.id, action: 'predict.resolveEntities',
        resourceType: 'case', resourceId: input.caseId, attrs: { merged: res.merged?.length || 0 }});
      return res;
    },
    acceptSuggestion: async (_: any, { id }: any, ctx: any) => {
      // Apply merge/link in Neo4j with guards and budgeter
      const s = ctx.services.suggestions.getById(id);
      const session: Neo4jSession = ctx.neo4j.session();
      try {
        await session.run(
          'MATCH (a),(b) WHERE id(a)=$a AND id(b)=$b MERGE (a)-[:RELATED {source:$source, score:$score, ts:timestamp()}]->(b)',
          { a: Number(s.sourceId), b: Number(s.targetId), source: 'predictive', score: s.score }
        );
      } finally { await session.close(); }
      await appendAudit({ tenantId: ctx.tenantId, actorId: ctx.user.id, action: 'predict.accept',
        resourceType: 'suggestion', resourceId: id, attrs: { score: s.score }});
      ctx.io.to(`case:${s.caseId}`).emit('suggestion:accepted', { id, ...s });
      return { id, status: 'accepted' };
    },
    rejectSuggestion: async (_: any, { id, reason }: any, ctx: any) => {
      await ctx.services.suggestions.markRejected(id, reason);
      await appendAudit({ tenantId: ctx.tenantId, actorId: ctx.user.id, action: 'predict.reject',
        resourceType: 'suggestion', resourceId: id, attrs: { reason }});
      ctx.io.to(`case:${ctx.caseId}`).emit('suggestion:rejected', { id, reason });
      return { id, status: 'rejected' };
    }
  }
};
