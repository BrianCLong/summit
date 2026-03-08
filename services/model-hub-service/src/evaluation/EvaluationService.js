"use strict";
/**
 * Evaluation Service
 *
 * Manages model evaluation workflows including:
 * - Running evaluation suites before promotion
 * - Storing metrics and comparison results
 * - Supporting automated and manual evaluation triggers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluationService = exports.EvaluationService = void 0;
const connection_js_1 = require("../db/connection.js");
const id_js_1 = require("../utils/id.js");
const logger_js_1 = require("../utils/logger.js");
const errors_js_1 = require("../utils/errors.js");
const ModelRegistry_js_1 = require("../registry/ModelRegistry.js");
// ============================================================================
// Row Transformation
// ============================================================================
function rowToEvaluationRun(row) {
    return {
        id: row.id,
        modelVersionId: row.model_version_id,
        evaluationSuiteId: row.evaluation_suite_id,
        status: row.status,
        startedAt: row.started_at || undefined,
        completedAt: row.completed_at || undefined,
        results: row.results,
        errorMessage: row.error_message || undefined,
        triggeredBy: row.triggered_by,
        triggerType: row.trigger_type,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
// ============================================================================
// Built-in Evaluation Suites
// ============================================================================
const BUILT_IN_SUITES = {
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
class EvaluationService {
    log = (0, logger_js_1.createChildLogger)({ component: 'EvaluationService' });
    /**
     * Start an evaluation run
     */
    async startEvaluation(input, client) {
        const id = (0, id_js_1.generateId)();
        const now = new Date();
        // Verify model version exists
        await ModelRegistry_js_1.modelRegistry.getModelVersion(input.modelVersionId, client);
        // Verify evaluation suite exists
        const suite = this.getEvaluationSuite(input.evaluationSuiteId);
        if (!suite) {
            throw new errors_js_1.ValidationError(`Evaluation suite '${input.evaluationSuiteId}' not found`);
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
        const result = await connection_js_1.db.query(query, params, client);
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
    async getEvaluationRun(id, client) {
        const query = 'SELECT * FROM model_hub_evaluation_runs WHERE id = $1';
        const result = await connection_js_1.db.query(query, [id], client);
        if (result.rows.length === 0) {
            throw new errors_js_1.NotFoundError('EvaluationRun', id);
        }
        return rowToEvaluationRun(result.rows[0]);
    }
    /**
     * List evaluation runs
     */
    async listEvaluationRuns(options = {}) {
        const conditions = [];
        const params = [];
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
        const countResult = await connection_js_1.db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].total);
        // Get paginated results
        const query = `
      SELECT * FROM model_hub_evaluation_runs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
        const result = await connection_js_1.db.query(query, [...params, limit, offset]);
        const runs = result.rows.map(rowToEvaluationRun);
        return { runs, total };
    }
    /**
     * Get evaluation suite by ID
     */
    getEvaluationSuite(suiteId) {
        return BUILT_IN_SUITES[suiteId] || null;
    }
    /**
     * List available evaluation suites
     */
    listEvaluationSuites() {
        return Object.values(BUILT_IN_SUITES);
    }
    /**
     * Check if all required evaluations passed for a model version
     */
    async checkPromotionReadiness(modelVersionId) {
        const requiredSuites = Object.values(BUILT_IN_SUITES).filter((s) => s.requiredForPromotion);
        const missingEvaluations = [];
        const failedEvaluations = [];
        for (const suite of requiredSuites) {
            const { runs } = await this.listEvaluationRuns({
                modelVersionId,
                evaluationSuiteId: suite.id,
                status: 'completed',
                limit: 1,
            });
            if (runs.length === 0) {
                missingEvaluations.push(suite.id);
            }
            else {
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
    async runEvaluation(evaluationRunId) {
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
            const detailedResults = [];
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
            await ModelRegistry_js_1.modelRegistry.updateModelVersion(run.modelVersionId, {
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
        }
        catch (error) {
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
    async runTest(test, modelVersionId) {
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
    async updateEvaluationRun(id, updates) {
        const setClauses = [];
        const params = [];
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
        await connection_js_1.db.query(query, params);
    }
    /**
     * Cancel a running evaluation
     */
    async cancelEvaluation(id) {
        const run = await this.getEvaluationRun(id);
        if (run.status !== 'pending' && run.status !== 'running') {
            throw new errors_js_1.ValidationError(`Cannot cancel evaluation with status '${run.status}'`);
        }
        await this.updateEvaluationRun(id, {
            status: 'cancelled',
            completedAt: new Date(),
        });
        return this.getEvaluationRun(id);
    }
}
exports.EvaluationService = EvaluationService;
// Export singleton instance
exports.evaluationService = new EvaluationService();
