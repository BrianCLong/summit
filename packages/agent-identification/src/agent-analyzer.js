"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentAnalyzer = exports.surveillanceReportSchema = exports.agentNetworkSchema = exports.communicationPatternSchema = exports.travelPatternSchema = exports.coverAnalysisSchema = void 0;
const zod_1 = require("zod");
/**
 * Agent Identification and Tracking
 *
 * Advanced analysis and tracking of intelligence officers, cover identities,
 * travel patterns, communication methods, and agent networks.
 */
// ============================================================================
// COVER IDENTITY ANALYSIS
// ============================================================================
exports.coverAnalysisSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    officerId: zod_1.z.string().uuid(),
    coverIdentity: zod_1.z.string(),
    coverType: zod_1.z.enum([
        'DIPLOMATIC',
        'NOC',
        'COMMERCIAL',
        'ACADEMIC',
        'JOURNALIST',
        'NGO',
        'CULTURAL',
        'TECHNICAL',
        'MILITARY',
        'UNDECLARED',
    ]),
    credibility: zod_1.z.enum(['EXCELLENT', 'GOOD', 'ADEQUATE', 'WEAK', 'TRANSPARENT']),
    backstoppingQuality: zod_1.z.enum(['COMPREHENSIVE', 'SUBSTANTIAL', 'BASIC', 'MINIMAL', 'NONE']),
    verifiableElements: zod_1.z.array(zod_1.z.object({
        element: zod_1.z.string(),
        verified: zod_1.z.boolean(),
        source: zod_1.z.string(),
        confidence: zod_1.z.number().min(0).max(1),
    })).default([]),
    inconsistencies: zod_1.z.array(zod_1.z.object({
        inconsistency: zod_1.z.string(),
        severity: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
        evidence: zod_1.z.array(zod_1.z.string()),
    })).default([]),
    coverOrganization: zod_1.z.object({
        name: zod_1.z.string(),
        type: zod_1.z.string(),
        legitimacy: zod_1.z.enum(['LEGITIMATE', 'SHELL', 'FRONT', 'UNKNOWN']),
        otherOfficers: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    }).optional(),
    sustainabilityAssessment: zod_1.z.object({
        longTerm: zod_1.z.boolean(),
        vulnerabilities: zod_1.z.array(zod_1.z.string()),
        recommendations: zod_1.z.array(zod_1.z.string()),
    }).optional(),
    compromiseRisk: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL']),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
// ============================================================================
// TRAVEL PATTERN ANALYSIS
// ============================================================================
exports.travelPatternSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    officerId: zod_1.z.string().uuid(),
    analysisTimeframe: zod_1.z.object({
        startDate: zod_1.z.string().datetime(),
        endDate: zod_1.z.string().datetime(),
    }),
    frequentDestinations: zod_1.z.array(zod_1.z.object({
        location: zod_1.z.string(),
        visitCount: zod_1.z.number(),
        averageStayDuration: zod_1.z.number(), // days
        purposes: zod_1.z.array(zod_1.z.string()),
        significance: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    })).default([]),
    travelClusters: zod_1.z.array(zod_1.z.object({
        clusterId: zod_1.z.string(),
        locations: zod_1.z.array(zod_1.z.string()),
        timeframe: zod_1.z.string(),
        pattern: zod_1.z.string(),
        significance: zod_1.z.string(),
    })).default([]),
    unusualTrips: zod_1.z.array(zod_1.z.object({
        destination: zod_1.z.string(),
        date: zod_1.z.string().datetime(),
        unusualAspects: zod_1.z.array(zod_1.z.string()),
        potentialSignificance: zod_1.z.string(),
    })).default([]),
    meetingLocations: zod_1.z.array(zod_1.z.object({
        location: zod_1.z.string(),
        frequency: zod_1.z.number(),
        timePattern: zod_1.z.string(),
        associatedIndividuals: zod_1.z.array(zod_1.z.string().uuid()),
    })).default([]),
    coverConsistency: zod_1.z.object({
        consistent: zod_1.z.boolean(),
        deviations: zod_1.z.array(zod_1.z.string()),
        assessment: zod_1.z.string(),
    }).optional(),
    predictedFutureTravel: zod_1.z.array(zod_1.z.object({
        destination: zod_1.z.string(),
        timeframe: zod_1.z.string(),
        confidence: zod_1.z.number().min(0).max(1),
        rationale: zod_1.z.string(),
    })).default([]),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
// ============================================================================
// COMMUNICATION ANALYSIS
// ============================================================================
exports.communicationPatternSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    officerId: zod_1.z.string().uuid(),
    analysisTimeframe: zod_1.z.object({
        startDate: zod_1.z.string().datetime(),
        endDate: zod_1.z.string().datetime(),
    }),
    communicationMethods: zod_1.z.array(zod_1.z.object({
        method: zod_1.z.enum([
            'ENCRYPTED_EMAIL',
            'SECURE_PHONE',
            'DEAD_DROP',
            'BRUSH_PASS',
            'STEGANOGRAPHY',
            'COVERT_CHANNEL',
            'PERSONAL_MEETING',
            'ONLINE_PLATFORM',
            'CODED_MESSAGE',
            'COURIER',
        ]),
        frequency: zod_1.z.number(),
        encryption: zod_1.z.boolean(),
        security: zod_1.z.enum(['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL']),
    })).default([]),
    communicationPartners: zod_1.z.array(zod_1.z.object({
        partnerId: zod_1.z.string().uuid(),
        relationship: zod_1.z.string(),
        frequency: zod_1.z.number(),
        lastContact: zod_1.z.string().datetime(),
        significance: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    })).default([]),
    schedulePatterns: zod_1.z.array(zod_1.z.object({
        pattern: zod_1.z.string(),
        frequency: zod_1.z.string(),
        reliability: zod_1.z.number().min(0).max(1),
    })).default([]),
    securityProcedures: zod_1.z.array(zod_1.z.object({
        procedure: zod_1.z.string(),
        effectiveness: zod_1.z.enum(['EXCELLENT', 'GOOD', 'ADEQUATE', 'POOR']),
        vulnerabilities: zod_1.z.array(zod_1.z.string()).default([]),
    })).default([]),
    surveillanceDetectionActivities: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.string().datetime(),
        location: zod_1.z.string(),
        techniques: zod_1.z.array(zod_1.z.string()),
        effectiveness: zod_1.z.string(),
    })).default([]),
    anomalies: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.string().datetime(),
        anomaly: zod_1.z.string(),
        significance: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
        possibleExplanations: zod_1.z.array(zod_1.z.string()),
    })).default([]),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
// ============================================================================
// AGENT NETWORK MAPPING
// ============================================================================
exports.agentNetworkSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    networkName: zod_1.z.string(),
    sponsoringAgency: zod_1.z.string().uuid(),
    networkType: zod_1.z.enum([
        'HANDLER_ASSET',
        'PEER_TO_PEER',
        'HIERARCHICAL',
        'CELLULAR',
        'HYBRID',
    ]),
    members: zod_1.z.array(zod_1.z.object({
        officerId: zod_1.z.string().uuid(),
        role: zod_1.z.string(),
        joinDate: zod_1.z.string().datetime(),
        status: zod_1.z.enum(['ACTIVE', 'INACTIVE', 'COMPROMISED', 'EXITED']),
    })).default([]),
    relationships: zod_1.z.array(zod_1.z.object({
        officer1Id: zod_1.z.string().uuid(),
        officer2Id: zod_1.z.string().uuid(),
        relationshipType: zod_1.z.enum([
            'HANDLER',
            'ASSET',
            'COLLEAGUE',
            'SUPPORT',
            'CUTOUT',
            'UNKNOWN',
        ]),
        strength: zod_1.z.enum(['STRONG', 'MODERATE', 'WEAK']),
        frequency: zod_1.z.string(),
    })).default([]),
    operationalFocus: zod_1.z.array(zod_1.z.string()).default([]),
    geographicScope: zod_1.z.array(zod_1.z.string()).default([]),
    communicationStructure: zod_1.z.object({
        primary: zod_1.z.string(),
        backup: zod_1.z.array(zod_1.z.string()),
        securityLevel: zod_1.z.enum(['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW']),
    }).optional(),
    vulnerabilities: zod_1.z.array(zod_1.z.object({
        vulnerability: zod_1.z.string(),
        severity: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
        mitigation: zod_1.z.string().optional(),
    })).default([]),
    knownOperations: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    effectiveness: zod_1.z.enum(['VERY_HIGH', 'HIGH', 'MODERATE', 'LOW', 'MINIMAL']),
    status: zod_1.z.enum(['ACTIVE', 'DORMANT', 'COMPROMISED', 'ROLLED_UP', 'UNKNOWN']),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
// ============================================================================
// SURVEILLANCE DETECTION
// ============================================================================
exports.surveillanceReportSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    targetOfficerId: zod_1.z.string().uuid(),
    date: zod_1.z.string().datetime(),
    location: zod_1.z.string(),
    surveillanceTeam: zod_1.z.object({
        estimatedSize: zod_1.z.number(),
        techniques: zod_1.z.array(zod_1.z.string()),
        vehicles: zod_1.z.array(zod_1.z.object({
            type: zod_1.z.string(),
            description: zod_1.z.string(),
            licensePlate: zod_1.z.string().optional(),
        })),
        technology: zod_1.z.array(zod_1.z.string()),
    }),
    targetActivity: zod_1.z.string(),
    surveillanceIndicators: zod_1.z.array(zod_1.z.object({
        indicator: zod_1.z.string(),
        confidence: zod_1.z.number().min(0).max(1),
        evidence: zod_1.z.string(),
    })).default([]),
    targetAwareness: zod_1.z.enum([
        'UNAWARE',
        'POSSIBLY_AWARE',
        'AWARE',
        'CONDUCTING_SDR', // Surveillance Detection Route
    ]),
    sdrTechniques: zod_1.z.array(zod_1.z.object({
        technique: zod_1.z.string(),
        effectiveness: zod_1.z.enum(['EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE']),
    })).default([]),
    outcome: zod_1.z.enum([
        'SURVEILLANCE_MAINTAINED',
        'SURVEILLANCE_LOST',
        'SURVEILLANCE_BURNED',
        'TARGET_ABORTED_ACTIVITY',
    ]),
    collectedIntelligence: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        description: zod_1.z.string(),
        significance: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    })).default([]),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
class AgentAnalyzer {
    config;
    constructor(config = {}) {
        this.config = {
            enableCoverAnalysis: config.enableCoverAnalysis ?? true,
            enableTravelAnalysis: config.enableTravelAnalysis ?? true,
            enableCommunicationAnalysis: config.enableCommunicationAnalysis ?? true,
            enableNetworkMapping: config.enableNetworkMapping ?? true,
            confidenceThreshold: config.confidenceThreshold ?? 0.7,
        };
    }
    /**
     * Analyze cover identity credibility
     */
    analyzeCoverIdentity(officer, coverIdentity) {
        if (!this.config.enableCoverAnalysis) {
            throw new Error('Cover analysis is disabled');
        }
        const cover = officer.coverIdentities.find(c => c.name === coverIdentity);
        if (!cover) {
            throw new Error(`Cover identity ${coverIdentity} not found`);
        }
        // Simplified cover analysis
        const credibility = this.assessCoverCredibility(cover);
        const compromiseRisk = this.assessCompromiseRisk(cover, officer);
        return exports.coverAnalysisSchema.parse({
            id: crypto.randomUUID(),
            officerId: officer.id,
            coverIdentity,
            coverType: cover.coverType,
            credibility,
            backstoppingQuality: 'SUBSTANTIAL',
            compromiseRisk,
            verifiableElements: [],
            inconsistencies: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tenantId: officer.tenantId,
        });
    }
    /**
     * Analyze travel patterns
     */
    analyzeTravelPatterns(officer, timeframe) {
        if (!this.config.enableTravelAnalysis) {
            throw new Error('Travel analysis is disabled');
        }
        // Filter travel history by timeframe
        const relevantTravel = officer.travelHistory.filter(trip => {
            const arrival = new Date(trip.arrivalDate);
            const start = new Date(timeframe.startDate);
            const end = new Date(timeframe.endDate);
            return arrival >= start && arrival <= end;
        });
        // Analyze frequent destinations
        const destinationCounts = new Map();
        relevantTravel.forEach(trip => {
            const count = destinationCounts.get(trip.destination) || 0;
            destinationCounts.set(trip.destination, count + 1);
        });
        const frequentDestinations = Array.from(destinationCounts.entries())
            .map(([location, visitCount]) => ({
            location,
            visitCount,
            averageStayDuration: 7, // Simplified
            purposes: ['intelligence collection'],
            significance: visitCount > 3 ? 'HIGH' : 'MEDIUM',
        }))
            .sort((a, b) => b.visitCount - a.visitCount);
        return exports.travelPatternSchema.parse({
            id: crypto.randomUUID(),
            officerId: officer.id,
            analysisTimeframe: timeframe,
            frequentDestinations,
            travelClusters: [],
            unusualTrips: [],
            meetingLocations: [],
            predictedFutureTravel: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tenantId: officer.tenantId,
        });
    }
    /**
     * Map agent network
     */
    mapAgentNetwork(officers, networkName) {
        if (!this.config.enableNetworkMapping) {
            throw new Error('Network mapping is disabled');
        }
        const members = officers.map(officer => ({
            officerId: officer.id,
            role: officer.role,
            joinDate: officer.createdAt,
            status: officer.operationalStatus,
        }));
        // Analyze relationships between officers
        const relationships = [];
        for (let i = 0; i < officers.length; i++) {
            for (let j = i + 1; j < officers.length; j++) {
                const officer1 = officers[i];
                const officer2 = officers[j];
                // Check if they're handler-asset
                if (officer1.assets.includes(officer2.id)) {
                    relationships.push({
                        officer1Id: officer1.id,
                        officer2Id: officer2.id,
                        relationshipType: 'HANDLER',
                        strength: 'STRONG',
                        frequency: 'regular',
                    });
                }
                else if (officer1.knownAssociates.includes(officer2.id)) {
                    relationships.push({
                        officer1Id: officer1.id,
                        officer2Id: officer2.id,
                        relationshipType: 'COLLEAGUE',
                        strength: 'MODERATE',
                        frequency: 'occasional',
                    });
                }
            }
        }
        return exports.agentNetworkSchema.parse({
            id: crypto.randomUUID(),
            networkName,
            sponsoringAgency: officers[0]?.agency || crypto.randomUUID(),
            networkType: 'HANDLER_ASSET',
            members,
            relationships,
            operationalFocus: [],
            geographicScope: [],
            knownOperations: [],
            effectiveness: 'MODERATE',
            status: 'ACTIVE',
            vulnerabilities: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tenantId: officers[0]?.tenantId || 'default',
        });
    }
    /**
     * Generate officer risk profile
     */
    generateRiskProfile(officer) {
        const factors = [];
        // Check operational status
        if (officer.operationalStatus === 'COMPROMISED') {
            factors.push({
                factor: 'Compromised Status',
                severity: 'CRITICAL',
                description: 'Officer has been compromised',
            });
        }
        // Check cover identities
        const compromisedCovers = officer.coverIdentities.filter(c => c.compromised);
        if (compromisedCovers.length > 0) {
            factors.push({
                factor: 'Compromised Covers',
                severity: 'HIGH',
                description: `${compromisedCovers.length} cover identities compromised`,
            });
        }
        // Calculate overall risk
        const criticalCount = factors.filter(f => f.severity === 'CRITICAL').length;
        const highCount = factors.filter(f => f.severity === 'HIGH').length;
        let overallRisk;
        if (criticalCount > 0) {
            overallRisk = 'CRITICAL';
        }
        else if (highCount > 1) {
            overallRisk = 'HIGH';
        }
        else if (highCount > 0 || factors.length > 2) {
            overallRisk = 'MEDIUM';
        }
        else {
            overallRisk = 'LOW';
        }
        const recommendations = this.generateRecommendations(overallRisk, factors);
        return {
            overallRisk,
            factors,
            recommendations,
        };
    }
    assessCoverCredibility(cover) {
        if (cover.compromised)
            return 'TRANSPARENT';
        if (cover.coverType === 'DIPLOMATIC')
            return 'GOOD';
        if (cover.coverType === 'NOC')
            return 'EXCELLENT';
        return 'ADEQUATE';
    }
    assessCompromiseRisk(cover, officer) {
        if (cover.compromised)
            return 'CRITICAL';
        if (officer.operationalStatus === 'COMPROMISED')
            return 'CRITICAL';
        if (officer.surveillanceHistory.length > 10)
            return 'HIGH';
        if (officer.surveillanceHistory.length > 5)
            return 'MEDIUM';
        return 'LOW';
    }
    generateRecommendations(riskLevel, factors) {
        const recommendations = [];
        if (riskLevel === 'CRITICAL') {
            recommendations.push('Immediate action required');
            recommendations.push('Consider exfiltration or termination of operation');
            recommendations.push('Enhanced security protocols');
        }
        else if (riskLevel === 'HIGH') {
            recommendations.push('Increase surveillance detection activities');
            recommendations.push('Review and update cover identities');
            recommendations.push('Limit operational exposure');
        }
        else if (riskLevel === 'MEDIUM') {
            recommendations.push('Monitor situation closely');
            recommendations.push('Maintain standard security procedures');
        }
        else {
            recommendations.push('Continue normal operations');
            recommendations.push('Routine monitoring');
        }
        return recommendations;
    }
}
exports.AgentAnalyzer = AgentAnalyzer;
