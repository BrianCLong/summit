"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.provenanceResolvers = void 0;
const ledger_js_1 = require("./ledger.js");
const CanonicalGraphService_js_1 = require("./CanonicalGraphService.js");
const pg_js_1 = require("../db/pg.js");
exports.provenanceResolvers = {
    Query: {
        entityLineage: async (_, args, context) => {
            // Security check: ensure tenant isolation
            const tenantId = context.user?.tenantId;
            if (!tenantId) {
                throw new Error('Tenant context required for provenance queries');
            }
            return await getEntityLineageFromDb(tenantId, args.id, args.limit, args.offset, args.order);
        },
        resourceProvenance: async (_, args, context) => {
            const tenantId = context.user?.tenantId;
            if (!tenantId)
                throw new Error('Tenant context required');
            return await ledger_js_1.provenanceLedger.getEntries(tenantId, {
                resourceType: args.resourceType,
                limit: args.limit,
                offset: args.offset,
                order: 'DESC'
            });
        },
        verifyProvenanceChain: async (_, __, context) => {
            const tenantId = context.user?.tenantId;
            if (!tenantId)
                throw new Error('Tenant context required');
            // This is a heavy operation, usually restricted to admins
            // For now, allow it.
            return await ledger_js_1.provenanceLedger.verifyChainIntegrity(tenantId);
        },
        explainCausality: async (_, args, context) => {
            const tenantId = context.user?.tenantId;
            if (!tenantId)
                throw new Error('Tenant context required');
            return await CanonicalGraphService_js_1.CanonicalGraphService.getInstance().explainCausality(args.nodeId, tenantId, args.depth);
        },
        provenanceDiff: async (_, args, context) => {
            const tenantId = context.user?.tenantId;
            if (!tenantId)
                throw new Error('Tenant context required');
            return await CanonicalGraphService_js_1.CanonicalGraphService.getInstance().getGraphDiff(args.startNodeId, args.endNodeId, tenantId);
        },
        exportProvenanceGraph: async (_, args, context) => {
            const tenantId = context.user?.tenantId;
            if (!tenantId)
                throw new Error('Tenant context required');
            // Security Check: Verify permission (e.g., 'provenance:export') - Assumed handled by directives or gateway
            return await CanonicalGraphService_js_1.CanonicalGraphService.getInstance().exportGraph(tenantId, {
                from: args.from,
                to: args.to
            });
        }
    }
};
// Helper function to query DB directly since getEntries doesn't support resourceId yet
async function getEntityLineageFromDb(tenantId, resourceId, limit = 50, offset = 0, order = 'DESC') {
    const query = `
        SELECT * FROM provenance_ledger_v2
        WHERE tenant_id = $1 AND resource_id = $2
        ORDER BY sequence_number ${order === 'ASC' ? 'ASC' : 'DESC'}
        LIMIT $3 OFFSET $4
    `;
    const result = await pg_js_1.pool.query(query, [tenantId, resourceId, limit, offset]);
    // We need to map the rows to match the GraphQL schema
    return result.rows.map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        sequenceNumber: row.sequence_number,
        previousHash: row.previous_hash,
        currentHash: row.current_hash,
        timestamp: row.timestamp,
        actionType: row.action_type,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        actorId: row.actor_id,
        actorType: row.actor_type,
        payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
        signature: row.signature,
        // witness and attribution are stored in metadata in our implementation
        witness: (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata)?.witness,
        attribution: (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata)?.attribution
    }));
}
