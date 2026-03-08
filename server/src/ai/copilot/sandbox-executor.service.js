"use strict";
/**
 * Sandbox Query Executor Service
 *
 * Provides safe query execution with:
 * - Dry-run query planning to compute estimated cost/rows
 * - Budget enforcement with refinement suggestions
 * - Sandboxed execution environment
 * - Result limiting and timeout handling
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SandboxExecutorService = void 0;
exports.createSandboxExecutor = createSandboxExecutor;
const crypto_1 = require("crypto");
const pino_1 = __importDefault(require("pino"));
const validator_js_1 = require("../nl-graph-query/validator.js");
const logger = pino_1.default({ name: 'sandbox-executor' });
// Configuration
const DEFAULT_TIMEOUT_MS = parseInt(process.env.COPILOT_QUERY_TIMEOUT_MS || '30000', 10);
const MAX_RESULT_ROWS = parseInt(process.env.COPILOT_MAX_RESULT_ROWS || '1000', 10);
const BUDGET_ENFORCEMENT_ENABLED = process.env.COPILOT_BUDGET_ENFORCEMENT !== 'false';
/**
 * Default budget for sandboxed queries
 */
const DEFAULT_BUDGET = {
    maxNodesScanned: 50000,
    maxEdgesScanned: 25000,
    maxTimeMs: 10000,
    maxMemoryMb: 256,
    maxResultRows: MAX_RESULT_ROWS,
    allowedCostClasses: ['low', 'medium', 'high'],
};
/**
 * Sandbox Query Executor Service
 */
class SandboxExecutorService {
    neo4jDriver;
    budget;
    constructor(neo4jDriver, budget) {
        this.neo4jDriver = neo4jDriver;
        this.budget = { ...DEFAULT_BUDGET, ...budget };
    }
    /**
     * Perform a dry-run query plan without execution
     */
    async dryRunPlan(preview, parameters) {
        const planId = (0, crypto_1.randomUUID)();
        const startTime = Date.now();
        logger.info({ planId, queryId: preview.queryId }, 'Starting dry-run query plan');
        // Validate query is read-only
        if (!(0, validator_js_1.isReadOnlyQuery)(preview.cypher)) {
            return {
                planId,
                cypher: preview.cypher,
                estimatedCost: preview.cost,
                withinBudget: false,
                budgetViolations: [
                    'Query contains mutation operations which are not allowed',
                ],
                refinements: [],
                recommendExecution: false,
                recommendationReason: 'Query contains write operations',
            };
        }
        // Get estimated cost (already computed in preview)
        const estimatedCost = preview.cost;
        // Check budget violations
        const violations = this.checkBudgetViolations(estimatedCost);
        // Try to get EXPLAIN plan from Neo4j
        let explainPlan;
        try {
            explainPlan = await this.getExplainPlan(preview.cypher, { ...preview.parameters, ...parameters });
        }
        catch (error) {
            logger.warn({ planId, error: error instanceof Error ? error.message : 'Unknown' }, 'Failed to get EXPLAIN plan');
        }
        // Generate refinements if over budget
        const refinements = violations.length > 0
            ? this.generateBudgetRefinements(preview.cypher, estimatedCost, violations)
            : [];
        const withinBudget = violations.length === 0;
        const recommendExecution = withinBudget && preview.isSafe && preview.allowed;
        const planTime = Date.now() - startTime;
        logger.info({ planId, planTimeMs: planTime, withinBudget, recommendExecution }, 'Dry-run plan completed');
        return {
            planId,
            cypher: preview.cypher,
            estimatedCost,
            withinBudget,
            budgetViolations: violations,
            explainPlan,
            refinements,
            recommendExecution,
            recommendationReason: recommendExecution
                ? 'Query is within budget and safety parameters'
                : violations.length > 0
                    ? `Budget violations: ${violations.join(', ')}`
                    : 'Query did not pass safety checks',
        };
    }
    /**
     * Execute a query in the sandbox environment
     */
    async execute(preview, parameters, options) {
        const executionId = (0, crypto_1.randomUUID)();
        const startTime = Date.now();
        logger.info({ executionId, queryId: preview.queryId }, 'Starting sandboxed query execution');
        // Validate query safety
        if (!preview.allowed) {
            return {
                executionId,
                cypher: preview.cypher,
                success: false,
                rows: [],
                rowCount: 0,
                truncated: false,
                executionTimeMs: 0,
                error: preview.blockReason || 'Query not allowed',
                warnings: [],
            };
        }
        // Check budget if enforcement is enabled
        if (BUDGET_ENFORCEMENT_ENABLED && !options?.skipBudgetCheck) {
            const violations = this.checkBudgetViolations(preview.cost);
            if (violations.length > 0) {
                return {
                    executionId,
                    cypher: preview.cypher,
                    success: false,
                    rows: [],
                    rowCount: 0,
                    truncated: false,
                    executionTimeMs: 0,
                    error: `Budget violations: ${violations.join(', ')}`,
                    warnings: violations,
                };
            }
        }
        // Execute with timeout
        const timeoutMs = options?.timeoutMs || DEFAULT_TIMEOUT_MS;
        const maxRows = options?.maxRows || this.budget.maxResultRows;
        let session = null;
        try {
            session = this.neo4jDriver.session({
                defaultAccessMode: 'READ',
            });
            // Add LIMIT if not present to prevent runaway queries
            let safeCypher = preview.cypher;
            if (!preview.cypher.toUpperCase().includes('LIMIT')) {
                safeCypher = `${preview.cypher} LIMIT ${maxRows}`;
            }
            // Execute with timeout
            const result = await this.executeWithTimeout(session, safeCypher, { ...preview.parameters, ...parameters }, timeoutMs);
            // Process results
            const rows = [];
            let truncated = false;
            for (const record of result.records) {
                if (rows.length >= maxRows) {
                    truncated = true;
                    break;
                }
                const row = {};
                for (const key of record.keys) {
                    row[key] = this.convertNeo4jValue(record.get(key));
                }
                rows.push(row);
            }
            const executionTimeMs = Date.now() - startTime;
            // Get query statistics
            const statistics = result.summary.counters
                ? {
                    nodesCreated: result.summary.counters.updates().nodesCreated,
                    nodesDeleted: result.summary.counters.updates().nodesDeleted,
                    relationshipsCreated: result.summary.counters.updates().relationshipsCreated,
                    relationshipsDeleted: result.summary.counters.updates().relationshipsDeleted,
                    propertiesSet: result.summary.counters.updates().propertiesSet,
                }
                : undefined;
            const warnings = [];
            if (truncated) {
                warnings.push(`Results truncated to ${maxRows} rows. Total rows may be higher.`);
            }
            logger.info({
                executionId,
                executionTimeMs,
                rowCount: rows.length,
                truncated,
            }, 'Query execution completed');
            return {
                executionId,
                cypher: safeCypher,
                success: true,
                rows,
                rowCount: rows.length,
                truncated,
                executionTimeMs,
                statistics,
                warnings,
            };
        }
        catch (error) {
            const executionTimeMs = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error({ executionId, executionTimeMs, error: errorMessage }, 'Query execution failed');
            return {
                executionId,
                cypher: preview.cypher,
                success: false,
                rows: [],
                rowCount: 0,
                truncated: false,
                executionTimeMs,
                error: this.sanitizeError(errorMessage),
                warnings: [],
            };
        }
        finally {
            if (session) {
                await session.close();
            }
        }
    }
    /**
     * Execute query with timeout
     */
    async executeWithTimeout(session, cypher, parameters, timeoutMs) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Query timeout after ${timeoutMs}ms`));
            }, timeoutMs);
            session
                .run(cypher, parameters)
                .then((result) => {
                clearTimeout(timeoutId);
                resolve(result);
            })
                .catch((error) => {
                clearTimeout(timeoutId);
                reject(error);
            });
        });
    }
    /**
     * Get EXPLAIN plan from Neo4j
     */
    async getExplainPlan(cypher, parameters) {
        let session = null;
        try {
            session = this.neo4jDriver.session({
                defaultAccessMode: 'READ',
            });
            const explainCypher = `EXPLAIN ${cypher}`;
            const result = await session.run(explainCypher, parameters);
            if (result.summary.plan) {
                return {
                    operatorType: result.summary.plan.operatorType,
                    arguments: result.summary.plan.arguments,
                    identifiers: result.summary.plan.identifiers,
                    children: result.summary.plan.children?.map((child) => ({
                        operatorType: child.operatorType,
                        arguments: child.arguments,
                    })),
                };
            }
            return undefined;
        }
        catch (error) {
            logger.debug({ error: error instanceof Error ? error.message : 'Unknown' }, 'EXPLAIN query failed');
            return undefined;
        }
        finally {
            if (session) {
                await session.close();
            }
        }
    }
    /**
     * Check for budget violations
     */
    checkBudgetViolations(cost) {
        const violations = [];
        if (cost.nodesScanned > this.budget.maxNodesScanned) {
            violations.push(`Estimated nodes (${cost.nodesScanned.toLocaleString()}) exceeds budget (${this.budget.maxNodesScanned.toLocaleString()})`);
        }
        if (cost.edgesScanned > this.budget.maxEdgesScanned) {
            violations.push(`Estimated edges (${cost.edgesScanned.toLocaleString()}) exceeds budget (${this.budget.maxEdgesScanned.toLocaleString()})`);
        }
        if (cost.estimatedTimeMs > this.budget.maxTimeMs) {
            violations.push(`Estimated time (${cost.estimatedTimeMs}ms) exceeds budget (${this.budget.maxTimeMs}ms)`);
        }
        if (cost.estimatedMemoryMb > this.budget.maxMemoryMb) {
            violations.push(`Estimated memory (${cost.estimatedMemoryMb}MB) exceeds budget (${this.budget.maxMemoryMb}MB)`);
        }
        if (!this.budget.allowedCostClasses.includes(cost.costClass)) {
            violations.push(`Cost class '${cost.costClass}' is not allowed (allowed: ${this.budget.allowedCostClasses.join(', ')})`);
        }
        return violations;
    }
    /**
     * Generate refinements for budget violations
     */
    generateBudgetRefinements(cypher, cost, violations) {
        const refinements = [];
        // Check for missing LIMIT
        if (!cypher.toUpperCase().includes('LIMIT')) {
            refinements.push({
                original: cypher,
                suggested: `${cypher} LIMIT 100`,
                reason: 'Adding LIMIT reduces result set size',
                estimatedCostReduction: 'medium',
            });
        }
        // Check for unbounded paths
        if (cypher.includes('[*]')) {
            refinements.push({
                original: cypher,
                suggested: cypher.replace(/\[\*\]/g, '[*..3]'),
                reason: 'Bounding path depth reduces exponential expansion',
                estimatedCostReduction: 'high',
            });
        }
        // Check for deep paths
        const pathMatch = cypher.match(/\[\*\.\.(\d+)\]/);
        if (pathMatch) {
            const depth = parseInt(pathMatch[1], 10);
            if (depth > 5) {
                refinements.push({
                    original: cypher,
                    suggested: cypher.replace(/\[\*\.\.(\d+)\]/, '[*..3]'),
                    reason: `Reducing path depth from ${depth} to 3 significantly reduces cost`,
                    estimatedCostReduction: 'high',
                });
            }
        }
        // Suggest filtering
        if (!cypher.toUpperCase().includes('WHERE')) {
            refinements.push({
                original: cypher,
                suggested: cypher.replace(/MATCH\s*\((\w+)\)/i, 'MATCH ($1) WHERE $1.investigationId = $investigationId'),
                reason: 'Adding filters narrows the search space',
                estimatedCostReduction: 'medium',
            });
        }
        return refinements;
    }
    /**
     * Convert Neo4j values to plain JavaScript
     */
    convertNeo4jValue(value) {
        if (value === null || value === undefined) {
            return null;
        }
        // Neo4j integers
        if (typeof value === 'object' && 'low' in value && 'high' in value) {
            return value.toNumber ? value.toNumber() : Number(value.low);
        }
        // Neo4j nodes
        if (typeof value === 'object' && 'labels' in value && 'properties' in value) {
            return {
                id: value.identity?.toNumber?.() || value.identity,
                labels: value.labels,
                properties: this.convertNeo4jValue(value.properties),
            };
        }
        // Neo4j relationships
        if (typeof value === 'object' && 'type' in value && 'properties' in value) {
            return {
                id: value.identity?.toNumber?.() || value.identity,
                type: value.type,
                startNode: value.start?.toNumber?.() || value.start,
                endNode: value.end?.toNumber?.() || value.end,
                properties: this.convertNeo4jValue(value.properties),
            };
        }
        // Arrays
        if (Array.isArray(value)) {
            return value.map((v) => this.convertNeo4jValue(v));
        }
        // Objects
        if (typeof value === 'object') {
            const result = {};
            for (const key of Object.keys(value)) {
                result[key] = this.convertNeo4jValue(value[key]);
            }
            return result;
        }
        return value;
    }
    /**
     * Sanitize error messages to remove sensitive information
     */
    sanitizeError(error) {
        // Remove connection strings
        let sanitized = error.replace(/bolt:\/\/[^@]+@[^/]+/gi, 'bolt://[redacted]');
        // Remove file paths
        sanitized = sanitized.replace(/\/[^\s]+\.(ts|js|json)/gi, '[file]');
        // Remove stack traces
        sanitized = sanitized.split('\n')[0];
        return sanitized;
    }
    /**
     * Get current budget configuration
     */
    getBudget() {
        return { ...this.budget };
    }
    /**
     * Health check
     */
    async healthCheck() {
        let neo4jConnected = false;
        try {
            const session = this.neo4jDriver.session();
            await session.run('RETURN 1');
            await session.close();
            neo4jConnected = true;
        }
        catch (error) {
            logger.error({ error }, 'Neo4j health check failed');
        }
        return {
            healthy: neo4jConnected,
            neo4jConnected,
            budget: this.budget,
        };
    }
}
exports.SandboxExecutorService = SandboxExecutorService;
/**
 * Create a sandbox executor service
 */
function createSandboxExecutor(neo4jDriver, budget) {
    return new SandboxExecutorService(neo4jDriver, budget);
}
