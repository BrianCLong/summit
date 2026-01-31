import client from 'prom-client';

export const orchestratorTasksTotal = new client.Counter({
    name: 'orchestrator_tasks_total',
    help: 'Total number of orchestrator tasks processed',
    labelNames: ['kind', 'status', 'worker_id']
});

export const orchestratorTaskDurationSeconds = new client.Histogram({
    name: 'orchestrator_task_duration_seconds',
    help: 'Duration of orchestrator tasks in seconds',
    labelNames: ['kind', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
});

export const orchestratorActiveTasksGauge = new client.Gauge({
    name: 'orchestrator_active_tasks',
    help: 'Number of currently active tasks on this worker',
    labelNames: ['worker_id']
});

export const orchestratorClaimedBatchSize = new client.Histogram({
    name: 'orchestrator_claimed_batch_size',
    help: 'Number of tasks claimed in a single poll',
    labelNames: ['worker_id'],
    buckets: [1, 5, 10, 20, 50]
});

export const orchestratorHeartbeatFailuresTotal = new client.Counter({
    name: 'orchestrator_heartbeat_failures_total',
    help: 'Total number of heartbeat failures',
    labelNames: ['worker_id', 'reason']
});

export const orchestratorReclaimsTotal = new client.Counter({
    name: 'orchestrator_reclaims_total',
    help: 'Total number of tasks reclaimed from other workers',
    labelNames: ['worker_id']
});

export const orchestratorPartitionDeletionsTotal = new client.Counter({
    name: 'orchestrator_partition_deletions_total',
    help: 'Total number of partitions dropped',
    labelNames: ['table_name', 'partition_name']
});
