import pino from 'pino';
import fs from 'fs/promises';
import path from 'path';

const logger = pino({ name: 'SchemaCatalogService' });

export interface SchemaFieldPolicy {
  field: string;
  purpose: string;
  retention: string; // e.g., '30d', 'permanent'
  pii?: boolean;
}

export interface SchemaDefinition {
  version: string;
  entities: Record<string, {
    fields: Record<string, any>;
    policy: SchemaFieldPolicy[];
  }>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  breakingChanges: string[];
}

export class SchemaCatalogService {
  private static instance: SchemaCatalogService;
  private currentSchema: SchemaDefinition | null = null;
  private readonly storageDir: string;
  private readonly storagePath: string;

  private constructor() {
    this.storageDir = path.join(process.cwd(), 'data');
    this.storagePath = path.join(this.storageDir, 'schema-catalog.json');
  }

  public static getInstance(): SchemaCatalogService {
    if (!SchemaCatalogService.instance) {
      SchemaCatalogService.instance = new SchemaCatalogService();
      SchemaCatalogService.instance.loadSchema(); // Load on startup
    }
    return SchemaCatalogService.instance;
  }

  private async loadSchema() {
    try {
      const data = await fs.readFile(this.storagePath, 'utf-8');
      this.currentSchema = JSON.parse(data);
      logger.info(`Loaded schema version ${this.currentSchema?.version}`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        logger.error({ err: error }, 'Failed to load schema catalog');
      } else {
        logger.info('No existing schema catalog found.');
      }
    }
  }

  private async saveSchema(schema: SchemaDefinition) {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      await fs.writeFile(this.storagePath, JSON.stringify(schema, null, 2));
      logger.info(`Saved schema version ${schema.version}`);
    } catch (error) {
      logger.error({ err: error }, 'Failed to save schema catalog');
      throw error;
    }
  }

  /**
   * Registers a new schema version.
   * Checks for breaking changes against the previous version.
   */
  public async registerSchema(schema: SchemaDefinition): Promise<ValidationResult> {
    // Ensure we have the latest loaded
    if (!this.currentSchema) await this.loadSchema();

    const errors: string[] = [];
    const breakingChanges: string[] = [];

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
                } else if (newEntity.fields[fieldName] !== fieldType) {
                    breakingChanges.push(
                        `Field '${entityName}.${fieldName}' changed type from '${fieldType}' to '${newEntity.fields[fieldName]}'.`
                    );
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
    } else {
        logger.warn({ errors, breakingChanges }, 'Schema registration failed.');
    }

    return { valid, errors, breakingChanges };
  }

  public getCurrentSchema(): SchemaDefinition | null {
    return this.currentSchema;
  }
}

export const schemaCatalog = SchemaCatalogService.getInstance();
