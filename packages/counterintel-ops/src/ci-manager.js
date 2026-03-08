"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CIManager = exports.defectorVettingSchema = exports.insiderThreatProfileSchema = exports.deceptionOperationSchema = exports.doubleAgentSchema = exports.penetrationIndicatorSchema = void 0;
const zod_1 = require("zod");
/**
 * Counterintelligence Operations Management
 *
 * Advanced counterintelligence operations including penetration detection,
 * double agent management, deception operations, and insider threat hunting.
 */
// ============================================================================
// PENETRATION DETECTION
// ============================================================================
exports.penetrationIndicatorSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    indicatorType: zod_1.z.enum([
        'UNAUTHORIZED_ACCESS',
        'DATA_EXFILTRATION',
        'ANOMALOUS_BEHAVIOR',
        'COMMUNICATION_ANOMALY',
        'TRAVEL_PATTERN',
        'FINANCIAL_IRREGULARITY',
        'RELATIONSHIP_CONCERN',
        'PSYCHOLOGICAL_INDICATOR',
        'TECHNICAL_INDICATOR',
    ]),
    description: zod_1.z.string(),
    observedAt: zod_1.z.string().datetime(),
    suspectedIndividual: zod_1.z.string().uuid().optional(),
    severity: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    confidence: zod_1.z.number().min(0).max(1),
    evidence: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        description: zod_1.z.string(),
        source: zod_1.z.string(),
        timestamp: zod_1.z.string().datetime(),
        classification: zod_1.z.string(),
    })).default([]),
    relatedIndicators: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    investigationStatus: zod_1.z.enum([
        'NEW',
        'UNDER_REVIEW',
        'INVESTIGATING',
        'CONFIRMED_PENETRATION',
        'FALSE_POSITIVE',
        'RESOLVED',
    ]),
    investigationNotes: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.string().datetime(),
        investigator: zod_1.z.string().uuid(),
        note: zod_1.z.string(),
    })).default([]),
    mitigationActions: zod_1.z.array(zod_1.z.object({
        action: zod_1.z.string(),
        status: zod_1.z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
        completedAt: zod_1.z.string().datetime().optional(),
    })).default([]),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
// ============================================================================
// DOUBLE AGENT OPERATIONS
// ============================================================================
exports.doubleAgentSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    agentId: zod_1.z.string().uuid(),
    codename: zod_1.z.string(),
    targetAgency: zod_1.z.string().uuid(),
    targetHandler: zod_1.z.string().uuid().optional(),
    ourHandler: zod_1.z.string().uuid(),
    recruitmentDate: zod_1.z.string().datetime(),
    recruitmentMethod: zod_1.z.string(),
    controlLevel: zod_1.z.enum([
        'FULL_CONTROL',
        'SUBSTANTIAL_CONTROL',
        'PARTIAL_CONTROL',
        'LIMITED_CONTROL',
        'UNCERTAIN',
    ]),
    motivation: zod_1.z.array(zod_1.z.string()).default([]),
    reliability: zod_1.z.enum(['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'UNRELIABLE']),
    productionValue: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL']),
    intelligence: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.string().datetime(),
        intelligenceType: zod_1.z.string(),
        summary: zod_1.z.string(),
        value: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
        verified: zod_1.z.boolean(),
    })).default([]),
    deceptionOperations: zod_1.z.array(zod_1.z.object({
        operationId: zod_1.z.string().uuid(),
        objective: zod_1.z.string(),
        materialPassed: zod_1.z.string(),
        targetReaction: zod_1.z.string().optional(),
        effectiveness: zod_1.z.enum(['VERY_EFFECTIVE', 'EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE', 'UNKNOWN']),
    })).default([]),
    communications: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.string().datetime(),
        method: zod_1.z.string(),
        direction: zod_1.z.enum(['TO_TARGET', 'FROM_TARGET']),
        summary: zod_1.z.string(),
        significance: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    })).default([]),
    risks: zod_1.z.array(zod_1.z.object({
        risk: zod_1.z.string(),
        severity: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
        mitigation: zod_1.z.string(),
        status: zod_1.z.enum(['ACTIVE', 'MITIGATED', 'ACCEPTED']),
    })).default([]),
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE', 'COMPROMISED', 'TERMINATED', 'DEFECTED']),
    terminationDate: zod_1.z.string().datetime().optional(),
    terminationReason: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
// ============================================================================
// DECEPTION OPERATIONS
// ============================================================================
exports.deceptionOperationSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    operationName: zod_1.z.string(),
    codename: zod_1.z.string(),
    targetAgency: zod_1.z.string().uuid(),
    objective: zod_1.z.string(),
    targetBelief: zod_1.z.string(), // What we want them to believe
    actualSituation: zod_1.z.string(), // The truth we're hiding
    deceptionTheme: zod_1.z.string(),
    channels: zod_1.z.array(zod_1.z.object({
        channelType: zod_1.z.enum([
            'DOUBLE_AGENT',
            'CONTROLLED_SOURCE',
            'TECHNICAL_MEANS',
            'OPEN_SOURCE',
            'DIPLOMATIC',
            'MILITARY_DISPLAY',
            'CYBER',
        ]),
        channelId: zod_1.z.string().uuid().optional(),
        credibility: zod_1.z.enum(['HIGH', 'MEDIUM', 'LOW']),
        usage: zod_1.z.enum(['PRIMARY', 'SUPPORTING', 'BACKUP']),
    })).default([]),
    deceptionMaterial: zod_1.z.array(zod_1.z.object({
        materialType: zod_1.z.string(),
        content: zod_1.z.string(),
        passedVia: zod_1.z.string(),
        passedOn: zod_1.z.string().datetime(),
        targetReaction: zod_1.z.string().optional(),
    })).default([]),
    indicators: zod_1.z.array(zod_1.z.object({
        indicator: zod_1.z.string(),
        purpose: zod_1.z.string(),
        delivered: zod_1.z.boolean(),
        observed: zod_1.z.boolean(),
    })).default([]),
    measureOfEffectiveness: zod_1.z.array(zod_1.z.object({
        measure: zod_1.z.string(),
        targetValue: zod_1.z.string(),
        actualValue: zod_1.z.string().optional(),
        achieved: zod_1.z.boolean(),
    })).default([]),
    targetAssessment: zod_1.z.object({
        believedDeception: zod_1.z.boolean().optional(),
        confidenceLevel: zod_1.z.enum(['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']),
        targetActions: zod_1.z.array(zod_1.z.string()),
        indicatorOfSuccess: zod_1.z.array(zod_1.z.string()),
    }).optional(),
    risks: zod_1.z.array(zod_1.z.object({
        risk: zod_1.z.string(),
        probability: zod_1.z.enum(['HIGH', 'MEDIUM', 'LOW']),
        impact: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
        mitigation: zod_1.z.string(),
    })).default([]),
    status: zod_1.z.enum(['PLANNING', 'ACTIVE', 'ONGOING', 'SUCCESSFUL', 'FAILED', 'COMPROMISED', 'TERMINATED']),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
// ============================================================================
// INSIDER THREAT HUNTING
// ============================================================================
exports.insiderThreatProfileSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    subjectId: zod_1.z.string().uuid(),
    subjectName: zod_1.z.string(),
    organization: zod_1.z.string(),
    position: zod_1.z.string(),
    clearanceLevel: zod_1.z.string(),
    accessLevel: zod_1.z.string(),
    threatLevel: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL']),
    threatCategory: zod_1.z.enum([
        'ESPIONAGE',
        'SABOTAGE',
        'UNAUTHORIZED_DISCLOSURE',
        'THEFT',
        'VIOLENCE',
        'FRAUD',
        'UNKNOWN',
    ]),
    riskFactors: zod_1.z.array(zod_1.z.object({
        factor: zod_1.z.string(),
        category: zod_1.z.enum([
            'PERSONAL',
            'PROFESSIONAL',
            'FINANCIAL',
            'BEHAVIORAL',
            'TECHNICAL',
            'FOREIGN_CONTACT',
        ]),
        severity: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
        firstObserved: zod_1.z.string().datetime(),
        current: zod_1.z.boolean(),
    })).default([]),
    indicators: zod_1.z.array(zod_1.z.object({
        indicatorType: zod_1.z.string(),
        description: zod_1.z.string(),
        observedAt: zod_1.z.string().datetime(),
        confidence: zod_1.z.number().min(0).max(1),
        significance: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    })).default([]),
    behavioralAnalysis: zod_1.z.object({
        baselineBehavior: zod_1.z.string(),
        deviations: zod_1.z.array(zod_1.z.string()),
        stressIndicators: zod_1.z.array(zod_1.z.string()),
        motivationalFactors: zod_1.z.array(zod_1.z.string()),
    }).optional(),
    technicalAnalysis: zod_1.z.object({
        dataAccessPatterns: zod_1.z.array(zod_1.z.string()),
        unusualAccess: zod_1.z.array(zod_1.z.string()),
        exfiltrationAttempts: zod_1.z.number(),
        securityViolations: zod_1.z.array(zod_1.z.string()),
    }).optional(),
    foreignContacts: zod_1.z.array(zod_1.z.object({
        contactId: zod_1.z.string().uuid(),
        relationship: zod_1.z.string(),
        country: zod_1.z.string(),
        suspicionLevel: zod_1.z.enum(['HIGH', 'MEDIUM', 'LOW', 'NONE']),
        reported: zod_1.z.boolean(),
    })).default([]),
    investigation: zod_1.z.object({
        status: zod_1.z.enum([
            'MONITORING',
            'PRELIMINARY_INQUIRY',
            'FULL_INVESTIGATION',
            'CLEARED',
            'CONFIRMED_THREAT',
        ]),
        startDate: zod_1.z.string().datetime(),
        investigators: zod_1.z.array(zod_1.z.string().uuid()),
        findings: zod_1.z.array(zod_1.z.string()),
    }).optional(),
    mitigationActions: zod_1.z.array(zod_1.z.object({
        action: zod_1.z.string(),
        actionType: zod_1.z.enum([
            'ACCESS_RESTRICTION',
            'ENHANCED_MONITORING',
            'INTERVIEW',
            'POLYGRAPH',
            'TERMINATION',
            'PROSECUTION',
        ]),
        implementedAt: zod_1.z.string().datetime(),
        effectiveness: zod_1.z.enum(['EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE', 'UNKNOWN']),
    })).default([]),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
// ============================================================================
// DEFECTOR VETTING
// ============================================================================
exports.defectorVettingSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    defectorId: zod_1.z.string().uuid(),
    defectorName: zod_1.z.string().optional(),
    codename: zod_1.z.string(),
    formerAgency: zod_1.z.string().uuid(),
    formerPosition: zod_1.z.string(),
    defectionDate: zod_1.z.string().datetime(),
    defectionLocation: zod_1.z.string(),
    defectionCircumstances: zod_1.z.string(),
    motivation: zod_1.z.array(zod_1.z.string()).default([]),
    vettingStatus: zod_1.z.enum([
        'INITIAL_SCREENING',
        'DETAILED_VETTING',
        'POLYGRAPH',
        'FIELD_INVESTIGATION',
        'APPROVED',
        'REJECTED',
        'SUSPECTED_DANGLE',
    ]),
    credibilityAssessment: zod_1.z.enum(['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'VERY_LOW']),
    intelligenceValue: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL']),
    providedIntelligence: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.string().datetime(),
        category: zod_1.z.string(),
        summary: zod_1.z.string(),
        verified: zod_1.z.boolean().optional(),
        value: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    })).default([]),
    verificationResults: zod_1.z.array(zod_1.z.object({
        claim: zod_1.z.string(),
        verificationMethod: zod_1.z.string(),
        result: zod_1.z.enum(['VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED', 'CONTRADICTED']),
        confidence: zod_1.z.enum(['HIGH', 'MEDIUM', 'LOW']),
    })).default([]),
    inconsistencies: zod_1.z.array(zod_1.z.object({
        inconsistency: zod_1.z.string(),
        severity: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
        explanation: zod_1.z.string().optional(),
        resolved: zod_1.z.boolean(),
    })).default([]),
    polygraphResults: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.string().datetime(),
        examiner: zod_1.z.string(),
        result: zod_1.z.enum(['NO_DECEPTION', 'DECEPTION_INDICATED', 'INCONCLUSIVE']),
        issuesIdentified: zod_1.z.array(zod_1.z.string()),
    })).default([]),
    dangleIndicators: zod_1.z.array(zod_1.z.object({
        indicator: zod_1.z.string(),
        significance: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
        assessment: zod_1.z.string(),
    })).default([]),
    recommendation: zod_1.z.enum([
        'ACCEPT_AND_USE',
        'ACCEPT_WITH_RESTRICTIONS',
        'CONTINUE_VETTING',
        'REJECT',
        'POSSIBLE_DANGLE',
    ]).optional(),
    handlingPlan: zod_1.z.object({
        resettlement: zod_1.z.boolean(),
        debriefingSchedule: zod_1.z.string(),
        securityMeasures: zod_1.z.array(zod_1.z.string()),
        publicDisclosure: zod_1.z.boolean(),
    }).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
class CIManager {
    config;
    constructor(config = {}) {
        this.config = {
            enablePenetrationDetection: config.enablePenetrationDetection ?? true,
            enableDoubleAgentOps: config.enableDoubleAgentOps ?? true,
            enableDeceptionOps: config.enableDeceptionOps ?? true,
            enableInsiderThreat: config.enableInsiderThreat ?? true,
            enableDefectorVetting: config.enableDefectorVetting ?? true,
            automatedAlerts: config.automatedAlerts ?? true,
        };
    }
    /**
     * Create penetration indicator
     */
    createPenetrationIndicator(data) {
        if (!this.config.enablePenetrationDetection) {
            throw new Error('Penetration detection is disabled');
        }
        return exports.penetrationIndicatorSchema.parse({
            ...data,
            id: data.id || crypto.randomUUID(),
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
        });
    }
    /**
     * Register double agent
     */
    registerDoubleAgent(data) {
        if (!this.config.enableDoubleAgentOps) {
            throw new Error('Double agent operations are disabled');
        }
        return exports.doubleAgentSchema.parse({
            ...data,
            id: data.id || crypto.randomUUID(),
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
        });
    }
    /**
     * Create deception operation
     */
    createDeceptionOperation(data) {
        if (!this.config.enableDeceptionOps) {
            throw new Error('Deception operations are disabled');
        }
        return exports.deceptionOperationSchema.parse({
            ...data,
            id: data.id || crypto.randomUUID(),
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
        });
    }
    /**
     * Create insider threat profile
     */
    createInsiderThreatProfile(data) {
        if (!this.config.enableInsiderThreat) {
            throw new Error('Insider threat hunting is disabled');
        }
        return exports.insiderThreatProfileSchema.parse({
            ...data,
            id: data.id || crypto.randomUUID(),
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
        });
    }
    /**
     * Create defector vetting record
     */
    createDefectorVetting(data) {
        if (!this.config.enableDefectorVetting) {
            throw new Error('Defector vetting is disabled');
        }
        return exports.defectorVettingSchema.parse({
            ...data,
            id: data.id || crypto.randomUUID(),
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
        });
    }
    /**
     * Assess overall CI posture
     */
    assessCIPosture(data) {
        let posture;
        const risks = [];
        const recommendations = [];
        if (data.recentCompromises > 2 || data.insiderThreats > 5) {
            posture = 'CRITICAL';
            risks.push('Multiple compromises detected');
            recommendations.push('Immediate security review required');
            recommendations.push('Enhanced vetting procedures');
        }
        else if (data.penetrationIndicators > 10 || data.insiderThreats > 2) {
            posture = 'POOR';
            risks.push('Elevated threat indicators');
            recommendations.push('Increase monitoring');
            recommendations.push('Review access controls');
        }
        else if (data.penetrationIndicators > 5) {
            posture = 'FAIR';
            risks.push('Some concerning indicators');
            recommendations.push('Continue monitoring');
        }
        else if (data.activeDoubleAgents > 3) {
            posture = 'GOOD';
            recommendations.push('Maintain current posture');
        }
        else {
            posture = 'EXCELLENT';
            recommendations.push('Continue excellent work');
        }
        return { posture, risks, recommendations };
    }
    /**
     * Generate CI alerts
     */
    generateAlerts(indicators) {
        if (!this.config.automatedAlerts) {
            return [];
        }
        return indicators
            .filter(ind => ind.severity === 'CRITICAL' || ind.severity === 'HIGH')
            .map(ind => ({
            severity: ind.severity,
            message: `${ind.indicatorType}: ${ind.description}`,
            actionRequired: 'Immediate investigation required',
        }));
    }
}
exports.CIManager = CIManager;
