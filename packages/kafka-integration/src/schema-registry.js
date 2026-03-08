"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaRegistryClient = void 0;
/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-non-null-assertion */
// @ts-nocheck
const confluent_schema_registry_1 = require("@kafkajs/confluent-schema-registry");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'schema-registry' });
/**
 * Schema Registry client for message schema management
 */
class SchemaRegistryClient {
    registry;
    schemaCache = new Map();
    constructor(config) {
        this.registry = new confluent_schema_registry_1.SchemaRegistry({
            host: config.host,
            auth: config.auth,
            clientId: config.clientId,
        });
    }
    /**
     * Register a new schema
     */
    async registerSchema(subject, schema, type = confluent_schema_registry_1.SchemaType.AVRO) {
        try {
            const { id } = await this.registry.register({ type, schema: JSON.stringify(schema) }, { subject });
            this.schemaCache.set(subject, { id, schema });
            logger.info({ subject, id }, 'Schema registered');
            return id;
        }
        catch (error) {
            logger.error({ error, subject }, 'Failed to register schema');
            throw error;
        }
    }
    /**
     * Get schema by subject
     */
    async getSchema(subject) {
        // Check cache first
        if (this.schemaCache.has(subject)) {
            return this.schemaCache.get(subject).schema;
        }
        try {
            const schema = await this.registry.getLatestSchemaId(subject);
            return schema;
        }
        catch (error) {
            logger.error({ error, subject }, 'Failed to get schema');
            throw error;
        }
    }
    /**
     * Encode message using schema
     */
    async encode(subject, message) {
        try {
            const schemaId = await this.registry.getLatestSchemaId(subject);
            const encoded = await this.registry.encode(schemaId, message);
            return encoded;
        }
        catch (error) {
            logger.error({ error, subject }, 'Failed to encode message');
            throw error;
        }
    }
    /**
     * Decode message using schema
     */
    async decode(buffer) {
        try {
            const decoded = await this.registry.decode(buffer);
            return decoded;
        }
        catch (error) {
            logger.error({ error }, 'Failed to decode message');
            throw error;
        }
    }
    /**
     * Check schema compatibility
     */
    async checkCompatibility(subject, schema, type = confluent_schema_registry_1.SchemaType.AVRO) {
        try {
            const result = await this.registry.checkCompatibility(subject, {
                type,
                schema: JSON.stringify(schema),
            });
            return result.compatible;
        }
        catch (error) {
            logger.error({ error, subject }, 'Failed to check compatibility');
            throw error;
        }
    }
}
exports.SchemaRegistryClient = SchemaRegistryClient;
