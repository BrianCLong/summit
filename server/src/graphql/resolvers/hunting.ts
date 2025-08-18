import { v4 as uuid } from 'uuid';

const hunts: any[] = [];
const runs: any[] = [];

export const huntingResolvers = {
  Query: {
    hunts: () => hunts,
    hunt: (_: any, { id }: any) => hunts.find(h => h.id === id) || null,
    huntRuns: (_: any, { huntId }: any) => runs.filter(r => r.huntId === huntId)
  },
  Mutation: {
    createHunt: (_: any, { name, pattern, params }: any, ctx: any) => {
      const now = new Date().toISOString();
      const hunt = {
        id: uuid(),
        name,
        pattern,
        params,
        createdAt: now,
        updatedAt: now,
        owner: ctx?.user || 'system',
        lastRun: null
      };
      hunts.push(hunt);
      return hunt;
    },
    runHunt: (_: any, { id }: any) => {
      const now = new Date().toISOString();
      const run = {
        id: uuid(),
        huntId: id,
        startedAt: now,
        finishedAt: now,
        rowCount: 0,
        costMs: 0,
        status: 'ok',
        explain: {}
      };
      runs.push(run);
      return run;
    },
    copilotPlan: (_: any, { prompt }: any, { services }: any) => {
      return services.nl2Cypher.plan(prompt);
    },
    promotePlanToPersisted: (_: any, { name, plan }: any) => {
      const now = new Date().toISOString();
      const hunt = {
        id: uuid(),
        name,
        pattern: plan.cypher,
        params: plan.params,
        createdAt: now,
        updatedAt: now,
        owner: 'system',
        lastRun: null
      };
      hunts.push(hunt);
      return hunt;
    }
  }
};

export default huntingResolvers;
