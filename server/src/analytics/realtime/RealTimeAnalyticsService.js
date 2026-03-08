"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealTimeAnalyticsService = void 0;
const Logger_js_1 = require("../../streaming/Logger.js");
class RealTimeAnalyticsService {
    consumer;
    logger = new Logger_js_1.Logger('RealTimeAnalyticsService');
    metrics = new Map();
    constructor(consumer) {
        this.consumer = consumer;
    }
    async start() {
        this.logger.info('Starting RealTimeAnalyticsService');
        await this.consumer.run(async (message) => {
            this.updateMetrics(message);
        });
    }
    updateMetrics(event) {
        if (event.type === 'AGGREGATION_UPDATE') {
            this.metrics.set(event.entityId, {
                count: event.count,
                lastUpdated: event.timestamp,
            });
            this.logger.info(`Updated metric for ${event.entityId}: ${event.count}`);
        }
    }
    getMetric(entityId) {
        return this.metrics.get(entityId);
    }
    getAllMetrics() {
        return Object.fromEntries(this.metrics);
    }
}
exports.RealTimeAnalyticsService = RealTimeAnalyticsService;
