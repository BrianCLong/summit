"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.circuitBreakerMiddleware = exports.circuitBreaker = void 0;
const metrics_js_1 = require("../monitoring/metrics.js");
const breakers = {};
const CONFIG = {
    FAILURE_THRESHOLD: 10,
    RESET_TIMEOUT: 30000, // 30s
};
function getBreaker(service) {
    if (!breakers[service]) {
        breakers[service] = {
            state: 'CLOSED',
            failures: 0,
            lastFailure: 0,
            nextAttempt: 0,
        };
        metrics_js_1.metrics.breakerState.labels(service).set(0);
    }
    return breakers[service];
}
const circuitBreaker = (serviceName) => {
    return (req, res, next) => {
        // Feature flag check (env var for now)
        if (process.env.CIRCUIT_BREAKER_ENABLED !== 'true') {
            return next();
        }
        const breaker = getBreaker(serviceName);
        if (breaker.state === 'OPEN') {
            if (Date.now() > breaker.nextAttempt) {
                breaker.state = 'HALF_OPEN';
                metrics_js_1.metrics.breakerState.labels(serviceName).set(2); // 2 = Half Open
            }
            else {
                return res.status(503).json({ error: 'Service Unavailable (Circuit Breaker)' });
            }
        }
        // Wrap response to catch errors
        // Express response 'finish' event captures status code
        res.on('finish', () => {
            if (res.statusCode >= 500) {
                breaker.failures++;
                breaker.lastFailure = Date.now();
                if (breaker.failures >= CONFIG.FAILURE_THRESHOLD) {
                    breaker.state = 'OPEN';
                    breaker.nextAttempt = Date.now() + CONFIG.RESET_TIMEOUT;
                    metrics_js_1.metrics.breakerState.labels(serviceName).set(1); // 1 = Open
                }
            }
            else if (res.statusCode < 500 && breaker.state === 'HALF_OPEN') {
                // Success in half-open -> Close
                breaker.state = 'CLOSED';
                breaker.failures = 0;
                metrics_js_1.metrics.breakerState.labels(serviceName).set(0); // 0 = Closed
            }
        });
        next();
    };
};
exports.circuitBreaker = circuitBreaker;
exports.circuitBreakerMiddleware = (0, exports.circuitBreaker)('API_GATEWAY');
