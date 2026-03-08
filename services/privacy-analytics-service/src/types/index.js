"use strict";
// @ts-nocheck
/**
 * Privacy-Preserving Analytics Service - Core Type Definitions
 *
 * This module defines all types for aggregate queries, privacy policies,
 * execution results, and governance integration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AggregateQuerySchema = exports.TimeRangeSchema = exports.MeasureSchema = exports.DimensionSchema = exports.FilterGroupSchema = exports.FilterConditionSchema = exports.QueryStatus = exports.PrivacyMechanism = exports.DataSource = exports.TimeGranularity = exports.FilterOperator = exports.AggregationType = void 0;
const zod_1 = require("zod");
// ============================================================================
// Enums and Constants
// ============================================================================
/**
 * Supported aggregation functions - restricted to privacy-safe operations
 */
exports.AggregationType = {
    COUNT: 'count',
    COUNT_DISTINCT: 'count_distinct',
    SUM: 'sum',
    AVG: 'avg',
    MIN: 'min',
    MAX: 'max',
    MEDIAN: 'median',
    PERCENTILE: 'percentile',
    STDDEV: 'stddev',
    VARIANCE: 'variance',
};
/**
 * Filter operators for query conditions
 */
exports.FilterOperator = {
    EQUALS: 'eq',
    NOT_EQUALS: 'neq',
    GREATER_THAN: 'gt',
    GREATER_THAN_OR_EQUAL: 'gte',
    LESS_THAN: 'lt',
    LESS_THAN_OR_EQUAL: 'lte',
    IN: 'in',
    NOT_IN: 'not_in',
    LIKE: 'like',
    IS_NULL: 'is_null',
    IS_NOT_NULL: 'is_not_null',
    BETWEEN: 'between',
};
/**
 * Time granularity for time-series aggregations
 */
exports.TimeGranularity = {
    MINUTE: 'minute',
    HOUR: 'hour',
    DAY: 'day',
    WEEK: 'week',
    MONTH: 'month',
    QUARTER: 'quarter',
    YEAR: 'year',
};
/**
 * Data sources available for querying
 */
exports.DataSource = {
    ENTITIES: 'entities',
    RELATIONSHIPS: 'relationships',
    CASES: 'cases',
    EVENTS: 'events',
    AUDIT_LOG: 'audit_log',
    USER_ACTIVITY: 'user_activity',
};
/**
 * Privacy mechanism types
 */
exports.PrivacyMechanism = {
    NONE: 'none',
    K_ANONYMITY: 'k_anonymity',
    DIFFERENTIAL_PRIVACY: 'differential_privacy',
    SUPPRESSION: 'suppression',
    GENERALIZATION: 'generalization',
    COMBINED: 'combined',
};
/**
 * Query result status
 */
exports.QueryStatus = {
    SUCCESS: 'success',
    SUPPRESSED: 'suppressed',
    PARTIAL: 'partial',
    DENIED: 'denied',
    ERROR: 'error',
};
// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================
exports.FilterConditionSchema = zod_1.z.object({
    field: zod_1.z.string().min(1),
    operator: zod_1.z.nativeEnum(exports.FilterOperator),
    value: zod_1.z.unknown(),
    valueTo: zod_1.z.unknown().optional(),
});
exports.FilterGroupSchema = zod_1.z.lazy(() => zod_1.z.object({
    logic: zod_1.z.enum(['AND', 'OR']),
    conditions: zod_1.z.array(zod_1.z.union([exports.FilterConditionSchema, exports.FilterGroupSchema])),
}));
exports.DimensionSchema = zod_1.z.object({
    field: zod_1.z.string().min(1),
    alias: zod_1.z.string().optional(),
    timeGranularity: zod_1.z.nativeEnum(exports.TimeGranularity).optional(),
    bins: zod_1.z.object({
        count: zod_1.z.number().int().positive(),
        min: zod_1.z.number().optional(),
        max: zod_1.z.number().optional(),
    }).optional(),
});
exports.MeasureSchema = zod_1.z.object({
    field: zod_1.z.string().min(1),
    aggregation: zod_1.z.nativeEnum(exports.AggregationType),
    alias: zod_1.z.string().optional(),
    percentile: zod_1.z.number().min(0).max(100).optional(),
});
exports.TimeRangeSchema = zod_1.z.object({
    start: zod_1.z.coerce.date(),
    end: zod_1.z.coerce.date(),
}).refine(data => data.start <= data.end, {
    message: 'Start date must be before or equal to end date',
});
exports.AggregateQuerySchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    source: zod_1.z.nativeEnum(exports.DataSource),
    dimensions: zod_1.z.array(exports.DimensionSchema).min(0).max(10),
    measures: zod_1.z.array(exports.MeasureSchema).min(1).max(20),
    filters: exports.FilterGroupSchema.optional(),
    timeRange: exports.TimeRangeSchema.optional(),
    limit: zod_1.z.number().int().positive().max(10000).optional(),
    orderBy: zod_1.z.array(zod_1.z.object({
        field: zod_1.z.string().min(1),
        direction: zod_1.z.enum(['asc', 'desc']),
    })).optional(),
    includeNulls: zod_1.z.boolean().optional(),
});
