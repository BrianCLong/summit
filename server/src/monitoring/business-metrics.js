"use strict";
/**
 * Business Metrics Tracking
 * Tracks key business metrics for the IntelGraph platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessMetricsCollector = void 0;
exports.initializeBusinessMetrics = initializeBusinessMetrics;
exports.getBusinessMetrics = getBusinessMetrics;
const prom_client_1 = require("prom-client");
class BusinessMetricsCollector {
    registry;
    // Active Users Metrics
    activeUsersGauge;
    userSessionsGauge;
    userLoginCounter;
    // API Request Metrics
    apiRequestsCounter;
    apiRequestsByTenantCounter;
    apiRequestDuration;
    // Graph Analysis Metrics
    graphJobsQueuedGauge;
    graphJobsCompletedCounter;
    graphJobsFailedCounter;
    graphAnalysisDuration;
    // Data Ingestion Metrics
    dataIngestionRateGauge;
    dataIngestionBytesCounter;
    dataIngestionRecordsCounter;
    dataIngestionErrorsCounter;
    // Entity & Relationship Metrics
    totalEntitiesGauge;
    totalRelationshipsGauge;
    entitiesCreatedCounter;
    relationshipsCreatedCounter;
    // Investigation Metrics
    activeInvestigationsGauge;
    investigationsCreatedCounter;
    investigationsCompletedCounter;
    investigationDuration;
    // Export Metrics
    exportsStartedCounter;
    exportsCompletedCounter;
    exportsFailedCounter;
    exportDuration;
    constructor(registry) {
        this.registry = registry;
        this.initializeMetrics();
    }
    initializeMetrics() {
        // ===== Active Users Metrics =====
        this.activeUsersGauge = new prom_client_1.Gauge({
            name: 'intelgraph_active_users',
            help: 'Number of currently active users',
            labelNames: ['tenant_id', 'user_role', 'subscription_tier'],
            registers: [this.registry],
        });
        this.userSessionsGauge = new prom_client_1.Gauge({
            name: 'intelgraph_user_sessions',
            help: 'Number of active user sessions',
            labelNames: ['tenant_id'],
            registers: [this.registry],
        });
        this.userLoginCounter = new prom_client_1.Counter({
            name: 'intelgraph_user_logins_total',
            help: 'Total number of user logins',
            labelNames: ['tenant_id', 'method', 'status'],
            registers: [this.registry],
        });
        // ===== API Request Metrics =====
        this.apiRequestsCounter = new prom_client_1.Counter({
            name: 'intelgraph_api_requests_total',
            help: 'Total number of API requests',
            labelNames: ['endpoint', 'method', 'status_code', 'tenant_id'],
            registers: [this.registry],
        });
        this.apiRequestsByTenantCounter = new prom_client_1.Counter({
            name: 'intelgraph_api_requests_by_tenant_total',
            help: 'API requests grouped by tenant',
            labelNames: ['tenant_id', 'subscription_tier'],
            registers: [this.registry],
        });
        this.apiRequestDuration = new prom_client_1.Histogram({
            name: 'intelgraph_api_request_duration_seconds',
            help: 'API request duration in seconds',
            labelNames: ['endpoint', 'method', 'tenant_id'],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
            registers: [this.registry],
        });
        // ===== Graph Analysis Metrics =====
        this.graphJobsQueuedGauge = new prom_client_1.Gauge({
            name: 'intelgraph_graph_jobs_queued',
            help: 'Number of graph analysis jobs in queue',
            labelNames: ['job_type', 'tenant_id'],
            registers: [this.registry],
        });
        this.graphJobsCompletedCounter = new prom_client_1.Counter({
            name: 'intelgraph_graph_jobs_completed_total',
            help: 'Total number of completed graph analysis jobs',
            labelNames: ['job_type', 'tenant_id', 'status'],
            registers: [this.registry],
        });
        this.graphJobsFailedCounter = new prom_client_1.Counter({
            name: 'intelgraph_graph_jobs_failed_total',
            help: 'Total number of failed graph analysis jobs',
            labelNames: ['job_type', 'tenant_id', 'error_type'],
            registers: [this.registry],
        });
        this.graphAnalysisDuration = new prom_client_1.Histogram({
            name: 'intelgraph_graph_analysis_duration_seconds',
            help: 'Graph analysis job duration in seconds',
            labelNames: ['job_type', 'tenant_id'],
            buckets: [1, 5, 10, 30, 60, 120, 300, 600, 1200, 1800],
            registers: [this.registry],
        });
        // ===== Data Ingestion Metrics =====
        this.dataIngestionRateGauge = new prom_client_1.Gauge({
            name: 'intelgraph_ingestion_rate',
            help: 'Current data ingestion rate (records/sec)',
            labelNames: ['source_type', 'tenant_id'],
            registers: [this.registry],
        });
        this.dataIngestionBytesCounter = new prom_client_1.Counter({
            name: 'intelgraph_ingestion_bytes_total',
            help: 'Total bytes ingested',
            labelNames: ['source_type', 'tenant_id'],
            registers: [this.registry],
        });
        this.dataIngestionRecordsCounter = new prom_client_1.Counter({
            name: 'intelgraph_ingestion_records_total',
            help: 'Total records ingested',
            labelNames: ['source_type', 'tenant_id', 'status'],
            registers: [this.registry],
        });
        this.dataIngestionErrorsCounter = new prom_client_1.Counter({
            name: 'intelgraph_ingestion_errors_total',
            help: 'Total data ingestion errors',
            labelNames: ['source_type', 'tenant_id', 'error_type'],
            registers: [this.registry],
        });
        // ===== Entity & Relationship Metrics =====
        this.totalEntitiesGauge = new prom_client_1.Gauge({
            name: 'intelgraph_entities_total',
            help: 'Total number of entities in the graph',
            labelNames: ['tenant_id', 'entity_type'],
            registers: [this.registry],
        });
        this.totalRelationshipsGauge = new prom_client_1.Gauge({
            name: 'intelgraph_relationships_total',
            help: 'Total number of relationships in the graph',
            labelNames: ['tenant_id', 'relationship_type'],
            registers: [this.registry],
        });
        this.entitiesCreatedCounter = new prom_client_1.Counter({
            name: 'intelgraph_entities_created_total',
            help: 'Total entities created',
            labelNames: ['tenant_id', 'entity_type', 'source'],
            registers: [this.registry],
        });
        this.relationshipsCreatedCounter = new prom_client_1.Counter({
            name: 'intelgraph_relationships_created_total',
            help: 'Total relationships created',
            labelNames: ['tenant_id', 'relationship_type', 'source'],
            registers: [this.registry],
        });
        // ===== Investigation Metrics =====
        this.activeInvestigationsGauge = new prom_client_1.Gauge({
            name: 'intelgraph_investigations_active',
            help: 'Number of active investigations',
            labelNames: ['tenant_id', 'priority'],
            registers: [this.registry],
        });
        this.investigationsCreatedCounter = new prom_client_1.Counter({
            name: 'intelgraph_investigations_created_total',
            help: 'Total investigations created',
            labelNames: ['tenant_id', 'type', 'priority'],
            registers: [this.registry],
        });
        this.investigationsCompletedCounter = new prom_client_1.Counter({
            name: 'intelgraph_investigations_completed_total',
            help: 'Total investigations completed',
            labelNames: ['tenant_id', 'type', 'status'],
            registers: [this.registry],
        });
        this.investigationDuration = new prom_client_1.Histogram({
            name: 'intelgraph_investigation_duration_seconds',
            help: 'Investigation duration from creation to completion',
            labelNames: ['tenant_id', 'type'],
            buckets: [
                3600, 7200, 14400, 28800, 43200, 86400, 172800, 259200, 345600, 432000,
            ], // 1h to 5 days
            registers: [this.registry],
        });
        // ===== Export Metrics =====
        this.exportsStartedCounter = new prom_client_1.Counter({
            name: 'intelgraph_exports_started_total',
            help: 'Total exports started',
            labelNames: ['tenant_id', 'export_type', 'format'],
            registers: [this.registry],
        });
        this.exportsCompletedCounter = new prom_client_1.Counter({
            name: 'intelgraph_exports_completed_total',
            help: 'Total exports completed',
            labelNames: ['tenant_id', 'export_type', 'format', 'status'],
            registers: [this.registry],
        });
        this.exportsFailedCounter = new prom_client_1.Counter({
            name: 'intelgraph_exports_failed_total',
            help: 'Total exports failed',
            labelNames: ['tenant_id', 'export_type', 'error_type'],
            registers: [this.registry],
        });
        this.exportDuration = new prom_client_1.Histogram({
            name: 'intelgraph_export_duration_seconds',
            help: 'Export duration in seconds',
            labelNames: ['tenant_id', 'export_type', 'format'],
            buckets: [1, 5, 10, 30, 60, 120, 300, 600],
            registers: [this.registry],
        });
    }
    // ===== Active Users Methods =====
    setActiveUsers(count, tenantId, role, tier) {
        this.activeUsersGauge.set({ tenant_id: tenantId, user_role: role, subscription_tier: tier }, count);
    }
    setUserSessions(count, tenantId) {
        this.userSessionsGauge.set({ tenant_id: tenantId }, count);
    }
    recordUserLogin(tenantId, method, status) {
        this.userLoginCounter.inc({ tenant_id: tenantId, method, status });
    }
    // ===== API Request Methods =====
    recordAPIRequest(endpoint, method, statusCode, tenantId, duration) {
        this.apiRequestsCounter.inc({
            endpoint,
            method,
            status_code: statusCode.toString(),
            tenant_id: tenantId,
        });
        this.apiRequestDuration.observe({ endpoint, method, tenant_id: tenantId }, duration);
    }
    recordAPIRequestByTenant(tenantId, tier) {
        this.apiRequestsByTenantCounter.inc({
            tenant_id: tenantId,
            subscription_tier: tier,
        });
    }
    // ===== Graph Analysis Methods =====
    setGraphJobsQueued(count, jobType, tenantId) {
        this.graphJobsQueuedGauge.set({ job_type: jobType, tenant_id: tenantId }, count);
    }
    recordGraphJobCompleted(jobType, tenantId, status, duration) {
        this.graphJobsCompletedCounter.inc({
            job_type: jobType,
            tenant_id: tenantId,
            status,
        });
        this.graphAnalysisDuration.observe({ job_type: jobType, tenant_id: tenantId }, duration);
    }
    recordGraphJobFailed(jobType, tenantId, errorType) {
        this.graphJobsFailedCounter.inc({
            job_type: jobType,
            tenant_id: tenantId,
            error_type: errorType,
        });
    }
    // ===== Data Ingestion Methods =====
    setDataIngestionRate(rate, sourceType, tenantId) {
        this.dataIngestionRateGauge.set({ source_type: sourceType, tenant_id: tenantId }, rate);
    }
    recordDataIngestion(bytes, records, sourceType, tenantId, status) {
        this.dataIngestionBytesCounter.inc({ source_type: sourceType, tenant_id: tenantId }, bytes);
        this.dataIngestionRecordsCounter.inc({ source_type: sourceType, tenant_id: tenantId, status }, records);
    }
    recordDataIngestionError(sourceType, tenantId, errorType) {
        this.dataIngestionErrorsCounter.inc({
            source_type: sourceType,
            tenant_id: tenantId,
            error_type: errorType,
        });
    }
    // ===== Entity & Relationship Methods =====
    setTotalEntities(count, tenantId, entityType) {
        this.totalEntitiesGauge.set({ tenant_id: tenantId, entity_type: entityType }, count);
    }
    setTotalRelationships(count, tenantId, relationshipType) {
        this.totalRelationshipsGauge.set({ tenant_id: tenantId, relationship_type: relationshipType }, count);
    }
    recordEntityCreated(tenantId, entityType, source) {
        this.entitiesCreatedCounter.inc({
            tenant_id: tenantId,
            entity_type: entityType,
            source,
        });
    }
    recordRelationshipCreated(tenantId, relationshipType, source) {
        this.relationshipsCreatedCounter.inc({
            tenant_id: tenantId,
            relationship_type: relationshipType,
            source,
        });
    }
    // ===== Investigation Methods =====
    setActiveInvestigations(count, tenantId, priority) {
        this.activeInvestigationsGauge.set({ tenant_id: tenantId, priority }, count);
    }
    recordInvestigationCreated(tenantId, type, priority) {
        this.investigationsCreatedCounter.inc({
            tenant_id: tenantId,
            type,
            priority,
        });
    }
    recordInvestigationCompleted(tenantId, type, status, duration) {
        this.investigationsCompletedCounter.inc({
            tenant_id: tenantId,
            type,
            status,
        });
        this.investigationDuration.observe({ tenant_id: tenantId, type }, duration);
    }
    // ===== Export Methods =====
    recordExportStarted(tenantId, exportType, format) {
        this.exportsStartedCounter.inc({
            tenant_id: tenantId,
            export_type: exportType,
            format,
        });
    }
    recordExportCompleted(tenantId, exportType, format, status, duration) {
        this.exportsCompletedCounter.inc({
            tenant_id: tenantId,
            export_type: exportType,
            format,
            status,
        });
        this.exportDuration.observe({ tenant_id: tenantId, export_type: exportType, format }, duration);
    }
    recordExportFailed(tenantId, exportType, errorType) {
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
    async collectAllMetrics() {
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
        }
        catch (error) {
            console.error('Error collecting business metrics:', error);
        }
    }
}
exports.BusinessMetricsCollector = BusinessMetricsCollector;
// Singleton instance
let businessMetricsInstance = null;
function initializeBusinessMetrics(registry) {
    if (!businessMetricsInstance) {
        businessMetricsInstance = new BusinessMetricsCollector(registry);
    }
    return businessMetricsInstance;
}
function getBusinessMetrics() {
    if (!businessMetricsInstance) {
        throw new Error('Business metrics not initialized. Call initializeBusinessMetrics first.');
    }
    return businessMetricsInstance;
}
