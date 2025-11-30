/**
 * Query Translator
 *
 * Translates AggregateQuery into backend-specific queries:
 * - PostgreSQL for relational data
 * - Cypher for Neo4j graph data
 */

import type {
  AggregateQuery,
  FilterCondition,
  FilterGroup,
  Dimension,
  Measure,
  DataSource,
  TimeGranularity,
  AggregationType,
} from '../types/index.js';
import { FilterOperator } from '../types/index.js';

/**
 * Translated query for PostgreSQL
 */
export interface PostgresQuery {
  sql: string;
  params: unknown[];
}

/**
 * Translated query for Neo4j
 */
export interface CypherQuery {
  cypher: string;
  params: Record<string, unknown>;
}

/**
 * Source table/node mappings
 */
const SOURCE_TABLES: Record<DataSource, string> = {
  entities: 'entities',
  relationships: 'relationships',
  cases: 'cases',
  events: 'events',
  audit_log: 'audit_log',
  user_activity: 'user_activity',
};

const SOURCE_LABELS: Record<DataSource, string> = {
  entities: 'Entity',
  relationships: 'RELATED_TO',
  cases: 'Case',
  events: 'Event',
  audit_log: 'AuditEntry',
  user_activity: 'UserActivity',
};

/**
 * Aggregation function SQL mapping
 */
const SQL_AGGREGATIONS: Record<AggregationType, string> = {
  count: 'COUNT(*)',
  count_distinct: 'COUNT(DISTINCT %s)',
  sum: 'SUM(%s)',
  avg: 'AVG(%s)',
  min: 'MIN(%s)',
  max: 'MAX(%s)',
  median: 'PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY %s)',
  percentile: 'PERCENTILE_CONT(%p) WITHIN GROUP (ORDER BY %s)',
  stddev: 'STDDEV(%s)',
  variance: 'VARIANCE(%s)',
};

/**
 * Time truncation SQL functions
 */
const TIME_TRUNC: Record<TimeGranularity, string> = {
  minute: 'minute',
  hour: 'hour',
  day: 'day',
  week: 'week',
  month: 'month',
  quarter: 'quarter',
  year: 'year',
};

export class QueryTranslator {
  private paramIndex: number = 0;

  /**
   * Translate an AggregateQuery to PostgreSQL
   */
  toPostgres(query: AggregateQuery): PostgresQuery {
    this.paramIndex = 0;
    const params: unknown[] = [];

    const table = SOURCE_TABLES[query.source];
    if (!table) {
      throw new Error(`Unknown data source: ${query.source}`);
    }

    // Build SELECT clause
    const selectParts: string[] = [];

    // Add dimensions
    for (const dim of query.dimensions) {
      selectParts.push(this.buildDimensionSelect(dim));
    }

    // Add measures
    for (const measure of query.measures) {
      selectParts.push(this.buildMeasureSelect(measure));
    }

    // Add cohort size for k-anonymity support
    if (!query.measures.some(m => m.aggregation === 'count' || m.aggregation === 'count_distinct')) {
      selectParts.push('COUNT(*) AS cohort_size');
    }

    let sql = `SELECT ${selectParts.join(', ')} FROM ${table}`;

    // Build WHERE clause
    const whereClause = this.buildWhereClause(query, params);
    if (whereClause) {
      sql += ` WHERE ${whereClause}`;
    }

    // Build GROUP BY clause
    if (query.dimensions.length > 0) {
      const groupByParts = query.dimensions.map(dim =>
        dim.timeGranularity
          ? `DATE_TRUNC('${TIME_TRUNC[dim.timeGranularity]}', ${this.escapeIdentifier(dim.field)})`
          : this.escapeIdentifier(dim.field)
      );
      sql += ` GROUP BY ${groupByParts.join(', ')}`;
    }

    // Build HAVING clause for minimum cohort filtering (optional, can also be done post-query)
    // We'll do this in the policy enforcer instead for flexibility

    // Build ORDER BY clause
    if (query.orderBy && query.orderBy.length > 0) {
      const orderParts = query.orderBy.map(
        o => `${this.escapeIdentifier(o.field)} ${o.direction.toUpperCase()}`
      );
      sql += ` ORDER BY ${orderParts.join(', ')}`;
    }

    // Build LIMIT clause
    if (query.limit) {
      sql += ` LIMIT ${Math.min(query.limit, 10000)}`;
    }

    return { sql, params };
  }

  /**
   * Translate an AggregateQuery to Cypher (Neo4j)
   */
  toCypher(query: AggregateQuery): CypherQuery {
    const params: Record<string, unknown> = {};
    let paramCounter = 0;

    const label = SOURCE_LABELS[query.source];
    if (!label) {
      throw new Error(`Unknown data source for Cypher: ${query.source}`);
    }

    let cypher = '';

    // Build MATCH clause
    if (query.source === 'relationships') {
      cypher = `MATCH (a)-[r:${label}]->(b)`;
    } else {
      cypher = `MATCH (n:${label})`;
    }

    // Build WHERE clause
    const whereClause = this.buildCypherWhere(query, params, paramCounter);
    if (whereClause.clause) {
      cypher += ` WHERE ${whereClause.clause}`;
      paramCounter = whereClause.nextCounter;
    }

    // Build WITH clause for aggregation
    const nodeVar = query.source === 'relationships' ? 'r' : 'n';

    // Group by dimensions
    if (query.dimensions.length > 0) {
      const groupFields = query.dimensions.map(dim => {
        if (dim.timeGranularity) {
          return `date.truncate('${dim.timeGranularity}', ${nodeVar}.${dim.field}) AS ${dim.alias || dim.field}`;
        }
        return `${nodeVar}.${dim.field} AS ${dim.alias || dim.field}`;
      });

      cypher += ` WITH ${groupFields.join(', ')}, collect(${nodeVar}) AS items`;
    } else {
      cypher += ` WITH collect(${nodeVar}) AS items`;
    }

    // Build RETURN clause with aggregations
    const returnParts: string[] = [];

    // Add dimensions to return
    for (const dim of query.dimensions) {
      returnParts.push(dim.alias || dim.field);
    }

    // Add measures
    for (const measure of query.measures) {
      returnParts.push(this.buildCypherAggregation(measure));
    }

    // Add cohort size
    returnParts.push('size(items) AS cohort_size');

    cypher += ` RETURN ${returnParts.join(', ')}`;

    // ORDER BY
    if (query.orderBy && query.orderBy.length > 0) {
      const orderParts = query.orderBy.map(
        o => `${o.field} ${o.direction.toUpperCase()}`
      );
      cypher += ` ORDER BY ${orderParts.join(', ')}`;
    }

    // LIMIT
    if (query.limit) {
      cypher += ` LIMIT ${Math.min(query.limit, 10000)}`;
    }

    return { cypher, params };
  }

  /**
   * Build SELECT clause for a dimension
   */
  private buildDimensionSelect(dim: Dimension): string {
    const field = this.escapeIdentifier(dim.field);
    const alias = dim.alias ? this.escapeIdentifier(dim.alias) : field;

    if (dim.timeGranularity) {
      return `DATE_TRUNC('${TIME_TRUNC[dim.timeGranularity]}', ${field}) AS ${alias}`;
    }

    if (dim.bins) {
      // Width bucket binning
      const { count, min = 0, max = 1000000 } = dim.bins;
      return `WIDTH_BUCKET(${field}, ${min}, ${max}, ${count}) AS ${alias}`;
    }

    return dim.alias ? `${field} AS ${alias}` : field;
  }

  /**
   * Build SELECT clause for a measure
   */
  private buildMeasureSelect(measure: Measure): string {
    const field = this.escapeIdentifier(measure.field);
    const alias = measure.alias || `${measure.aggregation}_${measure.field}`;
    let aggSql = SQL_AGGREGATIONS[measure.aggregation];

    if (measure.aggregation === 'count') {
      // COUNT(*) doesn't need field substitution
      return `COUNT(*) AS ${this.escapeIdentifier(alias)}`;
    }

    if (measure.aggregation === 'percentile' && measure.percentile !== undefined) {
      aggSql = aggSql.replace('%p', (measure.percentile / 100).toString());
    }

    aggSql = aggSql.replace('%s', field);
    return `${aggSql} AS ${this.escapeIdentifier(alias)}`;
  }

  /**
   * Build WHERE clause from filters and time range
   */
  private buildWhereClause(query: AggregateQuery, params: unknown[]): string {
    const conditions: string[] = [];

    // Time range filter
    if (query.timeRange) {
      const startParam = this.nextParam(params, query.timeRange.start);
      const endParam = this.nextParam(params, query.timeRange.end);
      conditions.push(`created_at >= ${startParam} AND created_at < ${endParam}`);
    }

    // Custom filters
    if (query.filters) {
      const filterSql = this.buildFilterGroup(query.filters, params);
      if (filterSql) {
        conditions.push(filterSql);
      }
    }

    // NULL handling
    if (!query.includeNulls && query.dimensions.length > 0) {
      const nullChecks = query.dimensions
        .map(d => `${this.escapeIdentifier(d.field)} IS NOT NULL`)
        .join(' AND ');
      conditions.push(nullChecks);
    }

    return conditions.length > 0 ? conditions.join(' AND ') : '';
  }

  /**
   * Build filter group recursively
   */
  private buildFilterGroup(group: FilterGroup, params: unknown[]): string {
    const parts: string[] = [];

    for (const condition of group.conditions) {
      if ('logic' in condition) {
        // Nested filter group
        const nested = this.buildFilterGroup(condition as FilterGroup, params);
        if (nested) {
          parts.push(`(${nested})`);
        }
      } else {
        // Single condition
        const conditionSql = this.buildCondition(condition as FilterCondition, params);
        if (conditionSql) {
          parts.push(conditionSql);
        }
      }
    }

    if (parts.length === 0) return '';
    return parts.join(` ${group.logic} `);
  }

  /**
   * Build a single filter condition
   */
  private buildCondition(condition: FilterCondition, params: unknown[]): string {
    const field = this.escapeIdentifier(condition.field);

    switch (condition.operator) {
      case FilterOperator.EQUALS:
        return `${field} = ${this.nextParam(params, condition.value)}`;
      case FilterOperator.NOT_EQUALS:
        return `${field} <> ${this.nextParam(params, condition.value)}`;
      case FilterOperator.GREATER_THAN:
        return `${field} > ${this.nextParam(params, condition.value)}`;
      case FilterOperator.GREATER_THAN_OR_EQUAL:
        return `${field} >= ${this.nextParam(params, condition.value)}`;
      case FilterOperator.LESS_THAN:
        return `${field} < ${this.nextParam(params, condition.value)}`;
      case FilterOperator.LESS_THAN_OR_EQUAL:
        return `${field} <= ${this.nextParam(params, condition.value)}`;
      case FilterOperator.IN:
        if (Array.isArray(condition.value)) {
          const placeholders = condition.value.map(v => this.nextParam(params, v)).join(', ');
          return `${field} IN (${placeholders})`;
        }
        return `${field} = ${this.nextParam(params, condition.value)}`;
      case FilterOperator.NOT_IN:
        if (Array.isArray(condition.value)) {
          const placeholders = condition.value.map(v => this.nextParam(params, v)).join(', ');
          return `${field} NOT IN (${placeholders})`;
        }
        return `${field} <> ${this.nextParam(params, condition.value)}`;
      case FilterOperator.LIKE:
        return `${field} LIKE ${this.nextParam(params, condition.value)}`;
      case FilterOperator.IS_NULL:
        return `${field} IS NULL`;
      case FilterOperator.IS_NOT_NULL:
        return `${field} IS NOT NULL`;
      case FilterOperator.BETWEEN:
        return `${field} BETWEEN ${this.nextParam(params, condition.value)} AND ${this.nextParam(params, condition.valueTo)}`;
      default:
        throw new Error(`Unknown filter operator: ${condition.operator}`);
    }
  }

  /**
   * Build Cypher WHERE clause
   */
  private buildCypherWhere(
    query: AggregateQuery,
    params: Record<string, unknown>,
    startCounter: number
  ): { clause: string; nextCounter: number } {
    const nodeVar = query.source === 'relationships' ? 'r' : 'n';
    const conditions: string[] = [];
    let counter = startCounter;

    // Time range
    if (query.timeRange) {
      const startParam = `param${counter++}`;
      const endParam = `param${counter++}`;
      params[startParam] = query.timeRange.start.toISOString();
      params[endParam] = query.timeRange.end.toISOString();
      conditions.push(`${nodeVar}.created_at >= datetime($${startParam}) AND ${nodeVar}.created_at < datetime($${endParam})`);
    }

    // Custom filters
    if (query.filters) {
      const { clause, nextCounter } = this.buildCypherFilterGroup(
        query.filters,
        params,
        counter,
        nodeVar
      );
      if (clause) {
        conditions.push(clause);
        counter = nextCounter;
      }
    }

    return {
      clause: conditions.length > 0 ? conditions.join(' AND ') : '',
      nextCounter: counter,
    };
  }

  /**
   * Build Cypher filter group
   */
  private buildCypherFilterGroup(
    group: FilterGroup,
    params: Record<string, unknown>,
    startCounter: number,
    nodeVar: string
  ): { clause: string; nextCounter: number } {
    const parts: string[] = [];
    let counter = startCounter;

    for (const condition of group.conditions) {
      if ('logic' in condition) {
        const nested = this.buildCypherFilterGroup(
          condition as FilterGroup,
          params,
          counter,
          nodeVar
        );
        if (nested.clause) {
          parts.push(`(${nested.clause})`);
          counter = nested.nextCounter;
        }
      } else {
        const { clause, nextCounter } = this.buildCypherCondition(
          condition as FilterCondition,
          params,
          counter,
          nodeVar
        );
        if (clause) {
          parts.push(clause);
          counter = nextCounter;
        }
      }
    }

    return {
      clause: parts.length > 0 ? parts.join(` ${group.logic} `) : '',
      nextCounter: counter,
    };
  }

  /**
   * Build a single Cypher condition
   */
  private buildCypherCondition(
    condition: FilterCondition,
    params: Record<string, unknown>,
    counter: number,
    nodeVar: string
  ): { clause: string; nextCounter: number } {
    const field = `${nodeVar}.${condition.field}`;
    const paramName = `param${counter}`;

    let clause = '';
    let nextCounter = counter;

    switch (condition.operator) {
      case FilterOperator.EQUALS:
        params[paramName] = condition.value;
        clause = `${field} = $${paramName}`;
        nextCounter++;
        break;
      case FilterOperator.NOT_EQUALS:
        params[paramName] = condition.value;
        clause = `${field} <> $${paramName}`;
        nextCounter++;
        break;
      case FilterOperator.GREATER_THAN:
        params[paramName] = condition.value;
        clause = `${field} > $${paramName}`;
        nextCounter++;
        break;
      case FilterOperator.IN:
        params[paramName] = condition.value;
        clause = `${field} IN $${paramName}`;
        nextCounter++;
        break;
      case FilterOperator.IS_NULL:
        clause = `${field} IS NULL`;
        break;
      case FilterOperator.IS_NOT_NULL:
        clause = `${field} IS NOT NULL`;
        break;
      default:
        // Fallback for other operators
        params[paramName] = condition.value;
        clause = `${field} = $${paramName}`;
        nextCounter++;
    }

    return { clause, nextCounter };
  }

  /**
   * Build Cypher aggregation
   */
  private buildCypherAggregation(measure: Measure): string {
    const alias = measure.alias || `${measure.aggregation}_${measure.field}`;

    switch (measure.aggregation) {
      case 'count':
        return `size(items) AS ${alias}`;
      case 'count_distinct':
        return `size(apoc.coll.toSet([i IN items | i.${measure.field}])) AS ${alias}`;
      case 'sum':
        return `reduce(total = 0, i IN items | total + coalesce(i.${measure.field}, 0)) AS ${alias}`;
      case 'avg':
        return `reduce(total = 0.0, i IN items | total + coalesce(i.${measure.field}, 0)) / size(items) AS ${alias}`;
      case 'min':
        return `reduce(m = null, i IN items | CASE WHEN m IS NULL OR i.${measure.field} < m THEN i.${measure.field} ELSE m END) AS ${alias}`;
      case 'max':
        return `reduce(m = null, i IN items | CASE WHEN m IS NULL OR i.${measure.field} > m THEN i.${measure.field} ELSE m END) AS ${alias}`;
      default:
        return `size(items) AS ${alias}`;
    }
  }

  /**
   * Get next parameter placeholder and add value to params array
   */
  private nextParam(params: unknown[], value: unknown): string {
    this.paramIndex++;
    params.push(value);
    return `$${this.paramIndex}`;
  }

  /**
   * Escape SQL identifier
   */
  private escapeIdentifier(name: string): string {
    // Simple validation - in production, use proper escaping
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      throw new Error(`Invalid identifier: ${name}`);
    }
    return name;
  }

  /**
   * Validate query for safety
   */
  validateQuery(query: AggregateQuery): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for required fields
    if (!query.source) {
      errors.push('Data source is required');
    }

    if (!query.measures || query.measures.length === 0) {
      errors.push('At least one measure is required');
    }

    // Check dimension count (too many dimensions increases re-identification risk)
    if (query.dimensions.length > 10) {
      errors.push('Maximum 10 dimensions allowed per query');
    }

    // Check measure count
    if (query.measures.length > 20) {
      errors.push('Maximum 20 measures allowed per query');
    }

    // Validate field names
    for (const dim of query.dimensions) {
      if (!this.isValidFieldName(dim.field)) {
        errors.push(`Invalid dimension field name: ${dim.field}`);
      }
    }

    for (const measure of query.measures) {
      if (!this.isValidFieldName(measure.field)) {
        errors.push(`Invalid measure field name: ${measure.field}`);
      }
    }

    // Validate time range
    if (query.timeRange) {
      if (query.timeRange.start > query.timeRange.end) {
        errors.push('Time range start must be before end');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Check if field name is valid and safe
   */
  private isValidFieldName(name: string): boolean {
    // Only allow alphanumeric and underscores, starting with letter or underscore
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  }
}

export const queryTranslator = new QueryTranslator();
