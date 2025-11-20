/**
 * ModelComparator - Compare models and manage A/B tests
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import { ModelComparison, ModelComparisonSchema, ABTest, ABTestSchema } from '../types.js';

export class ModelComparator {
  private pool: Pool;
  private logger: pino.Logger;

  constructor(pool: Pool) {
    this.pool = pool;
    this.logger = pino({ name: 'model-comparator' });
  }

  /**
   * Initialize comparison tables
   */
  async initialize(): Promise<void> {
    const createComparisonTable = `
      CREATE TABLE IF NOT EXISTS ml_model_comparisons (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        models JSONB NOT NULL,
        metrics TEXT[] NOT NULL,
        results JSONB NOT NULL,
        winner VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by VARCHAR(255) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ml_ab_tests (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        control_model JSONB NOT NULL,
        treatment_model JSONB NOT NULL,
        traffic_split JSONB NOT NULL,
        start_date TIMESTAMPTZ NOT NULL,
        end_date TIMESTAMPTZ,
        status VARCHAR(50) NOT NULL,
        success_metrics TEXT[] NOT NULL,
        results JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by VARCHAR(255) NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_comparisons_created_at ON ml_model_comparisons(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ml_ab_tests(status);
      CREATE INDEX IF NOT EXISTS idx_ab_tests_dates ON ml_ab_tests(start_date, end_date);
    `;

    await this.pool.query(createComparisonTable);
    this.logger.info('Model comparator initialized');
  }

  /**
   * Create a model comparison
   */
  async compareModels(
    name: string,
    models: Array<{ model_id: string; version: string; alias?: string }>,
    metrics: string[],
    createdBy: string
  ): Promise<ModelComparison> {
    const id = uuidv4();
    const now = new Date().toISOString();

    // Fetch actual metric values for each model
    const results: Record<string, Record<string, number>> = {};

    for (const model of models) {
      const modelKey = `${model.model_id}:${model.version}`;
      const query = 'SELECT metrics FROM ml_models WHERE id = $1 AND version = $2';
      const result = await this.pool.query(query, [model.model_id, model.version]);

      if (result.rows.length > 0) {
        const modelMetrics = result.rows[0].metrics || {};
        results[modelKey] = {};

        for (const metric of metrics) {
          results[modelKey][metric] = modelMetrics[metric] || 0;
        }
      }
    }

    // Determine winner (highest average of all metrics)
    let winner: string | undefined;
    let bestScore = -Infinity;

    for (const [modelKey, metricValues] of Object.entries(results)) {
      const avgScore = Object.values(metricValues).reduce((a, b) => a + b, 0) / metrics.length;
      if (avgScore > bestScore) {
        bestScore = avgScore;
        winner = modelKey;
      }
    }

    const comparison: ModelComparison = {
      id,
      name,
      models,
      metrics,
      results,
      winner,
      created_at: now,
      created_by: createdBy,
    };

    const validated = ModelComparisonSchema.parse(comparison);

    const query = `
      INSERT INTO ml_model_comparisons (
        id, name, models, metrics, results, winner, created_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const values = [
      validated.id,
      validated.name,
      JSON.stringify(validated.models),
      validated.metrics,
      JSON.stringify(validated.results),
      validated.winner,
      validated.created_at,
      validated.created_by,
    ];

    const result = await this.pool.query(query, values);

    this.logger.info({ comparisonId: id, winner }, 'Model comparison created');

    return this.parseComparisonRow(result.rows[0]);
  }

  /**
   * Get comparison by ID
   */
  async getComparison(comparisonId: string): Promise<ModelComparison | null> {
    const query = 'SELECT * FROM ml_model_comparisons WHERE id = $1';
    const result = await this.pool.query(query, [comparisonId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.parseComparisonRow(result.rows[0]);
  }

  /**
   * List all comparisons
   */
  async listComparisons(limit = 50, offset = 0): Promise<ModelComparison[]> {
    const query = `
      SELECT * FROM ml_model_comparisons
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await this.pool.query(query, [limit, offset]);

    return result.rows.map(row => this.parseComparisonRow(row));
  }

  /**
   * Create an A/B test
   */
  async createABTest(test: Omit<ABTest, 'id' | 'created_at'>): Promise<ABTest> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const fullTest: ABTest = {
      id,
      created_at: now,
      ...test,
    };

    const validated = ABTestSchema.parse(fullTest);

    const query = `
      INSERT INTO ml_ab_tests (
        id, name, description, control_model, treatment_model, traffic_split,
        start_date, end_date, status, success_metrics, results, created_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;

    const values = [
      validated.id,
      validated.name,
      validated.description,
      JSON.stringify(validated.control_model),
      JSON.stringify(validated.treatment_model),
      JSON.stringify(validated.traffic_split),
      validated.start_date,
      validated.end_date,
      validated.status,
      validated.success_metrics,
      validated.results ? JSON.stringify(validated.results) : null,
      validated.created_at,
      validated.created_by,
    ];

    const result = await this.pool.query(query, values);

    this.logger.info({ testId: id, name: validated.name }, 'A/B test created');

    return this.parseABTestRow(result.rows[0]);
  }

  /**
   * Get A/B test by ID
   */
  async getABTest(testId: string): Promise<ABTest | null> {
    const query = 'SELECT * FROM ml_ab_tests WHERE id = $1';
    const result = await this.pool.query(query, [testId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.parseABTestRow(result.rows[0]);
  }

  /**
   * Update A/B test status
   */
  async updateABTestStatus(
    testId: string,
    status: ABTest['status'],
    results?: ABTest['results']
  ): Promise<void> {
    const updates: string[] = ['status = $2'];
    const params: any[] = [testId, status];
    let paramIndex = 3;

    if (results) {
      updates.push(`results = $${paramIndex}`);
      params.push(JSON.stringify(results));
      paramIndex++;
    }

    if (status === 'completed') {
      updates.push(`end_date = $${paramIndex}`);
      params.push(new Date().toISOString());
    }

    const query = `
      UPDATE ml_ab_tests
      SET ${updates.join(', ')}
      WHERE id = $1
    `;

    await this.pool.query(query, params);

    this.logger.info({ testId, status }, 'A/B test status updated');
  }

  /**
   * List A/B tests
   */
  async listABTests(status?: ABTest['status'], limit = 50, offset = 0): Promise<ABTest[]> {
    let query = 'SELECT * FROM ml_ab_tests';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await this.pool.query(query, params);

    return result.rows.map(row => this.parseABTestRow(row));
  }

  /**
   * Get active A/B tests
   */
  async getActiveABTests(): Promise<ABTest[]> {
    const query = `
      SELECT * FROM ml_ab_tests
      WHERE status = 'running'
      AND start_date <= NOW()
      AND (end_date IS NULL OR end_date >= NOW())
      ORDER BY start_date DESC
    `;

    const result = await this.pool.query(query);

    return result.rows.map(row => this.parseABTestRow(row));
  }

  /**
   * Record A/B test metric
   */
  async recordABTestMetric(
    testId: string,
    variant: 'control' | 'treatment',
    metric: string,
    value: number
  ): Promise<void> {
    const test = await this.getABTest(testId);
    if (!test) {
      throw new Error(`A/B test ${testId} not found`);
    }

    const results = test.results || { control: {}, treatment: {} };

    if (!results.control) results.control = {};
    if (!results.treatment) results.treatment = {};

    results[variant][metric] = value;

    // Calculate statistical significance if both variants have data
    if (Object.keys(results.control).length > 0 && Object.keys(results.treatment).length > 0) {
      results.statistical_significance = this.calculateStatisticalSignificance(results);
    }

    await this.updateABTestStatus(testId, test.status, results);
  }

  /**
   * Calculate statistical significance (simplified)
   */
  private calculateStatisticalSignificance(results: ABTest['results']): number {
    if (!results || !results.control || !results.treatment) return 0;

    // This is a simplified calculation
    // In production, use proper statistical tests (t-test, chi-square, etc.)
    const controlValues = Object.values(results.control);
    const treatmentValues = Object.values(results.treatment);

    const controlAvg = controlValues.reduce((a, b) => a + b, 0) / controlValues.length;
    const treatmentAvg = treatmentValues.reduce((a, b) => a + b, 0) / treatmentValues.length;

    const difference = Math.abs(treatmentAvg - controlAvg);
    const baseline = Math.max(controlAvg, treatmentAvg);

    return baseline > 0 ? (difference / baseline) * 100 : 0;
  }

  /**
   * Parse comparison row
   */
  private parseComparisonRow(row: any): ModelComparison {
    return ModelComparisonSchema.parse({
      ...row,
      models: row.models || [],
      results: row.results || {},
    });
  }

  /**
   * Parse A/B test row
   */
  private parseABTestRow(row: any): ABTest {
    return ABTestSchema.parse({
      ...row,
      results: row.results || undefined,
    });
  }
}
