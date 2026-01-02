
import { provenanceLedger } from './ledger.js';
import { CanonicalGraphService } from './CanonicalGraphService.js';
import { GraphQLContext } from '../types/context.js';
import { pool } from '../db/pg.js';

export const provenanceResolvers = {
  Query: {
    entityLineage: async (_: any, args: { id: string; limit?: number; offset?: number; order?: 'ASC' | 'DESC' }, context: GraphQLContext) => {
      // Security check: ensure tenant isolation
      const tenantId = context.user?.tenantId;
      if (!tenantId) {
        throw new Error('Tenant context required for provenance queries');
      }

      return await getEntityLineageFromDb(tenantId, args.id, args.limit, args.offset, args.order);
    },

    resourceProvenance: async (_: any, args: { resourceType: string; limit?: number; offset?: number }, context: GraphQLContext) => {
      const tenantId = context.user?.tenantId;
      if (!tenantId) throw new Error('Tenant context required');

      return await provenanceLedger.getEntries(tenantId, {
        resourceType: args.resourceType,
        limit: args.limit,
        offset: args.offset,
        order: 'DESC'
      });
    },

    verifyProvenanceChain: async (_: any, __: any, context: GraphQLContext) => {
      const tenantId = context.user?.tenantId;
      if (!tenantId) throw new Error('Tenant context required');

      // This is a heavy operation, usually restricted to admins
      // For now, allow it.
      return await provenanceLedger.verifyChainIntegrity(tenantId);
    },

    explainCausality: async (_: any, args: { nodeId: string; depth?: number }, context: GraphQLContext) => {
      const tenantId = context.user?.tenantId;
      if (!tenantId) throw new Error('Tenant context required');

      return await CanonicalGraphService.getInstance().explainCausality(
        args.nodeId,
        tenantId,
        args.depth
      );
    },

    provenanceDiff: async (_: any, args: { startNodeId: string; endNodeId: string }, context: GraphQLContext) => {
      const tenantId = context.user?.tenantId;
      if (!tenantId) throw new Error('Tenant context required');

      return await CanonicalGraphService.getInstance().getGraphDiff(
        args.startNodeId,
        args.endNodeId,
        tenantId
      );
    },

    exportProvenanceGraph: async (_: any, args: { from?: Date; to?: Date }, context: GraphQLContext) => {
      const tenantId = context.user?.tenantId;
      if (!tenantId) throw new Error('Tenant context required');

      // Security Check: Verify permission (e.g., 'provenance:export') - Assumed handled by directives or gateway

      return await CanonicalGraphService.getInstance().exportGraph(tenantId, {
        from: args.from,
        to: args.to
      });
    }
  }
};

// Helper function to query DB directly since getEntries doesn't support resourceId yet
async function getEntityLineageFromDb(
  tenantId: string,
  resourceId: string,
  limit = 50,
  offset = 0,
  order = 'DESC'
) {
  const query = `
        SELECT * FROM provenance_ledger_v2
        WHERE tenant_id = $1 AND resource_id = $2
        ORDER BY sequence_number ${order === 'ASC' ? 'ASC' : 'DESC'}
        LIMIT $3 OFFSET $4
    `;

  const result = await pool.query(query, [tenantId, resourceId, limit, offset]);

  // We need to map the rows to match the GraphQL schema
  return result.rows.map((row: any) => ({
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
