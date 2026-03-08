"use strict";
/**
 * Predefined Metrics
 *
 * Pre-configured metrics for dashboards with embedded privacy policies.
 * These metrics are safe by design and can be used by Ops/Admin dashboards.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.predefinedMetrics = exports.PredefinedMetricsRegistry = void 0;
const index_js_1 = require("../types/index.js");
/**
 * Registry of predefined metrics
 */
class PredefinedMetricsRegistry {
    metrics = new Map();
    constructor() {
        this.registerDefaultMetrics();
    }
    /**
     * Get a metric by ID
     */
    get(id) {
        return this.metrics.get(id);
    }
    /**
     * Get all metrics
     */
    getAll() {
        return Array.from(this.metrics.values());
    }
    /**
     * Get metrics by category
     */
    getByCategory(category) {
        return this.getAll().filter(m => m.category === category);
    }
    /**
     * Get metrics accessible by roles
     */
    getByRoles(roles) {
        return this.getAll().filter(m => m.requiredRoles.length === 0 ||
            m.requiredRoles.some(r => roles.includes(r)));
    }
    /**
     * Register a custom metric
     */
    register(metric) {
        this.metrics.set(metric.id, metric);
    }
    /**
     * Register default operational metrics
     */
    registerDefaultMetrics() {
        // =========================================================================
        // Operational Metrics
        // =========================================================================
        this.register({
            id: 'entity-count-by-type',
            name: 'Entity Count by Type',
            description: 'Total count of entities grouped by type',
            category: 'operational',
            query: {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [{ field: 'type' }],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' },
                ],
                orderBy: [{ field: 'count', direction: 'desc' }],
                limit: 50,
            },
            embeddedPolicy: {
                mechanism: index_js_1.PrivacyMechanism.K_ANONYMITY,
                kAnonymity: {
                    minCohortSize: 10,
                    violationAction: 'suppress',
                },
            },
            refreshInterval: 300, // 5 minutes
            cacheable: true,
            cacheTtl: 300,
            requiredRoles: ['user', 'analyst', 'admin'],
        });
        this.register({
            id: 'daily-case-activity',
            name: 'Daily Case Activity',
            description: 'Number of cases created per day over the last 30 days',
            category: 'operational',
            query: {
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
                timeRange: {
                    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    end: new Date(),
                },
                orderBy: [{ field: 'date', direction: 'asc' }],
            },
            embeddedPolicy: {
                mechanism: index_js_1.PrivacyMechanism.K_ANONYMITY,
                kAnonymity: {
                    minCohortSize: 5,
                    violationAction: 'suppress',
                },
            },
            refreshInterval: 3600, // 1 hour
            cacheable: true,
            cacheTtl: 3600,
            requiredRoles: ['analyst', 'admin'],
        });
        this.register({
            id: 'relationship-type-distribution',
            name: 'Relationship Type Distribution',
            description: 'Distribution of relationship types in the graph',
            category: 'operational',
            query: {
                source: index_js_1.DataSource.RELATIONSHIPS,
                dimensions: [{ field: 'type' }],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' },
                ],
                orderBy: [{ field: 'count', direction: 'desc' }],
                limit: 30,
            },
            embeddedPolicy: {
                mechanism: index_js_1.PrivacyMechanism.K_ANONYMITY,
                kAnonymity: {
                    minCohortSize: 10,
                    violationAction: 'suppress',
                },
            },
            refreshInterval: 600, // 10 minutes
            cacheable: true,
            cacheTtl: 600,
            requiredRoles: ['analyst', 'admin'],
        });
        // =========================================================================
        // Security Metrics
        // =========================================================================
        this.register({
            id: 'hourly-audit-events',
            name: 'Hourly Audit Events',
            description: 'Count of audit log events per hour',
            category: 'security',
            query: {
                source: index_js_1.DataSource.AUDIT_LOG,
                dimensions: [
                    {
                        field: 'created_at',
                        alias: 'hour',
                        timeGranularity: index_js_1.TimeGranularity.HOUR,
                    },
                    { field: 'event_type' },
                ],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' },
                ],
                timeRange: {
                    start: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    end: new Date(),
                },
                orderBy: [{ field: 'hour', direction: 'desc' }],
            },
            embeddedPolicy: {
                mechanism: index_js_1.PrivacyMechanism.SUPPRESSION,
                suppression: {
                    minCountThreshold: 1, // Security metrics need all events
                    showSuppressed: false,
                },
            },
            refreshInterval: 300, // 5 minutes
            cacheable: true,
            cacheTtl: 300,
            requiredRoles: ['security', 'admin'],
        });
        this.register({
            id: 'user-activity-summary',
            name: 'User Activity Summary',
            description: 'Summary of user activity by action type',
            category: 'security',
            query: {
                source: index_js_1.DataSource.USER_ACTIVITY,
                dimensions: [{ field: 'action_type' }],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' },
                    {
                        field: 'user_id',
                        aggregation: index_js_1.AggregationType.COUNT_DISTINCT,
                        alias: 'unique_users',
                    },
                ],
                timeRange: {
                    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    end: new Date(),
                },
                orderBy: [{ field: 'count', direction: 'desc' }],
            },
            embeddedPolicy: {
                mechanism: index_js_1.PrivacyMechanism.COMBINED,
                kAnonymity: {
                    minCohortSize: 5,
                    quasiIdentifiers: ['action_type'],
                    violationAction: 'suppress',
                },
                differentialPrivacy: {
                    epsilon: 0.5,
                    mechanism: 'laplace',
                    budgetTracking: false, // Predefined metrics don't consume user budget
                },
            },
            refreshInterval: 3600, // 1 hour
            cacheable: true,
            cacheTtl: 3600,
            requiredRoles: ['security', 'admin'],
        });
        // =========================================================================
        // Research Metrics (Higher Privacy)
        // =========================================================================
        this.register({
            id: 'entity-creation-trends',
            name: 'Entity Creation Trends',
            description: 'Weekly entity creation trends with strong privacy guarantees',
            category: 'research',
            query: {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [
                    {
                        field: 'created_at',
                        alias: 'week',
                        timeGranularity: index_js_1.TimeGranularity.WEEK,
                    },
                    { field: 'type' },
                ],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' },
                ],
                timeRange: {
                    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
                    end: new Date(),
                },
                orderBy: [{ field: 'week', direction: 'asc' }],
            },
            embeddedPolicy: {
                mechanism: index_js_1.PrivacyMechanism.COMBINED,
                kAnonymity: {
                    minCohortSize: 20,
                    violationAction: 'suppress',
                },
                differentialPrivacy: {
                    epsilon: 0.1, // Strong privacy for research
                    mechanism: 'laplace',
                    budgetTracking: false,
                },
            },
            refreshInterval: 86400, // Daily
            cacheable: true,
            cacheTtl: 86400,
            requiredRoles: ['researcher', 'admin'],
        });
        this.register({
            id: 'case-resolution-stats',
            name: 'Case Resolution Statistics',
            description: 'Statistics on case resolution times with privacy protection',
            category: 'research',
            query: {
                source: index_js_1.DataSource.CASES,
                dimensions: [{ field: 'status' }],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'count' },
                    {
                        field: 'resolution_time_hours',
                        aggregation: index_js_1.AggregationType.AVG,
                        alias: 'avg_resolution_hours',
                    },
                    {
                        field: 'resolution_time_hours',
                        aggregation: index_js_1.AggregationType.MEDIAN,
                        alias: 'median_resolution_hours',
                    },
                ],
                orderBy: [{ field: 'count', direction: 'desc' }],
            },
            embeddedPolicy: {
                mechanism: index_js_1.PrivacyMechanism.COMBINED,
                kAnonymity: {
                    minCohortSize: 50, // Higher threshold for research
                    violationAction: 'suppress',
                },
                differentialPrivacy: {
                    epsilon: 0.2,
                    mechanism: 'laplace',
                    budgetTracking: false,
                },
            },
            refreshInterval: 86400,
            cacheable: true,
            cacheTtl: 86400,
            requiredRoles: ['researcher', 'admin'],
        });
        // =========================================================================
        // Admin Metrics
        // =========================================================================
        this.register({
            id: 'system-overview',
            name: 'System Overview',
            description: 'High-level system statistics for administrators',
            category: 'admin',
            query: {
                source: index_js_1.DataSource.ENTITIES,
                dimensions: [],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'total_entities' },
                ],
            },
            embeddedPolicy: {
                mechanism: index_js_1.PrivacyMechanism.NONE, // Admin metrics bypass privacy for system health
            },
            refreshInterval: 60,
            cacheable: true,
            cacheTtl: 60,
            requiredRoles: ['admin'],
        });
        this.register({
            id: 'privacy-budget-usage',
            name: 'Privacy Budget Usage',
            description: 'Track privacy budget consumption across tenants',
            category: 'admin',
            query: {
                source: index_js_1.DataSource.AUDIT_LOG,
                dimensions: [{ field: 'tenant_id' }],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'query_count' },
                    {
                        field: 'epsilon_consumed',
                        aggregation: index_js_1.AggregationType.SUM,
                        alias: 'total_epsilon',
                    },
                ],
                timeRange: {
                    start: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    end: new Date(),
                },
                orderBy: [{ field: 'total_epsilon', direction: 'desc' }],
                limit: 100,
            },
            embeddedPolicy: {
                mechanism: index_js_1.PrivacyMechanism.NONE, // Admin-only
            },
            refreshInterval: 300,
            cacheable: true,
            cacheTtl: 300,
            requiredRoles: ['admin'],
        });
        this.register({
            id: 'tenant-activity-distribution',
            name: 'Tenant Activity Distribution',
            description: 'Distribution of activity across tenants',
            category: 'admin',
            query: {
                source: index_js_1.DataSource.USER_ACTIVITY,
                dimensions: [{ field: 'tenant_id' }],
                measures: [
                    { field: 'id', aggregation: index_js_1.AggregationType.COUNT, alias: 'activity_count' },
                    {
                        field: 'user_id',
                        aggregation: index_js_1.AggregationType.COUNT_DISTINCT,
                        alias: 'active_users',
                    },
                ],
                timeRange: {
                    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    end: new Date(),
                },
                orderBy: [{ field: 'activity_count', direction: 'desc' }],
                limit: 100,
            },
            embeddedPolicy: {
                mechanism: index_js_1.PrivacyMechanism.K_ANONYMITY,
                kAnonymity: {
                    minCohortSize: 3, // Lower threshold for admin
                    violationAction: 'suppress',
                },
            },
            refreshInterval: 3600,
            cacheable: true,
            cacheTtl: 3600,
            requiredRoles: ['admin'],
        });
    }
}
exports.PredefinedMetricsRegistry = PredefinedMetricsRegistry;
// Singleton instance
exports.predefinedMetrics = new PredefinedMetricsRegistry();
