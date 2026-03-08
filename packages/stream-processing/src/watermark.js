"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PunctuatedWatermarkGenerator = exports.PeriodicWatermarkGenerator = exports.WatermarkGenerator = void 0;
const eventemitter3_1 = require("eventemitter3");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'watermark-generator' });
/**
 * Watermark generator for handling late data
 */
class WatermarkGenerator extends eventemitter3_1.EventEmitter {
    currentWatermark = 0;
    maxOutOfOrderness = 5000; // 5 seconds default
    lastEventTime = 0;
    constructor(maxOutOfOrderness) {
        super();
        if (maxOutOfOrderness !== undefined) {
            this.maxOutOfOrderness = maxOutOfOrderness;
        }
    }
    /**
     * Generate watermark based on event time
     */
    generate(eventTime) {
        // Update last event time
        if (eventTime > this.lastEventTime) {
            this.lastEventTime = eventTime;
        }
        // Calculate watermark (event time - max out of orderness)
        const newWatermark = this.lastEventTime - this.maxOutOfOrderness;
        // Only advance watermark (never go backwards)
        if (newWatermark > this.currentWatermark) {
            this.currentWatermark = newWatermark;
            const watermark = {
                timestamp: this.currentWatermark,
                maxOutOfOrderness: this.maxOutOfOrderness,
            };
            this.emit('watermark', watermark);
            logger.debug({ watermark: this.currentWatermark }, 'Watermark advanced');
            return watermark;
        }
        return {
            timestamp: this.currentWatermark,
            maxOutOfOrderness: this.maxOutOfOrderness,
        };
    }
    /**
     * Get current watermark
     */
    getCurrentWatermark() {
        return this.currentWatermark;
    }
    /**
     * Check if event is late
     */
    isLate(eventTime) {
        return eventTime < this.currentWatermark;
    }
    /**
     * Set max out of orderness
     */
    setMaxOutOfOrderness(maxOutOfOrderness) {
        this.maxOutOfOrderness = maxOutOfOrderness;
    }
    /**
     * Reset watermark
     */
    reset() {
        this.currentWatermark = 0;
        this.lastEventTime = 0;
        logger.info('Watermark reset');
    }
}
exports.WatermarkGenerator = WatermarkGenerator;
/**
 * Periodic watermark generator
 */
class PeriodicWatermarkGenerator extends WatermarkGenerator {
    periodMs;
    interval = null;
    constructor(periodMs = 1000, maxOutOfOrderness) {
        super(maxOutOfOrderness);
        this.periodMs = periodMs;
    }
    /**
     * Start periodic watermark generation
     */
    start() {
        if (this.interval) {
            return;
        }
        this.interval = setInterval(() => {
            const now = Date.now();
            this.generate(now);
        }, this.periodMs);
        logger.info({ periodMs: this.periodMs }, 'Periodic watermark generation started');
    }
    /**
     * Stop periodic watermark generation
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            logger.info('Periodic watermark generation stopped');
        }
    }
}
exports.PeriodicWatermarkGenerator = PeriodicWatermarkGenerator;
/**
 * Punctuated watermark generator
 */
class PunctuatedWatermarkGenerator extends WatermarkGenerator {
    extractWatermark;
    constructor(extractWatermark, maxOutOfOrderness) {
        super(maxOutOfOrderness);
        this.extractWatermark = extractWatermark;
    }
    /**
     * Generate watermark with custom extraction logic
     */
    generate(eventTime) {
        const watermarkTime = this.extractWatermark(eventTime);
        if (watermarkTime !== null) {
            return super.generate(watermarkTime);
        }
        return {
            timestamp: this.getCurrentWatermark(),
            maxOutOfOrderness: this.maxOutOfOrderness,
        };
    }
}
exports.PunctuatedWatermarkGenerator = PunctuatedWatermarkGenerator;
