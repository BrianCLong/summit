import { SourceDatabase } from '@intelgraph/source-database';
import { HandlerTools } from '@intelgraph/handler-tools';
import { DebriefSystem } from '@intelgraph/debrief-system';
import { SecureComms } from '@intelgraph/secure-comms';
import { OpsecMonitor } from '@intelgraph/opsec-monitor';
import { v4 as uuidv4 } from 'uuid';

/**
 * Configuration for HUMINT Manager
 */
export interface HumintManagerConfig {
  enableSecurityMonitoring?: boolean;
  enableAutomatedThreatDetection?: boolean;
  requirePolygraph?: boolean;
  maxSourcesPerHandler?: number;
  requireCompartmentation?: boolean;
}

/**
 * Comprehensive HUMINT Management Platform
 * Orchestrates all HUMINT operations including source management, handler operations,
 * debriefing, secure communications, and operational security
 */
export class HumintManager {
  private sourceDb: SourceDatabase;
  private handlerTools: HandlerTools;
  private debriefSystem: DebriefSystem;
  private secureComms: SecureComms;
  private opsecMonitor: OpsecMonitor;
  private config: HumintManagerConfig;

  constructor(config: HumintManagerConfig = {}) {
    this.config = {
      enableSecurityMonitoring: true,
      enableAutomatedThreatDetection: true,
      requirePolygraph: false,
      maxSourcesPerHandler: 10,
      requireCompartmentation: true,
      ...config
    };

    this.sourceDb = new SourceDatabase();
    this.handlerTools = new HandlerTools();
    this.debriefSystem = new DebriefSystem();
    this.secureComms = new SecureComms();
    this.opsecMonitor = new OpsecMonitor();
  }

  /**
   * Get Source Database
   */
  getSourceDatabase(): SourceDatabase {
    return this.sourceDb;
  }

  /**
   * Get Handler Tools
   */
  getHandlerTools(): HandlerTools {
    return this.handlerTools;
  }

  /**
   * Get Debrief System
   */
  getDebriefSystem(): DebriefSystem {
    return this.debriefSystem;
  }

  /**
   * Get Secure Communications
   */
  getSecureComms(): SecureComms {
    return this.secureComms;
  }

  /**
   * Get OPSEC Monitor
   */
  getOpsecMonitor(): OpsecMonitor {
    return this.opsecMonitor;
  }

  /**
   * Recruit a new source (end-to-end workflow)
   */
  async recruitSource(data: {
    codename: string;
    realName?: string;
    classification: any;
    recruitedBy: string;
    primaryHandler: string;
    motivation: any;
    accessDescription: string;
    coverStory: {
      backstory: string;
      employment: any;
      residence: any;
      relationships: any[];
      hobbies: string[];
      travelHistory: any[];
      socialMedia: any[];
    };
    requiresPolygraph?: boolean;
  }): Promise<{
    source: any;
    coverStory: any;
    authProtocol: any;
    initialThreatAssessment: any;
  }> {
    // Check handler workload
    const handlerSources = this.sourceDb.getSourcesByHandler(data.primaryHandler);
    if (handlerSources.length >= (this.config.maxSourcesPerHandler || 10)) {
      throw new Error(`Handler has reached maximum source capacity: ${this.config.maxSourcesPerHandler}`);
    }

    // Create source profile
    const source = this.sourceDb.createSource({
      codename: data.codename,
      realName: data.realName,
      classification: data.classification,
      reliability: 'F', // New source - reliability cannot be judged yet
      status: 'PROSPECT',
      dateRecruited: new Date(),
      recruitedBy: data.recruitedBy,
      primaryHandler: data.primaryHandler,
      motivation: data.motivation,
      accessLevel: 'INDIRECT', // Initial assessment
      accessDescription: data.accessDescription,
      coverStory: 'Managed by OPSEC',
      communicationProtocol: 'To be established',
      emergencyContact: 'To be established',
      vettingStatus: 'PENDING',
      riskScore: 50, // Medium risk for new sources
      totalCompensation: 0,
      totalContacts: 0,
      totalReports: 0,
      productivityScore: 0,
      tags: ['newly-recruited']
    });

    // Create cover story
    const coverStory = this.opsecMonitor.manageCoverStory({
      sourceId: source.id,
      handlerId: data.primaryHandler,
      ...data.coverStory,
      lastReviewed: new Date(),
      status: 'ACTIVE'
    });

    // Validate cover story
    const coverValidation = this.opsecMonitor.validateCoverStory(coverStory.id);
    if (!coverValidation.valid && this.config.enableSecurityMonitoring) {
      console.warn('Cover story has vulnerabilities:', coverValidation.vulnerabilities);
    }

    // Create authentication protocol
    const authProtocol = this.secureComms.createAuthenticationProtocol({
      sourceId: source.id,
      handlerId: data.primaryHandler,
      method: 'CODE_WORD',
      primaryCode: this.generateAuthCode(),
      backupCode: this.generateAuthCode(),
      duressCode: this.generateAuthCode(),
      validFrom: new Date(),
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      rotationSchedule: 'Quarterly',
      nextRotation: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
    });

    // Create communication protocol
    this.handlerTools.createCommunicationProtocol({
      sourceId: source.id,
      primaryMethod: 'ENCRYPTED_MESSAGE',
      backupMethod: 'DEAD_DROP',
      schedule: 'Weekly',
      authenticationCode: authProtocol.primaryCode,
      duressCode: authProtocol.duressCode,
      emergencyContact: `HANDLER-${data.primaryHandler}`
    });

    // Initial threat assessment
    const initialThreatAssessment = this.opsecMonitor.assessThreat(
      source.id,
      'SOURCE',
      data.recruitedBy
    );

    // Schedule initial vetting if required
    if (data.requiresPolygraph || this.config.requirePolygraph) {
      this.sourceDb.addVettingRecord({
        sourceId: source.id,
        vettingType: 'POLYGRAPH',
        conductor: 'VETTING_TEAM',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Schedule in 7 days
        result: 'PENDING',
        findings: 'Scheduled',
        recommendations: 'Complete polygraph examination within 30 days'
      });
    }

    return {
      source,
      coverStory,
      authProtocol,
      initialThreatAssessment
    };
  }

  /**
   * Generate authentication code
   */
  private generateAuthCode(): string {
    const words = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel'];
    const code1 = words[Math.floor(Math.random() * words.length)];
    const code2 = words[Math.floor(Math.random() * words.length)];
    const num = Math.floor(Math.random() * 100);
    return `${code1}-${code2}-${num}`;
  }

  /**
   * Conduct a complete source meeting (end-to-end workflow)
   */
  async conductMeeting(data: {
    sourceId: string;
    handlerId: string;
    locationId?: string;
    objectives: string[];
    debriefQuestions: any[];
    duration: number;
  }): Promise<{
    meeting: any;
    debriefSession: any;
    contact: any;
    afterActionReport?: any;
  }> {
    // Validate source exists and is active
    const source = this.sourceDb.getSource(data.sourceId);
    if (!source) {
      throw new Error(`Source not found: ${data.sourceId}`);
    }

    if (source.status !== 'ACTIVE' && source.status !== 'PROSPECT') {
      throw new Error(`Source is not active: ${source.status}`);
    }

    // Check for security threats
    if (this.config.enableAutomatedThreatDetection) {
      const threats = this.opsecMonitor.getThreatAssessments(data.sourceId);
      const criticalThreats = threats.filter(t => t.threatLevel === 'CRITICAL');
      if (criticalThreats.length > 0) {
        throw new Error(`CRITICAL THREAT: Meeting cannot proceed. ${criticalThreats[0].recommendations.join(', ')}`);
      }
    }

    // Plan the meeting
    const meeting = this.handlerTools.planMeeting({
      sourceId: data.sourceId,
      handlerId: data.handlerId,
      type: 'PHYSICAL',
      scheduledDate: new Date(),
      duration: data.duration,
      locationId: data.locationId,
      objectives: data.objectives,
      communicationPlan: 'Standard secure protocol',
      emergencyProtocol: 'Standard emergency procedures',
      surveillanceDetection: true,
      securityLevel: source.classification === 'TOP_SECRET' ? 'CRITICAL' : 'HIGH'
    });

    // Start the meeting
    this.handlerTools.startMeeting(meeting.id);

    // Start debrief session
    const debriefSession = this.debriefSystem.startDebriefSession(
      data.sourceId,
      data.handlerId,
      data.debriefQuestions,
      {
        meetingId: meeting.id,
        recordingEnabled: true,
        transcriptionEnabled: true
      }
    );

    // Log contact
    const contact = this.sourceDb.logContact({
      sourceId: data.sourceId,
      handlerId: data.handlerId,
      contactDate: new Date(),
      location: data.locationId || 'Secure Location',
      duration: data.duration,
      meetingType: 'PHYSICAL',
      summary: `Meeting conducted: ${data.objectives.join(', ')}`,
      intelligenceValue: 5 // Will be updated after debrief
    });

    return {
      meeting,
      debriefSession,
      contact
    };
  }

  /**
   * Complete meeting and generate intelligence report
   */
  async completeMeeting(meetingId: string, debriefSessionId: string, data: {
    intelligenceItems: any[];
    securityAssessment: any;
    sourcePerformance: any;
    nextSteps: string[];
  }): Promise<{
    meeting: any;
    debriefSession: any;
    aar: any;
    report?: any;
  }> {
    // Complete debrief session
    const debriefSession = this.debriefSystem.completeDebriefSession(debriefSessionId);

    // Create intelligence items
    const itemIds: string[] = [];
    for (const item of data.intelligenceItems) {
      const intelItem = this.debriefSystem.createIntelligenceItem({
        ...item,
        debriefSessionId: debriefSessionId,
        collectionDate: new Date(),
        reportDate: new Date(),
        validationStatus: 'PENDING'
      });
      itemIds.push(intelItem.id);
    }

    // Create after-action report
    const meeting = this.handlerTools.completeMeeting(
      meetingId,
      `Debrief completed. ${data.intelligenceItems.length} intelligence items collected`
    );

    const aar = this.handlerTools.createAfterActionReport({
      meetingId,
      handlerId: debriefSession.handlerId,
      sourceId: debriefSession.sourceId,
      reportDate: new Date(),
      objectives: meeting.objectives.map(obj => ({
        objective: obj,
        achieved: true,
        notes: 'Completed successfully'
      })),
      intelligenceGathered: data.intelligenceItems.map(item => ({
        topic: item.topic,
        information: item.information,
        credibility: item.informationCredibility,
        priority: item.priority
      })),
      sourcePerformance: data.sourcePerformance,
      securityAssessment: data.securityAssessment,
      nextSteps: data.nextSteps,
      followUpRequired: data.nextSteps.length > 0
    });

    // Create intelligence report if sufficient items
    let report;
    if (data.intelligenceItems.length > 0) {
      report = this.debriefSystem.createIntelligenceReport({
        type: 'HUMINT',
        classification: 'SECRET',
        priority: 'ROUTINE',
        title: `HUMINT Report - ${debriefSession.sourceId}`,
        summary: `Intelligence gathered from source ${debriefSession.sourceId}`,
        sourceIds: [debriefSession.sourceId],
        intelligenceItems: itemIds,
        disseminationList: ['INTEL_TEAM'],
        authorId: debriefSession.handlerId
      });
    }

    // Check for security incidents
    if (data.securityAssessment.surveillanceDetected) {
      this.opsecMonitor.reportIncident({
        type: 'SURVEILLANCE_DETECTED',
        severity: data.securityAssessment.riskLevel,
        status: 'REPORTED',
        reportedBy: debriefSession.handlerId,
        reportedDate: new Date(),
        incidentDate: new Date(),
        description: 'Surveillance detected during meeting',
        affectedEntities: [{
          entityId: debriefSession.sourceId,
          entityType: 'SOURCE',
          impact: 'Potential compromise'
        }],
        indicators: data.securityAssessment.securityIncidents,
        mitigationActions: data.securityAssessment.recommendations.map((rec: string) => ({
          action: rec,
          responsible: debriefSession.handlerId
        }))
      });
    }

    return {
      meeting,
      debriefSession,
      aar,
      report
    };
  }

  /**
   * Get comprehensive platform statistics
   */
  getStatistics() {
    return {
      sources: this.sourceDb.getStatistics(),
      handlers: {
        // Would need handler database for full stats
        totalHandlers: new Set(
          this.sourceDb.getAllSources().map(s => s.primaryHandler)
        ).size
      },
      debrief: this.debriefSystem.getStatistics(),
      communications: this.secureComms.getStatistics(),
      security: this.opsecMonitor.getStatistics()
    };
  }

  /**
   * Generate comprehensive dashboard data
   */
  getDashboard() {
    const stats = this.getStatistics();
    const allSources = this.sourceDb.getAllSources();
    const recentContacts = this.sourceDb.getAllSources()
      .filter(s => s.lastContactDate)
      .sort((a, b) => (b.lastContactDate?.getTime() || 0) - (a.lastContactDate?.getTime() || 0))
      .slice(0, 10);

    const upcomingMeetings = this.handlerTools.getUpcomingMeetings().slice(0, 10);
    const unresolvedIncidents = this.opsecMonitor.getIncidents({ unresolved: true });
    const pendingReports = this.debriefSystem.searchReports({ status: 'PENDING_REVIEW' });

    return {
      overview: {
        totalSources: stats.sources.totalSources,
        activeSources: stats.sources.activeSource,
        totalIntelligenceItems: stats.debrief.totalIntelligenceItems,
        pendingReports: pendingReports.length,
        unresolvedIncidents: unresolvedIncidents.length,
        criticalThreats: stats.security.criticalIncidents
      },
      sources: {
        byStatus: {
          active: stats.sources.activeSource,
          inactive: stats.sources.inactiveSources,
          prospect: stats.sources.prospectSources,
          compromised: stats.sources.compromisedSources
        },
        topProductive: allSources
          .sort((a, b) => (b.productivityScore || 0) - (a.productivityScore || 0))
          .slice(0, 10)
          .map(s => ({
            codename: s.codename,
            productivity: s.productivityScore,
            totalReports: s.totalReports
          }))
      },
      operations: {
        recentContacts: recentContacts.map(s => ({
          codename: s.codename,
          lastContact: s.lastContactDate,
          totalContacts: s.totalContacts
        })),
        upcomingMeetings: upcomingMeetings.map(m => ({
          id: m.id,
          scheduledDate: m.scheduledDate,
          type: m.type,
          securityLevel: m.securityLevel
        }))
      },
      security: {
        unresolvedIncidents: unresolvedIncidents.map(i => ({
          id: i.id,
          type: i.type,
          severity: i.severity,
          reportedDate: i.reportedDate
        })),
        confirmedSurveillance: stats.security.confirmedSurveillance,
        patternAnomalies: stats.security.patternAnomalies
      },
      intelligence: {
        pendingReports: pendingReports.length,
        disseminatedReports: stats.debrief.disseminatedReports,
        averageFeedback: stats.debrief.averageFeedbackScore,
        validatedItems: stats.debrief.validatedItems
      }
    };
  }
}
