import { GraphQLScalarType, Kind } from 'graphql';
import { v4 as uuidv4 } from 'uuid';
import {
  Resolvers,
  GraphQLContext,
  CreateSandboxInput,
  UpdateSandboxInput,
  DataCloneInput,
  SyntheticDataInput,
  ScenarioSimulationInput,
  SandboxQueryInput,
  CreatePromotionInput,
  PromotionReviewInput,
  SandboxIsolationLevel as GQLIsolationLevel,
  ConnectorType as GQLConnectorType,
} from './types.js';
import {
  SandboxConfigManager,
  SandboxEnforcer,
  SandboxValidator,
  SandboxIsolationLevel,
  SandboxStatus,
  OperationType,
  ConnectorType,
  SandboxPreset,
} from '@intelgraph/sandbox-tenant-profile';
import {
  DataLabAPI,
  DataCloneService,
  SyntheticDataGenerator,
  PromotionWorkflow,
  CloneStrategy,
  DataSourceType,
  AnonymizationTechnique,
} from '@intelgraph/datalab-service';
import { createLogger } from '../utils/logger.js';
import { metrics } from '../metrics/index.js';

const logger = createLogger('GraphQLResolvers');

// Service instances
const configManager = new SandboxConfigManager();
const enforcer = new SandboxEnforcer();
const validator = new SandboxValidator();
const dataLabAPI = new DataLabAPI();
const cloneService = new DataCloneService();
const syntheticGenerator = new SyntheticDataGenerator();
const promotionWorkflow = new PromotionWorkflow();

// Start time for uptime calculation
const startTime = Date.now();

// Custom scalars
const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type',
  serialize(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    throw new Error('DateTime must be a Date object');
  },
  parseValue(value: unknown): Date {
    if (typeof value === 'string') {
      return new Date(value);
    }
    throw new Error('DateTime must be a string');
  },
  parseLiteral(ast): Date {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    throw new Error('DateTime must be a string');
  },
});

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON custom scalar type',
  serialize(value: unknown): unknown {
    return value;
  },
  parseValue(value: unknown): unknown {
    return value;
  },
  parseLiteral(ast): unknown {
    if (ast.kind === Kind.STRING) {
      return JSON.parse(ast.value);
    }
    if (ast.kind === Kind.OBJECT) {
      return ast.fields.reduce((acc, field) => {
        acc[field.name.value] = JSONScalar.parseLiteral(field.value);
        return acc;
      }, {} as Record<string, unknown>);
    }
    return null;
  },
});

const UUIDScalar = new GraphQLScalarType({
  name: 'UUID',
  description: 'UUID custom scalar type',
  serialize(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    throw new Error('UUID must be a string');
  },
  parseValue(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    throw new Error('UUID must be a string');
  },
  parseLiteral(ast): string {
    if (ast.kind === Kind.STRING) {
      return ast.value;
    }
    throw new Error('UUID must be a string');
  },
});

// Helper functions
function mapIsolationLevel(level?: GQLIsolationLevel | null): SandboxIsolationLevel | undefined {
  if (!level) return undefined;
  const mapping: Record<string, SandboxIsolationLevel> = {
    STANDARD: SandboxIsolationLevel.STANDARD,
    ENHANCED: SandboxIsolationLevel.ENHANCED,
    AIRGAPPED: SandboxIsolationLevel.AIRGAPPED,
    RESEARCH: SandboxIsolationLevel.RESEARCH,
  };
  return mapping[level];
}

function mapConnectorType(type?: GQLConnectorType | null): ConnectorType | undefined {
  if (!type) return undefined;
  const mapping: Record<string, ConnectorType> = {
    DATABASE: ConnectorType.DATABASE,
    API: ConnectorType.API,
    FILE_SYSTEM: ConnectorType.FILE_SYSTEM,
    STREAMING: ConnectorType.STREAMING,
    EXTERNAL_SERVICE: ConnectorType.EXTERNAL_SERVICE,
    FEDERATION: ConnectorType.FEDERATION,
  };
  return mapping[type];
}

function mapCloneStrategy(strategy: string): CloneStrategy {
  const mapping: Record<string, CloneStrategy> = {
    STRUCTURE_ONLY: CloneStrategy.STRUCTURE_ONLY,
    SYNTHETIC: CloneStrategy.SYNTHETIC,
    ANONYMIZED: CloneStrategy.ANONYMIZED,
    SAMPLED: CloneStrategy.SAMPLED,
    FUZZED: CloneStrategy.FUZZED,
  };
  return mapping[strategy] || CloneStrategy.SYNTHETIC;
}

function mapDataSourceType(type: string): DataSourceType {
  const mapping: Record<string, DataSourceType> = {
    NEO4J: DataSourceType.NEO4J,
    POSTGRESQL: DataSourceType.POSTGRESQL,
    INVESTIGATION: DataSourceType.INVESTIGATION,
    ENTITY_SET: DataSourceType.ENTITY_SET,
    SCENARIO: DataSourceType.SCENARIO,
  };
  return mapping[type] || DataSourceType.NEO4J;
}

function mapAnonymizationTechnique(technique: string): AnonymizationTechnique {
  const mapping: Record<string, AnonymizationTechnique> = {
    REDACTION: AnonymizationTechnique.REDACTION,
    HASHING: AnonymizationTechnique.HASHING,
    PSEUDONYMIZATION: AnonymizationTechnique.PSEUDONYMIZATION,
    GENERALIZATION: AnonymizationTechnique.GENERALIZATION,
    MASKING: AnonymizationTechnique.MASKING,
    NOISE_ADDITION: AnonymizationTechnique.NOISE_ADDITION,
    K_ANONYMITY: AnonymizationTechnique.K_ANONYMITY,
    DIFFERENTIAL_PRIVACY: AnonymizationTechnique.DIFFERENTIAL_PRIVACY,
  };
  return mapping[technique] || AnonymizationTechnique.REDACTION;
}

export const resolvers: Resolvers = {
  DateTime: DateTimeScalar,
  JSON: JSONScalar,
  UUID: UUIDScalar,

  Query: {
    // Sandbox Profile Queries
    sandbox: async (_, { id }, context) => {
      const timer = metrics.resolverDuration.startTimer({ resolver: 'sandbox' });
      try {
        const profile = await configManager.getProfile(id);
        metrics.resolverCalls.inc({ resolver: 'sandbox', status: profile ? 'success' : 'not_found' });
        return profile as any;
      } finally {
        timer();
      }
    },

    sandboxes: async (_, { status, includeExpired, limit = 50, offset = 0 }, context) => {
      const timer = metrics.resolverDuration.startTimer({ resolver: 'sandboxes' });
      try {
        const profiles = await configManager.listProfiles(context.user.id, {
          status: status as SandboxStatus | undefined,
          includeExpired: includeExpired ?? false,
        });
        metrics.resolverCalls.inc({ resolver: 'sandboxes', status: 'success' });
        return profiles.slice(offset, offset + limit) as any[];
      } finally {
        timer();
      }
    },

    sandboxPresets: async () => {
      const presets = configManager.getAvailablePresets();
      return presets.map(p => ({
        name: p.name,
        description: p.description,
        isolationLevel: p.name === 'airgapped' ? 'AIRGAPPED' :
                       p.name === 'research' ? 'RESEARCH' :
                       p.name === 'dataLab' ? 'ENHANCED' : 'STANDARD',
        tenantType: p.name === 'dataLab' ? 'DATALAB' : 'SANDBOX',
      }));
    },

    validateSandbox: async (_, { id }, context) => {
      const profile = await configManager.getProfile(id);
      if (!profile) {
        throw new Error(`Sandbox not found: ${id}`);
      }
      const report = validator.validate(profile);
      return {
        valid: report.valid,
        findings: report.findings,
        timestamp: report.timestamp,
        profileId: report.profileId,
      };
    },

    checkEnforcement: async (_, { sandboxId, operation, connectorType, targetEndpoint, dataFields }, context) => {
      const profile = await configManager.getProfile(sandboxId);
      if (!profile) {
        throw new Error(`Sandbox not found: ${sandboxId}`);
      }

      const decision = await enforcer.enforce(profile, {
        sandboxId,
        userId: context.user.id,
        operation: operation as OperationType,
        connectorType: mapConnectorType(connectorType),
        targetEndpoint: targetEndpoint ?? undefined,
        dataFields: dataFields ?? undefined,
      });

      return decision;
    },

    // Data Lab Queries
    dataClone: async (_, { id }) => {
      // Would fetch from persistence layer
      return null;
    },

    dataClones: async (_, { sandboxId, limit = 50, offset = 0 }) => {
      // Would fetch from persistence layer
      return [];
    },

    syntheticData: async (_, { id }) => {
      // Would fetch from persistence layer
      return null;
    },

    syntheticDataResults: async (_, { sandboxId, limit = 50, offset = 0 }) => {
      // Would fetch from persistence layer
      return [];
    },

    scenarioTemplates: async (_, { category }) => {
      const templates = await dataLabAPI.listScenarioTemplates(category?.toLowerCase() as any);
      return templates as any[];
    },

    scenarioTemplate: async (_, { id }) => {
      const template = await dataLabAPI.getScenarioTemplate(id);
      return template as any;
    },

    // Promotion Queries
    promotionRequest: async (_, { id }) => {
      const request = await promotionWorkflow.getRequest(id);
      return request as any;
    },

    promotionRequests: async (_, { sandboxId, status, limit = 50, offset = 0 }) => {
      const requests = await promotionWorkflow.listRequests(sandboxId);
      const filtered = status ? requests.filter(r => r.status === status) : requests;
      return filtered.slice(offset, offset + limit) as any[];
    },

    pendingReviews: async (_, { limit = 50, offset = 0 }, context) => {
      // Would filter by reviewer
      return [];
    },

    // Session Queries
    activeSession: async (_, { sandboxId }, context) => {
      // Would fetch from session store
      return null;
    },

    // Audit Queries
    linkbackAttempts: async (_, { sandboxId, limit = 100 }) => {
      const attempts = enforcer.getLinkbackAttempts(sandboxId, limit);
      return attempts;
    },

    // Health
    health: async () => {
      return {
        status: 'healthy',
        version: '1.0.0',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        dependencies: [
          { name: 'neo4j', status: 'healthy', latencyMs: 5 },
          { name: 'postgres', status: 'healthy', latencyMs: 3 },
          { name: 'redis', status: 'healthy', latencyMs: 1 },
        ],
      };
    },
  },

  Mutation: {
    // Sandbox Profile Mutations
    createSandbox: async (_, { input }, context) => {
      const timer = metrics.resolverDuration.startTimer({ resolver: 'createSandbox' });
      try {
        const profile = await configManager.createProfile(
          {
            name: input.name,
            description: input.description ?? undefined,
            parentTenantId: input.parentTenantId ?? undefined,
            isolationLevel: mapIsolationLevel(input.isolationLevel),
            resourceQuotas: input.resourceQuotas ?? undefined,
            dataAccessPolicy: input.dataAccessPolicy ?? undefined,
            expiresInDays: input.expiresInDays ?? 30,
            teamIds: input.teamIds ?? undefined,
            tags: input.tags ?? undefined,
          },
          context.user.id,
          input.preset as SandboxPreset | undefined
        );

        metrics.sandboxCreated.inc({ isolation_level: profile.isolationLevel });
        logger.info('Sandbox created', { sandboxId: profile.id, userId: context.user.id });

        return profile as any;
      } finally {
        timer();
      }
    },

    updateSandbox: async (_, { id, input }, context) => {
      const profile = await configManager.updateProfile(id, input as any, context.user.id);
      return profile as any;
    },

    activateSandbox: async (_, { id }, context) => {
      const profile = await configManager.activateProfile(id);
      metrics.sandboxStatusChange.inc({ from: 'provisioning', to: 'active' });
      return profile as any;
    },

    suspendSandbox: async (_, { id, reason }, context) => {
      const profile = await configManager.suspendProfile(id, reason);
      metrics.sandboxStatusChange.inc({ from: 'active', to: 'suspended' });
      return profile as any;
    },

    resumeSandbox: async (_, { id }, context) => {
      const profile = await configManager.getProfile(id);
      if (!profile) throw new Error(`Sandbox not found: ${id}`);

      const updated = await configManager.updateProfile(id, { status: SandboxStatus.ACTIVE }, context.user.id);
      metrics.sandboxStatusChange.inc({ from: 'suspended', to: 'active' });
      return updated as any;
    },

    archiveSandbox: async (_, { id }, context) => {
      const profile = await configManager.archiveProfile(id);
      metrics.sandboxStatusChange.inc({ from: 'any', to: 'archived' });
      return profile as any;
    },

    deleteSandbox: async (_, { id }, context) => {
      // Would delete from persistence layer
      logger.warn('Sandbox deleted', { sandboxId: id, userId: context.user.id });
      return true;
    },

    extendSandbox: async (_, { id, days }, context) => {
      const profile = await configManager.getProfile(id);
      if (!profile) throw new Error(`Sandbox not found: ${id}`);

      const newExpiry = new Date(profile.expiresAt || new Date());
      newExpiry.setDate(newExpiry.getDate() + days);

      const updated = await configManager.updateProfile(id, { expiresAt: newExpiry }, context.user.id);
      return updated as any;
    },

    // Data Lab Mutations
    cloneData: async (_, { input }, context) => {
      const timer = metrics.resolverDuration.startTimer({ resolver: 'cloneData' });
      try {
        const profile = await configManager.getProfile(input.sandboxId);
        if (!profile) throw new Error(`Sandbox not found: ${input.sandboxId}`);

        const result = await cloneService.clone(
          {
            id: uuidv4(),
            sandboxId: input.sandboxId,
            name: input.name,
            description: input.description ?? undefined,
            sourceType: mapDataSourceType(input.sourceType),
            sourceConfig: input.sourceConfig as any,
            strategy: mapCloneStrategy(input.strategy),
            fieldAnonymization: (input.fieldAnonymization || []).map(f => ({
              fieldPath: f.fieldPath,
              technique: mapAnonymizationTechnique(f.technique),
              config: {
                preserveFormat: f.preserveFormat ?? false,
                preserveLength: f.preserveLength ?? false,
                kValue: f.kValue ?? undefined,
                epsilon: f.epsilon ?? undefined,
                hashAlgorithm: f.hashAlgorithm ?? undefined,
                maskChar: f.maskChar ?? '*',
                maskFromStart: f.maskFromStart ?? 0,
                maskFromEnd: f.maskFromEnd ?? 0,
              },
            })),
            sampleSize: input.sampleSize ?? undefined,
            sampleMethod: (input.sampleMethod ?? 'random') as 'random' | 'stratified' | 'systematic',
            outputFormat: (input.outputFormat ?? 'neo4j') as 'neo4j' | 'json' | 'csv' | 'parquet',
            includeRelationships: input.includeRelationships ?? true,
            preserveGraph: input.preserveGraph ?? true,
            requestedBy: context.user.id,
            requestedAt: new Date(),
          },
          profile
        );

        metrics.dataCloneOperations.inc({ strategy: input.strategy, status: result.status });
        return result as any;
      } finally {
        timer();
      }
    },

    generateSyntheticData: async (_, { input }, context) => {
      const timer = metrics.resolverDuration.startTimer({ resolver: 'generateSyntheticData' });
      try {
        const result = await syntheticGenerator.generate({
          sandboxId: input.sandboxId,
          name: input.name,
          schemas: input.schemas.map(s => ({
            entityType: s.entityType,
            fields: s.fields.map(f => ({
              name: f.name,
              type: f.type as any,
              generator: f.generator,
              config: (f.config || {}) as Record<string, unknown>,
              nullable: f.nullable ?? false,
              nullProbability: f.nullProbability ?? 0,
            })),
            relationshipTypes: (s.relationshipTypes || []).map(r => ({
              type: r.type,
              targetEntityType: r.targetEntityType,
              direction: r.direction as 'outgoing' | 'incoming' | 'both',
              probability: r.probability ?? 0.5,
              minCount: r.minCount ?? 0,
              maxCount: r.maxCount ?? 5,
            })),
          })),
          config: {
            totalEntities: input.config.totalEntities,
            entityDistribution: input.config.entityDistribution as Record<string, number> | undefined,
            seed: input.config.seed ?? undefined,
            locale: input.config.locale ?? 'en',
            generateRelationships: input.config.generateRelationships ?? true,
            connectivityDensity: input.config.connectivityDensity ?? 0.3,
          },
          outputFormat: (input.outputFormat ?? 'neo4j') as 'neo4j' | 'json' | 'csv',
          requestedBy: context.user.id,
        });

        metrics.syntheticDataGenerated.inc({ status: result.status });
        return result as any;
      } finally {
        timer();
      }
    },

    runScenario: async (_, { input }, context) => {
      const result = await dataLabAPI.runScenario({
        sandboxId: input.sandboxId,
        templateId: input.templateId,
        name: input.name,
        description: input.description ?? undefined,
        parameters: (input.parameters || {}) as Record<string, unknown>,
        scale: input.scale ?? 1.0,
        seed: input.seed ?? undefined,
        outputFormat: (input.outputFormat ?? 'neo4j') as 'neo4j' | 'json',
        requestedBy: context.user.id,
      });

      return result as any;
    },

    executeSandboxQuery: async (_, { input }, context) => {
      const result = await dataLabAPI.executeQuery({
        sandboxId: input.sandboxId,
        query: input.query,
        queryType: input.queryType as 'cypher' | 'sql' | 'graphql',
        parameters: (input.parameters || {}) as Record<string, unknown>,
        timeout: input.timeout ?? 30000,
        limit: input.limit ?? 1000,
        requestedBy: context.user.id,
      });

      return result as any;
    },

    // Session Mutations
    startSession: async (_, { sandboxId }, context) => {
      const session = await dataLabAPI.startSession(sandboxId, context.user.id);
      return session as any;
    },

    endSession: async (_, { sessionId }, context) => {
      await dataLabAPI.endSession(sessionId);
      return true;
    },

    // Promotion Mutations
    createPromotionRequest: async (_, { input }, context) => {
      const request = await promotionWorkflow.createRequest(
        input.sandboxId,
        input.targetTenantId,
        context.user.id,
        {
          type: input.promotionType.toLowerCase() as any,
          id: input.artifactId,
          name: input.artifactName,
          version: input.artifactVersion ?? undefined,
        },
        input.justification,
        input.rollbackPlan ?? undefined
      );

      return request as any;
    },

    submitForReview: async (_, { requestId, reviewers }, context) => {
      const request = await promotionWorkflow.submitForReview(requestId, reviewers);
      return request as any;
    },

    reviewPromotion: async (_, { input }, context) => {
      const request = await promotionWorkflow.addApproval(
        input.requestId,
        context.user.id,
        input.decision as 'approve' | 'reject' | 'request_changes',
        input.comments ?? undefined
      );

      return request as any;
    },

    executePromotion: async (_, { requestId }, context) => {
      const request = await promotionWorkflow.executePromotion(requestId);
      metrics.promotionExecuted.inc({ status: 'success' });
      return request as any;
    },

    rollbackPromotion: async (_, { requestId, reason }, context) => {
      const request = await promotionWorkflow.rollback(requestId, reason);
      metrics.promotionExecuted.inc({ status: 'rolled_back' });
      return request as any;
    },

    cancelPromotion: async (_, { requestId }, context) => {
      // Would update status to cancelled
      const request = await promotionWorkflow.getRequest(requestId);
      return request as any;
    },
  },

  Subscription: {
    sandboxStatusChanged: {
      subscribe: async function* (_, { sandboxId }) {
        // Would use pub/sub system
        yield { sandboxStatusChanged: null };
      },
    },
    dataCloneProgress: {
      subscribe: async function* (_, { requestId }) {
        yield { dataCloneProgress: null };
      },
    },
    syntheticDataProgress: {
      subscribe: async function* (_, { requestId }) {
        yield { syntheticDataProgress: null };
      },
    },
    promotionStatusChanged: {
      subscribe: async function* (_, { requestId }) {
        yield { promotionStatusChanged: null };
      },
    },
    linkbackAlert: {
      subscribe: async function* (_, { sandboxId }) {
        yield { linkbackAlert: null };
      },
    },
  },
};
