import { z } from 'zod';

/**
 * DataLab Service Types
 *
 * Types for data lab operations including synthetic data generation,
 * data cloning, anonymization, and scenario simulation.
 */

// ============================================================================
// Data Source Types
// ============================================================================

/**
 * Data source types supported for cloning
 */
export enum DataSourceType {
  NEO4J = 'neo4j',
  POSTGRESQL = 'postgresql',
  INVESTIGATION = 'investigation',
  ENTITY_SET = 'entity_set',
  SCENARIO = 'scenario',
}

/**
 * Clone strategy for production data
 */
export enum CloneStrategy {
  STRUCTURE_ONLY = 'structure_only',     // Schema only, no data
  SYNTHETIC = 'synthetic',               // Replace all values with synthetic
  ANONYMIZED = 'anonymized',             // De-identify real data
  SAMPLED = 'sampled',                   // Small sample with anonymization
  FUZZED = 'fuzzed',                     // Real structure, fuzzed values
}

/**
 * Anonymization techniques
 */
export enum AnonymizationTechnique {
  REDACTION = 'redaction',               // Remove/replace with placeholders
  HASHING = 'hashing',                   // One-way hash
  PSEUDONYMIZATION = 'pseudonymization', // Reversible substitution
  GENERALIZATION = 'generalization',     // Less specific values
  MASKING = 'masking',                   // Partial hiding
  NOISE_ADDITION = 'noise_addition',     // Add statistical noise
  K_ANONYMITY = 'k_anonymity',           // Group with k-1 others
  DIFFERENTIAL_PRIVACY = 'differential_privacy', // Mathematical privacy
}

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Field-level anonymization configuration
 */
export const FieldAnonymizationConfigSchema = z.object({
  fieldPath: z.string(),
  technique: z.nativeEnum(AnonymizationTechnique),
  config: z.object({
    preserveFormat: z.boolean().default(false),
    preserveLength: z.boolean().default(false),
    kValue: z.number().min(2).max(100).optional(), // For k-anonymity
    epsilon: z.number().min(0.01).max(10).optional(), // For differential privacy
    hashAlgorithm: z.enum(['sha256', 'sha512', 'blake2b']).optional(),
    maskChar: z.string().length(1).default('*'),
    maskFromStart: z.number().min(0).default(0),
    maskFromEnd: z.number().min(0).default(0),
  }).default({}),
});

export type FieldAnonymizationConfig = z.infer<typeof FieldAnonymizationConfigSchema>;

/**
 * Data clone request
 */
export const DataCloneRequestSchema = z.object({
  id: z.string().uuid().optional(),
  sandboxId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),

  // Source configuration
  sourceType: z.nativeEnum(DataSourceType),
  sourceConfig: z.object({
    connectionId: z.string().optional(),
    investigationId: z.string().optional(),
    entityIds: z.array(z.string()).optional(),
    cypherQuery: z.string().optional(),
    sqlQuery: z.string().optional(),
    scenarioId: z.string().optional(),
  }),

  // Clone configuration
  strategy: z.nativeEnum(CloneStrategy).default(CloneStrategy.SYNTHETIC),
  fieldAnonymization: z.array(FieldAnonymizationConfigSchema).default([]),
  sampleSize: z.number().min(1).max(100000).optional(),
  sampleMethod: z.enum(['random', 'stratified', 'systematic']).default('random'),

  // Output configuration
  outputFormat: z.enum(['neo4j', 'json', 'csv', 'parquet']).default('neo4j'),
  includeRelationships: z.boolean().default(true),
  preserveGraph: z.boolean().default(true), // Maintain graph structure

  // Metadata
  requestedBy: z.string(),
  requestedAt: z.date().default(() => new Date()),
});

export type DataCloneRequest = z.infer<typeof DataCloneRequestSchema>;

/**
 * Data clone result
 */
export const DataCloneResultSchema = z.object({
  id: z.string().uuid(),
  requestId: z.string().uuid(),
  sandboxId: z.string().uuid(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),

  // Statistics
  statistics: z.object({
    sourceRecords: z.number(),
    clonedRecords: z.number(),
    anonymizedFields: z.number(),
    relationshipsCloned: z.number(),
    processingTimeMs: z.number(),
  }),

  // Audit
  audit: z.object({
    anonymizationReport: z.array(z.object({
      fieldPath: z.string(),
      technique: z.string(),
      recordsAffected: z.number(),
    })),
    validationPassed: z.boolean(),
    warnings: z.array(z.string()),
  }),

  // Output
  outputLocation: z.string().optional(),
  outputNodeId: z.string().optional(),

  // Timestamps
  startedAt: z.date(),
  completedAt: z.date().optional(),
  error: z.string().optional(),
});

export type DataCloneResult = z.infer<typeof DataCloneResultSchema>;

/**
 * Synthetic data schema definition
 */
export const SyntheticFieldSchema = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'date', 'uuid', 'array', 'object']),
  generator: z.string(), // Generator function name
  config: z.record(z.unknown()).default({}),
  nullable: z.boolean().default(false),
  nullProbability: z.number().min(0).max(1).default(0),
});

export type SyntheticField = z.infer<typeof SyntheticFieldSchema>;

/**
 * Entity schema for synthetic generation
 */
export const SyntheticEntitySchemaDefinition = z.object({
  entityType: z.string(),
  fields: z.array(SyntheticFieldSchema),
  relationshipTypes: z.array(z.object({
    type: z.string(),
    targetEntityType: z.string(),
    direction: z.enum(['outgoing', 'incoming', 'both']),
    probability: z.number().min(0).max(1).default(0.5),
    minCount: z.number().min(0).default(0),
    maxCount: z.number().min(0).default(5),
  })).default([]),
});

export type SyntheticEntitySchema = z.infer<typeof SyntheticEntitySchemaDefinition>;

/**
 * Synthetic data generation request
 */
export const SyntheticDataRequestSchema = z.object({
  sandboxId: z.string().uuid(),
  name: z.string().min(1).max(100),

  // Schema definition
  schemas: z.array(SyntheticEntitySchemaDefinition),

  // Generation configuration
  config: z.object({
    totalEntities: z.number().min(1).max(1000000).default(1000),
    entityDistribution: z.record(z.number()).optional(), // Entity type -> percentage
    seed: z.number().optional(), // For reproducibility
    locale: z.string().default('en'),
    generateRelationships: z.boolean().default(true),
    connectivityDensity: z.number().min(0).max(1).default(0.3),
  }),

  // Output
  outputFormat: z.enum(['neo4j', 'json', 'csv']).default('neo4j'),

  // Metadata
  requestedBy: z.string(),
});

export type SyntheticDataRequest = z.infer<typeof SyntheticDataRequestSchema>;

/**
 * Synthetic data generation result
 */
export const SyntheticDataResultSchema = z.object({
  id: z.string().uuid(),
  sandboxId: z.string().uuid(),
  status: z.enum(['pending', 'generating', 'completed', 'failed']),

  // Statistics
  statistics: z.object({
    entitiesGenerated: z.number(),
    relationshipsGenerated: z.number(),
    byEntityType: z.record(z.number()),
    generationTimeMs: z.number(),
  }),

  // Output
  outputLocation: z.string().optional(),
  sampleData: z.array(z.record(z.unknown())).optional(),

  // Timestamps
  startedAt: z.date(),
  completedAt: z.date().optional(),
  error: z.string().optional(),
});

export type SyntheticDataResult = z.infer<typeof SyntheticDataResultSchema>;

/**
 * Scenario template for simulation
 */
export const ScenarioTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  category: z.enum([
    'intelligence_analysis',
    'fraud_detection',
    'network_analysis',
    'entity_resolution',
    'threat_detection',
    'compliance',
    'custom',
  ]),

  // Entity templates
  entityTemplates: z.array(z.object({
    entityType: z.string(),
    count: z.number().min(1).max(10000),
    schema: SyntheticEntitySchemaDefinition,
    clusters: z.number().min(1).default(1),
  })),

  // Relationship templates
  relationshipTemplates: z.array(z.object({
    type: z.string(),
    sourceType: z.string(),
    targetType: z.string(),
    probability: z.number().min(0).max(1),
    properties: z.array(SyntheticFieldSchema).default([]),
  })),

  // Scenario parameters
  parameters: z.record(z.object({
    type: z.enum(['string', 'number', 'boolean', 'select']),
    label: z.string(),
    default: z.unknown(),
    options: z.array(z.string()).optional(),
  })).default({}),

  // Metadata
  createdBy: z.string(),
  createdAt: z.date(),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

export type ScenarioTemplate = z.infer<typeof ScenarioTemplateSchema>;

/**
 * Scenario simulation request
 */
export const ScenarioSimulationRequestSchema = z.object({
  sandboxId: z.string().uuid(),
  templateId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),

  // Parameter overrides
  parameters: z.record(z.unknown()).default({}),

  // Scale configuration
  scale: z.number().min(0.1).max(10).default(1), // Multiplier for entity counts

  // Seed for reproducibility
  seed: z.number().optional(),

  // Output
  outputFormat: z.enum(['neo4j', 'json']).default('neo4j'),

  // Metadata
  requestedBy: z.string(),
});

export type ScenarioSimulationRequest = z.infer<typeof ScenarioSimulationRequestSchema>;

/**
 * Query execution in sandbox
 */
export const SandboxQueryRequestSchema = z.object({
  sandboxId: z.string().uuid(),
  query: z.string().min(1).max(10000),
  queryType: z.enum(['cypher', 'sql', 'graphql']),
  parameters: z.record(z.unknown()).default({}),
  timeout: z.number().min(1000).max(300000).default(30000),
  limit: z.number().min(1).max(10000).default(1000),
  requestedBy: z.string(),
});

export type SandboxQueryRequest = z.infer<typeof SandboxQueryRequestSchema>;

/**
 * Query result
 */
export const SandboxQueryResultSchema = z.object({
  id: z.string().uuid(),
  sandboxId: z.string().uuid(),
  status: z.enum(['success', 'error', 'timeout']),
  data: z.array(z.record(z.unknown())).optional(),
  rowCount: z.number(),
  executionTimeMs: z.number(),
  plan: z.string().optional(), // Query execution plan
  warnings: z.array(z.string()).default([]),
  error: z.string().optional(),
});

export type SandboxQueryResult = z.infer<typeof SandboxQueryResultSchema>;

// ============================================================================
// Error Types
// ============================================================================

export enum DataLabErrorCode {
  CLONE_FAILED = 'DATALAB_CLONE_FAILED',
  GENERATION_FAILED = 'DATALAB_GENERATION_FAILED',
  ANONYMIZATION_FAILED = 'DATALAB_ANONYMIZATION_FAILED',
  QUERY_FAILED = 'DATALAB_QUERY_FAILED',
  SCENARIO_NOT_FOUND = 'DATALAB_SCENARIO_NOT_FOUND',
  QUOTA_EXCEEDED = 'DATALAB_QUOTA_EXCEEDED',
  VALIDATION_FAILED = 'DATALAB_VALIDATION_FAILED',
}

export interface DataLabError {
  code: DataLabErrorCode;
  message: string;
  sandboxId?: string;
  operation?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

// ============================================================================
// Generator Types for Faker Integration
// ============================================================================

/**
 * Built-in generator configurations
 */
export const BUILTIN_GENERATORS = {
  // Person generators
  'person.firstName': { module: 'person', method: 'firstName' },
  'person.lastName': { module: 'person', method: 'lastName' },
  'person.fullName': { module: 'person', method: 'fullName' },
  'person.gender': { module: 'person', method: 'sex' },
  'person.jobTitle': { module: 'person', method: 'jobTitle' },

  // Contact generators
  'internet.email': { module: 'internet', method: 'email' },
  'phone.number': { module: 'phone', method: 'number' },

  // Location generators
  'location.city': { module: 'location', method: 'city' },
  'location.country': { module: 'location', method: 'country' },
  'location.address': { module: 'location', method: 'streetAddress' },
  'location.coordinates': { module: 'location', method: 'nearbyGPSCoordinate' },

  // Organization generators
  'company.name': { module: 'company', method: 'name' },
  'company.industry': { module: 'company', method: 'buzzPhrase' },

  // Finance generators
  'finance.amount': { module: 'finance', method: 'amount' },
  'finance.currency': { module: 'finance', method: 'currencyCode' },
  'finance.accountNumber': { module: 'finance', method: 'accountNumber' },

  // Date generators
  'date.past': { module: 'date', method: 'past' },
  'date.future': { module: 'date', method: 'future' },
  'date.recent': { module: 'date', method: 'recent' },

  // ID generators
  'string.uuid': { module: 'string', method: 'uuid' },
  'string.alphanumeric': { module: 'string', method: 'alphanumeric' },

  // Misc generators
  'lorem.sentence': { module: 'lorem', method: 'sentence' },
  'lorem.paragraph': { module: 'lorem', method: 'paragraph' },
  'number.int': { module: 'number', method: 'int' },
  'number.float': { module: 'number', method: 'float' },
  'datatype.boolean': { module: 'datatype', method: 'boolean' },
} as const;

export type BuiltinGenerator = keyof typeof BUILTIN_GENERATORS;
