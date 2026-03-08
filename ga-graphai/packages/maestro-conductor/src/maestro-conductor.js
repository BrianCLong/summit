"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaestroConductor = void 0;
const discovery_1 = require("./discovery");
const anomaly_1 = require("./anomaly");
const monitoring_1 = require("./monitoring");
const self_healing_1 = require("./self-healing");
const optimization_1 = require("./optimization");
const job_router_1 = require("./job-router");
const common_types_1 = require("@ga-graphai/common-types");
const predictive_insights_1 = require("./predictive-insights");
class MaestroConductor {
    discovery = new discovery_1.AssetDiscoveryEngine();
    anomaly;
    monitor = new monitoring_1.HealthMonitor();
    selfHealing;
    optimizer;
    jobRouter;
    policyHooks = [];
    incidents = [];
    insights;
    events;
    constructor(options) {
        this.anomaly = new anomaly_1.AnomalyDetector(options?.anomaly);
        this.selfHealing = new self_healing_1.SelfHealingOrchestrator(options?.selfHealing);
        this.optimizer = new optimization_1.CostLatencyOptimizer(options?.optimizer);
        this.jobRouter = new job_router_1.JobRouter(options?.jobRouter);
        this.events = options?.events ?? new common_types_1.StructuredEventEmitter();
        if (options?.insights) {
            this.insights = new predictive_insights_1.PredictiveInsightEngine(options.insights);
        }
    }
    registerDiscoveryProvider(provider) {
        this.discovery.registerProvider(provider);
    }
    onDiscovery(listener) {
        this.discovery.on('event', listener);
    }
    async scanAssets() {
        return this.discovery.scanAndRegister();
    }
    listAssets() {
        return this.discovery.listAssets();
    }
    registerPolicyHook(hook) {
        this.policyHooks.push(hook);
    }
    registerResponseStrategy(strategy) {
        this.selfHealing.registerStrategy(strategy);
    }
    getIncidents() {
        return [...this.incidents];
    }
    getOptimizationRecommendations() {
        return this.optimizer.getRecommendations();
    }
    getPerformanceSnapshots() {
        return this.optimizer.listSnapshots();
    }
    getPredictiveInsights(serviceId) {
        if (!this.insights) {
            return [];
        }
        if (serviceId) {
            const asset = this.discovery.getAsset(serviceId);
            const environmentId = asset?.region ?? asset?.labels?.environment ?? 'unknown';
            const insight = this.insights.buildInsight(serviceId, environmentId);
            return insight ? [insight] : [];
        }
        return this.insights.listHighRiskInsights();
    }
    async ingestHealthSignal(signal) {
        this.monitor.ingest(signal);
        const sample = this.toOptimizationSample(signal);
        if (sample) {
            this.optimizer.update(sample);
        }
        this.insights?.observeHealthSignal(signal);
        const anomaly = this.anomaly.evaluate(signal);
        if (anomaly) {
            await this.handleAnomaly(anomaly);
        }
    }
    async routeJob(job) {
        const assets = this.discovery.listAssets();
        const performance = this.optimizer.listSnapshots();
        if (assets.length === 0) {
            throw new Error('no assets registered');
        }
        return this.jobRouter.route(job, assets, performance, this.policyHooks);
    }
    toOptimizationSample(signal) {
        const sample = {
            assetId: signal.assetId,
            timestamp: signal.timestamp,
        };
        const metric = signal.metric.toLowerCase();
        if (metric.includes('latency')) {
            sample.latencyMs = signal.value;
        }
        if (metric.includes('cost')) {
            sample.costPerHour = signal.value;
        }
        if (metric.includes('throughput') || metric.includes('qps')) {
            sample.throughput = signal.value;
        }
        if (metric.includes('error')) {
            sample.errorRate = signal.value;
        }
        if (metric.includes('saturation') || metric.includes('utilization')) {
            sample.saturation = signal.value;
            sample.computeUtilization = signal.value;
        }
        if (sample.latencyMs === undefined &&
            sample.costPerHour === undefined &&
            sample.throughput === undefined &&
            sample.errorRate === undefined &&
            sample.saturation === undefined &&
            sample.computeUtilization === undefined) {
            return undefined;
        }
        return sample;
    }
    async handleAnomaly(anomaly) {
        const asset = this.discovery.getAsset(anomaly.assetId) ??
            {
                id: anomaly.assetId,
                name: anomaly.assetId,
                kind: 'microservice',
            };
        const snapshot = this.monitor.getSnapshot(anomaly.assetId) ??
            {
                assetId: anomaly.assetId,
                lastUpdated: anomaly.timestamp,
                metrics: {},
                annotations: [],
            };
        const context = {
            asset,
            anomaly,
            snapshot,
            policies: this.policyHooks,
        };
        const { plans } = await this.selfHealing.orchestrate(context);
        const incident = {
            id: `${anomaly.assetId}:${anomaly.metric}:${Date.now()}`,
            asset,
            anomaly,
            snapshot,
            plans,
            timestamp: new Date(),
        };
        this.events.emitEvent('summit.incident.detected', {
            incidentId: incident.id,
            assetId: incident.asset.id,
            severity: incident.anomaly.severity,
            metric: incident.anomaly.metric,
            timestamp: incident.timestamp.toISOString(),
            plans: plans.map((plan) => plan.strategyId),
        });
        this.incidents.push(incident);
    }
}
exports.MaestroConductor = MaestroConductor;
