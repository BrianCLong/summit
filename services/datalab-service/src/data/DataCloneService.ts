import { v4 as uuidv4 } from 'uuid';
import {
  DataCloneRequest,
  DataCloneResult,
  CloneStrategy,
  DataSourceType,
  FieldAnonymizationConfig,
  AnonymizationTechnique,
  DataLabErrorCode,
  DataLabError,
} from '../types/index.js';
import { DataAnonymizer, getDataAnonymizer } from '../anonymization/DataAnonymizer.js';
import { SyntheticDataGenerator, getSyntheticDataGenerator } from '../synthetic/SyntheticDataGenerator.js';
import { createLogger } from '../utils/logger.js';
import {
  SandboxTenantProfile,
  getSandboxEnforcer,
  OperationType,
  DataAccessMode,
} from '@intelgraph/sandbox-tenant-profile';

const logger = createLogger('DataCloneService');

/**
 * Clone operation context
 */
interface CloneContext {
  requestId: string;
  sandboxId: string;
  sourceRecords: number;
  clonedRecords: number;
  anonymizedFields: number;
  relationshipsCloned: number;
  startTime: number;
  warnings: string[];
}

/**
 * DataCloneService handles cloning production data structure
 * with synthetic values, anonymization, or sampling.
 */
export class DataCloneService {
  private anonymizer: DataAnonymizer;
  private syntheticGenerator: SyntheticDataGenerator;

  constructor() {
    this.anonymizer = getDataAnonymizer();
    this.syntheticGenerator = getSyntheticDataGenerator();
  }

  /**
   * Clone data into sandbox according to request
   */
  async clone(
    request: DataCloneRequest,
    sandboxProfile: SandboxTenantProfile
  ): Promise<DataCloneResult> {
    const requestId = request.id || uuidv4();
    const startTime = Date.now();

    logger.info('Starting data clone operation', {
      requestId,
      sandboxId: request.sandboxId,
      sourceType: request.sourceType,
      strategy: request.strategy,
    });

    const context: CloneContext = {
      requestId,
      sandboxId: request.sandboxId,
      sourceRecords: 0,
      clonedRecords: 0,
      anonymizedFields: 0,
      relationshipsCloned: 0,
      startTime,
      warnings: [],
    };

    try {
      // Validate request against sandbox policy
      await this.validateRequest(request, sandboxProfile);

      // Get source data based on source type
      const sourceData = await this.fetchSourceData(request, sandboxProfile);
      context.sourceRecords = sourceData.entities.length;

      // Apply clone strategy
      const clonedData = await this.applyStrategy(
        sourceData,
        request,
        sandboxProfile,
        context
      );

      context.clonedRecords = clonedData.entities.length;
      context.relationshipsCloned = clonedData.relationships?.length || 0;

      // Store cloned data in sandbox
      const outputLocation = await this.storeClonedData(
        clonedData,
        request,
        context
      );

      const result: DataCloneResult = {
        id: uuidv4(),
        requestId,
        sandboxId: request.sandboxId,
        status: 'completed',
        statistics: {
          sourceRecords: context.sourceRecords,
          clonedRecords: context.clonedRecords,
          anonymizedFields: context.anonymizedFields,
          relationshipsCloned: context.relationshipsCloned,
          processingTimeMs: Date.now() - startTime,
        },
        audit: {
          anonymizationReport: this.getAnonymizationReport(request.fieldAnonymization, context),
          validationPassed: true,
          warnings: context.warnings,
        },
        outputLocation,
        startedAt: new Date(startTime),
        completedAt: new Date(),
      };

      logger.info('Data clone completed', {
        requestId,
        clonedRecords: context.clonedRecords,
        processingTimeMs: result.statistics.processingTimeMs,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Data clone failed', {
        requestId,
        error: errorMessage,
      });

      return {
        id: uuidv4(),
        requestId,
        sandboxId: request.sandboxId,
        status: 'failed',
        statistics: {
          sourceRecords: context.sourceRecords,
          clonedRecords: context.clonedRecords,
          anonymizedFields: context.anonymizedFields,
          relationshipsCloned: context.relationshipsCloned,
          processingTimeMs: Date.now() - startTime,
        },
        audit: {
          anonymizationReport: [],
          validationPassed: false,
          warnings: context.warnings,
        },
        startedAt: new Date(startTime),
        completedAt: new Date(),
        error: errorMessage,
      };
    }
  }

  /**
   * Validate clone request against sandbox policy
   */
  private async validateRequest(
    request: DataCloneRequest,
    profile: SandboxTenantProfile
  ): Promise<void> {
    const enforcer = getSandboxEnforcer();

    // Check data access is allowed
    const decision = await enforcer.enforce(profile, {
      sandboxId: profile.id,
      userId: request.requestedBy,
      operation: OperationType.DATA_ACCESS,
    });

    if (!decision.allowed) {
      throw {
        code: DataLabErrorCode.VALIDATION_FAILED,
        message: `Data access not allowed: ${decision.reason}`,
        sandboxId: request.sandboxId,
        operation: 'clone',
        timestamp: new Date(),
      } as DataLabError;
    }

    // Validate strategy against data access policy
    const dataMode = profile.dataAccessPolicy.mode;

    if (dataMode === DataAccessMode.SYNTHETIC_ONLY) {
      if (
        request.strategy !== CloneStrategy.SYNTHETIC &&
        request.strategy !== CloneStrategy.STRUCTURE_ONLY
      ) {
        throw {
          code: DataLabErrorCode.VALIDATION_FAILED,
          message: `Sandbox only allows synthetic data. Strategy ${request.strategy} is not permitted.`,
          sandboxId: request.sandboxId,
          operation: 'clone',
          timestamp: new Date(),
        } as DataLabError;
      }
    }

    if (dataMode === DataAccessMode.STRUCTURE_ONLY) {
      if (request.strategy !== CloneStrategy.STRUCTURE_ONLY) {
        throw {
          code: DataLabErrorCode.VALIDATION_FAILED,
          message: 'Sandbox only allows structure cloning, not data.',
          sandboxId: request.sandboxId,
          operation: 'clone',
          timestamp: new Date(),
        } as DataLabError;
      }
    }

    // Validate sample size
    if (
      request.sampleSize &&
      request.sampleSize > profile.dataAccessPolicy.maxRecords
    ) {
      throw {
        code: DataLabErrorCode.QUOTA_EXCEEDED,
        message: `Sample size ${request.sampleSize} exceeds maximum ${profile.dataAccessPolicy.maxRecords}`,
        sandboxId: request.sandboxId,
        operation: 'clone',
        timestamp: new Date(),
      } as DataLabError;
    }
  }

  /**
   * Fetch source data based on source type
   */
  private async fetchSourceData(
    request: DataCloneRequest,
    profile: SandboxTenantProfile
  ): Promise<{ entities: Record<string, unknown>[]; relationships?: Record<string, unknown>[] }> {
    // In a real implementation, this would:
    // 1. Connect to the appropriate data source
    // 2. Execute query/fetch logic
    // 3. Apply initial filtering

    logger.info('Fetching source data', {
      sourceType: request.sourceType,
      sandboxId: request.sandboxId,
    });

    // Simulated data fetch
    switch (request.sourceType) {
      case DataSourceType.NEO4J:
        return this.fetchFromNeo4j(request);
      case DataSourceType.POSTGRESQL:
        return this.fetchFromPostgres(request);
      case DataSourceType.INVESTIGATION:
        return this.fetchFromInvestigation(request);
      case DataSourceType.SCENARIO:
        return this.fetchFromScenario(request);
      default:
        return { entities: [], relationships: [] };
    }
  }

  /**
   * Apply clone strategy to data
   */
  private async applyStrategy(
    sourceData: { entities: Record<string, unknown>[]; relationships?: Record<string, unknown>[] },
    request: DataCloneRequest,
    profile: SandboxTenantProfile,
    context: CloneContext
  ): Promise<{ entities: Record<string, unknown>[]; relationships?: Record<string, unknown>[] }> {
    switch (request.strategy) {
      case CloneStrategy.STRUCTURE_ONLY:
        return this.applyStructureOnly(sourceData, context);

      case CloneStrategy.SYNTHETIC:
        return this.applySynthetic(sourceData, request, context);

      case CloneStrategy.ANONYMIZED:
        return this.applyAnonymized(sourceData, request, profile, context);

      case CloneStrategy.SAMPLED:
        return this.applySampled(sourceData, request, profile, context);

      case CloneStrategy.FUZZED:
        return this.applyFuzzed(sourceData, request, context);

      default:
        throw new Error(`Unknown clone strategy: ${request.strategy}`);
    }
  }

  /**
   * Structure only - return schema without data
   */
  private applyStructureOnly(
    sourceData: { entities: Record<string, unknown>[]; relationships?: Record<string, unknown>[] },
    context: CloneContext
  ): { entities: Record<string, unknown>[]; relationships?: Record<string, unknown>[] } {
    // Extract schema/structure only
    const sampleEntity = sourceData.entities[0] || {};
    const structure = Object.keys(sampleEntity).reduce(
      (acc, key) => {
        acc[key] = typeof sampleEntity[key];
        return acc;
      },
      {} as Record<string, unknown>
    );

    return {
      entities: [{ _schema: structure, _note: 'Structure only - no actual data' }],
      relationships: [],
    };
  }

  /**
   * Replace all values with synthetic data
   */
  private async applySynthetic(
    sourceData: { entities: Record<string, unknown>[]; relationships?: Record<string, unknown>[] },
    request: DataCloneRequest,
    context: CloneContext
  ): Promise<{ entities: Record<string, unknown>[]; relationships?: Record<string, unknown>[] }> {
    const entities: Record<string, unknown>[] = [];

    for (const entity of sourceData.entities) {
      const syntheticEntity: Record<string, unknown> = {
        id: uuidv4(),
        dataSource: 'synthetic',
        tenantId: request.sandboxId,
      };

      // Generate synthetic values for each field
      for (const [key, value] of Object.entries(entity)) {
        if (key === 'id' || key === 'tenantId') continue;
        syntheticEntity[key] = this.generateSyntheticValue(key, value);
      }

      entities.push(syntheticEntity);
    }

    return {
      entities,
      relationships: this.generateSyntheticRelationships(
        sourceData.relationships || [],
        request.sandboxId
      ),
    };
  }

  /**
   * Apply anonymization to real data
   */
  private async applyAnonymized(
    sourceData: { entities: Record<string, unknown>[]; relationships?: Record<string, unknown>[] },
    request: DataCloneRequest,
    profile: SandboxTenantProfile,
    context: CloneContext
  ): Promise<{ entities: Record<string, unknown>[]; relationships?: Record<string, unknown>[] }> {
    // Build anonymization config based on PII handling
    const configs = request.fieldAnonymization.length > 0
      ? request.fieldAnonymization
      : this.buildDefaultAnonymizationConfig(sourceData.entities[0] || {}, profile);

    context.anonymizedFields = configs.length;

    // Anonymize entities
    const result = await this.anonymizer.anonymize(
      sourceData.entities as Record<string, unknown>[],
      configs
    );

    // Add warnings
    context.warnings.push(...result.warnings);

    // Add sandbox metadata
    const anonymizedEntities = result.data.map(entity => ({
      ...entity,
      dataSource: 'anonymized',
      tenantId: request.sandboxId,
    }));

    return {
      entities: anonymizedEntities,
      relationships: sourceData.relationships?.map(rel => ({
        ...rel,
        dataSource: 'anonymized',
        tenantId: request.sandboxId,
      })),
    };
  }

  /**
   * Sample and anonymize data
   */
  private async applySampled(
    sourceData: { entities: Record<string, unknown>[]; relationships?: Record<string, unknown>[] },
    request: DataCloneRequest,
    profile: SandboxTenantProfile,
    context: CloneContext
  ): Promise<{ entities: Record<string, unknown>[]; relationships?: Record<string, unknown>[] }> {
    const sampleSize = Math.min(
      request.sampleSize || profile.dataAccessPolicy.maxRecords,
      sourceData.entities.length
    );

    // Sample entities
    let sampledEntities: Record<string, unknown>[];

    switch (request.sampleMethod) {
      case 'stratified':
        sampledEntities = this.stratifiedSample(sourceData.entities, sampleSize);
        break;
      case 'systematic':
        sampledEntities = this.systematicSample(sourceData.entities, sampleSize);
        break;
      case 'random':
      default:
        sampledEntities = this.randomSample(sourceData.entities, sampleSize);
    }

    // Apply anonymization to sample
    return this.applyAnonymized(
      { entities: sampledEntities, relationships: sourceData.relationships },
      request,
      profile,
      context
    );
  }

  /**
   * Fuzz values while maintaining structure
   */
  private async applyFuzzed(
    sourceData: { entities: Record<string, unknown>[]; relationships?: Record<string, unknown>[] },
    request: DataCloneRequest,
    context: CloneContext
  ): Promise<{ entities: Record<string, unknown>[]; relationships?: Record<string, unknown>[] }> {
    const fuzzedEntities = sourceData.entities.map(entity => {
      const fuzzed: Record<string, unknown> = {
        id: uuidv4(),
        dataSource: 'fuzzed',
        tenantId: request.sandboxId,
      };

      for (const [key, value] of Object.entries(entity)) {
        if (key === 'id' || key === 'tenantId') continue;
        fuzzed[key] = this.fuzzValue(value);
      }

      return fuzzed;
    });

    return {
      entities: fuzzedEntities,
      relationships: sourceData.relationships?.map(rel => ({
        ...rel,
        id: uuidv4(),
        dataSource: 'fuzzed',
        tenantId: request.sandboxId,
      })),
    };
  }

  /**
   * Store cloned data in sandbox
   */
  private async storeClonedData(
    data: { entities: Record<string, unknown>[]; relationships?: Record<string, unknown>[] },
    request: DataCloneRequest,
    context: CloneContext
  ): Promise<string> {
    // In a real implementation, this would:
    // 1. Store data in the appropriate sandbox database
    // 2. Return the location/identifier

    const location = `sandbox://${request.sandboxId}/clones/${context.requestId}`;

    logger.info('Stored cloned data', {
      location,
      entityCount: data.entities.length,
      relationshipCount: data.relationships?.length || 0,
    });

    return location;
  }

  // Helper methods

  private async fetchFromNeo4j(
    request: DataCloneRequest
  ): Promise<{ entities: Record<string, unknown>[]; relationships?: Record<string, unknown>[] }> {
    // Simulated Neo4j fetch
    return {
      entities: [
        { id: '1', name: 'Sample Entity', type: 'Person', createdAt: new Date() },
        { id: '2', name: 'Another Entity', type: 'Organization', createdAt: new Date() },
      ],
      relationships: [
        { id: 'r1', type: 'WORKS_FOR', sourceId: '1', targetId: '2' },
      ],
    };
  }

  private async fetchFromPostgres(
    request: DataCloneRequest
  ): Promise<{ entities: Record<string, unknown>[]; relationships?: Record<string, unknown>[] }> {
    return { entities: [], relationships: [] };
  }

  private async fetchFromInvestigation(
    request: DataCloneRequest
  ): Promise<{ entities: Record<string, unknown>[]; relationships?: Record<string, unknown>[] }> {
    return { entities: [], relationships: [] };
  }

  private async fetchFromScenario(
    request: DataCloneRequest
  ): Promise<{ entities: Record<string, unknown>[]; relationships?: Record<string, unknown>[] }> {
    return { entities: [], relationships: [] };
  }

  private generateSyntheticValue(fieldName: string, originalValue: unknown): unknown {
    const fieldLower = fieldName.toLowerCase();

    // Use field name hints for appropriate generators
    if (fieldLower.includes('name')) {
      return `Synthetic_${Math.random().toString(36).substring(7)}`;
    }
    if (fieldLower.includes('email')) {
      return `user_${Math.random().toString(36).substring(7)}@example.com`;
    }
    if (fieldLower.includes('date') || originalValue instanceof Date) {
      return new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
    }
    if (typeof originalValue === 'number') {
      return Math.floor(Math.random() * 1000);
    }
    if (typeof originalValue === 'boolean') {
      return Math.random() > 0.5;
    }

    return `synthetic_${Math.random().toString(36).substring(7)}`;
  }

  private generateSyntheticRelationships(
    originalRels: Record<string, unknown>[],
    sandboxId: string
  ): Record<string, unknown>[] {
    return originalRels.map(rel => ({
      id: uuidv4(),
      type: rel.type,
      sourceId: uuidv4(),
      targetId: uuidv4(),
      dataSource: 'synthetic',
      tenantId: sandboxId,
    }));
  }

  private buildDefaultAnonymizationConfig(
    sampleEntity: Record<string, unknown>,
    profile: SandboxTenantProfile
  ): FieldAnonymizationConfig[] {
    const configs: FieldAnonymizationConfig[] = [];
    const piiFields = ['name', 'email', 'phone', 'address', 'ssn', 'dob'];

    for (const field of Object.keys(sampleEntity)) {
      const fieldLower = field.toLowerCase();
      if (piiFields.some(pii => fieldLower.includes(pii))) {
        configs.push({
          fieldPath: field,
          technique: this.mapPiiHandlingToTechnique(profile.dataAccessPolicy.piiHandling),
          config: {},
        });
      }
    }

    return configs;
  }

  private mapPiiHandlingToTechnique(
    handling: 'block' | 'redact' | 'hash' | 'synthetic'
  ): AnonymizationTechnique {
    switch (handling) {
      case 'redact':
        return AnonymizationTechnique.REDACTION;
      case 'hash':
        return AnonymizationTechnique.HASHING;
      case 'synthetic':
        return AnonymizationTechnique.PSEUDONYMIZATION;
      default:
        return AnonymizationTechnique.REDACTION;
    }
  }

  private fuzzValue(value: unknown): unknown {
    if (typeof value === 'string') {
      // Shuffle characters
      return value.split('').sort(() => Math.random() - 0.5).join('');
    }
    if (typeof value === 'number') {
      // Add noise
      return value + (Math.random() - 0.5) * value * 0.2;
    }
    if (value instanceof Date) {
      // Shift by random days
      return new Date(value.getTime() + (Math.random() - 0.5) * 30 * 24 * 60 * 60 * 1000);
    }
    return value;
  }

  private randomSample(
    entities: Record<string, unknown>[],
    size: number
  ): Record<string, unknown>[] {
    const shuffled = [...entities].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, size);
  }

  private stratifiedSample(
    entities: Record<string, unknown>[],
    size: number
  ): Record<string, unknown>[] {
    // Group by type field if present
    const groups = new Map<string, Record<string, unknown>[]>();

    for (const entity of entities) {
      const type = String(entity.type || 'default');
      if (!groups.has(type)) {
        groups.set(type, []);
      }
      groups.get(type)!.push(entity);
    }

    // Sample proportionally from each group
    const result: Record<string, unknown>[] = [];
    const sizePerGroup = Math.floor(size / groups.size);

    for (const groupEntities of groups.values()) {
      result.push(...this.randomSample(groupEntities, sizePerGroup));
    }

    return result.slice(0, size);
  }

  private systematicSample(
    entities: Record<string, unknown>[],
    size: number
  ): Record<string, unknown>[] {
    const interval = Math.max(1, Math.floor(entities.length / size));
    const result: Record<string, unknown>[] = [];

    for (let i = 0; i < entities.length && result.length < size; i += interval) {
      result.push(entities[i]);
    }

    return result;
  }

  private getAnonymizationReport(
    configs: FieldAnonymizationConfig[],
    context: CloneContext
  ): { fieldPath: string; technique: string; recordsAffected: number }[] {
    return configs.map(config => ({
      fieldPath: config.fieldPath,
      technique: config.technique,
      recordsAffected: context.clonedRecords,
    }));
  }
}

/**
 * Singleton instance
 */
let cloneServiceInstance: DataCloneService | null = null;

export function getDataCloneService(): DataCloneService {
  if (!cloneServiceInstance) {
    cloneServiceInstance = new DataCloneService();
  }
  return cloneServiceInstance;
}
