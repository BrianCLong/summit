"use strict";
// @ts-nocheck
/**
 * Query Executor
 *
 * Orchestrates query execution with privacy enforcement:
 * 1. Validates and translates query
 * 2. Executes against backend databases
 * 3. Applies privacy policies (k-anonymity, DP, suppression)
 * 4. Returns privacy-protected results
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryExecutor = void 0;
const uuid_1 = require("uuid");
const index_js_1 = require("../types/index.js");
const QueryTranslator_js_1 = require("./QueryTranslator.js");
const PolicyEnforcer_js_1 = require("../privacy/PolicyEnforcer.js");
const DifferentialPrivacy_js_1 = require("../privacy/DifferentialPrivacy.js");
const logger_js_1 = require("../utils/logger.js");
const index_js_2 = require("../../../../finops/cost-events/index.js");
const DEFAULT_OPTIONS = {
    enableDP: true,
    enableKAnonymity: true,
    defaultMinCohortSize: 5,
    defaultEpsilon: 1.0,
    maxResultRows: 10000,
    queryTimeoutMs: 30000,
};
class QueryExecutor {
    connections;
    translator;
    policyEnforcer;
    dpEngine;
    options;
    auditLog = [];
    constructor(connections, options = {}) {
        this.connections = connections;
        this.translator = new QueryTranslator_js_1.QueryTranslator();
        this.policyEnforcer = new PolicyEnforcer_js_1.PolicyEnforcer(options.defaultMinCohortSize);
        this.dpEngine = new DifferentialPrivacy_js_1.DifferentialPrivacy();
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }
    /**
     * Execute an aggregate query with privacy enforcement
     */
    async execute(query, context) {
        const startTime = Date.now();
        const executionId = context.executionId || (0, uuid_1.v4)();
        const warnings = [];
        const appliedPolicies = [];
        logger_js_1.logger.info({ executionId, tenantId: context.tenantId, source: query.source }, 'Starting query execution');
        try {
            // Step 1: Validate query
            const validation = this.translator.validateQuery(query);
            if (!validation.valid) {
                return this.createErrorResult(executionId, startTime, validation.errors.join('; '), []);
            }
            // Step 2: Execute raw query against backend
            const rawResults = await this.executeRawQuery(query, context);
            if (rawResults.length === 0) {
                return this.createSuccessResult(executionId, startTime, [], 0, warnings, []);
            }
            // Step 3: Apply policy enforcement (k-anonymity, suppression)
            let processedRows = rawResults;
            let suppressedCount = 0;
            if (context.policies.length > 0) {
                const enforcementResult = await this.policyEnforcer.enforce({
                    query,
                    context,
                    rawResults,
                });
                if (enforcementResult.status === index_js_1.QueryStatus.DENIED) {
                    return this.createDeniedResult(executionId, startTime, enforcementResult.denialReason || 'Policy denial', enforcementResult.warnings);
                }
                processedRows = enforcementResult.rows;
                suppressedCount = enforcementResult.suppressedCount;
                warnings.push(...enforcementResult.warnings);
                appliedPolicies.push(...enforcementResult.appliedPolicies);
            }
            else if (this.options.enableKAnonymity) {
                // Apply default k-anonymity if no policies specified
                const kResult = this.policyEnforcer.applyKAnonymity(processedRows, {
                    minCohortSize: this.options.defaultMinCohortSize,
                    violationAction: 'suppress',
                }, query);
                processedRows = kResult.rows;
                suppressedCount = kResult.suppressedCount;
                warnings.push(...kResult.warnings);
            }
            // Step 4: Apply differential privacy if enabled
            let budgetConsumed;
            let budgetRemaining;
            const dpPolicy = context.policies.find(p => p.differentialPrivacy?.epsilon);
            if (dpPolicy?.differentialPrivacy || this.options.enableDP) {
                const dpConfig = dpPolicy?.differentialPrivacy || {
                    epsilon: this.options.defaultEpsilon,
                    mechanism: 'laplace',
                    budgetTracking: true,
                    budgetRenewalPeriod: 'day',
                };
                // Get current budget state
                const budgetState = context.budgetState ||
                    this.dpEngine.getBudgetState(context.tenantId, context.userId, dpConfig);
                const dpResult = this.dpEngine.applyDP(processedRows, dpConfig, query, budgetState);
                if (dpResult.budgetExceeded) {
                    return this.createDeniedResult(executionId, startTime, 'Privacy budget exceeded', dpResult.warnings);
                }
                processedRows = dpResult.rows;
                warnings.push(...dpResult.warnings);
                budgetConsumed = {
                    epsilon: dpResult.epsilonConsumed,
                    delta: dpResult.deltaConsumed,
                };
                // Update budget and get remaining
                if (dpConfig.budgetTracking) {
                    const updatedState = this.dpEngine.consumeBudget(context.tenantId, dpResult.epsilonConsumed, context.userId);
                    budgetRemaining = {
                        epsilon: updatedState.totalBudget - updatedState.spentBudget,
                        queriesRemaining: this.dpEngine.estimateRemainingQueries(updatedState.totalBudget, dpConfig.delta || 1e-5, dpConfig.epsilon, dpConfig.delta || 1e-5),
                    };
                }
                if (dpPolicy) {
                    appliedPolicies.push(dpPolicy.id);
                }
            }
            // Step 5: Determine final status
            let status;
            if (processedRows.length === 0 && rawResults.length > 0) {
                status = index_js_1.QueryStatus.SUPPRESSED;
            }
            else if (suppressedCount > 0) {
                status = index_js_1.QueryStatus.PARTIAL;
            }
            else {
                status = index_js_1.QueryStatus.SUCCESS;
            }
            // Determine privacy mechanism used
            let mechanism = index_js_1.PrivacyMechanism.NONE;
            if (budgetConsumed && suppressedCount > 0) {
                mechanism = index_js_1.PrivacyMechanism.COMBINED;
            }
            else if (budgetConsumed) {
                mechanism = index_js_1.PrivacyMechanism.DIFFERENTIAL_PRIVACY;
            }
            else if (suppressedCount > 0) {
                mechanism = index_js_1.PrivacyMechanism.K_ANONYMITY;
            }
            const result = {
                status,
                data: processedRows,
                totalCount: rawResults.length,
                filteredCount: processedRows.length,
                suppressedCount,
                privacyMechanism: mechanism,
                warnings,
                budgetConsumed,
                budgetRemaining,
                metadata: {
                    executionId,
                    executionTimeMs: Date.now() - startTime,
                    policiesApplied: appliedPolicies,
                    timestamp: new Date(),
                },
            };
            // Log metrics and audit
            this.logExecution(executionId, query, context, result);
            // Emit cost event
            try {
                (0, index_js_2.emitCostEvent)({
                    operationType: 'query',
                    tenantId: context.tenantId,
                    scopeId: query.source, // Use data source as a proxy for scope
                    correlationId: executionId,
                    dimensions: {
                        query_complexity: (query.dimensions?.length || 0) +
                            (query.measures?.length || 0) +
                            (query.filters ? 1 : 0),
                        rows_scanned: result.totalCount,
                        rows_returned: result.filteredCount,
                        cpu_ms: result.metadata.executionTimeMs,
                    },
                });
            }
            catch (costError) {
                logger_js_1.logger.error({ executionId, error: costError }, 'Failed to emit cost event');
                // Do not fail the query if cost event fails
            }
            return result;
        }
        catch (error) {
            logger_js_1.logger.error({ executionId, error }, 'Query execution failed');
            return this.createErrorResult(executionId, startTime, error instanceof Error ? error.message : 'Unknown error', warnings);
        }
    }
    /**
     * Execute raw query against the appropriate backend
     */
    async executeRawQuery(query, context) {
        // Determine which backend to use
        const useNeo4j = this.shouldUseNeo4j(query.source);
        if (useNeo4j && this.connections.neo4j) {
            return this.executeNeo4jQuery(query);
        }
        else {
            return this.executePostgresQuery(query, context);
        }
    }
    /**
     * Determine if query should go to Neo4j
     */
    shouldUseNeo4j(source) {
        // Entities and relationships are better served by Neo4j if available
        return source === 'entities' || source === 'relationships';
    }
    /**
     * Execute query against PostgreSQL
     */
    async executePostgresQuery(query, context) {
        const { sql, params } = this.translator.toPostgres(query);
        logger_js_1.logger.debug({ sql, params: params.length }, 'Executing PostgreSQL query');
        const result = await this.connections.postgres.query({
            text: sql,
            values: params,
            timeout: this.options.queryTimeoutMs,
        });
        return this.transformPostgresResults(result.rows, query);
    }
    /**
     * Execute query against Neo4j
     */
    async executeNeo4jQuery(query) {
        if (!this.connections.neo4j) {
            throw new Error('Neo4j connection not available');
        }
        const { cypher, params } = this.translator.toCypher(query);
        logger_js_1.logger.debug({ cypher, params }, 'Executing Cypher query');
        const session = this.connections.neo4j.session();
        try {
            const result = await session.run(cypher, params);
            return this.transformNeo4jResults(result.records, query);
        }
        finally {
            await session.close();
        }
    }
    /**
     * Transform PostgreSQL results to standard format
     */
    transformPostgresResults(rows, query) {
        return rows.map(row => {
            const dimensions = {};
            const measures = {};
            // Extract dimensions
            for (const dim of query.dimensions) {
                const key = dim.alias || dim.field;
                dimensions[key] = row[key];
            }
            // Extract measures
            for (const measure of query.measures) {
                const key = measure.alias || `${measure.aggregation}_${measure.field}`;
                const value = row[key];
                measures[key] = value !== null && value !== undefined
                    ? Number(value)
                    : null;
            }
            // Extract cohort size
            const cohortSize = row['cohort_size']
                ? Number(row['cohort_size'])
                : undefined;
            return {
                dimensions,
                measures,
                privacyAffected: false,
                cohortSize,
            };
        });
    }
    /**
     * Transform Neo4j results to standard format
     */
    transformNeo4jResults(records, query) {
        return records.map(record => {
            const dimensions = {};
            const measures = {};
            // Extract dimensions
            for (const dim of query.dimensions) {
                const key = dim.alias || dim.field;
                dimensions[key] = record.get(key);
            }
            // Extract measures
            for (const measure of query.measures) {
                const key = measure.alias || `${measure.aggregation}_${measure.field}`;
                const value = record.get(key);
                measures[key] = value !== null && value !== undefined
                    ? Number(value)
                    : null;
            }
            // Extract cohort size
            const cohortSize = record.get('cohort_size');
            return {
                dimensions,
                measures,
                privacyAffected: false,
                cohortSize: cohortSize !== null ? Number(cohortSize) : undefined,
            };
        });
    }
    /**
     * Create success result
     */
    createSuccessResult(executionId, startTime, data, suppressedCount, warnings, appliedPolicies) {
        return {
            status: index_js_1.QueryStatus.SUCCESS,
            data,
            totalCount: data.length + suppressedCount,
            filteredCount: data.length,
            suppressedCount,
            privacyMechanism: index_js_1.PrivacyMechanism.NONE,
            warnings,
            metadata: {
                executionId,
                executionTimeMs: Date.now() - startTime,
                policiesApplied: appliedPolicies,
                timestamp: new Date(),
            },
        };
    }
    /**
     * Create error result
     */
    createErrorResult(executionId, startTime, errorMessage, warnings) {
        return {
            status: index_js_1.QueryStatus.ERROR,
            data: [],
            totalCount: 0,
            filteredCount: 0,
            suppressedCount: 0,
            privacyMechanism: index_js_1.PrivacyMechanism.NONE,
            warnings: [
                ...warnings,
                {
                    code: 'EXECUTION_ERROR',
                    message: errorMessage,
                    severity: 'error',
                },
            ],
            metadata: {
                executionId,
                executionTimeMs: Date.now() - startTime,
                policiesApplied: [],
                timestamp: new Date(),
            },
        };
    }
    /**
     * Create denied result
     */
    createDeniedResult(executionId, startTime, reason, warnings) {
        return {
            status: index_js_1.QueryStatus.DENIED,
            data: [],
            totalCount: 0,
            filteredCount: 0,
            suppressedCount: 0,
            privacyMechanism: index_js_1.PrivacyMechanism.NONE,
            warnings,
            denialReason: reason,
            metadata: {
                executionId,
                executionTimeMs: Date.now() - startTime,
                policiesApplied: [],
                timestamp: new Date(),
            },
        };
    }
    /**
     * Log execution metrics and audit record
     */
    logExecution(executionId, query, context, result) {
        // Log metrics
        (0, logger_js_1.logQueryMetrics)(executionId, {
            durationMs: result.metadata.executionTimeMs,
            rowCount: result.filteredCount,
            suppressedCount: result.suppressedCount,
            policiesApplied: result.metadata.policiesApplied,
            status: result.status,
        });
        // Create audit record
        const auditRecord = {
            id: (0, uuid_1.v4)(),
            executionId,
            tenantId: context.tenantId,
            userId: context.userId,
            query,
            appliedPolicies: result.metadata.policiesApplied,
            mechanism: result.privacyMechanism,
            epsilonConsumed: result.budgetConsumed?.epsilon,
            rowsSuppressed: result.suppressedCount,
            status: result.status,
            denialReason: result.denialReason,
            durationMs: result.metadata.executionTimeMs,
            timestamp: new Date(),
        };
        this.auditLog.push(auditRecord);
        // Log privacy audit event
        (0, logger_js_1.logPrivacyAudit)(executionId, 'query_executed', {
            tenantId: context.tenantId,
            userId: context.userId,
            source: query.source,
            mechanism: result.privacyMechanism,
            epsilonConsumed: result.budgetConsumed?.epsilon,
            rowsSuppressed: result.suppressedCount,
            status: result.status,
        });
        // Keep audit log bounded
        if (this.auditLog.length > 10000) {
            this.auditLog = this.auditLog.slice(-5000);
        }
    }
    /**
     * Get recent audit records
     */
    getAuditLog(tenantId, limit = 100) {
        let records = this.auditLog;
        if (tenantId) {
            records = records.filter(r => r.tenantId === tenantId);
        }
        return records.slice(-limit).reverse();
    }
    /**
     * Get privacy budget state
     */
    getBudgetState(tenantId, userId) {
        return this.dpEngine.getBudgetState(tenantId, userId);
    }
    /**
     * Get all budget states (admin)
     */
    getAllBudgetStates() {
        return this.dpEngine.getAllBudgetStates();
    }
}
exports.QueryExecutor = QueryExecutor;
