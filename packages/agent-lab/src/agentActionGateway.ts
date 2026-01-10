import { ContentBoundary } from './contentBoundary';
import { AuditLogger } from './audit';
import { EvidenceStore } from './evidence';
import { AttributionStatus, PrincipalChain } from './identity';
import { PolicyDecision, PolicyEngine } from './policy';
import { ToolExecution } from './tools';

export interface AgentActionRequest {
  tool: string;
  action: string;
  inputs: Record<string, unknown>;
  target?: string;
  principal: PrincipalChain;
  correlationId: string;
  environment?: string;
}

export interface GatewayOptions {
  policyEngine: PolicyEngine;
  boundary: ContentBoundary;
  auditLogger?: AuditLogger;
  killSwitch?: KillSwitch;
  attributionMode?: 'lenient' | 'strict';
  requireHuman?: boolean;
  maxOutputLength?: number;
  labMode?: boolean;
}

export interface GatewayResult {
  decision: PolicyDecision;
  status: 'allowed' | 'denied' | 'error' | 'kill-switch';
  message: string;
  artifactId?: string;
  redactions?: string[];
  attribution: AttributionStatus;
}

export interface KillSwitchState {
  tripped: boolean;
  reason?: string;
  source?: string;
}

export class KillSwitch {
  constructor(private readonly disabled: boolean, private readonly reason?: string, private readonly source?: string) {}

  static fromEnv(): KillSwitch {
    const disabled = process.env.AGENT_ACTIONS_DISABLED === '1';
    const reason = process.env.AGENT_ACTIONS_DISABLED_REASON;
    return new KillSwitch(disabled, reason, 'env');
  }

  status(): KillSwitchState {
    return { tripped: this.disabled, reason: this.reason, source: this.source };
  }
}

export class AgentActionGateway {
  private readonly attributionMode: 'lenient' | 'strict';

  private readonly maxOutputLength: number;

  constructor(private readonly options: GatewayOptions) {
    this.attributionMode = options.attributionMode ?? 'strict';
    this.maxOutputLength = options.maxOutputLength ?? 2000;
  }

  private validateAttribution(principal: PrincipalChain): AttributionStatus {
    const missing: string[] = [];
    if (!principal.agent?.id) missing.push('agent.id');
    if (!principal.runtime?.sessionId) missing.push('runtime.sessionId');
    if (!principal.runtime?.hostname && !principal.runtime?.id) missing.push('runtime.node');
    if (!principal.request?.correlationId) missing.push('request.correlationId');
    if (this.options.requireHuman && !principal.human?.id) missing.push('human.id');

    return { complete: missing.length === 0, missing, mode: this.attributionMode };
  }

  private enforceOutputBounds(output: unknown): { allowed: boolean; redactions: string[]; message?: string } {
    const serialized = typeof output === 'string' ? output : JSON.stringify(output, null, 2);
    if (serialized.length > this.maxOutputLength) {
      return {
        allowed: false,
        redactions: [],
        message: `Output exceeds configured limit (${serialized.length} > ${this.maxOutputLength})`,
      };
    }
    return { allowed: true, redactions: [] };
  }

  async guardAndExecute(
    request: AgentActionRequest,
    executor: (decision: PolicyDecision) => Promise<ToolExecution>,
    evidence: EvidenceStore,
  ): Promise<GatewayResult> {
    const start = Date.now();
    const attribution = this.validateAttribution(request.principal);
    this.options.auditLogger?.record(
      {
        event_type: 'attempt',
        timestamp: new Date(start).toISOString(),
        correlation_id: request.correlationId,
        principal_chain: request.principal,
        action: { tool: request.tool, action: request.action, target: request.target },
      },
      request.inputs,
    );

    if (this.attributionMode === 'strict' && !attribution.complete) {
      const decision: PolicyDecision = {
        allowed: false,
        reason: `Attribution incomplete: ${attribution.missing.join(', ')}`,
        policyVersion: '1.0.0',
        enforced: ['attribution'],
      };
      this.options.auditLogger?.record(
        {
          event_type: 'decision',
          timestamp: new Date().toISOString(),
          correlation_id: request.correlationId,
          principal_chain: request.principal,
          action: { tool: request.tool, action: request.action, target: request.target },
          policy_decision: { ...decision, attribution_missing: attribution.missing },
          result: { status: 'denied', failure_class: 'attribution', message: decision.reason },
        },
        request.inputs,
      );
      const artifact = evidence.record(
        request.action,
        request.tool,
        'unknown',
        request.inputs,
        { denied: true },
        decision,
        decision.reason,
        request.principal,
        {
          correlationId: request.correlationId,
          target: request.target,
          status: 'denied',
          failureClass: 'attribution',
        },
      );
      return { decision, status: 'denied', message: decision.reason, artifactId: artifact.id, attribution };
    }

    const killSwitch = this.options.killSwitch?.status();
    if (killSwitch?.tripped) {
      const decision: PolicyDecision = {
        allowed: false,
        reason: killSwitch.reason || 'Agent actions disabled by operator',
        policyVersion: '1.0.0',
        enforced: ['kill-switch'],
      };
      this.options.auditLogger?.record(
        {
          event_type: 'decision',
          timestamp: new Date().toISOString(),
          correlation_id: request.correlationId,
          principal_chain: request.principal,
          action: { tool: request.tool, action: request.action, target: request.target },
          policy_decision: { ...decision, kill_switch_triggered: true },
          result: { status: 'kill-switch', failure_class: 'kill-switch', message: decision.reason },
        },
        request.inputs,
      );
      const artifact = evidence.record(
        request.action,
        request.tool,
        'unknown',
        request.inputs,
        { denied: true },
        decision,
        decision.reason,
        request.principal,
        {
          correlationId: request.correlationId,
          target: request.target,
          status: 'denied',
          failureClass: 'kill-switch',
        },
      );
      return { decision, status: 'kill-switch', message: decision.reason, artifactId: artifact.id, attribution };
    }

    const decision = this.options.policyEngine.evaluate({
      tool: request.tool,
      target: request.target,
      labMode: this.options.labMode ?? true,
      environment: request.environment,
    });

    this.options.auditLogger?.record(
      {
        event_type: 'decision',
        timestamp: new Date().toISOString(),
        correlation_id: request.correlationId,
        principal_chain: request.principal,
        action: { tool: request.tool, action: request.action, target: request.target },
        policy_decision: decision,
        result: decision.allowed
          ? { status: 'allowed', message: decision.reason }
          : { status: 'denied', failure_class: 'policy-deny', message: decision.reason },
      },
      request.inputs,
    );

    if (!decision.allowed) {
      const artifact = evidence.record(
        request.action,
        request.tool,
        'unknown',
        request.inputs,
        { denied: true },
        decision,
        decision.reason,
        request.principal,
        {
          correlationId: request.correlationId,
          target: request.target,
          status: 'denied',
          failureClass: 'policy-deny',
        },
      );
      return { decision, status: 'denied', message: decision.reason, artifactId: artifact.id, attribution };
    }

    const executionStarted = Date.now();
    try {
      const execution = await executor(decision);
      const bounds = this.enforceOutputBounds(execution.output);
      if (!bounds.allowed) {
        const boundedDecision: PolicyDecision = { ...decision, allowed: false, reason: bounds.message ?? decision.reason };
        const artifact = evidence.record(
          request.action,
          request.tool,
          'unknown',
          request.inputs,
          { denied: true },
          boundedDecision,
          bounds.message,
          request.principal,
          {
            correlationId: request.correlationId,
            target: request.target,
            status: 'denied',
            failureClass: 'egress',
          },
        );
        this.options.auditLogger?.record(
          {
            event_type: 'result',
            timestamp: new Date().toISOString(),
            correlation_id: request.correlationId,
            principal_chain: request.principal,
            action: { tool: request.tool, action: request.action, target: request.target },
            policy_decision: boundedDecision,
            result: { status: 'denied', failure_class: 'egress', message: bounds.message },
            latency_ms: Date.now() - start,
          },
          request.inputs,
        );
        return { decision: boundedDecision, status: 'denied', message: bounds.message ?? 'Output blocked', artifactId: artifact.id, attribution };
      }

      const artifact = evidence.record(
        request.action,
        request.tool,
        'unknown',
        request.inputs,
        execution.output,
        decision,
        execution.notes,
        request.principal,
        {
          correlationId: request.correlationId,
          target: request.target,
          status: 'allowed',
          latencyMs: Date.now() - executionStarted,
        },
      );

      this.options.auditLogger?.record(
        {
          event_type: 'result',
          timestamp: new Date().toISOString(),
          correlation_id: request.correlationId,
          principal_chain: request.principal,
          action: { tool: request.tool, action: request.action, target: request.target },
          policy_decision: decision,
          result: { status: 'allowed', message: execution.notes },
          latency_ms: Date.now() - start,
        },
        request.inputs,
        execution.output,
      );

      return { decision, status: 'allowed', message: 'Completed', artifactId: artifact.id, redactions: artifact.redaction, attribution };
    } catch (err: any) {
      const message = err?.message ?? String(err);
      this.options.auditLogger?.record(
        {
          event_type: 'result',
          timestamp: new Date().toISOString(),
          correlation_id: request.correlationId,
          principal_chain: request.principal,
          action: { tool: request.tool, action: request.action, target: request.target },
          policy_decision: decision,
          result: { status: 'error', failure_class: 'execution', message },
          latency_ms: Date.now() - start,
        },
        request.inputs,
      );
      const artifact = evidence.record(
        request.action,
        request.tool,
        'unknown',
        request.inputs,
        { error: message },
        decision,
        message,
        request.principal,
        {
          correlationId: request.correlationId,
          target: request.target,
          status: 'error',
          failureClass: 'execution',
        },
      );
      return { decision: { ...decision, reason: message }, status: 'error', message, artifactId: artifact.id, attribution };
    }
  }
}
