"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemaCatalog = exports.SchemaCatalogService = void 0;
const pino_1 = __importDefault(require("pino"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const logger = pino_1.default({ name: 'SchemaCatalogService' });
class SchemaCatalogService {
    static instance;
    currentSchema = null;
    storageDir;
    storagePath;
    constructor() {
        this.storageDir = path_1.default.join(process.cwd(), 'data');
        this.storagePath = path_1.default.join(this.storageDir, 'schema-catalog.json');
    }
    static getInstance() {
        if (!SchemaCatalogService.instance) {
            SchemaCatalogService.instance = new SchemaCatalogService();
            SchemaCatalogService.instance.loadSchema(); // Load on startup
        }
        return SchemaCatalogService.instance;
    }
    async loadSchema() {
        try {
            const data = await promises_1.default.readFile(this.storagePath, 'utf-8');
            this.currentSchema = JSON.parse(data);
            logger.info(`Loaded schema version ${this.currentSchema?.version}`);
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            if ('code' in err && err.code !== 'ENOENT') {
                logger.error({ err }, 'Failed to load schema catalog');
            }
            else {
                logger.info('No existing schema catalog found.');
            }
        }
    }
    async saveSchema(schema) {
        try {
            await promises_1.default.mkdir(this.storageDir, { recursive: true });
            await promises_1.default.writeFile(this.storagePath, JSON.stringify(schema, null, 2));
            logger.info(`Saved schema version ${schema.version}`);
        }
        catch (error) {
            logger.error({ err: error }, 'Failed to save schema catalog');
            throw error;
        }
    }
    /**
     * Registers a new schema version.
     * Checks for breaking changes against the previous version.
     */
    async registerSchema(schema) {
        // Ensure we have the latest loaded
        if (!this.currentSchema)
            await this.loadSchema();
        const errors = [];
        const breakingChanges = [];
        // 1. Validate Policy Compliance
        for (const [entityName, entity] of Object.entries(schema.entities)) {
            if (!entity.policy || entity.policy.length === 0) {
                errors.push(`Entity '${entityName}' is missing data policy definitions.`);
                continue;
            }
        }
        // 2. Breaking Change Detection
        if (this.currentSchema) {
            // Check for removed entities
            for (const oldEntity of Object.keys(this.currentSchema.entities)) {
                if (!schema.entities[oldEntity]) {
                    breakingChanges.push(`Entity '${oldEntity}' was removed.`);
                }
            }
            // Check for removed fields or type changes in existing entities
            for (const [entityName, entity] of Object.entries(this.currentSchema.entities)) {
                if (schema.entities[entityName]) {
                    const newEntity = schema.entities[entityName];
                    for (const [fieldName, fieldType] of Object.entries(entity.fields)) {
                        if (!newEntity.fields[fieldName]) {
                            breakingChanges.push(`Field '${entityName}.${fieldName}' was removed.`);
                        }
                        else if (newEntity.fields[fieldName] !== fieldType) {
                            breakingChanges.push(`Field '${entityName}.${fieldName}' changed type from '${fieldType}' to '${newEntity.fields[fieldName]}'.`);
                        }
                    }
                }
            }
        }
        const valid = errors.length === 0 && breakingChanges.length === 0;
        if (valid) {
            this.currentSchema = schema;
            await this.saveSchema(schema);
            logger.info(`Schema version ${schema.version} registered successfully.`);
        }
        else {
            logger.warn({ errors, breakingChanges }, 'Schema registration failed.');
        }
        return { valid, errors, breakingChanges };
    }
    getCurrentSchema() {
        return this.currentSchema;
    }
}
exports.SchemaCatalogService = SchemaCatalogService;
exports.schemaCatalog = SchemaCatalogService.getInstance();
