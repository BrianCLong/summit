"use strict";
/**
 * Query Translator Tests
 *
 * Tests for SQL and Cypher query translation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const QueryTranslator_js_1 = require("../query/QueryTranslator.js");
const index_js_1 = require("../types/index.js");
(0, globals_1.describe)('QueryTranslator', () => {
    let translator;
    (0, globals_1.beforeEach)(() => {
        translator = new QueryTranslator_js_1.QueryTranslator();
    });
    (0, globals_1.describe)('PostgreSQL Translation', () => {
        (0, globals_1.it)('should translate simple count query', () => {
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [{ field: 'type' }],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' },
                ],
            };
            const result = translator.toPostgres(query);
            (0, globals_1.expect)(result.sql).toContain('SELECT');
            (0, globals_1.expect)(result.sql).toContain('type');
            (0, globals_1.expect)(result.sql).toContain('COUNT(*)');
            (0, globals_1.expect)(result.sql).toContain('FROM entities');
            (0, globals_1.expect)(result.sql).toContain('GROUP BY');
        });
        (0, globals_1.it)('should translate query with time granularity', () => {
            const query = {
                source: index_js_1.DataSource.CASES,
                dimensions: [
                    {
                        field: 'created_at',
                        alias: 'date',
                        timeGranularity: index_js_1.TimeGranularity.DAY,
                    },
                ],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' },
                ],
            };
            const result = translator.toPostgres(query);
            (0, globals_1.expect)(result.sql).toContain("DATE_TRUNC('day'");
            (0, globals_1.expect)(result.sql).toContain('GROUP BY');
        });
        (0, globals_1.it)('should translate query with multiple measures', () => {
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [{ field: 'type' }],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' },
                    { field: 'value', aggregation: index_js_1.AggregationType.SUM, alias: 'total' },
                    { field: 'value', aggregation: index_js_1.AggregationType.AVG, alias: 'average' },
                ],
            };
            const result = translator.toPostgres(query);
            (0, globals_1.expect)(result.sql).toContain('COUNT(*)');
            (0, globals_1.expect)(result.sql).toContain('SUM(value)');
            (0, globals_1.expect)(result.sql).toContain('AVG(value)');
        });
        (0, globals_1.it)('should translate query with filters', () => {
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [{ field: 'type' }],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' },
                ],
                filters: {
                    logic: 'AND',
                    conditions: [
                        { field: 'status', operator: index_js_1.FilterOperator.EQUALS, value: 'active' },
                        { field: 'priority', operator: index_js_1.FilterOperator.GREATER_THAN, value: 5 },
                    ],
                },
            };
            const result = translator.toPostgres(query);
            (0, globals_1.expect)(result.sql).toContain('WHERE');
            (0, globals_1.expect)(result.sql).toContain('status = $');
            (0, globals_1.expect)(result.sql).toContain('priority > $');
            (0, globals_1.expect)(result.params).toContain('active');
            (0, globals_1.expect)(result.params).toContain(5);
        });
        (0, globals_1.it)('should translate query with time range', () => {
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-12-31');
            const query = {
                source: index_js_1.DataSource.EVENTS,
                dimensions: [],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' },
                ],
                timeRange: {
                    start: startDate,
                    end: endDate,
                },
            };
            const result = translator.toPostgres(query);
            (0, globals_1.expect)(result.sql).toContain('created_at >=');
            (0, globals_1.expect)(result.sql).toContain('created_at <');
            (0, globals_1.expect)(result.params).toContain(startDate);
            (0, globals_1.expect)(result.params).toContain(endDate);
        });
        (0, globals_1.it)('should translate query with ORDER BY', () => {
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [{ field: 'type' }],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' },
                ],
                orderBy: [
                    { field: 'count', direction: 'desc' },
                ],
            };
            const result = translator.toPostgres(query);
            (0, globals_1.expect)(result.sql).toContain('ORDER BY count DESC');
        });
        (0, globals_1.it)('should translate query with LIMIT', () => {
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [{ field: 'type' }],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' },
                ],
                limit: 100,
            };
            const result = translator.toPostgres(query);
            (0, globals_1.expect)(result.sql).toContain('LIMIT 100');
        });
        (0, globals_1.it)('should cap LIMIT at 10000', () => {
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' },
                ],
                limit: 50000,
            };
            const result = translator.toPostgres(query);
            (0, globals_1.expect)(result.sql).toContain('LIMIT 10000');
        });
        (0, globals_1.it)('should translate IN filter', () => {
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [{ field: 'type' }],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' },
                ],
                filters: {
                    logic: 'AND',
                    conditions: [
                        { field: 'status', operator: index_js_1.FilterOperator.IN, value: ['active', 'pending', 'review'] },
                    ],
                },
            };
            const result = translator.toPostgres(query);
            (0, globals_1.expect)(result.sql).toContain('status IN');
            (0, globals_1.expect)(result.params).toContain('active');
            (0, globals_1.expect)(result.params).toContain('pending');
            (0, globals_1.expect)(result.params).toContain('review');
        });
        (0, globals_1.it)('should translate nested filter groups', () => {
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [{ field: 'type' }],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' },
                ],
                filters: {
                    logic: 'AND',
                    conditions: [
                        { field: 'status', operator: index_js_1.FilterOperator.EQUALS, value: 'active' },
                        {
                            logic: 'OR',
                            conditions: [
                                { field: 'priority', operator: index_js_1.FilterOperator.EQUALS, value: 'high' },
                                { field: 'urgent', operator: index_js_1.FilterOperator.EQUALS, value: true },
                            ],
                        },
                    ],
                },
            };
            const result = translator.toPostgres(query);
            (0, globals_1.expect)(result.sql).toContain('AND');
            (0, globals_1.expect)(result.sql).toContain('OR');
            (0, globals_1.expect)(result.sql).toMatch(/\([^)]+OR[^)]+\)/); // Nested parentheses
        });
        (0, globals_1.it)('should include cohort_size in output', () => {
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [{ field: 'type' }],
                measures: [
                    { field: 'value', aggregation: index_js_1.AggregationType.SUM, alias: 'total' },
                ],
            };
            const result = translator.toPostgres(query);
            (0, globals_1.expect)(result.sql).toContain('COUNT(*) AS cohort_size');
        });
        (0, globals_1.it)('should not add duplicate cohort_size when count is present', () => {
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [{ field: 'type' }],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' },
                ],
            };
            const result = translator.toPostgres(query);
            const cohortMatches = result.sql.match(/cohort_size/g);
            // Should not contain cohort_size when count is already present
            (0, globals_1.expect)(cohortMatches).toBeNull();
        });
    });
    (0, globals_1.describe)('Cypher Translation', () => {
        (0, globals_1.it)('should translate simple entity query', () => {
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [{ field: 'type' }],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' },
                ],
            };
            const result = translator.toCypher(query);
            (0, globals_1.expect)(result.cypher).toContain('MATCH (n:Entity)');
            (0, globals_1.expect)(result.cypher).toContain('WITH');
            (0, globals_1.expect)(result.cypher).toContain('RETURN');
            (0, globals_1.expect)(result.cypher).toContain('size(items)');
        });
        (0, globals_1.it)('should translate relationship query', () => {
            const query = {
                source: index_js_1.DataSource.RELATIONSHIPS,
                dimensions: [{ field: 'type' }],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' },
                ],
            };
            const result = translator.toCypher(query);
            (0, globals_1.expect)(result.cypher).toContain('MATCH (a)-[r:RELATED_TO]->(b)');
        });
        (0, globals_1.it)('should translate query with time range', () => {
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [{ field: 'type' }],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' },
                ],
                timeRange: {
                    start: new Date('2024-01-01'),
                    end: new Date('2024-12-31'),
                },
            };
            const result = translator.toCypher(query);
            (0, globals_1.expect)(result.cypher).toContain('WHERE');
            (0, globals_1.expect)(result.cypher).toContain('created_at');
            (0, globals_1.expect)(result.cypher).toContain('datetime');
        });
    });
    (0, globals_1.describe)('Query Validation', () => {
        (0, globals_1.it)('should validate query with missing source', () => {
            const query = {
                dimensions: [{ field: 'type' }],
                measures: [{ field: 'id', aggregation: index_js_1.AggregationType.COUNT }],
            };
            const result = translator.validateQuery(query);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors.some(e => e.includes('source'))).toBe(true);
        });
        (0, globals_1.it)('should validate query with no measures', () => {
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [{ field: 'type' }],
                measures: [],
            };
            const result = translator.validateQuery(query);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors.some(e => e.includes('measure'))).toBe(true);
        });
        (0, globals_1.it)('should validate query with too many dimensions', () => {
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: Array(15).fill(null).map((_, i) => ({ field: `dim${i}` })),
                measures: [{ field: 'id', aggregation: index_js_1.AggregationType.COUNT }],
            };
            const result = translator.validateQuery(query);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors.some(e => e.includes('dimensions'))).toBe(true);
        });
        (0, globals_1.it)('should validate query with invalid field name', () => {
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [{ field: 'type; DROP TABLE entities;--' }],
                measures: [{ field: 'id', aggregation: index_js_1.AggregationType.COUNT }],
            };
            const result = translator.validateQuery(query);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors.some(e => e.includes('field name'))).toBe(true);
        });
        (0, globals_1.it)('should validate query with invalid time range', () => {
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [],
                measures: [{ field: 'id', aggregation: index_js_1.AggregationType.COUNT }],
                timeRange: {
                    start: new Date('2024-12-31'),
                    end: new Date('2024-01-01'), // End before start
                },
            };
            const result = translator.validateQuery(query);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors.some(e => e.includes('time range') || e.includes('Time range'))).toBe(true);
        });
        (0, globals_1.it)('should pass valid query', () => {
            const query = {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [{ field: 'type' }],
                measures: [{ field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' }],
                timeRange: {
                    start: new Date('2024-01-01'),
                    end: new Date('2024-12-31'),
                },
                limit: 100,
            };
            const result = translator.validateQuery(query);
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.errors).toHaveLength(0);
        });
    });
});
