/**
 * Repository for scenario CRUD operations
 */

import type { EvalScenario } from '@intelgraph/mesh-eval-sdk';
import type { DbClient } from './db/client.js';
import { pino } from 'pino';

const logger = pino({ name: 'scenario-registry:repository' });

/**
 * Query options for listing scenarios
 */
export interface ListScenariosOptions {
  type?: string;
  tags?: string[];
  difficulty?: string;
  createdBy?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'updated_at' | 'name';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Scenario repository
 */
export class ScenarioRepository {
  constructor(private db: DbClient) {}

  /**
   * Create a new scenario
   */
  async create(scenario: EvalScenario): Promise<EvalScenario> {
    const query = `
      INSERT INTO eval_scenarios (
        id, version, type, name, description, tags,
        inputs, constraints, expected_outputs, scoring_strategy,
        rubric, difficulty, estimated_cost, estimated_duration,
        created_by, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      scenario.id,
      scenario.version,
      scenario.type,
      scenario.name,
      scenario.description,
      scenario.tags,
      JSON.stringify(scenario.inputs),
      JSON.stringify(scenario.constraints),
      scenario.expectedOutputs ? JSON.stringify(scenario.expectedOutputs) : null,
      JSON.stringify(scenario.scoringStrategy),
      scenario.rubric ? JSON.stringify(scenario.rubric) : null,
      scenario.difficulty,
      scenario.estimatedCost,
      scenario.estimatedDuration,
      scenario.createdBy,
      scenario.metadata ? JSON.stringify(scenario.metadata) : null,
    ];

    try {
      const result = await this.db.query(query, values);
      return this.mapRow(result.rows[0]);
    } catch (err) {
      logger.error({ err, scenarioId: scenario.id }, 'Failed to create scenario');
      throw new Error(`Failed to create scenario: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a scenario by ID
   */
  async findById(id: string): Promise<EvalScenario | null> {
    const query = 'SELECT * FROM eval_scenarios WHERE id = $1';

    try {
      const result = await this.db.query(query, [id]);
      return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    } catch (err) {
      logger.error({ err, scenarioId: id }, 'Failed to find scenario');
      throw new Error(`Failed to find scenario: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * List scenarios with optional filtering
   */
  async list(options: ListScenariosOptions = {}): Promise<{ scenarios: EvalScenario[]; total: number }> {
    const {
      type,
      tags,
      difficulty,
      createdBy,
      limit = 50,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = options;

    // Build WHERE clause
    const whereClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (type) {
      whereClauses.push(`type = $${paramIndex++}`);
      params.push(type);
    }

    if (tags && tags.length > 0) {
      whereClauses.push(`tags && $${paramIndex++}`);
      params.push(tags);
    }

    if (difficulty) {
      whereClauses.push(`difficulty = $${paramIndex++}`);
      params.push(difficulty);
    }

    if (createdBy) {
      whereClauses.push(`created_by = $${paramIndex++}`);
      params.push(createdBy);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count total
    const countQuery = `SELECT COUNT(*) FROM eval_scenarios ${whereClause}`;
    const countResult = await this.db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get scenarios
    const query = `
      SELECT * FROM eval_scenarios
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(limit, offset);

    try {
      const result = await this.db.query(query, params);
      const scenarios = result.rows.map((row) => this.mapRow(row));
      return { scenarios, total };
    } catch (err) {
      logger.error({ err, options }, 'Failed to list scenarios');
      throw new Error(`Failed to list scenarios: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a scenario
   */
  async update(id: string, updates: Partial<EvalScenario>): Promise<EvalScenario | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Build SET clauses for provided fields
    if (updates.version !== undefined) {
      setClauses.push(`version = $${paramIndex++}`);
      params.push(updates.version);
    }

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      params.push(updates.name);
    }

    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      params.push(updates.description);
    }

    if (updates.tags !== undefined) {
      setClauses.push(`tags = $${paramIndex++}`);
      params.push(updates.tags);
    }

    if (updates.inputs !== undefined) {
      setClauses.push(`inputs = $${paramIndex++}`);
      params.push(JSON.stringify(updates.inputs));
    }

    if (updates.constraints !== undefined) {
      setClauses.push(`constraints = $${paramIndex++}`);
      params.push(JSON.stringify(updates.constraints));
    }

    if (updates.expectedOutputs !== undefined) {
      setClauses.push(`expected_outputs = $${paramIndex++}`);
      params.push(JSON.stringify(updates.expectedOutputs));
    }

    if (updates.scoringStrategy !== undefined) {
      setClauses.push(`scoring_strategy = $${paramIndex++}`);
      params.push(JSON.stringify(updates.scoringStrategy));
    }

    if (updates.rubric !== undefined) {
      setClauses.push(`rubric = $${paramIndex++}`);
      params.push(updates.rubric ? JSON.stringify(updates.rubric) : null);
    }

    if (updates.difficulty !== undefined) {
      setClauses.push(`difficulty = $${paramIndex++}`);
      params.push(updates.difficulty);
    }

    if (updates.estimatedCost !== undefined) {
      setClauses.push(`estimated_cost = $${paramIndex++}`);
      params.push(updates.estimatedCost);
    }

    if (updates.estimatedDuration !== undefined) {
      setClauses.push(`estimated_duration = $${paramIndex++}`);
      params.push(updates.estimatedDuration);
    }

    if (updates.metadata !== undefined) {
      setClauses.push(`metadata = $${paramIndex++}`);
      params.push(updates.metadata ? JSON.stringify(updates.metadata) : null);
    }

    if (setClauses.length === 0) {
      return existing; // No updates
    }

    // Add ID parameter
    params.push(id);

    const query = `
      UPDATE eval_scenarios
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, params);
      return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    } catch (err) {
      logger.error({ err, scenarioId: id }, 'Failed to update scenario');
      throw new Error(`Failed to update scenario: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a scenario
   */
  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM eval_scenarios WHERE id = $1';

    try {
      const result = await this.db.query(query, [id]);
      return (result.rowCount ?? 0) > 0;
    } catch (err) {
      logger.error({ err, scenarioId: id }, 'Failed to delete scenario');
      throw new Error(`Failed to delete scenario: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all unique tags
   */
  async getTags(): Promise<string[]> {
    const query = 'SELECT DISTINCT unnest(tags) as tag FROM eval_scenarios ORDER BY tag';

    try {
      const result = await this.db.query(query);
      return result.rows.map((row) => row.tag);
    } catch (err) {
      logger.error({ err }, 'Failed to get tags');
      throw new Error(`Failed to get tags: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all unique types
   */
  async getTypes(): Promise<string[]> {
    const query = 'SELECT DISTINCT type FROM eval_scenarios ORDER BY type';

    try {
      const result = await this.db.query(query);
      return result.rows.map((row) => row.type);
    } catch (err) {
      logger.error({ err }, 'Failed to get types');
      throw new Error(`Failed to get types: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Map database row to EvalScenario
   */
  private mapRow(row: any): EvalScenario {
    return {
      id: row.id,
      version: row.version,
      type: row.type,
      name: row.name,
      description: row.description,
      tags: row.tags || [],
      inputs: row.inputs,
      constraints: row.constraints || [],
      expectedOutputs: row.expected_outputs,
      scoringStrategy: row.scoring_strategy,
      rubric: row.rubric,
      difficulty: row.difficulty,
      estimatedCost: parseFloat(row.estimated_cost),
      estimatedDuration: row.estimated_duration,
      createdAt: new Date(row.created_at),
      createdBy: row.created_by,
      updatedAt: new Date(row.updated_at),
      metadata: row.metadata,
    };
  }
}
