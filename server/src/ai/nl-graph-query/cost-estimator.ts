/**
 * Cost Estimator - Analyzes Cypher queries to estimate execution cost
 *
 * Uses static analysis to estimate:
 * - Number of nodes scanned
 * - Number of edges scanned
 * - Execution time
 * - Memory usage
 */

import type { CostEstimate } from './types';
import pino from 'pino';

const logger = pino({ name: 'cost-estimator' });

/**
 * Estimate the cost of executing a Cypher query
 */
export function estimateQueryCost(cypher: string): CostEstimate {
  const upperCypher = cypher.toUpperCase();
  const costDrivers: string[] = [];

  // Base estimates
  let nodesScanned = 100;
  let edgesScanned = 50;
  let estimatedTimeMs = 50;
  let estimatedMemoryMb = 10;

  // Analyze MATCH patterns
  const matchCount = (cypher.match(/MATCH/gi) || []).length;
  if (matchCount > 1) {
    nodesScanned *= Math.pow(10, matchCount - 1);
    edgesScanned *= Math.pow(5, matchCount - 1);
    costDrivers.push(`Multiple MATCH clauses (${matchCount}) may create cartesian product`);
  }

  // Variable-length paths are expensive
  if (cypher.includes('[*')) {
    const pathMatch = cypher.match(/\[\*\.\.(\d+)\]/);
    const maxDepth = pathMatch ? parseInt(pathMatch[1], 10) : 5;

    nodesScanned *= Math.pow(10, Math.min(maxDepth, 3));
    edgesScanned *= Math.pow(10, Math.min(maxDepth, 3));
    estimatedTimeMs *= Math.pow(5, Math.min(maxDepth, 3));
    estimatedMemoryMb *= Math.pow(2, Math.min(maxDepth, 3));

    costDrivers.push(
      `Variable-length path with max depth ${maxDepth} is exponentially expensive`,
    );
  }

  // allShortestPaths is very expensive
  if (upperCypher.includes('ALLSHORTESTPATHS')) {
    nodesScanned *= 100;
    edgesScanned *= 100;
    estimatedTimeMs *= 50;
    estimatedMemoryMb *= 20;
    costDrivers.push('allShortestPaths explores many possible routes');
  }

  // shortestPath is moderately expensive
  if (upperCypher.includes('SHORTESTPATH') && !upperCypher.includes('ALLSHORTESTPATHS')) {
    nodesScanned *= 10;
    edgesScanned *= 10;
    estimatedTimeMs *= 5;
    estimatedMemoryMb *= 3;
    costDrivers.push('shortestPath requires path exploration');
  }

  // Check for WHERE clauses (filtering reduces cost)
  const hasWhere = upperCypher.includes('WHERE');
  if (!hasWhere && upperCypher.includes('MATCH')) {
    nodesScanned *= 2;
    edgesScanned *= 2;
    costDrivers.push('No WHERE clause - query may scan all data');
  } else if (hasWhere) {
    // Check for indexed properties (reduces cost)
    if (cypher.includes('.id =') || cypher.includes('.id IN')) {
      nodesScanned = Math.floor(nodesScanned * 0.01);
      edgesScanned = Math.floor(edgesScanned * 0.1);
      costDrivers.push('Query uses indexed ID property (efficient)');
    } else if (cypher.includes('.tenantId =')) {
      nodesScanned = Math.floor(nodesScanned * 0.1);
      edgesScanned = Math.floor(edgesScanned * 0.2);
      costDrivers.push('Query filters by tenantId (good partitioning)');
    }
  }

  // Check for LIMIT clause (reduces returned data)
  const limitMatch = cypher.match(/LIMIT\s+(\d+)/i);
  if (limitMatch) {
    const limit = parseInt(limitMatch[1], 10);
    if (limit <= 25) {
      estimatedTimeMs = Math.floor(estimatedTimeMs * 0.8);
      estimatedMemoryMb = Math.floor(estimatedMemoryMb * 0.5);
    }
    // LIMIT doesn't reduce scanned nodes, only returned ones
  } else {
    costDrivers.push('No LIMIT clause - may return large result set');
    estimatedMemoryMb *= 2;
  }

  // ORDER BY requires sorting (increases cost)
  if (upperCypher.includes('ORDER BY')) {
    estimatedTimeMs *= 1.5;
    estimatedMemoryMb *= 1.5;
    costDrivers.push('ORDER BY requires sorting results');
  }

  // Aggregations (COUNT, SUM, etc.)
  if (upperCypher.match(/\b(COUNT|SUM|AVG|MAX|MIN|COLLECT)\s*\(/)) {
    estimatedTimeMs *= 1.2;
    estimatedMemoryMb *= 1.3;
    costDrivers.push('Aggregation requires processing all matched data');
  }

  // OPTIONAL MATCH adds cost
  const optionalMatchCount = (cypher.match(/OPTIONAL MATCH/gi) || []).length;
  if (optionalMatchCount > 0) {
    nodesScanned *= 1 + optionalMatchCount * 0.5;
    edgesScanned *= 1 + optionalMatchCount * 0.5;
    costDrivers.push(`${optionalMatchCount} OPTIONAL MATCH clause(s) adds nullable paths`);
  }

  // UNWIND can multiply results
  if (upperCypher.includes('UNWIND')) {
    nodesScanned *= 2;
    estimatedMemoryMb *= 2;
    costDrivers.push('UNWIND may expand result set significantly');
  }

  // Pattern comprehensions
  if (cypher.includes('[') && cypher.includes('|') && cypher.includes(']')) {
    estimatedTimeMs *= 1.3;
    estimatedMemoryMb *= 1.5;
    costDrivers.push('Pattern comprehension requires nested iteration');
  }

  // Geo-spatial operations (point.distance)
  if (cypher.includes('point.distance')) {
    estimatedTimeMs *= 3;
    costDrivers.push('Geo-spatial distance calculation is computationally intensive');
  }

  // Calculate final cost class
  let costClass: CostEstimate['costClass'] = 'low';

  if (nodesScanned > 10000 || edgesScanned > 5000 || estimatedTimeMs > 1000) {
    costClass = 'very-high';
  } else if (nodesScanned > 1000 || edgesScanned > 500 || estimatedTimeMs > 500) {
    costClass = 'high';
  } else if (nodesScanned > 100 || edgesScanned > 50 || estimatedTimeMs > 100) {
    costClass = 'medium';
  }

  // Cap estimates at reasonable maximums
  nodesScanned = Math.min(nodesScanned, 10000000);
  edgesScanned = Math.min(edgesScanned, 10000000);
  estimatedTimeMs = Math.min(estimatedTimeMs, 60000);
  estimatedMemoryMb = Math.min(estimatedMemoryMb, 1024);

  logger.debug(
    {
      nodesScanned,
      edgesScanned,
      costClass,
      estimatedTimeMs,
      costDrivers,
    },
    'Cost estimation completed',
  );

  return {
    nodesScanned: Math.floor(nodesScanned),
    edgesScanned: Math.floor(edgesScanned),
    costClass,
    estimatedTimeMs: Math.floor(estimatedTimeMs),
    estimatedMemoryMb: Math.floor(estimatedMemoryMb),
    costDrivers,
  };
}

/**
 * Check if a query is safe to execute based on cost
 */
export function isSafeToExecute(cost: CostEstimate): boolean {
  // Very high cost queries should require explicit approval
  if (cost.costClass === 'very-high') {
    return false;
  }

  // High cost queries with extreme estimates should also be blocked
  if (
    cost.costClass === 'high' &&
    (cost.estimatedTimeMs > 10000 || cost.nodesScanned > 50000)
  ) {
    return false;
  }

  return true;
}

/**
 * Generate cost warnings based on the estimate
 */
export function generateCostWarnings(cost: CostEstimate): string[] {
  const warnings: string[] = [];

  if (cost.costClass === 'very-high') {
    warnings.push(
      'This query has very high estimated cost and may timeout or consume excessive resources',
    );
  } else if (cost.costClass === 'high') {
    warnings.push(
      'This query has high estimated cost and may take several seconds to execute',
    );
  }

  if (cost.nodesScanned > 10000) {
    warnings.push(
      `Estimated to scan ${cost.nodesScanned.toLocaleString()} nodes - consider adding more specific filters`,
    );
  }

  if (cost.edgesScanned > 5000) {
    warnings.push(
      `Estimated to scan ${cost.edgesScanned.toLocaleString()} relationships - consider limiting path depth`,
    );
  }

  if (cost.estimatedMemoryMb > 500) {
    warnings.push(
      `High memory usage estimated (${cost.estimatedMemoryMb}MB) - results may be truncated`,
    );
  }

  if (cost.estimatedTimeMs > 5000) {
    warnings.push(
      `Long execution time estimated (${(cost.estimatedTimeMs / 1000).toFixed(1)}s) - consider optimizing`,
    );
  }

  return warnings;
}
