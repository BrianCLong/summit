import { pg } from '../db/pg';
import { getContext } from '../auth/context';
import pino from 'pino';

const logger = pino({ name: 'resolvers:sprint28' });

export const sprint28Resolvers = {
  Query: {
    funnel: async (_: any, { period }: { period: string }, ctx: any) => {
      // Logic: Aggregate events by name in the given period
      // Note: "period" parsing (e.g. "7d") is simplified here.
      const tenantId = ctx.user?.tenantId;
      if (!tenantId) throw new Error('Unauthorized');

      try {
        const rows = await pg.many(
          `SELECT event_name as name, count(*) as value
           FROM analytics_events
           WHERE workspace_id = $1
           AND created_at > NOW() - INTERVAL '7 days' -- simplified period handling
           GROUP BY event_name`,
          [tenantId]
        );
        return rows.map((r) => ({ ...r, period }));
      } catch (err) {
        logger.error({ err }, 'Error fetching funnel');
        return [];
      }
    },
    pilotKpis: async (_: any, { workspaceId }: { workspaceId: string }) => {
      // Fetch real counts from DB
      try {
        const [npsRow] = await pg.many(
          `SELECT AVG(score) as nps FROM nps_responses WHERE workspace_id = $1`,
          [workspaceId]
        );
        const [queriesRow] = await pg.many(
          `SELECT COUNT(*) as cnt FROM analytics_events WHERE workspace_id = $1 AND event_name = 'query'`,
          [workspaceId]
        );
        // Mocking other stats for MVP as they might come from other systems (Neo4j, etc)
        // or we can query them if we had tables.
        // Assuming "cases" and "exports" are tracked in analytics_events for now.

        return {
          ttfwMin: 5, // Placeholder metric
          dau: 15, // Placeholder metric
          queries: parseInt(queriesRow?.cnt || '0', 10),
          cases: 12,
          exports: 3,
          nps: parseFloat(npsRow?.nps || '0'),
        };
      } catch (err) {
        logger.error({ err }, 'Error fetching pilot KPIs');
        throw new Error('Failed to fetch pilot KPIs');
      }
    },
    pilotSuccess: async (_: any, { workspaceId }: { workspaceId: string }) => {
      // Similar logic to KPIs but formatted as cards
      // For MVP, we'll return a static structure populated with some real data
      const kpis = await sprint28Resolvers.Query.pilotKpis(
        _,
        { workspaceId },
        {}
      );
      return [
        {
          label: 'NPS',
          value: kpis.nps.toFixed(1),
          status: kpis.nps > 8 ? 'success' : 'warning',
          hint: 'Target: > 9.0',
        },
        {
          label: 'Queries',
          value: kpis.queries.toString(),
          status: 'success',
          hint: null,
        },
      ];
    },
  },
  Mutation: {
    submitNps: async (
      _: any,
      { score, comment }: { score: number; comment?: string },
      ctx: any
    ) => {
      const workspaceId = ctx.user?.tenantId;
      if (!workspaceId) throw new Error('Unauthorized');

      try {
        await pg.write(
          `INSERT INTO nps_responses (workspace_id, score, comment) VALUES ($1, $2, $3)`,
          [workspaceId, score, comment]
        );
        logger.info({ workspaceId, score }, 'NPS Submitted');
        return true;
      } catch (err) {
        logger.error({ err }, 'Error submitting NPS');
        throw new Error('Failed to submit NPS');
      }
    },
    recordEvent: async (
      _: any,
      { name, props }: { name: string; props: any },
      ctx: any
    ) => {
      const workspaceId = ctx.user?.tenantId;
      if (!workspaceId) throw new Error('Unauthorized');

      try {
        await pg.write(
          `INSERT INTO analytics_events (workspace_id, event_name, properties) VALUES ($1, $2, $3)`,
          [workspaceId, name, props] // pg library handles JSON serialization if passed as object usually, or we stringify
        );
        return true;
      } catch (err) {
        logger.error({ err }, 'Error recording event');
        // Swallow error for telemetry to not break app flow?
        return false;
      }
    },
    startTrial: async (
      _: any,
      { plan, days }: { plan: string; days: number },
      ctx: any
    ) => {
      logger.info(
        { userId: ctx.user?.id, plan, days },
        'Starting trial (Stub)'
      );
      // Logic to update user/tenant subscription would go here
      return true;
    },
    upgradePlan: async (_: any, { plan }: { plan: string }, ctx: any) => {
      logger.info({ userId: ctx.user?.id, plan }, 'Upgrading plan (Stub)');
      // Logic to process upgrade would go here
      return true;
    },
  },
};

export default sprint28Resolvers;
