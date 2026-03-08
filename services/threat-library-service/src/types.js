"use strict";
/**
 * Threat Pattern Library - Core Type Definitions
 *
 * This module defines the complete type system for the threat pattern library,
 * including ThreatArchetypes, TTPs, PatternTemplates, and IndicatorPatterns.
 *
 * All types use Zod for runtime validation and TypeScript inference.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiResponseSchema = exports.paginatedResponseSchema = exports.ttpFilterSchema = exports.patternFilterSchema = exports.threatFilterSchema = exports.paginationSchema = exports.explanationPayloadSchema = exports.patternEvaluationSpecSchema = exports.patternEvaluationRequestSchema = exports.threatArchetypeSchema = exports.patternTemplateSchema = exports.signalSpecSchema = exports.indicatorPatternSchema = exports.ttpSchema = exports.detectionRuleSchema = exports.procedureSchema = exports.graphMotifSchema = exports.timeConstraintSchema = exports.edgeConstraintSchema = exports.nodeConstraintSchema = exports.mitreReferenceSchema = exports.externalReferenceSchema = exports.metadataSchema = exports.timeConstraintOperatorEnum = exports.nodeTypeEnum = exports.relationshipTypeEnum = exports.indicatorTypeEnum = exports.motivationEnum = exports.sophisticationEnum = exports.patternStatusEnum = exports.confidenceEnum = exports.severityEnum = exports.tacticEnum = void 0;
const zod_1 = require("zod");
// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================
/**
 * MITRE ATT&CK Tactics (Enterprise Matrix)
 */
exports.tacticEnum = zod_1.z.enum([
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
/**
 * Threat severity levels
 */
exports.severityEnum = zod_1.z.enum([
    'CRITICAL',
    'HIGH',
    'MEDIUM',
    'LOW',
    'INFORMATIONAL',
]);
/**
 * Confidence levels for pattern matches
 */
exports.confidenceEnum = zod_1.z.enum([
    'CONFIRMED',
    'HIGH',
    'MEDIUM',
    'LOW',
    'UNCONFIRMED',
]);
/**
 * Pattern lifecycle status
 */
exports.patternStatusEnum = zod_1.z.enum([
    'DRAFT',
    'ACTIVE',
    'DEPRECATED',
    'ARCHIVED',
]);
/**
 * Threat actor sophistication levels
 */
exports.sophisticationEnum = zod_1.z.enum([
    'NOVICE',
    'INTERMEDIATE',
    'ADVANCED',
    'EXPERT',
    'NATION_STATE',
]);
/**
 * Primary threat motivations
 */
exports.motivationEnum = zod_1.z.enum([
    'ESPIONAGE',
    'FINANCIAL_GAIN',
    'SABOTAGE',
    'IDEOLOGY',
    'HACKTIVISM',
    'REVENGE',
    'NOTORIETY',
    'UNKNOWN',
]);
/**
 * Indicator types for pattern matching
 */
exports.indicatorTypeEnum = zod_1.z.enum([
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
/**
 * Graph relationship types for pattern matching
 */
exports.relationshipTypeEnum = zod_1.z.enum([
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
/**
 * Node types in the threat knowledge graph
 */
exports.nodeTypeEnum = zod_1.z.enum([
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
/**
 * Time constraint operators for temporal patterns
 */
exports.timeConstraintOperatorEnum = zod_1.z.enum([
    'WITHIN',
    'AFTER',
    'BEFORE',
    'BETWEEN',
    'SEQUENCE',
]);
// ============================================================================
// CORE SCHEMAS
// ============================================================================
/**
 * Metadata schema for audit and versioning
 */
exports.metadataSchema = zod_1.z.object({
    createdAt: zod_1.z.string().datetime(),
    createdBy: zod_1.z.string(),
    updatedAt: zod_1.z.string().datetime(),
    updatedBy: zod_1.z.string(),
    version: zod_1.z.number().int().positive(),
    changelog: zod_1.z.array(zod_1.z.object({
        version: zod_1.z.number().int().positive(),
        timestamp: zod_1.z.string().datetime(),
        author: zod_1.z.string(),
        description: zod_1.z.string(),
    })),
});
/**
 * Reference to external standards (MITRE ATT&CK, STIX, etc.)
 */
exports.externalReferenceSchema = zod_1.z.object({
    source: zod_1.z.string(),
    externalId: zod_1.z.string(),
    url: zod_1.z.string().url().optional(),
    description: zod_1.z.string().optional(),
});
/**
 * MITRE ATT&CK reference
 */
exports.mitreReferenceSchema = zod_1.z.object({
    techniqueId: zod_1.z.string().regex(/^T\d{4}(\.\d{3})?$/), // T1234 or T1234.001
    techniqueName: zod_1.z.string(),
    tacticIds: zod_1.z.array(zod_1.z.string()),
    subTechniqueId: zod_1.z.string().optional(),
    mitreUrl: zod_1.z.string().url(),
});
// ============================================================================
// GRAPH PATTERN SCHEMAS
// ============================================================================
/**
 * Node constraint for pattern matching
 */
exports.nodeConstraintSchema = zod_1.z.object({
    id: zod_1.z.string(), // Logical ID within pattern
    type: exports.nodeTypeEnum,
    label: zod_1.z.string().optional(), // Human-readable label
    properties: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    requiredProperties: zod_1.z.array(zod_1.z.string()).optional(),
    propertyFilters: zod_1.z
        .array(zod_1.z.object({
        property: zod_1.z.string(),
        operator: zod_1.z.enum([
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
        value: zod_1.z.unknown(),
    }))
        .optional(),
});
/**
 * Edge constraint for pattern matching
 */
exports.edgeConstraintSchema = zod_1.z.object({
    id: zod_1.z.string(), // Logical ID within pattern
    sourceNodeId: zod_1.z.string(),
    targetNodeId: zod_1.z.string(),
    type: exports.relationshipTypeEnum,
    direction: zod_1.z.enum(['OUTGOING', 'INCOMING', 'BOTH']).default('OUTGOING'),
    properties: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    propertyFilters: zod_1.z
        .array(zod_1.z.object({
        property: zod_1.z.string(),
        operator: zod_1.z.enum([
            'EQUALS',
            'NOT_EQUALS',
            'CONTAINS',
            'GREATER_THAN',
            'LESS_THAN',
            'IN',
        ]),
        value: zod_1.z.unknown(),
    }))
        .optional(),
    minHops: zod_1.z.number().int().positive().optional(),
    maxHops: zod_1.z.number().int().positive().optional(),
});
/**
 * Time constraint for temporal pattern matching
 */
exports.timeConstraintSchema = zod_1.z.object({
    operator: exports.timeConstraintOperatorEnum,
    referenceNodeId: zod_1.z.string().optional(),
    targetNodeId: zod_1.z.string().optional(),
    durationMs: zod_1.z.number().int().positive().optional(),
    startTime: zod_1.z.string().datetime().optional(),
    endTime: zod_1.z.string().datetime().optional(),
    sequence: zod_1.z.array(zod_1.z.string()).optional(), // Node IDs in required sequence
});
/**
 * Graph motif specification - machine-readable pattern definition
 */
exports.graphMotifSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    nodes: zod_1.z.array(exports.nodeConstraintSchema).min(1),
    edges: zod_1.z.array(exports.edgeConstraintSchema),
    timeConstraints: zod_1.z.array(exports.timeConstraintSchema).optional(),
    spatialConstraints: zod_1.z
        .object({
        maxDistance: zod_1.z.number().positive().optional(),
        sameLocation: zod_1.z.array(zod_1.z.string()).optional(), // Node IDs that must be co-located
    })
        .optional(),
    aggregations: zod_1.z
        .array(zod_1.z.object({
        nodeId: zod_1.z.string(),
        property: zod_1.z.string(),
        function: zod_1.z.enum(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'DISTINCT']),
        threshold: zod_1.z.number().optional(),
    }))
        .optional(),
    cypherQuery: zod_1.z.string().optional(), // Pre-compiled Neo4j Cypher query
    weight: zod_1.z.number().min(0).max(1).default(1), // Confidence weight
});
// ============================================================================
// TTP (TACTICS, TECHNIQUES, PROCEDURES) SCHEMAS
// ============================================================================
/**
 * Procedure - specific implementation of a technique
 */
exports.procedureSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    steps: zod_1.z.array(zod_1.z.object({
        order: zod_1.z.number().int().positive(),
        action: zod_1.z.string(),
        details: zod_1.z.string().optional(),
        indicators: zod_1.z.array(zod_1.z.string()).optional(), // Indicator IDs
    })),
    tools: zod_1.z.array(zod_1.z.string()).optional(),
    prerequisites: zod_1.z.array(zod_1.z.string()).optional(),
    detectionNotes: zod_1.z.string().optional(),
});
/**
 * Detection rule specification
 */
exports.detectionRuleSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    dataSource: zod_1.z.string(),
    logic: zod_1.z.string(), // Detection logic (e.g., Sigma, Splunk, KQL)
    format: zod_1.z.enum(['SIGMA', 'SPLUNK', 'KQL', 'YARA', 'SNORT', 'CYPHER']),
    falsePositives: zod_1.z.array(zod_1.z.string()).optional(),
    references: zod_1.z.array(zod_1.z.string().url()).optional(),
});
/**
 * TTP - Tactics, Techniques, and Procedures
 */
exports.ttpSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    tactic: exports.tacticEnum,
    techniqueId: zod_1.z.string(), // MITRE ATT&CK ID (e.g., T1566)
    techniqueName: zod_1.z.string(),
    subTechniqueId: zod_1.z.string().optional(),
    subTechniqueName: zod_1.z.string().optional(),
    procedures: zod_1.z.array(exports.procedureSchema),
    platforms: zod_1.z.array(zod_1.z.enum(['WINDOWS', 'LINUX', 'MACOS', 'CLOUD', 'NETWORK', 'CONTAINERS', 'ICS'])),
    dataSources: zod_1.z.array(zod_1.z.string()),
    detectionRules: zod_1.z.array(exports.detectionRuleSchema).optional(),
    mitreReference: exports.mitreReferenceSchema,
    severity: exports.severityEnum,
    prevalence: zod_1.z.enum(['COMMON', 'UNCOMMON', 'RARE']),
    requiredPrivileges: zod_1.z.array(zod_1.z.string()).optional(),
    defenses: zod_1.z.array(zod_1.z.string()).optional(),
    status: exports.patternStatusEnum,
    metadata: exports.metadataSchema,
});
// ============================================================================
// INDICATOR PATTERN SCHEMAS
// ============================================================================
/**
 * Indicator Pattern - specific observable for detection
 */
exports.indicatorPatternSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    type: exports.indicatorTypeEnum,
    pattern: zod_1.z.string(), // The actual pattern (regex, STIX pattern, etc.)
    patternFormat: zod_1.z.enum(['REGEX', 'STIX', 'YARA', 'SIGMA', 'LITERAL']),
    confidence: exports.confidenceEnum,
    severity: exports.severityEnum,
    validFrom: zod_1.z.string().datetime(),
    validUntil: zod_1.z.string().datetime().optional(),
    killChainPhases: zod_1.z.array(exports.tacticEnum).optional(),
    relatedTTPs: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    relatedThreats: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    falsePositiveRate: zod_1.z.number().min(0).max(1).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    status: exports.patternStatusEnum,
    metadata: exports.metadataSchema,
});
// ============================================================================
// PATTERN TEMPLATE SCHEMAS
// ============================================================================
/**
 * Signal specification for pattern detection
 */
exports.signalSpecSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    signalType: zod_1.z.enum([
        'ANOMALY',
        'THRESHOLD',
        'SEQUENCE',
        'CORRELATION',
        'STATISTICAL',
        'BEHAVIORAL',
    ]),
    dataSource: zod_1.z.string(),
    metric: zod_1.z.string().optional(),
    baseline: zod_1.z.number().optional(),
    threshold: zod_1.z.number().optional(),
    operator: zod_1.z.enum(['GT', 'GTE', 'LT', 'LTE', 'EQ', 'NEQ', 'BETWEEN']).optional(),
    windowMs: zod_1.z.number().int().positive().optional(),
    aggregation: zod_1.z.enum(['SUM', 'AVG', 'MIN', 'MAX', 'COUNT', 'STDDEV']).optional(),
});
/**
 * Pattern Template - reusable detection pattern
 */
exports.patternTemplateSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    category: zod_1.z.enum([
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
    graphMotifs: zod_1.z.array(exports.graphMotifSchema),
    signals: zod_1.z.array(exports.signalSpecSchema),
    indicators: zod_1.z.array(zod_1.z.string().uuid()), // References to IndicatorPatterns
    ttps: zod_1.z.array(zod_1.z.string().uuid()), // References to TTPs
    requiredMotifMatches: zod_1.z.number().int().positive().default(1),
    requiredSignalMatches: zod_1.z.number().int().positive().default(1),
    confidenceFormula: zod_1.z.string().optional(), // Formula for calculating match confidence
    severity: exports.severityEnum,
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    applicableSectors: zod_1.z.array(zod_1.z.string()).optional(),
    status: exports.patternStatusEnum,
    metadata: exports.metadataSchema,
});
// ============================================================================
// THREAT ARCHETYPE SCHEMAS
// ============================================================================
/**
 * Threat Archetype - high-level threat category with associated patterns
 */
exports.threatArchetypeSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    aliases: zod_1.z.array(zod_1.z.string()).optional(),
    description: zod_1.z.string(),
    summary: zod_1.z.string(), // Brief summary for quick reference
    sophistication: exports.sophisticationEnum,
    motivation: zod_1.z.array(exports.motivationEnum),
    targetSectors: zod_1.z.array(zod_1.z.string()),
    targetRegions: zod_1.z.array(zod_1.z.string()).optional(),
    typicalTTPs: zod_1.z.array(zod_1.z.string().uuid()), // TTP IDs
    patternTemplates: zod_1.z.array(zod_1.z.string().uuid()), // PatternTemplate IDs
    indicators: zod_1.z.array(zod_1.z.string().uuid()), // IndicatorPattern IDs
    relatedArchetypes: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    knownActors: zod_1.z.array(zod_1.z.string()).optional(), // Actor names or IDs
    historicalCampaigns: zod_1.z.array(zod_1.z.string()).optional(),
    externalReferences: zod_1.z.array(exports.externalReferenceSchema).optional(),
    mitreReferences: zod_1.z.array(exports.mitreReferenceSchema).optional(),
    countermeasures: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        description: zod_1.z.string(),
        effectiveness: zod_1.z.enum(['HIGH', 'MEDIUM', 'LOW']),
    })),
    riskScore: zod_1.z.number().min(0).max(100),
    prevalence: zod_1.z.enum(['COMMON', 'UNCOMMON', 'RARE', 'EMERGING']),
    active: zod_1.z.boolean(),
    status: exports.patternStatusEnum,
    metadata: exports.metadataSchema,
});
// ============================================================================
// API REQUEST/RESPONSE SCHEMAS
// ============================================================================
/**
 * Pattern evaluation request from Analytics service
 */
exports.patternEvaluationRequestSchema = zod_1.z.object({
    patternId: zod_1.z.string().uuid().optional(),
    threatArchetypeId: zod_1.z.string().uuid().optional(),
    graphContext: zod_1.z
        .object({
        entityIds: zod_1.z.array(zod_1.z.string()),
        timeRange: zod_1.z.object({
            start: zod_1.z.string().datetime(),
            end: zod_1.z.string().datetime(),
        }),
        includeNeighbors: zod_1.z.boolean().default(true),
        maxDepth: zod_1.z.number().int().positive().default(3),
    })
        .optional(),
    evaluationOptions: zod_1.z.object({
        maxMatches: zod_1.z.number().int().positive().default(100),
        minConfidence: zod_1.z.number().min(0).max(1).default(0.5),
        includePartialMatches: zod_1.z.boolean().default(false),
        timeout: zod_1.z.number().int().positive().default(30000),
    }),
});
/**
 * Pattern evaluation specification - what Analytics needs to execute
 */
exports.patternEvaluationSpecSchema = zod_1.z.object({
    specId: zod_1.z.string().uuid(),
    patternId: zod_1.z.string().uuid(),
    patternName: zod_1.z.string(),
    cypherQueries: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        query: zod_1.z.string(),
        parameters: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
        purpose: zod_1.z.string(),
        weight: zod_1.z.number().min(0).max(1),
    })),
    signalEvaluations: zod_1.z.array(zod_1.z.object({
        signalId: zod_1.z.string().uuid(),
        evaluationLogic: zod_1.z.string(),
        dataSource: zod_1.z.string(),
        parameters: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    })),
    indicatorChecks: zod_1.z.array(zod_1.z.object({
        indicatorId: zod_1.z.string().uuid(),
        pattern: zod_1.z.string(),
        patternFormat: zod_1.z.string(),
    })),
    matchCriteria: zod_1.z.object({
        requiredMotifMatches: zod_1.z.number().int(),
        requiredSignalMatches: zod_1.z.number().int(),
        minimumConfidence: zod_1.z.number(),
    }),
    generatedAt: zod_1.z.string().datetime(),
});
/**
 * Explanation payload for UI/Copilot
 */
exports.explanationPayloadSchema = zod_1.z.object({
    threatId: zod_1.z.string().uuid(),
    threatName: zod_1.z.string(),
    summary: zod_1.z.string(),
    severity: exports.severityEnum,
    confidence: exports.confidenceEnum,
    explanation: zod_1.z.object({
        whatItIs: zod_1.z.string(),
        whyItMatters: zod_1.z.string(),
        howItWorks: zod_1.z.string(),
        typicalTargets: zod_1.z.array(zod_1.z.string()),
        indicators: zod_1.z.array(zod_1.z.object({
            type: zod_1.z.string(),
            description: zod_1.z.string(),
            examples: zod_1.z.array(zod_1.z.string()),
        })),
        mitigations: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            description: zod_1.z.string(),
            effectiveness: zod_1.z.string(),
        })),
        relatedThreats: zod_1.z.array(zod_1.z.object({
            id: zod_1.z.string(),
            name: zod_1.z.string(),
            relationship: zod_1.z.string(),
        })),
        timeline: zod_1.z
            .array(zod_1.z.object({
            phase: zod_1.z.string(),
            description: zod_1.z.string(),
            indicators: zod_1.z.array(zod_1.z.string()),
        }))
            .optional(),
    }),
    mitreMapping: zod_1.z.array(zod_1.z.object({
        tacticName: zod_1.z.string(),
        techniques: zod_1.z.array(zod_1.z.object({
            id: zod_1.z.string(),
            name: zod_1.z.string(),
            description: zod_1.z.string(),
        })),
    })),
    references: zod_1.z.array(zod_1.z.object({
        title: zod_1.z.string(),
        url: zod_1.z.string().url(),
        source: zod_1.z.string(),
    })),
    generatedAt: zod_1.z.string().datetime(),
});
// ============================================================================
// LIST/FILTER SCHEMAS
// ============================================================================
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.number().int().positive().default(1),
    limit: zod_1.z.number().int().positive().max(100).default(20),
});
exports.threatFilterSchema = zod_1.z.object({
    status: exports.patternStatusEnum.optional(),
    severity: exports.severityEnum.optional(),
    sophistication: exports.sophisticationEnum.optional(),
    motivation: exports.motivationEnum.optional(),
    sector: zod_1.z.string().optional(),
    active: zod_1.z.boolean().optional(),
    search: zod_1.z.string().optional(),
});
exports.patternFilterSchema = zod_1.z.object({
    status: exports.patternStatusEnum.optional(),
    category: zod_1.z.string().optional(),
    severity: exports.severityEnum.optional(),
    threatArchetypeId: zod_1.z.string().uuid().optional(),
    search: zod_1.z.string().optional(),
});
exports.ttpFilterSchema = zod_1.z.object({
    status: exports.patternStatusEnum.optional(),
    tactic: exports.tacticEnum.optional(),
    platform: zod_1.z.string().optional(),
    severity: exports.severityEnum.optional(),
    search: zod_1.z.string().optional(),
});
// ============================================================================
// RESPONSE WRAPPERS
// ============================================================================
const paginatedResponseSchema = (itemSchema) => zod_1.z.object({
    items: zod_1.z.array(itemSchema),
    pagination: zod_1.z.object({
        page: zod_1.z.number().int(),
        limit: zod_1.z.number().int(),
        total: zod_1.z.number().int(),
        totalPages: zod_1.z.number().int(),
    }),
});
exports.paginatedResponseSchema = paginatedResponseSchema;
const apiResponseSchema = (dataSchema) => zod_1.z.object({
    success: zod_1.z.boolean(),
    data: dataSchema.optional(),
    error: zod_1.z
        .object({
        code: zod_1.z.string(),
        message: zod_1.z.string(),
        details: zod_1.z.unknown().optional(),
    })
        .optional(),
    timestamp: zod_1.z.string().datetime(),
});
exports.apiResponseSchema = apiResponseSchema;
