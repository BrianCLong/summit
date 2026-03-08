"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = void 0;
const dbMetrics_js_1 = require("../metrics/dbMetrics.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class CircuitBreaker {
    options;
    failureCount = 0;
    state = 'closed';
    openUntil = 0;
    lastError;
    constructor(options) {
        this.options = options;
    }
    canExecute() {
        if (this.state === 'open') {
            if (Date.now() >= this.openUntil) {
                this.state = 'half-open';
                this.updateMetric();
                logger_js_1.default.warn({ component: this.options.name }, 'Circuit breaker transitioning to half-open');
                return true;
            }
            return false;
        }
        return true;
    }
    recordSuccess() {
        if (this.state !== 'closed' || this.failureCount !== 0) {
            logger_js_1.default.info({ component: this.options.name }, 'Circuit breaker reset to closed');
        }
        this.failureCount = 0;
        this.state = 'closed';
        this.openUntil = 0;
        this.lastError = undefined;
        this.updateMetric();
    }
    recordFailure(error) {
        this.failureCount += 1;
        this.lastError = error;
        dbMetrics_js_1.dbConnectionErrors.inc({ database: this.options.name, error_type: 'circuit_failure' });
        if (this.failureCount >= this.options.failureThreshold) {
            this.state = 'open';
            this.openUntil = Date.now() + this.options.cooldownMs;
            logger_js_1.default.error({ component: this.options.name, failureCount: this.failureCount, err: error }, 'Circuit breaker opened');
        }
        else if (this.state === 'half-open') {
            this.state = 'open';
            this.openUntil = Date.now() + this.options.cooldownMs;
            logger_js_1.default.error({ component: this.options.name, err: error }, 'Circuit breaker re-opened while half-open');
        }
        this.updateMetric();
    }
    getState() {
        if (this.state === 'open' && Date.now() >= this.openUntil) {
            return 'half-open';
        }
        return this.state;
    }
    updateMetric() {
        const stateValue = this.state === 'closed' ? 0 : this.state === 'half-open' ? 1 : 2;
        dbMetrics_js_1.circuitBreakerState.labels(this.options.name).set(stateValue);
    }
}
exports.CircuitBreaker = CircuitBreaker;
