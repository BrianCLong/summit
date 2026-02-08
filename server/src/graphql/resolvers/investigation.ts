import pino from 'pino';
import { getPostgresPool } from '../../config/database.js';
import type { GraphQLContext } from '../apollo-v5-server.js';
import { authGuard } from '../utils/auth.js';

const logger = (pino as any)();

const investigationResolvers = {
  Query: {
    investigation: async (_: unknown, { id }: { id: string }) => {
      logger.info(`Fetching investigation with ID: ${id} (placeholder)`);
      // Placeholder: In a real implementation, fetch investigation from PostgreSQL
      return {
        id: id,
        name: `Investigation ${id}`,
        description: `Description for investigation ${id}`,
        createdAt: new Date().toISOString(),
      };
    },
    investigations: async (
      _: unknown,
      { limit, offset }: { limit: number; offset: number },
    ) => {
      logger.info(
        `Fetching investigations (placeholder) limit: ${limit}, offset: ${offset}`,
      );
      // Placeholder: In a real implementation, fetch investigations from PostgreSQL with pagination
      return [
        {
          id: 'inv-1',
          name: 'Project Alpha',
          description: 'Initial investigation',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'inv-2',
          name: 'Project Beta',
          description: 'Follow-up investigation',
          createdAt: new Date().toISOString(),
        },
      ];
    },
    auditTrace: async (
      _: unknown,
      {
        investigationId,
        filter,
      }: {
        investigationId: string;
        filter?: {
          userId?: string;
          entityType?: string;
          from?: string;
          to?: string;
        };
      },
    ) => {
      logger.info(`Fetching audit trace for investigation ${investigationId}`);
      const pool = getPostgresPool();
      const params: any[] = [investigationId];
      // Optimized: Use JSONB containment operator (@>) to leverage GIN index on 'details'
      // conditions.push("details @> $1");
      // Parameter $1 becomes '{"investigationId": "..."}'
      const conditions: string[] = ["details @> $1"];
      // Re-map investigationId to a JSON string for the @> operator
      params[0] = JSON.stringify({ investigationId: params[0] });

      if (filter?.userId) {
        params.push(filter.userId);
        conditions.push(`user_id = $${params.length}`);
      }
      if (filter?.entityType) {
        params.push(filter.entityType);
        conditions.push(`resource_type = $${params.length}`);
      }
      if (filter?.from) {
        params.push(filter.from);
        conditions.push(`created_at >= $${params.length}`);
      }
      if (filter?.to) {
        params.push(filter.to);
        conditions.push(`created_at <= $${params.length}`);
      }
      const query = `
        SELECT id, user_id as "userId", action, resource_type as "resourceType",
               resource_id as "resourceId", details, details->>'investigationId' as "investigationId",
               created_at as "createdAt"
        FROM audit_logs
        WHERE ${conditions.join(' AND ')}
        ORDER BY created_at ASC`;
      const { rows } = await pool.query(query, params);
      return rows;
    },
    investigationSnapshots: async (_: unknown, { investigationId }: { investigationId: string }) => {
      logger.info(`Fetching snapshots for investigation ${investigationId}`);
      const pool = getPostgresPool();
      const result = await pool.query(
        'SELECT * FROM maestro.investigation_snapshots WHERE investigation_id = $1 ORDER BY created_at DESC',
        [investigationId]
      );
      return result.rows.map((row: any) => ({
        id: row.id,
        investigationId: row.investigation_id,
        data: row.data,
        snapshotLabel: row.snapshot_label,
        createdAt: row.created_at,
        createdBy: row.created_by
      }));
    },
    investigationSnapshot: async (_: any, { id }: { id: string }) => {
      logger.info(`Fetching snapshot ${id}`);
      const pool = getPostgresPool();
      const result = await pool.query(
        'SELECT * FROM maestro.investigation_snapshots WHERE id = $1',
        [id]
      );
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        id: row.id,
        investigationId: row.investigation_id,
        data: row.data,
        snapshotLabel: row.snapshot_label,
        createdAt: row.created_at,
        createdBy: row.created_by
      };
    },
  },

  Mutation: {
    createInvestigationSnapshot: authGuard(async (
      _: any,
      { investigationId, label }: { investigationId: string; label?: string },
      context: GraphQLContext
    ) => {
      logger.info(`Creating snapshot for investigation ${investigationId}`);
      const pool = getPostgresPool();

      let investigationData = {};
      try {
        const invResult = await pool.query('SELECT * FROM maestro.investigations WHERE id = $1', [investigationId]);
        if (invResult.rows.length > 0) {
          investigationData = invResult.rows[0];
        } else {
          // Fallback for placeholder IDs like 'inv-1'
          investigationData = {
            id: investigationId,
            name: `Investigation ${investigationId}`,
            description: 'Placeholder investigation state',
            entities: [], // Would fetch from Neo4j
            relationships: []
          };
        }
      } catch (e: any) {
        logger.warn(`Failed to fetch investigation details for snapshot, using placeholder: ${e}`);
        investigationData = {
          id: investigationId,
          error: 'Failed to fetch real state',
          timestamp: new Date().toISOString()
        };
      }

      const userId = context.user?.id || 'system';

      const result = await pool.query(
        `INSERT INTO maestro.investigation_snapshots
         (investigation_id, data, snapshot_label, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [investigationId, JSON.stringify(investigationData), label || 'Manual Snapshot', userId]
      );

      const row = result.rows[0];
      return {
        id: row.id,
        investigationId: row.investigation_id,
        data: row.data,
        snapshotLabel: row.snapshot_label,
        createdAt: row.created_at,
        createdBy: row.created_by
      };
    }),

    createInvestigation: authGuard(async (
      _: any,
      { input }: { input: { name: string; description?: string } },
    ) => {
      logger.info(`Creating investigation: ${input.name} (placeholder)`);
      return {
        id: 'new-inv-id',
        name: input.name,
        description: input.description,
        createdAt: new Date().toISOString(),
      };
    }, 'write:case'),

    updateInvestigation: authGuard(async (
      _: any,
      {
        id,
        input,
      }: { id: string; input: { name?: string; description?: string } },
    ) => {
      logger.info(
        `Updating investigation ${id}: ${JSON.stringify(input)} (placeholder)`,
      );
      return {
        id: id,
        name: input.name || `Investigation ${id}`,
        description: input.description || `Description for investigation ${id}`,
        updatedAt: new Date().toISOString(),
      };
    }, 'write:case'),

    deleteInvestigation: authGuard(async (_: any, { id }: { id: string }) => {
      logger.info(`Deleting investigation: ${id} (placeholder)`);
      return true;
    }, 'write:case'),
  },
};

export default investigationResolvers;
