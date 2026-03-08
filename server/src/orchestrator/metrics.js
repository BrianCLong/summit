"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.orchestratorPartitionDeletionsTotal = exports.orchestratorReclaimsTotal = exports.orchestratorHeartbeatFailuresTotal = exports.orchestratorClaimedBatchSize = exports.orchestratorActiveTasksGauge = exports.orchestratorTaskDurationSeconds = exports.orchestratorTasksTotal = void 0;
const prom_client_1 = __importDefault(require("prom-client"));
exports.orchestratorTasksTotal = new prom_client_1.default.Counter({
    name: 'orchestrator_tasks_total',
    help: 'Total number of orchestrator tasks processed',
    labelNames: ['kind', 'status', 'worker_id']
});
exports.orchestratorTaskDurationSeconds = new prom_client_1.default.Histogram({
    name: 'orchestrator_task_duration_seconds',
    help: 'Duration of orchestrator tasks in seconds',
    labelNames: ['kind', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
});
exports.orchestratorActiveTasksGauge = new prom_client_1.default.Gauge({
    name: 'orchestrator_active_tasks',
    help: 'Number of currently active tasks on this worker',
    labelNames: ['worker_id']
});
exports.orchestratorClaimedBatchSize = new prom_client_1.default.Histogram({
    name: 'orchestrator_claimed_batch_size',
    help: 'Number of tasks claimed in a single poll',
    labelNames: ['worker_id'],
    buckets: [1, 5, 10, 20, 50]
});
exports.orchestratorHeartbeatFailuresTotal = new prom_client_1.default.Counter({
    name: 'orchestrator_heartbeat_failures_total',
    help: 'Total number of heartbeat failures',
    labelNames: ['worker_id', 'reason']
});
exports.orchestratorReclaimsTotal = new prom_client_1.default.Counter({
    name: 'orchestrator_reclaims_total',
    help: 'Total number of tasks reclaimed from other workers',
    labelNames: ['worker_id']
});
exports.orchestratorPartitionDeletionsTotal = new prom_client_1.default.Counter({
    name: 'orchestrator_partition_deletions_total',
    help: 'Total number of partitions dropped',
    labelNames: ['table_name', 'partition_name']
});
