/**
 * Business Metrics Tracking
 * Tracks key business metrics for the IntelGraph platform
 */

import { Counter, Gauge, Histogram, Registry } from 'prom-client';

export class BusinessMetricsCollector {
  private registry: Registry;

  // Active Users Metrics
  private activeUsersGauge: Gauge;
  private userSessionsGauge: Gauge;
  private userLoginCounter: Counter;

  // API Request Metrics
  private apiRequestsCounter: Counter;
  private apiRequestsByTenantCounter: Counter;
  private apiRequestDuration: Histogram;

  // Graph Analysis Metrics
  private graphJobsQueuedGauge: Gauge;
  private graphJobsCompletedCounter: Counter;
  private graphJobsFailedCounter: Counter;
  private graphAnalysisDuration: Histogram;

  // Data Ingestion Metrics
  private dataIngestionRateGauge: Gauge;
  private dataIngestionBytesCounter: Counter;
  private dataIngestionRecordsCounter: Counter;
  private dataIngestionErrorsCounter: Counter;

  // Entity & Relationship Metrics
  private totalEntitiesGauge: Gauge;
  private totalRelationshipsGauge: Gauge;
  private entitiesCreatedCounter: Counter;
  private relationshipsCreatedCounter: Counter;

  // Investigation Metrics
  private activeInvestigationsGauge: Gauge;
  private investigationsCreatedCounter: Counter;
  private investigationsCompletedCounter: Counter;
  private investigationDuration: Histogram;

  // Export Metrics
  private exportsStartedCounter: Counter;
  private exportsCompletedCounter: Counter;
  private exportsFailedCounter: Counter;
  private exportDuration: Histogram;

  constructor(registry: Registry) {
    this.registry = registry;
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    // ===== Active Users Metrics =====
    this.activeUsersGauge = new Gauge({
      name: 'intelgraph_active_users',
      help: 'Number of currently active users',
      labelNames: ['tenant_id', 'user_role', 'subscription_tier'],
      registers: [this.registry],
    });

    this.userSessionsGauge = new Gauge({
      name: 'intelgraph_user_sessions',
      help: 'Number of active user sessions',
      labelNames: ['tenant_id'],
      registers: [this.registry],
    });

    this.userLoginCounter = new Counter({
      name: 'intelgraph_user_logins_total',
      help: 'Total number of user logins',
      labelNames: ['tenant_id', 'method', 'status'],
      registers: [this.registry],
    });

    // ===== API Request Metrics =====
    this.apiRequestsCounter = new Counter({
      name: 'intelgraph_api_requests_total',
      help: 'Total number of API requests',
      labelNames: ['endpoint', 'method', 'status_code', 'tenant_id'],
      registers: [this.registry],
    });

    this.apiRequestsByTenantCounter = new Counter({
      name: 'intelgraph_api_requests_by_tenant_total',
      help: 'API requests grouped by tenant',
      labelNames: ['tenant_id', 'subscription_tier'],
      registers: [this.registry],
    });

    this.apiRequestDuration = new Histogram({
      name: 'intelgraph_api_request_duration_seconds',
      help: 'API request duration in seconds',
      labelNames: ['endpoint', 'method', 'tenant_id'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });

    // ===== Graph Analysis Metrics =====
    this.graphJobsQueuedGauge = new Gauge({
      name: 'intelgraph_graph_jobs_queued',
      help: 'Number of graph analysis jobs in queue',
      labelNames: ['job_type', 'tenant_id'],
      registers: [this.registry],
    });

    this.graphJobsCompletedCounter = new Counter({
      name: 'intelgraph_graph_jobs_completed_total',
      help: 'Total number of completed graph analysis jobs',
      labelNames: ['job_type', 'tenant_id', 'status'],
      registers: [this.registry],
    });

    this.graphJobsFailedCounter = new Counter({
      name: 'intelgraph_graph_jobs_failed_total',
      help: 'Total number of failed graph analysis jobs',
      labelNames: ['job_type', 'tenant_id', 'error_type'],
      registers: [this.registry],
    });

    this.graphAnalysisDuration = new Histogram({
      name: 'intelgraph_graph_analysis_duration_seconds',
      help: 'Graph analysis job duration in seconds',
      labelNames: ['job_type', 'tenant_id'],
      buckets: [1, 5, 10, 30, 60, 120, 300, 600, 1200, 1800],
      registers: [this.registry],
    });

    // ===== Data Ingestion Metrics =====
    this.dataIngestionRateGauge = new Gauge({
      name: 'intelgraph_ingestion_rate',
      help: 'Current data ingestion rate (records/sec)',
      labelNames: ['source_type', 'tenant_id'],
      registers: [this.registry],
    });

    this.dataIngestionBytesCounter = new Counter({
      name: 'intelgraph_ingestion_bytes_total',
      help: 'Total bytes ingested',
      labelNames: ['source_type', 'tenant_id'],
      registers: [this.registry],
    });

    this.dataIngestionRecordsCounter = new Counter({
      name: 'intelgraph_ingestion_records_total',
      help: 'Total records ingested',
      labelNames: ['source_type', 'tenant_id', 'status'],
      registers: [this.registry],
    });

    this.dataIngestionErrorsCounter = new Counter({
      name: 'intelgraph_ingestion_errors_total',
      help: 'Total data ingestion errors',
      labelNames: ['source_type', 'tenant_id', 'error_type'],
      registers: [this.registry],
    });

    // ===== Entity & Relationship Metrics =====
    this.totalEntitiesGauge = new Gauge({
      name: 'intelgraph_entities_total',
      help: 'Total number of entities in the graph',
      labelNames: ['tenant_id', 'entity_type'],
      registers: [this.registry],
    });

    this.totalRelationshipsGauge = new Gauge({
      name: 'intelgraph_relationships_total',
      help: 'Total number of relationships in the graph',
      labelNames: ['tenant_id', 'relationship_type'],
      registers: [this.registry],
    });

    this.entitiesCreatedCounter = new Counter({
      name: 'intelgraph_entities_created_total',
      help: 'Total entities created',
      labelNames: ['tenant_id', 'entity_type', 'source'],
      registers: [this.registry],
    });

    this.relationshipsCreatedCounter = new Counter({
      name: 'intelgraph_relationships_created_total',
      help: 'Total relationships created',
      labelNames: ['tenant_id', 'relationship_type', 'source'],
      registers: [this.registry],
    });

    // ===== Investigation Metrics =====
    this.activeInvestigationsGauge = new Gauge({
      name: 'intelgraph_investigations_active',
      help: 'Number of active investigations',
      labelNames: ['tenant_id', 'priority'],
      registers: [this.registry],
    });

    this.investigationsCreatedCounter = new Counter({
      name: 'intelgraph_investigations_created_total',
      help: 'Total investigations created',
      labelNames: ['tenant_id', 'type', 'priority'],
      registers: [this.registry],
    });

    this.investigationsCompletedCounter = new Counter({
      name: 'intelgraph_investigations_completed_total',
      help: 'Total investigations completed',
      labelNames: ['tenant_id', 'type', 'status'],
      registers: [this.registry],
    });

    this.investigationDuration = new Histogram({
      name: 'intelgraph_investigation_duration_seconds',
      help: 'Investigation duration from creation to completion',
      labelNames: ['tenant_id', 'type'],
      buckets: [
        3600, 7200, 14400, 28800, 43200, 86400, 172800, 259200, 345600, 432000,
      ], // 1h to 5 days
      registers: [this.registry],
    });

    // ===== Export Metrics =====
    this.exportsStartedCounter = new Counter({
      name: 'intelgraph_exports_started_total',
      help: 'Total exports started',
      labelNames: ['tenant_id', 'export_type', 'format'],
      registers: [this.registry],
    });

    this.exportsCompletedCounter = new Counter({
      name: 'intelgraph_exports_completed_total',
      help: 'Total exports completed',
      labelNames: ['tenant_id', 'export_type', 'format', 'status'],
      registers: [this.registry],
    });

    this.exportsFailedCounter = new Counter({
      name: 'intelgraph_exports_failed_total',
      help: 'Total exports failed',
      labelNames: ['tenant_id', 'export_type', 'error_type'],
      registers: [this.registry],
    });

    this.exportDuration = new Histogram({
      name: 'intelgraph_export_duration_seconds',
      help: 'Export duration in seconds',
      labelNames: ['tenant_id', 'export_type', 'format'],
      buckets: [1, 5, 10, 30, 60, 120, 300, 600],
      registers: [this.registry],
    });
  }

  // ===== Active Users Methods =====
  public setActiveUsers(
    count: number,
    tenantId: string,
    role: string,
    tier: string,
  ): void {
    this.activeUsersGauge.set({ tenant_id: tenantId, user_role: role, subscription_tier: tier }, count);
  }

  public setUserSessions(count: number, tenantId: string): void {
    this.userSessionsGauge.set({ tenant_id: tenantId }, count);
  }

  public recordUserLogin(
    tenantId: string,
    method: string,
    status: 'success' | 'failure',
  ): void {
    this.userLoginCounter.inc({ tenant_id: tenantId, method, status });
  }

  // ===== API Request Methods =====
  public recordAPIRequest(
    endpoint: string,
    method: string,
    statusCode: number,
    tenantId: string,
    duration: number,
  ): void {
    this.apiRequestsCounter.inc({
      endpoint,
      method,
      status_code: statusCode.toString(),
      tenant_id: tenantId,
    });

    this.apiRequestDuration.observe(
      { endpoint, method, tenant_id: tenantId },
      duration,
    );
  }

  public recordAPIRequestByTenant(tenantId: string, tier: string): void {
    this.apiRequestsByTenantCounter.inc({
      tenant_id: tenantId,
      subscription_tier: tier,
    });
  }

  // ===== Graph Analysis Methods =====
  public setGraphJobsQueued(
    count: number,
    jobType: string,
    tenantId: string,
  ): void {
    this.graphJobsQueuedGauge.set({ job_type: jobType, tenant_id: tenantId }, count);
  }

  public recordGraphJobCompleted(
    jobType: string,
    tenantId: string,
    status: 'success' | 'failure',
    duration: number,
  ): void {
    this.graphJobsCompletedCounter.inc({
      job_type: jobType,
      tenant_id: tenantId,
      status,
    });

    this.graphAnalysisDuration.observe(
      { job_type: jobType, tenant_id: tenantId },
      duration,
    );
  }

  public recordGraphJobFailed(
    jobType: string,
    tenantId: string,
    errorType: string,
  ): void {
    this.graphJobsFailedCounter.inc({
      job_type: jobType,
      tenant_id: tenantId,
      error_type: errorType,
    });
  }

  // ===== Data Ingestion Methods =====
  public setDataIngestionRate(
    rate: number,
    sourceType: string,
    tenantId: string,
  ): void {
    this.dataIngestionRateGauge.set({ source_type: sourceType, tenant_id: tenantId }, rate);
  }

  public recordDataIngestion(
    bytes: number,
    records: number,
    sourceType: string,
    tenantId: string,
    status: 'success' | 'failure',
  ): void {
    this.dataIngestionBytesCounter.inc(
      { source_type: sourceType, tenant_id: tenantId },
      bytes,
    );

    this.dataIngestionRecordsCounter.inc(
      { source_type: sourceType, tenant_id: tenantId, status },
      records,
    );
  }

  public recordDataIngestionError(
    sourceType: string,
    tenantId: string,
    errorType: string,
  ): void {
    this.dataIngestionErrorsCounter.inc({
      source_type: sourceType,
      tenant_id: tenantId,
      error_type: errorType,
    });
  }

  // ===== Entity & Relationship Methods =====
  public setTotalEntities(
    count: number,
    tenantId: string,
    entityType: string,
  ): void {
    this.totalEntitiesGauge.set({ tenant_id: tenantId, entity_type: entityType }, count);
  }

  public setTotalRelationships(
    count: number,
    tenantId: string,
    relationshipType: string,
  ): void {
    this.totalRelationshipsGauge.set(
      { tenant_id: tenantId, relationship_type: relationshipType },
      count,
    );
  }

  public recordEntityCreated(
    tenantId: string,
    entityType: string,
    source: string,
  ): void {
    this.entitiesCreatedCounter.inc({
      tenant_id: tenantId,
      entity_type: entityType,
      source,
    });
  }

  public recordRelationshipCreated(
    tenantId: string,
    relationshipType: string,
    source: string,
  ): void {
    this.relationshipsCreatedCounter.inc({
      tenant_id: tenantId,
      relationship_type: relationshipType,
      source,
    });
  }

  // ===== Investigation Methods =====
  public setActiveInvestigations(
    count: number,
    tenantId: string,
    priority: string,
  ): void {
    this.activeInvestigationsGauge.set({ tenant_id: tenantId, priority }, count);
  }

  public recordInvestigationCreated(
    tenantId: string,
    type: string,
    priority: string,
  ): void {
    this.investigationsCreatedCounter.inc({
      tenant_id: tenantId,
      type,
      priority,
    });
  }

  public recordInvestigationCompleted(
    tenantId: string,
    type: string,
    status: string,
    duration: number,
  ): void {
    this.investigationsCompletedCounter.inc({
      tenant_id: tenantId,
      type,
      status,
    });

    this.investigationDuration.observe({ tenant_id: tenantId, type }, duration);
  }

  // ===== Export Methods =====
  public recordExportStarted(
    tenantId: string,
    exportType: string,
    format: string,
  ): void {
    this.exportsStartedCounter.inc({
      tenant_id: tenantId,
      export_type: exportType,
      format,
    });
  }

  public recordExportCompleted(
    tenantId: string,
    exportType: string,
    format: string,
    status: 'success' | 'failure',
    duration: number,
  ): void {
    this.exportsCompletedCounter.inc({
      tenant_id: tenantId,
      export_type: exportType,
      format,
      status,
    });

    this.exportDuration.observe(
      { tenant_id: tenantId, export_type: exportType, format },
      duration,
    );
  }

  public recordExportFailed(
    tenantId: string,
    exportType: string,
    errorType: string,
  ): void {
    this.exportsFailedCounter.inc({
      tenant_id: tenantId,
      export_type: exportType,
      error_type: errorType,
    });
  }

  /**
   * Collect and update all business metrics periodically
   * This should be called by a scheduled job
   */
  public async collectAllMetrics(): Promise<void> {
    try {
      // This would query your database to get current counts
      // Implementation depends on your data access layer
      console.log('Collecting business metrics...');

      // Example: Update active users count
      // const activeUsers = await getUsersRepository().getActiveUsersCount();
      // this.setActiveUsers(activeUsers, tenantId, role, tier);

      // Example: Update graph metrics
      // const queuedJobs = await getGraphJobsRepository().getQueuedJobsCount();
      // this.setGraphJobsQueued(queuedJobs, jobType, tenantId);

      // Add your metric collection logic here
    } catch (error) {
      console.error('Error collecting business metrics:', error);
    }
  }
}

// Singleton instance
let businessMetricsInstance: BusinessMetricsCollector | null = null;

export function initializeBusinessMetrics(registry: Registry): BusinessMetricsCollector {
  if (!businessMetricsInstance) {
    businessMetricsInstance = new BusinessMetricsCollector(registry);
  }
  return businessMetricsInstance;
}

export function getBusinessMetrics(): BusinessMetricsCollector {
  if (!businessMetricsInstance) {
    throw new Error(
      'Business metrics not initialized. Call initializeBusinessMetrics first.',
    );
  }
  return businessMetricsInstance;
}
