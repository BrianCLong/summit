"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zeroTouchOrchestrator = exports.ZeroTouchOrchestrator = void 0;
const logger_js_1 = require("../../config/logger.js");
const redis_js_1 = require("../../db/redis.js");
const blue_green_js_1 = require("./blue-green.js");
/**
 * Orchestrator for Zero-Touch Deployments.
 * Listens for deployment triggers (e.g. from CI/CD or Registry Webhooks)
 * and automatically executes the Blue-Green engine.
 */
class ZeroTouchOrchestrator {
    static instance;
    redis;
    TRIGGER_CHANNEL = 'summit:deployment:triggers';
    constructor() {
        this.redis = (0, redis_js_1.getRedisClient)('default');
    }
    static getInstance() {
        if (!ZeroTouchOrchestrator.instance) {
            ZeroTouchOrchestrator.instance = new ZeroTouchOrchestrator();
        }
        return ZeroTouchOrchestrator.instance;
    }
    async start() {
        logger_js_1.logger.info('ZeroTouchOrchestrator: Starting deployment trigger listener');
        const subscriber = this.redis.duplicate();
        await subscriber.subscribe(this.TRIGGER_CHANNEL);
        subscriber.on('message', async (channel, message) => {
            if (channel === this.TRIGGER_CHANNEL) {
                try {
                    const trigger = JSON.parse(message);
                    await this.handleTrigger(trigger);
                }
                catch (err) {
                    logger_js_1.logger.error({ err }, 'ZeroTouchOrchestrator: Failed to process deployment trigger');
                }
            }
        });
    }
    async handleTrigger(trigger) {
        logger_js_1.logger.info(trigger, 'ZeroTouchOrchestrator: Deployment trigger received');
        const config = {
            strategy: 'canary',
            environment: trigger.environment,
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
            const deployId = await blue_green_js_1.blueGreenDeploymentEngine.deploy(config);
            logger_js_1.logger.info({ deployId }, 'ZeroTouchOrchestrator: Automatic deployment initiated');
        }
        catch (err) {
            logger_js_1.logger.error({ err }, 'ZeroTouchOrchestrator: Failed to initiate automatic deployment');
        }
    }
}
exports.ZeroTouchOrchestrator = ZeroTouchOrchestrator;
exports.zeroTouchOrchestrator = ZeroTouchOrchestrator.getInstance();
