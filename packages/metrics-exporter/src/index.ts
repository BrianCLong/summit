/**
 * @intelgraph/metrics-exporter
 *
 * Prometheus metrics exporter for IntelGraph services.
 * Provides golden signals (latency, traffic, errors, saturation) and business metrics.
 */

import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';

export interface MetricsConfig {
  /** Service name for metric labels */
  serviceName: string;
  /** Environment (dev, staging, prod) */
  environment?: string;
  /** Enable default Node.js metrics */
  enableDefaultMetrics?: boolean;
  /** Default metrics collection interval (ms) */
  defaultMetricsInterval?: number;
  /** Custom labels to add to all metrics */
  labels?: Record<string, string>;
}

export interface RequestMetrics {
  /** HTTP method */
  method: string;
  /** Route or endpoint path */
  route: string;
  /** HTTP status code */
  statusCode: number;
  /** Request duration in seconds */
  duration: number;
  /** Whether request was successful */
  success: boolean;
}

export interface CostMetrics {
  /** Tenant ID */
  tenantId: string;
  /** Operation type (query, mutation, ingestion) */
  operation: string;
  /** Estimated cost in dollars */
  cost: number;
  /** Resource type (compute, storage, egress) */
  resourceType: string;
}

export interface QueryMetrics {
  /** Database type (neo4j, postgres, redis) */
  database: string;
  /** Query operation type */
  operation: string;
  /** Query duration in seconds */
  duration: number;
  /** Number of results returned */
  resultCount?: number;
  /** Whether query succeeded */
  success: boolean;
}

/**
 * MetricsExporter - Centralized metrics collection for IntelGraph services
 */
export class MetricsExporter {
  private registry: Registry;
  private config: Required<MetricsConfig>;

  // Golden Signals - Latency
  private httpRequestDuration: Histogram<string>;
  private graphqlRequestDuration: Histogram<string>;
  private databaseQueryDuration: Histogram<string>;

  // Golden Signals - Traffic
  private httpRequestsTotal: Counter<string>;
  private graphqlRequestsTotal: Counter<string>;
  private activeConnections: Gauge<string>;

  // Golden Signals - Errors
  private httpErrorsTotal: Counter<string>;
  private graphqlErrorsTotal: Counter<string>;
  private databaseErrorsTotal: Counter<string>;

  // Golden Signals - Saturation
  private cpuUsage: Gauge<string>;
  private memoryUsage: Gauge<string>;
  private databaseConnectionPool: Gauge<string>;

  // Cost & Budget Metrics
  private costTotal: Counter<string>;
  private budgetUtilization: Gauge<string>;
  private budgetViolations: Counter<string>;
  private slowQueriesKilled: Counter<string>;

  // Business Metrics
  private entitiesCreated: Counter<string>;
  private relationshipsCreated: Counter<string>;
  private investigationsCreated: Counter<string>;
  private copilotRequests: Counter<string>;

  constructor(config: MetricsConfig) {
    this.config = {
      environment: 'development',
      enableDefaultMetrics: true,
      defaultMetricsInterval: 10000,
      labels: {},
      ...config,
    };

    this.registry = new Registry();

    // Add default labels to all metrics
    this.registry.setDefaultLabels({
      service: this.config.serviceName,
      environment: this.config.environment,
      ...this.config.labels,
    });

    // Initialize golden signal metrics
    this.initializeLatencyMetrics();
    this.initializeTrafficMetrics();
    this.initializeErrorMetrics();
    this.initializeSaturationMetrics();

    // Initialize cost metrics
    this.initializeCostMetrics();

    // Initialize business metrics
    this.initializeBusinessMetrics();

    // Collect default Node.js metrics
    if (this.config.enableDefaultMetrics) {
      collectDefaultMetrics({
        register: this.registry,
        prefix: 'intelgraph_',
        gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
        eventLoopMonitoringPrecision: 10,
      });
    }
  }

  /**
   * Initialize latency metrics (golden signal #1)
   */
  private initializeLatencyMetrics(): void {
    this.httpRequestDuration = new Histogram({
      name: 'intelgraph_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.graphqlRequestDuration = new Histogram({
      name: 'intelgraph_graphql_request_duration_seconds',
      help: 'GraphQL request duration in seconds',
      labelNames: ['operation_name', 'operation_type', 'success'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.databaseQueryDuration = new Histogram({
      name: 'intelgraph_database_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['database', 'operation', 'success'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });
  }

  /**
   * Initialize traffic metrics (golden signal #2)
   */
  private initializeTrafficMetrics(): void {
    this.httpRequestsTotal = new Counter({
      name: 'intelgraph_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.graphqlRequestsTotal = new Counter({
      name: 'intelgraph_graphql_requests_total',
      help: 'Total number of GraphQL requests',
      labelNames: ['operation_name', 'operation_type'],
      registers: [this.registry],
    });

    this.activeConnections = new Gauge({
      name: 'intelgraph_active_connections',
      help: 'Number of active connections',
      labelNames: ['type'],
      registers: [this.registry],
    });
  }

  /**
   * Initialize error metrics (golden signal #3)
   */
  private initializeErrorMetrics(): void {
    this.httpErrorsTotal = new Counter({
      name: 'intelgraph_http_errors_total',
      help: 'Total number of HTTP errors',
      labelNames: ['method', 'route', 'status_code', 'error_type'],
      registers: [this.registry],
    });

    this.graphqlErrorsTotal = new Counter({
      name: 'intelgraph_graphql_errors_total',
      help: 'Total number of GraphQL errors',
      labelNames: ['operation_name', 'error_code'],
      registers: [this.registry],
    });

    this.databaseErrorsTotal = new Counter({
      name: 'intelgraph_database_errors_total',
      help: 'Total number of database errors',
      labelNames: ['database', 'operation', 'error_type'],
      registers: [this.registry],
    });
  }

  /**
   * Initialize saturation metrics (golden signal #4)
   */
  private initializeSaturationMetrics(): void {
    this.cpuUsage = new Gauge({
      name: 'intelgraph_cpu_usage_percent',
      help: 'CPU usage percentage',
      registers: [this.registry],
    });

    this.memoryUsage = new Gauge({
      name: 'intelgraph_memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type'],
      registers: [this.registry],
    });

    this.databaseConnectionPool = new Gauge({
      name: 'intelgraph_database_connection_pool',
      help: 'Database connection pool metrics',
      labelNames: ['database', 'state'],
      registers: [this.registry],
    });
  }

  /**
   * Initialize cost and budget metrics
   */
  private initializeCostMetrics(): void {
    this.costTotal = new Counter({
      name: 'intelgraph_cost_total_dollars',
      help: 'Total cost in dollars',
      labelNames: ['tenant_id', 'operation', 'resource_type'],
      registers: [this.registry],
    });

    this.budgetUtilization = new Gauge({
      name: 'intelgraph_budget_utilization_percent',
      help: 'Budget utilization percentage',
      labelNames: ['tenant_id', 'period'],
      registers: [this.registry],
    });

    this.budgetViolations = new Counter({
      name: 'intelgraph_budget_violations_total',
      help: 'Total number of budget violations',
      labelNames: ['tenant_id', 'violation_type'],
      registers: [this.registry],
    });

    this.slowQueriesKilled = new Counter({
      name: 'intelgraph_slow_queries_killed_total',
      help: 'Total number of slow queries killed',
      labelNames: ['database', 'tenant_id'],
      registers: [this.registry],
    });
  }

  /**
   * Initialize business domain metrics
   */
  private initializeBusinessMetrics(): void {
    this.entitiesCreated = new Counter({
      name: 'intelgraph_entities_created_total',
      help: 'Total number of entities created',
      labelNames: ['tenant_id', 'entity_type'],
      registers: [this.registry],
    });

    this.relationshipsCreated = new Counter({
      name: 'intelgraph_relationships_created_total',
      help: 'Total number of relationships created',
      labelNames: ['tenant_id', 'relationship_type'],
      registers: [this.registry],
    });

    this.investigationsCreated = new Counter({
      name: 'intelgraph_investigations_created_total',
      help: 'Total number of investigations created',
      labelNames: ['tenant_id'],
      registers: [this.registry],
    });

    this.copilotRequests = new Counter({
      name: 'intelgraph_copilot_requests_total',
      help: 'Total number of copilot requests',
      labelNames: ['tenant_id', 'request_type'],
      registers: [this.registry],
    });
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(metrics: RequestMetrics): void {
    const labels = {
      method: metrics.method,
      route: metrics.route,
      status_code: metrics.statusCode.toString(),
    };

    this.httpRequestDuration.observe(labels, metrics.duration);
    this.httpRequestsTotal.inc(labels);

    if (!metrics.success) {
      this.httpErrorsTotal.inc({
        ...labels,
        error_type: metrics.statusCode >= 500 ? 'server_error' : 'client_error',
      });
    }
  }

  /**
   * Record GraphQL request metrics
   */
  recordGraphQLRequest(
    operationName: string,
    operationType: string,
    duration: number,
    success: boolean,
    errorCode?: string
  ): void {
    const labels = {
      operation_name: operationName,
      operation_type: operationType,
    };

    this.graphqlRequestDuration.observe(
      { ...labels, success: success.toString() },
      duration
    );
    this.graphqlRequestsTotal.inc(labels);

    if (!success && errorCode) {
      this.graphqlErrorsTotal.inc({
        operation_name: operationName,
        error_code: errorCode,
      });
    }
  }

  /**
   * Record database query metrics
   */
  recordDatabaseQuery(metrics: QueryMetrics): void {
    const labels = {
      database: metrics.database,
      operation: metrics.operation,
      success: metrics.success.toString(),
    };

    this.databaseQueryDuration.observe(labels, metrics.duration);

    if (!metrics.success) {
      this.databaseErrorsTotal.inc({
        database: metrics.database,
        operation: metrics.operation,
        error_type: 'query_error',
      });
    }
  }

  /**
   * Record cost metrics
   */
  recordCost(metrics: CostMetrics): void {
    this.costTotal.inc(
      {
        tenant_id: metrics.tenantId,
        operation: metrics.operation,
        resource_type: metrics.resourceType,
      },
      metrics.cost
    );
  }

  /**
   * Update budget utilization
   */
  updateBudgetUtilization(
    tenantId: string,
    period: string,
    percentage: number
  ): void {
    this.budgetUtilization.set({ tenant_id: tenantId, period }, percentage);
  }

  /**
   * Record budget violation
   */
  recordBudgetViolation(tenantId: string, violationType: string): void {
    this.budgetViolations.inc({ tenant_id: tenantId, violation_type: violationType });
  }

  /**
   * Record slow query kill
   */
  recordSlowQueryKill(database: string, tenantId: string): void {
    this.slowQueriesKilled.inc({ database, tenant_id: tenantId });
  }

  /**
   * Record entity creation
   */
  recordEntityCreated(tenantId: string, entityType: string): void {
    this.entitiesCreated.inc({ tenant_id: tenantId, entity_type: entityType });
  }

  /**
   * Record relationship creation
   */
  recordRelationshipCreated(tenantId: string, relationshipType: string): void {
    this.relationshipsCreated.inc({
      tenant_id: tenantId,
      relationship_type: relationshipType,
    });
  }

  /**
   * Record investigation creation
   */
  recordInvestigationCreated(tenantId: string): void {
    this.investigationsCreated.inc({ tenant_id: tenantId });
  }

  /**
   * Record copilot request
   */
  recordCopilotRequest(tenantId: string, requestType: string): void {
    this.copilotRequests.inc({ tenant_id: tenantId, request_type: requestType });
  }

  /**
   * Update active connections
   */
  updateActiveConnections(type: string, count: number): void {
    this.activeConnections.set({ type }, count);
  }

  /**
   * Update database connection pool
   */
  updateDatabaseConnectionPool(
    database: string,
    state: 'active' | 'idle' | 'total',
    count: number
  ): void {
    this.databaseConnectionPool.set({ database, state }, count);
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Get metrics registry
   */
  getRegistry(): Registry {
    return this.registry;
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.registry.resetMetrics();
  }
}

/**
 * Create Express/Fastify middleware for automatic HTTP metrics collection
 */
export function createMetricsMiddleware(exporter: MetricsExporter) {
  return (req: any, res: any, next: any) => {
    const start = process.hrtime.bigint();

    // Track response finish
    res.on('finish', () => {
      const duration = Number(process.hrtime.bigint() - start) / 1e9; // Convert to seconds

      exporter.recordHttpRequest({
        method: req.method,
        route: req.route?.path || req.path || 'unknown',
        statusCode: res.statusCode,
        duration,
        success: res.statusCode < 400,
      });
    });

    next();
  };
}

/**
 * Create metrics endpoint handler
 */
export function createMetricsEndpoint(exporter: MetricsExporter) {
  return async (req: any, res: any) => {
    try {
      const metrics = await exporter.getMetrics();
      res.setHeader('Content-Type', exporter.getRegistry().contentType);
      res.send(metrics);
    } catch (error) {
      res.status(500).send('Error collecting metrics');
    }
  };
}

export default MetricsExporter;
