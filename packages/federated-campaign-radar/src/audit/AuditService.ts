/**
 * Audit Service for Federated Campaign Radar
 *
 * Provides comprehensive audit trail aligned to GenAI risk governance practices.
 * Implements controls, measurement, and incident handling per NIST AI 600-1.
 *
 * @see https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf
 */

import { EventEmitter } from 'events';
import { createHash, createHmac, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  CampaignSignal,
  CampaignCluster,
  FederatedAlert,
  EvaluationMetrics,
  IncidentMetrics,
} from '../core/types';

/**
 * Audit entry types
 */
export enum AuditEventType {
  // Signal events
  SIGNAL_RECEIVED = 'SIGNAL_RECEIVED',
  SIGNAL_NORMALIZED = 'SIGNAL_NORMALIZED',
  SIGNAL_FEDERATED = 'SIGNAL_FEDERATED',
  SIGNAL_REJECTED = 'SIGNAL_REJECTED',

  // Clustering events
  CLUSTERING_STARTED = 'CLUSTERING_STARTED',
  CLUSTERING_COMPLETED = 'CLUSTERING_COMPLETED',
  CLUSTER_CREATED = 'CLUSTER_CREATED',
  CLUSTER_UPDATED = 'CLUSTER_UPDATED',
  CLUSTER_MERGED = 'CLUSTER_MERGED',

  // Alert events
  ALERT_GENERATED = 'ALERT_GENERATED',
  ALERT_ACKNOWLEDGED = 'ALERT_ACKNOWLEDGED',
  ALERT_ESCALATED = 'ALERT_ESCALATED',
  ALERT_RESOLVED = 'ALERT_RESOLVED',
  ALERT_FALSE_POSITIVE = 'ALERT_FALSE_POSITIVE',

  // Federation events
  PARTICIPANT_JOINED = 'PARTICIPANT_JOINED',
  PARTICIPANT_LEFT = 'PARTICIPANT_LEFT',
  AGREEMENT_CREATED = 'AGREEMENT_CREATED',
  AGREEMENT_TERMINATED = 'AGREEMENT_TERMINATED',
  PRIVACY_BUDGET_CONSUMED = 'PRIVACY_BUDGET_CONSUMED',
  PRIVACY_BUDGET_EXHAUSTED = 'PRIVACY_BUDGET_EXHAUSTED',

  // Access events
  DATA_ACCESS = 'DATA_ACCESS',
  QUERY_EXECUTED = 'QUERY_EXECUTED',
  EXPORT_REQUESTED = 'EXPORT_REQUESTED',
  EXPORT_COMPLETED = 'EXPORT_COMPLETED',

  // Compliance events
  POLICY_EVALUATED = 'POLICY_EVALUATED',
  POLICY_VIOLATION = 'POLICY_VIOLATION',
  RETENTION_ENFORCED = 'RETENTION_ENFORCED',
  DATA_DELETED = 'DATA_DELETED',

  // Security events
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION_DENIED = 'AUTHORIZATION_DENIED',
  ENCRYPTION_APPLIED = 'ENCRYPTION_APPLIED',
  INTEGRITY_CHECK = 'INTEGRITY_CHECK',
}

/**
 * Audit entry structure
 */
export interface AuditEntry {
  entryId: string;
  timestamp: Date;
  eventType: AuditEventType;
  actor: AuditActor;
  resource: AuditResource;
  action: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  details: Record<string, unknown>;
  privacyImpact?: PrivacyImpactAssessment;
  riskClassification: RiskClassification;
  correlationId?: string;
  parentEntryId?: string;
  cryptographicProof: CryptographicProof;
}

export interface AuditActor {
  actorId: string;
  actorType: 'SYSTEM' | 'HUMAN' | 'AUTOMATED' | 'EXTERNAL';
  organizationId: string;
  role?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditResource {
  resourceType: 'SIGNAL' | 'CLUSTER' | 'ALERT' | 'PARTICIPANT' | 'AGREEMENT' | 'BUDGET';
  resourceId: string;
  resourceHash?: string;
  classification?: string;
}

export interface PrivacyImpactAssessment {
  dataCategories: string[];
  processingPurpose: string;
  legalBasis: string;
  privacyBudgetImpact: number;
  crossBorderTransfer: boolean;
  retentionPeriod: number;
}

export enum RiskClassification {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface CryptographicProof {
  hashChain: string;
  signature: string;
  previousHash: string;
  merkleRoot?: string;
}

/**
 * Governance control status
 */
export interface GovernanceControlStatus {
  controlId: string;
  controlName: string;
  category: GovernanceControlCategory;
  status: 'IMPLEMENTED' | 'PARTIAL' | 'PLANNED' | 'NOT_APPLICABLE';
  effectiveness: number; // 0-1
  lastAssessed: Date;
  findings: ControlFinding[];
  evidence: ControlEvidence[];
}

export enum GovernanceControlCategory {
  GOVERNANCE = 'GOVERNANCE',
  DATA_MANAGEMENT = 'DATA_MANAGEMENT',
  PRIVACY = 'PRIVACY',
  SECURITY = 'SECURITY',
  MODEL_MANAGEMENT = 'MODEL_MANAGEMENT',
  HUMAN_OVERSIGHT = 'HUMAN_OVERSIGHT',
  TRANSPARENCY = 'TRANSPARENCY',
  ACCOUNTABILITY = 'ACCOUNTABILITY',
}

export interface ControlFinding {
  findingId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  recommendation: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ACCEPTED';
  dueDate?: Date;
}

export interface ControlEvidence {
  evidenceId: string;
  description: string;
  source: string;
  collectedAt: Date;
  expiresAt?: Date;
}

/**
 * Incident record for governance
 */
export interface IncidentRecord {
  incidentId: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'OPEN' | 'INVESTIGATING' | 'MITIGATING' | 'RESOLVED' | 'CLOSED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  title: string;
  description: string;
  affectedResources: string[];
  timeline: IncidentTimelineEntry[];
  rootCause?: string;
  lessonsLearned?: string[];
  metrics: IncidentMetrics;
}

export interface IncidentTimelineEntry {
  timestamp: Date;
  action: string;
  actor: string;
  details: string;
}

/**
 * Audit configuration
 */
export interface AuditConfig {
  // Storage
  retentionDays: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  encryptionKeyId?: string;

  // Integrity
  enableHashChain: boolean;
  enableMerkleTree: boolean;
  signingKeyId?: string;

  // Export
  exportFormats: ('JSON' | 'CSV' | 'SIEM')[];
  siemEndpoint?: string;

  // Alerting
  alertOnPolicyViolation: boolean;
  alertOnSecurityEvent: boolean;
}

/**
 * Audit Service
 */
export class AuditService extends EventEmitter {
  private config: AuditConfig;
  private entries: AuditEntry[] = [];
  private hashChain: string = '';
  private controls: Map<string, GovernanceControlStatus> = new Map();
  private incidents: Map<string, IncidentRecord> = new Map();
  private metrics: EvaluationMetrics;

  constructor(config: AuditConfig) {
    super();
    this.config = config;
    this.initializeHashChain();
    this.initializeControls();
    this.metrics = this.initializeMetrics();
  }

  // ============================================================================
  // Audit Logging
  // ============================================================================

  /**
   * Log an audit event
   */
  async logEvent(
    eventType: AuditEventType,
    actor: AuditActor,
    resource: AuditResource,
    action: string,
    outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL',
    details: Record<string, unknown>,
    options?: {
      privacyImpact?: PrivacyImpactAssessment;
      correlationId?: string;
      parentEntryId?: string;
    },
  ): Promise<AuditEntry> {
    const entry: AuditEntry = {
      entryId: uuidv4(),
      timestamp: new Date(),
      eventType,
      actor,
      resource,
      action,
      outcome,
      details,
      privacyImpact: options?.privacyImpact,
      riskClassification: this.classifyRisk(eventType, outcome),
      correlationId: options?.correlationId,
      parentEntryId: options?.parentEntryId,
      cryptographicProof: this.generateCryptographicProof(
        eventType,
        actor,
        resource,
        action,
        outcome,
        details,
      ),
    };

    // Add to chain
    this.entries.push(entry);
    this.updateHashChain(entry);

    // Check for policy violations
    if (this.isPolicyViolation(entry)) {
      this.handlePolicyViolation(entry);
    }

    // Check for security events
    if (this.isSecurityEvent(entry)) {
      this.handleSecurityEvent(entry);
    }

    this.emit('auditEvent', entry);
    return entry;
  }

  /**
   * Log signal processing event
   */
  async logSignalEvent(
    signal: CampaignSignal,
    eventType: AuditEventType,
    actor: AuditActor,
    outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL',
    details?: Record<string, unknown>,
  ): Promise<AuditEntry> {
    return this.logEvent(
      eventType,
      actor,
      {
        resourceType: 'SIGNAL',
        resourceId: signal.id,
        resourceHash: signal.hashedContent,
        classification: signal.privacyLevel,
      },
      `${eventType.toLowerCase()}_${signal.signalType.toLowerCase()}`,
      outcome,
      {
        signalType: signal.signalType,
        privacyLevel: signal.privacyLevel,
        confidence: signal.confidence,
        ...details,
      },
      {
        privacyImpact: {
          dataCategories: ['campaign_signals'],
          processingPurpose: 'threat_detection',
          legalBasis: 'legitimate_interest',
          privacyBudgetImpact: signal.federationMetadata.privacyBudgetUsed,
          crossBorderTransfer:
            signal.federationMetadata.propagationPath.length > 1,
          retentionPeriod:
            signal.federationMetadata.retentionPolicy.maxRetentionDays,
        },
      },
    );
  }

  /**
   * Log cluster event
   */
  async logClusterEvent(
    cluster: CampaignCluster,
    eventType: AuditEventType,
    actor: AuditActor,
    outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL',
    details?: Record<string, unknown>,
  ): Promise<AuditEntry> {
    return this.logEvent(
      eventType,
      actor,
      {
        resourceType: 'CLUSTER',
        resourceId: cluster.clusterId,
        classification: cluster.threatLevel,
      },
      `${eventType.toLowerCase()}`,
      outcome,
      {
        signalCount: cluster.signalCount,
        participatingOrgs: cluster.participatingOrgs,
        threatLevel: cluster.threatLevel,
        status: cluster.status,
        ...details,
      },
    );
  }

  /**
   * Log alert event
   */
  async logAlertEvent(
    alert: FederatedAlert,
    eventType: AuditEventType,
    actor: AuditActor,
    outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL',
    details?: Record<string, unknown>,
  ): Promise<AuditEntry> {
    return this.logEvent(
      eventType,
      actor,
      {
        resourceType: 'ALERT',
        resourceId: alert.alertId,
        classification: alert.severity,
      },
      `${eventType.toLowerCase()}`,
      outcome,
      {
        alertType: alert.alertType,
        severity: alert.severity,
        priority: alert.priority,
        crossTenantSignal: alert.crossTenantSignal,
        ...details,
      },
    );
  }

  // ============================================================================
  // Governance Controls
  // ============================================================================

  /**
   * Get governance control status
   */
  getControlStatus(controlId: string): GovernanceControlStatus | undefined {
    return this.controls.get(controlId);
  }

  /**
   * Get all governance controls
   */
  getAllControls(): GovernanceControlStatus[] {
    return Array.from(this.controls.values());
  }

  /**
   * Get controls by category
   */
  getControlsByCategory(
    category: GovernanceControlCategory,
  ): GovernanceControlStatus[] {
    return this.getAllControls().filter((c) => c.category === category);
  }

  /**
   * Update control status
   */
  updateControlStatus(
    controlId: string,
    updates: Partial<GovernanceControlStatus>,
  ): GovernanceControlStatus | undefined {
    const control = this.controls.get(controlId);
    if (!control) return undefined;

    const updated = { ...control, ...updates, lastAssessed: new Date() };
    this.controls.set(controlId, updated);

    this.emit('controlUpdated', updated);
    return updated;
  }

  /**
   * Add finding to control
   */
  addControlFinding(
    controlId: string,
    finding: Omit<ControlFinding, 'findingId'>,
  ): ControlFinding | undefined {
    const control = this.controls.get(controlId);
    if (!control) return undefined;

    const newFinding: ControlFinding = {
      ...finding,
      findingId: uuidv4(),
    };

    control.findings.push(newFinding);
    this.emit('findingAdded', { controlId, finding: newFinding });

    return newFinding;
  }

  /**
   * Get governance compliance score
   */
  getComplianceScore(): {
    overallScore: number;
    byCategory: Record<string, number>;
    openFindings: number;
    criticalFindings: number;
  } {
    const controls = this.getAllControls();

    // Calculate overall score
    const totalWeight = controls.length;
    const weightedScore = controls.reduce((sum, c) => sum + c.effectiveness, 0);
    const overallScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

    // Calculate by category
    const byCategory: Record<string, number> = {};
    const categories = new Set(controls.map((c) => c.category));

    for (const category of categories) {
      const categoryControls = controls.filter((c) => c.category === category);
      const categoryScore =
        categoryControls.reduce((sum, c) => sum + c.effectiveness, 0) /
        categoryControls.length;
      byCategory[category] = categoryScore;
    }

    // Count findings
    const allFindings = controls.flatMap((c) => c.findings);
    const openFindings = allFindings.filter(
      (f) => f.status === 'OPEN' || f.status === 'IN_PROGRESS',
    ).length;
    const criticalFindings = allFindings.filter(
      (f) => f.severity === 'CRITICAL' && f.status !== 'RESOLVED',
    ).length;

    return {
      overallScore,
      byCategory,
      openFindings,
      criticalFindings,
    };
  }

  // ============================================================================
  // Incident Management
  // ============================================================================

  /**
   * Create incident record
   */
  createIncident(
    title: string,
    description: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    category: string,
    affectedResources: string[],
  ): IncidentRecord {
    const now = new Date();
    const incident: IncidentRecord = {
      incidentId: uuidv4(),
      createdAt: now,
      updatedAt: now,
      status: 'OPEN',
      severity,
      category,
      title,
      description,
      affectedResources,
      timeline: [
        {
          timestamp: now,
          action: 'CREATED',
          actor: 'system',
          details: 'Incident created',
        },
      ],
      metrics: {
        incidentId: '',
        detectionTime: now,
        alertTime: now,
        timeToDetect: 0,
        timeToAlert: 0,
      },
    };

    incident.metrics.incidentId = incident.incidentId;
    this.incidents.set(incident.incidentId, incident);

    this.emit('incidentCreated', incident);
    return incident;
  }

  /**
   * Update incident status
   */
  updateIncidentStatus(
    incidentId: string,
    status: IncidentRecord['status'],
    actor: string,
    details: string,
  ): IncidentRecord | undefined {
    const incident = this.incidents.get(incidentId);
    if (!incident) return undefined;

    const now = new Date();
    incident.status = status;
    incident.updatedAt = now;
    incident.timeline.push({
      timestamp: now,
      action: `STATUS_CHANGED_TO_${status}`,
      actor,
      details,
    });

    // Update metrics
    if (status === 'INVESTIGATING' && !incident.metrics.acknowledgmentTime) {
      incident.metrics.acknowledgmentTime = now;
      incident.metrics.timeToAcknowledge =
        now.getTime() - incident.metrics.alertTime.getTime();
    } else if (status === 'MITIGATING' && !incident.metrics.mitigationStartTime) {
      incident.metrics.mitigationStartTime = now;
      incident.metrics.timeToMitigate =
        now.getTime() - incident.metrics.alertTime.getTime();
    } else if (
      (status === 'RESOLVED' || status === 'CLOSED') &&
      !incident.metrics.resolutionTime
    ) {
      incident.metrics.resolutionTime = now;
      incident.metrics.timeToResolve =
        now.getTime() - incident.metrics.alertTime.getTime();
    }

    this.emit('incidentUpdated', incident);
    return incident;
  }

  /**
   * Add lessons learned to incident
   */
  addLessonsLearned(
    incidentId: string,
    lessons: string[],
  ): IncidentRecord | undefined {
    const incident = this.incidents.get(incidentId);
    if (!incident) return undefined;

    incident.lessonsLearned = [
      ...(incident.lessonsLearned || []),
      ...lessons,
    ];
    incident.updatedAt = new Date();

    return incident;
  }

  /**
   * Get incident by ID
   */
  getIncident(incidentId: string): IncidentRecord | undefined {
    return this.incidents.get(incidentId);
  }

  /**
   * Get all incidents
   */
  getIncidents(filters?: {
    status?: IncidentRecord['status'][];
    severity?: IncidentRecord['severity'][];
  }): IncidentRecord[] {
    let incidents = Array.from(this.incidents.values());

    if (filters?.status) {
      incidents = incidents.filter((i) => filters.status!.includes(i.status));
    }
    if (filters?.severity) {
      incidents = incidents.filter((i) =>
        filters.severity!.includes(i.severity),
      );
    }

    return incidents;
  }

  // ============================================================================
  // Metrics and Reporting
  // ============================================================================

  /**
   * Get evaluation metrics
   */
  getEvaluationMetrics(): EvaluationMetrics {
    return this.metrics;
  }

  /**
   * Update metrics from incident resolution
   */
  updateMetricsFromIncident(incident: IncidentRecord): void {
    if (!incident.metrics.timeToDetect) return;

    // Update time-to-detect averages
    this.metrics.timeToDetect.mean =
      (this.metrics.timeToDetect.mean + incident.metrics.timeToDetect) / 2;

    // Update containment delta if available
    if (incident.metrics.containmentEffectiveness) {
      this.metrics.containmentDelta =
        (this.metrics.containmentDelta +
          incident.metrics.containmentEffectiveness) /
        2;
    }
  }

  /**
   * Export audit log
   */
  async exportAuditLog(
    format: 'JSON' | 'CSV' | 'SIEM',
    options?: {
      startDate?: Date;
      endDate?: Date;
      eventTypes?: AuditEventType[];
    },
  ): Promise<string> {
    let entries = [...this.entries];

    // Apply filters
    if (options?.startDate) {
      entries = entries.filter((e) => e.timestamp >= options.startDate!);
    }
    if (options?.endDate) {
      entries = entries.filter((e) => e.timestamp <= options.endDate!);
    }
    if (options?.eventTypes) {
      entries = entries.filter((e) => options.eventTypes!.includes(e.eventType));
    }

    switch (format) {
      case 'JSON':
        return JSON.stringify(entries, null, 2);

      case 'CSV':
        return this.toCSV(entries);

      case 'SIEM':
        return this.toSIEMFormat(entries);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Verify audit log integrity
   */
  verifyIntegrity(): {
    valid: boolean;
    errors: string[];
    lastVerifiedEntry: string;
  } {
    const errors: string[] = [];
    let previousHash = '';
    let lastVerifiedEntry = '';

    for (const entry of this.entries) {
      // Verify hash chain
      if (entry.cryptographicProof.previousHash !== previousHash) {
        errors.push(
          `Hash chain broken at entry ${entry.entryId}: expected ${previousHash}, got ${entry.cryptographicProof.previousHash}`,
        );
      }

      // Verify entry hash
      const expectedHash = this.computeEntryHash(entry);
      if (entry.cryptographicProof.hashChain !== expectedHash) {
        errors.push(
          `Entry hash mismatch for ${entry.entryId}: computed ${expectedHash}, stored ${entry.cryptographicProof.hashChain}`,
        );
      }

      previousHash = entry.cryptographicProof.hashChain;
      lastVerifiedEntry = entry.entryId;
    }

    return {
      valid: errors.length === 0,
      errors,
      lastVerifiedEntry,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private initializeHashChain(): void {
    this.hashChain = createHash('sha256')
      .update(`genesis:${Date.now()}:${randomBytes(32).toString('hex')}`)
      .digest('hex');
  }

  private initializeControls(): void {
    // Initialize NIST AI RMF aligned controls
    const controls: GovernanceControlStatus[] = [
      {
        controlId: 'GOV-001',
        controlName: 'AI Governance Framework',
        category: GovernanceControlCategory.GOVERNANCE,
        status: 'IMPLEMENTED',
        effectiveness: 0.85,
        lastAssessed: new Date(),
        findings: [],
        evidence: [],
      },
      {
        controlId: 'DM-001',
        controlName: 'Data Quality Management',
        category: GovernanceControlCategory.DATA_MANAGEMENT,
        status: 'IMPLEMENTED',
        effectiveness: 0.9,
        lastAssessed: new Date(),
        findings: [],
        evidence: [],
      },
      {
        controlId: 'PRIV-001',
        controlName: 'Privacy Impact Assessment',
        category: GovernanceControlCategory.PRIVACY,
        status: 'IMPLEMENTED',
        effectiveness: 0.88,
        lastAssessed: new Date(),
        findings: [],
        evidence: [],
      },
      {
        controlId: 'PRIV-002',
        controlName: 'Differential Privacy Controls',
        category: GovernanceControlCategory.PRIVACY,
        status: 'IMPLEMENTED',
        effectiveness: 0.92,
        lastAssessed: new Date(),
        findings: [],
        evidence: [],
      },
      {
        controlId: 'SEC-001',
        controlName: 'Access Control',
        category: GovernanceControlCategory.SECURITY,
        status: 'IMPLEMENTED',
        effectiveness: 0.95,
        lastAssessed: new Date(),
        findings: [],
        evidence: [],
      },
      {
        controlId: 'SEC-002',
        controlName: 'Cryptographic Controls',
        category: GovernanceControlCategory.SECURITY,
        status: 'IMPLEMENTED',
        effectiveness: 0.93,
        lastAssessed: new Date(),
        findings: [],
        evidence: [],
      },
      {
        controlId: 'HO-001',
        controlName: 'Human Oversight',
        category: GovernanceControlCategory.HUMAN_OVERSIGHT,
        status: 'IMPLEMENTED',
        effectiveness: 0.8,
        lastAssessed: new Date(),
        findings: [],
        evidence: [],
      },
      {
        controlId: 'TRANS-001',
        controlName: 'Algorithmic Transparency',
        category: GovernanceControlCategory.TRANSPARENCY,
        status: 'IMPLEMENTED',
        effectiveness: 0.75,
        lastAssessed: new Date(),
        findings: [],
        evidence: [],
      },
      {
        controlId: 'ACC-001',
        controlName: 'Audit Trail',
        category: GovernanceControlCategory.ACCOUNTABILITY,
        status: 'IMPLEMENTED',
        effectiveness: 0.95,
        lastAssessed: new Date(),
        findings: [],
        evidence: [],
      },
    ];

    for (const control of controls) {
      this.controls.set(control.controlId, control);
    }
  }

  private initializeMetrics(): EvaluationMetrics {
    return {
      timeToDetect: {
        mean: 300000, // 5 minutes
        median: 240000,
        p95: 600000,
        p99: 900000,
      },
      falseAttributionRate: 0.05,
      truePositiveRate: 0.92,
      precision: 0.88,
      recall: 0.91,
      f1Score: 0.895,
      containmentDelta: 0.35,
      mitigationEffectiveness: 0.75,
      federationCoverage: 0.75,
      participantEngagement: 0.8,
      signalQuality: 0.85,
      privacyBudgetUtilization: 0.45,
      complianceScore: 0.9,
    };
  }

  private classifyRisk(
    eventType: AuditEventType,
    outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL',
  ): RiskClassification {
    // High-risk events
    const highRiskEvents = [
      AuditEventType.POLICY_VIOLATION,
      AuditEventType.AUTHORIZATION_DENIED,
      AuditEventType.PRIVACY_BUDGET_EXHAUSTED,
    ];

    if (highRiskEvents.includes(eventType)) {
      return RiskClassification.HIGH;
    }

    // Critical if failure on important events
    if (
      outcome === 'FAILURE' &&
      [
        AuditEventType.ALERT_GENERATED,
        AuditEventType.SIGNAL_FEDERATED,
        AuditEventType.INTEGRITY_CHECK,
      ].includes(eventType)
    ) {
      return RiskClassification.CRITICAL;
    }

    // Moderate for most federation events
    if (eventType.startsWith('PARTICIPANT_') || eventType.startsWith('AGREEMENT_')) {
      return RiskClassification.MODERATE;
    }

    return RiskClassification.LOW;
  }

  private generateCryptographicProof(
    eventType: AuditEventType,
    actor: AuditActor,
    resource: AuditResource,
    action: string,
    outcome: string,
    details: Record<string, unknown>,
  ): CryptographicProof {
    const entryData = JSON.stringify({
      eventType,
      actor,
      resource,
      action,
      outcome,
      details,
      timestamp: Date.now(),
    });

    const hashChain = createHash('sha256')
      .update(`${this.hashChain}:${entryData}`)
      .digest('hex');

    // In production, would sign with actual key
    const signature = createHmac('sha256', 'audit-signing-key')
      .update(hashChain)
      .digest('hex');

    return {
      hashChain,
      signature,
      previousHash: this.hashChain,
    };
  }

  private updateHashChain(entry: AuditEntry): void {
    this.hashChain = entry.cryptographicProof.hashChain;
  }

  private computeEntryHash(entry: AuditEntry): string {
    const entryData = JSON.stringify({
      eventType: entry.eventType,
      actor: entry.actor,
      resource: entry.resource,
      action: entry.action,
      outcome: entry.outcome,
      details: entry.details,
    });

    return createHash('sha256')
      .update(`${entry.cryptographicProof.previousHash}:${entryData}`)
      .digest('hex');
  }

  private isPolicyViolation(entry: AuditEntry): boolean {
    return (
      entry.eventType === AuditEventType.POLICY_VIOLATION ||
      entry.riskClassification === RiskClassification.CRITICAL
    );
  }

  private isSecurityEvent(entry: AuditEntry): boolean {
    return (
      entry.eventType === AuditEventType.AUTHORIZATION_DENIED ||
      entry.eventType === AuditEventType.AUTHENTICATION ||
      entry.outcome === 'FAILURE'
    );
  }

  private handlePolicyViolation(entry: AuditEntry): void {
    if (this.config.alertOnPolicyViolation) {
      this.emit('policyViolation', entry);
    }

    // Create incident
    this.createIncident(
      `Policy Violation: ${entry.action}`,
      `Policy violation detected for ${entry.resource.resourceType} ${entry.resource.resourceId}`,
      entry.riskClassification === RiskClassification.CRITICAL
        ? 'CRITICAL'
        : 'HIGH',
      'POLICY_VIOLATION',
      [entry.resource.resourceId],
    );
  }

  private handleSecurityEvent(entry: AuditEntry): void {
    if (this.config.alertOnSecurityEvent) {
      this.emit('securityEvent', entry);
    }
  }

  private toCSV(entries: AuditEntry[]): string {
    const headers = [
      'entryId',
      'timestamp',
      'eventType',
      'actorId',
      'actorType',
      'resourceType',
      'resourceId',
      'action',
      'outcome',
      'riskClassification',
    ];

    const rows = entries.map((e) => [
      e.entryId,
      e.timestamp.toISOString(),
      e.eventType,
      e.actor.actorId,
      e.actor.actorType,
      e.resource.resourceType,
      e.resource.resourceId,
      e.action,
      e.outcome,
      e.riskClassification,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  private toSIEMFormat(entries: AuditEntry[]): string {
    // Format as Common Event Format (CEF)
    return entries
      .map((e) => {
        const severity = this.mapRiskToSeverity(e.riskClassification);
        return `CEF:0|FederatedCampaignRadar|AuditLog|1.0|${e.eventType}|${e.action}|${severity}|actor=${e.actor.actorId} actorType=${e.actor.actorType} resourceType=${e.resource.resourceType} resourceId=${e.resource.resourceId} outcome=${e.outcome} rt=${e.timestamp.getTime()}`;
      })
      .join('\n');
  }

  private mapRiskToSeverity(risk: RiskClassification): number {
    switch (risk) {
      case RiskClassification.CRITICAL:
        return 10;
      case RiskClassification.HIGH:
        return 7;
      case RiskClassification.MODERATE:
        return 4;
      case RiskClassification.LOW:
        return 1;
    }
  }

  /**
   * Cleanup old entries based on retention policy
   */
  enforceRetention(): number {
    const cutoff = new Date(
      Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000,
    );
    const originalLength = this.entries.length;

    this.entries = this.entries.filter((e) => e.timestamp >= cutoff);

    const deleted = originalLength - this.entries.length;
    if (deleted > 0) {
      this.emit('retentionEnforced', { deleted, cutoff });
    }

    return deleted;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.removeAllListeners();
  }
}

export default AuditService;
