/**
 * Explainer - Generates plain language explanations of Cypher queries
 */

import pino from 'pino';
import type { ExplanationEvidence, QueryExplanation } from './types';

const logger = pino({ name: 'cypher-explainer' });

/**
 * Generate a plain language explanation of what a Cypher query does
 */
export function explainQuery(cypher: string, verbose: boolean = false): string {
  const upperCypher = cypher.toUpperCase();
  const parts: string[] = [];

  // Analyze MATCH clauses
  const matchClauses = extractMatchClauses(cypher);
  if (matchClauses.length > 0) {
    parts.push('This query searches the graph for:');
    matchClauses.forEach((clause, idx) => {
      const explanation = explainMatchClause(clause);
      parts.push(`  ${idx + 1}. ${explanation}`);
    });
  }

  // Analyze WHERE clauses
  const whereExplanation = explainWhereClause(cypher);
  if (whereExplanation) {
    parts.push(`\nFiltering criteria: ${whereExplanation}`);
  }

  // Analyze OPTIONAL MATCH
  const optionalMatches = extractOptionalMatchClauses(cypher);
  if (optionalMatches.length > 0) {
    parts.push('\nOptionally also finding:');
    optionalMatches.forEach((clause) => {
      parts.push(`  - ${explainMatchClause(clause)}`);
    });
  }

  // Analyze path operations
  if (upperCypher.includes('SHORTESTPATH')) {
    parts.push(
      '\nComputes the shortest path between entities using graph traversal algorithm.',
    );
  } else if (upperCypher.includes('ALLSHORTESTPATHS')) {
    parts.push('\nFinds all shortest paths between entities (may return multiple routes).');
  }

  // Analyze variable-length paths
  const pathMatch = cypher.match(/\[\*\.\.(\d+)\]/);
  if (pathMatch) {
    const maxDepth = pathMatch[1];
    parts.push(
      `\nTraverses relationships up to ${maxDepth} hops away from the starting point.`,
    );
  } else if (cypher.includes('[*]')) {
    parts.push('\nTraverses relationships of any length (unbounded traversal).');
  }

  // Analyze aggregations
  const aggregations = extractAggregations(cypher);
  if (aggregations.length > 0) {
    parts.push('\nPerforms aggregation:');
    aggregations.forEach((agg) => {
      parts.push(`  - ${agg}`);
    });
  }

  // Analyze ORDER BY
  const orderByMatch = cypher.match(/ORDER BY\s+([\w\s.,]+?)(?:LIMIT|$)/i);
  if (orderByMatch) {
    const orderFields = orderByMatch[1].trim();
    parts.push(`\nResults are sorted by: ${orderFields}`);
  }

  // Analyze LIMIT
  const limitMatch = cypher.match(/LIMIT\s+(\d+)/i);
  if (limitMatch) {
    const limit = limitMatch[1];
    parts.push(`\nReturns at most ${limit} result(s).`);
  } else if (upperCypher.includes('MATCH')) {
    parts.push('\nReturns all matching results (no limit specified).');
  }

  // Analyze RETURN clause
  const returnExplanation = explainReturnClause(cypher);
  if (returnExplanation) {
    parts.push(`\nReturned data: ${returnExplanation}`);
  }

  // Add verbose details if requested
  if (verbose) {
    parts.push('\n--- Technical Details ---');

    // Parameter usage
    const params = extractParameters(cypher);
    if (params.length > 0) {
      parts.push(`Parameters required: ${params.join(', ')}`);
    }

    // Labels and types
    const labels = extractLabels(cypher);
    if (labels.length > 0) {
      parts.push(`Node labels involved: ${labels.join(', ')}`);
    }

    const relTypes = extractRelationshipTypes(cypher);
    if (relTypes.length > 0) {
      parts.push(`Relationship types: ${relTypes.join(', ')}`);
    }
  }

  return parts.join('\n');
}

/**
 * Build a structured explanation bundle with rationale, evidence, and confidence.
 */
export function buildQueryExplanation(
  cypher: string,
  options: { warnings: string[]; estimatedCost: string; verbose?: boolean },
): QueryExplanation {
  const rationale: string[] = [];
  const evidence: ExplanationEvidence[] = [];

  const matchClauses = extractMatchClauses(cypher);
  matchClauses.forEach((clause, idx) => {
    rationale.push(`Identifying graph pattern ${idx + 1} to satisfy the request.`);
    evidence.push({
      source: 'MATCH clause',
      snippet: clause,
      reason: 'Defines the core entities and relationships to investigate.',
    });
  });

  const where = explainWhereClause(cypher);
  if (where) {
    rationale.push('Applying filters to narrow the candidate set.');
    evidence.push({
      source: 'WHERE clause',
      snippet: where,
      reason: 'Controls scope and protects against unbounded traversal.',
    });
  }

  const returnClause = explainReturnClause(cypher);
  if (returnClause) {
    rationale.push('Selecting outputs relevant to the investigative question.');
    evidence.push({
      source: 'RETURN clause',
      snippet: returnClause,
      reason: 'Specifies which fields will be returned to the analyst.',
    });
  }

  const parameters = extractParameters(cypher);
  if (parameters.length > 0) {
    rationale.push('Parameterizing inputs to keep execution safe and repeatable.');
    evidence.push({
      source: 'Parameters',
      snippet: parameters.join(', '),
      reason: 'Ensures sensitive values are bound safely at execution time.',
    });
  }

  const summary = summarizeQuery(cypher);

  const warningPenalty = Math.min(options.warnings.length * 0.07, 0.35);
  const confidence = Math.max(0.5, 0.92 - warningPenalty);

  return {
    summary,
    rationale,
    evidence,
    confidence: Number(confidence.toFixed(2)),
  };
}

/**
 * Extract MATCH clauses from a Cypher query
 */
function extractMatchClauses(cypher: string): string[] {
  const matchPattern = /MATCH\s+([^\n]+?)(?=WHERE|OPTIONAL|WITH|RETURN|ORDER|LIMIT|$)/gi;
  const matches: string[] = [];

  let match;
  while ((match = matchPattern.exec(cypher)) !== null) {
    matches.push(match[1].trim());
  }

  return matches;
}

/**
 * Extract OPTIONAL MATCH clauses
 */
function extractOptionalMatchClauses(cypher: string): string[] {
  const matchPattern = /OPTIONAL\s+MATCH\s+([^\n]+?)(?=WHERE|OPTIONAL|WITH|RETURN|ORDER|LIMIT|$)/gi;
  const matches: string[] = [];

  let match;
  while ((match = matchPattern.exec(cypher)) !== null) {
    matches.push(match[1].trim());
  }

  return matches;
}

/**
 * Explain a single MATCH clause in plain language
 */
function explainMatchClause(matchClause: string): string {
  // Simple node pattern: (n)
  if (matchClause.match(/^\(\w+\)$/)) {
    return 'Any node in the graph';
  }

  // Node with label: (n:Label)
  const labelMatch = matchClause.match(/\((\w+):(\w+)\)/);
  if (labelMatch) {
    const [, variable, label] = labelMatch;
    return `Nodes labeled as "${label}"`;
  }

  // Relationship pattern: (a)-[r]->(b)
  const relMatch = matchClause.match(/\(\w+\)-\[(\w+):?(\w*)\]->\(\w+\)/);
  if (relMatch) {
    const [, , relType] = relMatch;
    if (relType) {
      return `Nodes connected by "${relType}" relationships`;
    }
    return 'Nodes with any direct relationship';
  }

  // Path pattern: (a)-[*..n]-(b)
  if (matchClause.includes('[*')) {
    return 'Paths of varying length between nodes';
  }

  // Default
  return matchClause.replace(/[()[\]]/g, '');
}

/**
 * Explain WHERE clause conditions
 */
function explainWhereClause(cypher: string): string | null {
  const whereMatch = cypher.match(/WHERE\s+(.*?)(?=RETURN|ORDER|LIMIT|WITH|OPTIONAL|$)/is);
  if (!whereMatch) return null;

  const whereClause = whereMatch[1].trim();
  const conditions: string[] = [];

  // Extract simple conditions
  const andParts = whereClause.split(/\s+AND\s+/i);

  for (const part of andParts) {
    const trimmed = part.trim();

    // ID equality
    if (trimmed.includes('.id =')) {
      conditions.push('matching specific entity IDs');
    }
    // Tenant filtering
    else if (trimmed.includes('.tenantId')) {
      conditions.push('filtered by tenant');
    }
    // Timestamp conditions
    else if (trimmed.includes('timestamp') || trimmed.includes('Time')) {
      conditions.push('within specific time range');
    }
    // Geo-spatial
    else if (trimmed.includes('point.distance')) {
      conditions.push('within geographic radius');
    }
    // Property checks
    else if (trimmed.includes('IS NOT NULL')) {
      conditions.push('having non-null properties');
    }
    // Type filtering
    else if (trimmed.includes('.type')) {
      conditions.push('of specific type');
    }
    // Generic
    else {
      conditions.push('meeting additional criteria');
    }
  }

  return conditions.join(', ');
}

/**
 * Extract aggregation operations
 */
function extractAggregations(cypher: string): string[] {
  const aggregations: string[] = [];

  if (cypher.match(/\bCOUNT\s*\(/i)) {
    aggregations.push('Counting results');
  }
  if (cypher.match(/\bSUM\s*\(/i)) {
    aggregations.push('Summing values');
  }
  if (cypher.match(/\bAVG\s*\(/i)) {
    aggregations.push('Calculating average');
  }
  if (cypher.match(/\bMAX\s*\(/i)) {
    aggregations.push('Finding maximum value');
  }
  if (cypher.match(/\bMIN\s*\(/i)) {
    aggregations.push('Finding minimum value');
  }
  if (cypher.match(/\bCOLLECT\s*\(/i)) {
    aggregations.push('Collecting results into lists');
  }

  return aggregations;
}

/**
 * Explain RETURN clause
 */
function explainReturnClause(cypher: string): string | null {
  const returnMatch = cypher.match(/RETURN\s+(.*?)(?=ORDER|LIMIT|$)/is);
  if (!returnMatch) return null;

  const returnClause = returnMatch[1].trim();
  const items: string[] = [];

  // Parse return items
  const returnItems = returnClause.split(',').map((s) => s.trim());

  for (const item of returnItems) {
    // Full nodes/relationships
    if (item.match(/^\w+$/) && !item.includes('(')) {
      items.push(`entity "${item}"`);
    }
    // Aggregations
    else if (item.includes('count(')) {
      items.push('count of results');
    } else if (item.includes('collect(')) {
      items.push('collected list');
    }
    // Properties
    else if (item.includes('.')) {
      const propMatch = item.match(/\.(\w+)/);
      if (propMatch) {
        items.push(`property "${propMatch[1]}"`);
      }
    }
    // Aliased items
    else if (item.includes(' AS ')) {
      const aliasMatch = item.match(/AS\s+(\w+)/i);
      if (aliasMatch) {
        items.push(`"${aliasMatch[1]}"`);
      }
    }
    // Functions
    else if (item.includes('(') && item.includes(')')) {
      items.push('computed value');
    }
  }

  if (items.length === 0) return null;
  return items.join(', ');
}

/**
 * Extract parameter names
 */
function extractParameters(cypher: string): string[] {
  const paramPattern = /\$(\w+)/g;
  const params = new Set<string>();

  let match;
  while ((match = paramPattern.exec(cypher)) !== null) {
    params.add(`$${match[1]}`);
  }

  return Array.from(params);
}

/**
 * Extract node labels
 */
function extractLabels(cypher: string): string[] {
  const labelPattern = /\(\w+:(\w+)(?:\{|[\s\)])]/g;
  const labels = new Set<string>();

  let match;
  while ((match = labelPattern.exec(cypher)) !== null) {
    labels.add(match[1]);
  }

  return Array.from(labels);
}

/**
 * Extract relationship types
 */
function extractRelationshipTypes(cypher: string): string[] {
  const relPattern = /\[\w*:(\w+)(?:\*|\])/g;
  const types = new Set<string>();

  let match;
  while ((match = relPattern.exec(cypher)) !== null) {
    types.add(match[1]);
  }

  return Array.from(types);
}

/**
 * Generate a concise one-line summary
 */
export function summarizeQuery(cypher: string): string {
  const upperCypher = cypher.toUpperCase();

  if (upperCypher.includes('COUNT')) {
    return 'Counts matching entities in the graph';
  }

  if (upperCypher.includes('SHORTESTPATH')) {
    return 'Finds shortest path between two entities';
  }

  if (upperCypher.includes('ALLSHORTESTPATHS')) {
    return 'Finds all shortest paths between two entities';
  }

  if (upperCypher.includes('[*')) {
    return 'Traverses multi-hop relationships in the graph';
  }

  const matchCount = (cypher.match(/MATCH/gi) || []).length;
  if (matchCount > 1) {
    return 'Finds patterns matching multiple graph structures';
  }

  const limitMatch = cypher.match(/LIMIT\s+(\d+)/i);
  if (limitMatch) {
    return `Retrieves up to ${limitMatch[1]} matching entities`;
  }

  return 'Queries the graph for matching entities';
}
