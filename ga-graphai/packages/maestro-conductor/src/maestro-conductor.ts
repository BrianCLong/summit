import { AssetDiscoveryEngine } from './discovery';
import { AnomalyDetector } from './anomaly';
import { HealthMonitor } from './monitoring';
import { SelfHealingOrchestrator } from './self-healing';
import { CostLatencyOptimizer } from './optimization';
import { JobRouter } from './job-router';
import type {
  AnomalySignal,
  DiscoveryEvent,
  DiscoveryProvider,
  HealthSignal,
  IncidentReport,
  OptimizationSample,
  PolicyHook,
  ResponseStrategy,
  RoutingPlan,
  NarrativeScorecard,
} from './types';
import type { AnomalyDetectorOptions } from './anomaly';
import type { SelfHealingOrchestratorOptions } from './self-healing';
import type { CostLatencyOptimizerOptions } from './optimization';
import type { JobRouterOptions } from './job-router';
import type { JobSpec } from './types';

export interface MaestroConductorOptions {
  anomaly?: AnomalyDetectorOptions;
  selfHealing?: SelfHealingOrchestratorOptions;
  optimizer?: CostLatencyOptimizerOptions;
  jobRouter?: JobRouterOptions;
}

export class MaestroConductor {
  private readonly discovery = new AssetDiscoveryEngine();

  private readonly anomaly: AnomalyDetector;

  private readonly monitor = new HealthMonitor();

  private readonly selfHealing: SelfHealingOrchestrator;

  private readonly optimizer: CostLatencyOptimizer;

  private readonly jobRouter: JobRouter;

  private readonly policyHooks: PolicyHook[] = [];

  private readonly incidents: IncidentReport[] = [];

  private readonly narrativeScorecards: NarrativeScorecard[] = [];

  constructor(options?: MaestroConductorOptions) {
    this.anomaly = new AnomalyDetector(options?.anomaly);
    this.selfHealing = new SelfHealingOrchestrator(options?.selfHealing);
    this.optimizer = new CostLatencyOptimizer(options?.optimizer);
    this.jobRouter = new JobRouter(options?.jobRouter);
  }

  registerDiscoveryProvider(provider: DiscoveryProvider): void {
    this.discovery.registerProvider(provider);
  }

  onDiscovery(listener: (event: DiscoveryEvent) => void): void {
    this.discovery.on('event', listener);
  }

  async scanAssets(): Promise<DiscoveryEvent[]> {
    return this.discovery.scanAndRegister();
  }

  listAssets() {
    return this.discovery.listAssets();
  }

  registerPolicyHook(hook: PolicyHook): void {
    this.policyHooks.push(hook);
  }

  registerResponseStrategy(strategy: ResponseStrategy): void {
    this.selfHealing.registerStrategy(strategy);
  }

  getIncidents(): IncidentReport[] {
    return [...this.incidents];
  }

  getOptimizationRecommendations() {
    return this.optimizer.getRecommendations();
  }

  getPerformanceSnapshots() {
    return this.optimizer.listSnapshots();
  }

  async ingestHealthSignal(signal: HealthSignal): Promise<void> {
    this.monitor.ingest(signal);
    const sample = this.toOptimizationSample(signal);
    if (sample) {
      this.optimizer.update(sample);
    }
    const anomaly = this.anomaly.evaluate(signal);
    if (anomaly) {
      await this.handleAnomaly(anomaly);
    }
  }

  async routeJob(job: JobSpec): Promise<RoutingPlan> {
    const assets = this.discovery.listAssets();
    const performance = this.optimizer.listSnapshots();
    if (assets.length === 0) {
      throw new Error('no assets registered');
    }
    return this.jobRouter.route(job, assets, performance, this.policyHooks);
  }

  recordNarrativeScorecard(scorecard: NarrativeScorecard): NarrativeScorecard {
    const playbooks = new Set(scorecard.recommendedPlaybooks);
    if (scorecard.emotionalRisk >= 0.7) {
      playbooks.add('rapid-response-comms');
      playbooks.add('disclosure-charter');
    }
    if (
      scorecard.identification + scorecard.imitation + scorecard.amplification >=
      2.1
    ) {
      playbooks.add('media-literacy-boost');
    }
    const enriched: NarrativeScorecard = {
      ...scorecard,
      recommendedPlaybooks: Array.from(playbooks),
      emotionalRisk: Number(scorecard.emotionalRisk.toFixed(3)),
      identification: Number(scorecard.identification.toFixed(3)),
      imitation: Number(scorecard.imitation.toFixed(3)),
      amplification: Number(scorecard.amplification.toFixed(3)),
    };
    this.narrativeScorecards.push(enriched);
    return enriched;
  }

  listNarrativeScorecards(): NarrativeScorecard[] {
    return [...this.narrativeScorecards];
  }

  private toOptimizationSample(
    signal: HealthSignal,
  ): OptimizationSample | undefined {
    const sample: OptimizationSample = {
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

    if (
      sample.latencyMs === undefined &&
      sample.costPerHour === undefined &&
      sample.throughput === undefined &&
      sample.errorRate === undefined &&
      sample.saturation === undefined &&
      sample.computeUtilization === undefined
    ) {
      return undefined;
    }
    return sample;
  }

  private async handleAnomaly(anomaly: AnomalySignal): Promise<void> {
    const asset =
      this.discovery.getAsset(anomaly.assetId) ??
      ({
        id: anomaly.assetId,
        name: anomaly.assetId,
        kind: 'microservice',
      } as const);
    const snapshot =
      this.monitor.getSnapshot(anomaly.assetId) ??
      ({
        assetId: anomaly.assetId,
        lastUpdated: anomaly.timestamp,
        metrics: {},
        annotations: [],
      } as const);

    const context = {
      asset,
      anomaly,
      snapshot,
      policies: this.policyHooks,
    };
    const { plans } = await this.selfHealing.orchestrate(context);
    const incident: IncidentReport = {
      id: `${anomaly.assetId}:${anomaly.metric}:${Date.now()}`,
      asset,
      anomaly,
      snapshot,
      plans,
      timestamp: new Date(),
    };
    this.incidents.push(incident);
  }
}
