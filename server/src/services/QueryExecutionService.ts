import { Result, Driver, Session } from 'neo4j-driver';
import { getNeo4jDriver } from '../db/neo4j.js';
import { logger } from '../config/logger.js';
import { enforceTenantScopeForCypher } from './graphTenantScope.js';

export interface ExecutionResult {
  records: any[];
  summary: {
    query: string;
    parameters: any;
    executionTimeMs: number;
    resultAvailableAfterMs: number;
  };
  truncated: boolean;
}

export interface ExecutionOptions {
  tenantId: string;
  rowLimit?: number;
  timeoutMs?: number;
}

export class QueryExecutionService {
  private static instance: QueryExecutionService;

  private constructor() {}

  public static getInstance(): QueryExecutionService {
    if (!QueryExecutionService.instance) {
      QueryExecutionService.instance = new QueryExecutionService();
    }
    return QueryExecutionService.instance;
  }

  /**
   * Executes a Cypher query in "Sandbox Mode" (Read-Only, Limited).
   */
  public async executeSandbox(
    cypher: string,
    params: any = {},
    options: ExecutionOptions
  ): Promise<ExecutionResult> {
    const { tenantId, rowLimit = 50, timeoutMs = 5000 } = options;

    // 1. Quota Check (Placeholder)

    // 2. Safety Checks
    this.validateSafety(cypher);

    // 3. Enforce Limits
    const safeCypher = this.enforceLimits(cypher, rowLimit);
    const scoped = await enforceTenantScopeForCypher(safeCypher, params, {
      tenantId,
      action: 'graph.read',
      resource: 'graph.sandbox.query',
    });

    const driver = getNeo4jDriver();
    // Use READ session
    const session = driver.session({
      defaultAccessMode: 'READ',
      database: 'neo4j',
    });

    try {
      const result: Result = await session.run(scoped.cypher, scoped.params, {
        timeout: timeoutMs,
      });

      const records = result.records.map((r: any) => r.toObject());
      const summary = result.summary;

      return {
        records,
        summary: {
          query: summary.query.text,
          parameters: summary.query.parameters,
          executionTimeMs: summary.resultConsumedAfter.toNumber(),
          resultAvailableAfterMs: summary.resultAvailableAfter.toNumber(),
        },
        truncated: records.length >= rowLimit,
      };
    } catch (error: any) {
      logger.error({ error, cypher, tenantId }, 'Sandbox Query Failed');
      throw new Error(`Query Execution Failed: ${error.message}`);
    } finally {
      await session.close();
    }
  }

  private validateSafety(cypher: string) {
    const upperCypher = cypher.toUpperCase();
    if (/\b(CREATE|MERGE|DELETE|SET|REMOVE|DROP)\b/i.test(upperCypher)) {
         throw new Error('Write operations are not allowed in Query Studio.');
    }
  }

  private enforceLimits(cypher: string, limit: number): string {
    const limitRegex = /\bLIMIT\s+(\d+)/i;
    const match = cypher.match(limitRegex);

    if (match) {
        const userLimit = parseInt(match[1], 10);
        if (userLimit > limit) {
            // Replace user limit with safe limit
            return cypher.replace(limitRegex, `LIMIT ${limit}`);
        }
        return cypher;
    }

    return `${cypher} LIMIT ${limit}`;
  }
}

export const queryExecutionService = QueryExecutionService.getInstance();
