/**
 * Schema Registry Service
 * Manages schema registration, versioning, and compatibility checking
 */

import { createHash } from 'crypto';
import {
  SchemaDefinition,
  SchemaRegistrationRequest,
  SchemaEvolutionRequest,
  SchemaSearchRequest,
  SchemaSearchResponse,
  SchemaStatus,
  CompatibilityCheckResult,
  SchemaChange,
  SchemaChangeType,
  CompatibilityMode,
  VersionType,
  SchemaVersion,
  SchemaUsageStatistics,
  SchemaDeprecationPlan,
} from '../types/schemaRegistry.js';

export class SchemaRegistryService {
  private schemas: Map<string, SchemaDefinition>;
  private schemasByName: Map<string, Map<string, SchemaDefinition>>; // namespace -> name -> schema
  private schemaVersions: Map<string, SchemaVersion[]>;

  constructor() {
    this.schemas = new Map();
    this.schemasByName = new Map();
    this.schemaVersions = new Map();
  }

  /**
   * Register a new schema
   */
  async registerSchema(
    request: SchemaRegistrationRequest,
  ): Promise<SchemaDefinition> {
    // Generate schema hash for deduplication
    const schemaHash = this.generateSchemaHash(request.schema);

    // Check if schema already exists
    const existing = await this.findSchemaByHash(schemaHash);
    if (existing) {
      throw new Error(
        `Schema already exists with id: ${existing.id} version: ${existing.version}`,
      );
    }

    // Create new schema definition
    const fullyQualifiedName = `${request.namespace}.${request.name}`;
    const schema: SchemaDefinition = {
      id: this.generateId(),
      name: request.name,
      namespace: request.namespace,
      fullyQualifiedName,
      description: request.description,
      type: request.type,
      format: request.format,
      schema: request.schema,
      schemaHash,
      version: '1.0.0',
      versionNumber: 1,
      majorVersion: 1,
      minorVersion: 0,
      patchVersion: 0,
      compatibilityMode: request.compatibilityMode,
      previousVersionId: null,
      isBreakingChange: false,
      status: SchemaStatus.ACTIVE,
      deprecatedAt: null,
      deprecationReason: null,
      replacedByVersionId: null,
      owner: request.owner,
      createdBy: request.owner,
      approvedBy: null,
      tags: request.tags,
      domain: request.domain,
      datasetIds: [],
      mappingIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: new Date(),
      properties: request.properties,
    };

    // Store schema
    this.schemas.set(schema.id, schema);

    // Index by namespace and name
    if (!this.schemasByName.has(request.namespace)) {
      this.schemasByName.set(request.namespace, new Map());
    }
    this.schemasByName.get(request.namespace)!.set(request.name, schema);

    // Create initial version
    const version: SchemaVersion = {
      id: this.generateId(),
      schemaId: schema.id,
      version: schema.version,
      versionNumber: schema.versionNumber,
      status: schema.status,
      isBreakingChange: false,
      changes: [],
      createdAt: schema.createdAt,
      createdBy: schema.createdBy,
    };
    this.schemaVersions.set(schema.id, [version]);

    return schema;
  }

  /**
   * Evolve an existing schema (create new version)
   */
  async evolveSchema(
    request: SchemaEvolutionRequest,
  ): Promise<SchemaDefinition> {
    // Get current schema
    const currentSchema = this.schemas.get(request.schemaId);
    if (!currentSchema) {
      throw new Error(`Schema not found: ${request.schemaId}`);
    }

    // Check compatibility if required
    if (!request.skipCompatibilityCheck) {
      const compatibilityCheck = await this.checkCompatibility(
        currentSchema,
        request.newSchema,
      );
      if (!compatibilityCheck.compatible) {
        throw new Error(
          `Schema is not compatible: ${compatibilityCheck.errors.map((e) => e.message).join(', ')}`,
        );
      }
    }

    // Detect changes
    const changes = this.detectSchemaChanges(
      currentSchema.schema,
      request.newSchema,
    );
    const isBreakingChange = changes.some((c) => c.isBreaking);

    // Calculate new version
    const newVersion = this.calculateNewVersion(
      currentSchema,
      request.versionType,
      isBreakingChange,
    );

    // Generate schema hash
    const schemaHash = this.generateSchemaHash(request.newSchema);

    // Create new schema version
    const newSchema: SchemaDefinition = {
      ...currentSchema,
      id: this.generateId(),
      schema: request.newSchema,
      schemaHash,
      version: newVersion.version,
      versionNumber: newVersion.versionNumber,
      majorVersion: newVersion.majorVersion,
      minorVersion: newVersion.minorVersion,
      patchVersion: newVersion.patchVersion,
      previousVersionId: currentSchema.id,
      isBreakingChange,
      updatedAt: new Date(),
      publishedAt: new Date(),
    };

    // Store new version
    this.schemas.set(newSchema.id, newSchema);

    // Update index
    this.schemasByName
      .get(newSchema.namespace)!
      .set(newSchema.name, newSchema);

    // Add version history
    const version: SchemaVersion = {
      id: this.generateId(),
      schemaId: newSchema.id,
      version: newSchema.version,
      versionNumber: newSchema.versionNumber,
      status: newSchema.status,
      isBreakingChange,
      changes,
      createdAt: newSchema.updatedAt,
      createdBy: currentSchema.createdBy,
    };

    const versions = this.schemaVersions.get(request.schemaId) || [];
    versions.push(version);
    this.schemaVersions.set(newSchema.id, versions);

    return newSchema;
  }

  /**
   * Get schema by ID
   */
  async getSchema(id: string): Promise<SchemaDefinition | null> {
    return this.schemas.get(id) || null;
  }

  /**
   * Get schema by name and namespace
   */
  async getSchemaByName(
    namespace: string,
    name: string,
    version?: string,
  ): Promise<SchemaDefinition | null> {
    const nameMap = this.schemasByName.get(namespace);
    if (!nameMap) {
      return null;
    }

    const schema = nameMap.get(name);
    if (!schema) {
      return null;
    }

    if (version && schema.version !== version) {
      // Find specific version in history
      return this.findSchemaVersion(schema.id, version);
    }

    return schema;
  }

  /**
   * Search schemas
   */
  async searchSchemas(
    request: SchemaSearchRequest,
  ): Promise<SchemaSearchResponse> {
    let results = Array.from(this.schemas.values());

    // Filter by namespace
    if (request.namespace) {
      results = results.filter((s) => s.namespace === request.namespace);
    }

    // Filter by type
    if (request.type) {
      results = results.filter((s) => s.type === request.type);
    }

    // Filter by status
    if (request.status) {
      results = results.filter((s) => s.status === request.status);
    }

    // Filter by tags
    if (request.tags.length > 0) {
      results = results.filter((s) =>
        request.tags.some((tag) => s.tags.includes(tag)),
      );
    }

    // Filter by domain
    if (request.domain) {
      results = results.filter((s) => s.domain === request.domain);
    }

    // Text search on name and description
    if (request.query) {
      const query = request.query.toLowerCase();
      results = results.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.fullyQualifiedName.toLowerCase().includes(query) ||
          (s.description && s.description.toLowerCase().includes(query)),
      );
    }

    const total = results.length;

    // Pagination
    const paginatedResults = results.slice(
      request.offset,
      request.offset + request.limit,
    );

    return {
      schemas: paginatedResults,
      total,
      offset: request.offset,
      limit: request.limit,
    };
  }

  /**
   * Deprecate a schema
   */
  async deprecateSchema(
    schemaId: string,
    reason: string,
    replacementSchemaId?: string,
  ): Promise<SchemaDefinition> {
    const schema = this.schemas.get(schemaId);
    if (!schema) {
      throw new Error(`Schema not found: ${schemaId}`);
    }

    schema.status = SchemaStatus.DEPRECATED;
    schema.deprecatedAt = new Date();
    schema.deprecationReason = reason;
    schema.replacedByVersionId = replacementSchemaId || null;
    schema.updatedAt = new Date();

    return schema;
  }

  /**
   * Archive a schema
   */
  async archiveSchema(schemaId: string): Promise<SchemaDefinition> {
    const schema = this.schemas.get(schemaId);
    if (!schema) {
      throw new Error(`Schema not found: ${schemaId}`);
    }

    schema.status = SchemaStatus.ARCHIVED;
    schema.updatedAt = new Date();

    return schema;
  }

  /**
   * Get schema versions
   */
  async getSchemaVersions(schemaId: string): Promise<SchemaVersion[]> {
    return this.schemaVersions.get(schemaId) || [];
  }

  /**
   * Get schema usage statistics
   */
  async getSchemaUsage(schemaId: string): Promise<SchemaUsageStatistics> {
    const schema = this.schemas.get(schemaId);
    if (!schema) {
      throw new Error(`Schema not found: ${schemaId}`);
    }

    // This would be calculated from actual usage data
    return {
      schemaId: schema.id,
      version: schema.version,
      datasetCount: schema.datasetIds.length,
      mappingCount: schema.mappingIds.length,
      activeReferences: schema.datasetIds.length + schema.mappingIds.length,
      lastUsedAt: new Date(),
      usageByDataset: {},
      usageByService: {},
    };
  }

  /**
   * Check compatibility between schemas
   */
  private async checkCompatibility(
    currentSchema: SchemaDefinition,
    newSchema: Record<string, any> | string,
  ): Promise<CompatibilityCheckResult> {
    const changes = this.detectSchemaChanges(currentSchema.schema, newSchema);

    const errors = changes
      .filter((c) => c.isBreaking)
      .map((c) => ({
        code: c.type,
        message: c.description,
        path: c.path,
        severity: 'ERROR' as const,
      }));

    const warnings = changes
      .filter((c) => !c.isBreaking)
      .map((c) => ({
        code: c.type,
        message: c.description,
        path: c.path,
        recommendation: 'Review change impact',
      }));

    const compatible =
      errors.length === 0 ||
      currentSchema.compatibilityMode === CompatibilityMode.NONE;

    return {
      compatible,
      mode: currentSchema.compatibilityMode,
      errors,
      warnings,
      changes,
    };
  }

  /**
   * Detect changes between schemas
   */
  private detectSchemaChanges(
    oldSchema: Record<string, any> | string,
    newSchema: Record<string, any> | string,
  ): SchemaChange[] {
    const changes: SchemaChange[] = [];

    // Simple implementation - in production, use json-diff or similar
    const oldSchemaObj =
      typeof oldSchema === 'string' ? JSON.parse(oldSchema) : oldSchema;
    const newSchemaObj =
      typeof newSchema === 'string' ? JSON.parse(newSchema) : newSchema;

    // Check for field removals (breaking)
    for (const key in oldSchemaObj) {
      if (!(key in newSchemaObj)) {
        changes.push({
          type: SchemaChangeType.FIELD_REMOVED,
          path: key,
          oldValue: oldSchemaObj[key],
          newValue: null,
          isBreaking: true,
          description: `Field '${key}' was removed`,
        });
      }
    }

    // Check for field additions (non-breaking if optional)
    for (const key in newSchemaObj) {
      if (!(key in oldSchemaObj)) {
        changes.push({
          type: SchemaChangeType.FIELD_ADDED,
          path: key,
          oldValue: null,
          newValue: newSchemaObj[key],
          isBreaking: false,
          description: `Field '${key}' was added`,
        });
      }
    }

    // Check for type changes (breaking)
    for (const key in oldSchemaObj) {
      if (key in newSchemaObj) {
        const oldType = typeof oldSchemaObj[key];
        const newType = typeof newSchemaObj[key];
        if (oldType !== newType) {
          changes.push({
            type: SchemaChangeType.TYPE_CHANGED,
            path: key,
            oldValue: oldType,
            newValue: newType,
            isBreaking: true,
            description: `Field '${key}' type changed from ${oldType} to ${newType}`,
          });
        }
      }
    }

    return changes;
  }

  /**
   * Calculate new version number
   */
  private calculateNewVersion(
    currentSchema: SchemaDefinition,
    versionType: VersionType,
    isBreakingChange: boolean,
  ): {
    version: string;
    versionNumber: number;
    majorVersion: number;
    minorVersion: number;
    patchVersion: number;
  } {
    let major = currentSchema.majorVersion;
    let minor = currentSchema.minorVersion;
    let patch = currentSchema.patchVersion;

    if (isBreakingChange || versionType === VersionType.MAJOR) {
      major += 1;
      minor = 0;
      patch = 0;
    } else if (versionType === VersionType.MINOR) {
      minor += 1;
      patch = 0;
    } else {
      patch += 1;
    }

    return {
      version: `${major}.${minor}.${patch}`,
      versionNumber: currentSchema.versionNumber + 1,
      majorVersion: major,
      minorVersion: minor,
      patchVersion: patch,
    };
  }

  /**
   * Generate schema hash
   */
  private generateSchemaHash(schema: Record<string, any> | string): string {
    const schemaStr =
      typeof schema === 'string' ? schema : JSON.stringify(schema);
    return createHash('sha256').update(schemaStr).digest('hex');
  }

  /**
   * Find schema by hash
   */
  private async findSchemaByHash(
    hash: string,
  ): Promise<SchemaDefinition | null> {
    for (const schema of this.schemas.values()) {
      if (schema.schemaHash === hash) {
        return schema;
      }
    }
    return null;
  }

  /**
   * Find specific schema version
   */
  private async findSchemaVersion(
    schemaId: string,
    version: string,
  ): Promise<SchemaDefinition | null> {
    // This would traverse the version history
    // For now, just return the current schema
    return this.schemas.get(schemaId) || null;
  }

  /**
   * Generate unique ID (placeholder)
   */
  private generateId(): string {
    return `schema-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
