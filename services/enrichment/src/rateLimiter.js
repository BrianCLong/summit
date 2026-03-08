"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenBucket = void 0;
class TokenBucket {
    capacity;
    refillPerSecond;
    tokens;
    lastRefill;
    constructor(capacity, refillPerSecond) {
        this.capacity = capacity;
        this.refillPerSecond = refillPerSecond;
        this.tokens = capacity;
        this.lastRefill = Date.now();
    }
    take() {
        this.refill();
        if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
        }
        return false;
    }
    refill() {
        const now = Date.now();
        const elapsed = (now - this.lastRefill) / 1000;
        if (elapsed > 0) {
            this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSecond);
            this.lastRefill = now;
        }
    }
}
exports.TokenBucket = TokenBucket;
