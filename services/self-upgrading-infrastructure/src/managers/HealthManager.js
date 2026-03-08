"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthManager = void 0;
const events_1 = require("events");
const logger_js_1 = require("../utils/logger.js");
class HealthManager extends events_1.EventEmitter {
    config;
    componentHealth = new Map();
    checkInterval = null;
    constructor(config) {
        super();
        this.config = config;
        this.initializeComponents();
    }
    initializeComponents() {
        const components = [
            'api-gateway', 'graph-api', 'copilot', 'neo4j', 'postgres',
            'redis', 'kafka', 'auth-service', 'analytics-engine'
        ];
        for (const component of components) {
            this.componentHealth.set(component, {
                component,
                status: 'healthy',
                latency: 0,
                lastCheck: new Date(),
                metrics: {},
            });
        }
    }
    start() {
        if (this.checkInterval) {
            return;
        }
        logger_js_1.logger.info('Starting health monitoring');
        this.checkInterval = setInterval(() => this.runHealthChecks(), this.config.checkIntervalMs);
        this.runHealthChecks();
    }
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            logger_js_1.logger.info('Health monitoring stopped');
        }
    }
    async runHealthChecks() {
        for (const [name, health] of this.componentHealth) {
            const previousStatus = health.status;
            await this.checkComponent(name);
            if (health.status !== previousStatus) {
                this.emit('health_change', { component: name, from: previousStatus, to: health.status });
                if (health.status === 'unhealthy') {
                    this.emit('component_unhealthy', health);
                }
            }
        }
    }
    async checkComponent(name) {
        const health = this.componentHealth.get(name);
        if (!health) {
            return;
        }
        const start = Date.now();
        try {
            // Simulated health check - in production, make actual HTTP/TCP checks
            const isHealthy = await this.simulateHealthCheck(name);
            const latency = Date.now() - start;
            health.latency = latency;
            health.lastCheck = new Date();
            health.metrics = {
                responseTime: latency,
                uptime: Math.random() * 99 + 1,
                errorRate: Math.random() * 0.5,
            };
            if (!isHealthy) {
                health.status = 'unhealthy';
            }
            else if (latency > this.config.degradedLatencyMs) {
                health.status = 'degraded';
            }
            else {
                health.status = 'healthy';
            }
        }
        catch (error) {
            health.status = 'unhealthy';
            health.lastCheck = new Date();
            logger_js_1.logger.error(`Health check failed for ${name}`, { error });
        }
    }
    async simulateHealthCheck(name) {
        // Simulated - 98% healthy
        return Math.random() > 0.02;
    }
    getSystemHealth() {
        const components = Array.from(this.componentHealth.values());
        const unhealthyCount = components.filter(c => c.status === 'unhealthy').length;
        const degradedCount = components.filter(c => c.status === 'degraded').length;
        let overall;
        if (unhealthyCount > 0) {
            overall = 'unhealthy';
        }
        else if (degradedCount > 0) {
            overall = 'degraded';
        }
        else {
            overall = 'healthy';
        }
        return {
            overall,
            components,
            timestamp: new Date(),
        };
    }
    getComponentHealth(name) {
        return this.componentHealth.get(name);
    }
    isSystemHealthy() {
        return this.getSystemHealth().overall === 'healthy';
    }
}
exports.HealthManager = HealthManager;
