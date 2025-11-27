/**
 * Cypher Query Generator
 *
 * Generates Neo4j Cypher queries from graph motif specifications.
 * Used by the pattern evaluation system to execute pattern matches against the graph database.
 */

import type {
  GraphMotif,
  NodeConstraint,
  EdgeConstraint,
  TimeConstraint,
} from '../types.js';

export interface CypherQuery {
  query: string;
  parameters: Record<string, unknown>;
}

export interface CypherGenerationOptions {
  tenantId?: string;
  maxResults?: number;
  includeTimestamps?: boolean;
  returnFormat?: 'nodes' | 'paths' | 'count' | 'full';
}

/**
 * Generates a Cypher node match clause from a NodeConstraint
 */
function generateNodeMatch(node: NodeConstraint, alias: string): string {
  const labels = [node.type];
  let clause = `(${alias}:${labels.join(':')})`;

  return clause;
}

/**
 * Generates Cypher WHERE conditions for a NodeConstraint
 */
function generateNodeConditions(
  node: NodeConstraint,
  alias: string
): { conditions: string[]; params: Record<string, unknown> } {
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  // Required properties check
  if (node.requiredProperties && node.requiredProperties.length > 0) {
    for (const prop of node.requiredProperties) {
      conditions.push(`${alias}.${prop} IS NOT NULL`);
    }
  }

  // Property filters
  if (node.propertyFilters && node.propertyFilters.length > 0) {
    for (let i = 0; i < node.propertyFilters.length; i++) {
      const filter = node.propertyFilters[i];
      const paramName = `${alias}_filter_${i}`;

      switch (filter.operator) {
        case 'EQUALS':
          conditions.push(`${alias}.${filter.property} = $${paramName}`);
          params[paramName] = filter.value;
          break;
        case 'NOT_EQUALS':
          conditions.push(`${alias}.${filter.property} <> $${paramName}`);
          params[paramName] = filter.value;
          break;
        case 'CONTAINS':
          conditions.push(`${alias}.${filter.property} CONTAINS $${paramName}`);
          params[paramName] = filter.value;
          break;
        case 'STARTS_WITH':
          conditions.push(
            `${alias}.${filter.property} STARTS WITH $${paramName}`
          );
          params[paramName] = filter.value;
          break;
        case 'ENDS_WITH':
          conditions.push(`${alias}.${filter.property} ENDS WITH $${paramName}`);
          params[paramName] = filter.value;
          break;
        case 'REGEX':
          conditions.push(`${alias}.${filter.property} =~ $${paramName}`);
          params[paramName] = filter.value;
          break;
        case 'GREATER_THAN':
          conditions.push(`${alias}.${filter.property} > $${paramName}`);
          params[paramName] = filter.value;
          break;
        case 'LESS_THAN':
          conditions.push(`${alias}.${filter.property} < $${paramName}`);
          params[paramName] = filter.value;
          break;
        case 'IN':
          conditions.push(`${alias}.${filter.property} IN $${paramName}`);
          params[paramName] = filter.value;
          break;
        case 'NOT_IN':
          conditions.push(`NOT ${alias}.${filter.property} IN $${paramName}`);
          params[paramName] = filter.value;
          break;
      }
    }
  }

  // Static properties
  if (node.properties) {
    Object.entries(node.properties).forEach(([key, value], i) => {
      const paramName = `${alias}_prop_${i}`;
      conditions.push(`${alias}.${key} = $${paramName}`);
      params[paramName] = value;
    });
  }

  return { conditions, params };
}

/**
 * Generates a Cypher relationship pattern from an EdgeConstraint
 */
function generateEdgePattern(
  edge: EdgeConstraint,
  sourceAlias: string,
  targetAlias: string,
  edgeAlias: string
): string {
  const relType = edge.type;
  const hops =
    edge.minHops || edge.maxHops
      ? `*${edge.minHops || 1}..${edge.maxHops || ''}`
      : '';

  let pattern: string;
  switch (edge.direction) {
    case 'INCOMING':
      pattern = `(${sourceAlias})<-[${edgeAlias}:${relType}${hops}]-(${targetAlias})`;
      break;
    case 'BOTH':
      pattern = `(${sourceAlias})-[${edgeAlias}:${relType}${hops}]-(${targetAlias})`;
      break;
    case 'OUTGOING':
    default:
      pattern = `(${sourceAlias})-[${edgeAlias}:${relType}${hops}]->(${targetAlias})`;
      break;
  }

  return pattern;
}

/**
 * Generates Cypher WHERE conditions for an EdgeConstraint
 */
function generateEdgeConditions(
  edge: EdgeConstraint,
  alias: string
): { conditions: string[]; params: Record<string, unknown> } {
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (edge.propertyFilters && edge.propertyFilters.length > 0) {
    for (let i = 0; i < edge.propertyFilters.length; i++) {
      const filter = edge.propertyFilters[i];
      const paramName = `${alias}_filter_${i}`;

      switch (filter.operator) {
        case 'EQUALS':
          conditions.push(`${alias}.${filter.property} = $${paramName}`);
          params[paramName] = filter.value;
          break;
        case 'NOT_EQUALS':
          conditions.push(`${alias}.${filter.property} <> $${paramName}`);
          params[paramName] = filter.value;
          break;
        case 'CONTAINS':
          conditions.push(`${alias}.${filter.property} CONTAINS $${paramName}`);
          params[paramName] = filter.value;
          break;
        case 'GREATER_THAN':
          conditions.push(`${alias}.${filter.property} > $${paramName}`);
          params[paramName] = filter.value;
          break;
        case 'LESS_THAN':
          conditions.push(`${alias}.${filter.property} < $${paramName}`);
          params[paramName] = filter.value;
          break;
        case 'IN':
          conditions.push(`${alias}.${filter.property} IN $${paramName}`);
          params[paramName] = filter.value;
          break;
      }
    }
  }

  if (edge.properties) {
    Object.entries(edge.properties).forEach(([key, value], i) => {
      const paramName = `${alias}_prop_${i}`;
      conditions.push(`${alias}.${key} = $${paramName}`);
      params[paramName] = value;
    });
  }

  return { conditions, params };
}

/**
 * Generates time constraint conditions
 */
function generateTimeConstraintConditions(
  constraint: TimeConstraint,
  nodeAliases: Map<string, string>
): { conditions: string[]; params: Record<string, unknown> } {
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  switch (constraint.operator) {
    case 'WITHIN':
      if (constraint.referenceNodeId && constraint.targetNodeId) {
        const refAlias = nodeAliases.get(constraint.referenceNodeId);
        const targetAlias = nodeAliases.get(constraint.targetNodeId);
        if (refAlias && targetAlias && constraint.durationMs) {
          conditions.push(
            `abs(duration.between(${refAlias}.timestamp, ${targetAlias}.timestamp).milliseconds) <= $within_duration`
          );
          params.within_duration = constraint.durationMs;
        }
      }
      break;
    case 'AFTER':
      if (constraint.referenceNodeId && constraint.targetNodeId) {
        const refAlias = nodeAliases.get(constraint.referenceNodeId);
        const targetAlias = nodeAliases.get(constraint.targetNodeId);
        if (refAlias && targetAlias) {
          conditions.push(`${targetAlias}.timestamp > ${refAlias}.timestamp`);
        }
      }
      break;
    case 'BEFORE':
      if (constraint.referenceNodeId && constraint.targetNodeId) {
        const refAlias = nodeAliases.get(constraint.referenceNodeId);
        const targetAlias = nodeAliases.get(constraint.targetNodeId);
        if (refAlias && targetAlias) {
          conditions.push(`${targetAlias}.timestamp < ${refAlias}.timestamp`);
        }
      }
      break;
    case 'BETWEEN':
      if (constraint.startTime && constraint.endTime && constraint.targetNodeId) {
        const targetAlias = nodeAliases.get(constraint.targetNodeId);
        if (targetAlias) {
          conditions.push(
            `${targetAlias}.timestamp >= datetime($between_start) AND ${targetAlias}.timestamp <= datetime($between_end)`
          );
          params.between_start = constraint.startTime;
          params.between_end = constraint.endTime;
        }
      }
      break;
    case 'SEQUENCE':
      if (constraint.sequence && constraint.sequence.length > 1) {
        for (let i = 0; i < constraint.sequence.length - 1; i++) {
          const currentAlias = nodeAliases.get(constraint.sequence[i]);
          const nextAlias = nodeAliases.get(constraint.sequence[i + 1]);
          if (currentAlias && nextAlias) {
            conditions.push(
              `${currentAlias}.timestamp < ${nextAlias}.timestamp`
            );
          }
        }
      }
      break;
  }

  return { conditions, params };
}

/**
 * Main function to generate a complete Cypher query from a GraphMotif
 */
export function generateCypherFromMotif(
  motif: GraphMotif,
  options: CypherGenerationOptions = {}
): CypherQuery {
  const params: Record<string, unknown> = {};
  const conditions: string[] = [];
  const nodeAliases = new Map<string, string>();

  // Create aliases for each node
  motif.nodes.forEach((node, index) => {
    const alias = `n${index}`;
    nodeAliases.set(node.id, alias);
  });

  // Build MATCH clauses
  const matchClauses: string[] = [];

  // First, add all nodes
  motif.nodes.forEach((node) => {
    const alias = nodeAliases.get(node.id)!;
    matchClauses.push(`MATCH ${generateNodeMatch(node, alias)}`);

    // Add node conditions
    const nodeConditions = generateNodeConditions(node, alias);
    conditions.push(...nodeConditions.conditions);
    Object.assign(params, nodeConditions.params);
  });

  // Add tenant isolation if provided
  if (options.tenantId) {
    params.tenantId = options.tenantId;
    motif.nodes.forEach((node) => {
      const alias = nodeAliases.get(node.id)!;
      conditions.push(`${alias}.tenantId = $tenantId`);
    });
  }

  // Build relationship patterns
  motif.edges.forEach((edge, index) => {
    const sourceAlias = nodeAliases.get(edge.sourceNodeId);
    const targetAlias = nodeAliases.get(edge.targetNodeId);
    const edgeAlias = `r${index}`;

    if (sourceAlias && targetAlias) {
      matchClauses.push(
        `MATCH ${generateEdgePattern(edge, sourceAlias, targetAlias, edgeAlias)}`
      );

      // Add edge conditions
      const edgeConditions = generateEdgeConditions(edge, edgeAlias);
      conditions.push(...edgeConditions.conditions);
      Object.assign(params, edgeConditions.params);
    }
  });

  // Add time constraints
  if (motif.timeConstraints && motif.timeConstraints.length > 0) {
    for (const timeConstraint of motif.timeConstraints) {
      const timeConditions = generateTimeConstraintConditions(
        timeConstraint,
        nodeAliases
      );
      conditions.push(...timeConditions.conditions);
      Object.assign(params, timeConditions.params);
    }
  }

  // Add spatial constraints
  if (motif.spatialConstraints) {
    if (
      motif.spatialConstraints.sameLocation &&
      motif.spatialConstraints.sameLocation.length > 1
    ) {
      const locationNodes = motif.spatialConstraints.sameLocation.map((id) =>
        nodeAliases.get(id)
      );
      for (let i = 0; i < locationNodes.length - 1; i++) {
        if (locationNodes[i] && locationNodes[i + 1]) {
          conditions.push(
            `${locationNodes[i]}.location = ${locationNodes[i + 1]}.location`
          );
        }
      }
    }
  }

  // Build WHERE clause
  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Build RETURN clause based on format
  let returnClause: string;
  switch (options.returnFormat) {
    case 'count':
      returnClause = 'RETURN count(*) AS matchCount';
      break;
    case 'paths':
      const pathNodes = Array.from(nodeAliases.values()).join(', ');
      const pathEdges = motif.edges.map((_, i) => `r${i}`).join(', ');
      returnClause = `RETURN ${pathNodes}, ${pathEdges}`;
      break;
    case 'nodes':
      returnClause = `RETURN ${Array.from(nodeAliases.values()).join(', ')}`;
      break;
    case 'full':
    default:
      const allNodes = Array.from(nodeAliases.entries())
        .map(([logicalId, alias]) => `${alias} AS ${logicalId}`)
        .join(', ');
      const allEdges = motif.edges.map((e, i) => `r${i} AS edge_${i}`).join(', ');
      returnClause = `RETURN ${allNodes}${allEdges ? ', ' + allEdges : ''}`;
      break;
  }

  // Add LIMIT if specified
  const limitClause = options.maxResults
    ? `LIMIT ${options.maxResults}`
    : 'LIMIT 100';

  // Combine all parts
  const query = [matchClauses.join('\n'), whereClause, returnClause, limitClause]
    .filter(Boolean)
    .join('\n');

  return { query, parameters: params };
}

/**
 * Generates multiple Cypher queries for complex pattern matching
 * that may require multiple passes
 */
export function generatePatternQueries(
  motif: GraphMotif,
  options: CypherGenerationOptions = {}
): CypherQuery[] {
  const queries: CypherQuery[] = [];

  // Main pattern query
  queries.push(generateCypherFromMotif(motif, { ...options, returnFormat: 'full' }));

  // Count query for statistics
  queries.push(
    generateCypherFromMotif(motif, { ...options, returnFormat: 'count' })
  );

  // If there are aggregations, generate separate queries
  if (motif.aggregations && motif.aggregations.length > 0) {
    for (const agg of motif.aggregations) {
      const nodeAliases = new Map<string, string>();
      motif.nodes.forEach((node, index) => {
        nodeAliases.set(node.id, `n${index}`);
      });

      const alias = nodeAliases.get(agg.nodeId);
      if (alias) {
        const aggQuery = generateCypherFromMotif(motif, {
          ...options,
          returnFormat: 'nodes',
        });

        // Modify the return clause for aggregation
        const aggFunction = agg.function;
        const property = agg.property;
        const returnClause =
          aggFunction === 'DISTINCT'
            ? `RETURN DISTINCT ${alias}.${property} AS value`
            : `RETURN ${aggFunction}(${alias}.${property}) AS value`;

        aggQuery.query = aggQuery.query.replace(/RETURN.*$/m, returnClause);

        if (agg.threshold !== undefined) {
          aggQuery.query += `\nHAVING value >= ${agg.threshold}`;
        }

        queries.push(aggQuery);
      }
    }
  }

  return queries;
}

/**
 * Validates a Cypher query syntax (basic validation)
 */
export function validateCypherQuery(query: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for required clauses
  if (!query.includes('MATCH')) {
    errors.push('Query must contain at least one MATCH clause');
  }

  if (!query.includes('RETURN')) {
    errors.push('Query must contain a RETURN clause');
  }

  // Check for balanced parentheses
  const openParens = (query.match(/\(/g) || []).length;
  const closeParens = (query.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    errors.push('Unbalanced parentheses in query');
  }

  // Check for balanced brackets
  const openBrackets = (query.match(/\[/g) || []).length;
  const closeBrackets = (query.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    errors.push('Unbalanced brackets in query');
  }

  // Check for common syntax issues
  if (query.includes('MATCH()')) {
    errors.push('Empty MATCH pattern');
  }

  return { valid: errors.length === 0, errors };
}
