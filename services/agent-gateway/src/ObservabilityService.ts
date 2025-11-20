/**
 * Observability Service
 * AGENT-7: Observability & Audit
 * Integrates with OpenTelemetry for distributed tracing and metrics
 */

import { randomUUID } from 'crypto';
import type { Agent, AgentRun } from './types.js';

export interface TraceContext {
  traceId: string;
  spanId: string;
}

export class ObservabilityService {
  constructor(
    private metricsEnabled: boolean = true,
    private tracingEnabled: boolean = true
  ) {}

  /**
   * Start a distributed trace for an agent run
   * AGENT-7a: Structured logging for agent runs
   */
  async startTrace(agent: Agent, run: AgentRun): Promise<TraceContext> {
    if (!this.tracingEnabled) {
      return {
        traceId: randomUUID(),
        spanId: randomUUID(),
      };
    }

    const traceId = randomUUID();
    const spanId = randomUUID();

    // Log structured trace start
    this.log('info', 'agent_run_started', {
      traceId,
      spanId,
      agentId: agent.id,
      agentName: agent.name,
      runId: run.id,
      tenantId: run.tenantId,
      operationMode: run.operationMode,
      timestamp: new Date().toISOString(),
    });

    // In a real implementation, this would integrate with OpenTelemetry SDK
    // Example:
    // const tracer = opentelemetry.trace.getTracer('agent-gateway');
    // const span = tracer.startSpan('agent.run', {
    //   attributes: {
    //     'agent.id': agent.id,
    //     'agent.name': agent.name,
    //     'run.id': run.id,
    //     'operation.mode': run.operationMode,
    //   },
    // });

    return { traceId, spanId };
  }

  /**
   * End a trace
   */
  async endTrace(
    traceId: string,
    spanId: string,
    result: { status: 'success' | 'error'; error?: string }
  ): Promise<void> {
    if (!this.tracingEnabled) {
      return;
    }

    this.log('info', 'agent_run_completed', {
      traceId,
      spanId,
      status: result.status,
      error: result.error,
      timestamp: new Date().toISOString(),
    });

    // In real implementation:
    // span.setStatus({ code: result.status === 'success' ? SpanStatusCode.OK : SpanStatusCode.ERROR });
    // if (result.error) span.recordException(result.error);
    // span.end();
  }

  /**
   * Log an event within a trace
   */
  async logEvent(
    traceId: string,
    spanId: string,
    eventType: string,
    data: Record<string, unknown>
  ): Promise<void> {
    this.log('info', eventType, {
      traceId,
      spanId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Record a metric
   * AGENT-16a: Define metrics
   */
  async recordMetric(
    metricName: string,
    value: number,
    tags: Record<string, string>
  ): Promise<void> {
    if (!this.metricsEnabled) {
      return;
    }

    this.log('metric', metricName, {
      value,
      tags,
      timestamp: new Date().toISOString(),
    });

    // In real implementation, this would use OpenTelemetry metrics:
    // const meter = opentelemetry.metrics.getMeter('agent-gateway');
    // const counter = meter.createCounter(metricName);
    // counter.add(value, tags);
  }

  /**
   * Record agent action metrics
   */
  async recordActionMetrics(
    agentId: string,
    actionType: string,
    status: 'success' | 'failed' | 'denied',
    durationMs: number
  ): Promise<void> {
    await this.recordMetric('agent.actions.total', 1, {
      agent_id: agentId,
      action_type: actionType,
      status,
    });

    await this.recordMetric('agent.actions.duration', durationMs, {
      agent_id: agentId,
      action_type: actionType,
    });
  }

  /**
   * Record quota usage metrics
   */
  async recordQuotaMetrics(
    agentId: string,
    quotaType: string,
    used: number,
    limit: number
  ): Promise<void> {
    await this.recordMetric('agent.quota.used', used, {
      agent_id: agentId,
      quota_type: quotaType,
    });

    const utilizationPercent = (used / limit) * 100;
    await this.recordMetric('agent.quota.utilization', utilizationPercent, {
      agent_id: agentId,
      quota_type: quotaType,
    });
  }

  /**
   * Structured logging
   * AGENT-7a: Structured logging for agent runs
   */
  private log(
    level: 'debug' | 'info' | 'warn' | 'error' | 'metric',
    message: string,
    data?: Record<string, unknown>
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: 'agent-gateway',
      ...data,
    };

    // In production, this would use a structured logger like Pino
    // For now, use console
    const logMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    logMethod(JSON.stringify(logEntry));
  }

  /**
   * Log policy violation
   */
  async logPolicyViolation(
    agentId: string,
    agentName: string,
    actionType: string,
    reason: string,
    traceId?: string
  ): Promise<void> {
    this.log('warn', 'agent_policy_violation', {
      agentId,
      agentName,
      actionType,
      reason,
      traceId,
    });

    await this.recordMetric('agent.policy_violations.total', 1, {
      agent_id: agentId,
      action_type: actionType,
    });
  }

  /**
   * Log quota exceeded
   */
  async logQuotaExceeded(
    agentId: string,
    quotaType: string,
    limit: number,
    used: number
  ): Promise<void> {
    this.log('warn', 'agent_quota_exceeded', {
      agentId,
      quotaType,
      limit,
      used,
    });

    await this.recordMetric('agent.quota_exceeded.total', 1, {
      agent_id: agentId,
      quota_type: quotaType,
    });
  }

  /**
   * Log high-risk action attempt
   */
  async logHighRiskAction(
    agentId: string,
    agentName: string,
    actionType: string,
    riskLevel: string,
    requiresApproval: boolean,
    traceId?: string
  ): Promise<void> {
    this.log('warn', 'agent_high_risk_action', {
      agentId,
      agentName,
      actionType,
      riskLevel,
      requiresApproval,
      traceId,
    });

    await this.recordMetric('agent.high_risk_actions.total', 1, {
      agent_id: agentId,
      action_type: actionType,
      risk_level: riskLevel,
    });
  }

  /**
   * Log approval decision
   */
  async logApprovalDecision(
    approvalId: string,
    agentId: string,
    decision: 'approved' | 'rejected',
    decidedBy: string,
    traceId?: string
  ): Promise<void> {
    this.log('info', 'agent_approval_decision', {
      approvalId,
      agentId,
      decision,
      decidedBy,
      traceId,
    });

    await this.recordMetric('agent.approvals.decisions.total', 1, {
      agent_id: agentId,
      decision,
    });
  }
}
