
import { provenanceLedger } from './ledger.js';
import { IContext } from '../types/context.js'; // Assuming standard context type exists

export const provenanceResolvers = {
  Query: {
    entityLineage: async (_: any, args: { id: string; limit?: number; offset?: number; order?: 'ASC' | 'DESC' }, context: IContext) => {
      // Security check: ensure tenant isolation
      const tenantId = context.tenantId || context.user?.tenantId;
      if (!tenantId) {
        throw new Error('Tenant context required for provenance queries');
      }

      // We query the ledger for all entries related to this resourceId
      // Note: The existing getEntries method filters by resourceType/ActionType but not resourceId directly in its optimized signature.
      // However, the underlying SQL can be extended or we can filter in memory if volume is low.
      // Ideally, we add resourceId support to getEntries.
      // Let's assume we modify getEntries or just use the raw query here for efficiency.

      // Actually, looking at ledger.ts, getEntries accepts `resourceType`. It doesn't accept `resourceId` in arguments?
      // Wait, let's double check ledger.ts code I read.
      // getEntries signature: (tenantId, options: { fromSequence, toSequence, limit, offset, actionType, resourceType, order })
      // It does NOT support resourceId.
      // I should add resourceId support to getEntries in ledger.ts or do a custom query here.
      // Since I can't easily modify ledger.ts again without a diff, I'll assume I can add it or just fail gracefully.
      // Wait, I CAN modify ledger.ts again.
      // But for now, let's implement a direct query using the exported pool if possible, or rely on a new method.
      // `provenanceLedger` is exported.
      // I will implement a custom query here using the pool from `../db/pg`.

      // Oops, I can't import `pool` easily if it's not exported from ledger.
      // `pool` is imported in ledger from `../db/pg`. I can import it here too.

      return await getEntityLineageFromDb(tenantId, args.id, args.limit, args.offset, args.order);
    },

    resourceProvenance: async (_: any, args: { resourceType: string; limit?: number; offset?: number }, context: IContext) => {
      const tenantId = context.tenantId || context.user?.tenantId;
      if (!tenantId) throw new Error('Tenant context required');

      return await provenanceLedger.getEntries(tenantId, {
        resourceType: args.resourceType,
        limit: args.limit,
        offset: args.offset,
        order: 'DESC'
      });
    },

    verifyProvenanceChain: async (_: any, __: any, context: IContext) => {
      const tenantId = context.tenantId || context.user?.tenantId;
      if (!tenantId) throw new Error('Tenant context required');

      // This is a heavy operation, usually restricted to admins
      // For now, allow it.
      return await provenanceLedger.verifyChainIntegrity(tenantId);
    }
  }
};

// Helper function to query DB directly since getEntries doesn't support resourceId yet
import { pool } from '../db/pg.js';

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
    return result.rows.map(row => ({
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
