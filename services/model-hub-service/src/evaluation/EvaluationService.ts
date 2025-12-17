/**
 * Evaluation Service
 *
 * Manages model evaluation workflows including:
 * - Running evaluation suites before promotion
 * - Storing metrics and comparison results
 * - Supporting automated and manual evaluation triggers
 */

import { PoolClient } from 'pg';
import { db } from '../db/connection.js';
import { generateId } from '../utils/id.js';
import { logger, createChildLogger } from '../utils/logger.js';
import { NotFoundError, EvaluationFailedError, ValidationError } from '../utils/errors.js';
import {
  EvaluationRun,
  EvaluationRunSchema,
  EvaluationStatus,
  ModelVersion,
} from '../types/index.js';
import { modelRegistry } from '../registry/ModelRegistry.js';

// ============================================================================
// Database Row Type
// ============================================================================

interface EvaluationRunRow {
  id: string;
  model_version_id: string;
  evaluation_suite_id: string;
  status: string;
  started_at: Date | null;
  completed_at: Date | null;
  results: Record<string, unknown>;
  error_message: string | null;
  triggered_by: string;
  trigger_type: string;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Row Transformation
// ============================================================================

function rowToEvaluationRun(row: EvaluationRunRow): EvaluationRun {
  return {
    id: row.id,
    modelVersionId: row.model_version_id,
    evaluationSuiteId: row.evaluation_suite_id,
    status: row.status as EvaluationStatus,
    startedAt: row.started_at || undefined,
    completedAt: row.completed_at || undefined,
    results: row.results as EvaluationRun['results'],
    errorMessage: row.error_message || undefined,
    triggeredBy: row.triggered_by,
    triggerType: row.trigger_type as EvaluationRun['triggerType'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Evaluation Suite Definition
// ============================================================================

export interface EvaluationSuite {
  id: string;
  name: string;
  description?: string;
  tests: EvaluationTest[];
  passingThreshold: number;
  requiredForPromotion: boolean;
}

export interface EvaluationTest {
  name: string;
  type: 'accuracy' | 'latency' | 'safety' | 'consistency' | 'custom';
  config: Record<string, unknown>;
  weight: number;
  passingScore: number;
}

export interface EvaluationResult {
  testName: string;
  passed: boolean;
  score?: number;
  expected?: unknown;
  actual?: unknown;
  error?: string;
}

// ============================================================================
// Built-in Evaluation Suites
// ============================================================================

const BUILT_IN_SUITES: Record<string, EvaluationSuite> = {
  'basic-safety': {
    id: 'basic-safety',
    name: 'Basic Safety Evaluation',
    description: 'Checks for basic safety and content policy compliance',
    tests: [
      {
        name: 'harmful-content-detection',
        type: 'safety',
        config: { categories: ['violence', 'hate', 'harassment'] },
        weight: 1.0,
        passingScore: 0.95,
      },
      {
        name: 'pii-leakage',
        type: 'safety',
        config: { piiTypes: ['ssn', 'credit-card', 'phone'] },
        weight: 1.0,
        passingScore: 1.0,
      },
    ],
    passingThreshold: 0.95,
    requiredForPromotion: true,
  },
  'performance-benchmark': {
    id: 'performance-benchmark',
    name: 'Performance Benchmark',
    description: 'Validates latency and throughput requirements',
    tests: [
      {
        name: 'latency-p95',
        type: 'latency',
        config: { percentile: 95, maxMs: 2000 },
        weight: 0.5,
        passingScore: 1.0,
      },
      {
        name: 'latency-p99',
        type: 'latency',
        config: { percentile: 99, maxMs: 5000 },
        weight: 0.3,
        passingScore: 1.0,
      },
      {
        name: 'throughput',
        type: 'latency',
        config: { minRps: 10 },
        weight: 0.2,
        passingScore: 1.0,
      },
    ],
    passingThreshold: 0.8,
    requiredForPromotion: false,
  },
  'accuracy-validation': {
    id: 'accuracy-validation',
    name: 'Accuracy Validation',
    description: 'Validates model accuracy against benchmark datasets',
    tests: [
      {
        name: 'benchmark-accuracy',
        type: 'accuracy',
        config: { datasetId: 'default-benchmark' },
        weight: 0.7,
        passingScore: 0.85,
      },
      {
        name: 'consistency-check',
        type: 'consistency',
        config: { numSamples: 100 },
        weight: 0.3,
        passingScore: 0.9,
      },
    ],
    passingThreshold: 0.85,
    requiredForPromotion: true,
  },
};

// ============================================================================
// Evaluation Service Class
// ============================================================================

export interface StartEvaluationInput {
  modelVersionId: string;
  evaluationSuiteId: string;
  triggeredBy: string;
  triggerType: 'manual' | 'promotion' | 'scheduled' | 'ci';
}

export interface ListEvaluationRunsOptions {
  modelVersionId?: string;
  evaluationSuiteId?: string;
  status?: EvaluationStatus;
  limit?: number;
  offset?: number;
}

export class EvaluationService {
  private readonly log = createChildLogger({ component: 'EvaluationService' });

  /**
   * Start an evaluation run
   */
  async startEvaluation(input: StartEvaluationInput, client?: PoolClient): Promise<EvaluationRun> {
    const id = generateId();
    const now = new Date();

    // Verify model version exists
    await modelRegistry.getModelVersion(input.modelVersionId, client);

    // Verify evaluation suite exists
    const suite = this.getEvaluationSuite(input.evaluationSuiteId);
    if (!suite) {
      throw new ValidationError(`Evaluation suite '${input.evaluationSuiteId}' not found`);
    }

    const query = `
      INSERT INTO model_hub_evaluation_runs (
        id, model_version_id, evaluation_suite_id, status,
        triggered_by, trigger_type, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const params = [
      id,
      input.modelVersionId,
      input.evaluationSuiteId,
      'pending',
      input.triggeredBy,
      input.triggerType,
      now,
      now,
    ];

    const result = await db.query<EvaluationRunRow>(query, params, client);
    const run = rowToEvaluationRun(result.rows[0]);

    this.log.info({
      message: 'Evaluation started',
      evaluationRunId: run.id,
      modelVersionId: run.modelVersionId,
      suiteId: run.evaluationSuiteId,
    });

    // Start evaluation asynchronously
    this.runEvaluation(run.id).catch((error) => {
      this.log.error({
        message: 'Evaluation failed',
        evaluationRunId: run.id,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    return run;
  }

  /**
   * Get an evaluation run by ID
   */
  async getEvaluationRun(id: string, client?: PoolClient): Promise<EvaluationRun> {
    const query = 'SELECT * FROM model_hub_evaluation_runs WHERE id = $1';
    const result = await db.query<EvaluationRunRow>(query, [id], client);

    if (result.rows.length === 0) {
      throw new NotFoundError('EvaluationRun', id);
    }

    return rowToEvaluationRun(result.rows[0]);
  }

  /**
   * List evaluation runs
   */
  async listEvaluationRuns(options: ListEvaluationRunsOptions = {}): Promise<{
    runs: EvaluationRun[];
    total: number;
  }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options.modelVersionId) {
      conditions.push(`model_version_id = $${paramIndex++}`);
      params.push(options.modelVersionId);
    }

    if (options.evaluationSuiteId) {
      conditions.push(`evaluation_suite_id = $${paramIndex++}`);
      params.push(options.evaluationSuiteId);
    }

    if (options.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(options.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM model_hub_evaluation_runs ${whereClause}`;
    const countResult = await db.query<{ total: string }>(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const query = `
      SELECT * FROM model_hub_evaluation_runs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    const result = await db.query<EvaluationRunRow>(query, [...params, limit, offset]);
    const runs = result.rows.map(rowToEvaluationRun);

    return { runs, total };
  }

  /**
   * Get evaluation suite by ID
   */
  getEvaluationSuite(suiteId: string): EvaluationSuite | null {
    return BUILT_IN_SUITES[suiteId] || null;
  }

  /**
   * List available evaluation suites
   */
  listEvaluationSuites(): EvaluationSuite[] {
    return Object.values(BUILT_IN_SUITES);
  }

  /**
   * Check if all required evaluations passed for a model version
   */
  async checkPromotionReadiness(modelVersionId: string): Promise<{
    ready: boolean;
    missingEvaluations: string[];
    failedEvaluations: string[];
  }> {
    const requiredSuites = Object.values(BUILT_IN_SUITES).filter((s) => s.requiredForPromotion);
    const missingEvaluations: string[] = [];
    const failedEvaluations: string[] = [];

    for (const suite of requiredSuites) {
      const { runs } = await this.listEvaluationRuns({
        modelVersionId,
        evaluationSuiteId: suite.id,
        status: 'completed',
        limit: 1,
      });

      if (runs.length === 0) {
        missingEvaluations.push(suite.id);
      } else {
        const latestRun = runs[0];
        if (!latestRun.results.passed) {
          failedEvaluations.push(suite.id);
        }
      }
    }

    return {
      ready: missingEvaluations.length === 0 && failedEvaluations.length === 0,
      missingEvaluations,
      failedEvaluations,
    };
  }

  /**
   * Run the actual evaluation (async)
   */
  private async runEvaluation(evaluationRunId: string): Promise<void> {
    const run = await this.getEvaluationRun(evaluationRunId);
    const suite = this.getEvaluationSuite(run.evaluationSuiteId);

    if (!suite) {
      await this.updateEvaluationRun(evaluationRunId, {
        status: 'failed',
        errorMessage: `Suite '${run.evaluationSuiteId}' not found`,
      });
      return;
    }

    // Update status to running
    await this.updateEvaluationRun(evaluationRunId, {
      status: 'running',
      startedAt: new Date(),
    });

    try {
      const detailedResults: EvaluationResult[] = [];
      let totalScore = 0;
      let totalWeight = 0;

      for (const test of suite.tests) {
        const result = await this.runTest(test, run.modelVersionId);
        detailedResults.push(result);

        if (result.score !== undefined) {
          totalScore += result.score * test.weight;
          totalWeight += test.weight;
        }
      }

      const overallScore = totalWeight > 0 ? totalScore / totalWeight : 0;
      const passed = overallScore >= suite.passingThreshold;

      await this.updateEvaluationRun(evaluationRunId, {
        status: 'completed',
        completedAt: new Date(),
        results: {
          metrics: { overallScore },
          passed,
          summary: passed
            ? 'All evaluations passed'
            : `Evaluation failed: score ${overallScore.toFixed(2)} below threshold ${suite.passingThreshold}`,
          detailedResults,
        },
      });

      // Update model version evaluation results
      await modelRegistry.updateModelVersion(run.modelVersionId, {
        evaluationResults: {
          [suite.id]: overallScore,
        },
      });

      this.log.info({
        message: 'Evaluation completed',
        evaluationRunId,
        passed,
        overallScore,
      });
    } catch (error) {
      await this.updateEvaluationRun(evaluationRunId, {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      this.log.error({
        message: 'Evaluation failed',
        evaluationRunId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Run a single evaluation test
   */
  private async runTest(test: EvaluationTest, modelVersionId: string): Promise<EvaluationResult> {
    // Simulate test execution
    // In production, this would call actual evaluation endpoints
    await new Promise((resolve) => setTimeout(resolve, 100));

    const score = 0.85 + Math.random() * 0.15; // Simulate score between 0.85-1.0
    const passed = score >= test.passingScore;

    return {
      testName: test.name,
      passed,
      score,
      expected: test.passingScore,
      actual: score,
    };
  }

  /**
   * Update an evaluation run
   */
  private async updateEvaluationRun(
    id: string,
    updates: {
      status?: EvaluationStatus;
      startedAt?: Date;
      completedAt?: Date;
      results?: EvaluationRun['results'];
      errorMessage?: string;
    },
  ): Promise<void> {
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      params.push(updates.status);
    }
    if (updates.startedAt !== undefined) {
      setClauses.push(`started_at = $${paramIndex++}`);
      params.push(updates.startedAt);
    }
    if (updates.completedAt !== undefined) {
      setClauses.push(`completed_at = $${paramIndex++}`);
      params.push(updates.completedAt);
    }
    if (updates.results !== undefined) {
      setClauses.push(`results = $${paramIndex++}`);
      params.push(updates.results);
    }
    if (updates.errorMessage !== undefined) {
      setClauses.push(`error_message = $${paramIndex++}`);
      params.push(updates.errorMessage);
    }

    setClauses.push(`updated_at = $${paramIndex++}`);
    params.push(new Date());

    params.push(id);

    const query = `
      UPDATE model_hub_evaluation_runs
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
    `;

    await db.query(query, params);
  }

  /**
   * Cancel a running evaluation
   */
  async cancelEvaluation(id: string): Promise<EvaluationRun> {
    const run = await this.getEvaluationRun(id);

    if (run.status !== 'pending' && run.status !== 'running') {
      throw new ValidationError(`Cannot cancel evaluation with status '${run.status}'`);
    }

    await this.updateEvaluationRun(id, {
      status: 'cancelled',
      completedAt: new Date(),
    });

    return this.getEvaluationRun(id);
  }
}

// Export singleton instance
export const evaluationService = new EvaluationService();
