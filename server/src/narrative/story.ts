import type { Pool } from 'pg';
import { randomUUID } from 'node:crypto';

export type StoryEvent = {
  id: string;
  timestamp: number;
  entityId?: string;
  edgeId?: string;
  description: string;
  source: 'graph' | 'user';
};

export type StoryBlock = {
  id: string;
  type: 'markdown' | 'analysis';
  content: string;
  citations: string[]; // entity IDs
};

export type Story = {
  id: string;
  caseId: string;
  title: string;
  events: StoryEvent[];
  blocks: StoryBlock[];
  createdAt: number;
  updatedAt: number;
};

export class StoryManager {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async create(caseId: string, title: string): Promise<Story> {
    const res = await this.pool.query(
      `INSERT INTO stories (case_id, title, created_at, updated_at)
       VALUES ($1, $2, $3, $3)
       RETURNING id, case_id, title, created_at, updated_at`,
      [caseId, title, Date.now()]
    );
    const row = res.rows[0];
    return {
      id: row.id,
      caseId: row.case_id,
      title: row.title,
      events: [],
      blocks: [],
      createdAt: parseInt(row.created_at),
      updatedAt: parseInt(row.updated_at)
    };
  }

  async get(id: string): Promise<Story | undefined> {
    const storyRes = await this.pool.query(`SELECT * FROM stories WHERE id = $1`, [id]);
    if (storyRes.rowCount === 0) return undefined;
    const sRow = storyRes.rows[0];

    const eventsRes = await this.pool.query(
        `SELECT * FROM story_events WHERE story_id = $1 ORDER BY timestamp ASC`,
        [id]
    );
    const events: StoryEvent[] = eventsRes.rows.map(r => ({
        id: r.id,
        timestamp: parseInt(r.timestamp),
        entityId: r.entity_id,
        edgeId: r.edge_id,
        description: r.description,
        source: r.source
    }));

    const blocksRes = await this.pool.query(
        `SELECT * FROM story_blocks WHERE story_id = $1 ORDER BY position ASC`,
        [id]
    );
    const blocks: StoryBlock[] = blocksRes.rows.map(r => ({
        id: r.id,
        type: r.type,
        content: r.content,
        citations: r.citations || []
    }));

    return {
      id: sRow.id,
      caseId: sRow.case_id,
      title: sRow.title,
      createdAt: parseInt(sRow.created_at),
      updatedAt: parseInt(sRow.updated_at),
      events,
      blocks
    };
  }

  async addEvent(storyId: string, event: Omit<StoryEvent, 'id'>): Promise<StoryEvent> {
    const res = await this.pool.query(
      `INSERT INTO story_events (story_id, timestamp, description, entity_id, edge_id, source, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [storyId, event.timestamp, event.description, event.entityId, event.edgeId, event.source, Date.now()]
    );

    // Update story timestamp
    await this.pool.query(`UPDATE stories SET updated_at = $2 WHERE id = $1`, [storyId, Date.now()]);

    return { ...event, id: res.rows[0].id };
  }

  async addBlock(storyId: string, block: Omit<StoryBlock, 'id'>): Promise<StoryBlock> {
    // Get max position
    const posRes = await this.pool.query(`SELECT MAX(position) as max_pos FROM story_blocks WHERE story_id = $1`, [storyId]);
    const pos = (posRes.rows[0].max_pos || 0) + 1;

    const res = await this.pool.query(
      `INSERT INTO story_blocks (story_id, type, content, citations, position, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [storyId, block.type, block.content, block.citations, pos, Date.now()]
    );

    // Update story timestamp
    await this.pool.query(`UPDATE stories SET updated_at = $2 WHERE id = $1`, [storyId, Date.now()]);

    return { ...block, id: res.rows[0].id };
  }
}
