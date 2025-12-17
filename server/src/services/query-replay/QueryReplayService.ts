import { getPostgresPool } from '../../db/postgres';
import pino from 'pino';

const logger = pino({ name: 'QueryReplayService' });

export interface RecordedQuery {
  id: string;
  cypher: string;
  params: any;
  duration_ms: number;
  tenant_id: string;
  timestamp: string;
  replayed: boolean;
  replay_result: any;
  metadata: any;
}

export class QueryReplayService {
  private static instance: QueryReplayService;

  private constructor() {}

  public static getInstance(): QueryReplayService {
    if (!QueryReplayService.instance) {
      QueryReplayService.instance = new QueryReplayService();
    }
    return QueryReplayService.instance;
  }

  async recordSlowQuery(
    cypher: string,
    params: any,
    durationMs: number,
    tenantId: string | undefined,
    metadata: any = {}
  ): Promise<void> {
    try {
      const db = getPostgresPool();
      await db.write(
        `INSERT INTO query_replay_log (
          cypher, params, duration_ms, tenant_id, metadata
        ) VALUES ($1, $2, $3, $4, $5)`,
        [cypher, JSON.stringify(params), durationMs, tenantId, JSON.stringify(metadata)]
      );
      logger.info({ durationMs, tenantId }, 'Recorded slow query');
    } catch (error) {
      logger.error(error, 'Failed to record slow query');
    }
  }

  async getSlowQueries(limit: number = 50, offset: number = 0): Promise<RecordedQuery[]> {
    const db = getPostgresPool();
    const result = await db.read<RecordedQuery>(
      `SELECT * FROM query_replay_log ORDER BY timestamp DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  async replayQuery(id: string): Promise<any> {
    const db = getPostgresPool();
    const result = await db.read<RecordedQuery>(
      `SELECT * FROM query_replay_log WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error('Query not found');
    }

    const recordedQuery = result.rows[0];
    const { cypher, params, tenant_id } = recordedQuery;

    // Run EXPLAIN first
    const explainQuery = `EXPLAIN ${cypher}`;
    let explainResult;

    // Dynamic import to avoid circular dependency
    const { neo, getNeo4jDriver } = await import('../../db/neo4j');

    try {
      explainResult = await neo.run(explainQuery, params, { tenantId: tenant_id });
    } catch (e: any) {
        explainResult = { error: e.message };
    }

    let profileResult;
    let actualDuration = 0;

    const driver = getNeo4jDriver();
    const session = driver.session();

    try {
        const tx = session.beginTransaction();
        try {
            const start = Date.now();
            const res = await tx.run(`PROFILE ${cypher}`, params);
            actualDuration = Date.now() - start;
            profileResult = res.summary.profile;
            await tx.rollback(); // Always rollback to prevent side effects during replay
        } catch (err: any) {
            profileResult = { error: err.message };
        } finally {
            await session.close();
        }
    } catch (err: any) {
         profileResult = { error: err.message };
    }

    const replayResult = {
        explain: explainResult ? (explainResult.summary ? explainResult.summary.plan : explainResult) : null,
        profile: profileResult,
        new_duration_ms: actualDuration
    };

    // Update the log
    await db.write(
        `UPDATE query_replay_log
         SET replayed = TRUE, replay_result = $1
         WHERE id = $2`,
        [JSON.stringify(replayResult), id]
    );

    return replayResult;
  }
}
