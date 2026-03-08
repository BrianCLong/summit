"use strict";
/**
 * GraphQL Schema Versioning
 * Manages version-specific GraphQL schemas
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.versionDirectives = exports.schemaVersionManager = void 0;
const schema_1 = require("@graphql-tools/schema");
const logger_js_1 = require("../utils/logger.js");
class SchemaVersionManager {
    schemas = new Map();
    /**
     * Register a versioned schema
     */
    registerSchema(schema) {
        this.schemas.set(schema.version, schema);
        logger_js_1.logger.info({
            message: 'Registered schema version',
            version: schema.version,
        });
    }
    /**
     * Get schema for a specific version
     */
    getSchema(version) {
        return this.schemas.get(version);
    }
    /**
     * Get executable schema for a version
     */
    getExecutableSchema(version) {
        const versionedSchema = this.getSchema(version);
        if (!versionedSchema) {
            throw new Error(`Schema for version ${version} not found`);
        }
        return (0, schema_1.makeExecutableSchema)({
            typeDefs: versionedSchema.typeDefs,
            resolvers: versionedSchema.resolvers,
        });
    }
    /**
     * Get all registered schema versions
     */
    getAllVersions() {
        return Array.from(this.schemas.keys());
    }
    /**
     * Check if a schema version exists
     */
    hasSchema(version) {
        return this.schemas.has(version);
    }
    /**
     * Get schema differences between versions
     */
    getSchemaDiff(fromVersion, toVersion) {
        const fromSchema = this.getSchema(fromVersion);
        const toSchema = this.getSchema(toVersion);
        if (!fromSchema || !toSchema) {
            throw new Error('One or both schema versions not found');
        }
        // This is a simplified diff - in production, use a proper schema diff tool
        return {
            fromVersion,
            toVersion,
            addedTypes: [],
            removedTypes: [],
            modifiedTypes: [],
            addedFields: [],
            removedFields: [],
            modifiedFields: [],
            breakingChanges: [],
        };
    }
}
// Singleton instance
exports.schemaVersionManager = new SchemaVersionManager();
/**
 * Create a versioned GraphQL directive for deprecation
 */
exports.versionDirectives = `
  directive @deprecated(
    reason: String = "No longer supported"
    sunset: String
    replacement: String
  ) on FIELD_DEFINITION | ENUM_VALUE | ARGUMENT_DEFINITION | INPUT_FIELD_DEFINITION

  directive @versionAdded(version: String!) on FIELD_DEFINITION | OBJECT | ENUM | INTERFACE | UNION

  directive @versionRemoved(version: String!) on FIELD_DEFINITION | OBJECT | ENUM | INTERFACE | UNION
`;
