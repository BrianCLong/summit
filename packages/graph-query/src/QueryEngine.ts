/**
 * Graph Query Engine
 * Unified query interface supporting multiple query languages
 */

import type { GraphStorage } from '@intelgraph/graph-database';
import type { Node, Edge, Path } from '@intelgraph/graph-database';

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  stats: {
    nodesCreated?: number;
    nodesDeleted?: number;
    edgesCreated?: number;
    edgesDeleted?: number;
    propertiesSet?: number;
    executionTime: number;
  };
}

export interface QueryPlan {
  steps: QueryStep[];
  estimatedCost: number;
  estimatedRows: number;
}

export interface QueryStep {
  type: 'scan' | 'filter' | 'expand' | 'aggregate' | 'sort' | 'limit';
  description: string;
  estimatedCost: number;
}

export class QueryEngine {
  constructor(private storage: GraphStorage) {}

  /**
   * Execute a Cypher-like query
   */
  executeCypher(query: string): QueryResult {
    const startTime = Date.now();
    const parsed = this.parseCypher(query);
    const result = this.executeParsedQuery(parsed);

    return {
      ...result,
      stats: {
        ...result.stats,
        executionTime: Date.now() - startTime
      }
    };
  }

  /**
   * Execute a Gremlin-like traversal query
   */
  executeGremlin(traversal: GremlinTraversal): QueryResult {
    const startTime = Date.now();
    const result = this.executeTraversal(traversal);

    return {
      columns: ['result'],
      rows: result.map(r => [r]),
      stats: {
        executionTime: Date.now() - startTime
      }
    };
  }

  /**
   * Execute a SPARQL-like query for RDF triple patterns
   */
  executeSPARQL(query: string): QueryResult {
    const startTime = Date.now();
    const parsed = this.parseSPARQL(query);
    const result = this.executeTriplePattern(parsed);

    return {
      ...result,
      stats: {
        executionTime: Date.now() - startTime
      }
    };
  }

  /**
   * Generate query execution plan
   */
  explain(query: string, language: 'cypher' | 'gremlin' | 'sparql' = 'cypher'): QueryPlan {
    switch (language) {
      case 'cypher':
        return this.explainCypher(query);
      case 'gremlin':
        return this.explainGremlin(query);
      case 'sparql':
        return this.explainSPARQL(query);
    }
  }

  // ==================== Cypher Implementation ====================

  private parseCypher(query: string): CypherQuery {
    // Simplified Cypher parser
    const normalized = query.trim().toLowerCase();

    // MATCH pattern
    const matchRegex = /match\s+(.+?)(?:where|return|$)/i;
    const matchMatch = normalized.match(matchRegex);

    // WHERE clause
    const whereRegex = /where\s+(.+?)(?:return|$)/i;
    const whereMatch = normalized.match(whereRegex);

    // RETURN clause
    const returnRegex = /return\s+(.+?)(?:order by|limit|$)/i;
    const returnMatch = normalized.match(returnRegex);

    // ORDER BY
    const orderByRegex = /order by\s+(.+?)(?:limit|$)/i;
    const orderByMatch = normalized.match(orderByRegex);

    // LIMIT
    const limitRegex = /limit\s+(\d+)/i;
    const limitMatch = normalized.match(limitRegex);

    return {
      match: matchMatch ? this.parseMatchPattern(matchMatch[1]) : [],
      where: whereMatch ? this.parseWhereClause(whereMatch[1]) : [],
      return: returnMatch ? this.parseReturnClause(returnMatch[1]) : [],
      orderBy: orderByMatch ? this.parseOrderBy(orderByMatch[1]) : [],
      limit: limitMatch ? parseInt(limitMatch[1]) : undefined
    };
  }

  private parseMatchPattern(pattern: string): MatchPattern[] {
    const patterns: MatchPattern[] = [];

    // Simple pattern: (n:Label)-[r:TYPE]->(m:Label)
    const nodeEdgePattern = /\((\w+):?(\w*)\)\s*-\[(\w+):?(\w*)\]->\s*\((\w+):?(\w*)\)/g;
    let match;

    while ((match = nodeEdgePattern.exec(pattern)) !== null) {
      patterns.push({
        sourceNode: { var: match[1], label: match[2] || undefined },
        edge: { var: match[3], type: match[4] || undefined },
        targetNode: { var: match[5], label: match[6] || undefined }
      });
    }

    // Simple node pattern: (n:Label)
    const nodePattern = /\((\w+):?(\w*)\)/g;
    while ((match = nodePattern.exec(pattern)) !== null) {
      if (!patterns.some(p =>
        p.sourceNode.var === match[1] || p.targetNode?.var === match[1]
      )) {
        patterns.push({
          sourceNode: { var: match[1], label: match[2] || undefined }
        });
      }
    }

    return patterns;
  }

  private parseWhereClause(clause: string): WhereCondition[] {
    const conditions: WhereCondition[] = [];

    // Simple conditions: n.property = value
    const conditionPattern = /(\w+)\.(\w+)\s*(=|>|<|>=|<=|!=)\s*([^\s]+)/g;
    let match;

    while ((match = conditionPattern.exec(clause)) !== null) {
      conditions.push({
        var: match[1],
        property: match[2],
        operator: match[3] as ComparisonOperator,
        value: this.parseValue(match[4])
      });
    }

    return conditions;
  }

  private parseReturnClause(clause: string): ReturnItem[] {
    return clause.split(',').map(item => {
      const trimmed = item.trim();
      const asMatch = trimmed.match(/(.+)\s+as\s+(\w+)/i);

      if (asMatch) {
        return { expression: asMatch[1].trim(), alias: asMatch[2] };
      }

      return { expression: trimmed };
    });
  }

  private parseOrderBy(clause: string): OrderByItem[] {
    return clause.split(',').map(item => {
      const trimmed = item.trim();
      const descMatch = trimmed.match(/(.+)\s+(desc|asc)/i);

      if (descMatch) {
        return {
          expression: descMatch[1].trim(),
          direction: descMatch[2].toLowerCase() as 'asc' | 'desc'
        };
      }

      return { expression: trimmed, direction: 'asc' };
    });
  }

  private parseValue(value: string): unknown {
    // Try to parse as number
    if (!isNaN(Number(value))) {
      return Number(value);
    }

    // Remove quotes from strings
    if ((value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"'))) {
      return value.slice(1, -1);
    }

    // Boolean
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;

    return value;
  }

  private executeParsedQuery(query: CypherQuery): Omit<QueryResult, 'stats'> {
    const bindings: Map<string, Node | Edge>[] = [];

    // Start with all nodes if no specific pattern
    if (query.match.length === 0) {
      return { columns: [], rows: [] };
    }

    // Execute match patterns
    for (const pattern of query.match) {
      const newBindings = this.executeMatchPattern(pattern, bindings);
      bindings.push(...newBindings);
    }

    // Apply WHERE filters
    let filteredBindings = bindings;
    if (query.where.length > 0) {
      filteredBindings = bindings.filter(binding =>
        query.where.every(condition => this.evaluateCondition(condition, binding))
      );
    }

    // Apply ORDER BY
    if (query.orderBy.length > 0) {
      filteredBindings = this.applyOrderBy(filteredBindings, query.orderBy);
    }

    // Apply LIMIT
    if (query.limit !== undefined) {
      filteredBindings = filteredBindings.slice(0, query.limit);
    }

    // Project results
    const columns = query.return.map(r => r.alias || r.expression);
    const rows = filteredBindings.map(binding =>
      query.return.map(r => this.evaluateExpression(r.expression, binding))
    );

    return { columns, rows };
  }

  private executeMatchPattern(
    pattern: MatchPattern,
    existingBindings: Map<string, Node | Edge>[]
  ): Map<string, Node | Edge>[] {
    const results: Map<string, Node | Edge>[] = [];

    // If no existing bindings, start fresh
    if (existingBindings.length === 0) {
      existingBindings = [new Map()];
    }

    for (const binding of existingBindings) {
      // Get source nodes
      let sourceNodes: Node[] = [];

      if (binding.has(pattern.sourceNode.var)) {
        const bound = binding.get(pattern.sourceNode.var);
        if (this.isNode(bound)) {
          sourceNodes = [bound];
        }
      } else if (pattern.sourceNode.label) {
        sourceNodes = this.storage.getNodesByLabel(pattern.sourceNode.label);
      } else {
        // All nodes
        const stats = this.storage.getStats();
        // For large graphs, this should be optimized
        sourceNodes = [];
      }

      // If pattern has edge, expand to connected nodes
      if (pattern.edge && pattern.targetNode) {
        for (const sourceNode of sourceNodes) {
          const edges = this.storage.getOutgoingEdges(sourceNode.id);

          for (const edge of edges) {
            if (pattern.edge.type && edge.type !== pattern.edge.type) {
              continue;
            }

            const targetNode = this.storage.getNode(edge.targetId);
            if (!targetNode) continue;

            if (pattern.targetNode.label &&
                !targetNode.labels.includes(pattern.targetNode.label)) {
              continue;
            }

            const newBinding = new Map(binding);
            newBinding.set(pattern.sourceNode.var, sourceNode);
            newBinding.set(pattern.edge.var, edge);
            newBinding.set(pattern.targetNode.var, targetNode);

            results.push(newBinding);
          }
        }
      } else {
        // Just bind source nodes
        for (const sourceNode of sourceNodes) {
          const newBinding = new Map(binding);
          newBinding.set(pattern.sourceNode.var, sourceNode);
          results.push(newBinding);
        }
      }
    }

    return results;
  }

  private evaluateCondition(condition: WhereCondition, binding: Map<string, Node | Edge>): boolean {
    const entity = binding.get(condition.var);
    if (!entity) return false;

    const value = this.isNode(entity) || this.isEdge(entity)
      ? entity.properties[condition.property]
      : undefined;

    if (value === undefined) return false;

    switch (condition.operator) {
      case '=': return value === condition.value;
      case '!=': return value !== condition.value;
      case '>': return value > condition.value;
      case '<': return value < condition.value;
      case '>=': return value >= condition.value;
      case '<=': return value <= condition.value;
      default: return false;
    }
  }

  private applyOrderBy(
    bindings: Map<string, Node | Edge>[],
    orderBy: OrderByItem[]
  ): Map<string, Node | Edge>[] {
    return bindings.sort((a, b) => {
      for (const order of orderBy) {
        const aVal = this.evaluateExpression(order.expression, a);
        const bVal = this.evaluateExpression(order.expression, b);

        if (aVal < bVal) return order.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return order.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  private evaluateExpression(expression: string, binding: Map<string, Node | Edge>): unknown {
    // Simple property access: n.property
    const propMatch = expression.match(/(\w+)\.(\w+)/);
    if (propMatch) {
      const entity = binding.get(propMatch[1]);
      if (entity && (this.isNode(entity) || this.isEdge(entity))) {
        return entity.properties[propMatch[2]];
      }
    }

    // Just variable name
    const entity = binding.get(expression);
    if (entity) {
      return entity;
    }

    return null;
  }

  private isNode(entity: unknown): entity is Node {
    return typeof entity === 'object' && entity !== null && 'labels' in entity;
  }

  private isEdge(entity: unknown): entity is Edge {
    return typeof entity === 'object' && entity !== null && 'sourceId' in entity && 'targetId' in entity;
  }

  // ==================== Gremlin Implementation ====================

  private executeTraversal(traversal: GremlinTraversal): unknown[] {
    let current: unknown[] = [];

    for (const step of traversal.steps) {
      current = this.executeGremlinStep(step, current);
    }

    return current;
  }

  private executeGremlinStep(step: GremlinStep, input: unknown[]): unknown[] {
    switch (step.type) {
      case 'V':
        // Start with vertices
        return this.getAllNodes();
      case 'E':
        // Start with edges
        return this.getAllEdges();
      case 'has':
        return input.filter(item => this.hasProperty(item, step.args));
      case 'out':
        return this.expandOut(input);
      case 'in':
        return this.expandIn(input);
      case 'both':
        return this.expandBoth(input);
      case 'values':
        return input.map(item => this.getValues(item, step.args));
      default:
        return input;
    }
  }

  private getAllNodes(): Node[] {
    const exported = this.storage.exportGraph();
    return exported.nodes;
  }

  private getAllEdges(): Edge[] {
    const exported = this.storage.exportGraph();
    return exported.edges;
  }

  private hasProperty(item: unknown, args: unknown[]): boolean {
    if (!this.isNode(item) && !this.isEdge(item)) return false;

    if (args.length === 1) {
      return args[0] in item.properties;
    } else if (args.length === 2) {
      return item.properties[args[0] as string] === args[1];
    }

    return false;
  }

  private expandOut(items: unknown[]): Node[] {
    const results: Node[] = [];

    for (const item of items) {
      if (this.isNode(item)) {
        const neighbors = this.storage.getNeighbors(item.id, 'out');
        results.push(...neighbors);
      }
    }

    return results;
  }

  private expandIn(items: unknown[]): Node[] {
    const results: Node[] = [];

    for (const item of items) {
      if (this.isNode(item)) {
        const neighbors = this.storage.getNeighbors(item.id, 'in');
        results.push(...neighbors);
      }
    }

    return results;
  }

  private expandBoth(items: unknown[]): Node[] {
    const results: Node[] = [];

    for (const item of items) {
      if (this.isNode(item)) {
        const neighbors = this.storage.getNeighbors(item.id, 'both');
        results.push(...neighbors);
      }
    }

    return results;
  }

  private getValues(item: unknown, args: unknown[]): unknown {
    if (!this.isNode(item) && !this.isEdge(item)) return null;

    if (args.length === 0) {
      return Object.values(item.properties);
    }

    return item.properties[args[0] as string];
  }

  // ==================== SPARQL Implementation ====================

  private parseSPARQL(query: string): SPARQLQuery {
    // Simplified SPARQL parser for triple patterns
    return {
      select: [],
      where: [],
      limit: undefined
    };
  }

  private executeTriplePattern(query: SPARQLQuery): Omit<QueryResult, 'stats'> {
    // Simplified implementation
    return {
      columns: query.select,
      rows: []
    };
  }

  // ==================== Query Planning ====================

  private explainCypher(query: string): QueryPlan {
    const parsed = this.parseCypher(query);
    const steps: QueryStep[] = [];
    let estimatedCost = 0;

    // Match step
    if (parsed.match.length > 0) {
      for (const pattern of parsed.match) {
        if (pattern.sourceNode.label) {
          steps.push({
            type: 'scan',
            description: `Node label scan: ${pattern.sourceNode.label}`,
            estimatedCost: 10
          });
          estimatedCost += 10;
        }

        if (pattern.edge) {
          steps.push({
            type: 'expand',
            description: `Expand edges: ${pattern.edge.type || 'all'}`,
            estimatedCost: 100
          });
          estimatedCost += 100;
        }
      }
    }

    // Where step
    if (parsed.where.length > 0) {
      steps.push({
        type: 'filter',
        description: `Filter: ${parsed.where.length} conditions`,
        estimatedCost: 5 * parsed.where.length
      });
      estimatedCost += 5 * parsed.where.length;
    }

    // Order by step
    if (parsed.orderBy.length > 0) {
      steps.push({
        type: 'sort',
        description: `Sort by ${parsed.orderBy.length} expressions`,
        estimatedCost: 50
      });
      estimatedCost += 50;
    }

    // Limit step
    if (parsed.limit !== undefined) {
      steps.push({
        type: 'limit',
        description: `Limit: ${parsed.limit}`,
        estimatedCost: 1
      });
      estimatedCost += 1;
    }

    return {
      steps,
      estimatedCost,
      estimatedRows: parsed.limit || 1000
    };
  }

  private explainGremlin(query: string): QueryPlan {
    return {
      steps: [],
      estimatedCost: 0,
      estimatedRows: 0
    };
  }

  private explainSPARQL(query: string): QueryPlan {
    return {
      steps: [],
      estimatedCost: 0,
      estimatedRows: 0
    };
  }
}

// ==================== Types ====================

interface CypherQuery {
  match: MatchPattern[];
  where: WhereCondition[];
  return: ReturnItem[];
  orderBy: OrderByItem[];
  limit?: number;
}

interface MatchPattern {
  sourceNode: { var: string; label?: string };
  edge?: { var: string; type?: string };
  targetNode?: { var: string; label?: string };
}

interface WhereCondition {
  var: string;
  property: string;
  operator: ComparisonOperator;
  value: unknown;
}

type ComparisonOperator = '=' | '!=' | '>' | '<' | '>=' | '<=';

interface ReturnItem {
  expression: string;
  alias?: string;
}

interface OrderByItem {
  expression: string;
  direction: 'asc' | 'desc';
}

interface GremlinTraversal {
  steps: GremlinStep[];
}

interface GremlinStep {
  type: string;
  args: unknown[];
}

interface SPARQLQuery {
  select: string[];
  where: TriplePattern[];
  limit?: number;
}

interface TriplePattern {
  subject: string;
  predicate: string;
  object: string;
}
