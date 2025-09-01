import { v4 as uuid } from 'uuid';
const hunts = [];
const runs = [];
export const huntingResolvers = {
    Query: {
        hunts: () => hunts,
        hunt: (_, { id }) => hunts.find(h => h.id === id) || null,
        huntRuns: (_, { huntId }) => runs.filter(r => r.huntId === huntId)
    },
    Mutation: {
        createHunt: (_, { name, pattern, params }, ctx) => {
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
        runHunt: (_, { id }) => {
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
        copilotPlan: (_, { prompt }, { services }) => {
            return services.nl2Cypher.plan(prompt);
        },
        promotePlanToPersisted: (_, { name, plan }) => {
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
//# sourceMappingURL=hunting.js.map