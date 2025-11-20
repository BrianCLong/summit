/**
 * Event Adapters for System Integrations
 *
 * These adapters convert system-specific events into canonical events
 * that can be processed by the Notification Hub.
 *
 * Integrations:
 * - Alerting & SLO System
 * - Pipeline Orchestrator (Temporal/Conductor)
 * - Copilot & AI Runs
 * - Two-Person Control / Authority Workflows
 * - Investigation & Evidence Events
 */

import {
  CanonicalEvent,
  EventBuilder,
  EventType,
  EventSeverity,
  EventHelpers,
} from '../events/EventSchema.js';
import { NotificationHub } from '../NotificationHub.js';

/**
 * Base Event Adapter Interface
 */
export interface IEventAdapter {
  /**
   * Initialize the adapter and set up event listeners
   */
  initialize(hub: NotificationHub): Promise<void>;

  /**
   * Shutdown the adapter
   */
  shutdown(): Promise<void>;

  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Alerting & SLO Event Adapter
 *
 * Converts alerts and SLO violations into canonical events
 */
export class AlertingEventAdapter implements IEventAdapter {
  private hub: NotificationHub | null = null;
  private initialized = false;

  async initialize(hub: NotificationHub): Promise<void> {
    this.hub = hub;
    this.initialized = true;

    // In production, this would subscribe to alert events from the alerting system
    // For now, we provide methods to be called by the alerting system
  }

  /**
   * Handle alert triggered event
   */
  async handleAlertTriggered(alertData: {
    id: string;
    name: string;
    severity: 'critical' | 'high' | 'warning' | 'info';
    message: string;
    query: string;
    value: number;
    threshold: number;
    labels: Record<string, string>;
    tenantId: string;
    projectId?: string;
    environment?: string;
    dashboardUrl?: string;
  }): Promise<void> {
    if (!this.hub) throw new Error('Adapter not initialized');

    const event = new EventBuilder()
      .type(EventType.ALERT_TRIGGERED)
      .severity(EventHelpers.alertSeverityToEventSeverity(alertData.severity))
      .actor(EventHelpers.systemActor('Alerting System'))
      .subject({
        type: 'alert',
        id: alertData.id,
        name: alertData.name,
        url: alertData.dashboardUrl,
      })
      .context({
        tenantId: alertData.tenantId,
        projectId: alertData.projectId,
        environment: alertData.environment as any,
        tags: alertData.labels,
      })
      .title(`Alert: ${alertData.name}`)
      .message(
        `${alertData.message} (current: ${alertData.value}, threshold: ${alertData.threshold})`,
      )
      .payload({
        alertId: alertData.id,
        query: alertData.query,
        value: alertData.value,
        threshold: alertData.threshold,
        labels: alertData.labels,
      })
      .source('alerting-system')
      .build();

    await this.hub.notify(event);
  }

  /**
   * Handle SLO violation event
   */
  async handleSLOViolation(sloData: {
    id: string;
    name: string;
    errorBudget: number;
    errorBudgetRemaining: number;
    burnRate: number;
    tenantId: string;
    projectId?: string;
    service: string;
    dashboardUrl?: string;
  }): Promise<void> {
    if (!this.hub) throw new Error('Adapter not initialized');

    const severity =
      sloData.errorBudgetRemaining <= 0
        ? EventSeverity.CRITICAL
        : sloData.errorBudgetRemaining < 0.1
          ? EventSeverity.HIGH
          : EventSeverity.MEDIUM;

    const event = new EventBuilder()
      .type(EventType.SLO_VIOLATION)
      .severity(severity)
      .actor(EventHelpers.systemActor('SLO Monitor'))
      .subject({
        type: 'slo',
        id: sloData.id,
        name: sloData.name,
        url: sloData.dashboardUrl,
      })
      .context({
        tenantId: sloData.tenantId,
        projectId: sloData.projectId,
        tags: { service: sloData.service },
      })
      .title(`SLO Violation: ${sloData.name}`)
      .message(
        `Error budget ${(sloData.errorBudgetRemaining * 100).toFixed(2)}% remaining (burn rate: ${sloData.burnRate.toFixed(2)}x)`,
      )
      .payload({
        sloId: sloData.id,
        errorBudget: sloData.errorBudget,
        errorBudgetRemaining: sloData.errorBudgetRemaining,
        burnRate: sloData.burnRate,
        service: sloData.service,
      })
      .source('slo-monitor')
      .build();

    await this.hub.notify(event);
  }

  /**
   * Handle golden path broken event
   */
  async handleGoldenPathBroken(pathData: {
    name: string;
    stage: string;
    environment: string;
    reason: string;
    tenantId: string;
    projectId?: string;
    runUrl?: string;
  }): Promise<void> {
    if (!this.hub) throw new Error('Adapter not initialized');

    const event = new EventBuilder()
      .type(EventType.GOLDEN_PATH_BROKEN)
      .severity(
        pathData.environment === 'production'
          ? EventSeverity.CRITICAL
          : EventSeverity.HIGH,
      )
      .actor(EventHelpers.systemActor('Golden Path Monitor'))
      .subject({
        type: 'golden_path',
        id: pathData.name,
        name: pathData.name,
        url: pathData.runUrl,
      })
      .context({
        tenantId: pathData.tenantId,
        projectId: pathData.projectId,
        environment: pathData.environment as any,
        tags: { stage: pathData.stage },
      })
      .title(`Golden Path Broken: ${pathData.name} in ${pathData.environment}`)
      .message(`Stage '${pathData.stage}' failed: ${pathData.reason}`)
      .payload({
        path: pathData.name,
        stage: pathData.stage,
        environment: pathData.environment,
        reason: pathData.reason,
      })
      .source('golden-path-monitor')
      .build();

    await this.hub.notify(event);
  }

  async shutdown(): Promise<void> {
    this.hub = null;
    this.initialized = false;
  }

  async healthCheck(): Promise<boolean> {
    return this.initialized;
  }
}

/**
 * Pipeline Orchestrator Event Adapter
 *
 * Converts pipeline/workflow events into canonical events
 */
export class PipelineEventAdapter implements IEventAdapter {
  private hub: NotificationHub | null = null;
  private initialized = false;

  async initialize(hub: NotificationHub): Promise<void> {
    this.hub = hub;
    this.initialized = true;
  }

  /**
   * Handle pipeline failure event
   */
  async handlePipelineFailure(pipelineData: {
    id: string;
    name: string;
    runId: string;
    failedStage: string;
    error: string;
    userId?: string;
    userName?: string;
    tenantId: string;
    projectId?: string;
    pipelineUrl?: string;
  }): Promise<void> {
    if (!this.hub) throw new Error('Adapter not initialized');

    const event = new EventBuilder()
      .type(EventType.PIPELINE_FAILED)
      .severity(EventSeverity.HIGH)
      .actor(
        pipelineData.userId
          ? EventHelpers.userActor(pipelineData.userId, pipelineData.userName || 'Unknown')
          : EventHelpers.systemActor('Pipeline Orchestrator'),
      )
      .subject({
        type: 'pipeline',
        id: pipelineData.id,
        name: pipelineData.name,
        url: pipelineData.pipelineUrl,
      })
      .context({
        tenantId: pipelineData.tenantId,
        projectId: pipelineData.projectId,
        tags: { runId: pipelineData.runId },
      })
      .title(`Pipeline Failed: ${pipelineData.name}`)
      .message(`Stage '${pipelineData.failedStage}' failed: ${pipelineData.error}`)
      .payload({
        pipelineId: pipelineData.id,
        runId: pipelineData.runId,
        failedStage: pipelineData.failedStage,
        error: pipelineData.error,
      })
      .source('pipeline-orchestrator')
      .build();

    await this.hub.notify(event);
  }

  /**
   * Handle workflow approval required event
   */
  async handleWorkflowApprovalRequired(workflowData: {
    id: string;
    name: string;
    requester: { id: string; name: string; email?: string };
    approvers: Array<{ id: string; name: string }>;
    reason: string;
    expiresAt: Date;
    tenantId: string;
    projectId?: string;
    approvalUrl?: string;
  }): Promise<void> {
    if (!this.hub) throw new Error('Adapter not initialized');

    const event = new EventBuilder()
      .type(EventType.WORKFLOW_APPROVAL_REQUIRED)
      .severity(EventSeverity.HIGH)
      .actor(
        EventHelpers.userActor(
          workflowData.requester.id,
          workflowData.requester.name,
          workflowData.requester.email,
        ),
      )
      .subject({
        type: 'workflow',
        id: workflowData.id,
        name: workflowData.name,
        url: workflowData.approvalUrl,
      })
      .context({
        tenantId: workflowData.tenantId,
        projectId: workflowData.projectId,
      })
      .title(`Approval Required: ${workflowData.name}`)
      .message(
        `${workflowData.requester.name} requests approval: ${workflowData.reason}`,
      )
      .payload({
        workflowId: workflowData.id,
        requester: workflowData.requester,
        approvers: workflowData.approvers,
        reason: workflowData.reason,
      })
      .expiresAt(workflowData.expiresAt)
      .source('workflow-orchestrator')
      .addLink('approve', `${workflowData.approvalUrl}/approve`, 'Approve Workflow')
      .addLink('reject', `${workflowData.approvalUrl}/reject`, 'Reject Workflow')
      .build();

    await this.hub.notify(event);
  }

  async shutdown(): Promise<void> {
    this.hub = null;
    this.initialized = false;
  }

  async healthCheck(): Promise<boolean> {
    return this.initialized;
  }
}

/**
 * Copilot Event Adapter
 *
 * Converts copilot/AI events into canonical events
 */
export class CopilotEventAdapter implements IEventAdapter {
  private hub: NotificationHub | null = null;
  private initialized = false;

  async initialize(hub: NotificationHub): Promise<void> {
    this.hub = hub;
    this.initialized = true;
  }

  /**
   * Handle copilot escalation event
   */
  async handleCopilotEscalation(escalationData: {
    runId: string;
    copilotName: string;
    reason: string;
    context: Record<string, unknown>;
    userId?: string;
    userName?: string;
    tenantId: string;
    projectId?: string;
    runUrl?: string;
  }): Promise<void> {
    if (!this.hub) throw new Error('Adapter not initialized');

    const event = new EventBuilder()
      .type(EventType.COPILOT_ESCALATION)
      .severity(EventSeverity.HIGH)
      .actor(EventHelpers.copilotActor(escalationData.copilotName, escalationData.copilotName))
      .subject({
        type: 'copilot_run',
        id: escalationData.runId,
        name: escalationData.copilotName,
        url: escalationData.runUrl,
      })
      .context({
        tenantId: escalationData.tenantId,
        projectId: escalationData.projectId,
      })
      .title(`Copilot Escalation: ${escalationData.copilotName}`)
      .message(`Copilot requires human intervention: ${escalationData.reason}`)
      .payload({
        runId: escalationData.runId,
        copilotName: escalationData.copilotName,
        reason: escalationData.reason,
        context: escalationData.context,
      })
      .source('copilot-orchestrator')
      .build();

    await this.hub.notify(event);
  }

  /**
   * Handle copilot anomaly detected event
   */
  async handleCopilotAnomalyDetected(anomalyData: {
    runId: string;
    copilotName: string;
    anomalyType: string;
    score: number;
    description: string;
    tenantId: string;
    projectId?: string;
    investigationUrl?: string;
  }): Promise<void> {
    if (!this.hub) throw new Error('Adapter not initialized');

    const severity =
      anomalyData.score >= 0.9
        ? EventSeverity.CRITICAL
        : anomalyData.score >= 0.7
          ? EventSeverity.HIGH
          : EventSeverity.MEDIUM;

    const event = new EventBuilder()
      .type(EventType.COPILOT_ANOMALY_DETECTED)
      .severity(severity)
      .actor(EventHelpers.copilotActor(anomalyData.copilotName, anomalyData.copilotName))
      .subject({
        type: 'anomaly',
        id: anomalyData.runId,
        name: anomalyData.anomalyType,
        url: anomalyData.investigationUrl,
      })
      .context({
        tenantId: anomalyData.tenantId,
        projectId: anomalyData.projectId,
      })
      .title(`Anomaly Detected: ${anomalyData.anomalyType}`)
      .message(`${anomalyData.description} (score: ${(anomalyData.score * 100).toFixed(1)}%)`)
      .payload({
        runId: anomalyData.runId,
        copilotName: anomalyData.copilotName,
        anomalyType: anomalyData.anomalyType,
        score: anomalyData.score,
      })
      .source('copilot-anomaly-detector')
      .build();

    await this.hub.notify(event);
  }

  async shutdown(): Promise<void> {
    this.hub = null;
    this.initialized = false;
  }

  async healthCheck(): Promise<boolean> {
    return this.initialized;
  }
}

/**
 * Two-Person Control / Authority Event Adapter
 *
 * Converts authority/approval events into canonical events
 */
export class AuthorityEventAdapter implements IEventAdapter {
  private hub: NotificationHub | null = null;
  private initialized = false;

  async initialize(hub: NotificationHub): Promise<void> {
    this.hub = hub;
    this.initialized = true;
  }

  /**
   * Handle authority approval required event
   */
  async handleAuthorityApprovalRequired(authorityData: {
    id: string;
    operation: string;
    requester: { id: string; name: string; email?: string };
    requiredApprovers: number;
    approvers: Array<{ id: string; name: string; role: string }>;
    reason: string;
    expiresAt: Date;
    tenantId: string;
    projectId?: string;
    approvalUrl?: string;
  }): Promise<void> {
    if (!this.hub) throw new Error('Adapter not initialized');

    const event = new EventBuilder()
      .type(EventType.AUTHORITY_APPROVAL_REQUIRED)
      .severity(EventSeverity.CRITICAL)
      .actor(
        EventHelpers.userActor(
          authorityData.requester.id,
          authorityData.requester.name,
          authorityData.requester.email,
        ),
      )
      .subject({
        type: 'authority_request',
        id: authorityData.id,
        name: authorityData.operation,
        url: authorityData.approvalUrl,
      })
      .context({
        tenantId: authorityData.tenantId,
        projectId: authorityData.projectId,
      })
      .title(`Authority Required: ${authorityData.operation}`)
      .message(
        `${authorityData.requester.name} requires ${authorityData.requiredApprovers}-of-${authorityData.approvers.length} approval: ${authorityData.reason}`,
      )
      .payload({
        authorityId: authorityData.id,
        operation: authorityData.operation,
        requester: authorityData.requester,
        requiredApprovers: authorityData.requiredApprovers,
        approvers: authorityData.approvers,
        reason: authorityData.reason,
      })
      .expiresAt(authorityData.expiresAt)
      .source('authority-system')
      .addLink('approve', `${authorityData.approvalUrl}/approve`, 'Approve Request')
      .addLink('reject', `${authorityData.approvalUrl}/reject`, 'Reject Request')
      .build();

    await this.hub.notify(event);
  }

  /**
   * Handle authority dissent event (Foster & Starkey dissent pattern)
   */
  async handleAuthorityDissent(dissentData: {
    id: string;
    operation: string;
    dissenter: { id: string; name: string };
    reason: string;
    originalApproval: { id: string; operation: string };
    tenantId: string;
    projectId?: string;
    reviewUrl?: string;
  }): Promise<void> {
    if (!this.hub) throw new Error('Adapter not initialized');

    const event = new EventBuilder()
      .type(EventType.AUTHORITY_DISSENT)
      .severity(EventSeverity.CRITICAL)
      .actor(
        EventHelpers.userActor(dissentData.dissenter.id, dissentData.dissenter.name),
      )
      .subject({
        type: 'authority_dissent',
        id: dissentData.id,
        name: dissentData.operation,
        url: dissentData.reviewUrl,
      })
      .context({
        tenantId: dissentData.tenantId,
        projectId: dissentData.projectId,
      })
      .title(`Authority Dissent: ${dissentData.operation}`)
      .message(`${dissentData.dissenter.name} dissents: ${dissentData.reason}`)
      .payload({
        dissentId: dissentData.id,
        operation: dissentData.operation,
        dissenter: dissentData.dissenter,
        reason: dissentData.reason,
        originalApproval: dissentData.originalApproval,
      })
      .source('authority-system')
      .build();

    await this.hub.notify(event);
  }

  /**
   * Handle policy violation attempt
   */
  async handlePolicyViolation(violationData: {
    id: string;
    policy: string;
    user: { id: string; name: string; email?: string };
    operation: string;
    reason: string;
    tenantId: string;
    projectId?: string;
    reviewUrl?: string;
  }): Promise<void> {
    if (!this.hub) throw new Error('Adapter not initialized');

    const event = new EventBuilder()
      .type(EventType.POLICY_VIOLATION)
      .severity(EventSeverity.CRITICAL)
      .actor(
        EventHelpers.userActor(
          violationData.user.id,
          violationData.user.name,
          violationData.user.email,
        ),
      )
      .subject({
        type: 'policy_violation',
        id: violationData.id,
        name: violationData.policy,
        url: violationData.reviewUrl,
      })
      .context({
        tenantId: violationData.tenantId,
        projectId: violationData.projectId,
      })
      .title(`Policy Violation: ${violationData.policy}`)
      .message(
        `${violationData.user.name} attempted ${violationData.operation}: ${violationData.reason}`,
      )
      .payload({
        violationId: violationData.id,
        policy: violationData.policy,
        user: violationData.user,
        operation: violationData.operation,
        reason: violationData.reason,
      })
      .source('policy-enforcement')
      .build();

    await this.hub.notify(event);
  }

  async shutdown(): Promise<void> {
    this.hub = null;
    this.initialized = false;
  }

  async healthCheck(): Promise<boolean> {
    return this.initialized;
  }
}

/**
 * Investigation & Evidence Event Adapter
 */
export class InvestigationEventAdapter implements IEventAdapter {
  private hub: NotificationHub | null = null;
  private initialized = false;

  async initialize(hub: NotificationHub): Promise<void> {
    this.hub = hub;
    this.initialized = true;
  }

  /**
   * Handle new evidence added
   */
  async handleEvidenceAdded(evidenceData: {
    investigationId: string;
    investigationName: string;
    evidenceId: string;
    evidenceType: string;
    addedBy: { id: string; name: string };
    summary: string;
    tenantId: string;
    projectId?: string;
    investigationUrl?: string;
  }): Promise<void> {
    if (!this.hub) throw new Error('Adapter not initialized');

    const event = new EventBuilder()
      .type(EventType.EVIDENCE_ADDED)
      .severity(EventSeverity.MEDIUM)
      .actor(EventHelpers.userActor(evidenceData.addedBy.id, evidenceData.addedBy.name))
      .subject({
        type: 'investigation',
        id: evidenceData.investigationId,
        name: evidenceData.investigationName,
        url: evidenceData.investigationUrl,
      })
      .context({
        tenantId: evidenceData.tenantId,
        projectId: evidenceData.projectId,
      })
      .title(`New Evidence: ${evidenceData.investigationName}`)
      .message(`${evidenceData.addedBy.name} added ${evidenceData.evidenceType}: ${evidenceData.summary}`)
      .payload({
        investigationId: evidenceData.investigationId,
        evidenceId: evidenceData.evidenceId,
        evidenceType: evidenceData.evidenceType,
        summary: evidenceData.summary,
      })
      .source('investigation-system')
      .build();

    await this.hub.notify(event);
  }

  async shutdown(): Promise<void> {
    this.hub = null;
    this.initialized = false;
  }

  async healthCheck(): Promise<boolean> {
    return this.initialized;
  }
}

/**
 * Adapter Registry
 * Central registry for all event adapters
 */
export class AdapterRegistry {
  private adapters: Map<string, IEventAdapter> = new Map();
  private hub: NotificationHub | null = null;

  constructor() {
    // Register all adapters
    this.adapters.set('alerting', new AlertingEventAdapter());
    this.adapters.set('pipeline', new PipelineEventAdapter());
    this.adapters.set('copilot', new CopilotEventAdapter());
    this.adapters.set('authority', new AuthorityEventAdapter());
    this.adapters.set('investigation', new InvestigationEventAdapter());
  }

  async initializeAll(hub: NotificationHub): Promise<void> {
    this.hub = hub;

    for (const [name, adapter] of this.adapters) {
      try {
        await adapter.initialize(hub);
        console.log(`Initialized ${name} adapter`);
      } catch (error) {
        console.error(`Failed to initialize ${name} adapter:`, error);
      }
    }
  }

  getAdapter<T extends IEventAdapter>(name: string): T | undefined {
    return this.adapters.get(name) as T | undefined;
  }

  async shutdownAll(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      await adapter.shutdown();
    }
  }

  async healthCheckAll(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};

    for (const [name, adapter] of this.adapters) {
      health[name] = await adapter.healthCheck();
    }

    return health;
  }
}
