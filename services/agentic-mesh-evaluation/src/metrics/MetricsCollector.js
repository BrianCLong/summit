"use strict";
// @ts-nocheck
/**
 * Metrics Collector - Comprehensive Performance Monitoring
 * Collects, aggregates, and analyzes mesh performance metrics
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsCollector = void 0;
const events_1 = require("events");
const prom_client_1 = require("prom-client");
const ioredis_1 = __importDefault(require("ioredis"));
class MetricsCollector extends events_1.EventEmitter {
    redis;
    collectors;
    // Prometheus metrics
    meshNodesGauge;
    taskCounter;
    taskDurationHistogram;
    latencyHistogram;
    throughputGauge;
    errorRateGauge;
    resourceUtilizationGauge;
    constructor(redisUrl) {
        super();
        this.redis = new ioredis_1.default(redisUrl);
        this.collectors = new Map();
        // Initialize Prometheus metrics
        this.meshNodesGauge = new prom_client_1.Gauge({
            name: 'mesh_nodes_total',
            help: 'Total number of nodes in mesh',
            labelNames: ['mesh_id', 'status'],
        });
        this.taskCounter = new prom_client_1.Counter({
            name: 'mesh_tasks_total',
            help: 'Total number of tasks processed',
            labelNames: ['mesh_id', 'node_id', 'status'],
        });
        this.taskDurationHistogram = new prom_client_1.Histogram({
            name: 'mesh_task_duration_seconds',
            help: 'Task execution duration',
            labelNames: ['mesh_id', 'node_id', 'task_type'],
            buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
        });
        this.latencyHistogram = new prom_client_1.Histogram({
            name: 'mesh_message_latency_ms',
            help: 'Message delivery latency',
            labelNames: ['mesh_id', 'protocol'],
            buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 5000],
        });
        this.throughputGauge = new prom_client_1.Gauge({
            name: 'mesh_throughput_per_second',
            help: 'Tasks completed per second',
            labelNames: ['mesh_id'],
        });
        this.errorRateGauge = new prom_client_1.Gauge({
            name: 'mesh_error_rate',
            help: 'Error rate percentage',
            labelNames: ['mesh_id', 'node_id'],
        });
        this.resourceUtilizationGauge = new prom_client_1.Gauge({
            name: 'mesh_resource_utilization',
            help: 'Resource utilization percentage',
            labelNames: ['mesh_id', 'node_id', 'resource_type'],
        });
    }
    /**
     * Start collecting metrics for a mesh
     */
    async startCollection(meshId, intervalMs = 10000) {
        const interval = setInterval(async () => {
            await this.collectMetrics(meshId);
        }, intervalMs);
        this.collectors.set(meshId, interval);
        this.emit('collection-started', { meshId });
    }
    /**
     * Stop collecting metrics
     */
    async stopCollection(meshId) {
        const interval = this.collectors.get(meshId);
        if (interval) {
            clearInterval(interval);
            this.collectors.delete(meshId);
        }
        this.emit('collection-stopped', { meshId });
    }
    /**
     * Collect metrics for a mesh
     */
    async collectMetrics(meshId) {
        try {
            // Get mesh data
            const meshData = await this.redis.get(`mesh:${meshId}`);
            if (!meshData)
                return;
            const mesh = JSON.parse(meshData);
            // Collect node metrics
            const nodeMetrics = await this.collectNodeMetrics(meshId, mesh);
            // Aggregate metrics
            const aggregateMetrics = this.aggregateMetrics(nodeMetrics);
            // Collect message metrics
            const messageMetrics = await this.collectMessageMetrics(meshId);
            // Update mesh metrics
            const metrics = {
                totalNodes: mesh.nodes.length,
                activeNodes: mesh.nodes.filter((n) => ['ready', 'busy', 'idle'].includes(n.status)).length,
                healthyNodes: mesh.nodes.filter((n) => ['ready', 'idle'].includes(n.status)).length,
                degradedNodes: mesh.nodes.filter((n) => n.status === 'degraded')
                    .length,
                failedNodes: mesh.nodes.filter((n) => n.status === 'failed').length,
                totalEdges: mesh.edges.length,
                averageConnectivity: this.calculateAverageConnectivity(mesh),
                networkDiameter: this.calculateNetworkDiameter(mesh),
                clusteringCoefficient: this.calculateClusteringCoefficient(mesh),
                aggregateMetrics,
                messageStats: messageMetrics,
                resourceStats: this.collectResourceStats(nodeMetrics),
                qualityMetrics: await this.collectQualityMetrics(meshId),
                timestamp: new Date(),
            };
            // Store metrics
            await this.storeMetrics(meshId, metrics);
            // Update Prometheus metrics
            this.updatePrometheusMetrics(meshId, mesh, metrics);
            this.emit('metrics-collected', { meshId, metrics });
        }
        catch (error) {
            this.emit('collection-error', { meshId, error });
        }
    }
    /**
     * Collect metrics for all nodes
     */
    async collectNodeMetrics(meshId, mesh) {
        const metricsMap = new Map();
        for (const node of mesh.nodes) {
            const metrics = await this.getNodeMetrics(meshId, node.id);
            if (metrics) {
                metricsMap.set(node.id, metrics);
            }
        }
        return metricsMap;
    }
    /**
     * Get metrics for a specific node
     */
    async getNodeMetrics(meshId, nodeId) {
        const data = await this.redis.get(`metrics:${meshId}:${nodeId}`);
        return data ? JSON.parse(data) : null;
    }
    /**
     * Aggregate metrics across all nodes
     */
    aggregateMetrics(nodeMetrics) {
        let totalCompleted = 0;
        let totalSuccessful = 0;
        let totalFailed = 0;
        let totalLatency = 0;
        let latencies = [];
        let totalThroughput = 0;
        for (const metrics of nodeMetrics.values()) {
            totalCompleted += metrics.tasksCompleted;
            totalSuccessful += metrics.tasksSuccessful;
            totalFailed += metrics.tasksFailed;
            totalLatency += metrics.averageLatencyMs;
            latencies.push(metrics.averageLatencyMs, metrics.p95LatencyMs, metrics.p99LatencyMs);
            totalThroughput += metrics.throughputPerSecond;
        }
        const nodeCount = nodeMetrics.size || 1;
        // Calculate percentiles
        latencies.sort((a, b) => a - b);
        const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
        const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
        const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
        return {
            totalTasksCompleted: totalCompleted,
            totalTasksSuccessful: totalSuccessful,
            totalTasksFailed: totalFailed,
            averageLatencyMs: totalLatency / nodeCount,
            p50LatencyMs: p50,
            p95LatencyMs: p95,
            p99LatencyMs: p99,
            totalThroughput,
            errorRate: totalCompleted > 0 ? (totalFailed / totalCompleted) * 100 : 0,
            successRate: totalCompleted > 0 ? (totalSuccessful / totalCompleted) * 100 : 100,
        };
    }
    /**
     * Collect message metrics
     */
    async collectMessageMetrics(meshId) {
        const stats = await this.redis.hgetall(`message-stats:${meshId}`);
        return {
            totalSent: parseInt(stats.totalSent || '0'),
            totalReceived: parseInt(stats.totalReceived || '0'),
            totalDropped: parseInt(stats.totalDropped || '0'),
            totalRetried: parseInt(stats.totalRetried || '0'),
            averageSize: parseFloat(stats.averageSize || '0'),
            averageDeliveryTimeMs: parseFloat(stats.averageDeliveryTimeMs || '0'),
            messageBacklog: parseInt(stats.messageBacklog || '0'),
        };
    }
    /**
     * Collect resource statistics
     */
    collectResourceStats(nodeMetrics) {
        const bottleneckThreshold = 80; // 80% utilization
        return {
            averageCpuPercent: 0,
            averageMemoryPercent: 0,
            totalNetworkBytesPerSecond: 0,
            bottleneckNodes: [],
        };
    }
    /**
     * Collect quality metrics
     */
    async collectQualityMetrics(meshId) {
        const quality = await this.redis.hgetall(`quality:${meshId}`);
        return {
            dataQuality: parseFloat(quality.dataQuality || '100'),
            serviceQuality: parseFloat(quality.serviceQuality || '100'),
            userSatisfaction: parseFloat(quality.userSatisfaction || '100'),
            complianceScore: parseFloat(quality.complianceScore || '100'),
        };
    }
    /**
     * Calculate average connectivity (edges per node)
     */
    calculateAverageConnectivity(mesh) {
        if (mesh.nodes.length === 0)
            return 0;
        return (mesh.edges.length * 2) / mesh.nodes.length;
    }
    /**
     * Calculate network diameter (maximum shortest path)
     */
    calculateNetworkDiameter(mesh) {
        // Floyd-Warshall algorithm for all-pairs shortest paths
        const n = mesh.nodes.length;
        if (n === 0)
            return 0;
        const dist = Array(n)
            .fill(0)
            .map(() => Array(n).fill(Infinity));
        // Initialize distances
        for (let i = 0; i < n; i++) {
            dist[i][i] = 0;
        }
        // Build adjacency matrix
        const nodeIds = mesh.nodes.map((n) => n.id);
        for (const edge of mesh.edges) {
            const i = nodeIds.indexOf(edge.sourceId);
            const j = nodeIds.indexOf(edge.targetId);
            if (i >= 0 && j >= 0) {
                dist[i][j] = 1;
                if (edge.bidirectional) {
                    dist[j][i] = 1;
                }
            }
        }
        // Floyd-Warshall
        for (let k = 0; k < n; k++) {
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    if (dist[i][k] + dist[k][j] < dist[i][j]) {
                        dist[i][j] = dist[i][k] + dist[k][j];
                    }
                }
            }
        }
        // Find maximum
        let maxDist = 0;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (dist[i][j] !== Infinity && dist[i][j] > maxDist) {
                    maxDist = dist[i][j];
                }
            }
        }
        return maxDist;
    }
    /**
     * Calculate clustering coefficient
     */
    calculateClusteringCoefficient(mesh) {
        // Measure how well nodes cluster together
        const n = mesh.nodes.length;
        if (n < 3)
            return 0;
        let totalCoefficient = 0;
        for (const node of mesh.nodes) {
            const neighbors = mesh.edges
                .filter((e) => e.sourceId === node.id ||
                (e.bidirectional && e.targetId === node.id))
                .map((e) => e.sourceId === node.id ? e.targetId : e.sourceId);
            const k = neighbors.length;
            if (k < 2)
                continue;
            // Count edges between neighbors
            let edgesBetweenNeighbors = 0;
            for (let i = 0; i < neighbors.length; i++) {
                for (let j = i + 1; j < neighbors.length; j++) {
                    const hasEdge = mesh.edges.some((e) => (e.sourceId === neighbors[i] && e.targetId === neighbors[j]) ||
                        (e.bidirectional &&
                            e.sourceId === neighbors[j] &&
                            e.targetId === neighbors[i]));
                    if (hasEdge)
                        edgesBetweenNeighbors++;
                }
            }
            const possibleEdges = (k * (k - 1)) / 2;
            totalCoefficient += edgesBetweenNeighbors / possibleEdges;
        }
        return totalCoefficient / n;
    }
    /**
     * Store metrics in Redis
     */
    async storeMetrics(meshId, metrics) {
        // Store current metrics
        await this.redis.set(`metrics:current:${meshId}`, JSON.stringify(metrics));
        // Store time-series data
        const timestamp = Date.now();
        await this.redis.zadd(`metrics:timeseries:${meshId}`, timestamp, JSON.stringify(metrics));
        // Keep only last 24 hours
        const dayAgo = timestamp - 24 * 60 * 60 * 1000;
        await this.redis.zremrangebyscore(`metrics:timeseries:${meshId}`, 0, dayAgo);
    }
    /**
     * Update Prometheus metrics
     */
    updatePrometheusMetrics(meshId, mesh, metrics) {
        // Update node counts
        this.meshNodesGauge.set({ mesh_id: meshId, status: 'total' }, metrics.totalNodes);
        this.meshNodesGauge.set({ mesh_id: meshId, status: 'active' }, metrics.activeNodes);
        this.meshNodesGauge.set({ mesh_id: meshId, status: 'healthy' }, metrics.healthyNodes);
        this.meshNodesGauge.set({ mesh_id: meshId, status: 'degraded' }, metrics.degradedNodes);
        this.meshNodesGauge.set({ mesh_id: meshId, status: 'failed' }, metrics.failedNodes);
        // Update throughput
        this.throughputGauge.set({ mesh_id: meshId }, metrics.aggregateMetrics.totalThroughput);
        // Update error rate
        this.errorRateGauge.set({ mesh_id: meshId, node_id: 'aggregate' }, metrics.aggregateMetrics.errorRate);
    }
    /**
     * Get metrics for a mesh
     */
    async getMetrics(meshId) {
        const data = await this.redis.get(`metrics:current:${meshId}`);
        return data ? JSON.parse(data) : null;
    }
    /**
     * Get time-series metrics
     */
    async getTimeSeriesMetrics(meshId, startTime, endTime) {
        const data = await this.redis.zrangebyscore(`metrics:timeseries:${meshId}`, startTime, endTime);
        return data.map((d) => JSON.parse(d));
    }
    /**
     * Record task execution
     */
    async recordTaskExecution(meshId, nodeId, taskType, durationMs, success) {
        // Update Prometheus metrics
        this.taskCounter.inc({
            mesh_id: meshId,
            node_id: nodeId,
            status: success ? 'success' : 'failure',
        });
        this.taskDurationHistogram.observe({ mesh_id: meshId, node_id: nodeId, task_type: taskType }, durationMs / 1000);
        // Update Redis metrics
        const metricsKey = `metrics:${meshId}:${nodeId}`;
        const metrics = (await this.getNodeMetrics(meshId, nodeId)) ||
            {
                tasksCompleted: 0,
                tasksSuccessful: 0,
                tasksFailed: 0,
                averageLatencyMs: 0,
                p95LatencyMs: 0,
                p99LatencyMs: 0,
                throughputPerSecond: 0,
                errorRate: 0,
                successRate: 0,
                qualityScore: 100,
            };
        metrics.tasksCompleted++;
        if (success) {
            metrics.tasksSuccessful++;
        }
        else {
            metrics.tasksFailed++;
        }
        metrics.successRate =
            (metrics.tasksSuccessful / metrics.tasksCompleted) * 100;
        metrics.errorRate = (metrics.tasksFailed / metrics.tasksCompleted) * 100;
        // Update average latency (exponential moving average)
        metrics.averageLatencyMs =
            metrics.averageLatencyMs * 0.9 + durationMs * 0.1;
        await this.redis.set(metricsKey, JSON.stringify(metrics));
    }
    /**
     * Record message latency
     */
    async recordMessageLatency(meshId, protocol, latencyMs) {
        this.latencyHistogram.observe({ mesh_id: meshId, protocol }, latencyMs);
        // Update message stats
        await this.redis.hincrby(`message-stats:${meshId}`, 'totalSent', 1);
    }
    /**
     * Get Prometheus metrics
     */
    getPrometheusMetrics() {
        return prom_client_1.register.metrics();
    }
    /**
     * Close connections
     */
    async close() {
        for (const interval of this.collectors.values()) {
            clearInterval(interval);
        }
        this.collectors.clear();
        await this.redis.quit();
    }
}
exports.MetricsCollector = MetricsCollector;
