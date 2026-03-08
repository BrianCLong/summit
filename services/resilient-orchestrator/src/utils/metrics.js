"use strict";
/**
 * Prometheus Metrics for Resilient Orchestrator
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkpointSize = exports.checkpointsCreated = exports.reportLatency = exports.reportsSent = exports.coalitionTrustLevel = exports.coalitionTasksDelegated = exports.coalitionPartnersActive = exports.satelliteBandwidth = exports.satelliteQueueDepth = exports.activeChannel = exports.failoversTotal = exports.networkNodesTotal = exports.healingDuration = exports.healingActionsTotal = exports.taskRetries = exports.tasksTotal = exports.workflowDuration = exports.workflowsActive = exports.workflowsTotal = exports.registry = void 0;
const prom_client_1 = require("prom-client");
exports.registry = new prom_client_1.Registry();
// Workflow metrics
exports.workflowsTotal = new prom_client_1.Counter({
    name: 'resilient_orchestrator_workflows_total',
    help: 'Total number of workflows processed',
    labelNames: ['state', 'priority'],
    registers: [exports.registry],
});
exports.workflowsActive = new prom_client_1.Gauge({
    name: 'resilient_orchestrator_workflows_active',
    help: 'Number of currently active workflows',
    labelNames: ['state'],
    registers: [exports.registry],
});
exports.workflowDuration = new prom_client_1.Histogram({
    name: 'resilient_orchestrator_workflow_duration_seconds',
    help: 'Workflow execution duration in seconds',
    labelNames: ['priority'],
    buckets: [1, 5, 15, 30, 60, 120, 300, 600],
    registers: [exports.registry],
});
// Task metrics
exports.tasksTotal = new prom_client_1.Counter({
    name: 'resilient_orchestrator_tasks_total',
    help: 'Total number of tasks processed',
    labelNames: ['state', 'type'],
    registers: [exports.registry],
});
exports.taskRetries = new prom_client_1.Counter({
    name: 'resilient_orchestrator_task_retries_total',
    help: 'Total number of task retries',
    labelNames: ['reason'],
    registers: [exports.registry],
});
// Healing metrics
exports.healingActionsTotal = new prom_client_1.Counter({
    name: 'resilient_orchestrator_healing_actions_total',
    help: 'Total number of healing actions',
    labelNames: ['strategy', 'success'],
    registers: [exports.registry],
});
exports.healingDuration = new prom_client_1.Histogram({
    name: 'resilient_orchestrator_healing_duration_seconds',
    help: 'Healing action duration in seconds',
    labelNames: ['strategy'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    registers: [exports.registry],
});
// Network metrics
exports.networkNodesTotal = new prom_client_1.Gauge({
    name: 'resilient_orchestrator_network_nodes_total',
    help: 'Total number of network nodes',
    labelNames: ['type', 'condition'],
    registers: [exports.registry],
});
exports.failoversTotal = new prom_client_1.Counter({
    name: 'resilient_orchestrator_failovers_total',
    help: 'Total number of failover events',
    labelNames: ['from_channel', 'to_channel', 'reason'],
    registers: [exports.registry],
});
exports.activeChannel = new prom_client_1.Gauge({
    name: 'resilient_orchestrator_active_channel',
    help: 'Currently active communication channel (1=active)',
    labelNames: ['channel'],
    registers: [exports.registry],
});
// Satellite metrics
exports.satelliteQueueDepth = new prom_client_1.Gauge({
    name: 'resilient_orchestrator_satellite_queue_depth',
    help: 'Number of messages in satellite queue',
    labelNames: ['priority'],
    registers: [exports.registry],
});
exports.satelliteBandwidth = new prom_client_1.Gauge({
    name: 'resilient_orchestrator_satellite_bandwidth_kbps',
    help: 'Available satellite bandwidth in Kbps',
    labelNames: ['link_id'],
    registers: [exports.registry],
});
// Coalition metrics
exports.coalitionPartnersActive = new prom_client_1.Gauge({
    name: 'resilient_orchestrator_coalition_partners_active',
    help: 'Number of active coalition partners',
    registers: [exports.registry],
});
exports.coalitionTasksDelegated = new prom_client_1.Counter({
    name: 'resilient_orchestrator_coalition_tasks_delegated_total',
    help: 'Total number of tasks delegated to coalition partners',
    labelNames: ['partner_id', 'status'],
    registers: [exports.registry],
});
exports.coalitionTrustLevel = new prom_client_1.Gauge({
    name: 'resilient_orchestrator_coalition_trust_level',
    help: 'Trust level for coalition partners',
    labelNames: ['partner_id'],
    registers: [exports.registry],
});
// Reporting metrics
exports.reportsSent = new prom_client_1.Counter({
    name: 'resilient_orchestrator_reports_sent_total',
    help: 'Total number of reports sent',
    labelNames: ['type', 'priority', 'classification'],
    registers: [exports.registry],
});
exports.reportLatency = new prom_client_1.Histogram({
    name: 'resilient_orchestrator_report_latency_seconds',
    help: 'Report delivery latency in seconds',
    labelNames: ['type', 'destination'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [exports.registry],
});
// Checkpoint metrics
exports.checkpointsCreated = new prom_client_1.Counter({
    name: 'resilient_orchestrator_checkpoints_created_total',
    help: 'Total number of checkpoints created',
    registers: [exports.registry],
});
exports.checkpointSize = new prom_client_1.Histogram({
    name: 'resilient_orchestrator_checkpoint_size_bytes',
    help: 'Checkpoint size in bytes',
    buckets: [1024, 10240, 102400, 1048576, 10485760],
    registers: [exports.registry],
});
