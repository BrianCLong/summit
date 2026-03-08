"use strict";
// @ts-nocheck
/**
 * Circuit Breaker Pattern
 *
 * Prevents cascading failures by failing fast when a service is unavailable
 * States: CLOSED -> OPEN -> HALF_OPEN -> CLOSED
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = exports.CircuitState = void 0;
const events_1 = require("events");
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('circuit-breaker');
var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "CLOSED";
    CircuitState["OPEN"] = "OPEN";
    CircuitState["HALF_OPEN"] = "HALF_OPEN";
})(CircuitState || (exports.CircuitState = CircuitState = {}));
class CircuitBreaker extends events_1.EventEmitter {
    config;
    circuits = new Map();
    constructor(config) {
        super();
        this.config = config;
    }
    canRequest(serviceUrl) {
        const circuit = this.getCircuit(serviceUrl);
        switch (circuit.state) {
            case CircuitState.CLOSED:
                return true;
            case CircuitState.OPEN:
                if (this.shouldAttemptReset(circuit)) {
                    this.transitionToHalfOpen(serviceUrl, circuit);
                    return true;
                }
                return false;
            case CircuitState.HALF_OPEN:
                return true;
            default:
                return true;
        }
    }
    recordSuccess(serviceUrl) {
        const circuit = this.getCircuit(serviceUrl);
        circuit.successes++;
        circuit.failures = 0;
        if (circuit.state === CircuitState.HALF_OPEN) {
            this.transitionToClosed(serviceUrl, circuit);
        }
        logger.debug('Circuit breaker success recorded', {
            serviceUrl,
            state: circuit.state,
            successes: circuit.successes,
        });
    }
    recordFailure(serviceUrl) {
        const circuit = this.getCircuit(serviceUrl);
        circuit.failures++;
        circuit.lastFailureTime = Date.now();
        if (circuit.state === CircuitState.HALF_OPEN) {
            this.transitionToOpen(serviceUrl, circuit);
        }
        else if (circuit.failures >= this.config.threshold) {
            this.transitionToOpen(serviceUrl, circuit);
        }
        logger.warn('Circuit breaker failure recorded', {
            serviceUrl,
            state: circuit.state,
            failures: circuit.failures,
            threshold: this.config.threshold,
        });
    }
    getCircuit(serviceUrl) {
        if (!this.circuits.has(serviceUrl)) {
            this.circuits.set(serviceUrl, {
                failures: 0,
                successes: 0,
                state: CircuitState.CLOSED,
            });
        }
        return this.circuits.get(serviceUrl);
    }
    shouldAttemptReset(circuit) {
        if (!circuit.lastFailureTime) {
            return false;
        }
        const timeSinceLastFailure = Date.now() - circuit.lastFailureTime;
        return timeSinceLastFailure >= this.config.timeout;
    }
    transitionToOpen(serviceUrl, circuit) {
        circuit.state = CircuitState.OPEN;
        logger.error('Circuit breaker opened', { serviceUrl });
        this.emit('circuit:open', { serviceUrl, circuit });
    }
    transitionToHalfOpen(serviceUrl, circuit) {
        circuit.state = CircuitState.HALF_OPEN;
        logger.info('Circuit breaker half-open', { serviceUrl });
        this.emit('circuit:half-open', { serviceUrl, circuit });
    }
    transitionToClosed(serviceUrl, circuit) {
        circuit.state = CircuitState.CLOSED;
        circuit.failures = 0;
        logger.info('Circuit breaker closed', { serviceUrl });
        this.emit('circuit:closed', { serviceUrl, circuit });
    }
    getStatus(serviceUrl) {
        if (serviceUrl) {
            return this.circuits.get(serviceUrl) || null;
        }
        return Object.fromEntries(Array.from(this.circuits.entries()).map(([url, stats]) => [
            url,
            {
                state: stats.state,
                failures: stats.failures,
                successes: stats.successes,
            },
        ]));
    }
    reset(serviceUrl) {
        if (serviceUrl) {
            this.circuits.delete(serviceUrl);
        }
        else {
            this.circuits.clear();
        }
    }
}
exports.CircuitBreaker = CircuitBreaker;
