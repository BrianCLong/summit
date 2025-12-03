/**
 * Summit Platform Integration
 *
 * Integrates the governance framework with Summit's existing services
 * including the conductor, policy service, and observability stack.
 */

import {
  GovernanceEvent,
  AgentPolicyContext,
  PolicyDecision,
  Incident,
  HallucinationDetection,
  Rollback,
  AIProvenance,
  ICFY28ValidationResult,
} from '../types';

// ============================================================================
// Integration Interfaces
// ============================================================================

export interface SummitIntegrationConfig {
  conductorUrl: string;
  policyServiceUrl: string;
  auditServiceUrl: string;
  prometheusEndpoint: string;
  grafanaEndpoint: string;
  enableTelemetry: boolean;
  enableAuditLogging: boolean;
}

export interface ConductorClient {
  submitTask(task: ConductorTask): Promise<ConductorTaskResult>;
  getTaskStatus(taskId: string): Promise<ConductorTaskStatus>;
  cancelTask(taskId: string): Promise<boolean>;
}

export interface ConductorTask {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  priority: number;
  timeout: number;
  governance: {
    policyContext: AgentPolicyContext;
    requiredApprovals?: string[];
  };
}

export interface ConductorTaskResult {
  taskId: string;
  status: 'completed' | 'failed' | 'cancelled';
  output?: unknown;
  error?: string;
  metrics: {
    duration: number;
    tokensUsed: number;
    cost: number;
  };
}

export interface ConductorTaskStatus {
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
}

// ============================================================================
// Metrics Exporter
// ============================================================================

export class GovernanceMetricsExporter {
  private endpoint: string;
  private prefix: string;

  constructor(endpoint: string, prefix: string = 'summit_governance') {
    this.endpoint = endpoint;
    this.prefix = prefix;
  }

  /**
   * Export policy evaluation metrics
   */
  async exportPolicyMetrics(metrics: {
    evaluationsTotal: number;
    evaluationsAllowed: number;
    evaluationsDenied: number;
    averageLatencyMs: number;
    cacheHitRate: number;
  }): Promise<void> {
    const prometheusMetrics = [
      `${this.prefix}_policy_evaluations_total ${metrics.evaluationsTotal}`,
      `${this.prefix}_policy_evaluations_allowed_total ${metrics.evaluationsAllowed}`,
      `${this.prefix}_policy_evaluations_denied_total ${metrics.evaluationsDenied}`,
      `${this.prefix}_policy_evaluation_latency_ms ${metrics.averageLatencyMs}`,
      `${this.prefix}_policy_cache_hit_rate ${metrics.cacheHitRate}`,
    ].join('\n');

    await this.pushMetrics(prometheusMetrics);
  }

  /**
   * Export incident metrics
   */
  async exportIncidentMetrics(metrics: {
    activeIncidents: number;
    totalIncidents: number;
    mttr: number;
    bySeverity: Record<string, number>;
  }): Promise<void> {
    const lines = [
      `${this.prefix}_incidents_active ${metrics.activeIncidents}`,
      `${this.prefix}_incidents_total ${metrics.totalIncidents}`,
      `${this.prefix}_incidents_mttr_seconds ${metrics.mttr / 1000}`,
    ];

    for (const [severity, count] of Object.entries(metrics.bySeverity)) {
      lines.push(`${this.prefix}_incidents_by_severity{severity="${severity}"} ${count}`);
    }

    await this.pushMetrics(lines.join('\n'));
  }

  /**
   * Export hallucination metrics
   */
  async exportHallucinationMetrics(metrics: {
    detectionRate: number;
    totalDetections: number;
    bySeverity: Record<string, number>;
    remediationRate: number;
  }): Promise<void> {
    const lines = [
      `${this.prefix}_hallucination_detection_rate ${metrics.detectionRate}`,
      `${this.prefix}_hallucination_detections_total ${metrics.totalDetections}`,
      `${this.prefix}_hallucination_remediation_rate ${metrics.remediationRate}`,
    ];

    for (const [severity, count] of Object.entries(metrics.bySeverity)) {
      lines.push(`${this.prefix}_hallucinations_by_severity{severity="${severity}"} ${count}`);
    }

    await this.pushMetrics(lines.join('\n'));
  }

  /**
   * Export compliance metrics
   */
  async exportComplianceMetrics(metrics: {
    overallScore: number;
    icfy28Compliant: boolean;
    openFindings: number;
    criticalFindings: number;
  }): Promise<void> {
    const lines = [
      `${this.prefix}_compliance_score ${metrics.overallScore}`,
      `${this.prefix}_compliance_icfy28_compliant ${metrics.icfy28Compliant ? 1 : 0}`,
      `${this.prefix}_compliance_findings_open ${metrics.openFindings}`,
      `${this.prefix}_compliance_findings_critical ${metrics.criticalFindings}`,
    ];

    await this.pushMetrics(lines.join('\n'));
  }

  /**
   * Push metrics to Prometheus pushgateway
   */
  private async pushMetrics(metrics: string): Promise<void> {
    try {
      await fetch(`${this.endpoint}/metrics/job/governance`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: metrics,
      });
    } catch (error) {
      console.error('Failed to push metrics:', error);
    }
  }
}

// ============================================================================
// Audit Logger Integration
// ============================================================================

export class GovernanceAuditLogger {
  private endpoint: string;
  private batchSize: number;
  private buffer: AuditLogEntry[];
  private flushInterval: NodeJS.Timer | null;

  constructor(endpoint: string, batchSize: number = 100) {
    this.endpoint = endpoint;
    this.batchSize = batchSize;
    this.buffer = [];
    this.flushInterval = null;
  }

  /**
   * Start the audit logger
   */
  start(): void {
    this.flushInterval = setInterval(() => this.flush(), 5000);
  }

  /**
   * Stop the audit logger
   */
  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }

  /**
   * Log a governance event
   */
  async logEvent(event: GovernanceEvent): Promise<void> {
    const entry: AuditLogEntry = {
      timestamp: event.timestamp.toISOString(),
      eventId: event.id,
      eventType: event.type,
      source: event.source,
      actor: event.actor,
      action: event.action,
      resource: event.resource,
      outcome: event.outcome,
      classification: event.classification,
      agentId: event.agentId,
      fleetId: event.fleetId,
      sessionId: event.sessionId,
      details: event.details,
      provenance: event.provenance,
    };

    this.buffer.push(entry);

    if (this.buffer.length >= this.batchSize) {
      await this.flush();
    }
  }

  /**
   * Log a policy decision
   */
  async logPolicyDecision(
    context: AgentPolicyContext,
    decision: PolicyDecision,
  ): Promise<void> {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      eventId: `policy-${Date.now()}`,
      eventType: decision.allow ? 'policy_evaluation' : 'policy_violation',
      source: 'AgentPolicyEngine',
      actor: context.userContext.userId,
      action: context.requestedAction,
      resource: context.targetResource,
      outcome: decision.allow ? 'success' : 'failure',
      classification: context.classification,
      agentId: context.agentId,
      fleetId: context.fleetId,
      sessionId: context.sessionId,
      details: {
        policyPath: decision.policyPath,
        reason: decision.reason,
        conditions: decision.conditions,
        auditLevel: decision.auditLevel,
      },
    };

    this.buffer.push(entry);
  }

  /**
   * Log an incident
   */
  async logIncident(incident: Incident): Promise<void> {
    const entry: AuditLogEntry = {
      timestamp: incident.detectedAt.toISOString(),
      eventId: incident.id,
      eventType: 'incident_detected',
      source: 'IncidentResponseManager',
      actor: 'system',
      action: 'detect_incident',
      resource: incident.id,
      outcome: 'success',
      classification: 'UNCLASSIFIED',
      details: {
        type: incident.type,
        severity: incident.severity,
        title: incident.title,
        affectedAgents: incident.affectedAgents,
        affectedFleets: incident.affectedFleets,
      },
    };

    this.buffer.push(entry);
  }

  /**
   * Flush the buffer to the audit service
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      await fetch(`${this.endpoint}/api/v1/audit/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });
    } catch (error) {
      console.error('Failed to flush audit logs:', error);
      // Re-add entries to buffer for retry
      this.buffer = [...entries, ...this.buffer];
    }
  }
}

interface AuditLogEntry {
  timestamp: string;
  eventId: string;
  eventType: string;
  source: string;
  actor: string;
  action: string;
  resource: string;
  outcome: string;
  classification: string;
  agentId?: string;
  fleetId?: string;
  sessionId?: string;
  details?: Record<string, unknown>;
  provenance?: string;
}

// ============================================================================
// Conductor Integration
// ============================================================================

export class ConductorGovernanceMiddleware {
  private conductorUrl: string;

  constructor(conductorUrl: string) {
    this.conductorUrl = conductorUrl;
  }

  /**
   * Wrap a conductor task with governance checks
   */
  async submitGovernedTask(
    task: ConductorTask,
    evaluatePolicy: (context: AgentPolicyContext) => Promise<PolicyDecision>,
  ): Promise<ConductorTaskResult> {
    // Evaluate policy before submission
    const decision = await evaluatePolicy(task.governance.policyContext);

    if (!decision.allow) {
      return {
        taskId: task.id,
        status: 'failed',
        error: `Policy denied: ${decision.reason}`,
        metrics: { duration: 0, tokensUsed: 0, cost: 0 },
      };
    }

    // Check for required approvals
    if (decision.requiredApprovals && decision.requiredApprovals.length > 0) {
      const approved = await this.checkApprovals(task.id, decision.requiredApprovals);
      if (!approved) {
        return {
          taskId: task.id,
          status: 'failed',
          error: 'Required approvals not obtained',
          metrics: { duration: 0, tokensUsed: 0, cost: 0 },
        };
      }
    }

    // Submit to conductor
    return this.submitTask(task);
  }

  /**
   * Submit task to conductor
   */
  private async submitTask(task: ConductorTask): Promise<ConductorTaskResult> {
    try {
      const response = await fetch(`${this.conductorUrl}/api/v1/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });

      if (!response.ok) {
        throw new Error(`Conductor returned ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return {
        taskId: task.id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: { duration: 0, tokensUsed: 0, cost: 0 },
      };
    }
  }

  /**
   * Check if required approvals have been obtained
   */
  private async checkApprovals(taskId: string, required: string[]): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.conductorUrl}/api/v1/approvals/${taskId}`,
      );

      if (!response.ok) return false;

      const approvals = await response.json();
      const approved = approvals.approvers || [];

      return required.every((r) => approved.includes(r));
    } catch {
      return false;
    }
  }
}

// ============================================================================
// Express Middleware
// ============================================================================

export function createGovernanceMiddleware(
  evaluatePolicy: (context: AgentPolicyContext) => Promise<PolicyDecision>,
) {
  return async (req: any, res: any, next: any) => {
    try {
      // Extract context from request
      const context: AgentPolicyContext = {
        agentId: req.headers['x-agent-id'] || 'unknown',
        fleetId: req.headers['x-fleet-id'] || 'unknown',
        sessionId: req.headers['x-session-id'] || req.sessionID,
        trustLevel: req.headers['x-trust-level'] || 'basic',
        classification: req.headers['x-classification'] || 'UNCLASSIFIED',
        capabilities: (req.headers['x-capabilities'] || '').split(',').filter(Boolean),
        requestedAction: mapHttpMethodToAction(req.method),
        targetResource: req.path,
        userContext: {
          userId: req.user?.id || 'anonymous',
          roles: req.user?.roles || [],
          clearance: req.user?.clearance || 'UNCLASSIFIED',
          organization: req.user?.organization || 'unknown',
        },
        environmentContext: {
          timestamp: Date.now(),
          ipAddress: req.ip,
          airgapped: false,
          federalEnvironment: process.env.FEDERAL_MODE === 'true',
          slsaLevel: (process.env.SLSA_LEVEL || 'SLSA_3') as any,
        },
      };

      // Evaluate policy
      const decision = await evaluatePolicy(context);

      // Attach to request
      req.governanceContext = context;
      req.governanceDecision = decision;

      if (!decision.allow) {
        return res.status(403).json({
          error: 'Access denied',
          reason: decision.reason,
          policyPath: decision.policyPath,
        });
      }

      next();
    } catch (error) {
      console.error('Governance middleware error:', error);
      res.status(500).json({ error: 'Governance check failed' });
    }
  };
}

function mapHttpMethodToAction(method: string): string {
  const methodMap: Record<string, string> = {
    GET: 'read',
    POST: 'create',
    PUT: 'update',
    PATCH: 'update',
    DELETE: 'delete',
  };
  return methodMap[method] || 'unknown';
}

// ============================================================================
// GraphQL Directive
// ============================================================================

export const governanceDirectiveTypeDefs = `
  directive @governed(
    action: String!
    resource: String
    trustLevel: String
    classification: String
  ) on FIELD_DEFINITION
`;

export function createGovernanceDirective(
  evaluatePolicy: (context: AgentPolicyContext) => Promise<PolicyDecision>,
) {
  return {
    governed: (next: any, _source: any, args: any, context: any) => {
      return async (...resolverArgs: any[]) => {
        const policyContext: AgentPolicyContext = {
          agentId: context.agentId || 'graphql',
          fleetId: context.fleetId || 'graphql',
          sessionId: context.sessionId || 'graphql',
          trustLevel: args.trustLevel || context.trustLevel || 'basic',
          classification: args.classification || context.classification || 'UNCLASSIFIED',
          capabilities: context.capabilities || [],
          requestedAction: args.action,
          targetResource: args.resource || 'graphql',
          userContext: {
            userId: context.user?.id || 'anonymous',
            roles: context.user?.roles || [],
            clearance: context.user?.clearance || 'UNCLASSIFIED',
            organization: context.user?.organization || 'unknown',
          },
          environmentContext: {
            timestamp: Date.now(),
            airgapped: false,
            federalEnvironment: true,
            slsaLevel: 'SLSA_3',
          },
        };

        const decision = await evaluatePolicy(policyContext);

        if (!decision.allow) {
          throw new Error(`Access denied: ${decision.reason}`);
        }

        return next(...resolverArgs);
      };
    },
  };
}
