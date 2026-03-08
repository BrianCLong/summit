"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = void 0;
class CircuitBreaker {
    failureThreshold;
    resetTimeoutMs;
    failures = 0;
    openUntil = 0;
    constructor(failureThreshold, resetTimeoutMs) {
        this.failureThreshold = failureThreshold;
        this.resetTimeoutMs = resetTimeoutMs;
    }
    canRequest() {
        return Date.now() >= this.openUntil;
    }
    success() {
        this.failures = 0;
    }
    failure() {
        this.failures += 1;
        if (this.failures >= this.failureThreshold) {
            this.openUntil = Date.now() + this.resetTimeoutMs;
            this.failures = 0;
        }
    }
}
exports.CircuitBreaker = CircuitBreaker;
