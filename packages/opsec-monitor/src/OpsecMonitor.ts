import { v4 as uuidv4 } from 'uuid';
import {
  CoverStory,
  CoverStorySchema,
  SurveillanceDetectionRoute,
  SurveillanceDetectionRouteSchema,
  SecurityIncident,
  SecurityIncidentSchema,
  CompromiseIndicator,
  CompromiseIndicatorSchema,
  ThreatAssessment,
  ThreatAssessmentSchema,
  AccessControlRecord,
  AccessControlRecordSchema,
  OperationalPattern,
  OperationalPatternSchema,
  CompartmentationRule,
  CompartmentationRuleSchema,
  SurveillanceReport,
  SurveillanceReportSchema,
  ThreatLevel,
  IncidentStatus,
  SurveillanceDetectionStatus
} from './types.js';

/**
 * Operational Security (OPSEC) Monitoring System
 * Provides comprehensive security monitoring, threat detection, and incident management
 */
export class OpsecMonitor {
  private coverStories: Map<string, CoverStory> = new Map();
  private sdRoutes: Map<string, SurveillanceDetectionRoute> = new Map();
  private incidents: Map<string, SecurityIncident> = new Map();
  private indicators: Map<string, CompromiseIndicator> = new Map();
  private assessments: Map<string, ThreatAssessment[]> = new Map();
  private accessLogs: Map<string, AccessControlRecord[]> = new Map();
  private patterns: Map<string, OperationalPattern> = new Map();
  private compartments: Map<string, CompartmentationRule> = new Map();
  private surveillanceReports: Map<string, SurveillanceReport> = new Map();

  /**
   * Create or update cover story
   */
  manageCoverStory(data: Omit<CoverStory, 'id'>): CoverStory {
    const existing = Array.from(this.coverStories.values()).find(
      cs => cs.sourceId === data.sourceId && cs.handlerId === data.handlerId
    );

    const coverStory: CoverStory = {
      ...data,
      id: existing?.id || uuidv4()
    };

    const validated = CoverStorySchema.parse(coverStory);
    this.coverStories.set(validated.id, validated);

    return validated;
  }

  /**
   * Get cover story for source
   */
  getCoverStory(sourceId: string): CoverStory | undefined {
    return Array.from(this.coverStories.values()).find(cs => cs.sourceId === sourceId);
  }

  /**
   * Validate cover story consistency
   */
  validateCoverStory(coverStoryId: string): {
    valid: boolean;
    vulnerabilities: string[];
    recommendations: string[];
  } {
    const coverStory = this.coverStories.get(coverStoryId);
    if (!coverStory) {
      throw new Error(`Cover story not found: ${coverStoryId}`);
    }

    const vulnerabilities: string[] = [];
    const recommendations: string[] = [];

    // Check employment verifiability
    if (!coverStory.employment.verifiable) {
      vulnerabilities.push('Employment cannot be verified');
      recommendations.push('Establish verifiable employment cover');
    }

    // Check residence verifiability
    if (!coverStory.residence.verifiable) {
      vulnerabilities.push('Residence cannot be verified');
      recommendations.push('Establish verifiable residence');
    }

    // Check relationship contacts
    const contactedRelationships = coverStory.relationships.filter(r => r.contacted);
    if (contactedRelationships.length < coverStory.relationships.length * 0.5) {
      vulnerabilities.push('Insufficient relationship verification');
      recommendations.push('Increase contact with cover relationships');
    }

    // Check social media presence
    const activeSocialMedia = coverStory.socialMedia.filter(sm => sm.active);
    if (activeSocialMedia.length === 0) {
      vulnerabilities.push('No active social media presence');
      recommendations.push('Establish and maintain active social media profiles');
    }

    // Check last review date
    const daysSinceReview = (Date.now() - coverStory.lastReviewed.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceReview > 90) {
      vulnerabilities.push(`Cover story not reviewed in ${Math.round(daysSinceReview)} days`);
      recommendations.push('Schedule immediate cover story review');
    }

    return {
      valid: vulnerabilities.length === 0,
      vulnerabilities,
      recommendations
    };
  }

  /**
   * Create surveillance detection route
   */
  createSDRoute(data: Omit<SurveillanceDetectionRoute, 'id'>): SurveillanceDetectionRoute {
    const route: SurveillanceDetectionRoute = {
      ...data,
      id: uuidv4()
    };

    const validated = SurveillanceDetectionRouteSchema.parse(route);
    this.sdRoutes.set(validated.id, validated);

    return validated;
  }

  /**
   * Get surveillance detection routes
   */
  getSDRoutes(): SurveillanceDetectionRoute[] {
    return Array.from(this.sdRoutes.values())
      .sort((a, b) => (b.effectiveness || 0) - (a.effectiveness || 0));
  }

  /**
   * Report security incident
   */
  reportIncident(data: Omit<SecurityIncident, 'id' | 'resolved'>): SecurityIncident {
    const incident: SecurityIncident = {
      ...data,
      id: uuidv4(),
      resolved: false
    };

    const validated = SecurityIncidentSchema.parse(incident);
    this.incidents.set(validated.id, validated);

    // Auto-assess threat if critical
    if (incident.severity === ThreatLevel.CRITICAL) {
      incident.affectedEntities.forEach(entity => {
        this.assessThreat(entity.entityId, entity.entityType, data.reportedBy);
      });
    }

    return validated;
  }

  /**
   * Update incident status
   */
  updateIncidentStatus(
    incidentId: string,
    status: IncidentStatus,
    updates?: Partial<SecurityIncident>
  ): SecurityIncident {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident not found: ${incidentId}`);
    }

    const updated = {
      ...incident,
      ...updates,
      status,
      resolved: status === IncidentStatus.CLOSED || status === IncidentStatus.MITIGATED,
      resolvedDate: status === IncidentStatus.CLOSED ? new Date() : incident.resolvedDate
    };

    const validated = SecurityIncidentSchema.parse(updated);
    this.incidents.set(incidentId, validated);

    return validated;
  }

  /**
   * Get security incidents
   */
  getIncidents(filters?: {
    severity?: ThreatLevel;
    status?: IncidentStatus;
    entityId?: string;
    unresolved?: boolean;
  }): SecurityIncident[] {
    let incidents = Array.from(this.incidents.values());

    if (filters) {
      if (filters.severity) {
        incidents = incidents.filter(i => i.severity === filters.severity);
      }
      if (filters.status) {
        incidents = incidents.filter(i => i.status === filters.status);
      }
      if (filters.entityId) {
        incidents = incidents.filter(i =>
          i.affectedEntities.some(e => e.entityId === filters.entityId)
        );
      }
      if (filters.unresolved) {
        incidents = incidents.filter(i => !i.resolved);
      }
    }

    return incidents.sort((a, b) => b.reportedDate.getTime() - a.reportedDate.getTime());
  }

  /**
   * Register compromise indicator
   */
  registerIndicator(data: Omit<CompromiseIndicator, 'id'>): CompromiseIndicator {
    const indicator: CompromiseIndicator = {
      ...data,
      id: uuidv4()
    };

    const validated = CompromiseIndicatorSchema.parse(indicator);
    this.indicators.set(validated.id, validated);

    return validated;
  }

  /**
   * Check for compromise indicators
   */
  checkCompromiseIndicators(entityId: string, patterns: string[]): {
    detected: CompromiseIndicator[];
    threatLevel: ThreatLevel;
    immediateActions: string[];
  } {
    const activeIndicators = Array.from(this.indicators.values()).filter(i => i.active);
    const detected: CompromiseIndicator[] = [];

    patterns.forEach(pattern => {
      const matchingIndicators = activeIndicators.filter(i =>
        i.name.toLowerCase().includes(pattern.toLowerCase()) ||
        i.description.toLowerCase().includes(pattern.toLowerCase())
      );
      detected.push(...matchingIndicators);
    });

    // Determine threat level based on detected indicators
    const highSeverity = detected.filter(i => i.severity === ThreatLevel.HIGH || i.severity === ThreatLevel.CRITICAL);
    const threatLevel = highSeverity.length > 0 ? ThreatLevel.HIGH :
                       detected.length > 0 ? ThreatLevel.MEDIUM : ThreatLevel.LOW;

    // Collect immediate actions
    const immediateActions = detected
      .filter(i => i.severity === ThreatLevel.CRITICAL || i.severity === ThreatLevel.HIGH)
      .map(i => i.responseProtocol);

    return {
      detected,
      threatLevel,
      immediateActions
    };
  }

  /**
   * Conduct threat assessment
   */
  assessThreat(
    entityId: string,
    entityType: 'SOURCE' | 'HANDLER' | 'OPERATION' | 'LOCATION',
    assessedBy: string
  ): ThreatAssessment {
    // Get related incidents
    const relatedIncidents = this.getIncidents({ entityId, unresolved: true });

    // Calculate risk score based on incidents
    const riskScore = Math.min(100,
      relatedIncidents.length * 10 +
      relatedIncidents.filter(i => i.severity === ThreatLevel.CRITICAL).length * 30 +
      relatedIncidents.filter(i => i.severity === ThreatLevel.HIGH).length * 20
    );

    // Determine threat level
    let threatLevel: ThreatLevel;
    if (riskScore >= 80) threatLevel = ThreatLevel.CRITICAL;
    else if (riskScore >= 60) threatLevel = ThreatLevel.HIGH;
    else if (riskScore >= 30) threatLevel = ThreatLevel.MEDIUM;
    else threatLevel = ThreatLevel.LOW;

    const assessment: ThreatAssessment = {
      id: uuidv4(),
      entityId,
      entityType,
      assessmentDate: new Date(),
      threatLevel,
      threats: relatedIncidents.map(inc => ({
        threat: inc.description,
        likelihood: this.calculateLikelihood(inc.severity),
        impact: this.calculateImpact(inc.severity),
        mitigations: inc.mitigationActions.map(m => m.action)
      })),
      indicators: relatedIncidents.flatMap(inc => inc.indicators),
      riskScore,
      recommendations: this.generateRecommendations(threatLevel, relatedIncidents),
      nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      assessedBy
    };

    const validated = ThreatAssessmentSchema.parse(assessment);

    const assessments = this.assessments.get(entityId) || [];
    assessments.push(validated);
    this.assessments.set(entityId, assessments);

    return validated;
  }

  /**
   * Calculate likelihood from severity
   */
  private calculateLikelihood(severity: ThreatLevel): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (severity === ThreatLevel.CRITICAL || severity === ThreatLevel.HIGH) return 'HIGH';
    if (severity === ThreatLevel.MEDIUM) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calculate impact from severity
   */
  private calculateImpact(severity: ThreatLevel): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    return severity;
  }

  /**
   * Generate recommendations based on threat level
   */
  private generateRecommendations(threatLevel: ThreatLevel, incidents: SecurityIncident[]): string[] {
    const recommendations: string[] = [];

    if (threatLevel === ThreatLevel.CRITICAL) {
      recommendations.push('Immediately suspend all operations');
      recommendations.push('Activate emergency protocols');
      recommendations.push('Relocate affected personnel');
    } else if (threatLevel === ThreatLevel.HIGH) {
      recommendations.push('Increase security measures');
      recommendations.push('Enhance surveillance detection');
      recommendations.push('Review and update cover stories');
    } else if (threatLevel === ThreatLevel.MEDIUM) {
      recommendations.push('Monitor situation closely');
      recommendations.push('Brief all personnel on threats');
      recommendations.push('Prepare contingency plans');
    }

    return recommendations;
  }

  /**
   * Get threat assessments for entity
   */
  getThreatAssessments(entityId: string): ThreatAssessment[] {
    return (this.assessments.get(entityId) || [])
      .sort((a, b) => b.assessmentDate.getTime() - a.assessmentDate.getTime());
  }

  /**
   * Log access control decision
   */
  logAccessControl(data: Omit<AccessControlRecord, 'id' | 'timestamp'>): AccessControlRecord {
    const record: AccessControlRecord = {
      ...data,
      id: uuidv4(),
      timestamp: new Date()
    };

    const validated = AccessControlRecordSchema.parse(record);

    const logs = this.accessLogs.get(data.userId) || [];
    logs.push(validated);
    this.accessLogs.set(data.userId, logs);

    // Check for anomalies
    if (!record.granted && !record.denialReason) {
      this.reportIncident({
        type: 'UNAUTHORIZED_ACCESS',
        severity: ThreatLevel.HIGH,
        status: IncidentStatus.REPORTED,
        reportedBy: 'SYSTEM',
        reportedDate: new Date(),
        incidentDate: new Date(),
        description: `Unauthorized access attempt by ${data.userId} to ${data.resourceType}:${data.resourceId}`,
        affectedEntities: [{
          entityId: data.userId,
          entityType: 'HANDLER',
          impact: 'Access denied to restricted resource'
        }],
        indicators: ['Unauthorized access attempt'],
        mitigationActions: [{
          action: 'Review user permissions',
          responsible: 'SECURITY_ADMIN'
        }]
      });
    }

    return validated;
  }

  /**
   * Get access logs for user
   */
  getAccessLogs(userId: string, startDate?: Date, endDate?: Date): AccessControlRecord[] {
    const logs = this.accessLogs.get(userId) || [];

    return logs.filter(log => {
      if (startDate && log.timestamp < startDate) return false;
      if (endDate && log.timestamp > endDate) return false;
      return true;
    });
  }

  /**
   * Analyze operational patterns
   */
  analyzeOperationalPattern(
    entityId: string,
    entityType: 'SOURCE' | 'HANDLER' | 'OPERATION',
    patternType: 'MEETING' | 'COMMUNICATION' | 'TRAVEL' | 'ACCESS',
    currentMetrics: OperationalPattern['currentMetrics']
  ): OperationalPattern {
    const key = `${entityId}-${patternType}`;
    const existingPattern = this.patterns.get(key);

    // If no baseline, establish one
    if (!existingPattern) {
      const pattern: OperationalPattern = {
        entityId,
        entityType,
        patternType,
        baselineMetrics: currentMetrics,
        currentMetrics,
        deviationScore: 0,
        anomaliesDetected: [],
        lastAnalyzed: new Date()
      };

      const validated = OperationalPatternSchema.parse(pattern);
      this.patterns.set(key, validated);
      return validated;
    }

    // Calculate deviations
    const anomalies: string[] = [];
    let deviationScore = 0;

    // Frequency deviation
    const freqDeviation = Math.abs(currentMetrics.frequency - existingPattern.baselineMetrics.frequency) /
                         existingPattern.baselineMetrics.frequency;
    if (freqDeviation > 0.3) {
      anomalies.push(`Frequency deviation: ${(freqDeviation * 100).toFixed(1)}%`);
      deviationScore += freqDeviation * 30;
    }

    // Duration deviation
    const durationDeviation = Math.abs(currentMetrics.duration - existingPattern.baselineMetrics.duration) /
                             existingPattern.baselineMetrics.duration;
    if (durationDeviation > 0.3) {
      anomalies.push(`Duration deviation: ${(durationDeviation * 100).toFixed(1)}%`);
      deviationScore += durationDeviation * 30;
    }

    // Location deviation
    const newLocations = currentMetrics.locations.filter(
      l => !existingPattern.baselineMetrics.locations.includes(l)
    );
    if (newLocations.length > 0) {
      anomalies.push(`New locations detected: ${newLocations.join(', ')}`);
      deviationScore += newLocations.length * 10;
    }

    const updated: OperationalPattern = {
      ...existingPattern,
      currentMetrics,
      deviationScore: Math.min(100, deviationScore),
      anomaliesDetected: anomalies,
      lastAnalyzed: new Date()
    };

    const validated = OperationalPatternSchema.parse(updated);
    this.patterns.set(key, validated);

    // Report incident if high deviation
    if (deviationScore > 50) {
      this.reportIncident({
        type: 'PATTERN_ANOMALY',
        severity: deviationScore > 70 ? ThreatLevel.HIGH : ThreatLevel.MEDIUM,
        status: IncidentStatus.REPORTED,
        reportedBy: 'SYSTEM',
        reportedDate: new Date(),
        incidentDate: new Date(),
        description: `Operational pattern anomaly detected for ${entityType} ${entityId}`,
        affectedEntities: [{
          entityId,
          entityType,
          impact: `Pattern deviation score: ${deviationScore.toFixed(1)}`
        }],
        indicators: anomalies,
        mitigationActions: [{
          action: 'Review recent activities',
          responsible: 'OPERATIONS_MANAGER'
        }]
      });
    }

    return validated;
  }

  /**
   * Create compartmentation rule
   */
  createCompartment(data: Omit<CompartmentationRule, 'id' | 'created' | 'lastModified'>): CompartmentationRule {
    const rule: CompartmentationRule = {
      ...data,
      id: uuidv4(),
      created: new Date(),
      lastModified: new Date()
    };

    const validated = CompartmentationRuleSchema.parse(rule);
    this.compartments.set(validated.id, validated);

    return validated;
  }

  /**
   * Check compartment access
   */
  checkCompartmentAccess(userId: string, compartmentId: string): {
    granted: boolean;
    reason: string;
  } {
    const compartment = this.compartments.get(compartmentId);
    if (!compartment) {
      return { granted: false, reason: 'Compartment not found' };
    }

    if (!compartment.active) {
      return { granted: false, reason: 'Compartment is inactive' };
    }

    if (compartment.authorizedPersonnel.includes(userId)) {
      return { granted: true, reason: 'User authorized' };
    }

    return { granted: false, reason: 'User not authorized for this compartment' };
  }

  /**
   * Report surveillance
   */
  reportSurveillance(data: Omit<SurveillanceReport, 'id'>): SurveillanceReport {
    const report: SurveillanceReport = {
      ...data,
      id: uuidv4()
    };

    const validated = SurveillanceReportSchema.parse(report);
    this.surveillanceReports.set(validated.id, validated);

    // Create security incident if confirmed surveillance
    if (report.detectionStatus === SurveillanceDetectionStatus.CONFIRMED) {
      this.reportIncident({
        type: 'SURVEILLANCE_DETECTED',
        severity: report.compromiseRisk,
        status: IncidentStatus.CONFIRMED,
        reportedBy: data.reportedBy,
        reportedDate: data.reportDate,
        incidentDate: data.incidentDate,
        location: data.location,
        description: `Confirmed surveillance detected at ${data.location}`,
        affectedEntities: [{
          entityId: data.reportedBy,
          entityType: 'HANDLER',
          impact: 'Surveillance confirmed'
        }],
        indicators: data.observations.map(o => o.description),
        mitigationActions: data.actionsTaken.map(action => ({
          action,
          responsible: data.reportedBy
        }))
      });
    }

    return validated;
  }

  /**
   * Get surveillance reports
   */
  getSurveillanceReports(filters?: {
    reportedBy?: string;
    detectionStatus?: SurveillanceDetectionStatus;
    startDate?: Date;
    endDate?: Date;
  }): SurveillanceReport[] {
    let reports = Array.from(this.surveillanceReports.values());

    if (filters) {
      if (filters.reportedBy) {
        reports = reports.filter(r => r.reportedBy === filters.reportedBy);
      }
      if (filters.detectionStatus) {
        reports = reports.filter(r => r.detectionStatus === filters.detectionStatus);
      }
      if (filters.startDate) {
        reports = reports.filter(r => r.incidentDate >= filters.startDate!);
      }
      if (filters.endDate) {
        reports = reports.filter(r => r.incidentDate <= filters.endDate!);
      }
    }

    return reports.sort((a, b) => b.reportDate.getTime() - a.reportDate.getTime());
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const incidents = Array.from(this.incidents.values());
    const unresolvedIncidents = incidents.filter(i => !i.resolved);

    return {
      totalIncidents: incidents.length,
      unresolvedIncidents: unresolvedIncidents.length,
      criticalIncidents: incidents.filter(i => i.severity === ThreatLevel.CRITICAL).length,
      activeCoverStories: Array.from(this.coverStories.values()).filter(cs => cs.status === 'ACTIVE').length,
      compromisedCoverStories: Array.from(this.coverStories.values()).filter(cs => cs.status === 'COMPROMISED').length,
      surveillanceReports: this.surveillanceReports.size,
      confirmedSurveillance: Array.from(this.surveillanceReports.values()).filter(
        r => r.detectionStatus === SurveillanceDetectionStatus.CONFIRMED
      ).length,
      activeCompartments: Array.from(this.compartments.values()).filter(c => c.active).length,
      patternAnomalies: Array.from(this.patterns.values()).filter(p => p.deviationScore > 50).length
    };
  }
}
