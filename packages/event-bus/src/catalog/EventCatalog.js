"use strict";
/**
 * EventCatalog - Event type catalog with schema registry
 *
 * Manage event schemas, versioning, and validation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventCatalog = void 0;
const events_1 = require("events");
const pino_1 = __importDefault(require("pino"));
class EventCatalog extends events_1.EventEmitter {
    redis;
    logger;
    schemas = new Map();
    constructor(redis) {
        super();
        this.redis = redis;
        this.logger = (0, pino_1.default)({ name: 'EventCatalog' });
    }
    /**
     * Register event schema
     */
    async registerSchema(schema) {
        const key = `event-catalog:${schema.eventType}:${schema.version}`;
        await this.redis.set(key, JSON.stringify(schema));
        // Update version index
        await this.redis.sadd(`event-catalog:${schema.eventType}:versions`, schema.version);
        // Update latest version
        const currentLatest = await this.getLatestVersion(schema.eventType);
        if (!currentLatest || schema.version > currentLatest) {
            await this.redis.set(`event-catalog:${schema.eventType}:latest`, schema.version);
        }
        // Cache locally
        if (!this.schemas.has(schema.eventType)) {
            this.schemas.set(schema.eventType, new Map());
        }
        this.schemas.get(schema.eventType).set(schema.version, schema);
        this.logger.info({ eventType: schema.eventType, version: schema.version }, 'Schema registered');
        this.emit('schema:registered', schema);
    }
    /**
     * Get event schema
     */
    async getSchema(eventType, version) {
        const targetVersion = version || (await this.getLatestVersion(eventType));
        if (!targetVersion) {
            return null;
        }
        // Check cache
        const cached = this.schemas.get(eventType)?.get(targetVersion);
        if (cached) {
            return cached;
        }
        // Load from Redis
        const key = `event-catalog:${eventType}:${targetVersion}`;
        const data = await this.redis.get(key);
        if (!data) {
            return null;
        }
        const schema = JSON.parse(data);
        // Cache locally
        if (!this.schemas.has(eventType)) {
            this.schemas.set(eventType, new Map());
        }
        this.schemas.get(eventType).set(targetVersion, schema);
        return schema;
    }
    /**
     * Get latest version for event type
     */
    async getLatestVersion(eventType) {
        const version = await this.redis.get(`event-catalog:${eventType}:latest`);
        return version ? parseInt(version, 10) : null;
    }
    /**
     * Get all versions for event type
     */
    async getVersions(eventType) {
        const versions = await this.redis.smembers(`event-catalog:${eventType}:versions`);
        return versions.map(v => parseInt(v, 10)).sort((a, b) => a - b);
    }
    /**
     * Get event type metadata
     */
    async getEventTypeMetadata(eventType) {
        const latestVersion = await this.getLatestVersion(eventType);
        if (!latestVersion) {
            return null;
        }
        const versions = await this.getVersions(eventType);
        const latestSchema = await this.getSchema(eventType, latestVersion);
        return {
            eventType,
            latestVersion,
            versions,
            description: latestSchema?.description,
            tags: []
        };
    }
    /**
     * List all event types
     */
    async listEventTypes() {
        const pattern = 'event-catalog:*:latest';
        const keys = await this.redis.keys(pattern);
        return keys.map(key => {
            const parts = key.split(':');
            return parts[1];
        });
    }
    /**
     * Validate event against schema
     */
    async validate(eventType, version, data) {
        const schema = await this.getSchema(eventType, version);
        if (!schema) {
            return {
                valid: false,
                errors: [`Schema not found: ${eventType} v${version}`]
            };
        }
        // Simple validation - could integrate with JSON Schema validator
        // For now just check existence
        return { valid: true };
    }
    /**
     * Deprecate schema version
     */
    async deprecateSchema(eventType, version, replacedBy) {
        const schema = await this.getSchema(eventType, version);
        if (!schema) {
            throw new Error(`Schema not found: ${eventType} v${version}`);
        }
        schema.deprecated = true;
        schema.replacedBy = replacedBy;
        schema.updatedAt = new Date();
        await this.registerSchema(schema);
        this.logger.info({ eventType, version, replacedBy }, 'Schema deprecated');
        this.emit('schema:deprecated', { eventType, version, replacedBy });
    }
}
exports.EventCatalog = EventCatalog;
