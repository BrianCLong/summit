/**
 * Threat Pattern Library - Core Type Definitions
 *
 * This module defines the complete type system for the threat pattern library,
 * including ThreatArchetypes, TTPs, PatternTemplates, and IndicatorPatterns.
 *
 * All types use Zod for runtime validation and TypeScript inference.
 */

import { z } from 'zod';

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

/**
 * MITRE ATT&CK Tactics (Enterprise Matrix)
 */
export const tacticEnum = z.enum([
  'RECONNAISSANCE',
  'RESOURCE_DEVELOPMENT',
  'INITIAL_ACCESS',
  'EXECUTION',
  'PERSISTENCE',
  'PRIVILEGE_ESCALATION',
  'DEFENSE_EVASION',
  'CREDENTIAL_ACCESS',
  'DISCOVERY',
  'LATERAL_MOVEMENT',
  'COLLECTION',
  'COMMAND_AND_CONTROL',
  'EXFILTRATION',
  'IMPACT',
]);
export type Tactic = z.infer<typeof tacticEnum>;

/**
 * Threat severity levels
 */
export const severityEnum = z.enum([
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'INFORMATIONAL',
]);
export type Severity = z.infer<typeof severityEnum>;

/**
 * Confidence levels for pattern matches
 */
export const confidenceEnum = z.enum([
  'CONFIRMED',
  'HIGH',
  'MEDIUM',
  'LOW',
  'UNCONFIRMED',
]);
export type Confidence = z.infer<typeof confidenceEnum>;

/**
 * Pattern lifecycle status
 */
export const patternStatusEnum = z.enum([
  'DRAFT',
  'ACTIVE',
  'DEPRECATED',
  'ARCHIVED',
]);
export type PatternStatus = z.infer<typeof patternStatusEnum>;

/**
 * Threat actor sophistication levels
 */
export const sophisticationEnum = z.enum([
  'NOVICE',
  'INTERMEDIATE',
  'ADVANCED',
  'EXPERT',
  'NATION_STATE',
]);
export type Sophistication = z.infer<typeof sophisticationEnum>;

/**
 * Primary threat motivations
 */
export const motivationEnum = z.enum([
  'ESPIONAGE',
  'FINANCIAL_GAIN',
  'SABOTAGE',
  'IDEOLOGY',
  'HACKTIVISM',
  'REVENGE',
  'NOTORIETY',
  'UNKNOWN',
]);
export type Motivation = z.infer<typeof motivationEnum>;

/**
 * Indicator types for pattern matching
 */
export const indicatorTypeEnum = z.enum([
  'IP_ADDRESS',
  'DOMAIN',
  'URL',
  'FILE_HASH',
  'EMAIL_ADDRESS',
  'CERTIFICATE_HASH',
  'REGISTRY_KEY',
  'MUTEX',
  'USER_AGENT',
  'ASN',
  'CIDR',
  'CVE',
  'BEHAVIOR',
  'TOOL_SIGNATURE',
]);
export type IndicatorType = z.infer<typeof indicatorTypeEnum>;

/**
 * Graph relationship types for pattern matching
 */
export const relationshipTypeEnum = z.enum([
  'COMMUNICATES_WITH',
  'CONTROLS',
  'EXPLOITS',
  'TARGETS',
  'USES',
  'ATTRIBUTED_TO',
  'DELIVERS',
  'DOWNLOADS_FROM',
  'HOSTS',
  'INDICATES',
  'RELATED_TO',
  'ORIGINATED_FROM',
  'EXFILTRATES_TO',
  'LATERAL_MOVE_TO',
  'PERSISTS_VIA',
  'ESCALATES_PRIVILEGE_VIA',
]);
export type RelationshipType = z.infer<typeof relationshipTypeEnum>;

/**
 * Node types in the threat knowledge graph
 */
export const nodeTypeEnum = z.enum([
  'THREAT_ACTOR',
  'CAMPAIGN',
  'MALWARE',
  'TOOL',
  'INFRASTRUCTURE',
  'VICTIM',
  'VULNERABILITY',
  'INDICATOR',
  'TECHNIQUE',
  'IDENTITY',
  'LOCATION',
  'ASSET',
  'PROCESS',
  'NETWORK_FLOW',
  'FILE',
]);
export type NodeType = z.infer<typeof nodeTypeEnum>;

/**
 * Time constraint operators for temporal patterns
 */
export const timeConstraintOperatorEnum = z.enum([
  'WITHIN',
  'AFTER',
  'BEFORE',
  'BETWEEN',
  'SEQUENCE',
]);
export type TimeConstraintOperator = z.infer<typeof timeConstraintOperatorEnum>;

// ============================================================================
// CORE SCHEMAS
// ============================================================================

/**
 * Metadata schema for audit and versioning
 */
export const metadataSchema = z.object({
  createdAt: z.string().datetime(),
  createdBy: z.string(),
  updatedAt: z.string().datetime(),
  updatedBy: z.string(),
  version: z.number().int().positive(),
  changelog: z.array(
    z.object({
      version: z.number().int().positive(),
      timestamp: z.string().datetime(),
      author: z.string(),
      description: z.string(),
    })
  ),
});
export type Metadata = z.infer<typeof metadataSchema>;

/**
 * Reference to external standards (MITRE ATT&CK, STIX, etc.)
 */
export const externalReferenceSchema = z.object({
  source: z.string(),
  externalId: z.string(),
  url: z.string().url().optional(),
  description: z.string().optional(),
});
export type ExternalReference = z.infer<typeof externalReferenceSchema>;

/**
 * MITRE ATT&CK reference
 */
export const mitreReferenceSchema = z.object({
  techniqueId: z.string().regex(/^T\d{4}(\.\d{3})?$/), // T1234 or T1234.001
  techniqueName: z.string(),
  tacticIds: z.array(z.string()),
  subTechniqueId: z.string().optional(),
  mitreUrl: z.string().url(),
});
export type MitreReference = z.infer<typeof mitreReferenceSchema>;

// ============================================================================
// GRAPH PATTERN SCHEMAS
// ============================================================================

/**
 * Node constraint for pattern matching
 */
export const nodeConstraintSchema = z.object({
  id: z.string(), // Logical ID within pattern
  type: nodeTypeEnum,
  label: z.string().optional(), // Human-readable label
  properties: z.record(z.string(), z.unknown()).optional(),
  requiredProperties: z.array(z.string()).optional(),
  propertyFilters: z
    .array(
      z.object({
        property: z.string(),
        operator: z.enum([
          'EQUALS',
          'NOT_EQUALS',
          'CONTAINS',
          'STARTS_WITH',
          'ENDS_WITH',
          'REGEX',
          'GREATER_THAN',
          'LESS_THAN',
          'IN',
          'NOT_IN',
        ]),
        value: z.unknown(),
      })
    )
    .optional(),
});
export type NodeConstraint = z.infer<typeof nodeConstraintSchema>;

/**
 * Edge constraint for pattern matching
 */
export const edgeConstraintSchema = z.object({
  id: z.string(), // Logical ID within pattern
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  type: relationshipTypeEnum,
  direction: z.enum(['OUTGOING', 'INCOMING', 'BOTH']).default('OUTGOING'),
  properties: z.record(z.string(), z.unknown()).optional(),
  propertyFilters: z
    .array(
      z.object({
        property: z.string(),
        operator: z.enum([
          'EQUALS',
          'NOT_EQUALS',
          'CONTAINS',
          'GREATER_THAN',
          'LESS_THAN',
          'IN',
        ]),
        value: z.unknown(),
      })
    )
    .optional(),
  minHops: z.number().int().positive().optional(),
  maxHops: z.number().int().positive().optional(),
});
export type EdgeConstraint = z.infer<typeof edgeConstraintSchema>;

/**
 * Time constraint for temporal pattern matching
 */
export const timeConstraintSchema = z.object({
  operator: timeConstraintOperatorEnum,
  referenceNodeId: z.string().optional(),
  targetNodeId: z.string().optional(),
  durationMs: z.number().int().positive().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  sequence: z.array(z.string()).optional(), // Node IDs in required sequence
});
export type TimeConstraint = z.infer<typeof timeConstraintSchema>;

/**
 * Graph motif specification - machine-readable pattern definition
 */
export const graphMotifSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  nodes: z.array(nodeConstraintSchema).min(1),
  edges: z.array(edgeConstraintSchema),
  timeConstraints: z.array(timeConstraintSchema).optional(),
  spatialConstraints: z
    .object({
      maxDistance: z.number().positive().optional(),
      sameLocation: z.array(z.string()).optional(), // Node IDs that must be co-located
    })
    .optional(),
  aggregations: z
    .array(
      z.object({
        nodeId: z.string(),
        property: z.string(),
        function: z.enum(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'DISTINCT']),
        threshold: z.number().optional(),
      })
    )
    .optional(),
  cypherQuery: z.string().optional(), // Pre-compiled Neo4j Cypher query
  weight: z.number().min(0).max(1).default(1), // Confidence weight
});
export type GraphMotif = z.infer<typeof graphMotifSchema>;

// ============================================================================
// TTP (TACTICS, TECHNIQUES, PROCEDURES) SCHEMAS
// ============================================================================

/**
 * Procedure - specific implementation of a technique
 */
export const procedureSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  steps: z.array(
    z.object({
      order: z.number().int().positive(),
      action: z.string(),
      details: z.string().optional(),
      indicators: z.array(z.string()).optional(), // Indicator IDs
    })
  ),
  tools: z.array(z.string()).optional(),
  prerequisites: z.array(z.string()).optional(),
  detectionNotes: z.string().optional(),
});
export type Procedure = z.infer<typeof procedureSchema>;

/**
 * Detection rule specification
 */
export const detectionRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  dataSource: z.string(),
  logic: z.string(), // Detection logic (e.g., Sigma, Splunk, KQL)
  format: z.enum(['SIGMA', 'SPLUNK', 'KQL', 'YARA', 'SNORT', 'CYPHER']),
  falsePositives: z.array(z.string()).optional(),
  references: z.array(z.string().url()).optional(),
});
export type DetectionRule = z.infer<typeof detectionRuleSchema>;

/**
 * TTP - Tactics, Techniques, and Procedures
 */
export const ttpSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  tactic: tacticEnum,
  techniqueId: z.string(), // MITRE ATT&CK ID (e.g., T1566)
  techniqueName: z.string(),
  subTechniqueId: z.string().optional(),
  subTechniqueName: z.string().optional(),
  procedures: z.array(procedureSchema),
  platforms: z.array(
    z.enum(['WINDOWS', 'LINUX', 'MACOS', 'CLOUD', 'NETWORK', 'CONTAINERS', 'ICS'])
  ),
  dataSources: z.array(z.string()),
  detectionRules: z.array(detectionRuleSchema).optional(),
  mitreReference: mitreReferenceSchema,
  severity: severityEnum,
  prevalence: z.enum(['COMMON', 'UNCOMMON', 'RARE']),
  requiredPrivileges: z.array(z.string()).optional(),
  defenses: z.array(z.string()).optional(),
  status: patternStatusEnum,
  metadata: metadataSchema,
});
export type TTP = z.infer<typeof ttpSchema>;

// ============================================================================
// INDICATOR PATTERN SCHEMAS
// ============================================================================

/**
 * Indicator Pattern - specific observable for detection
 */
export const indicatorPatternSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  type: indicatorTypeEnum,
  pattern: z.string(), // The actual pattern (regex, STIX pattern, etc.)
  patternFormat: z.enum(['REGEX', 'STIX', 'YARA', 'SIGMA', 'LITERAL']),
  confidence: confidenceEnum,
  severity: severityEnum,
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime().optional(),
  killChainPhases: z.array(tacticEnum).optional(),
  relatedTTPs: z.array(z.string().uuid()).optional(),
  relatedThreats: z.array(z.string().uuid()).optional(),
  falsePositiveRate: z.number().min(0).max(1).optional(),
  tags: z.array(z.string()).optional(),
  status: patternStatusEnum,
  metadata: metadataSchema,
});
export type IndicatorPattern = z.infer<typeof indicatorPatternSchema>;

// ============================================================================
// PATTERN TEMPLATE SCHEMAS
// ============================================================================

/**
 * Signal specification for pattern detection
 */
export const signalSpecSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  signalType: z.enum([
    'ANOMALY',
    'THRESHOLD',
    'SEQUENCE',
    'CORRELATION',
    'STATISTICAL',
    'BEHAVIORAL',
  ]),
  dataSource: z.string(),
  metric: z.string().optional(),
  baseline: z.number().optional(),
  threshold: z.number().optional(),
  operator: z.enum(['GT', 'GTE', 'LT', 'LTE', 'EQ', 'NEQ', 'BETWEEN']).optional(),
  windowMs: z.number().int().positive().optional(),
  aggregation: z.enum(['SUM', 'AVG', 'MIN', 'MAX', 'COUNT', 'STDDEV']).optional(),
});
export type SignalSpec = z.infer<typeof signalSpecSchema>;

/**
 * Pattern Template - reusable detection pattern
 */
export const patternTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  category: z.enum([
    'RECONNAISSANCE',
    'INITIAL_COMPROMISE',
    'LATERAL_MOVEMENT',
    'PERSISTENCE',
    'DATA_EXFILTRATION',
    'COMMAND_AND_CONTROL',
    'PRIVILEGE_ESCALATION',
    'DEFENSE_EVASION',
    'CREDENTIAL_THEFT',
    'IMPACT',
  ]),
  graphMotifs: z.array(graphMotifSchema),
  signals: z.array(signalSpecSchema),
  indicators: z.array(z.string().uuid()), // References to IndicatorPatterns
  ttps: z.array(z.string().uuid()), // References to TTPs
  requiredMotifMatches: z.number().int().positive().default(1),
  requiredSignalMatches: z.number().int().positive().default(1),
  confidenceFormula: z.string().optional(), // Formula for calculating match confidence
  severity: severityEnum,
  tags: z.array(z.string()).optional(),
  applicableSectors: z.array(z.string()).optional(),
  status: patternStatusEnum,
  metadata: metadataSchema,
});
export type PatternTemplate = z.infer<typeof patternTemplateSchema>;

// ============================================================================
// THREAT ARCHETYPE SCHEMAS
// ============================================================================

/**
 * Threat Archetype - high-level threat category with associated patterns
 */
export const threatArchetypeSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  aliases: z.array(z.string()).optional(),
  description: z.string(),
  summary: z.string(), // Brief summary for quick reference
  sophistication: sophisticationEnum,
  motivation: z.array(motivationEnum),
  targetSectors: z.array(z.string()),
  targetRegions: z.array(z.string()).optional(),
  typicalTTPs: z.array(z.string().uuid()), // TTP IDs
  patternTemplates: z.array(z.string().uuid()), // PatternTemplate IDs
  indicators: z.array(z.string().uuid()), // IndicatorPattern IDs
  relatedArchetypes: z.array(z.string().uuid()).optional(),
  knownActors: z.array(z.string()).optional(), // Actor names or IDs
  historicalCampaigns: z.array(z.string()).optional(),
  externalReferences: z.array(externalReferenceSchema).optional(),
  mitreReferences: z.array(mitreReferenceSchema).optional(),
  countermeasures: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      effectiveness: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    })
  ),
  riskScore: z.number().min(0).max(100),
  prevalence: z.enum(['COMMON', 'UNCOMMON', 'RARE', 'EMERGING']),
  active: z.boolean(),
  status: patternStatusEnum,
  metadata: metadataSchema,
});
export type ThreatArchetype = z.infer<typeof threatArchetypeSchema>;

// ============================================================================
// API REQUEST/RESPONSE SCHEMAS
// ============================================================================

/**
 * Pattern evaluation request from Analytics service
 */
export const patternEvaluationRequestSchema = z.object({
  patternId: z.string().uuid().optional(),
  threatArchetypeId: z.string().uuid().optional(),
  graphContext: z
    .object({
      entityIds: z.array(z.string()),
      timeRange: z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
      }),
      includeNeighbors: z.boolean().default(true),
      maxDepth: z.number().int().positive().default(3),
    })
    .optional(),
  evaluationOptions: z.object({
    maxMatches: z.number().int().positive().default(100),
    minConfidence: z.number().min(0).max(1).default(0.5),
    includePartialMatches: z.boolean().default(false),
    timeout: z.number().int().positive().default(30000),
  }),
});
export type PatternEvaluationRequest = z.infer<
  typeof patternEvaluationRequestSchema
>;

/**
 * Pattern evaluation specification - what Analytics needs to execute
 */
export const patternEvaluationSpecSchema = z.object({
  specId: z.string().uuid(),
  patternId: z.string().uuid(),
  patternName: z.string(),
  cypherQueries: z.array(
    z.object({
      id: z.string(),
      query: z.string(),
      parameters: z.record(z.string(), z.unknown()),
      purpose: z.string(),
      weight: z.number().min(0).max(1),
    })
  ),
  signalEvaluations: z.array(
    z.object({
      signalId: z.string().uuid(),
      evaluationLogic: z.string(),
      dataSource: z.string(),
      parameters: z.record(z.string(), z.unknown()),
    })
  ),
  indicatorChecks: z.array(
    z.object({
      indicatorId: z.string().uuid(),
      pattern: z.string(),
      patternFormat: z.string(),
    })
  ),
  matchCriteria: z.object({
    requiredMotifMatches: z.number().int(),
    requiredSignalMatches: z.number().int(),
    minimumConfidence: z.number(),
  }),
  generatedAt: z.string().datetime(),
});
export type PatternEvaluationSpec = z.infer<typeof patternEvaluationSpecSchema>;

/**
 * Explanation payload for UI/Copilot
 */
export const explanationPayloadSchema = z.object({
  threatId: z.string().uuid(),
  threatName: z.string(),
  summary: z.string(),
  severity: severityEnum,
  confidence: confidenceEnum,
  explanation: z.object({
    whatItIs: z.string(),
    whyItMatters: z.string(),
    howItWorks: z.string(),
    typicalTargets: z.array(z.string()),
    indicators: z.array(
      z.object({
        type: z.string(),
        description: z.string(),
        examples: z.array(z.string()),
      })
    ),
    mitigations: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
        effectiveness: z.string(),
      })
    ),
    relatedThreats: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        relationship: z.string(),
      })
    ),
    timeline: z
      .array(
        z.object({
          phase: z.string(),
          description: z.string(),
          indicators: z.array(z.string()),
        })
      )
      .optional(),
  }),
  mitreMapping: z.array(
    z.object({
      tacticName: z.string(),
      techniques: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          description: z.string(),
        })
      ),
    })
  ),
  references: z.array(
    z.object({
      title: z.string(),
      url: z.string().url(),
      source: z.string(),
    })
  ),
  generatedAt: z.string().datetime(),
});
export type ExplanationPayload = z.infer<typeof explanationPayloadSchema>;

// ============================================================================
// LIST/FILTER SCHEMAS
// ============================================================================

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});
export type Pagination = z.infer<typeof paginationSchema>;

export const threatFilterSchema = z.object({
  status: patternStatusEnum.optional(),
  severity: severityEnum.optional(),
  sophistication: sophisticationEnum.optional(),
  motivation: motivationEnum.optional(),
  sector: z.string().optional(),
  active: z.boolean().optional(),
  search: z.string().optional(),
});
export type ThreatFilter = z.infer<typeof threatFilterSchema>;

export const patternFilterSchema = z.object({
  status: patternStatusEnum.optional(),
  category: z.string().optional(),
  severity: severityEnum.optional(),
  threatArchetypeId: z.string().uuid().optional(),
  search: z.string().optional(),
});
export type PatternFilter = z.infer<typeof patternFilterSchema>;

export const ttpFilterSchema = z.object({
  status: patternStatusEnum.optional(),
  tactic: tacticEnum.optional(),
  platform: z.string().optional(),
  severity: severityEnum.optional(),
  search: z.string().optional(),
});
export type TTPFilter = z.infer<typeof ttpFilterSchema>;

// ============================================================================
// RESPONSE WRAPPERS
// ============================================================================

export const paginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int(),
      limit: z.number().int(),
      total: z.number().int(),
      totalPages: z.number().int(),
    }),
  });

export const apiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        details: z.unknown().optional(),
      })
      .optional(),
    timestamp: z.string().datetime(),
  });
