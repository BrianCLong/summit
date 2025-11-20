/**
 * Canonical Event Model for Summit Notifications & Integrations Hub
 *
 * This schema defines a unified event structure that all systems in Summit
 * can emit and consume. Events flow through the notification hub which routes
 * them to appropriate receivers based on severity, tenant, and user preferences.
 */

export enum EventType {
  // Alerting & SLO
  ALERT_TRIGGERED = 'alert.triggered',
  ALERT_RESOLVED = 'alert.resolved',
  ALERT_ESCALATED = 'alert.escalated',
  SLO_VIOLATION = 'slo.violation',
  SLO_ERROR_BUDGET_DEPLETED = 'slo.error_budget_depleted',

  // Pipeline & Orchestration
  PIPELINE_STARTED = 'pipeline.started',
  PIPELINE_COMPLETED = 'pipeline.completed',
  PIPELINE_FAILED = 'pipeline.failed',
  WORKFLOW_APPROVAL_REQUIRED = 'workflow.approval_required',
  WORKFLOW_APPROVED = 'workflow.approved',
  WORKFLOW_REJECTED = 'workflow.rejected',

  // Two-Person Control / Authority
  AUTHORITY_APPROVAL_REQUIRED = 'authority.approval_required',
  AUTHORITY_APPROVED = 'authority.approved',
  AUTHORITY_REJECTED = 'authority.rejected',
  AUTHORITY_DISSENT = 'authority.dissent',
  AUTHORITY_TIMEOUT = 'authority.timeout',

  // Copilot & AI
  COPILOT_RUN_STARTED = 'copilot.run_started',
  COPILOT_RUN_COMPLETED = 'copilot.run_completed',
  COPILOT_RUN_FAILED = 'copilot.run_failed',
  COPILOT_ESCALATION = 'copilot.escalation',
  COPILOT_ANOMALY_DETECTED = 'copilot.anomaly_detected',

  // Investigation & Evidence
  INVESTIGATION_CREATED = 'investigation.created',
  INVESTIGATION_UPDATED = 'investigation.updated',
  INVESTIGATION_SHARED = 'investigation.shared',
  EVIDENCE_ADDED = 'evidence.added',
  ENTITY_DISCOVERED = 'entity.discovered',
  ENTITY_RISK_CHANGED = 'entity.risk_changed',

  // Security & Compliance
  SECURITY_ALERT = 'security.alert',
  POLICY_VIOLATION = 'policy.violation',
  ACCESS_DENIED = 'security.access_denied',
  CLEARANCE_VIOLATION = 'security.clearance_violation',
  LICENSE_VIOLATION = 'license.violation',

  // System & Infrastructure
  SYSTEM_HEALTH_DEGRADED = 'system.health_degraded',
  SYSTEM_MAINTENANCE_SCHEDULED = 'system.maintenance_scheduled',
  GOLDEN_PATH_BROKEN = 'system.golden_path_broken',
  DEPLOYMENT_COMPLETED = 'deployment.completed',
  DEPLOYMENT_FAILED = 'deployment.failed',

  // Budget & Cost
  BUDGET_THRESHOLD_EXCEEDED = 'budget.threshold_exceeded',
  BUDGET_DEPLETED = 'budget.depleted',
  COST_ANOMALY = 'cost.anomaly',

  // User & Collaboration
  USER_MENTIONED = 'user.mentioned',
  COLLABORATION_INVITE = 'collaboration.invite',
  REPORT_READY = 'report.ready',
}

export enum EventSeverity {
  CRITICAL = 'critical',  // Requires immediate action
  HIGH = 'high',          // Important but not urgent
  MEDIUM = 'medium',      // Normal priority
  LOW = 'low',            // Informational
  INFO = 'info',          // Just FYI
}

export enum EventStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

/**
 * Actor represents who/what triggered the event
 */
export interface EventActor {
  id: string;
  type: 'user' | 'system' | 'service' | 'copilot';
  name: string;
  email?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Subject represents what the event is about
 */
export interface EventSubject {
  type: string;  // e.g., 'investigation', 'pipeline', 'entity', 'workflow'
  id: string;
  name?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Context provides tenant/project/environment information
 */
export interface EventContext {
  tenantId: string;
  projectId?: string;
  environment?: 'dev' | 'staging' | 'production';
  tags?: Record<string, string>;
}

/**
 * Canonical Event Model
 * All events in Summit follow this structure
 */
export interface CanonicalEvent {
  // Identity
  id: string;
  type: EventType;
  version: string;  // Schema version for evolution

  // Who, What, Where
  actor: EventActor;
  subject: EventSubject;
  context: EventContext;

  // Priority & Status
  severity: EventSeverity;
  status: EventStatus;

  // Timing
  timestamp: Date;
  expiresAt?: Date;

  // Content
  title: string;
  message: string;
  payload: Record<string, unknown>;

  // Metadata
  metadata?: {
    correlationId?: string;  // For tracing related events
    source?: string;         // System that emitted the event
    labels?: Record<string, string>;
    links?: Array<{
      rel: string;
      href: string;
      title?: string;
    }>;
  };
}

/**
 * Event Builder for creating canonical events
 */
export class EventBuilder {
  private event: Partial<CanonicalEvent>;

  constructor() {
    this.event = {
      id: this.generateEventId(),
      version: '1.0.0',
      timestamp: new Date(),
      status: EventStatus.PENDING,
      payload: {},
      metadata: {},
    };
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public type(type: EventType): this {
    this.event.type = type;
    return this;
  }

  public actor(actor: EventActor): this {
    this.event.actor = actor;
    return this;
  }

  public subject(subject: EventSubject): this {
    this.event.subject = subject;
    return this;
  }

  public context(context: EventContext): this {
    this.event.context = context;
    return this;
  }

  public severity(severity: EventSeverity): this {
    this.event.severity = severity;
    return this;
  }

  public title(title: string): this {
    this.event.title = title;
    return this;
  }

  public message(message: string): this {
    this.event.message = message;
    return this;
  }

  public payload(payload: Record<string, unknown>): this {
    this.event.payload = { ...this.event.payload, ...payload };
    return this;
  }

  public metadata(metadata: Record<string, unknown>): this {
    this.event.metadata = { ...this.event.metadata, ...metadata };
    return this;
  }

  public expiresAt(date: Date): this {
    this.event.expiresAt = date;
    return this;
  }

  public correlationId(id: string): this {
    if (!this.event.metadata) this.event.metadata = {};
    this.event.metadata.correlationId = id;
    return this;
  }

  public source(source: string): this {
    if (!this.event.metadata) this.event.metadata = {};
    this.event.metadata.source = source;
    return this;
  }

  public addLink(rel: string, href: string, title?: string): this {
    if (!this.event.metadata) this.event.metadata = {};
    if (!this.event.metadata.links) this.event.metadata.links = [];
    (this.event.metadata.links as Array<any>).push({ rel, href, title });
    return this;
  }

  public build(): CanonicalEvent {
    // Validate required fields
    if (!this.event.type) throw new Error('Event type is required');
    if (!this.event.actor) throw new Error('Event actor is required');
    if (!this.event.subject) throw new Error('Event subject is required');
    if (!this.event.context) throw new Error('Event context is required');
    if (!this.event.severity) throw new Error('Event severity is required');
    if (!this.event.title) throw new Error('Event title is required');
    if (!this.event.message) throw new Error('Event message is required');

    return this.event as CanonicalEvent;
  }
}

/**
 * Helper functions for common event patterns
 */
export const EventHelpers = {
  /**
   * Create a system actor
   */
  systemActor(serviceName: string): EventActor {
    return {
      id: 'system',
      type: 'system',
      name: serviceName,
      metadata: {
        version: process.env.APP_VERSION || 'unknown',
      },
    };
  },

  /**
   * Create a user actor
   */
  userActor(userId: string, name: string, email?: string): EventActor {
    return {
      id: userId,
      type: 'user',
      name,
      email,
    };
  },

  /**
   * Create a service actor
   */
  serviceActor(serviceName: string, serviceId?: string): EventActor {
    return {
      id: serviceId || serviceName,
      type: 'service',
      name: serviceName,
    };
  },

  /**
   * Create a copilot actor
   */
  copilotActor(copilotId: string, copilotName: string): EventActor {
    return {
      id: copilotId,
      type: 'copilot',
      name: copilotName,
    };
  },

  /**
   * Map alert severity to event severity
   */
  alertSeverityToEventSeverity(alertSeverity: string): EventSeverity {
    const mapping: Record<string, EventSeverity> = {
      critical: EventSeverity.CRITICAL,
      high: EventSeverity.HIGH,
      warning: EventSeverity.MEDIUM,
      info: EventSeverity.INFO,
      low: EventSeverity.LOW,
    };
    return mapping[alertSeverity.toLowerCase()] || EventSeverity.MEDIUM;
  },
};
