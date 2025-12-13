/**
 * Query Executor
 *
 * Orchestrates query execution with privacy enforcement:
 * 1. Validates and translates query
 * 2. Executes against backend databases
 * 3. Applies privacy policies (k-anonymity, DP, suppression)
 * 4. Returns privacy-protected results
 */

import { v4 as uuidv4 } from 'uuid';
import type { Pool, QueryResult } from 'pg';
import type { Driver, Session } from 'neo4j-driver';

import type {
  AggregateQuery,
  AggregateResult,
  AggregateResultRow,
  ExecutionContext,
  PrivacyPolicy,
  PrivacyAuditRecord,
  PrivacyWarning,
  DataSource,
} from '../types/index.js';
import { QueryStatus, PrivacyMechanism } from '../types/index.js';
import { QueryTranslator } from './QueryTranslator.js';
import { PolicyEnforcer } from '../privacy/PolicyEnforcer.js';
import { DifferentialPrivacy } from '../privacy/DifferentialPrivacy.js';
import { logger, logQueryMetrics, logPrivacyAudit } from '../utils/logger.js';

/**
 * Database connections
 */
export interface DatabaseConnections {
  postgres: Pool;
  neo4j?: Driver;
}

/**
 * Query executor options
 */
export interface QueryExecutorOptions {
  /** Enable differential privacy by default */
  enableDP: boolean;
  /** Enable k-anonymity by default */
  enableKAnonymity: boolean;
  /** Default minimum cohort size */
  defaultMinCohortSize: number;
  /** Default epsilon for DP */
  defaultEpsilon: number;
  /** Maximum result rows */
  maxResultRows: number;
  /** Query timeout in ms */
  queryTimeoutMs: number;
}

const DEFAULT_OPTIONS: QueryExecutorOptions = {
  enableDP: true,
  enableKAnonymity: true,
  defaultMinCohortSize: 5,
  defaultEpsilon: 1.0,
  maxResultRows: 10000,
  queryTimeoutMs: 30000,
};

export class QueryExecutor {
  private connections: DatabaseConnections;
  private translator: QueryTranslator;
  private policyEnforcer: PolicyEnforcer;
  private dpEngine: DifferentialPrivacy;
  private options: QueryExecutorOptions;
  private auditLog: PrivacyAuditRecord[] = [];

  constructor(
    connections: DatabaseConnections,
    options: Partial<QueryExecutorOptions> = {}
  ) {
    this.connections = connections;
    this.translator = new QueryTranslator();
    this.policyEnforcer = new PolicyEnforcer(options.defaultMinCohortSize);
    this.dpEngine = new DifferentialPrivacy();
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Execute an aggregate query with privacy enforcement
   */
  async execute(
    query: AggregateQuery,
    context: ExecutionContext
  ): Promise<AggregateResult> {
    const startTime = Date.now();
    const executionId = context.executionId || uuidv4();
    const warnings: PrivacyWarning[] = [];
    const appliedPolicies: string[] = [];

    logger.info({ executionId, tenantId: context.tenantId, source: query.source }, 'Starting query execution');

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

        if (enforcementResult.status === QueryStatus.DENIED) {
          return this.createDeniedResult(
            executionId,
            startTime,
            enforcementResult.denialReason || 'Policy denial',
            enforcementResult.warnings
          );
        }

        processedRows = enforcementResult.rows;
        suppressedCount = enforcementResult.suppressedCount;
        warnings.push(...enforcementResult.warnings);
        appliedPolicies.push(...enforcementResult.appliedPolicies);
      } else if (this.options.enableKAnonymity) {
        // Apply default k-anonymity if no policies specified
        const kResult = this.policyEnforcer.applyKAnonymity(
          processedRows,
          {
            minCohortSize: this.options.defaultMinCohortSize,
            violationAction: 'suppress',
          },
          query
        );
        processedRows = kResult.rows;
        suppressedCount = kResult.suppressedCount;
        warnings.push(...kResult.warnings);
      }

      // Step 4: Apply differential privacy if enabled
      let budgetConsumed: { epsilon: number; delta?: number } | undefined;
      let budgetRemaining: { epsilon: number; queriesRemaining: number } | undefined;

      const dpPolicy = context.policies.find(p => p.differentialPrivacy?.epsilon);

      if (dpPolicy?.differentialPrivacy || this.options.enableDP) {
        const dpConfig = dpPolicy?.differentialPrivacy || {
          epsilon: this.options.defaultEpsilon,
          mechanism: 'laplace' as const,
          budgetTracking: true,
          budgetRenewalPeriod: 'day' as const,
        };

        // Get current budget state
        const budgetState = context.budgetState ||
          this.dpEngine.getBudgetState(context.tenantId, context.userId, dpConfig);

        const dpResult = this.dpEngine.applyDP(processedRows, dpConfig, query, budgetState);

        if (dpResult.budgetExceeded) {
          return this.createDeniedResult(
            executionId,
            startTime,
            'Privacy budget exceeded',
            dpResult.warnings
          );
        }

        processedRows = dpResult.rows;
        warnings.push(...dpResult.warnings);
        budgetConsumed = {
          epsilon: dpResult.epsilonConsumed,
          delta: dpResult.deltaConsumed,
        };

        // Update budget and get remaining
        if (dpConfig.budgetTracking) {
          const updatedState = this.dpEngine.consumeBudget(
            context.tenantId,
            dpResult.epsilonConsumed,
            context.userId
          );

          budgetRemaining = {
            epsilon: updatedState.totalBudget - updatedState.spentBudget,
            queriesRemaining: this.dpEngine.estimateRemainingQueries(
              updatedState.totalBudget,
              dpConfig.delta || 1e-5,
              dpConfig.epsilon,
              dpConfig.delta || 1e-5
            ),
          };
        }

        if (dpPolicy) {
          appliedPolicies.push(dpPolicy.id);
        }
      }

      // Step 5: Determine final status
      let status: QueryStatus;
      if (processedRows.length === 0 && rawResults.length > 0) {
        status = QueryStatus.SUPPRESSED;
      } else if (suppressedCount > 0) {
        status = QueryStatus.PARTIAL;
      } else {
        status = QueryStatus.SUCCESS;
      }

      // Determine privacy mechanism used
      let mechanism = PrivacyMechanism.NONE;
      if (budgetConsumed && suppressedCount > 0) {
        mechanism = PrivacyMechanism.COMBINED;
      } else if (budgetConsumed) {
        mechanism = PrivacyMechanism.DIFFERENTIAL_PRIVACY;
      } else if (suppressedCount > 0) {
        mechanism = PrivacyMechanism.K_ANONYMITY;
      }

      const result: AggregateResult = {
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

      return result;
    } catch (error) {
      logger.error({ executionId, error }, 'Query execution failed');
      return this.createErrorResult(
        executionId,
        startTime,
        error instanceof Error ? error.message : 'Unknown error',
        warnings
      );
    }
  }

  /**
   * Execute raw query against the appropriate backend
   */
  private async executeRawQuery(
    query: AggregateQuery,
    context: ExecutionContext
  ): Promise<AggregateResultRow[]> {
    // Determine which backend to use
    const useNeo4j = this.shouldUseNeo4j(query.source);

    if (useNeo4j && this.connections.neo4j) {
      return this.executeNeo4jQuery(query);
    } else {
      return this.executePostgresQuery(query, context);
    }
  }

  /**
   * Determine if query should go to Neo4j
   */
  private shouldUseNeo4j(source: DataSource): boolean {
    // Entities and relationships are better served by Neo4j if available
    return source === 'entities' || source === 'relationships';
  }

  /**
   * Execute query against PostgreSQL
   */
  private async executePostgresQuery(
    query: AggregateQuery,
    context: ExecutionContext
  ): Promise<AggregateResultRow[]> {
    const { sql, params } = this.translator.toPostgres(query);

    logger.debug({ sql, params: params.length }, 'Executing PostgreSQL query');

    const result: QueryResult = await this.connections.postgres.query({
      text: sql,
      values: params,
      timeout: this.options.queryTimeoutMs,
    });

    return this.transformPostgresResults(result.rows, query);
  }

  /**
   * Execute query against Neo4j
   */
  private async executeNeo4jQuery(query: AggregateQuery): Promise<AggregateResultRow[]> {
    if (!this.connections.neo4j) {
      throw new Error('Neo4j connection not available');
    }

    const { cypher, params } = this.translator.toCypher(query);

    logger.debug({ cypher, params }, 'Executing Cypher query');

    const session: Session = this.connections.neo4j.session();
    try {
      const result = await session.run(cypher, params);
      return this.transformNeo4jResults(result.records, query);
    } finally {
      await session.close();
    }
  }

  /**
   * Transform PostgreSQL results to standard format
   */
  private transformPostgresResults(
    rows: Record<string, unknown>[],
    query: AggregateQuery
  ): AggregateResultRow[] {
    return rows.map(row => {
      const dimensions: Record<string, unknown> = {};
      const measures: Record<string, number | null> = {};

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
  private transformNeo4jResults(
    records: { get: (key: string) => unknown }[],
    query: AggregateQuery
  ): AggregateResultRow[] {
    return records.map(record => {
      const dimensions: Record<string, unknown> = {};
      const measures: Record<string, number | null> = {};

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
  private createSuccessResult(
    executionId: string,
    startTime: number,
    data: AggregateResultRow[],
    suppressedCount: number,
    warnings: PrivacyWarning[],
    appliedPolicies: string[]
  ): AggregateResult {
    return {
      status: QueryStatus.SUCCESS,
      data,
      totalCount: data.length + suppressedCount,
      filteredCount: data.length,
      suppressedCount,
      privacyMechanism: PrivacyMechanism.NONE,
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
  private createErrorResult(
    executionId: string,
    startTime: number,
    errorMessage: string,
    warnings: PrivacyWarning[]
  ): AggregateResult {
    return {
      status: QueryStatus.ERROR,
      data: [],
      totalCount: 0,
      filteredCount: 0,
      suppressedCount: 0,
      privacyMechanism: PrivacyMechanism.NONE,
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
  private createDeniedResult(
    executionId: string,
    startTime: number,
    reason: string,
    warnings: PrivacyWarning[]
  ): AggregateResult {
    return {
      status: QueryStatus.DENIED,
      data: [],
      totalCount: 0,
      filteredCount: 0,
      suppressedCount: 0,
      privacyMechanism: PrivacyMechanism.NONE,
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
  private logExecution(
    executionId: string,
    query: AggregateQuery,
    context: ExecutionContext,
    result: AggregateResult
  ): void {
    // Log metrics
    logQueryMetrics(executionId, {
      durationMs: result.metadata.executionTimeMs,
      rowCount: result.filteredCount,
      suppressedCount: result.suppressedCount,
      policiesApplied: result.metadata.policiesApplied,
      status: result.status,
    });

    // Create audit record
    const auditRecord: PrivacyAuditRecord = {
      id: uuidv4(),
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
    logPrivacyAudit(executionId, 'query_executed', {
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
  getAuditLog(
    tenantId?: string,
    limit: number = 100
  ): PrivacyAuditRecord[] {
    let records = this.auditLog;

    if (tenantId) {
      records = records.filter(r => r.tenantId === tenantId);
    }

    return records.slice(-limit).reverse();
  }

  /**
   * Get privacy budget state
   */
  getBudgetState(tenantId: string, userId?: string) {
    return this.dpEngine.getBudgetState(tenantId, userId);
  }

  /**
   * Get all budget states (admin)
   */
  getAllBudgetStates() {
    return this.dpEngine.getAllBudgetStates();
  }
}
