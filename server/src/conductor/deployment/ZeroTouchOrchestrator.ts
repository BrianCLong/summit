
import { logger } from '../../config/logger.js';
import { getRedisClient } from '../../db/redis.js';
import { blueGreenDeploymentEngine, DeploymentConfig } from './blue-green.js';

/**
 * Orchestrator for Zero-Touch Deployments.
 * Listens for deployment triggers (e.g. from CI/CD or Registry Webhooks)
 * and automatically executes the Blue-Green engine.
 */
export class ZeroTouchOrchestrator {
  private static instance: ZeroTouchOrchestrator;
  private redis: any;
  private readonly TRIGGER_CHANNEL = 'summit:deployment:triggers';

  private constructor() {
    this.redis = getRedisClient('default');
  }

  public static getInstance(): ZeroTouchOrchestrator {
    if (!ZeroTouchOrchestrator.instance) {
      ZeroTouchOrchestrator.instance = new ZeroTouchOrchestrator();
    }
    return ZeroTouchOrchestrator.instance;
  }

  public async start(): Promise<void> {
    logger.info('ZeroTouchOrchestrator: Starting deployment trigger listener');
    
    const subscriber = this.redis.duplicate();
    await subscriber.subscribe(this.TRIGGER_CHANNEL);

    subscriber.on('message', async (channel: string, message: string) => {
      if (channel === this.TRIGGER_CHANNEL) {
        try {
          const trigger = JSON.parse(message);
          await this.handleTrigger(trigger);
        } catch (err: any) {
          logger.error({ err }, 'ZeroTouchOrchestrator: Failed to process deployment trigger');
        }
      }
    });
  }

  private async handleTrigger(trigger: { imageTag: string; environment: string }): Promise<void> {
    logger.info(trigger, 'ZeroTouchOrchestrator: Deployment trigger received');

    const config: DeploymentConfig = {
      strategy: 'canary',
      environment: trigger.environment as any,
      imageTag: trigger.imageTag,
      services: [
        {
          name: 'summit-server',
          image: 'summit-server',
          replicas: 3,
          resources: { cpu: '1', memory: '2Gi' },
          ports: [4000],
          healthEndpoint: '/api/health',
          environment: { NODE_ENV: trigger.environment }
        }
      ],
      healthChecks: [
        { name: 'api_health', type: 'http', target: 'http://{{environment}}.summit.com/api/health', timeout: 5, retries: 3, interval: 5000 }
      ],
      rollbackThreshold: {
        errorRate: 0.05, // 5%
        latencyP95: 200, // 200ms
        timeoutSeconds: 300
      },
      trafficSplit: {
        canaryPercent: 10,
        incrementPercent: 20,
        promoteThreshold: 90
      },
      validation: {
        smokeTests: true,
        integrationTests: true,
        performanceTests: false
      }
    };

    try {
      const deployId = await blueGreenDeploymentEngine.deploy(config);
      logger.info({ deployId }, 'ZeroTouchOrchestrator: Automatic deployment initiated');
    } catch (err: any) {
      logger.error({ err }, 'ZeroTouchOrchestrator: Failed to initiate automatic deployment');
    }
  }
}

export const zeroTouchOrchestrator = ZeroTouchOrchestrator.getInstance();
