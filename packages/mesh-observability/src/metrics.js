"use strict";
/**
 * Mesh Observability - Metrics Collection
 *
 * Provides consistent metrics collection across all mesh services.
 * Compatible with Prometheus exposition format.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Histogram = exports.Gauge = exports.Counter = exports.MetricsRegistry = void 0;
exports.createMeshMetrics = createMeshMetrics;
// ============================================================================
// METRIC REGISTRY
// ============================================================================
class MetricsRegistry {
    metrics = new Map();
    prefix;
    constructor(prefix = 'mesh') {
        this.prefix = prefix;
    }
    /**
     * Create or get a counter metric.
     */
    counter(config) {
        const name = `${this.prefix}_${config.name}`;
        let metric = this.metrics.get(name);
        if (!metric) {
            metric = new Counter({ ...config, name, type: 'counter' });
            this.metrics.set(name, metric);
        }
        return metric;
    }
    /**
     * Create or get a gauge metric.
     */
    gauge(config) {
        const name = `${this.prefix}_${config.name}`;
        let metric = this.metrics.get(name);
        if (!metric) {
            metric = new Gauge({ ...config, name, type: 'gauge' });
            this.metrics.set(name, metric);
        }
        return metric;
    }
    /**
     * Create or get a histogram metric.
     */
    histogram(config) {
        const name = `${this.prefix}_${config.name}`;
        let metric = this.metrics.get(name);
        if (!metric) {
            metric = new Histogram({
                ...config,
                name,
                type: 'histogram',
                buckets: config.buckets ?? DEFAULT_BUCKETS,
            });
            this.metrics.set(name, metric);
        }
        return metric;
    }
    /**
     * Export metrics in Prometheus format.
     */
    export() {
        const lines = [];
        for (const metric of this.metrics.values()) {
            lines.push(...metric.export());
        }
        return lines.join('\n');
    }
    /**
     * Reset all metrics.
     */
    reset() {
        for (const metric of this.metrics.values()) {
            metric.reset();
        }
    }
}
exports.MetricsRegistry = MetricsRegistry;
// ============================================================================
// METRIC IMPLEMENTATIONS
// ============================================================================
class Metric {
    config;
    values = new Map();
    constructor(config) {
        this.config = config;
    }
    labelsKey(labels) {
        return Object.entries(labels)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');
    }
    formatLabels(labels) {
        const entries = Object.entries(labels);
        if (entries.length === 0)
            return '';
        return `{${entries.map(([k, v]) => `${k}="${v}"`).join(',')}}`;
    }
}
class Counter extends Metric {
    /**
     * Increment the counter.
     */
    inc(labels = {}, value = 1) {
        const key = this.labelsKey(labels);
        this.values.set(key, (this.values.get(key) ?? 0) + value);
    }
    export() {
        const lines = [
            `# HELP ${this.config.name} ${this.config.help}`,
            `# TYPE ${this.config.name} counter`,
        ];
        for (const [key, value] of this.values) {
            const labels = key ? `{${key}}` : '';
            lines.push(`${this.config.name}${labels} ${value}`);
        }
        return lines;
    }
    reset() {
        this.values.clear();
    }
}
exports.Counter = Counter;
class Gauge extends Metric {
    /**
     * Set the gauge value.
     */
    set(labels = {}, value) {
        const key = this.labelsKey(labels);
        this.values.set(key, value);
    }
    /**
     * Increment the gauge.
     */
    inc(labels = {}, value = 1) {
        const key = this.labelsKey(labels);
        this.values.set(key, (this.values.get(key) ?? 0) + value);
    }
    /**
     * Decrement the gauge.
     */
    dec(labels = {}, value = 1) {
        const key = this.labelsKey(labels);
        this.values.set(key, (this.values.get(key) ?? 0) - value);
    }
    export() {
        const lines = [
            `# HELP ${this.config.name} ${this.config.help}`,
            `# TYPE ${this.config.name} gauge`,
        ];
        for (const [key, value] of this.values) {
            const labels = key ? `{${key}}` : '';
            lines.push(`${this.config.name}${labels} ${value}`);
        }
        return lines;
    }
    reset() {
        this.values.clear();
    }
}
exports.Gauge = Gauge;
class Histogram extends Metric {
    buckets;
    observations = new Map();
    sums = new Map();
    counts = new Map();
    constructor(config) {
        super(config);
        this.buckets = config.buckets ?? DEFAULT_BUCKETS;
    }
    /**
     * Observe a value.
     */
    observe(labels = {}, value) {
        const key = this.labelsKey(labels);
        // Initialize if needed
        if (!this.observations.has(key)) {
            this.observations.set(key, new Array(this.buckets.length).fill(0));
            this.sums.set(key, 0);
            this.counts.set(key, 0);
        }
        // Update bucket counts
        const bucketCounts = this.observations.get(key);
        for (let i = 0; i < this.buckets.length; i++) {
            if (value <= this.buckets[i]) {
                bucketCounts[i]++;
            }
        }
        // Update sum and count
        this.sums.set(key, this.sums.get(key) + value);
        this.counts.set(key, this.counts.get(key) + 1);
    }
    /**
     * Create a timer that observes duration on completion.
     */
    startTimer(labels = {}) {
        const start = Date.now();
        return () => {
            const duration = (Date.now() - start) / 1000; // Convert to seconds
            this.observe(labels, duration);
            return duration;
        };
    }
    export() {
        const lines = [
            `# HELP ${this.config.name} ${this.config.help}`,
            `# TYPE ${this.config.name} histogram`,
        ];
        for (const [key, bucketCounts] of this.observations) {
            const baseLabels = key ? `${key},` : '';
            // Export bucket values
            let cumulative = 0;
            for (let i = 0; i < this.buckets.length; i++) {
                cumulative += bucketCounts[i];
                lines.push(`${this.config.name}_bucket{${baseLabels}le="${this.buckets[i]}"} ${cumulative}`);
            }
            lines.push(`${this.config.name}_bucket{${baseLabels}le="+Inf"} ${this.counts.get(key)}`);
            // Export sum and count
            const labels = key ? `{${key}}` : '';
            lines.push(`${this.config.name}_sum${labels} ${this.sums.get(key)}`);
            lines.push(`${this.config.name}_count${labels} ${this.counts.get(key)}`);
        }
        return lines;
    }
    reset() {
        this.observations.clear();
        this.sums.clear();
        this.counts.clear();
    }
}
exports.Histogram = Histogram;
// ============================================================================
// DEFAULT BUCKETS
// ============================================================================
const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
// ============================================================================
// PRE-CONFIGURED METRICS
// ============================================================================
function createMeshMetrics(prefix = 'mesh') {
    const registry = new MetricsRegistry(prefix);
    return {
        registry,
        // Task metrics
        tasksTotal: registry.counter({
            name: 'tasks_total',
            help: 'Total number of tasks submitted',
            labels: ['type', 'status'],
        }),
        taskDuration: registry.histogram({
            name: 'task_duration_seconds',
            help: 'Task execution duration in seconds',
            labels: ['type', 'agent'],
            buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
        }),
        // Agent metrics
        agentInvocations: registry.counter({
            name: 'agent_invocations_total',
            help: 'Total agent invocations',
            labels: ['agent', 'role', 'status'],
        }),
        activeAgents: registry.gauge({
            name: 'active_agents',
            help: 'Number of active agents',
            labels: ['role'],
        }),
        // Model metrics
        modelCalls: registry.counter({
            name: 'model_calls_total',
            help: 'Total model calls',
            labels: ['provider', 'model', 'status'],
        }),
        modelLatency: registry.histogram({
            name: 'model_latency_seconds',
            help: 'Model call latency in seconds',
            labels: ['provider', 'model'],
            buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10, 30],
        }),
        modelTokens: registry.counter({
            name: 'model_tokens_total',
            help: 'Total tokens used',
            labels: ['provider', 'model', 'direction'],
        }),
        // Tool metrics
        toolInvocations: registry.counter({
            name: 'tool_invocations_total',
            help: 'Total tool invocations',
            labels: ['tool', 'status'],
        }),
        toolLatency: registry.histogram({
            name: 'tool_latency_seconds',
            help: 'Tool invocation latency in seconds',
            labels: ['tool'],
        }),
        // Policy metrics
        policyDecisions: registry.counter({
            name: 'policy_decisions_total',
            help: 'Total policy decisions',
            labels: ['policy', 'action'],
        }),
        // Cost metrics
        costUsd: registry.counter({
            name: 'cost_usd_total',
            help: 'Total cost in USD',
            labels: ['provider', 'type'],
        }),
    };
}
