import { getPostgresPool } from '../../db/postgres.js';
import { ProvenanceRepo } from '../../repos/ProvenanceRepo.js';
import otel from '../../monitoring/opentelemetry.js';
const pg = getPostgresPool();
const repo = new ProvenanceRepo(pg);
export const provenanceResolvers = {
    Query: {
        provenanceByInvestigation: otel.wrapResolver('provenanceByInvestigation', async (_, { investigationId, after, limit = 100 }, ctx) => {
            const rows = await repo.byInvestigation(investigationId, limit, after);
            return rows.map(r => ({
                id: r.id,
                kind: r.kind,
                hash: r.hash,
                model: r.model,
                subgraphId: r.subgraph_id,
                subgraphHash: r.subgraph_hash,
                policyDecisions: Array.isArray(r.policy_decisions)
                    ? r.policy_decisions
                    : (r.policy_decisions ? JSON.parse(String(r.policy_decisions)) : []),
                incidentId: r.incident_id,
                investigationId: r.investigation_id,
                actorId: r.actor_id,
                actionId: r.action_id,
                createdAt: r.created_at.toISOString(),
            }));
        }),
        provenanceByIncident: otel.wrapResolver('provenanceByIncident', async (_, { incidentId }) => {
            const rows = await repo.byIncident(incidentId);
            return rows.map(r => ({
                id: r.id,
                kind: r.kind,
                hash: r.hash,
                model: r.model,
                subgraphId: r.subgraph_id,
                policyDecisions: Array.isArray(r.policy_decisions)
                    ? r.policy_decisions
                    : (r.policy_decisions ? JSON.parse(String(r.policy_decisions)) : []),
                incidentId: r.incident_id,
                createdAt: r.created_at.toISOString(),
            }));
        })
    },
    Mutation: {
        recordProvenance: otel.wrapResolver('recordProvenance', async (_, { event }) => {
            return await repo.record({
                kind: event.kind,
                hash: event.hash,
                model: event.model,
                subgraphId: event.subgraphId,
                policyDecisions: event.policyDecisions,
                incidentId: event.incidentId,
            });
        })
    }
};
export default provenanceResolvers;
//# sourceMappingURL=provenance.js.map