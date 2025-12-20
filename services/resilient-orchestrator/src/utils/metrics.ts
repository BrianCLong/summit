/**
 * Prometheus Metrics for Resilient Orchestrator
 */

import { Registry, Counter, Gauge, Histogram } from 'prom-client';

export const registry = new Registry();

// Workflow metrics
export const workflowsTotal = new Counter({
  name: 'resilient_orchestrator_workflows_total',
  help: 'Total number of workflows processed',
  labelNames: ['state', 'priority'],
  registers: [registry],
});

export const workflowsActive = new Gauge({
  name: 'resilient_orchestrator_workflows_active',
  help: 'Number of currently active workflows',
  labelNames: ['state'],
  registers: [registry],
});

export const workflowDuration = new Histogram({
  name: 'resilient_orchestrator_workflow_duration_seconds',
  help: 'Workflow execution duration in seconds',
  labelNames: ['priority'],
  buckets: [1, 5, 15, 30, 60, 120, 300, 600],
  registers: [registry],
});

// Task metrics
export const tasksTotal = new Counter({
  name: 'resilient_orchestrator_tasks_total',
  help: 'Total number of tasks processed',
  labelNames: ['state', 'type'],
  registers: [registry],
});

export const taskRetries = new Counter({
  name: 'resilient_orchestrator_task_retries_total',
  help: 'Total number of task retries',
  labelNames: ['reason'],
  registers: [registry],
});

// Healing metrics
export const healingActionsTotal = new Counter({
  name: 'resilient_orchestrator_healing_actions_total',
  help: 'Total number of healing actions',
  labelNames: ['strategy', 'success'],
  registers: [registry],
});

export const healingDuration = new Histogram({
  name: 'resilient_orchestrator_healing_duration_seconds',
  help: 'Healing action duration in seconds',
  labelNames: ['strategy'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [registry],
});

// Network metrics
export const networkNodesTotal = new Gauge({
  name: 'resilient_orchestrator_network_nodes_total',
  help: 'Total number of network nodes',
  labelNames: ['type', 'condition'],
  registers: [registry],
});

export const failoversTotal = new Counter({
  name: 'resilient_orchestrator_failovers_total',
  help: 'Total number of failover events',
  labelNames: ['from_channel', 'to_channel', 'reason'],
  registers: [registry],
});

export const activeChannel = new Gauge({
  name: 'resilient_orchestrator_active_channel',
  help: 'Currently active communication channel (1=active)',
  labelNames: ['channel'],
  registers: [registry],
});

// Satellite metrics
export const satelliteQueueDepth = new Gauge({
  name: 'resilient_orchestrator_satellite_queue_depth',
  help: 'Number of messages in satellite queue',
  labelNames: ['priority'],
  registers: [registry],
});

export const satelliteBandwidth = new Gauge({
  name: 'resilient_orchestrator_satellite_bandwidth_kbps',
  help: 'Available satellite bandwidth in Kbps',
  labelNames: ['link_id'],
  registers: [registry],
});

// Coalition metrics
export const coalitionPartnersActive = new Gauge({
  name: 'resilient_orchestrator_coalition_partners_active',
  help: 'Number of active coalition partners',
  registers: [registry],
});

export const coalitionTasksDelegated = new Counter({
  name: 'resilient_orchestrator_coalition_tasks_delegated_total',
  help: 'Total number of tasks delegated to coalition partners',
  labelNames: ['partner_id', 'status'],
  registers: [registry],
});

export const coalitionTrustLevel = new Gauge({
  name: 'resilient_orchestrator_coalition_trust_level',
  help: 'Trust level for coalition partners',
  labelNames: ['partner_id'],
  registers: [registry],
});

// Reporting metrics
export const reportsSent = new Counter({
  name: 'resilient_orchestrator_reports_sent_total',
  help: 'Total number of reports sent',
  labelNames: ['type', 'priority', 'classification'],
  registers: [registry],
});

export const reportLatency = new Histogram({
  name: 'resilient_orchestrator_report_latency_seconds',
  help: 'Report delivery latency in seconds',
  labelNames: ['type', 'destination'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [registry],
});

// Checkpoint metrics
export const checkpointsCreated = new Counter({
  name: 'resilient_orchestrator_checkpoints_created_total',
  help: 'Total number of checkpoints created',
  registers: [registry],
});

export const checkpointSize = new Histogram({
  name: 'resilient_orchestrator_checkpoint_size_bytes',
  help: 'Checkpoint size in bytes',
  buckets: [1024, 10240, 102400, 1048576, 10485760],
  registers: [registry],
});
