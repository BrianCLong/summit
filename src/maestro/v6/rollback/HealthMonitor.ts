import { EventEmitter } from 'events';
import { Logger } from '../../utils/logger';
import { MetricsCollector } from '../../observability/MetricsCollector';

export type HealthStatus = 'healthy' | 'degraded' | 'critical';

export interface HealthIncident {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

export interface ServiceHealthSnapshot {
  serviceId: string;
  tier: 'canary' | 'primary' | 'standby';
  status: HealthStatus;
  errorRate: number;
  successRate: number;
  latencyP50: number;
  latencyP95: number;
  saturation: number;
  cpuUsage: number;
  memoryUsage: number;
  requestRate: number;
  lastUpdated: Date;
}

export interface DeploymentHealthMetrics extends Record<string, number | string | Date | HealthStatus | HealthIncident[] | ServiceHealthSnapshot[] | Record<string, number>> {
  deploymentId: string;
  timestamp: Date;
  status: HealthStatus;
  error_rate: number;
  success_rate: number;
  avg_latency: number;
  p95_latency: number;
  memory_usage: number;
  cpu_usage: number;
  saturation: number;
  request_rate: number;
  anomalyScore: number;
  incidents: HealthIncident[];
  serviceMetrics: ServiceHealthSnapshot[];
  trends: {
    errorRateSlope: number;
    latencySlope: number;
    availabilitySlope: number;
  };
}

interface DeploymentHealthRecord {
  deploymentId: string;
  services: Map<string, ServiceHealthSnapshot>;
  history: ServiceHealthSnapshot[][];
  incidents: HealthIncident[];
  status: HealthStatus;
  lastEvaluated: Date;
  consecutiveDegradations: number;
}

interface HealthEvaluation {
  status: HealthStatus;
  reasons: string[];
  anomalyScore: number;
}

const HISTORY_LIMIT = 50;
const DEFAULT_HEALTH: Omit<ServiceHealthSnapshot, 'serviceId' | 'tier'> = {
  status: 'healthy',
  errorRate: 0.005,
  successRate: 0.995,
  latencyP50: 120,
  latencyP95: 220,
  saturation: 0.35,
  cpuUsage: 0.4,
  memoryUsage: 0.45,
  requestRate: 120,
  lastUpdated: new Date()
};

export class HealthMonitor extends EventEmitter {
  private logger: Logger;
  private metrics?: MetricsCollector;
  private records: Map<string, DeploymentHealthRecord> = new Map();
  private evaluationInterval?: NodeJS.Timeout;
  private evaluationPeriodMs: number;

  constructor(logger: Logger, metricsCollector?: MetricsCollector, evaluationPeriodMs = 15000) {
    super();
    this.logger = logger;
    this.metrics = metricsCollector;
    this.evaluationPeriodMs = evaluationPeriodMs;
  }

  async initialize(): Promise<void> {
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
    }

    this.evaluationInterval = setInterval(() => {
      for (const record of this.records.values()) {
        this.evaluateDeployment(record);
      }
    }, this.evaluationPeriodMs);

    this.logger.info('HealthMonitor initialized for Maestro Conductor rollback system');
  }

  async startMonitoring(deploymentId: string, services: string[]): Promise<void> {
    const record = this.ensureRecord(deploymentId, services);
    record.lastEvaluated = new Date();
    this.logger.info(`Started health monitoring for deployment ${deploymentId}`, {
      services: Array.from(record.services.keys())
    });
  }

  async stopMonitoring(deploymentId: string): Promise<void> {
    if (this.records.delete(deploymentId)) {
      this.logger.info(`Stopped health monitoring for deployment ${deploymentId}`);
    }
  }

  async ingestHealthSignal(
    deploymentId: string,
    updates: Partial<Omit<ServiceHealthSnapshot, 'serviceId' | 'tier' | 'lastUpdated'>> & {
      serviceId?: string;
      tier?: 'canary' | 'primary' | 'standby';
      incidents?: HealthIncident[];
    }
  ): Promise<void> {
    const record = this.records.get(deploymentId);
    if (!record) {
      throw new Error(`Deployment ${deploymentId} is not being monitored`);
    }

    const targetServiceId = updates.serviceId || Array.from(record.services.keys())[0];
    if (!targetServiceId) {
      throw new Error(`No services registered for deployment ${deploymentId}`);
    }

    const service = record.services.get(targetServiceId);
    if (!service) {
      throw new Error(`Service ${targetServiceId} not registered for deployment ${deploymentId}`);
    }

    const updatedService: ServiceHealthSnapshot = {
      ...service,
      ...updates,
      tier: updates.tier || service.tier,
      lastUpdated: new Date(),
      status: updates.errorRate && updates.errorRate > 0.08 ? 'critical' : updates.errorRate && updates.errorRate > 0.03 ? 'degraded' : service.status
    };

    record.services.set(targetServiceId, updatedService);
    if (updates.incidents && updates.incidents.length > 0) {
      record.incidents.push(...updates.incidents);
    }

    this.appendHistory(record, Array.from(record.services.values()));
    this.evaluateDeployment(record);
  }

  async getHealthMetrics(deploymentId: string): Promise<DeploymentHealthMetrics> {
    const record = this.records.get(deploymentId);
    if (!record) {
      throw new Error(`No health metrics available for deployment ${deploymentId}`);
    }

    const aggregate = this.aggregateMetrics(record);
    const trends = this.calculateTrends(record);

    const metrics: DeploymentHealthMetrics = {
      deploymentId,
      timestamp: new Date(),
      status: record.status,
      error_rate: aggregate.errorRate,
      success_rate: aggregate.successRate,
      avg_latency: aggregate.latencyP50,
      p95_latency: aggregate.latencyP95,
      memory_usage: aggregate.memoryUsage,
      cpu_usage: aggregate.cpuUsage,
      saturation: aggregate.saturation,
      request_rate: aggregate.requestRate,
      anomalyScore: aggregate.anomalyScore,
      incidents: [...record.incidents],
      serviceMetrics: Array.from(record.services.values()),
      trends
    };

    this.metrics?.recordGauge?.('maestro.rollback.health.error_rate', aggregate.errorRate, { deploymentId });
    this.metrics?.recordGauge?.('maestro.rollback.health.latency_p95', aggregate.latencyP95, { deploymentId });
    this.metrics?.recordGauge?.('maestro.rollback.health.anomaly_score', aggregate.anomalyScore, { deploymentId });

    return metrics;
  }

  async verifyHealth(deploymentId: string): Promise<boolean> {
    const record = this.records.get(deploymentId);
    if (!record) {
      throw new Error(`Deployment ${deploymentId} is not being monitored`);
    }

    const aggregate = this.aggregateMetrics(record);
    const healthy = aggregate.errorRate < 0.02 && aggregate.latencyP95 < 400 && aggregate.memoryUsage < 0.8;

    this.logger.info(`Health verification for ${deploymentId}`, {
      healthy,
      errorRate: aggregate.errorRate,
      latencyP95: aggregate.latencyP95,
      memoryUsage: aggregate.memoryUsage
    });

    return healthy;
  }

  async shutdown(): Promise<void> {
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
    }
    this.records.clear();
    this.logger.info('HealthMonitor shut down');
  }

  private ensureRecord(deploymentId: string, services: string[]): DeploymentHealthRecord {
    let record = this.records.get(deploymentId);
    if (!record) {
      const serviceSnapshots = services.map<ServiceHealthSnapshot>((serviceId, index) => ({
        serviceId,
        tier: index === 0 ? 'canary' : 'primary',
        ...DEFAULT_HEALTH,
        lastUpdated: new Date()
      }));

      record = {
        deploymentId,
        services: new Map(serviceSnapshots.map(service => [service.serviceId, service])),
        history: [serviceSnapshots],
        incidents: [],
        status: 'healthy',
        lastEvaluated: new Date(),
        consecutiveDegradations: 0
      };

      this.records.set(deploymentId, record);
    } else {
      for (const serviceId of services) {
        if (!record.services.has(serviceId)) {
          const snapshot: ServiceHealthSnapshot = {
            serviceId,
            tier: 'primary',
            ...DEFAULT_HEALTH,
            lastUpdated: new Date()
          };
          record.services.set(serviceId, snapshot);
        }
      }
    }

    return record;
  }

  private appendHistory(record: DeploymentHealthRecord, snapshot: ServiceHealthSnapshot[]): void {
    record.history.push(snapshot);
    if (record.history.length > HISTORY_LIMIT) {
      record.history.shift();
    }
  }

  private evaluateDeployment(record: DeploymentHealthRecord): void {
    const previousStatus = record.status;
    const evaluation = this.calculateEvaluation(record);

    record.status = evaluation.status;
    record.lastEvaluated = new Date();

    if (evaluation.status === 'degraded') {
      record.consecutiveDegradations += 1;
      this.metrics?.incrementCounter?.('maestro.rollback.health.degradations', { deploymentId: record.deploymentId });
      this.emit('healthDegraded', {
        deploymentId: record.deploymentId,
        status: evaluation.status,
        reasons: evaluation.reasons,
        anomalyScore: evaluation.anomalyScore
      });
    } else if (evaluation.status === 'critical') {
      record.consecutiveDegradations += 1;
      this.metrics?.incrementCounter?.('maestro.rollback.health.critical', { deploymentId: record.deploymentId });
      this.emit('criticalAlert', {
        deploymentId: record.deploymentId,
        status: evaluation.status,
        reasons: evaluation.reasons,
        anomalyScore: evaluation.anomalyScore
      });
    } else {
      record.consecutiveDegradations = 0;
    }

    if (previousStatus !== record.status) {
      this.logger.warn(`Health status changed for ${record.deploymentId}: ${previousStatus} -> ${record.status}`, {
        reasons: evaluation.reasons,
        anomalyScore: evaluation.anomalyScore
      });
    }
  }

  private calculateEvaluation(record: DeploymentHealthRecord): HealthEvaluation {
    const aggregate = this.aggregateMetrics(record);
    const reasons: string[] = [];
    let status: HealthStatus = 'healthy';

    if (aggregate.errorRate > 0.08 || aggregate.successRate < 0.9) {
      status = 'critical';
      reasons.push(`Error rate ${aggregate.errorRate.toFixed(3)} or success rate ${aggregate.successRate.toFixed(3)} outside safe range`);
    } else if (aggregate.errorRate > 0.03 || aggregate.successRate < 0.95) {
      status = status === 'critical' ? status : 'degraded';
      reasons.push(`Elevated error (${aggregate.errorRate.toFixed(3)}) or reduced success (${aggregate.successRate.toFixed(3)}) rate`);
    }

    if (aggregate.latencyP95 > 4000) {
      status = 'critical';
      reasons.push(`P95 latency ${aggregate.latencyP95.toFixed(0)}ms exceeds hard threshold`);
    } else if (aggregate.latencyP95 > 2500) {
      status = status === 'critical' ? status : 'degraded';
      reasons.push(`P95 latency ${aggregate.latencyP95.toFixed(0)}ms elevated`);
    }

    if (aggregate.memoryUsage > 0.92 || aggregate.cpuUsage > 0.92) {
      status = 'critical';
      reasons.push('Resource exhaustion detected');
    } else if (aggregate.memoryUsage > 0.85 || aggregate.cpuUsage > 0.85) {
      status = status === 'critical' ? status : 'degraded';
      reasons.push('Resource pressure approaching critical thresholds');
    }

    if (aggregate.anomalyScore > 0.85) {
      status = 'critical';
      reasons.push(`Anomaly score ${aggregate.anomalyScore.toFixed(2)} indicates severe instability`);
    } else if (aggregate.anomalyScore > 0.65) {
      status = status === 'critical' ? status : 'degraded';
      reasons.push(`Anomaly score ${aggregate.anomalyScore.toFixed(2)} indicates unusual behaviour`);
    }

    if (record.consecutiveDegradations > 3 && status !== 'critical') {
      status = 'degraded';
      reasons.push('Multiple consecutive degradation intervals detected');
    }

    return {
      status,
      reasons: reasons.length > 0 ? reasons : ['Metrics within healthy thresholds'],
      anomalyScore: aggregate.anomalyScore
    };
  }

  private aggregateMetrics(record: DeploymentHealthRecord): {
    errorRate: number;
    successRate: number;
    latencyP50: number;
    latencyP95: number;
    saturation: number;
    cpuUsage: number;
    memoryUsage: number;
    requestRate: number;
    anomalyScore: number;
  } {
    const services = Array.from(record.services.values());
    if (services.length === 0) {
      return {
        errorRate: DEFAULT_HEALTH.errorRate,
        successRate: DEFAULT_HEALTH.successRate,
        latencyP50: DEFAULT_HEALTH.latencyP50,
        latencyP95: DEFAULT_HEALTH.latencyP95,
        saturation: DEFAULT_HEALTH.saturation,
        cpuUsage: DEFAULT_HEALTH.cpuUsage,
        memoryUsage: DEFAULT_HEALTH.memoryUsage,
        requestRate: DEFAULT_HEALTH.requestRate,
        anomalyScore: 0
      };
    }

    const sums = services.reduce((acc, service) => {
      acc.errorRate += service.errorRate;
      acc.successRate += service.successRate;
      acc.latencyP50 += service.latencyP50;
      acc.latencyP95 += service.latencyP95;
      acc.saturation += service.saturation;
      acc.cpuUsage += service.cpuUsage;
      acc.memoryUsage += service.memoryUsage;
      acc.requestRate += service.requestRate;
      return acc;
    }, {
      errorRate: 0,
      successRate: 0,
      latencyP50: 0,
      latencyP95: 0,
      saturation: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      requestRate: 0
    });

    const average = {
      errorRate: sums.errorRate / services.length,
      successRate: sums.successRate / services.length,
      latencyP50: sums.latencyP50 / services.length,
      latencyP95: sums.latencyP95 / services.length,
      saturation: sums.saturation / services.length,
      cpuUsage: sums.cpuUsage / services.length,
      memoryUsage: sums.memoryUsage / services.length,
      requestRate: sums.requestRate / services.length
    };

    const anomalyScore = this.calculateAnomalyScore(record, average);

    return {
      ...average,
      anomalyScore
    };
  }

  private calculateTrends(record: DeploymentHealthRecord): {
    errorRateSlope: number;
    latencySlope: number;
    availabilitySlope: number;
  } {
    const recentHistory = record.history.slice(-5);
    if (recentHistory.length < 2) {
      return {
        errorRateSlope: 0,
        latencySlope: 0,
        availabilitySlope: 0
      };
    }

    const errorRates = recentHistory.map(snapshot => this.average(snapshot.map(s => s.errorRate)));
    const latencies = recentHistory.map(snapshot => this.average(snapshot.map(s => s.latencyP95)));
    const successRates = recentHistory.map(snapshot => this.average(snapshot.map(s => s.successRate)));

    return {
      errorRateSlope: this.calculateSlope(errorRates),
      latencySlope: this.calculateSlope(latencies),
      availabilitySlope: this.calculateSlope(successRates)
    };
  }

  private calculateAnomalyScore(record: DeploymentHealthRecord, average: {
    errorRate: number;
    successRate: number;
    latencyP50: number;
    latencyP95: number;
    saturation: number;
    cpuUsage: number;
    memoryUsage: number;
    requestRate: number;
  }): number {
    const baseline = DEFAULT_HEALTH;
    const errorDrift = Math.max(0, (average.errorRate - baseline.errorRate) / baseline.errorRate);
    const latencyDrift = Math.max(0, (average.latencyP95 - baseline.latencyP95) / baseline.latencyP95);
    const resourceDrift = Math.max(0, (average.memoryUsage - baseline.memoryUsage) / baseline.memoryUsage);
    const successDrift = Math.max(0, (baseline.successRate - average.successRate) / baseline.successRate);

    const weighted = (errorDrift * 0.35) + (latencyDrift * 0.25) + (resourceDrift * 0.2) + (successDrift * 0.2);
    const incidentPenalty = Math.min(0.2, record.incidents.length * 0.02);
    return Math.min(1, weighted + incidentPenalty);
  }

  private calculateSlope(values: number[]): number {
    if (values.length < 2) {
      return 0;
    }

    let slope = 0;
    for (let i = 1; i < values.length; i++) {
      slope += values[i] - values[i - 1];
    }
    return slope / (values.length - 1);
  }

  private average(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
}
