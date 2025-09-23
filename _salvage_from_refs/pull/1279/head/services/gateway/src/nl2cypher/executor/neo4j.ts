/**
 * Neo4j Cypher Executor
 *
 * Provides safe execution of Cypher queries with timeout, read-only mode,
 * and comprehensive error handling.
 */

import neo4j, { Driver, Session, Transaction, Result, QueryResult } from 'neo4j-driver';
import { ICypherExecutor, ExecutionRequest, ExecutionResponse, QueryPlan, PlanOperator } from '../translator/interface';
import { CypherConstraintEngine, ConstraintAnalysis } from '../guardrails';
import pino from 'pino';
import { randomUUID } from 'crypto';

const logger = pino({ name: 'neo4j-executor' });

export interface Neo4jConfig {
  uri: string;
  username: string;
  password: string;
  database?: string;
  max_pool_size?: number;
  connection_timeout_ms?: number;
  max_transaction_retry_time_ms?: number;
  read_timeout_ms?: number;
  write_timeout_ms?: number;
}

export class Neo4jCypherExecutor implements ICypherExecutor {
  private driver: Driver;
  private constraintEngine: CypherConstraintEngine;
  private config: Neo4jConfig;

  constructor(config: Neo4jConfig, constraintEngine?: CypherConstraintEngine) {
    this.config = config;
    this.constraintEngine = constraintEngine || new CypherConstraintEngine();

    // Initialize Neo4j driver
    this.driver = neo4j.driver(
      config.uri,
      neo4j.auth.basic(config.username, config.password),
      {
        maxConnectionPoolSize: config.max_pool_size || 10,
        connectionAcquisitionTimeout: config.connection_timeout_ms || 30000,
        maxTransactionRetryTime: config.max_transaction_retry_time_ms || 30000,
        resolver: (address) => [address], // Use provided address directly
        encrypted: config.uri.startsWith('neo4j+s://') ? 'ENCRYPTION_ON' : 'ENCRYPTION_OFF'
      }
    );

    logger.info('Neo4j executor initialized', {
      uri: config.uri,
      database: config.database || 'default'
    });
  }

  /**
   * Execute Cypher query with full safety checks
   */
  async execute(request: ExecutionRequest): Promise<ExecutionResponse> {
    const request_id = request.context.request_id || randomUUID();
    const start_time = Date.now();

    try {
      logger.debug({ request_id, cypher: request.cypher }, 'Executing Cypher query');

      // 1. Constraint analysis
      const analysis = await this.constraintEngine.analyzeQuery(request.cypher, {
        user_id: request.context.user_id,
        tenant_id: request.context.tenant_id,
        scopes: request.context.scopes
      });

      if (!analysis.is_allowed) {
        throw new Error(`Query blocked by constraints: ${analysis.reasons.join(', ')}`);
      }

      // 2. Use modified query if available
      const queryToExecute = analysis.modified_cypher || request.cypher;

      // 3. Execute query
      const result = await this.executeWithTimeout(
        queryToExecute,
        request.parameters || {},
        request.options?.timeout_ms || 30000,
        request.options?.max_results || 1000,
        request.options?.explain || false
      );

      const execution_time = Date.now() - start_time;

      logger.info({
        request_id,
        user_id: request.context.user_id,
        tenant_id: request.context.tenant_id,
        result_count: result.records.length,
        execution_time_ms: execution_time,
        db_hits: result.summary.counters.updates().nodesCreated +
                 result.summary.counters.updates().relationshipsCreated
      }, 'Query executed successfully');

      return this.formatExecutionResponse(result, request_id, execution_time);

    } catch (error) {
      const execution_time = Date.now() - start_time;

      logger.error({
        request_id,
        error: error.message,
        execution_time_ms: execution_time
      }, 'Query execution failed');

      throw error;
    }
  }

  /**
   * Execute query in read-only transaction
   */
  async executeReadOnly(request: ExecutionRequest): Promise<ExecutionResponse> {
    const session = this.driver.session({
      database: this.config.database,
      defaultAccessMode: neo4j.session.READ
    });

    try {
      return await session.executeRead(async (tx) => {
        const modifiedRequest = { ...request };
        // Force read-only by using read transaction
        return this.executeInTransaction(tx, modifiedRequest);
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Get query execution plan
   */
  async explain(cypher: string, parameters: Record<string, any> = {}): Promise<QueryPlan> {
    const session = this.driver.session({
      database: this.config.database,
      defaultAccessMode: neo4j.session.READ
    });

    try {
      const explainQuery = `EXPLAIN ${cypher}`;
      const result = await session.run(explainQuery, parameters);

      return this.parseQueryPlan(result);
    } finally {
      await session.close();
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    latency_ms: number;
    version: string;
    read_replicas?: number;
  }> {
    const start_time = Date.now();

    try {
      const session = this.driver.session({
        database: this.config.database,
        defaultAccessMode: neo4j.session.READ
      });

      try {
        // Simple connectivity test
        const result = await session.run('CALL dbms.components() YIELD name, versions');
        const latency_ms = Date.now() - start_time;

        const components = result.records.map(record => ({
          name: record.get('name'),
          versions: record.get('versions')
        }));

        const neo4jComponent = components.find(c => c.name === 'Neo4j Kernel');
        const version = neo4jComponent?.versions?.[0] || 'unknown';

        return {
          status: latency_ms < 1000 ? 'healthy' : 'degraded',
          latency_ms,
          version
        };
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error({ error }, 'Health check failed');
      return {
        status: 'down',
        latency_ms: Date.now() - start_time,
        version: 'unknown'
      };
    }
  }

  /**
   * Close driver connection
   */
  async close(): Promise<void> {
    await this.driver.close();
    logger.info('Neo4j driver closed');
  }

  /**
   * Execute query with timeout and result limiting
   */
  private async executeWithTimeout(
    cypher: string,
    parameters: Record<string, any>,
    timeout_ms: number,
    max_results: number,
    explain: boolean
  ): Promise<QueryResult> {
    const session = this.driver.session({
      database: this.config.database,
      defaultAccessMode: neo4j.session.READ
    });

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Query timeout after ${timeout_ms}ms`)), timeout_ms);
      });

      // Execute query with timeout
      const queryPromise = session.run(cypher, parameters);
      const result = await Promise.race([queryPromise, timeoutPromise]);

      // Limit results if needed
      if (result.records.length > max_results) {
        logger.warn({
          cypher,
          result_count: result.records.length,
          max_results
        }, 'Result set truncated');

        // Truncate records
        result.records = result.records.slice(0, max_results);
      }

      return result;
    } finally {
      await session.close();
    }
  }

  /**
   * Execute query within existing transaction
   */
  private async executeInTransaction(
    tx: Transaction,
    request: ExecutionRequest
  ): Promise<ExecutionResponse> {
    const request_id = request.context.request_id || randomUUID();
    const start_time = Date.now();

    try {
      const result = await tx.run(request.cypher, request.parameters || {});
      const execution_time = Date.now() - start_time;

      return this.formatExecutionResponse(result, request_id, execution_time);
    } catch (error) {
      logger.error({ request_id, error }, 'Transaction execution failed');
      throw error;
    }
  }

  /**
   * Format Neo4j result into standard response
   */
  private formatExecutionResponse(
    result: QueryResult,
    request_id: string,
    execution_time_ms: number
  ): ExecutionResponse {
    // Extract column names
    const columns = result.records.length > 0
      ? result.records[0].keys
      : [];

    // Convert records to plain objects
    const results = result.records.map(record => {
      const obj: any = {};
      record.keys.forEach(key => {
        const value = record.get(key);
        obj[key] = this.convertNeo4jValue(value);
      });
      return obj;
    });

    // Extract warnings from summary
    const warnings: string[] = [];
    if (result.summary.notifications) {
      warnings.push(...result.summary.notifications.map(n => n.description || n.title));
    }

    return {
      request_id,
      results,
      columns,
      summary: {
        result_count: results.length,
        execution_time_ms,
        consumed_units: this.calculateConsumedUnits(result.summary)
      },
      warnings
    };
  }

  /**
   * Parse Neo4j query plan into standard format
   */
  private parseQueryPlan(result: QueryResult): QueryPlan {
    const plan = result.summary.plan;
    if (!plan) {
      throw new Error('No query plan available');
    }

    const operators = this.convertPlanOperators(plan.root);

    return {
      operators,
      estimated_rows: plan.root.estimatedRows || 0,
      db_hits: this.sumDbHits(operators),
      page_cache_hits: 0, // Not available in explain
      page_cache_misses: 0
    };
  }

  /**
   * Convert Neo4j plan operators to standard format
   */
  private convertPlanOperators(planNode: any): PlanOperator[] {
    const operator: PlanOperator = {
      operator_type: planNode.operatorType,
      estimated_rows: planNode.estimatedRows || 0,
      db_hits: planNode.dbHits || 0,
      variables: planNode.variables || [],
      details: planNode.arguments || {},
      children: []
    };

    if (planNode.children) {
      operator.children = planNode.children.flatMap((child: any) =>
        this.convertPlanOperators(child)
      );
    }

    return [operator];
  }

  /**
   * Convert Neo4j values to JSON-serializable format
   */
  private convertNeo4jValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }

    // Handle Neo4j types
    if (neo4j.types.Node.isNode(value)) {
      return {
        identity: value.identity.toString(),
        labels: value.labels,
        properties: Object.fromEntries(
          Object.entries(value.properties).map(([k, v]) => [k, this.convertNeo4jValue(v)])
        )
      };
    }

    if (neo4j.types.Relationship.isRelationship(value)) {
      return {
        identity: value.identity.toString(),
        start: value.start.toString(),
        end: value.end.toString(),
        type: value.type,
        properties: Object.fromEntries(
          Object.entries(value.properties).map(([k, v]) => [k, this.convertNeo4jValue(v)])
        )
      };
    }

    if (neo4j.types.Path.isPath(value)) {
      return {
        start: this.convertNeo4jValue(value.start),
        end: this.convertNeo4jValue(value.end),
        segments: value.segments.map((seg: any) => ({
          start: this.convertNeo4jValue(seg.start),
          relationship: this.convertNeo4jValue(seg.relationship),
          end: this.convertNeo4jValue(seg.end)
        }))
      };
    }

    if (neo4j.integer.isInteger(value)) {
      return neo4j.integer.toNumber(value);
    }

    if (neo4j.types.DateTime.isDateTime(value)) {
      return value.toString();
    }

    if (neo4j.types.Date.isDate(value)) {
      return value.toString();
    }

    if (neo4j.types.Time.isTime(value)) {
      return value.toString();
    }

    if (Array.isArray(value)) {
      return value.map(item => this.convertNeo4jValue(item));
    }

    if (typeof value === 'object') {
      const converted: any = {};
      for (const [key, val] of Object.entries(value)) {
        converted[key] = this.convertNeo4jValue(val);
      }
      return converted;
    }

    return value;
  }

  /**
   * Calculate consumed units for cost tracking
   */
  private calculateConsumedUnits(summary: any): number {
    const counters = summary.counters?.updates() || {};

    // Basic unit calculation (adjust based on your cost model)
    let units = 1; // Base unit for any query

    units += (counters.nodesCreated || 0) * 0.1;
    units += (counters.relationshipsCreated || 0) * 0.1;
    units += (counters.propertiesSet || 0) * 0.01;

    return Math.round(units * 1000) / 1000; // Round to 3 decimal places
  }

  /**
   * Sum database hits from all operators
   */
  private sumDbHits(operators: PlanOperator[]): number {
    return operators.reduce((sum, op) => {
      return sum + op.db_hits + this.sumDbHits(op.children);
    }, 0);
  }
}