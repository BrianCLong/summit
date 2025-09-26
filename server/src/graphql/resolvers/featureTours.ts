import type { Pool } from 'pg';
import { getPostgresPool } from '../../config/database.js';

interface FeatureTourRow {
  id: string;
  userId: string;
  tourKey: string;
  completed: boolean;
  completedAt: string | null;
  lastStep: number | null;
  createdAt: string;
  updatedAt: string;
}

function getPool(): Pool {
  const pool = getPostgresPool();
  if (!pool) {
    throw new Error('PostgreSQL pool is not configured');
  }
  return pool as Pool;
}

export const featureTourResolvers = {
  Query: {
    async featureTourProgress(_: unknown, args: { tourKey: string }, ctx: any) {
      const userId = ctx?.user?.id;
      if (!userId) {
        throw new Error('Not authenticated');
      }

      const pool = getPool();
      const { rows } = await pool.query<FeatureTourRow>(
        `
          SELECT
            id,
            tour_key AS "tourKey",
            user_id AS "userId",
            completed_at IS NOT NULL AS "completed",
            completed_at AS "completedAt",
            last_step AS "lastStep",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
          FROM feature_tour_progress
          WHERE user_id = $1 AND tour_key = $2
        `,
        [userId, args.tourKey],
      );

      return rows[0] ?? null;
    },

    async featureTourProgresses(_: unknown, _args: unknown, ctx: any) {
      const userId = ctx?.user?.id;
      if (!userId) {
        throw new Error('Not authenticated');
      }

      const pool = getPool();
      const { rows } = await pool.query<FeatureTourRow>(
        `
          SELECT
            id,
            tour_key AS "tourKey",
            user_id AS "userId",
            completed_at IS NOT NULL AS "completed",
            completed_at AS "completedAt",
            last_step AS "lastStep",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
          FROM feature_tour_progress
          WHERE user_id = $1
          ORDER BY tour_key
        `,
        [userId],
      );

      return rows;
    },
  },

  Mutation: {
    async recordFeatureTourProgress(
      _: unknown,
      { input }: { input: { tourKey: string; completed?: boolean | null; lastStep?: number | null } },
      ctx: any,
    ) {
      const userId = ctx?.user?.id;
      if (!userId) {
        throw new Error('Not authenticated');
      }

      const pool = getPool();
      const completedAt = input.completed ? new Date().toISOString() : null;
      const lastStep = typeof input.lastStep === 'number' ? input.lastStep : null;

      const { rows } = await pool.query<FeatureTourRow>(
        `
          INSERT INTO feature_tour_progress (user_id, tour_key, completed_at, last_step)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id, tour_key)
          DO UPDATE SET
            completed_at = EXCLUDED.completed_at,
            last_step = EXCLUDED.last_step,
            updated_at = NOW()
          RETURNING
            id,
            tour_key AS "tourKey",
            user_id AS "userId",
            completed_at IS NOT NULL AS "completed",
            completed_at AS "completedAt",
            last_step AS "lastStep",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
        `,
        [userId, input.tourKey, completedAt, lastStep],
      );

      return rows[0];
    },
  },
};

export default featureTourResolvers;
