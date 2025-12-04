import { z } from 'zod';
import {
  IntelligenceOfficer,
  intelligenceOfficerSchema,
  CoverType,
  AgentRole,
} from '@intelgraph/espionage-tracking';

/**
 * Agent Identification and Tracking
 *
 * Advanced analysis and tracking of intelligence officers, cover identities,
 * travel patterns, communication methods, and agent networks.
 */

// ============================================================================
// COVER IDENTITY ANALYSIS
// ============================================================================

export const coverAnalysisSchema = z.object({
  id: z.string().uuid(),
  officerId: z.string().uuid(),
  coverIdentity: z.string(),
  coverType: z.enum([
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
  credibility: z.enum(['EXCELLENT', 'GOOD', 'ADEQUATE', 'WEAK', 'TRANSPARENT']),
  backstoppingQuality: z.enum(['COMPREHENSIVE', 'SUBSTANTIAL', 'BASIC', 'MINIMAL', 'NONE']),
  verifiableElements: z.array(z.object({
    element: z.string(),
    verified: z.boolean(),
    source: z.string(),
    confidence: z.number().min(0).max(1),
  })).default([]),
  inconsistencies: z.array(z.object({
    inconsistency: z.string(),
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    evidence: z.array(z.string()),
  })).default([]),
  coverOrganization: z.object({
    name: z.string(),
    type: z.string(),
    legitimacy: z.enum(['LEGITIMATE', 'SHELL', 'FRONT', 'UNKNOWN']),
    otherOfficers: z.array(z.string().uuid()).default([]),
  }).optional(),
  sustainabilityAssessment: z.object({
    longTerm: z.boolean(),
    vulnerabilities: z.array(z.string()),
    recommendations: z.array(z.string()),
  }).optional(),
  compromiseRisk: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL']),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type CoverAnalysis = z.infer<typeof coverAnalysisSchema>;

// ============================================================================
// TRAVEL PATTERN ANALYSIS
// ============================================================================

export const travelPatternSchema = z.object({
  id: z.string().uuid(),
  officerId: z.string().uuid(),
  analysisTimeframe: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }),
  frequentDestinations: z.array(z.object({
    location: z.string(),
    visitCount: z.number(),
    averageStayDuration: z.number(), // days
    purposes: z.array(z.string()),
    significance: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  })).default([]),
  travelClusters: z.array(z.object({
    clusterId: z.string(),
    locations: z.array(z.string()),
    timeframe: z.string(),
    pattern: z.string(),
    significance: z.string(),
  })).default([]),
  unusualTrips: z.array(z.object({
    destination: z.string(),
    date: z.string().datetime(),
    unusualAspects: z.array(z.string()),
    potentialSignificance: z.string(),
  })).default([]),
  meetingLocations: z.array(z.object({
    location: z.string(),
    frequency: z.number(),
    timePattern: z.string(),
    associatedIndividuals: z.array(z.string().uuid()),
  })).default([]),
  coverConsistency: z.object({
    consistent: z.boolean(),
    deviations: z.array(z.string()),
    assessment: z.string(),
  }).optional(),
  predictedFutureTravel: z.array(z.object({
    destination: z.string(),
    timeframe: z.string(),
    confidence: z.number().min(0).max(1),
    rationale: z.string(),
  })).default([]),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type TravelPattern = z.infer<typeof travelPatternSchema>;

// ============================================================================
// COMMUNICATION ANALYSIS
// ============================================================================

export const communicationPatternSchema = z.object({
  id: z.string().uuid(),
  officerId: z.string().uuid(),
  analysisTimeframe: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }),
  communicationMethods: z.array(z.object({
    method: z.enum([
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
    frequency: z.number(),
    encryption: z.boolean(),
    security: z.enum(['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL']),
  })).default([]),
  communicationPartners: z.array(z.object({
    partnerId: z.string().uuid(),
    relationship: z.string(),
    frequency: z.number(),
    lastContact: z.string().datetime(),
    significance: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  })).default([]),
  schedulePatterns: z.array(z.object({
    pattern: z.string(),
    frequency: z.string(),
    reliability: z.number().min(0).max(1),
  })).default([]),
  securityProcedures: z.array(z.object({
    procedure: z.string(),
    effectiveness: z.enum(['EXCELLENT', 'GOOD', 'ADEQUATE', 'POOR']),
    vulnerabilities: z.array(z.string()).default([]),
  })).default([]),
  surveillanceDetectionActivities: z.array(z.object({
    date: z.string().datetime(),
    location: z.string(),
    techniques: z.array(z.string()),
    effectiveness: z.string(),
  })).default([]),
  anomalies: z.array(z.object({
    date: z.string().datetime(),
    anomaly: z.string(),
    significance: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    possibleExplanations: z.array(z.string()),
  })).default([]),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type CommunicationPattern = z.infer<typeof communicationPatternSchema>;

// ============================================================================
// AGENT NETWORK MAPPING
// ============================================================================

export const agentNetworkSchema = z.object({
  id: z.string().uuid(),
  networkName: z.string(),
  sponsoringAgency: z.string().uuid(),
  networkType: z.enum([
    'HANDLER_ASSET',
    'PEER_TO_PEER',
    'HIERARCHICAL',
    'CELLULAR',
    'HYBRID',
  ]),
  members: z.array(z.object({
    officerId: z.string().uuid(),
    role: z.string(),
    joinDate: z.string().datetime(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'COMPROMISED', 'EXITED']),
  })).default([]),
  relationships: z.array(z.object({
    officer1Id: z.string().uuid(),
    officer2Id: z.string().uuid(),
    relationshipType: z.enum([
      'HANDLER',
      'ASSET',
      'COLLEAGUE',
      'SUPPORT',
      'CUTOUT',
      'UNKNOWN',
    ]),
    strength: z.enum(['STRONG', 'MODERATE', 'WEAK']),
    frequency: z.string(),
  })).default([]),
  operationalFocus: z.array(z.string()).default([]),
  geographicScope: z.array(z.string()).default([]),
  communicationStructure: z.object({
    primary: z.string(),
    backup: z.array(z.string()),
    securityLevel: z.enum(['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW']),
  }).optional(),
  vulnerabilities: z.array(z.object({
    vulnerability: z.string(),
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    mitigation: z.string().optional(),
  })).default([]),
  knownOperations: z.array(z.string().uuid()).default([]),
  effectiveness: z.enum(['VERY_HIGH', 'HIGH', 'MODERATE', 'LOW', 'MINIMAL']),
  status: z.enum(['ACTIVE', 'DORMANT', 'COMPROMISED', 'ROLLED_UP', 'UNKNOWN']),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type AgentNetwork = z.infer<typeof agentNetworkSchema>;

// ============================================================================
// SURVEILLANCE DETECTION
// ============================================================================

export const surveillanceReportSchema = z.object({
  id: z.string().uuid(),
  targetOfficerId: z.string().uuid(),
  date: z.string().datetime(),
  location: z.string(),
  surveillanceTeam: z.object({
    estimatedSize: z.number(),
    techniques: z.array(z.string()),
    vehicles: z.array(z.object({
      type: z.string(),
      description: z.string(),
      licensePlate: z.string().optional(),
    })),
    technology: z.array(z.string()),
  }),
  targetActivity: z.string(),
  surveillanceIndicators: z.array(z.object({
    indicator: z.string(),
    confidence: z.number().min(0).max(1),
    evidence: z.string(),
  })).default([]),
  targetAwareness: z.enum([
    'UNAWARE',
    'POSSIBLY_AWARE',
    'AWARE',
    'CONDUCTING_SDR', // Surveillance Detection Route
  ]),
  sdrTechniques: z.array(z.object({
    technique: z.string(),
    effectiveness: z.enum(['EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE']),
  })).default([]),
  outcome: z.enum([
    'SURVEILLANCE_MAINTAINED',
    'SURVEILLANCE_LOST',
    'SURVEILLANCE_BURNED',
    'TARGET_ABORTED_ACTIVITY',
  ]),
  collectedIntelligence: z.array(z.object({
    type: z.string(),
    description: z.string(),
    significance: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  })).default([]),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type SurveillanceReport = z.infer<typeof surveillanceReportSchema>;

// ============================================================================
// AGENT ANALYZER CLASS
// ============================================================================

export interface AgentAnalyzerConfig {
  enableCoverAnalysis: boolean;
  enableTravelAnalysis: boolean;
  enableCommunicationAnalysis: boolean;
  enableNetworkMapping: boolean;
  confidenceThreshold: number;
}

export class AgentAnalyzer {
  private config: AgentAnalyzerConfig;

  constructor(config: Partial<AgentAnalyzerConfig> = {}) {
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
  analyzeCoverIdentity(
    officer: IntelligenceOfficer,
    coverIdentity: string
  ): CoverAnalysis {
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

    return coverAnalysisSchema.parse({
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
  analyzeTravelPatterns(
    officer: IntelligenceOfficer,
    timeframe: { startDate: string; endDate: string }
  ): TravelPattern {
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
    const destinationCounts = new Map<string, number>();
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
        significance: visitCount > 3 ? 'HIGH' as const : 'MEDIUM' as const,
      }))
      .sort((a, b) => b.visitCount - a.visitCount);

    return travelPatternSchema.parse({
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
  mapAgentNetwork(
    officers: IntelligenceOfficer[],
    networkName: string
  ): AgentNetwork {
    if (!this.config.enableNetworkMapping) {
      throw new Error('Network mapping is disabled');
    }

    const members = officers.map(officer => ({
      officerId: officer.id,
      role: officer.role,
      joinDate: officer.createdAt,
      status: officer.operationalStatus as 'ACTIVE' | 'INACTIVE' | 'COMPROMISED' | 'EXITED',
    }));

    // Analyze relationships between officers
    const relationships: Array<{
      officer1Id: string;
      officer2Id: string;
      relationshipType: 'HANDLER' | 'ASSET' | 'COLLEAGUE' | 'SUPPORT' | 'CUTOUT' | 'UNKNOWN';
      strength: 'STRONG' | 'MODERATE' | 'WEAK';
      frequency: string;
    }> = [];

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
        } else if (officer1.knownAssociates.includes(officer2.id)) {
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

    return agentNetworkSchema.parse({
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
  generateRiskProfile(officer: IntelligenceOfficer): {
    overallRisk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    factors: Array<{ factor: string; severity: string; description: string }>;
    recommendations: string[];
  } {
    const factors: Array<{ factor: string; severity: string; description: string }> = [];

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

    let overallRisk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    if (criticalCount > 0) {
      overallRisk = 'CRITICAL';
    } else if (highCount > 1) {
      overallRisk = 'HIGH';
    } else if (highCount > 0 || factors.length > 2) {
      overallRisk = 'MEDIUM';
    } else {
      overallRisk = 'LOW';
    }

    const recommendations = this.generateRecommendations(overallRisk, factors);

    return {
      overallRisk,
      factors,
      recommendations,
    };
  }

  private assessCoverCredibility(cover: any): 'EXCELLENT' | 'GOOD' | 'ADEQUATE' | 'WEAK' | 'TRANSPARENT' {
    if (cover.compromised) return 'TRANSPARENT';
    if (cover.coverType === 'DIPLOMATIC') return 'GOOD';
    if (cover.coverType === 'NOC') return 'EXCELLENT';
    return 'ADEQUATE';
  }

  private assessCompromiseRisk(cover: any, officer: IntelligenceOfficer): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'MINIMAL' {
    if (cover.compromised) return 'CRITICAL';
    if (officer.operationalStatus === 'COMPROMISED') return 'CRITICAL';
    if (officer.surveillanceHistory.length > 10) return 'HIGH';
    if (officer.surveillanceHistory.length > 5) return 'MEDIUM';
    return 'LOW';
  }

  private generateRecommendations(
    riskLevel: string,
    factors: Array<{ factor: string; severity: string; description: string }>
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'CRITICAL') {
      recommendations.push('Immediate action required');
      recommendations.push('Consider exfiltration or termination of operation');
      recommendations.push('Enhanced security protocols');
    } else if (riskLevel === 'HIGH') {
      recommendations.push('Increase surveillance detection activities');
      recommendations.push('Review and update cover identities');
      recommendations.push('Limit operational exposure');
    } else if (riskLevel === 'MEDIUM') {
      recommendations.push('Monitor situation closely');
      recommendations.push('Maintain standard security procedures');
    } else {
      recommendations.push('Continue normal operations');
      recommendations.push('Routine monitoring');
    }

    return recommendations;
  }
}
