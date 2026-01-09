
import { provenanceLedger } from '../../src/provenance/ledger.js';
import { RollbackEngine } from './rollback-engine.js';

// Mock external services for demonstration
const mockLoadBalancer = {
  setTrafficPercentage: async (service: string, version: string, percentage: number): Promise<void> => {
    console.log(`[MockLoadBalancer] Setting traffic for ${service}@${version} to ${percentage}%`);
    // In a real implementation, this would interact with an Ingress controller, service mesh, or cloud load balancer.
  },
};

const mockMonitoringService = {
  getMetrics: async (service: string, version: string): Promise<{ errorRate: number; latency: number }> => {
    console.log(`[MockMonitoring] Fetching metrics for ${service}@${version}`);
    // Simulate metrics. In a real scenario, this would query Prometheus, Datadog, etc.
    const isUnhealthy = Math.random() > 0.9; // 10% chance of failure for demo
    return {
      errorRate: isUnhealthy ? 0.06 : 0.005,
      latency: isUnhealthy ? 600 : 250,
    };
  },
};

export interface CanaryConfig {
  serviceName: string;
  stableVersion: string;
  canaryVersion: string;
  trafficSteps: number[];
  healthCheckEndpoint: string;
  errorRateThreshold: number; // e.g., 0.01 for 1%
  latencyThreshold: number; // e.g., 500ms
  tenantId: string;
  actorId: string;
}

export class CanaryOrchestrator {
  private config: CanaryConfig;
  private rollbackEngine: RollbackEngine;
  // Allow overriding monitoring for tests
  public _monitoringService = mockMonitoringService;
  public _loadBalancer = mockLoadBalancer;

  constructor(config: CanaryConfig, rollbackEngine?: RollbackEngine) {
    this.config = config;
    this.rollbackEngine = rollbackEngine || new RollbackEngine();
  }

  public async start(): Promise<boolean> {
    console.log(`Starting canary deployment for ${this.config.serviceName} from ${this.config.stableVersion} to ${this.config.canaryVersion}`);

    try {
      await provenanceLedger.appendEntry({
        tenantId: this.config.tenantId,
        actorId: this.config.actorId,
        actorType: 'system',
        actionType: 'CANARY_START',
        resourceType: 'Deployment',
        resourceId: this.config.serviceName,
        timestamp: new Date(),
        payload: {
          mutationType: 'CREATE',
          entityId: this.config.serviceName,
          entityType: 'Deployment',
          newState: {
            id: this.config.serviceName,
            type: 'Deployment',
            version: 1,
            data: {
              stableVersion: this.config.stableVersion,
              canaryVersion: this.config.canaryVersion,
              steps: this.config.trafficSteps,
            },
            metadata: {},
          },
          stableVersion: this.config.stableVersion,
          canaryVersion: this.config.canaryVersion,
          steps: this.config.trafficSteps
        },
        metadata: {
           purpose: 'Canary Deployment',
           component: 'CanaryOrchestrator'
        }
      });
    } catch (e) {
      console.warn('Failed to record canary start to ledger', e);
    }

    for (const step of this.config.trafficSteps) {
      await this.shiftTraffic(step);

      // Allow time for metrics to propagate
      // Use shorter time if in test/simulated mode?
      await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced from 5000 for demo speed

      const isHealthy = await this.validateHealth();
      if (!isHealthy) {
        console.error('Canary version is unhealthy. Rolling back.');
        await this.rollback("SLO Breach detected during canary step");
        return false;
      }
      console.log(`Canary version is healthy at ${step}% traffic.`);
    }

    console.log('Canary deployment successful. Promoting to 100% traffic.');
    await this.promote();
    return true;
  }

  private async shiftTraffic(percentage: number): Promise<void> {
    console.log(`Shifting traffic to ${percentage}% for canary version ${this.config.canaryVersion}.`);
    await this._loadBalancer.setTrafficPercentage(this.config.serviceName, this.config.canaryVersion, percentage);
    await this._loadBalancer.setTrafficPercentage(this.config.serviceName, this.config.stableVersion, 100 - percentage);
  }

  private async validateHealth(): Promise<boolean> {
    console.log(`Validating health of canary version ${this.config.canaryVersion}...`);
    const { errorRate, latency } = await this._monitoringService.getMetrics(this.config.serviceName, this.config.canaryVersion);

    console.log(`Metrics - Error Rate: ${errorRate}, Latency: ${latency}ms`);

    let failureReason = "";
    if (errorRate > this.config.errorRateThreshold) {
      failureReason = `Error rate ${errorRate} exceeds threshold of ${this.config.errorRateThreshold}`;
    } else if (latency > this.config.latencyThreshold) {
      failureReason = `Latency ${latency}ms exceeds threshold of ${this.config.latencyThreshold}`;
    }

    if (failureReason) {
      console.error(`Health check failed: ${failureReason}`);

      try {
        await provenanceLedger.appendEntry({
          tenantId: this.config.tenantId,
          actorId: this.config.actorId,
          actorType: 'system',
          actionType: 'SLO_BREACH',
          resourceType: 'Deployment',
          resourceId: this.config.serviceName,
          timestamp: new Date(),
          payload: {
            mutationType: 'CREATE',
            entityId: this.config.serviceName,
            entityType: 'Deployment',
            newState: {
              id: this.config.serviceName,
              type: 'Deployment',
              version: 1,
              data: {
                errorRate,
                latency,
                thresholds: {
                  errorRate: this.config.errorRateThreshold,
                  latency: this.config.latencyThreshold,
                },
                reason: failureReason,
              },
              metadata: {},
            },
            errorRate,
            latency,
            thresholds: {
              errorRate: this.config.errorRateThreshold,
              latency: this.config.latencyThreshold
            },
            reason: failureReason
          },
          metadata: {
             purpose: 'Canary Health Check',
             component: 'CanaryOrchestrator'
          }
        });
      } catch (e) {
        console.warn('Failed to record SLO breach to ledger', e);
      }

      return false;
    }
    return true;
  }

  private async rollback(reason: string): Promise<void> {
    console.log("Rolling back traffic to the stable version...");

    // Use RollbackEngine
    await this.rollbackEngine.performRollback({
      serviceName: this.config.serviceName,
      reason: reason,
      tenantId: this.config.tenantId,
      actorId: this.config.actorId,
      migrationSteps: 0 // Assume no DB migration for canary rollback usually
    });

    await this._loadBalancer.setTrafficPercentage(this.config.serviceName, this.config.canaryVersion, 0);
    await this._loadBalancer.setTrafficPercentage(this.config.serviceName, this.config.stableVersion, 100);
    console.log('Rollback complete.');
  }

  private async promote(): Promise<void> {
    await this._loadBalancer.setTrafficPercentage(this.config.serviceName, this.config.canaryVersion, 100);
    await this._loadBalancer.setTrafficPercentage(this.config.serviceName, this.config.stableVersion, 0);

    try {
        await provenanceLedger.appendEntry({
          tenantId: this.config.tenantId,
          actorId: this.config.actorId,
          actorType: 'system',
          actionType: 'CANARY_PROMOTE',
          resourceType: 'Deployment',
          resourceId: this.config.serviceName,
          timestamp: new Date(),
          payload: {
            mutationType: 'CREATE',
            entityId: this.config.serviceName,
            entityType: 'Deployment',
            newState: {
              id: this.config.serviceName,
              type: 'Deployment',
              version: 1,
              data: {
                version: this.config.canaryVersion,
              },
              metadata: {},
            },
            version: this.config.canaryVersion
          },
          metadata: {
             purpose: 'Canary Promotion',
             component: 'CanaryOrchestrator'
          }
        });
      } catch (e) {
        console.warn('Failed to record promotion to ledger', e);
      }

    console.log('Promotion to 100% complete.');
  }
}
