"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsistencyStore = void 0;
const config_js_1 = require("../../config.js");
const logger_js_1 = __importDefault(require("../../config/logger.js"));
class ConsistencyStore {
    redis;
    logger = logger_js_1.default.child({ name: 'ConsistencyStore' });
    KEY_PREFIX = 'consistency:reports';
    constructor() {
        this.redis = new ioredis_1.Redis({
            host: config_js_1.cfg.REDIS_HOST,
            port: config_js_1.cfg.REDIS_PORT,
            password: config_js_1.cfg.REDIS_PASSWORD,
            tls: config_js_1.cfg.REDIS_TLS ? {} : undefined,
        });
    }
    async saveReports(reports) {
        const pipeline = this.redis.pipeline();
        // Clear old reports
        pipeline.del(this.KEY_PREFIX);
        if (reports.length > 0) {
            // Store new reports
            const value = JSON.stringify(reports);
            pipeline.set(this.KEY_PREFIX, value);
        }
        await pipeline.exec();
        this.logger.info(`Saved ${reports.length} consistency reports to cache`);
    }
    async getReports() {
        const data = await this.redis.get(this.KEY_PREFIX);
        if (!data)
            return [];
        try {
            return JSON.parse(data);
        }
        catch (err) {
            this.logger.error(err, 'Failed to parse consistency reports from cache');
            return [];
        }
    }
}
exports.ConsistencyStore = ConsistencyStore;
