"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgencyTracker = exports.doctrineSchema = exports.historicalOperationSchema = exports.cooperationRelationshipSchema = exports.cooperationTypeSchema = exports.capabilityAssessmentSchema = exports.capabilityTypeSchema = exports.operationalPrioritySchema = exports.leadershipProfileSchema = exports.organizationalUnitSchema = void 0;
const zod_1 = require("zod");
const espionage_tracking_1 = require("@intelgraph/espionage-tracking");
/**
 * Foreign Intelligence Service Tracking
 *
 * Comprehensive tracking and analysis of foreign intelligence services,
 * organizational structures, capabilities, and operational priorities.
 */
// ============================================================================
// ORGANIZATIONAL STRUCTURE
// ============================================================================
exports.organizationalUnitSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    agencyId: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    type: zod_1.z.enum([
        'HEADQUARTERS',
        'DIVISION',
        'DEPARTMENT',
        'DIRECTORATE',
        'BUREAU',
        'STATION',
        'FIELD_OFFICE',
        'REGIONAL_CENTER',
        'TECHNICAL_CENTER',
        'TRAINING_FACILITY',
    ]),
    parentUnit: zod_1.z.string().uuid().optional(),
    subordinateUnits: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    primaryMission: zod_1.z.string(),
    secondaryMissions: zod_1.z.array(zod_1.z.string()).default([]),
    leadership: zod_1.z.array(zod_1.z.object({
        personId: zod_1.z.string().uuid(),
        position: zod_1.z.string(),
        startDate: zod_1.z.string().datetime(),
        endDate: zod_1.z.string().datetime().optional(),
    })).default([]),
    estimatedPersonnel: zod_1.z.number().optional(),
    budget: zod_1.z.object({
        amount: zod_1.z.number(),
        currency: zod_1.z.string(),
        fiscalYear: zod_1.z.number(),
    }).optional(),
    location: zod_1.z.string().optional(),
    capabilities: zod_1.z.array(zod_1.z.string()).default([]),
    knownOperations: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
// ============================================================================
// LEADERSHIP TRACKING
// ============================================================================
exports.leadershipProfileSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    personId: zod_1.z.string().uuid(),
    agencyId: zod_1.z.string().uuid(),
    currentPosition: zod_1.z.string(),
    rank: zod_1.z.string().optional(),
    biography: zod_1.z.string().optional(),
    careerHistory: zod_1.z.array(zod_1.z.object({
        position: zod_1.z.string(),
        organization: zod_1.z.string(),
        startDate: zod_1.z.string().datetime(),
        endDate: zod_1.z.string().datetime().optional(),
        achievements: zod_1.z.array(zod_1.z.string()).default([]),
    })).default([]),
    education: zod_1.z.array(zod_1.z.object({
        institution: zod_1.z.string(),
        degree: zod_1.z.string(),
        fieldOfStudy: zod_1.z.string(),
        graduationYear: zod_1.z.number(),
    })).default([]),
    expertise: zod_1.z.array(zod_1.z.string()).default([]),
    languages: zod_1.z.array(zod_1.z.string()).default([]),
    knownAssociates: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    publicStatements: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.string().datetime(),
        venue: zod_1.z.string(),
        topic: zod_1.z.string(),
        summary: zod_1.z.string(),
        significance: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    })).default([]),
    assessedPriorities: zod_1.z.array(zod_1.z.string()).default([]),
    leadershipStyle: zod_1.z.string().optional(),
    politicalAffiliations: zod_1.z.array(zod_1.z.string()).default([]),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
// ============================================================================
// OPERATIONAL PRIORITIES
// ============================================================================
exports.operationalPrioritySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    agencyId: zod_1.z.string().uuid(),
    priority: zod_1.z.string(),
    priorityLevel: zod_1.z.enum(['PRIMARY', 'SECONDARY', 'TERTIARY']),
    targetCountries: zod_1.z.array(zod_1.z.string()).default([]),
    targetSectors: zod_1.z.array(zod_1.z.string()).default([]),
    targetTechnologies: zod_1.z.array(zod_1.z.string()).default([]),
    rationale: zod_1.z.string(),
    indicators: zod_1.z.array(zod_1.z.object({
        indicator: zod_1.z.string(),
        confidence: zod_1.z.number().min(0).max(1),
        evidence: zod_1.z.array(zod_1.z.string()),
    })).default([]),
    resourceAllocation: zod_1.z.object({
        personnel: zod_1.z.number().optional(),
        budget: zod_1.z.number().optional(),
        facilities: zod_1.z.array(zod_1.z.string()).default([]),
    }).optional(),
    successMetrics: zod_1.z.array(zod_1.z.string()).default([]),
    relatedOperations: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    validFrom: zod_1.z.string().datetime(),
    validTo: zod_1.z.string().datetime().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
// ============================================================================
// CAPABILITIES ASSESSMENT
// ============================================================================
exports.capabilityTypeSchema = zod_1.z.enum([
    'HUMINT',
    'SIGINT',
    'IMINT',
    'MASINT',
    'CYBER',
    'TECHNICAL',
    'COVERT_ACTION',
    'COUNTERINTELLIGENCE',
    'ANALYSIS',
    'TARGETING',
]);
exports.capabilityAssessmentSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    agencyId: zod_1.z.string().uuid(),
    capabilityType: exports.capabilityTypeSchema,
    capabilityName: zod_1.z.string(),
    maturityLevel: zod_1.z.enum(['ADVANCED', 'DEVELOPING', 'NASCENT', 'UNKNOWN']),
    effectiveness: zod_1.z.enum(['VERY_HIGH', 'HIGH', 'MODERATE', 'LOW', 'VERY_LOW']),
    scope: zod_1.z.enum(['GLOBAL', 'REGIONAL', 'LIMITED', 'MINIMAL']),
    technicalSophistication: zod_1.z.enum(['CUTTING_EDGE', 'ADVANCED', 'MODERATE', 'BASIC']),
    platforms: zod_1.z.array(zod_1.z.object({
        platform: zod_1.z.string(),
        type: zod_1.z.string(),
        capabilities: zod_1.z.array(zod_1.z.string()),
        limitations: zod_1.z.array(zod_1.z.string()).default([]),
    })).default([]),
    knownSystems: zod_1.z.array(zod_1.z.object({
        system: zod_1.z.string(),
        purpose: zod_1.z.string(),
        capabilities: zod_1.z.array(zod_1.z.string()),
        deploymentStatus: zod_1.z.enum(['OPERATIONAL', 'TESTING', 'DEVELOPMENT', 'RETIRED']),
    })).default([]),
    tradecraftSignatures: zod_1.z.array(zod_1.z.object({
        signature: zod_1.z.string(),
        description: zod_1.z.string(),
        frequency: zod_1.z.string(),
    })).default([]),
    knownLimitations: zod_1.z.array(zod_1.z.string()).default([]),
    developmentTrends: zod_1.z.array(zod_1.z.object({
        trend: zod_1.z.string(),
        significance: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
        timeline: zod_1.z.string(),
    })).default([]),
    demonstratedCapabilities: zod_1.z.array(zod_1.z.object({
        operation: zod_1.z.string(),
        date: zod_1.z.string().datetime(),
        description: zod_1.z.string(),
        significance: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    })).default([]),
    assessmentConfidence: zod_1.z.enum(['HIGH', 'MEDIUM', 'LOW']),
    lastUpdated: zod_1.z.string().datetime(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
// ============================================================================
// COOPERATION AND LIAISON
// ============================================================================
exports.cooperationTypeSchema = zod_1.z.enum([
    'FORMAL_ALLIANCE',
    'BILATERAL_AGREEMENT',
    'MULTILATERAL_AGREEMENT',
    'INTELLIGENCE_SHARING',
    'JOINT_OPERATIONS',
    'TRAINING_EXCHANGE',
    'TECHNICAL_COOPERATION',
    'AD_HOC_COOPERATION',
    'COMPETITIVE',
    'ADVERSARIAL',
]);
exports.cooperationRelationshipSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    agency1Id: zod_1.z.string().uuid(),
    agency2Id: zod_1.z.string().uuid(),
    cooperationType: exports.cooperationTypeSchema,
    formalAgreement: zod_1.z.boolean().default(false),
    agreementDate: zod_1.z.string().datetime().optional(),
    agreementDetails: zod_1.z.string().optional(),
    scopeOfCooperation: zod_1.z.array(zod_1.z.string()).default([]),
    informationSharing: zod_1.z.object({
        level: zod_1.z.enum(['EXTENSIVE', 'SUBSTANTIAL', 'LIMITED', 'MINIMAL', 'NONE']),
        categories: zod_1.z.array(zod_1.z.string()).default([]),
        restrictions: zod_1.z.array(zod_1.z.string()).default([]),
    }).optional(),
    jointOperations: zod_1.z.array(zod_1.z.object({
        operationId: zod_1.z.string().uuid(),
        operationType: zod_1.z.string(),
        startDate: zod_1.z.string().datetime(),
        endDate: zod_1.z.string().datetime().optional(),
        outcome: zod_1.z.string().optional(),
    })).default([]),
    liaisonOfficers: zod_1.z.array(zod_1.z.object({
        officerId: zod_1.z.string().uuid(),
        postingAgency: zod_1.z.string().uuid(),
        hostAgency: zod_1.z.string().uuid(),
        startDate: zod_1.z.string().datetime(),
        endDate: zod_1.z.string().datetime().optional(),
    })).default([]),
    trustLevel: zod_1.z.enum(['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'VERY_LOW']),
    effectiveness: zod_1.z.enum(['EXCELLENT', 'GOOD', 'ADEQUATE', 'POOR', 'INEFFECTIVE']),
    tensions: zod_1.z.array(zod_1.z.object({
        issue: zod_1.z.string(),
        date: zod_1.z.string().datetime(),
        resolution: zod_1.z.string().optional(),
    })).default([]),
    status: zod_1.z.enum(['ACTIVE', 'SUSPENDED', 'TERMINATED', 'RENEGOTIATING']),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
// ============================================================================
// HISTORICAL OPERATIONS
// ============================================================================
exports.historicalOperationSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    agencyId: zod_1.z.string().uuid(),
    operationName: zod_1.z.string(),
    codename: zod_1.z.string().optional(),
    operationType: zod_1.z.string(),
    timeframe: zod_1.z.object({
        startDate: zod_1.z.string().datetime(),
        endDate: zod_1.z.string().datetime().optional(),
    }),
    targetCountry: zod_1.z.string().optional(),
    targetOrganization: zod_1.z.string().optional(),
    objectives: zod_1.z.array(zod_1.z.string()).default([]),
    methodsUsed: zod_1.z.array(zod_1.z.string()).default([]),
    keyPersonnel: zod_1.z.array(zod_1.z.object({
        personId: zod_1.z.string().uuid(),
        role: zod_1.z.string(),
    })).default([]),
    outcome: zod_1.z.enum(['SUCCESS', 'PARTIAL_SUCCESS', 'FAILURE', 'COMPROMISED', 'ONGOING', 'UNKNOWN']),
    impact: zod_1.z.enum(['STRATEGIC', 'SIGNIFICANT', 'MODERATE', 'LIMITED', 'MINIMAL']),
    lessonsLearned: zod_1.z.array(zod_1.z.string()).default([]),
    tradecraftEvolution: zod_1.z.array(zod_1.z.object({
        technique: zod_1.z.string(),
        innovation: zod_1.z.string(),
        adoption: zod_1.z.enum(['WIDELY_ADOPTED', 'SELECTIVELY_USED', 'EXPERIMENTAL', 'ABANDONED']),
    })).default([]),
    publicDisclosure: zod_1.z.object({
        disclosed: zod_1.z.boolean(),
        disclosureDate: zod_1.z.string().datetime().optional(),
        disclosureSource: zod_1.z.string().optional(),
        publicReaction: zod_1.z.string().optional(),
    }).optional(),
    relatedOperations: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
// ============================================================================
// DOCTRINE AND TRADECRAFT
// ============================================================================
exports.doctrineSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    agencyId: zod_1.z.string().uuid(),
    doctrineName: zod_1.z.string(),
    category: zod_1.z.enum([
        'OPERATIONAL_DOCTRINE',
        'COLLECTION_DOCTRINE',
        'COUNTERINTELLIGENCE_DOCTRINE',
        'TECHNICAL_DOCTRINE',
        'TRAINING_DOCTRINE',
        'SECURITY_DOCTRINE',
    ]),
    description: zod_1.z.string(),
    keyPrinciples: zod_1.z.array(zod_1.z.string()).default([]),
    preferredMethods: zod_1.z.array(zod_1.z.string()).default([]),
    tradecraftTechniques: zod_1.z.array(zod_1.z.object({
        technique: zod_1.z.string(),
        description: zod_1.z.string(),
        usageFrequency: zod_1.z.enum(['ROUTINE', 'COMMON', 'OCCASIONAL', 'RARE']),
        effectiveness: zod_1.z.enum(['VERY_HIGH', 'HIGH', 'MODERATE', 'LOW']),
    })).default([]),
    evolution: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.string().datetime(),
        change: zod_1.z.string(),
        driver: zod_1.z.string(),
        impact: zod_1.z.string(),
    })).default([]),
    comparisonWithOthers: zod_1.z.array(zod_1.z.object({
        otherAgencyId: zod_1.z.string().uuid(),
        similarities: zod_1.z.array(zod_1.z.string()).default([]),
        differences: zod_1.z.array(zod_1.z.string()).default([]),
    })).default([]),
    strengths: zod_1.z.array(zod_1.z.string()).default([]),
    weaknesses: zod_1.z.array(zod_1.z.string()).default([]),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
class AgencyTracker {
    config;
    constructor(config = {}) {
        this.config = {
            enableHistoricalTracking: config.enableHistoricalTracking ?? true,
            enableCapabilityAssessment: config.enableCapabilityAssessment ?? true,
            enableLeadershipTracking: config.enableLeadershipTracking ?? true,
            enableCooperationTracking: config.enableCooperationTracking ?? true,
        };
    }
    /**
     * Create a comprehensive agency profile
     */
    createAgencyProfile(data) {
        return espionage_tracking_1.intelligenceAgencySchema.parse({
            ...data,
            id: data.id || crypto.randomUUID(),
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
        });
    }
    /**
     * Assess agency capabilities
     */
    assessCapabilities(agencyId, assessments) {
        if (!this.config.enableCapabilityAssessment) {
            throw new Error('Capability assessment is disabled');
        }
        return assessments.map(assessment => exports.capabilityAssessmentSchema.parse({
            ...assessment,
            id: assessment.id || crypto.randomUUID(),
            agencyId,
            createdAt: assessment.createdAt || new Date().toISOString(),
            updatedAt: assessment.updatedAt || new Date().toISOString(),
        }));
    }
    /**
     * Track organizational structure
     */
    mapOrganizationalStructure(agencyId, units) {
        return units.map(unit => exports.organizationalUnitSchema.parse({
            ...unit,
            id: unit.id || crypto.randomUUID(),
            agencyId,
            createdAt: unit.createdAt || new Date().toISOString(),
            updatedAt: unit.updatedAt || new Date().toISOString(),
        }));
    }
    /**
     * Analyze cooperation relationships
     */
    analyzeCooperation(data) {
        if (!this.config.enableCooperationTracking) {
            throw new Error('Cooperation tracking is disabled');
        }
        return exports.cooperationRelationshipSchema.parse({
            ...data,
            id: data.id || crypto.randomUUID(),
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
        });
    }
    /**
     * Get agency assessment summary
     */
    getAgencyAssessment(agency) {
        // Simplified assessment logic
        const threatLevel = this.calculateThreatLevel(agency);
        return {
            threatLevel,
            capabilities: agency.capabilities,
            priorities: agency.priorityTargets,
            relationships: `${agency.cooperationPartners.length} partners, ${agency.adversaries.length} adversaries`,
        };
    }
    calculateThreatLevel(agency) {
        // Simplified threat calculation based on capabilities and resources
        const capabilityScore = agency.capabilities.length;
        const resourceScore = (agency.estimatedBudget || 0) / 1000000000; // Billions
        const score = capabilityScore + resourceScore;
        if (score > 20)
            return 'CRITICAL';
        if (score > 10)
            return 'HIGH';
        if (score > 5)
            return 'MEDIUM';
        return 'LOW';
    }
}
exports.AgencyTracker = AgencyTracker;
