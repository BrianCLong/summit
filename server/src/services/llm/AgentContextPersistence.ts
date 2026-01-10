import { v4 as uuidv4 } from 'uuid';
import type { AgentTurn, ContextPersistence } from '@intelgraph/agent-context';
import { getPostgresPool } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

export class PostgresAgentContextPersistence implements ContextPersistence {
  private readonly poolProvider: typeof getPostgresPool;

  constructor(poolProvider: typeof getPostgresPool = getPostgresPool) {
    this.poolProvider = poolProvider;
  }

  async persist(turn: AgentTurn): Promise<void> {
    const pool = this.poolProvider();
    const meta = turn.meta ?? {};
    const turnId = typeof meta.turnId === 'string' ? meta.turnId : uuidv4();
    const createdAt = meta.timestamp ? new Date(meta.timestamp) : new Date();

    const query = `
      INSERT INTO agent_context_turns (
        id,
        run_id,
        agent_id,
        task_id,
        turn_index,
        reasoning,
        action,
        observation_content,
        observation_type,
        meta,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    const values = [
      turnId,
      meta.runId ?? null,
      meta.agentId ?? null,
      meta.taskId ?? null,
      typeof meta.turnIndex === 'number' ? meta.turnIndex : null,
      turn.reasoning,
      turn.action ?? null,
      turn.observation?.content ?? null,
      turn.observation?.type ?? null,
      meta,
      createdAt,
    ];

    try {
      await pool.write(query, values, { label: 'agent-context.persist' });
    } catch (error) {
      logger.error(
        { error, runId: meta.runId, agentId: meta.agentId },
        'Failed to persist agent context turn',
      );
      throw error;
    }
  }
}
