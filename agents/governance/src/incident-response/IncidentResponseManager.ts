/**
 * Incident Response System
 *
 * Provides automated detection, escalation, and mitigation of AI agent incidents
 * including misuse, policy violations, safety breaches, and supply chain issues.
 */

import crypto from 'node:crypto';
import {
  Incident,
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
  IncidentEvidence,
  IncidentEvent,
  IncidentMitigation,
  IncidentDetector,
  DetectorThreshold,
  DetectorAction,
  GovernanceEvent,
  AgentId,
  FleetId,
  SessionId,
  AgentClassification,
} from '../types';

// ============================================================================
// Configuration
// ============================================================================

export interface IncidentResponseConfig {
  enabled: boolean;
  autoMitigate: boolean;
  escalationTimeoutMs: number;
  retentionDays: number;
  notificationChannels: NotificationChannel[];
  severityEscalation: Record<IncidentSeverity, string[]>;
  mitigationPolicies: MitigationPolicy[];
}

export interface NotificationChannel {
  id: string;
  type: 'email' | 'slack' | 'pagerduty' | 'webhook' | 'siem';
  config: Record<string, unknown>;
  severityFilter: IncidentSeverity[];
}

export interface MitigationPolicy {
  incidentType: IncidentType;
  severity: IncidentSeverity;
  actions: MitigationAction[];
  requiresApproval: boolean;
  approvers?: string[];
}

export interface MitigationAction {
  type: 'isolate' | 'throttle' | 'block' | 'rollback' | 'alert' | 'terminate';
  target: 'agent' | 'fleet' | 'session' | 'user';
  parameters: Record<string, unknown>;
  automated: boolean;
}

const DEFAULT_CONFIG: IncidentResponseConfig = {
  enabled: true,
  autoMitigate: true,
  escalationTimeoutMs: 300_000, // 5 minutes
  retentionDays: 90,
  notificationChannels: [],
  severityEscalation: {
    low: ['team-lead'],
    medium: ['team-lead', 'manager'],
    high: ['team-lead', 'manager', 'director'],
    critical: ['team-lead', 'manager', 'director', 'vp'],
    catastrophic: ['team-lead', 'manager', 'director', 'vp', 'ciso'],
  },
  mitigationPolicies: [],
};

// ============================================================================
// Incident Response Manager
// ============================================================================

export class IncidentResponseManager {
  private config: IncidentResponseConfig;
  private incidents: Map<string, Incident>;
  private detectors: Map<string, IncidentDetector>;
  private eventBuffer: GovernanceEvent[];
  private eventListeners: Array<(event: GovernanceEvent) => void>;
  private metrics: IncidentMetrics;

  constructor(config: Partial<IncidentResponseConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.incidents = new Map();
    this.detectors = new Map();
    this.eventBuffer = [];
    this.eventListeners = [];
    this.metrics = this.initializeMetrics();

    // Register default detectors
    this.registerDefaultDetectors();
  }

  /**
   * Report a new incident
   */
  async reportIncident(params: {
    type: IncidentType;
    severity: IncidentSeverity;
    title: string;
    description: string;
    affectedAgents?: AgentId[];
    affectedFleets?: FleetId[];
    affectedSessions?: SessionId[];
    evidence?: Partial<IncidentEvidence>[];
    reporter: string;
    classification: AgentClassification;
  }): Promise<Incident> {
    const incident: Incident = {
      id: `INC-${Date.now()}-${crypto.randomUUID().substring(0, 8)}`,
      type: params.type,
      severity: params.severity,
      status: 'detected',
      title: params.title,
      description: params.description,
      detectedAt: new Date(),
      affectedAgents: params.affectedAgents || [],
      affectedFleets: params.affectedFleets || [],
      affectedSessions: params.affectedSessions || [],
      evidence: (params.evidence || []).map((e) => this.createEvidence(e)),
      timeline: [
        {
          timestamp: new Date(),
          type: 'detection',
          actor: params.reporter,
          description: `Incident detected: ${params.title}`,
          automated: false,
        },
      ],
      mitigations: [],
      assignees: [],
      escalationPath: this.config.severityEscalation[params.severity] || [],
    };

    this.incidents.set(incident.id, incident);
    this.updateMetrics('detected', params.severity);

    // Emit detection event
    this.emitEvent({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type: 'incident_detected',
      source: 'IncidentResponseManager',
      actor: params.reporter,
      action: 'report_incident',
      resource: incident.id,
      outcome: 'success',
      classification: params.classification,
      details: {
        incidentType: params.type,
        severity: params.severity,
        title: params.title,
      },
    });

    // Auto-escalate based on severity
    await this.escalateIncident(incident);

    // Auto-mitigate if enabled
    if (this.config.autoMitigate) {
      await this.autoMitigate(incident);
    }

    // Send notifications
    await this.sendNotifications(incident, 'detected');

    return incident;
  }

  /**
   * Process incoming governance event for incident detection
   */
  async processEvent(event: GovernanceEvent): Promise<Incident | null> {
    this.eventBuffer.push(event);

    // Keep buffer size manageable
    if (this.eventBuffer.length > 10000) {
      this.eventBuffer = this.eventBuffer.slice(-5000);
    }

    // Run all detectors
    for (const detector of this.detectors.values()) {
      if (!detector.enabled) continue;

      const detection = await this.runDetector(detector, event);
      if (detection) {
        return detection;
      }
    }

    return null;
  }

  /**
   * Run an incident detector against an event
   */
  private async runDetector(
    detector: IncidentDetector,
    event: GovernanceEvent,
  ): Promise<Incident | null> {
    // Check if event type matches detector
    const relevantTypes = this.mapIncidentTypeToEventTypes(detector.type);
    if (!relevantTypes.includes(event.type)) {
      return null;
    }

    // Check thresholds
    for (const threshold of detector.thresholds) {
      const isTriggered = await this.checkThreshold(threshold, event);
      if (isTriggered) {
        // Find matching action
        const action = detector.actions.find(
          (a) => a.trigger === 'threshold_exceeded',
        );

        if (action) {
          return this.createIncidentFromDetection(detector, threshold, event, action);
        }
      }
    }

    return null;
  }

  /**
   * Check if a threshold is triggered
   */
  private async checkThreshold(
    threshold: DetectorThreshold,
    event: GovernanceEvent,
  ): Promise<boolean> {
    const windowStart = Date.now() - threshold.window;

    // Count events in window matching the metric
    const matchingEvents = this.eventBuffer.filter((e) => {
      return (
        e.timestamp.getTime() >= windowStart &&
        this.eventMatchesMetric(e, threshold.metric)
      );
    });

    const count = matchingEvents.length;

    switch (threshold.operator) {
      case 'gt':
        return count > threshold.value;
      case 'gte':
        return count >= threshold.value;
      case 'lt':
        return count < threshold.value;
      case 'lte':
        return count <= threshold.value;
      case 'eq':
        return count === threshold.value;
      case 'anomaly':
        return this.detectAnomaly(matchingEvents, threshold.value);
      default:
        return false;
    }
  }

  /**
   * Check if event matches a metric pattern
   */
  private eventMatchesMetric(event: GovernanceEvent, metric: string): boolean {
    const [eventType, outcome] = metric.split(':');
    if (eventType && event.type !== eventType) return false;
    if (outcome && event.outcome !== outcome) return false;
    return true;
  }

  /**
   * Simple anomaly detection
   */
  private detectAnomaly(events: GovernanceEvent[], sensitivity: number): boolean {
    if (events.length < 10) return false;

    // Calculate simple moving average and detect spike
    const recentCount = events.filter(
      (e) => e.timestamp.getTime() >= Date.now() - 60_000,
    ).length;
    const historicalAvg = events.length / 10; // Rough average

    return recentCount > historicalAvg * sensitivity;
  }

  /**
   * Create incident from detector finding
   */
  private async createIncidentFromDetection(
    detector: IncidentDetector,
    threshold: DetectorThreshold,
    event: GovernanceEvent,
    action: DetectorAction,
  ): Promise<Incident> {
    return this.reportIncident({
      type: detector.type[0],
      severity: threshold.severity,
      title: `Auto-detected: ${detector.name}`,
      description: `Threshold exceeded for ${threshold.metric}: ${threshold.operator} ${threshold.value}`,
      affectedAgents: event.agentId ? [event.agentId] : [],
      affectedFleets: event.fleetId ? [event.fleetId] : [],
      affectedSessions: event.sessionId ? [event.sessionId] : [],
      evidence: [
        {
          type: 'audit_record',
          source: detector.id,
          data: { event, threshold, action },
        },
      ],
      reporter: 'system/auto-detector',
      classification: event.classification,
    });
  }

  /**
   * Escalate incident based on severity
   */
  private async escalateIncident(incident: Incident): Promise<void> {
    const escalationPath = this.config.severityEscalation[incident.severity] || [];

    if (escalationPath.length === 0) return;

    incident.status = 'investigating';
    incident.assignees = escalationPath;

    incident.timeline.push({
      timestamp: new Date(),
      type: 'escalation',
      actor: 'system',
      description: `Escalated to: ${escalationPath.join(', ')}`,
      automated: true,
    });

    this.incidents.set(incident.id, incident);
  }

  /**
   * Auto-mitigate incident based on policies
   */
  private async autoMitigate(incident: Incident): Promise<void> {
    const policy = this.config.mitigationPolicies.find(
      (p) =>
        p.incidentType === incident.type &&
        this.compareSeverity(incident.severity, p.severity) >= 0,
    );

    if (!policy) return;

    if (policy.requiresApproval) {
      // Queue for approval
      incident.timeline.push({
        timestamp: new Date(),
        type: 'update',
        actor: 'system',
        description: `Mitigation requires approval from: ${policy.approvers?.join(', ')}`,
        automated: true,
      });
      return;
    }

    // Execute automated mitigations
    for (const action of policy.actions.filter((a) => a.automated)) {
      const mitigation = await this.executeMitigation(incident, action);
      incident.mitigations.push(mitigation);
    }

    incident.status = 'mitigating';
    this.incidents.set(incident.id, incident);
  }

  /**
   * Execute a mitigation action
   */
  private async executeMitigation(
    incident: Incident,
    action: MitigationAction,
  ): Promise<IncidentMitigation> {
    const mitigation: IncidentMitigation = {
      id: crypto.randomUUID(),
      action: `${action.type}:${action.target}`,
      status: 'in_progress',
      automated: action.automated,
      startedAt: new Date(),
    };

    try {
      switch (action.type) {
        case 'isolate':
          await this.isolateTarget(action.target, incident);
          break;
        case 'throttle':
          await this.throttleTarget(action.target, incident, action.parameters);
          break;
        case 'block':
          await this.blockTarget(action.target, incident);
          break;
        case 'terminate':
          await this.terminateTarget(action.target, incident);
          break;
        case 'alert':
          // Already handled by notifications
          break;
        case 'rollback':
          // Delegate to rollback manager
          mitigation.rollbackId = await this.triggerRollback(incident, action);
          break;
      }

      mitigation.status = 'completed';
      mitigation.completedAt = new Date();
      mitigation.result = 'Success';
    } catch (error) {
      mitigation.status = 'failed';
      mitigation.completedAt = new Date();
      mitigation.result = error instanceof Error ? error.message : String(error);
    }

    incident.timeline.push({
      timestamp: new Date(),
      type: 'mitigation',
      actor: 'system',
      description: `Mitigation ${action.type} on ${action.target}: ${mitigation.status}`,
      automated: true,
      metadata: { mitigationId: mitigation.id },
    });

    return mitigation;
  }

  /**
   * Mitigation: Isolate target
   */
  private async isolateTarget(
    target: string,
    incident: Incident,
  ): Promise<void> {
    console.log(`[Mitigation] Isolating ${target} for incident ${incident.id}`);
    // Implementation would integrate with agent runtime
  }

  /**
   * Mitigation: Throttle target
   */
  private async throttleTarget(
    target: string,
    incident: Incident,
    params: Record<string, unknown>,
  ): Promise<void> {
    const rate = params.rate as number || 10;
    console.log(`[Mitigation] Throttling ${target} to ${rate} req/s for incident ${incident.id}`);
    // Implementation would integrate with rate limiter
  }

  /**
   * Mitigation: Block target
   */
  private async blockTarget(
    target: string,
    incident: Incident,
  ): Promise<void> {
    console.log(`[Mitigation] Blocking ${target} for incident ${incident.id}`);
    // Implementation would integrate with policy engine
  }

  /**
   * Mitigation: Terminate target
   */
  private async terminateTarget(
    target: string,
    incident: Incident,
  ): Promise<void> {
    console.log(`[Mitigation] Terminating ${target} for incident ${incident.id}`);
    // Implementation would integrate with agent runtime
  }

  /**
   * Mitigation: Trigger rollback
   */
  private async triggerRollback(
    incident: Incident,
    action: MitigationAction,
  ): Promise<string> {
    // Would delegate to RollbackManager
    const rollbackId = crypto.randomUUID();
    console.log(`[Mitigation] Triggering rollback ${rollbackId} for incident ${incident.id}`);
    return rollbackId;
  }

  /**
   * Send notifications for incident
   */
  private async sendNotifications(
    incident: Incident,
    event: 'detected' | 'escalated' | 'mitigated' | 'resolved',
  ): Promise<void> {
    const channels = this.config.notificationChannels.filter((c) =>
      c.severityFilter.includes(incident.severity),
    );

    for (const channel of channels) {
      try {
        await this.sendToChannel(channel, incident, event);
      } catch (error) {
        console.error(`Failed to send notification to ${channel.id}:`, error);
      }
    }
  }

  /**
   * Send notification to a specific channel
   */
  private async sendToChannel(
    channel: NotificationChannel,
    incident: Incident,
    event: string,
  ): Promise<void> {
    const payload = {
      incidentId: incident.id,
      type: incident.type,
      severity: incident.severity,
      title: incident.title,
      event,
      timestamp: new Date().toISOString(),
    };

    switch (channel.type) {
      case 'webhook':
        await fetch(channel.config.url as string, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        break;
      case 'slack':
        // Slack integration
        break;
      case 'pagerduty':
        // PagerDuty integration
        break;
      case 'siem':
        // SIEM integration
        break;
      default:
        console.log(`[Notification] ${channel.type}: ${JSON.stringify(payload)}`);
    }
  }

  /**
   * Resolve an incident
   */
  async resolveIncident(
    incidentId: string,
    resolution: {
      resolver: string;
      rootCause?: string;
      lessonsLearned?: string[];
    },
  ): Promise<Incident | null> {
    const incident = this.incidents.get(incidentId);
    if (!incident) return null;

    incident.status = 'resolved';
    incident.resolvedAt = new Date();
    incident.rootCause = resolution.rootCause;
    incident.lessonsLearned = resolution.lessonsLearned;

    incident.timeline.push({
      timestamp: new Date(),
      type: 'resolution',
      actor: resolution.resolver,
      description: `Incident resolved${resolution.rootCause ? `: ${resolution.rootCause}` : ''}`,
      automated: false,
    });

    this.incidents.set(incidentId, incident);
    this.updateMetrics('resolved', incident.severity);

    // Emit resolution event
    this.emitEvent({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type: 'incident_resolved',
      source: 'IncidentResponseManager',
      actor: resolution.resolver,
      action: 'resolve_incident',
      resource: incidentId,
      outcome: 'success',
      classification: 'UNCLASSIFIED',
      details: {
        rootCause: resolution.rootCause,
        mttr: incident.resolvedAt.getTime() - incident.detectedAt.getTime(),
      },
    });

    await this.sendNotifications(incident, 'resolved');

    return incident;
  }

  /**
   * Register an incident detector
   */
  registerDetector(detector: IncidentDetector): void {
    this.detectors.set(detector.id, detector);
  }

  /**
   * Register default detectors
   */
  private registerDefaultDetectors(): void {
    // Policy violation detector
    this.registerDetector({
      id: 'policy-violation-detector',
      name: 'Policy Violation Detector',
      type: ['policy_violation'],
      enabled: true,
      config: {},
      thresholds: [
        {
          metric: 'policy_violation:failure',
          operator: 'gte',
          value: 5,
          window: 60_000, // 1 minute
          severity: 'high',
        },
        {
          metric: 'policy_violation:failure',
          operator: 'gte',
          value: 20,
          window: 300_000, // 5 minutes
          severity: 'critical',
        },
      ],
      actions: [
        {
          trigger: 'threshold_exceeded',
          action: 'alert',
          automated: true,
          config: {},
        },
        {
          trigger: 'threshold_exceeded',
          action: 'throttle',
          automated: true,
          config: { rate: 5 },
        },
      ],
    });

    // Misuse detector
    this.registerDetector({
      id: 'misuse-detector',
      name: 'Agent Misuse Detector',
      type: ['misuse'],
      enabled: true,
      config: {},
      thresholds: [
        {
          metric: 'policy_violation',
          operator: 'anomaly',
          value: 3, // 3x normal rate
          window: 300_000,
          severity: 'critical',
        },
      ],
      actions: [
        {
          trigger: 'anomaly_detected',
          action: 'block',
          automated: true,
          config: {},
        },
      ],
    });

    // Hallucination rate detector
    this.registerDetector({
      id: 'hallucination-detector',
      name: 'High Hallucination Rate Detector',
      type: ['hallucination'],
      enabled: true,
      config: {},
      thresholds: [
        {
          metric: 'hallucination_detected',
          operator: 'gte',
          value: 10,
          window: 300_000,
          severity: 'high',
        },
      ],
      actions: [
        {
          trigger: 'threshold_exceeded',
          action: 'alert',
          automated: true,
          config: {},
        },
      ],
    });
  }

  /**
   * Map incident types to event types
   */
  private mapIncidentTypeToEventTypes(types: IncidentType[]): string[] {
    const mapping: Record<IncidentType, string[]> = {
      misuse: ['policy_violation', 'policy_evaluation'],
      hallucination: ['hallucination_detected'],
      data_leak: ['policy_violation'],
      policy_violation: ['policy_violation'],
      safety_breach: ['policy_violation', 'incident_detected'],
      integrity_failure: ['attestation_created'],
      availability_issue: ['chain_executed'],
      supply_chain_compromise: ['attestation_created'],
    };

    const eventTypes: string[] = [];
    for (const type of types) {
      eventTypes.push(...(mapping[type] || []));
    }
    return [...new Set(eventTypes)];
  }

  /**
   * Create evidence record
   */
  private createEvidence(partial: Partial<IncidentEvidence>): IncidentEvidence {
    const data = partial.data || {};
    return {
      id: crypto.randomUUID(),
      type: partial.type || 'audit_record',
      source: partial.source || 'unknown',
      timestamp: partial.timestamp || new Date(),
      data,
      hash: crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex'),
      classification: partial.classification || 'UNCLASSIFIED',
    };
  }

  /**
   * Compare severity levels
   */
  private compareSeverity(a: IncidentSeverity, b: IncidentSeverity): number {
    const levels: IncidentSeverity[] = ['low', 'medium', 'high', 'critical', 'catastrophic'];
    return levels.indexOf(a) - levels.indexOf(b);
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): IncidentMetrics {
    return {
      totalIncidents: 0,
      activeIncidents: 0,
      resolvedIncidents: 0,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0, catastrophic: 0 },
      byType: {} as Record<IncidentType, number>,
      mttr: 0,
      lastIncident: null,
    };
  }

  /**
   * Update metrics
   */
  private updateMetrics(event: 'detected' | 'resolved', severity: IncidentSeverity): void {
    if (event === 'detected') {
      this.metrics.totalIncidents++;
      this.metrics.activeIncidents++;
      this.metrics.bySeverity[severity]++;
      this.metrics.lastIncident = new Date();
    } else {
      this.metrics.activeIncidents--;
      this.metrics.resolvedIncidents++;
    }
  }

  /**
   * Get incident by ID
   */
  getIncident(id: string): Incident | null {
    return this.incidents.get(id) || null;
  }

  /**
   * Get all active incidents
   */
  getActiveIncidents(): Incident[] {
    return Array.from(this.incidents.values()).filter(
      (i) => !['resolved', 'post_mortem'].includes(i.status),
    );
  }

  /**
   * Get metrics
   */
  getMetrics(): IncidentMetrics {
    return { ...this.metrics };
  }

  /**
   * Add event listener
   */
  onEvent(listener: (event: GovernanceEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Emit event
   */
  private emitEvent(event: GovernanceEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    }
  }
}

// ============================================================================
// Types
// ============================================================================

interface IncidentMetrics {
  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  bySeverity: Record<IncidentSeverity, number>;
  byType: Record<IncidentType, number>;
  mttr: number;
  lastIncident: Date | null;
}

// ============================================================================
// Singleton Export
// ============================================================================

export const incidentResponseManager = new IncidentResponseManager();
