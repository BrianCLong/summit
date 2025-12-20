import { Pool } from 'pg';
import { config } from '../config';
import { Tool } from './schemas';

export class ToolRetriever {
  private pool: Pool;

  constructor() {
    this.pool = new Pool(config.postgres);
  }

  public async retrieve(tenantId: string, query: string, topK = 5): Promise<Tool[]> {
    // a very simple BM25-like scoring
    const searchQuery = `
      SELECT *, ts_rank_cd(to_tsvector('english', name || ' ' || description || ' ' || array_to_string(tags, ' ')), to_tsquery('english', $1)) as score
      FROM tools
      WHERE tenant_id = $2 AND enabled = true
      ORDER BY score DESC
      LIMIT $3
    `;
    const result = await this.pool.query(searchQuery, [query, tenantId, topK]);
    return result.rows;
  }
}
