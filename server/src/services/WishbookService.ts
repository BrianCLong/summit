import { randomUUID } from 'node:crypto';
import { AppError } from '../lib/errors.js';
import { getPostgresPool } from '../db/postgres.js';
import {
  CreateWishbookItemDTO,
  CreateWishbookItemSchema,
  WishbookItem,
  WishbookStatus,
  WishbookTags,
  DependencyClass,
} from '../wishbook/types.js';

export class WishbookService {
  private static instance: WishbookService;

  private constructor() {
    this.ensureSchema().catch((err) => {
      console.error('Failed to ensure Wishbook schema:', err);
    });
  }

  public static getInstance(): WishbookService {
    if (!WishbookService.instance) {
      WishbookService.instance = new WishbookService();
    }
    return WishbookService.instance;
  }

  // For testing purposes (clears DB table)
  public async _resetForTesting(): Promise<void> {
    const pool = getPostgresPool();
    await pool.query('DELETE FROM wishbook_items');
  }

  private async ensureSchema(): Promise<void> {
    const pool = getPostgresPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wishbook_items (
        id UUID PRIMARY KEY,
        title TEXT NOT NULL,
        problem TEXT NOT NULL,
        "user" TEXT NOT NULL,
        impact TEXT NOT NULL,
        evidence TEXT,
        dependencies TEXT,
        cost TEXT,
        tags JSONB,
        prioritization JSONB,
        status TEXT NOT NULL,
        canonical_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by TEXT NOT NULL
      );
    `);
  }

  public async intake(data: CreateWishbookItemDTO, userId: string): Promise<WishbookItem> {
    // 1. Validate
    const validation = CreateWishbookItemSchema.safeParse(data);
    if (!validation.success) {
      throw new AppError(
        `Validation failed: ${validation.error.issues.map((i) => i.message).join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }
    const validatedData = validation.data;

    // 2. Identify Platform Prereqs (Simple Keyword Scan)
    const platformKeywords = ['auth', 'entitlement', 'eventing', 'data model', 'platform', 'infrastructure'];
    const textToScan = `${validatedData.title} ${validatedData.problem} ${validatedData.dependencies || ''}`.toLowerCase();
    const hasPlatformPrereqs = platformKeywords.some((kw) => textToScan.includes(kw));

    if (hasPlatformPrereqs && (!validatedData.tags?.dependencyClass || validatedData.tags.dependencyClass === DependencyClass.NONE)) {
      if (!validatedData.tags) validatedData.tags = {};
      validatedData.tags.dependencyClass = DependencyClass.PLATFORM;
    }

    // 3. Create Object
    const newItem: WishbookItem = {
      ...validatedData,
      id: randomUUID(),
      status: WishbookStatus.SUBMITTED,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      tags: validatedData.tags,
      prioritization: validatedData.prioritization,
    };

    // 4. Persist
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO wishbook_items
       (id, title, problem, "user", impact, evidence, dependencies, cost, tags, prioritization, status, created_at, updated_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        newItem.id,
        newItem.title,
        newItem.problem,
        newItem.user,
        newItem.impact,
        newItem.evidence,
        newItem.dependencies,
        newItem.cost,
        newItem.tags,
        newItem.prioritization,
        newItem.status,
        newItem.createdAt,
        newItem.updatedAt,
        newItem.createdBy,
      ]
    );

    // 5. De-dupe Check
    await this.checkForDuplicates(newItem);

    return newItem;
  }

  public async list(filters?: { status?: WishbookStatus; createdBy?: string }): Promise<WishbookItem[]> {
    const pool = getPostgresPool();
    let query = 'SELECT * FROM wishbook_items WHERE 1=1';
    const params: any[] = [];
    let paramIdx = 1;

    if (filters?.status) {
      query += ` AND status = $${paramIdx++}`;
      params.push(filters.status);
    }
    if (filters?.createdBy) {
      query += ` AND created_by = $${paramIdx++}`;
      params.push(filters.createdBy);
    }

    const res = await pool.query(query, params);
    return res.rows.map(this.mapRowToItem);
  }

  public async get(id: string): Promise<WishbookItem | undefined> {
    const pool = getPostgresPool();
    const res = await pool.query('SELECT * FROM wishbook_items WHERE id = $1', [id]);
    if (res.rows.length === 0) return undefined;
    return this.mapRowToItem(res.rows[0]);
  }

  public async canonicalize(itemId: string): Promise<WishbookItem> {
    const pool = getPostgresPool();
    const item = await this.get(itemId);
    if (!item) throw new AppError('Item not found', 404);

    if (item.status === WishbookStatus.SUBMITTED) {
      const newStatus = WishbookStatus.TRIAGED;
      const now = new Date();
      await pool.query(
        'UPDATE wishbook_items SET status = $1, updated_at = $2 WHERE id = $3',
        [newStatus, now, itemId]
      );
      item.status = newStatus;
      item.updatedAt = now;
    }
    return item;
  }

  public async updateTags(id: string, tags: WishbookTags): Promise<WishbookItem> {
    const pool = getPostgresPool();
    const item = await this.get(id);
    if (!item) throw new AppError('Item not found', 404);

    const newTags = { ...item.tags, ...tags };
    const now = new Date();

    await pool.query(
      'UPDATE wishbook_items SET tags = $1, updated_at = $2 WHERE id = $3',
      [newTags, now, id]
    );

    item.tags = newTags;
    item.updatedAt = now;
    return item;
  }

  private async checkForDuplicates(newItem: WishbookItem): Promise<void> {
    const pool = getPostgresPool();
    // Improved De-dupe: Check for similar titles OR problems using ILIKE
    // In production, use pg_trgm or Vector search
    const res = await pool.query(
      `SELECT id, title FROM wishbook_items
       WHERE id != $1
       AND (title ILIKE $2 OR problem ILIKE $2)`,
      [newItem.id, `%${newItem.title}%`] // Simplified fuzzy match
    );

    if (res.rows.length > 0) {
      console.warn(`Potential duplicates found for ${newItem.id}:`, res.rows.map((r: any) => r.id));
    }
  }

  private mapRowToItem(row: any): WishbookItem {
    return {
      id: row.id,
      title: row.title,
      problem: row.problem,
      user: row.user,
      impact: row.impact,
      evidence: row.evidence,
      dependencies: row.dependencies,
      cost: row.cost,
      tags: row.tags,
      prioritization: row.prioritization,
      status: row.status as WishbookStatus,
      canonicalId: row.canonical_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
    };
  }
}
