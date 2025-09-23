import { getPostgresPool } from '../db/postgres.js';
import logger from '../utils/logger.js';

export interface LLMUsageLog {
  userId?: string;
  model: string;
  prompt: string;
  promptStructure?: Record<string, any>;
  response?: string;
  metadata?: Record<string, any>;
  latencyMs?: number;
}

class LLMUsageService {
  async logInteraction(log: LLMUsageLog): Promise<void> {
    const pg = getPostgresPool();
    const query = `INSERT INTO llm_usage_logs (user_id, model_name, prompt, prompt_structure, response, metadata, latency_ms)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    const values = [
      log.userId || null,
      log.model,
      log.prompt,
      log.promptStructure ? JSON.stringify(log.promptStructure) : null,
      log.response || null,
      log.metadata ? JSON.stringify(log.metadata) : null,
      log.latencyMs || null,
    ];
    try {
      await pg.query(query, values);
    } catch (error: any) {
      logger.error('Failed to log LLM interaction', { error: error.message });
    }
  }
}

export const llmUsageService = new LLMUsageService();
export default LLMUsageService;
