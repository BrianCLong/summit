"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HyperLogLog = exports.TopKTracker = exports.MovingAverageCalculator = exports.MetricsCalculator = void 0;
const events_1 = require("events");
const ioredis_1 = __importDefault(require("ioredis"));
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'stream-metrics' });
/**
 * Real-time metrics calculator
 */
class MetricsCalculator extends events_1.EventEmitter {
    redis = null;
    inMemoryMetrics = new Map();
    constructor(redisUrl) {
        super();
        if (redisUrl) {
            this.redis = new ioredis_1.default(redisUrl);
        }
    }
    /**
     * Increment counter
     */
    async increment(metric, value = 1, tags) {
        const key = this.buildKey(metric, tags);
        if (this.redis) {
            await this.redis.incrby(key, value);
        }
        else {
            const current = this.inMemoryMetrics.get(key) || { value: 0, timestamp: Date.now() };
            const val = typeof current.value === 'number' ? current.value : 0;
            this.inMemoryMetrics.set(key, { value: val + value, timestamp: Date.now() });
        }
        this.emit('metric', { metric, value, tags, type: 'counter' });
    }
    /**
     * Record gauge value
     */
    async gauge(metric, value, tags) {
        const key = this.buildKey(metric, tags);
        if (this.redis) {
            await this.redis.set(key, value);
        }
        else {
            this.inMemoryMetrics.set(key, { value, timestamp: Date.now() });
        }
        this.emit('metric', { metric, value, tags, type: 'gauge' });
    }
    /**
     * Record histogram value
     */
    async histogram(metric, value, tags) {
        const key = this.buildKey(`${metric}:histogram`, tags);
        if (this.redis) {
            await this.redis.zadd(key, Date.now(), value.toString());
            await this.redis.expire(key, 3600); // 1 hour TTL
        }
        else {
            // Store in memory (simplified)
            const current = this.inMemoryMetrics.get(key) || { value: [], timestamp: Date.now() };
            if (Array.isArray(current.value)) {
                current.value.push(value);
            }
            this.inMemoryMetrics.set(key, current);
        }
        this.emit('metric', { metric, value, tags, type: 'histogram' });
    }
    /**
     * Calculate percentile
     */
    async percentile(metric, p, tags) {
        const key = this.buildKey(`${metric}:histogram`, tags);
        if (this.redis) {
            const values = await this.redis.zrange(key, 0, -1);
            if (values.length === 0) {
                return 0;
            }
            const sorted = values.map(Number).sort((a, b) => a - b);
            const index = Math.ceil((p / 100) * sorted.length) - 1;
            return sorted[Math.max(0, index)];
        }
        else {
            const current = this.inMemoryMetrics.get(key);
            if (!current || !Array.isArray(current.value)) {
                return 0;
            }
            const sorted = current.value.sort((a, b) => a - b);
            const index = Math.ceil((p / 100) * sorted.length) - 1;
            return sorted[Math.max(0, index)];
        }
    }
    /**
     * Get metric value
     */
    async get(metric, tags) {
        const key = this.buildKey(metric, tags);
        if (this.redis) {
            const value = await this.redis.get(key);
            return value ? parseFloat(value) : 0;
        }
        else {
            const current = this.inMemoryMetrics.get(key);
            return typeof current?.value === 'number' ? current.value : 0;
        }
    }
    /**
     * Build metric key with tags
     */
    buildKey(metric, tags) {
        if (!tags) {
            return metric;
        }
        const tagString = Object.entries(tags)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join(',');
        return `${metric}{${tagString}}`;
    }
    /**
     * Disconnect
     */
    async disconnect() {
        if (this.redis) {
            await this.redis.quit();
        }
    }
}
exports.MetricsCalculator = MetricsCalculator;
/**
 * Moving average calculator
 */
class MovingAverageCalculator {
    windowSize;
    windows = new Map();
    constructor(windowSize) {
        this.windowSize = windowSize;
    }
    /**
     * Add value and get moving average
     */
    add(key, value) {
        if (!this.windows.has(key)) {
            this.windows.set(key, []);
        }
        const window = this.windows.get(key);
        window.push(value);
        if (window.length > this.windowSize) {
            window.shift();
        }
        return window.reduce((a, b) => a + b, 0) / window.length;
    }
    /**
     * Get current moving average
     */
    get(key) {
        const window = this.windows.get(key);
        if (!window || window.length === 0) {
            return 0;
        }
        return window.reduce((a, b) => a + b, 0) / window.length;
    }
}
exports.MovingAverageCalculator = MovingAverageCalculator;
/**
 * Top-K tracker
 */
class TopKTracker {
    counts = new Map();
    /**
     * Add item
     */
    add(item) {
        const count = this.counts.get(item) || 0;
        this.counts.set(item, count + 1);
    }
    /**
     * Get top K items
     */
    getTopK(k) {
        const sorted = Array.from(this.counts.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, k);
        return sorted.map(([item, count]) => ({ item, count }));
    }
    /**
     * Clear counts
     */
    clear() {
        this.counts.clear();
    }
}
exports.TopKTracker = TopKTracker;
/**
 * HyperLogLog for distinct count estimation
 */
class HyperLogLog {
    registers;
    m;
    alpha;
    constructor(precision = 14) {
        this.m = 1 << precision;
        this.registers = new Uint8Array(this.m);
        // Alpha constant for bias correction
        this.alpha = precision <= 4 ? 0.673 :
            precision === 5 ? 0.697 :
                precision === 6 ? 0.709 :
                    0.7213 / (1 + 1.079 / this.m);
    }
    /**
     * Add value
     */
    add(value) {
        const hash = this.hash(value);
        const j = hash & (this.m - 1);
        const w = hash >>> Math.log2(this.m);
        const leadingZeros = this.countLeadingZeros(w) + 1;
        if (leadingZeros > this.registers[j]) {
            this.registers[j] = leadingZeros;
        }
    }
    /**
     * Get cardinality estimate
     */
    count() {
        let sum = 0;
        let zeros = 0;
        for (let i = 0; i < this.m; i++) {
            sum += 1 / Math.pow(2, this.registers[i]);
            if (this.registers[i] === 0) {
                zeros++;
            }
        }
        const estimate = this.alpha * this.m * this.m / sum;
        // Small range correction
        if (estimate <= 2.5 * this.m && zeros > 0) {
            return this.m * Math.log(this.m / zeros);
        }
        // Large range correction
        if (estimate > (1 / 30) * Math.pow(2, 32)) {
            return -Math.pow(2, 32) * Math.log(1 - estimate / Math.pow(2, 32));
        }
        return estimate;
    }
    /**
     * Simple hash function
     */
    hash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash >>> 0; // Unsigned
    }
    /**
     * Count leading zeros
     */
    countLeadingZeros(n) {
        if (n === 0) {
            return 32;
        }
        let count = 0;
        for (let i = 31; i >= 0; i--) {
            if ((n & (1 << i)) === 0) {
                count++;
            }
            else {
                break;
            }
        }
        return count;
    }
}
exports.HyperLogLog = HyperLogLog;
