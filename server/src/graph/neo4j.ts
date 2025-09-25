import neo4j, { Driver } from 'neo4j-driver';

import { costGuard } from '../services/cost-guard.js';
import { slowQueryKiller } from '../observability/telemetry';

interface RunCypherOptions {
  tenantId?: string;
  userId?: string;
  complexity?: number;
  operationId?: string;
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
}

function estimateCypherComplexity(query: string): number {
  const normalized = query.replace(/\s+/g, ' ').trim();
  const clauses = ['MATCH', 'OPTIONAL MATCH', 'WITH', 'RETURN', 'UNWIND', 'CALL'];
  const count = clauses.reduce((acc, clause) => acc + (normalized.toUpperCase().split(clause).length - 1), 0);
  return Math.max(1, count || normalized.length / 200);
}

let driver: Driver | null = null;

export function getDriver() {
  if (!driver) {
    driver = neo4j.driver(
      process.env.NEO4J_URI!,
      neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!),
      { disableLosslessIntegers: true },
    );
  }
  return driver;
}

export async function runCypher<T = any>(
  cypher: string,
  params: Record<string, any> = {},
  options: RunCypherOptions = {}
) {
  const tenantId = options.tenantId ?? (params.__tenantId as string) ?? 'default';
  const userId = options.userId ?? (params.__userId as string) ?? 'unknown';
  const operationId = options.operationId ?? `cypher-${Date.now()}`;
  const complexity = options.complexity ?? estimateCypherComplexity(cypher);

  const costContext = {
    tenantId,
    userId,
    operation: 'cypher_query',
    complexity,
    metadata: {
      queryPreview: cypher.slice(0, 120),
      ...options.metadata
    },
    operationId
  } as const;

  const costCheck = await costGuard.checkCostAllowance(costContext);
  if (!costCheck.allowed) {
    costGuard.releaseReservation(costCheck.reservationId, 'cypher_deny');
    const error: any = new Error('Cost guard limit exceeded');
    error.code = 'COST_GUARD_LIMIT';
    error.hints = costCheck.hints;
    error.budgetRemaining = costCheck.budgetRemaining;
    throw error;
  }

  const session = getDriver().session({ defaultAccessMode: neo4j.session.WRITE });
  const queryId = `${operationId}-${Math.random().toString(36).slice(2, 8)}`;
  const timeout = options.timeoutMs ?? 30_000;
  let tracked = true;
  let completed = false;

  slowQueryKiller.registerQuery(queryId, cypher, timeout);
  costGuard.startCostlyOperation(queryId, costContext);

  const start = Date.now();
  try {
    const result = await session.run(cypher, params);
    slowQueryKiller.completeQuery(queryId);
    completed = true;
    costGuard.completeCostlyOperation(queryId);
    tracked = false;

    const records = result.records.map((r) => r.toObject()) as T[];
    const actualCost = costCheck.partialAllowed ? costCheck.reservedAmount : costCheck.estimatedCost;

    await costGuard.recordActualCost(
      {
        ...costContext,
        reservationId: costCheck.reservationId,
        duration: Date.now() - start,
        resultCount: records.length
      },
      actualCost
    );

    if (costCheck.partialAllowed && records.length > 0) {
      const ratio = costCheck.reservedAmount > 0
        ? Math.min(1, costCheck.reservedAmount / Math.max(costCheck.estimatedCost, costCheck.reservedAmount))
        : 0.5;
      const sliceCount = Math.max(1, Math.floor(records.length * ratio));
      return records.slice(0, sliceCount) as T[];
    }

    return records;
  } catch (error) {
    if (tracked) {
      await costGuard.killExpensiveOperation(queryId, 'cypher_error');
    }
    if (!completed) {
      slowQueryKiller.killQuery(queryId, 'exception');
    }
    costGuard.releaseReservation(costCheck.reservationId, 'cypher_error');
    throw error;
  } finally {
    await session.close();
  }
}
