/**
 * Predefined Metrics
 *
 * Pre-configured metrics for dashboards with embedded privacy policies.
 * These metrics are safe by design and can be used by Ops/Admin dashboards.
 */

import type { PredefinedMetric, AggregateQuery, PrivacyPolicy } from '../types/index.js';
import { AggregationType, DataSource, TimeGranularity, PrivacyMechanism } from '../types/index.js';

/**
 * Metric category definitions
 */
export type MetricCategory = 'operational' | 'security' | 'research' | 'admin';

/**
 * Registry of predefined metrics
 */
export class PredefinedMetricsRegistry {
  private metrics: Map<string, PredefinedMetric> = new Map();

  constructor() {
    this.registerDefaultMetrics();
  }

  /**
   * Get a metric by ID
   */
  get(id: string): PredefinedMetric | undefined {
    return this.metrics.get(id);
  }

  /**
   * Get all metrics
   */
  getAll(): PredefinedMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get metrics by category
   */
  getByCategory(category: MetricCategory): PredefinedMetric[] {
    return this.getAll().filter(m => m.category === category);
  }

  /**
   * Get metrics accessible by roles
   */
  getByRoles(roles: string[]): PredefinedMetric[] {
    return this.getAll().filter(m =>
      m.requiredRoles.length === 0 ||
      m.requiredRoles.some(r => roles.includes(r))
    );
  }

  /**
   * Register a custom metric
   */
  register(metric: PredefinedMetric): void {
    this.metrics.set(metric.id, metric);
  }

  /**
   * Register default operational metrics
   */
  private registerDefaultMetrics(): void {
    // =========================================================================
    // Operational Metrics
    // =========================================================================

    this.register({
      id: 'entity-count-by-type',
      name: 'Entity Count by Type',
      description: 'Total count of entities grouped by type',
      category: 'operational',
      query: {
        source: DataSource.ENTITIES,
        dimensions: [{ field: 'type' }],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'count' },
        ],
        orderBy: [{ field: 'count', direction: 'desc' }],
        limit: 50,
      },
      embeddedPolicy: {
        mechanism: PrivacyMechanism.K_ANONYMITY,
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
        timeRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date(),
        },
        orderBy: [{ field: 'date', direction: 'asc' }],
      },
      embeddedPolicy: {
        mechanism: PrivacyMechanism.K_ANONYMITY,
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
        source: DataSource.RELATIONSHIPS,
        dimensions: [{ field: 'type' }],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'count' },
        ],
        orderBy: [{ field: 'count', direction: 'desc' }],
        limit: 30,
      },
      embeddedPolicy: {
        mechanism: PrivacyMechanism.K_ANONYMITY,
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
        source: DataSource.AUDIT_LOG,
        dimensions: [
          {
            field: 'created_at',
            alias: 'hour',
            timeGranularity: TimeGranularity.HOUR,
          },
          { field: 'event_type' },
        ],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'count' },
        ],
        timeRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: new Date(),
        },
        orderBy: [{ field: 'hour', direction: 'desc' }],
      },
      embeddedPolicy: {
        mechanism: PrivacyMechanism.SUPPRESSION,
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
        source: DataSource.USER_ACTIVITY,
        dimensions: [{ field: 'action_type' }],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'count' },
          {
            field: 'user_id',
            aggregation: AggregationType.COUNT_DISTINCT,
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
        mechanism: PrivacyMechanism.COMBINED,
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
        source: DataSource.ENTITIES,
        dimensions: [
          {
            field: 'created_at',
            alias: 'week',
            timeGranularity: TimeGranularity.WEEK,
          },
          { field: 'type' },
        ],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'count' },
        ],
        timeRange: {
          start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          end: new Date(),
        },
        orderBy: [{ field: 'week', direction: 'asc' }],
      },
      embeddedPolicy: {
        mechanism: PrivacyMechanism.COMBINED,
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
        source: DataSource.CASES,
        dimensions: [{ field: 'status' }],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'count' },
          {
            field: 'resolution_time_hours',
            aggregation: AggregationType.AVG,
            alias: 'avg_resolution_hours',
          },
          {
            field: 'resolution_time_hours',
            aggregation: AggregationType.MEDIAN,
            alias: 'median_resolution_hours',
          },
        ],
        orderBy: [{ field: 'count', direction: 'desc' }],
      },
      embeddedPolicy: {
        mechanism: PrivacyMechanism.COMBINED,
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
        source: DataSource.ENTITIES,
        dimensions: [],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'total_entities' },
        ],
      },
      embeddedPolicy: {
        mechanism: PrivacyMechanism.NONE, // Admin metrics bypass privacy for system health
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
        source: DataSource.AUDIT_LOG,
        dimensions: [{ field: 'tenant_id' }],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'query_count' },
          {
            field: 'epsilon_consumed',
            aggregation: AggregationType.SUM,
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
        mechanism: PrivacyMechanism.NONE, // Admin-only
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
        source: DataSource.USER_ACTIVITY,
        dimensions: [{ field: 'tenant_id' }],
        measures: [
          { field: 'id', aggregation: AggregationType.COUNT, alias: 'activity_count' },
          {
            field: 'user_id',
            aggregation: AggregationType.COUNT_DISTINCT,
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
        mechanism: PrivacyMechanism.K_ANONYMITY,
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

// Singleton instance
export const predefinedMetrics = new PredefinedMetricsRegistry();
