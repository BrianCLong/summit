export interface CanaryConfig {
  percentage: number; // 0-100
  monitoringDurationMinutes: number;
  metrics: {
    errorRateThreshold: number; // e.g., 0.01 (1%)
    latencyP95Threshold: number; // e.g., 300ms
  };
}

export interface CanaryStatus {
  active: boolean;
  currentPercentage: number;
  startTime?: Date;
  health: 'healthy' | 'degraded' | 'unhealthy';
  metrics: {
    errorRate: number;
    latencyP95: number;
  };
}

export class CanaryManager {
  private config: CanaryConfig;
  private status: CanaryStatus;

  constructor() {
    // Default policy: 10% slice
    this.config = {
      percentage: 10,
      monitoringDurationMinutes: 30,
      metrics: {
        errorRateThreshold: 0.01,
        latencyP95Threshold: 300,
      },
    };

    this.status = {
      active: false,
      currentPercentage: 0,
      health: 'healthy',
      metrics: {
        errorRate: 0,
        latencyP95: 0,
      },
    };
  }

  startCanary(): void {
    this.status.active = true;
    this.status.startTime = new Date();
    this.status.currentPercentage = this.config.percentage;
    console.log(`[Canary] Started at ${this.status.currentPercentage}% traffic.`);
  }

  updateMetrics(errorRate: number, latencyP95: number): void {
    this.status.metrics = { errorRate, latencyP95 };
    this.evaluateHealth();
  }

  private evaluateHealth(): void {
    if (
      this.status.metrics.errorRate > this.config.metrics.errorRateThreshold ||
      this.status.metrics.latencyP95 > this.config.metrics.latencyP95Threshold
    ) {
      this.status.health = 'unhealthy';
      this.triggerRollback();
    } else {
      this.status.health = 'healthy';
    }
  }

  private triggerRollback(): void {
    if (this.status.active) {
      console.warn('[Canary] Health check failed. Triggering auto-rollback.');
      this.status.active = false;
      this.status.currentPercentage = 0;
      // In a real system, this would call the deployment orchestrator (Maestro)
    }
  }

  promoteToProd(): void {
    if (this.status.health === 'healthy') {
      console.log('[Canary] Promoting to 100% traffic.');
      this.status.currentPercentage = 100;
      this.status.active = false; // No longer a canary, it's prod
    } else {
      throw new Error('Cannot promote unhealthy canary');
    }
  }
}

export const canaryManager = new CanaryManager();
