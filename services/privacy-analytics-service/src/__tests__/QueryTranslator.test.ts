/**
 * Query Translator Tests
 *
 * Tests for SQL and Cypher query translation.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { QueryTranslator } from '../query/QueryTranslator.js';
import type { AggregateQuery } from '../types/index.js';
import { DataSource, AggregationType, TimeGranularity, FilterOperator } from '../types/index.js';

describe('QueryTranslator', () => {
  let translator: QueryTranslator;

  beforeEach(() => {
    translator = new QueryTranslator();
  });

  describe('PostgreSQL Translation', () => {
    it('should translate simple count query', () => {
      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [{ field: 'type' }],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'count' },
        ],
      };

      const result = translator.toPostgres(query);

      expect(result.sql).toContain('SELECT');
      expect(result.sql).toContain('type');
      expect(result.sql).toContain('COUNT(*)');
      expect(result.sql).toContain('FROM entities');
      expect(result.sql).toContain('GROUP BY');
    });

    it('should translate query with time granularity', () => {
      const query: AggregateQuery = {
        source: DataSource.CASES,
        dimensions: [
          {
            field: 'created_at',
            alias: 'date',
            timeGranularity: TimeGranularity.DAY,
          },
        ],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'count' },
        ],
      };

      const result = translator.toPostgres(query);

      expect(result.sql).toContain("DATE_TRUNC('day'");
      expect(result.sql).toContain('GROUP BY');
    });

    it('should translate query with multiple measures', () => {
      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [{ field: 'type' }],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'count' },
          { field: 'value', aggregation: AggregationType.SUM, alias: 'total' },
          { field: 'value', aggregation: AggregationType.AVG, alias: 'average' },
        ],
      };

      const result = translator.toPostgres(query);

      expect(result.sql).toContain('COUNT(*)');
      expect(result.sql).toContain('SUM(value)');
      expect(result.sql).toContain('AVG(value)');
    });

    it('should translate query with filters', () => {
      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [{ field: 'type' }],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'count' },
        ],
        filters: {
          logic: 'AND',
          conditions: [
            { field: 'status', operator: FilterOperator.EQUALS, value: 'active' },
            { field: 'priority', operator: FilterOperator.GREATER_THAN, value: 5 },
          ],
        },
      };

      const result = translator.toPostgres(query);

      expect(result.sql).toContain('WHERE');
      expect(result.sql).toContain('status = $');
      expect(result.sql).toContain('priority > $');
      expect(result.params).toContain('active');
      expect(result.params).toContain(5);
    });

    it('should translate query with time range', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const query: AggregateQuery = {
        source: DataSource.EVENTS,
        dimensions: [],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'count' },
        ],
        timeRange: {
          start: startDate,
          end: endDate,
        },
      };

      const result = translator.toPostgres(query);

      expect(result.sql).toContain('created_at >=');
      expect(result.sql).toContain('created_at <');
      expect(result.params).toContain(startDate);
      expect(result.params).toContain(endDate);
    });

    it('should translate query with ORDER BY', () => {
      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [{ field: 'type' }],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'count' },
        ],
        orderBy: [
          { field: 'count', direction: 'desc' },
        ],
      };

      const result = translator.toPostgres(query);

      expect(result.sql).toContain('ORDER BY count DESC');
    });

    it('should translate query with LIMIT', () => {
      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [{ field: 'type' }],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'count' },
        ],
        limit: 100,
      };

      const result = translator.toPostgres(query);

      expect(result.sql).toContain('LIMIT 100');
    });

    it('should cap LIMIT at 10000', () => {
      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'count' },
        ],
        limit: 50000,
      };

      const result = translator.toPostgres(query);

      expect(result.sql).toContain('LIMIT 10000');
    });

    it('should translate IN filter', () => {
      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [{ field: 'type' }],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'count' },
        ],
        filters: {
          logic: 'AND',
          conditions: [
            { field: 'status', operator: FilterOperator.IN, value: ['active', 'pending', 'review'] },
          ],
        },
      };

      const result = translator.toPostgres(query);

      expect(result.sql).toContain('status IN');
      expect(result.params).toContain('active');
      expect(result.params).toContain('pending');
      expect(result.params).toContain('review');
    });

    it('should translate nested filter groups', () => {
      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [{ field: 'type' }],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'count' },
        ],
        filters: {
          logic: 'AND',
          conditions: [
            { field: 'status', operator: FilterOperator.EQUALS, value: 'active' },
            {
              logic: 'OR',
              conditions: [
                { field: 'priority', operator: FilterOperator.EQUALS, value: 'high' },
                { field: 'urgent', operator: FilterOperator.EQUALS, value: true },
              ],
            },
          ],
        },
      };

      const result = translator.toPostgres(query);

      expect(result.sql).toContain('AND');
      expect(result.sql).toContain('OR');
      expect(result.sql).toMatch(/\([^)]+OR[^)]+\)/); // Nested parentheses
    });

    it('should include cohort_size in output', () => {
      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [{ field: 'type' }],
        measures: [
          { field: 'value', aggregation: AggregationType.SUM, alias: 'total' },
        ],
      };

      const result = translator.toPostgres(query);

      expect(result.sql).toContain('COUNT(*) AS cohort_size');
    });

    it('should not add duplicate cohort_size when count is present', () => {
      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [{ field: 'type' }],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'count' },
        ],
      };

      const result = translator.toPostgres(query);

      const cohortMatches = result.sql.match(/cohort_size/g);
      // Should not contain cohort_size when count is already present
      expect(cohortMatches).toBeNull();
    });
  });

  describe('Cypher Translation', () => {
    it('should translate simple entity query', () => {
      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [{ field: 'type' }],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'count' },
        ],
      };

      const result = translator.toCypher(query);

      expect(result.cypher).toContain('MATCH (n:Entity)');
      expect(result.cypher).toContain('WITH');
      expect(result.cypher).toContain('RETURN');
      expect(result.cypher).toContain('size(items)');
    });

    it('should translate relationship query', () => {
      const query: AggregateQuery = {
        source: DataSource.RELATIONSHIPS,
        dimensions: [{ field: 'type' }],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'count' },
        ],
      };

      const result = translator.toCypher(query);

      expect(result.cypher).toContain('MATCH (a)-[r:RELATED_TO]->(b)');
    });

    it('should translate query with time range', () => {
      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [{ field: 'type' }],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'count' },
        ],
        timeRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31'),
        },
      };

      const result = translator.toCypher(query);

      expect(result.cypher).toContain('WHERE');
      expect(result.cypher).toContain('created_at');
      expect(result.cypher).toContain('datetime');
    });
  });

  describe('Query Validation', () => {
    it('should validate query with missing source', () => {
      const query = {
        dimensions: [{ field: 'type' }],
        measures: [{ field: 'id', aggregation: AggregationType.COUNT }],
      } as AggregateQuery;

      const result = translator.validateQuery(query);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('source'))).toBe(true);
    });

    it('should validate query with no measures', () => {
      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [{ field: 'type' }],
        measures: [],
      };

      const result = translator.validateQuery(query);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('measure'))).toBe(true);
    });

    it('should validate query with too many dimensions', () => {
      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: Array(15).fill(null).map((_, i) => ({ field: `dim${i}` })),
        measures: [{ field: 'id', aggregation: AggregationType.COUNT }],
      };

      const result = translator.validateQuery(query);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('dimensions'))).toBe(true);
    });

    it('should validate query with invalid field name', () => {
      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [{ field: 'type; DROP TABLE entities;--' }],
        measures: [{ field: 'id', aggregation: AggregationType.COUNT }],
      };

      const result = translator.validateQuery(query);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('field name'))).toBe(true);
    });

    it('should validate query with invalid time range', () => {
      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [],
        measures: [{ field: 'id', aggregation: AggregationType.COUNT }],
        timeRange: {
          start: new Date('2024-12-31'),
          end: new Date('2024-01-01'), // End before start
        },
      };

      const result = translator.validateQuery(query);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('time range') || e.includes('Time range'))).toBe(true);
    });

    it('should pass valid query', () => {
      const query: AggregateQuery = {
        source: DataSource.ENTITIES,
        dimensions: [{ field: 'type' }],
        measures: [{ field: 'id', aggregation: AggregationType.COUNT, alias: 'count' }],
        timeRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31'),
        },
        limit: 100,
      };

      const result = translator.validateQuery(query);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
