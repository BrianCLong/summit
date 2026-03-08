"use strict";
/**
 * Schema Registry Service
 * Manages schema versions, compatibility checks, and schema evolution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaRegistryService = void 0;
const metadata_js_1 = require("../types/metadata.js");
class SchemaRegistryService {
    store;
    constructor(store) {
        this.store = store;
    }
    /**
     * Register a new schema version
     */
    async registerSchemaVersion(schemaId, schema, format, createdBy, options = {}) {
        // Get latest version
        const latestVersion = await this.store.getLatestSchemaVersion(schemaId);
        const newVersion = latestVersion ? latestVersion.version + 1 : 1;
        // Check compatibility if requested and there's a previous version
        let backwardCompatible = true;
        let forwardCompatible = false;
        let breakingChanges = [];
        if (options.checkCompatibility && latestVersion) {
            const compatibility = this.checkCompatibility(latestVersion.schema, schema, format);
            backwardCompatible = compatibility.compatible;
            breakingChanges = compatibility.breakingChanges;
        }
        const schemaVersion = {
            id: this.generateSchemaVersionId(schemaId, newVersion),
            schemaId,
            version: newVersion,
            schema,
            schemaFormat: format,
            backwardCompatible,
            forwardCompatible,
            breakingChanges,
            status: metadata_js_1.SchemaVersionStatus.ACTIVE,
            deprecatedAt: null,
            description: options.description || null,
            changelog: options.changelog || null,
            createdAt: new Date(),
            createdBy,
        };
        return this.store.registerSchema(schemaVersion);
    }
    /**
     * Get latest schema version
     */
    async getLatest(schemaId) {
        return this.store.getLatestSchemaVersion(schemaId);
    }
    /**
     * Get specific schema version
     */
    async getVersion(schemaId, version) {
        return this.store.getSchemaVersion(schemaId, version);
    }
    /**
     * List all versions of a schema
     */
    async listVersions(schemaId) {
        return this.store.listSchemaVersions(schemaId);
    }
    /**
     * Check schema compatibility
     */
    checkCompatibility(oldSchema, newSchema, format) {
        switch (format) {
            case metadata_js_1.SchemaFormat.JSON_SCHEMA:
                return this.checkJsonSchemaCompatibility(oldSchema, newSchema);
            case metadata_js_1.SchemaFormat.SQL_DDL:
                return this.checkSqlDdlCompatibility(oldSchema, newSchema);
            default:
                // Default to simple field-level comparison
                return this.checkGenericCompatibility(oldSchema, newSchema);
        }
    }
    /**
     * Deprecate a schema version
     */
    async deprecateVersion(schemaId, version, reason) {
        const schemaVersion = await this.store.getSchemaVersion(schemaId, version);
        if (!schemaVersion) {
            throw new Error(`Schema version ${schemaId}:${version} not found`);
        }
        // Update to deprecated status
        schemaVersion.status = metadata_js_1.SchemaVersionStatus.DEPRECATED;
        schemaVersion.deprecatedAt = new Date();
        schemaVersion.changelog = schemaVersion.changelog
            ? `${schemaVersion.changelog}\n\nDeprecated: ${reason}`
            : `Deprecated: ${reason}`;
        // For now, we'll need to implement an update method in the store
        // This is a simplified version
        return schemaVersion;
    }
    /**
     * Validate schema against format rules
     */
    validateSchema(schema, format) {
        const errors = [];
        switch (format) {
            case metadata_js_1.SchemaFormat.JSON_SCHEMA:
                if (!schema.$schema) {
                    errors.push('Missing $schema property');
                }
                if (!schema.type && !schema.properties) {
                    errors.push('Schema must have type or properties');
                }
                break;
            case metadata_js_1.SchemaFormat.AVRO:
                if (!schema.type) {
                    errors.push('Avro schema must have type');
                }
                if (!schema.name) {
                    errors.push('Avro schema must have name');
                }
                break;
            case metadata_js_1.SchemaFormat.SQL_DDL:
                if (!schema.columns || !Array.isArray(schema.columns)) {
                    errors.push('SQL DDL schema must have columns array');
                }
                break;
            default:
                // No specific validation for other formats
                break;
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    // ====== Private Helper Methods ======
    /**
     * Check JSON Schema compatibility
     */
    checkJsonSchemaCompatibility(oldSchema, newSchema) {
        const breakingChanges = [];
        const warnings = [];
        // Check if required fields were added
        const oldRequired = new Set(oldSchema.required || []);
        const newRequired = new Set(newSchema.required || []);
        for (const field of newRequired) {
            if (!oldRequired.has(field)) {
                breakingChanges.push(`Added required field: ${field}`);
            }
        }
        // Check if fields were removed
        const oldProperties = Object.keys(oldSchema.properties || {});
        const newProperties = Object.keys(newSchema.properties || {});
        for (const field of oldProperties) {
            if (!newProperties.includes(field)) {
                breakingChanges.push(`Removed field: ${field}`);
            }
        }
        // Check if field types changed
        for (const field of oldProperties) {
            if (newProperties.includes(field)) {
                const oldType = oldSchema.properties[field].type;
                const newType = newSchema.properties[field].type;
                if (oldType !== newType) {
                    breakingChanges.push(`Changed type of ${field} from ${oldType} to ${newType}`);
                }
            }
        }
        // Check for added optional fields (warnings)
        for (const field of newProperties) {
            if (!oldProperties.includes(field) && !newRequired.has(field)) {
                warnings.push(`Added optional field: ${field}`);
            }
        }
        return {
            compatible: breakingChanges.length === 0,
            breakingChanges,
            warnings,
        };
    }
    /**
     * Check SQL DDL compatibility
     */
    checkSqlDdlCompatibility(oldSchema, newSchema) {
        const breakingChanges = [];
        const warnings = [];
        const oldColumns = oldSchema.columns || [];
        const newColumns = newSchema.columns || [];
        const oldColumnMap = new Map(oldColumns.map((c) => [c.name, c]));
        const newColumnMap = new Map(newColumns.map((c) => [c.name, c]));
        // Check for removed columns
        for (const [name, oldCol] of oldColumnMap) {
            if (!newColumnMap.has(name)) {
                breakingChanges.push(`Removed column: ${name}`);
            }
        }
        // Check for type changes and nullability changes
        for (const [name, newCol] of newColumnMap) {
            const oldCol = oldColumnMap.get(name);
            if (oldCol) {
                if (oldCol.type !== newCol.type) {
                    breakingChanges.push(`Changed type of ${name} from ${oldCol.type} to ${newCol.type}`);
                }
                if (oldCol.nullable && !newCol.nullable) {
                    breakingChanges.push(`Made ${name} non-nullable`);
                }
            }
            else {
                // New column added
                if (!newCol.nullable && !newCol.default) {
                    breakingChanges.push(`Added non-nullable column without default: ${name}`);
                }
                else {
                    warnings.push(`Added column: ${name}`);
                }
            }
        }
        return {
            compatible: breakingChanges.length === 0,
            breakingChanges,
            warnings,
        };
    }
    /**
     * Generic field-level compatibility check
     */
    checkGenericCompatibility(oldSchema, newSchema) {
        const breakingChanges = [];
        const warnings = [];
        const oldFields = Object.keys(oldSchema);
        const newFields = Object.keys(newSchema);
        // Check for removed fields
        for (const field of oldFields) {
            if (!newFields.includes(field)) {
                breakingChanges.push(`Removed field: ${field}`);
            }
        }
        // Check for added fields
        for (const field of newFields) {
            if (!oldFields.includes(field)) {
                warnings.push(`Added field: ${field}`);
            }
        }
        return {
            compatible: breakingChanges.length === 0,
            breakingChanges,
            warnings,
        };
    }
    /**
     * Generate schema version ID
     */
    generateSchemaVersionId(schemaId, version) {
        return `${schemaId}-v${version}`;
    }
    /**
     * Compare schemas and generate diff
     */
    getSchemaDiff(oldSchema, newSchema, format) {
        const compatibility = this.checkCompatibility(oldSchema, newSchema, format);
        const added = [];
        const removed = [];
        const modified = [];
        for (const change of compatibility.breakingChanges) {
            if (change.startsWith('Added')) {
                added.push(change);
            }
            else if (change.startsWith('Removed')) {
                removed.push(change);
            }
            else if (change.startsWith('Changed')) {
                modified.push(change);
            }
        }
        for (const warning of compatibility.warnings) {
            if (warning.startsWith('Added')) {
                added.push(warning);
            }
        }
        return { added, removed, modified };
    }
}
exports.SchemaRegistryService = SchemaRegistryService;
