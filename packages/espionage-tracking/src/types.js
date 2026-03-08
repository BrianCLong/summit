"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.indicatorSchema = exports.indicatorTypeSchema = exports.supportInfrastructureSchema = exports.infrastructureTypeSchema = exports.analyticalProductSchema = exports.analyticalProductTypeSchema = exports.counterIntelOperationSchema = exports.counterIntelOperationTypeSchema = exports.technicalOperationSchema = exports.technicalCollectionTypeSchema = exports.recruitmentOperationSchema = exports.recruitmentMethodSchema = exports.espionageOperationSchema = exports.operationStatusSchema = exports.operationTypeSchema = exports.intelligenceOfficerSchema = exports.agentRoleSchema = exports.coverTypeSchema = exports.intelligenceAgencySchema = exports.intelligenceAgencyTypeSchema = exports.compartmentSchema = exports.classificationLevelSchema = void 0;
const zod_1 = require("zod");
/**
 * Core Espionage Tracking Types
 *
 * This package provides comprehensive types for tracking espionage activities,
 * foreign intelligence operations, and counterintelligence operations.
 */
// ============================================================================
// CLASSIFICATION AND SECURITY LEVELS
// ============================================================================
exports.classificationLevelSchema = zod_1.z.enum([
    'UNCLASSIFIED',
    'CONFIDENTIAL',
    'SECRET',
    'TOP_SECRET',
    'TOP_SECRET_SCI',
    'SAP', // Special Access Program
]);
exports.compartmentSchema = zod_1.z.object({
    code: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
});
// ============================================================================
// INTELLIGENCE AGENCIES AND ORGANIZATIONS
// ============================================================================
exports.intelligenceAgencyTypeSchema = zod_1.z.enum([
    'FOREIGN_INTELLIGENCE',
    'DOMESTIC_INTELLIGENCE',
    'MILITARY_INTELLIGENCE',
    'SIGNALS_INTELLIGENCE',
    'CYBER_INTELLIGENCE',
    'COUNTERINTELLIGENCE',
    'TECHNICAL_INTELLIGENCE',
    'GEOSPATIAL_INTELLIGENCE',
    'HUMINT', // Human Intelligence
    'OSINT', // Open Source Intelligence
]);
exports.intelligenceAgencySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    country: zod_1.z.string(),
    agencyType: exports.intelligenceAgencyTypeSchema,
    aliases: zod_1.z.array(zod_1.z.string()).default([]),
    foundedDate: zod_1.z.string().datetime().optional(),
    headquarters: zod_1.z.string().optional(),
    estimatedBudget: zod_1.z.number().optional(),
    estimatedPersonnel: zod_1.z.number().optional(),
    parent: zod_1.z.string().uuid().optional(),
    subordinateAgencies: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    capabilities: zod_1.z.array(zod_1.z.string()).default([]),
    priorityTargets: zod_1.z.array(zod_1.z.string()).default([]),
    cooperationPartners: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    adversaries: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    classification: exports.classificationLevelSchema,
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
// ============================================================================
// INTELLIGENCE OFFICERS AND AGENTS
// ============================================================================
exports.coverTypeSchema = zod_1.z.enum([
    'DIPLOMATIC', // Official diplomatic cover
    'NOC', // Non-Official Cover
    'COMMERCIAL', // Business cover
    'ACADEMIC', // Academic/research cover
    'JOURNALIST', // Media cover
    'NGO', // Non-governmental organization
    'CULTURAL', // Cultural exchange
    'TECHNICAL', // Technical expert
    'MILITARY', // Military attaché
    'UNDECLARED', // No official cover
]);
exports.agentRoleSchema = zod_1.z.enum([
    'CASE_OFFICER', // Handles agents
    'STATION_CHIEF', // Leads station
    'DEPUTY_CHIEF', // Deputy station chief
    'ANALYST', // Intelligence analyst
    'TECHNICAL_OFFICER', // Technical specialist
    'TARGETER', // Target identification
    'RECRUITER', // Recruitment specialist
    'HANDLER', // Agent handler
    'ASSET', // Foreign asset
    'SUPPORT', // Support personnel
    'UNKNOWN', // Role not identified
]);
exports.intelligenceOfficerSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    realName: zod_1.z.string().optional(),
    aliases: zod_1.z.array(zod_1.z.string()).default([]),
    coverIdentities: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        coverType: exports.coverTypeSchema,
        organization: zod_1.z.string(),
        position: zod_1.z.string(),
        location: zod_1.z.string(),
        validFrom: zod_1.z.string().datetime(),
        validTo: zod_1.z.string().datetime().optional(),
        compromised: zod_1.z.boolean().default(false),
        compromisedDate: zod_1.z.string().datetime().optional(),
    })).default([]),
    agency: zod_1.z.string().uuid(),
    role: exports.agentRoleSchema,
    rank: zod_1.z.string().optional(),
    nationality: zod_1.z.string(),
    dateOfBirth: zod_1.z.string().datetime().optional(),
    placeOfBirth: zod_1.z.string().optional(),
    languages: zod_1.z.array(zod_1.z.string()).default([]),
    education: zod_1.z.array(zod_1.z.object({
        institution: zod_1.z.string(),
        degree: zod_1.z.string(),
        fieldOfStudy: zod_1.z.string(),
        graduationYear: zod_1.z.number(),
    })).default([]),
    postings: zod_1.z.array(zod_1.z.object({
        location: zod_1.z.string(),
        position: zod_1.z.string(),
        startDate: zod_1.z.string().datetime(),
        endDate: zod_1.z.string().datetime().optional(),
        coverOrganization: zod_1.z.string().optional(),
    })).default([]),
    knownAssociates: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    handlers: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    assets: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    operationalStatus: zod_1.z.enum(['ACTIVE', 'INACTIVE', 'COMPROMISED', 'DEFECTED', 'DECEASED', 'RETIRED']),
    specialties: zod_1.z.array(zod_1.z.string()).default([]),
    knownOperations: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    travelHistory: zod_1.z.array(zod_1.z.object({
        destination: zod_1.z.string(),
        arrivalDate: zod_1.z.string().datetime(),
        departureDate: zod_1.z.string().datetime().optional(),
        purpose: zod_1.z.string().optional(),
        alias: zod_1.z.string().optional(),
    })).default([]),
    communicationMethods: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        identifier: zod_1.z.string(),
        encrypted: zod_1.z.boolean(),
        lastUsed: zod_1.z.string().datetime().optional(),
    })).default([]),
    surveillanceHistory: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.string().datetime(),
        location: zod_1.z.string(),
        activity: zod_1.z.string(),
        confidence: zod_1.z.number().min(0).max(1),
    })).default([]),
    classification: exports.classificationLevelSchema,
    compartments: zod_1.z.array(exports.compartmentSchema).default([]),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
// ============================================================================
// ESPIONAGE OPERATIONS
// ============================================================================
exports.operationTypeSchema = zod_1.z.enum([
    'COLLECTION', // Intelligence collection
    'RECRUITMENT', // Agent recruitment
    'INFLUENCE', // Influence operation
    'COVERT_ACTION', // Covert action
    'TECHNICAL_COLLECTION', // Technical intelligence
    'CYBER_ESPIONAGE', // Cyber operations
    'COUNTERINTELLIGENCE', // CI operation
    'DECEPTION', // Deception operation
    'SABOTAGE', // Sabotage operation
    'EXFILTRATION', // Asset exfiltration
    'SURVEILLANCE', // Surveillance operation
    'RECONNAISSANCE', // Reconnaissance
]);
exports.operationStatusSchema = zod_1.z.enum([
    'PLANNING',
    'ACTIVE',
    'ONGOING',
    'PAUSED',
    'COMPLETED',
    'COMPROMISED',
    'CANCELLED',
    'SUSPENDED',
]);
exports.espionageOperationSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    codename: zod_1.z.string(),
    operationType: exports.operationTypeSchema,
    status: exports.operationStatusSchema,
    sponsoringAgency: zod_1.z.string().uuid(),
    targetCountry: zod_1.z.string(),
    targetOrganization: zod_1.z.string().optional(),
    targetSector: zod_1.z.string().optional(),
    objectives: zod_1.z.array(zod_1.z.string()).default([]),
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime().optional(),
    operationalArea: zod_1.z.string(),
    primaryOfficers: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    supportingPersonnel: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    assets: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    targets: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(['PERSON', 'ORGANIZATION', 'FACILITY', 'SYSTEM', 'NETWORK', 'TECHNOLOGY']),
        identifier: zod_1.z.string(),
        priority: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
        status: zod_1.z.enum(['IDENTIFIED', 'UNDER_SURVEILLANCE', 'ENGAGED', 'RECRUITED', 'COMPROMISED', 'ABANDONED']),
    })).default([]),
    tradecraft: zod_1.z.array(zod_1.z.object({
        technique: zod_1.z.string(),
        description: zod_1.z.string(),
        frequency: zod_1.z.string().optional(),
    })).default([]),
    infrastructure: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(['SAFE_HOUSE', 'DEAD_DROP', 'COVER_BUSINESS', 'COMMUNICATION_NODE', 'TECHNICAL_FACILITY']),
        location: zod_1.z.string(),
        purpose: zod_1.z.string(),
        active: zod_1.z.boolean(),
    })).default([]),
    collectionMethods: zod_1.z.array(zod_1.z.string()).default([]),
    successMetrics: zod_1.z.array(zod_1.z.object({
        metric: zod_1.z.string(),
        target: zod_1.z.string(),
        achieved: zod_1.z.string().optional(),
    })).default([]),
    risks: zod_1.z.array(zod_1.z.object({
        risk: zod_1.z.string(),
        severity: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
        mitigation: zod_1.z.string().optional(),
    })).default([]),
    incidents: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.string().datetime(),
        type: zod_1.z.string(),
        description: zod_1.z.string(),
        impact: zod_1.z.string(),
        response: zod_1.z.string().optional(),
    })).default([]),
    relatedOperations: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    classification: exports.classificationLevelSchema,
    compartments: zod_1.z.array(exports.compartmentSchema).default([]),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
// ============================================================================
// RECRUITMENT AND INFLUENCE
// ============================================================================
exports.recruitmentMethodSchema = zod_1.z.enum([
    'IDEOLOGICAL', // Based on ideology
    'FINANCIAL', // Money/financial incentives
    'COERCION', // Blackmail/threats
    'COMPROMISE', // Compromising material
    'EGO', // Appeal to ego/vanity
    'REVENGE', // Desire for revenge
    'EXCITEMENT', // Thrill-seeking
    'PATRIOTISM', // Patriotic appeal
    'FALSE_FLAG', // False flag recruitment
    'HONEY_TRAP', // Romantic/sexual approach
]);
exports.recruitmentOperationSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    targetId: zod_1.z.string().uuid(),
    targetName: zod_1.z.string(),
    targetPosition: zod_1.z.string().optional(),
    targetOrganization: zod_1.z.string().optional(),
    targetValue: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    recruitmentMethod: exports.recruitmentMethodSchema,
    recruitingOfficer: zod_1.z.string().uuid(),
    supportTeam: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    status: zod_1.z.enum([
        'IDENTIFIED',
        'ASSESSING',
        'DEVELOPING',
        'APPROACHING',
        'CULTIVATING',
        'PITCHING',
        'RECRUITED',
        'REJECTED',
        'COMPROMISED',
        'TERMINATED',
    ]),
    vulnerabilities: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        description: zod_1.z.string(),
        exploitability: zod_1.z.number().min(0).max(1),
    })).default([]),
    accessLevel: zod_1.z.object({
        information: zod_1.z.array(zod_1.z.string()),
        facilities: zod_1.z.array(zod_1.z.string()),
        systems: zod_1.z.array(zod_1.z.string()),
        personnel: zod_1.z.array(zod_1.z.string()),
    }).optional(),
    timeline: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.string().datetime(),
        event: zod_1.z.string(),
        outcome: zod_1.z.string().optional(),
    })).default([]),
    meetings: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.string().datetime(),
        location: zod_1.z.string(),
        participants: zod_1.z.array(zod_1.z.string().uuid()),
        purpose: zod_1.z.string(),
        outcome: zod_1.z.string(),
    })).default([]),
    financialInducements: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.string().datetime(),
        amount: zod_1.z.number(),
        currency: zod_1.z.string(),
        purpose: zod_1.z.string(),
    })).default([]),
    classification: exports.classificationLevelSchema,
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
// ============================================================================
// TECHNICAL INTELLIGENCE
// ============================================================================
exports.technicalCollectionTypeSchema = zod_1.z.enum([
    'SIGINT', // Signals Intelligence
    'COMINT', // Communications Intelligence
    'ELINT', // Electronic Intelligence
    'IMINT', // Imagery Intelligence
    'MASINT', // Measurement and Signature Intelligence
    'TECHINT', // Technical Intelligence
    'CYBER', // Cyber Intelligence
    'ACOUSTIC', // Acoustic Intelligence
    'RADIATION', // Radiation Intelligence
    'GEOINT', // Geospatial Intelligence
]);
exports.technicalOperationSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    operationName: zod_1.z.string(),
    collectionType: exports.technicalCollectionTypeSchema,
    targetSystems: zod_1.z.array(zod_1.z.string()).default([]),
    targetFrequencies: zod_1.z.array(zod_1.z.object({
        frequency: zod_1.z.string(),
        band: zod_1.z.string(),
        purpose: zod_1.z.string(),
    })).default([]),
    collectionPlatforms: zod_1.z.array(zod_1.z.object({
        platform: zod_1.z.string(),
        location: zod_1.z.string(),
        capabilities: zod_1.z.array(zod_1.z.string()),
    })).default([]),
    status: exports.operationStatusSchema,
    sponsoringAgency: zod_1.z.string().uuid(),
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime().optional(),
    collectedData: zod_1.z.array(zod_1.z.object({
        timestamp: zod_1.z.string().datetime(),
        dataType: zod_1.z.string(),
        volume: zod_1.z.string(),
        quality: zod_1.z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']),
        classification: exports.classificationLevelSchema,
    })).default([]),
    technicalCapabilities: zod_1.z.array(zod_1.z.object({
        capability: zod_1.z.string(),
        description: zod_1.z.string(),
        effectiveness: zod_1.z.number().min(0).max(1),
    })).default([]),
    counterMeasures: zod_1.z.array(zod_1.z.object({
        measure: zod_1.z.string(),
        effectiveness: zod_1.z.string(),
        implementedBy: zod_1.z.string(),
    })).default([]),
    classification: exports.classificationLevelSchema,
    compartments: zod_1.z.array(exports.compartmentSchema).default([]),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
// ============================================================================
// COUNTERINTELLIGENCE
// ============================================================================
exports.counterIntelOperationTypeSchema = zod_1.z.enum([
    'PENETRATION_DETECTION', // Detecting penetrations
    'DOUBLE_AGENT', // Running double agents
    'DECEPTION', // Deception operations
    'MOLE_HUNT', // Finding insider threats
    'DEFECTOR_VETTING', // Vetting defectors
    'TECHNICAL_PENETRATION', // Technical CI
    'INFORMATION_OPS', // Information operations
    'PROVOCATION', // Provocation operations
    'CONTROLLED_DISCLOSURE', // Controlled leaks
    'SURVEILLANCE_DETECTION', // Detecting surveillance
]);
exports.counterIntelOperationSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    operationName: zod_1.z.string(),
    operationType: exports.counterIntelOperationTypeSchema,
    status: exports.operationStatusSchema,
    targetAgency: zod_1.z.string().uuid().optional(),
    targetOperation: zod_1.z.string().uuid().optional(),
    suspectedPenetrations: zod_1.z.array(zod_1.z.object({
        targetId: zod_1.z.string().uuid(),
        suspicionLevel: zod_1.z.enum(['CONFIRMED', 'HIGH', 'MEDIUM', 'LOW', 'DISMISSED']),
        evidence: zod_1.z.array(zod_1.z.string()),
        investigationStatus: zod_1.z.string(),
    })).default([]),
    doubleAgents: zod_1.z.array(zod_1.z.object({
        agentId: zod_1.z.string().uuid(),
        handler: zod_1.z.string().uuid(),
        targetAgency: zod_1.z.string().uuid(),
        controlLevel: zod_1.z.enum(['FULL', 'PARTIAL', 'MINIMAL', 'UNCERTAIN']),
        productionValue: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    })).default([]),
    deceptionPlan: zod_1.z.object({
        objective: zod_1.z.string(),
        targetBelief: zod_1.z.string(),
        channels: zod_1.z.array(zod_1.z.string()),
        indicators: zod_1.z.array(zod_1.z.string()),
        measureOfEffectiveness: zod_1.z.array(zod_1.z.string()),
    }).optional(),
    investigativeFindings: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.string().datetime(),
        finding: zod_1.z.string(),
        significance: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
        actionRequired: zod_1.z.string().optional(),
    })).default([]),
    riskAssessment: zod_1.z.object({
        currentThreatLevel: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL']),
        vulnerabilities: zod_1.z.array(zod_1.z.string()),
        recommendations: zod_1.z.array(zod_1.z.string()),
    }).optional(),
    classification: exports.classificationLevelSchema,
    compartments: zod_1.z.array(exports.compartmentSchema).default([]),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
// ============================================================================
// ANALYTICAL PRODUCTS
// ============================================================================
exports.analyticalProductTypeSchema = zod_1.z.enum([
    'THREAT_ASSESSMENT',
    'CAPABILITY_EVALUATION',
    'OPERATIONAL_ANALYSIS',
    'PATTERN_ANALYSIS',
    'PREDICTIVE_INTELLIGENCE',
    'WARNING_INTELLIGENCE',
    'STRATEGIC_ASSESSMENT',
    'TACTICAL_INTELLIGENCE',
    'TARGET_PACKAGE',
    'COLLECTION_REQUIREMENTS',
]);
exports.analyticalProductSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    title: zod_1.z.string(),
    productType: exports.analyticalProductTypeSchema,
    summary: zod_1.z.string(),
    keyFindings: zod_1.z.array(zod_1.z.string()).default([]),
    analysis: zod_1.z.string(),
    conclusions: zod_1.z.array(zod_1.z.string()).default([]),
    recommendations: zod_1.z.array(zod_1.z.string()).default([]),
    confidence: zod_1.z.enum(['HIGH', 'MEDIUM', 'LOW']),
    sources: zod_1.z.array(zod_1.z.object({
        sourceId: zod_1.z.string(),
        sourceType: zod_1.z.string(),
        reliability: zod_1.z.enum(['A', 'B', 'C', 'D', 'E', 'F']),
        credibility: zod_1.z.enum(['1', '2', '3', '4', '5', '6']),
    })).default([]),
    relatedOperations: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    relatedAgencies: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    relatedOfficers: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    dissemination: zod_1.z.array(zod_1.z.object({
        recipient: zod_1.z.string(),
        date: zod_1.z.string().datetime(),
        method: zod_1.z.string(),
    })).default([]),
    validityPeriod: zod_1.z.object({
        from: zod_1.z.string().datetime(),
        to: zod_1.z.string().datetime().optional(),
    }).optional(),
    classification: exports.classificationLevelSchema,
    compartments: zod_1.z.array(exports.compartmentSchema).default([]),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    createdBy: zod_1.z.string().uuid(),
    tenantId: zod_1.z.string(),
});
// ============================================================================
// SUPPORT INFRASTRUCTURE
// ============================================================================
exports.infrastructureTypeSchema = zod_1.z.enum([
    'SAFE_HOUSE',
    'DEAD_DROP',
    'MEETING_LOCATION',
    'COMMUNICATION_NODE',
    'COVER_BUSINESS',
    'TECHNICAL_FACILITY',
    'TRAINING_FACILITY',
    'DOCUMENT_FACILITY',
    'FINANCIAL_NODE',
    'EXFILTRATION_ROUTE',
]);
exports.supportInfrastructureSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    infrastructureType: exports.infrastructureTypeSchema,
    location: zod_1.z.string(),
    coordinates: zod_1.z.object({
        latitude: zod_1.z.number(),
        longitude: zod_1.z.number(),
    }).optional(),
    address: zod_1.z.string().optional(),
    coverName: zod_1.z.string().optional(),
    operatingAgency: zod_1.z.string().uuid(),
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE', 'COMPROMISED', 'ABANDONED', 'PLANNED']),
    capabilities: zod_1.z.array(zod_1.z.string()).default([]),
    capacity: zod_1.z.string().optional(),
    activeOperations: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    authorizedPersonnel: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    securityMeasures: zod_1.z.array(zod_1.z.object({
        measure: zod_1.z.string(),
        description: zod_1.z.string(),
        effectiveness: zod_1.z.enum(['EXCELLENT', 'GOOD', 'ADEQUATE', 'POOR']),
    })).default([]),
    accessProtocols: zod_1.z.array(zod_1.z.string()).default([]),
    usageHistory: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.string().datetime(),
        purpose: zod_1.z.string(),
        personnel: zod_1.z.array(zod_1.z.string().uuid()),
        outcome: zod_1.z.string().optional(),
    })).default([]),
    compromiseRisk: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL']),
    lastInspection: zod_1.z.string().datetime().optional(),
    classification: exports.classificationLevelSchema,
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
// ============================================================================
// INDICATORS AND WARNINGS
// ============================================================================
exports.indicatorTypeSchema = zod_1.z.enum([
    'COLLECTION_ACTIVITY',
    'SURVEILLANCE',
    'RECRUITMENT_APPROACH',
    'TECHNICAL_PENETRATION',
    'CYBER_INTRUSION',
    'UNUSUAL_CONTACT',
    'TRAVEL_PATTERN',
    'FINANCIAL_ANOMALY',
    'COMMUNICATION_ANOMALY',
    'BEHAVIORAL_CHANGE',
]);
exports.indicatorSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    indicatorType: exports.indicatorTypeSchema,
    description: zod_1.z.string(),
    observedAt: zod_1.z.string().datetime(),
    location: zod_1.z.string().optional(),
    associatedAgency: zod_1.z.string().uuid().optional(),
    associatedOfficers: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    associatedOperation: zod_1.z.string().uuid().optional(),
    confidence: zod_1.z.number().min(0).max(1),
    severity: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']),
    status: zod_1.z.enum(['NEW', 'INVESTIGATING', 'CONFIRMED', 'FALSE_POSITIVE', 'RESOLVED']),
    evidence: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        description: zod_1.z.string(),
        source: zod_1.z.string(),
        timestamp: zod_1.z.string().datetime(),
    })).default([]),
    relatedIndicators: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    responseActions: zod_1.z.array(zod_1.z.object({
        action: zod_1.z.string(),
        responsibleParty: zod_1.z.string(),
        status: zod_1.z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
        completedAt: zod_1.z.string().datetime().optional(),
    })).default([]),
    classification: exports.classificationLevelSchema,
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
