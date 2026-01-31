import { Counter, Gauge, Histogram, Registry, register } from 'prom-client';

export class OrchestratorMetrics {
    private static instance: OrchestratorMetrics;
    private registry: Registry;

    // Counters
    public tasksClaimedTotal: Counter;
    public tasksCompletedTotal: Counter;
    public tasksFailedTotal: Counter;
    public tasksReclaimedTotal: Counter;
    public versionConflictsTotal: Counter;

    // Gauges
    public readyBacklog: Gauge;
    public runningBacklog: Gauge;
    public outboxBacklog: Gauge;

    // Histograms
    public claimLatency: Histogram;
    public taskDuration: Histogram;
    public outboxAge: Histogram;

    constructor(registry: Registry = register) {
        this.registry = registry;

        const prefix = 'orchestrator';

        this.tasksClaimedTotal = new Counter({
            name: `${prefix}_tasks_claimed_total`,
            help: 'Total number of tasks claimed by workers',
            labelNames: ['worker_id', 'subject'],
            registers: [this.registry],
        });

        this.tasksCompletedTotal = new Counter({
            name: `${prefix}_tasks_completed_total`,
            help: 'Total number of tasks successfully completed',
            labelNames: ['subject'],
            registers: [this.registry],
        });

        this.tasksFailedTotal = new Counter({
            name: `${prefix}_tasks_failed_total`,
            help: 'Total number of tasks that failed',
            labelNames: ['subject', 'error_type'],
            registers: [this.registry],
        });

        this.tasksReclaimedTotal = new Counter({
            name: `${prefix}_tasks_reclaimed_total`,
            help: 'Total number of tasks reclaimed after lease expiry',
            labelNames: ['subject'],
            registers: [this.registry],
        });

        this.versionConflictsTotal = new Counter({
            name: `${prefix}_version_conflicts_total`,
            help: 'Total number of optimistic concurrency (version) conflicts',
            labelNames: ['operation'],
            registers: [this.registry],
        });

        this.readyBacklog = new Gauge({
            name: `${prefix}_ready_backlog`,
            help: 'Number of tasks ready for processing',
            registers: [this.registry],
        });

        this.runningBacklog = new Gauge({
            name: `${prefix}_running_backlog`,
            help: 'Number of tasks currently in progress',
            registers: [this.registry],
        });

        this.outboxBacklog = new Gauge({
            name: `${prefix}_outbox_backlog`,
            help: 'Number of unsent events in the outbox',
            registers: [this.registry],
        });

        this.claimLatency = new Histogram({
            name: `${prefix}_claim_latency_ms`,
            help: 'Latency to claim a task in milliseconds',
            buckets: [5, 10, 25, 50, 100, 250, 500, 1000],
            registers: [this.registry],
        });

        this.taskDuration = new Histogram({
            name: `${prefix}_task_duration_ms`,
            help: 'Total task execution duration in milliseconds',
            labelNames: ['subject'],
            buckets: [100, 500, 1000, 5000, 10000, 30000, 60000],
            registers: [this.registry],
        });

        this.outboxAge = new Histogram({
            name: `${prefix}_outbox_age_ms`,
            help: 'Time an event spent in the outbox before being processed',
            buckets: [100, 500, 1000, 5000, 10000],
            registers: [this.registry],
        });
    }

    public static getInstance(registry?: Registry): OrchestratorMetrics {
        if (!OrchestratorMetrics.instance) {
            OrchestratorMetrics.instance = new OrchestratorMetrics(registry);
        }
        return OrchestratorMetrics.instance;
    }
}

export const orchestratorMetrics = OrchestratorMetrics.getInstance();
