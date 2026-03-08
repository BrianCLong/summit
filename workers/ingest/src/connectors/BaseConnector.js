"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseConnector = void 0;
const zod_1 = require("zod");
const logger_1 = require("../utils/logger");
class BaseConnector {
    config;
    logger = logger_1.logger.child({ component: 'connector' });
    schema;
    constructor(config) {
        this.config = config;
        this.logger = logger_1.logger.child({
            component: 'connector',
            connector_name: config.name,
            connector_type: config.type,
        });
        // Load schema if specified
        if (config.schemaRef) {
            this.loadSchema(config.schemaRef);
        }
    }
    loadSchema(schemaRef) {
        // In production, implement actual schema loading from repo://
        // For development, create basic validation schemas
        if (schemaRef.includes('entities.schema.yaml')) {
            this.schema = zod_1.z.object({
                entity_id: zod_1.z.string(),
                entity_name: zod_1.z.string().optional(),
                type: zod_1.z.string(),
            });
        }
        else if (schemaRef.includes('indicators.schema.yaml')) {
            this.schema = zod_1.z.object({
                ioc_id: zod_1.z.string(),
                indicator_type: zod_1.z.string(),
                ioc_value: zod_1.z.string(),
                confidence_score: zod_1.z.number().min(0).max(1).optional(),
            });
        }
        else if (schemaRef.includes('topicality.schema.yaml')) {
            this.schema = zod_1.z.object({
                insight_id: zod_1.z.string(),
                insight_type: zod_1.z.string(),
                relevance_score: zod_1.z.number().optional(),
                related_entities: zod_1.z.array(zod_1.z.any()).optional(),
                topic_tags: zod_1.z.array(zod_1.z.string()).optional(),
                timestamp: zod_1.z.string().optional(),
            });
        }
    }
    /**
     * Get connector metrics for monitoring
     */
    getMetrics() {
        return {
            // Override in subclasses to provide specific metrics
            uptime: Date.now(),
        };
    }
    /**
     * Graceful shutdown
     */
    async shutdown() {
        this.logger.info('Shutting down connector', {
            connector: this.config.name,
        });
        // Override in subclasses for cleanup
    }
}
exports.BaseConnector = BaseConnector;
