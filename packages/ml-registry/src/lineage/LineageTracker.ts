/**
 * LineageTracker - Track model lineage and relationships
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import { ModelLineage, ModelLineageSchema } from '../types.js';

export class LineageTracker {
  private pool: Pool;
  private logger: pino.Logger;

  constructor(pool: Pool) {
    this.pool = pool;
    this.logger = pino({ name: 'lineage-tracker' });
  }

  /**
   * Initialize lineage tables
   */
  async initialize(): Promise<void> {
    const createLineageTable = `
      CREATE TABLE IF NOT EXISTS ml_model_lineage (
        id UUID PRIMARY KEY,
        model_id UUID NOT NULL,
        model_version VARCHAR(100) NOT NULL,
        parent_models JSONB DEFAULT '[]',
        datasets JSONB DEFAULT '[]',
        features JSONB DEFAULT '[]',
        experiment_id VARCHAR(255),
        run_id VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (model_id) REFERENCES ml_models(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_lineage_model_id ON ml_model_lineage(model_id);
      CREATE INDEX IF NOT EXISTS idx_lineage_experiment ON ml_model_lineage(experiment_id);
    `;

    await this.pool.query(createLineageTable);
    this.logger.info('Lineage tracker initialized');
  }

  /**
   * Record model lineage
   */
  async recordLineage(lineage: Omit<ModelLineage, 'id' | 'created_at'>): Promise<ModelLineage> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const fullLineage: ModelLineage = {
      id,
      created_at: now,
      ...lineage,
    };

    const validated = ModelLineageSchema.parse(fullLineage);

    const query = `
      INSERT INTO ml_model_lineage (
        id, model_id, model_version, parent_models, datasets, features,
        experiment_id, run_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    const values = [
      validated.id,
      validated.model_id,
      validated.model_version,
      JSON.stringify(validated.parent_models),
      JSON.stringify(validated.datasets),
      JSON.stringify(validated.features),
      validated.experiment_id,
      validated.run_id,
      validated.created_at,
    ];

    const result = await this.pool.query(query, values);

    this.logger.info({ lineageId: id, modelId: validated.model_id }, 'Lineage recorded');

    return this.parseLineageRow(result.rows[0]);
  }

  /**
   * Get lineage for a model
   */
  async getLineage(modelId: string, version?: string): Promise<ModelLineage | null> {
    let query = 'SELECT * FROM ml_model_lineage WHERE model_id = $1';
    const params: any[] = [modelId];

    if (version) {
      query += ' AND model_version = $2';
      params.push(version);
    }

    query += ' ORDER BY created_at DESC LIMIT 1';

    const result = await this.pool.query(query, params);

    if (result.rows.length === 0) {
      return null;
    }

    return this.parseLineageRow(result.rows[0]);
  }

  /**
   * Get lineage graph (ancestors and descendants)
   */
  async getLineageGraph(modelId: string): Promise<{
    ancestors: ModelLineage[];
    descendants: ModelLineage[];
  }> {
    const ancestors = await this.getAncestors(modelId);
    const descendants = await this.getDescendants(modelId);

    return { ancestors, descendants };
  }

  /**
   * Get all ancestor models (recursive)
   */
  private async getAncestors(modelId: string): Promise<ModelLineage[]> {
    const lineage = await this.getLineage(modelId);
    if (!lineage || lineage.parent_models.length === 0) {
      return [];
    }

    const ancestors: ModelLineage[] = [lineage];

    for (const parent of lineage.parent_models) {
      const parentAncestors = await this.getAncestors(parent.model_id);
      ancestors.push(...parentAncestors);
    }

    return ancestors;
  }

  /**
   * Get all descendant models
   */
  private async getDescendants(modelId: string): Promise<ModelLineage[]> {
    const query = `
      SELECT * FROM ml_model_lineage
      WHERE parent_models::jsonb @> $1::jsonb
    `;

    const result = await this.pool.query(query, [
      JSON.stringify([{ model_id: modelId }])
    ]);

    const descendants = result.rows.map(row => this.parseLineageRow(row));

    // Recursively get descendants of descendants
    for (const descendant of [...descendants]) {
      const childDescendants = await this.getDescendants(descendant.model_id);
      descendants.push(...childDescendants);
    }

    return descendants;
  }

  /**
   * Get models by experiment
   */
  async getModelsByExperiment(experimentId: string): Promise<ModelLineage[]> {
    const query = 'SELECT * FROM ml_model_lineage WHERE experiment_id = $1 ORDER BY created_at DESC';
    const result = await this.pool.query(query, [experimentId]);

    return result.rows.map(row => this.parseLineageRow(row));
  }

  /**
   * Get models by dataset
   */
  async getModelsByDataset(datasetId: string): Promise<ModelLineage[]> {
    const query = `
      SELECT * FROM ml_model_lineage
      WHERE datasets::jsonb @> $1::jsonb
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [
      JSON.stringify([{ dataset_id: datasetId }])
    ]);

    return result.rows.map(row => this.parseLineageRow(row));
  }

  /**
   * Parse database row into ModelLineage
   */
  private parseLineageRow(row: any): ModelLineage {
    return ModelLineageSchema.parse({
      ...row,
      parent_models: row.parent_models || [],
      datasets: row.datasets || [],
      features: row.features || [],
    });
  }
}
