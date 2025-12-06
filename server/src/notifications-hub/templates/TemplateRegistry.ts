/**
 * Template Registry for Notification Messages
 *
 * Provides human-readable templates for rendering notifications
 * across different channels (email, chat, etc.)
 */

import { CanonicalEvent, EventType, EventSeverity } from '../events/EventSchema.js';

export interface MessageTemplate {
  id: string;
  eventType: EventType;
  title: string;
  shortMessage: string;  // For SMS, push notifications
  message: string;       // For email body, chat message
  callToAction?: string;
  variables?: string[];  // List of variables used in template
}

export class TemplateRegistry {
  private templates: Map<EventType, MessageTemplate> = new Map();

  constructor() {
    this.registerDefaultTemplates();
  }

  private registerDefaultTemplates(): void {
    // Alerting & SLO Templates
    this.register({
      id: 'alert_triggered',
      eventType: EventType.ALERT_TRIGGERED,
      title: '{{severity}} Alert: {{subject.name}}',
      shortMessage: 'Alert {{subject.name}}: {{message}}',
      message: `Alert "{{subject.name}}" has been triggered.

{{message}}

Details:
- Severity: {{severity}}
- Environment: {{context.environment}}
- Time: {{timestamp}}

This alert requires your attention.`,
      callToAction: 'View Alert Details',
      variables: ['severity', 'subject.name', 'message', 'context.environment', 'timestamp'],
    });

    this.register({
      id: 'slo_violation',
      eventType: EventType.SLO_VIOLATION,
      title: 'SLO Violation: {{subject.name}}',
      shortMessage: 'SLO {{subject.name}} error budget {{payload.errorBudgetRemaining}}%',
      message: `Service Level Objective "{{subject.name}}" is violating its error budget.

{{message}}

Current Status:
- Error Budget Remaining: {{payload.errorBudgetRemaining}}%
- Burn Rate: {{payload.burnRate}}x
- Service: {{payload.service}}

Immediate action may be required to prevent further degradation.`,
      callToAction: 'View SLO Dashboard',
      variables: ['subject.name', 'message', 'payload.errorBudgetRemaining', 'payload.burnRate', 'payload.service'],
    });

    this.register({
      id: 'golden_path_broken',
      eventType: EventType.GOLDEN_PATH_BROKEN,
      title: 'Golden Path Broken: {{subject.name}} ({{context.environment}})',
      shortMessage: 'Golden path {{subject.name}} broken in {{context.environment}}',
      message: `The golden path "{{subject.name}}" has broken in {{context.environment}}.

{{message}}

Details:
- Stage: {{payload.stage}}
- Environment: {{context.environment}}
- Reason: {{payload.reason}}

This impacts the standard deployment workflow and requires immediate attention.`,
      callToAction: 'View Pipeline Run',
      variables: ['subject.name', 'context.environment', 'message', 'payload.stage', 'payload.reason'],
    });

    // Pipeline Templates
    this.register({
      id: 'pipeline_failed',
      eventType: EventType.PIPELINE_FAILED,
      title: 'Pipeline Failed: {{subject.name}}',
      shortMessage: 'Pipeline {{subject.name}} failed at {{payload.failedStage}}',
      message: `Pipeline "{{subject.name}}" has failed.

{{message}}

Details:
- Failed Stage: {{payload.failedStage}}
- Run ID: {{payload.runId}}
- Triggered by: {{actor.name}}

Please review the pipeline logs and address the failure.`,
      callToAction: 'View Pipeline Details',
      variables: ['subject.name', 'message', 'payload.failedStage', 'payload.runId', 'actor.name'],
    });

    this.register({
      id: 'workflow_approval_required',
      eventType: EventType.WORKFLOW_APPROVAL_REQUIRED,
      title: 'Approval Required: {{subject.name}}',
      shortMessage: '{{actor.name}} requests approval for {{subject.name}}',
      message: `{{actor.name}} is requesting approval for "{{subject.name}}".

Reason: {{payload.reason}}

Approvers: {{payload.approvers}}

This approval will expire at {{expiresAt}}.

Please review and approve or reject this request.`,
      callToAction: 'Review Request',
      variables: ['actor.name', 'subject.name', 'payload.reason', 'payload.approvers', 'expiresAt'],
    });

    // Authority Templates
    this.register({
      id: 'authority_approval_required',
      eventType: EventType.AUTHORITY_APPROVAL_REQUIRED,
      title: 'Authority Required: {{subject.name}}',
      shortMessage: '{{actor.name}} requires {{payload.requiredApprovers}}-of-{{payload.approvers.length}} approval',
      message: `{{actor.name}} requires two-person control approval for "{{subject.name}}".

Operation: {{payload.operation}}
Reason: {{payload.reason}}

Required: {{payload.requiredApprovers}} of {{payload.approvers.length}} approvers
Expires: {{expiresAt}}

Your approval is needed to proceed with this sensitive operation.`,
      callToAction: 'Approve or Reject',
      variables: ['actor.name', 'subject.name', 'payload.operation', 'payload.reason', 'payload.requiredApprovers', 'payload.approvers', 'expiresAt'],
    });

    this.register({
      id: 'authority_dissent',
      eventType: EventType.AUTHORITY_DISSENT,
      title: 'Authority Dissent: {{subject.name}}',
      shortMessage: '{{actor.name}} dissents on {{subject.name}}',
      message: `{{actor.name}} has filed a dissent regarding "{{subject.name}}".

Dissent Reason: {{payload.reason}}

Original Operation: {{payload.originalApproval.operation}}

This dissent triggers a review of the original approval decision per Foster & Starkey protocols.`,
      callToAction: 'Review Dissent',
      variables: ['actor.name', 'subject.name', 'payload.reason', 'payload.originalApproval.operation'],
    });

    this.register({
      id: 'policy_violation',
      eventType: EventType.POLICY_VIOLATION,
      title: 'Policy Violation: {{payload.policy}}',
      shortMessage: '{{actor.name}} attempted unauthorized {{payload.operation}}',
      message: `Policy violation detected: {{payload.policy}}

User: {{actor.name}}
Operation: {{payload.operation}}
Reason: {{payload.reason}}

This attempt has been logged and blocked. Security review may be required.`,
      callToAction: 'Review Violation',
      variables: ['payload.policy', 'actor.name', 'payload.operation', 'payload.reason'],
    });

    // Copilot Templates
    this.register({
      id: 'copilot_escalation',
      eventType: EventType.COPILOT_ESCALATION,
      title: 'Copilot Escalation: {{subject.name}}',
      shortMessage: 'Copilot {{subject.name}} requires human intervention',
      message: `The copilot "{{subject.name}}" has escalated to human review.

{{message}}

Run ID: {{payload.runId}}
Escalation Context: {{payload.context}}

Please review and provide guidance.`,
      callToAction: 'Review Copilot Run',
      variables: ['subject.name', 'message', 'payload.runId', 'payload.context'],
    });

    this.register({
      id: 'copilot_anomaly_detected',
      eventType: EventType.COPILOT_ANOMALY_DETECTED,
      title: 'Anomaly Detected: {{subject.name}}',
      shortMessage: 'Anomaly {{subject.name}} detected (score: {{payload.score}})',
      message: `Copilot "{{payload.copilotName}}" has detected an anomaly.

Type: {{subject.name}}
{{message}}

Confidence Score: {{payload.score}}

This anomaly may require investigation.`,
      callToAction: 'Investigate Anomaly',
      variables: ['subject.name', 'payload.copilotName', 'message', 'payload.score'],
    });

    // Investigation Templates
    this.register({
      id: 'evidence_added',
      eventType: EventType.EVIDENCE_ADDED,
      title: 'New Evidence: {{subject.name}}',
      shortMessage: '{{actor.name}} added evidence to {{subject.name}}',
      message: `{{actor.name}} has added new evidence to investigation "{{subject.name}}".

Type: {{payload.evidenceType}}
Summary: {{payload.summary}}

Review the new evidence and update the investigation status as needed.`,
      callToAction: 'View Investigation',
      variables: ['actor.name', 'subject.name', 'payload.evidenceType', 'payload.summary'],
    });

    this.register({
      id: 'entity_risk_changed',
      eventType: EventType.ENTITY_RISK_CHANGED,
      title: 'Entity Risk Changed: {{subject.name}}',
      shortMessage: 'Risk level for {{subject.name}} changed',
      message: `The risk level for entity "{{subject.name}}" has changed.

{{message}}

Review the entity and adjust investigation priorities as needed.`,
      callToAction: 'View Entity',
      variables: ['subject.name', 'message'],
    });

    // System Templates
    this.register({
      id: 'system_health_degraded',
      eventType: EventType.SYSTEM_HEALTH_DEGRADED,
      title: 'System Health Degraded: {{subject.name}}',
      shortMessage: 'System {{subject.name}} health degraded',
      message: `System component "{{subject.name}}" is experiencing degraded health.

{{message}}

Monitor the situation and be prepared to take action if health continues to degrade.`,
      callToAction: 'View System Status',
      variables: ['subject.name', 'message'],
    });

    this.register({
      id: 'budget_threshold_exceeded',
      eventType: EventType.BUDGET_THRESHOLD_EXCEEDED,
      title: 'Budget Threshold Exceeded: {{subject.name}}',
      shortMessage: 'Budget {{subject.name}} exceeded threshold',
      message: `Budget "{{subject.name}}" has exceeded its threshold.

{{message}}

Review spending and adjust resource allocation if necessary.`,
      callToAction: 'View Budget Details',
      variables: ['subject.name', 'message'],
    });

    // Notification lifecycle templates
    this.register({
      id: 'notification_digest',
      eventType: EventType.NOTIFICATION_DIGEST,
      title: 'Digest: {{payload.events.length}} new notifications',
      shortMessage: 'Digest with {{payload.events.length}} notifications',
      message: `You have {{payload.events.length}} new notifications queued for {{payload.channel}}.

{{message}}`,
      callToAction: 'Review notifications',
      variables: ['payload.events.length', 'payload.channel'],
    });
  }

  /**
   * Register a template
   */
  register(template: MessageTemplate): void {
    this.templates.set(template.eventType, template);
  }

  /**
   * Get template for event type
   */
  getTemplate(eventType: EventType): MessageTemplate | undefined {
    return this.templates.get(eventType);
  }

  /**
   * Render template with event data
   */
  render(event: CanonicalEvent, format: 'title' | 'short' | 'full' = 'full'): string {
    const template = this.templates.get(event.type);

    if (!template) {
      // Fallback to generic template
      return this.renderGeneric(event, format);
    }

    const templateString =
      format === 'title' ? template.title :
      format === 'short' ? template.shortMessage :
      template.message;

    return this.interpolate(templateString, event);
  }

  /**
   * Get call to action for event
   */
  getCallToAction(event: CanonicalEvent): string | undefined {
    const template = this.templates.get(event.type);
    return template?.callToAction;
  }

  /**
   * Interpolate template variables
   */
  private interpolate(template: string, event: CanonicalEvent): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getNestedValue(event, path.trim());

      if (value === undefined || value === null) {
        return match; // Keep placeholder if value not found
      }

      // Format dates
      if (value instanceof Date) {
        return value.toISOString();
      }

      // Format arrays
      if (Array.isArray(value)) {
        return value.map(v => v.name || v.id || v).join(', ');
      }

      // Format objects
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }

      return String(value);
    });
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Render generic fallback template
   */
  private renderGeneric(event: CanonicalEvent, format: 'title' | 'short' | 'full'): string {
    if (format === 'title') {
      return event.title;
    }

    if (format === 'short') {
      return `${event.title}: ${event.message}`;
    }

    return `${event.title}

${event.message}

Actor: ${event.actor.name} (${event.actor.type})
Subject: ${event.subject.name || event.subject.id}
Time: ${event.timestamp.toISOString()}
Severity: ${event.severity}`;
  }

  /**
   * List all registered templates
   */
  listTemplates(): MessageTemplate[] {
    return Array.from(this.templates.values());
  }
}
