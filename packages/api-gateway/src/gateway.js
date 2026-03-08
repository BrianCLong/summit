"use strict";
// @ts-nocheck
/* eslint-disable */
/**
 * API Gateway - Main Gateway Class
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIGateway = void 0;
const events_1 = require("events");
const router_js_1 = require("./routing/router.js");
const load_balancer_js_1 = require("./routing/load-balancer.js");
const circuit_breaker_js_1 = require("./routing/circuit-breaker.js");
const logger_js_1 = require("./utils/logger.js");
const logger = (0, logger_js_1.createLogger)('gateway');
class APIGateway extends events_1.EventEmitter {
    router;
    loadBalancer;
    circuitBreaker;
    config;
    constructor(config) {
        super();
        this.config = config;
        this.router = new router_js_1.Router(config.routes);
        this.loadBalancer = new load_balancer_js_1.LoadBalancer(config.loadBalancing?.strategy || 'round-robin', config.loadBalancing?.healthCheckInterval);
        this.circuitBreaker = new circuit_breaker_js_1.CircuitBreaker({
            threshold: config.circuitBreaker?.threshold || 5,
            timeout: config.circuitBreaker?.timeout || 60000,
            resetTimeout: config.circuitBreaker?.resetTimeout || 30000,
        });
        logger.info('API Gateway initialized', {
            routes: config.routes.length,
            strategy: config.loadBalancing?.strategy || 'round-robin',
        });
    }
    async handleRequest(req, res) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        try {
            // Route matching
            const route = this.router.match(req.url || '/', req.method || 'GET');
            if (!route) {
                this.sendError(res, 404, 'Route not found');
                return;
            }
            // Select backend using load balancer
            const backend = await this.loadBalancer.selectBackend(route.backends);
            if (!backend) {
                this.sendError(res, 503, 'No available backends');
                return;
            }
            // Check circuit breaker
            if (!this.circuitBreaker.canRequest(backend.url)) {
                this.sendError(res, 503, 'Service temporarily unavailable');
                return;
            }
            // Forward request with retry logic
            await this.forwardRequest(req, res, backend.url, route);
            const duration = Date.now() - startTime;
            this.circuitBreaker.recordSuccess(backend.url);
            logger.info('Request completed', {
                requestId,
                method: req.method,
                url: req.url,
                backend: backend.url,
                duration,
            });
            this.emit('request:success', { requestId, duration, backend });
        }
        catch (error) {
            const duration = Date.now() - startTime;
            logger.error('Request failed', {
                requestId,
                error: error instanceof Error ? error.message : String(error),
                duration,
            });
            this.emit('request:error', { requestId, error, duration });
            if (!res.headersSent) {
                this.sendError(res, 500, 'Internal server error');
            }
        }
    }
    async forwardRequest(req, res, backendUrl, route) {
        const maxRetries = this.config.retryPolicy?.maxRetries || 3;
        let lastError = null;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                await this.executeRequest(req, res, backendUrl, route);
                return;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt < maxRetries) {
                    const delay = this.calculateRetryDelay(attempt);
                    await this.sleep(delay);
                    logger.warn('Retrying request', { attempt: attempt + 1, delay });
                }
            }
        }
        this.circuitBreaker.recordFailure(backendUrl);
        throw lastError || new Error('Request failed');
    }
    async executeRequest(req, res, backendUrl, route) {
        return new Promise((resolve, reject) => {
            // This is a simplified implementation
            // In production, use http-proxy or similar library
            const timeout = setTimeout(() => {
                reject(new Error('Request timeout'));
            }, this.config.timeout || 30000);
            // Proxy logic would go here
            // For now, we'll simulate a successful response
            clearTimeout(timeout);
            resolve();
        });
    }
    calculateRetryDelay(attempt) {
        const baseDelay = this.config.retryPolicy?.retryDelay || 1000;
        if (this.config.retryPolicy?.exponentialBackoff) {
            return baseDelay * Math.pow(2, attempt);
        }
        return baseDelay;
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    sendError(res, statusCode, message) {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: message, statusCode }));
    }
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    getMetrics() {
        return {
            routes: this.router.getRoutes().length,
            circuitBreakerStatus: this.circuitBreaker.getStatus(),
            loadBalancerStats: this.loadBalancer.getStats(),
        };
    }
}
exports.APIGateway = APIGateway;
