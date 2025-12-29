import { AuditLog } from './audit.js';
import { QuotaManager } from './quota.js';
import { SandboxValidator } from './sandbox.js';
import { ToolRegistry } from './tool-registry.js';
import { ApprovalRequirement, GuardDecision, ToolCall } from './types.js';

interface ExecutionGuardOptions {
  quotas: QuotaManager;
  registry: ToolRegistry;
  auditLog?: AuditLog;
  sandbox?: SandboxValidator;
}

export class ExecutionGuard {
  private readonly auditLog: AuditLog;

  constructor(private readonly options: ExecutionGuardOptions) {
    this.auditLog = options.auditLog ?? new AuditLog();
  }

  evaluate(call: ToolCall): GuardDecision {
    const tool = this.options.registry.getTool(call.toolId);
    const reasons: string[] = [];
    const warnings: string[] = [];

    if (!tool) {
      throw new Error(`Tool ${call.toolId} is not registered`);
    }

    if (tool.killSwitch) {
      reasons.push('Tool kill switch is enabled');
    }

    if (tool.deprecatedAt) {
      warnings.push('Tool is deprecated');
    }

    const approval: ApprovalRequirement = {
      required: tool.approvalRequired || tool.highBlastRadius || call.action === 'write',
      reason: tool.highBlastRadius ? 'High blast radius' : undefined,
    };

    if (approval.required && !call.approved) {
      reasons.push('Approval required for this action');
    }

    try {
      this.options.registry.assertScope(
        call.role,
        { action: call.action, domains: [call.domain], environments: [call.environment], approvalRequired: approval.required, highBlastRadius: tool.highBlastRadius },
        tool,
        call.environment,
      );
    } catch (error) {
      reasons.push((error as Error).message);
    }

    const rateLimited = this.options.registry.isRateLimited(call.toolId, call.tenantId);
    if (rateLimited) {
      reasons.push('Rate limit exceeded');
    }

    const quotaResult = this.options.quotas.consume(call.tenantId, call.userId, call.idempotencyKey);
    if (!quotaResult.tenant.allowed) {
      reasons.push('Tenant quota exceeded');
    }
    if (!quotaResult.user.allowed) {
      reasons.push('User quota exceeded');
    }

    if (this.options.sandbox && call.action === 'write') {
      const sandboxDecision = this.options.sandbox.validate({ command: tool.name, args: [], payload: call.payload });
      if (!sandboxDecision.allowed) {
        reasons.push(...sandboxDecision.reasons);
      }
    }

    const approved = reasons.length === 0;
    const effect: GuardDecision['effect'] = call.simulate
      ? 'simulate'
      : approval.required && !call.approved
        ? 'pending_approval'
        : approved
          ? 'allow'
          : 'deny';

    const decision: GuardDecision = {
      allowed: effect === 'allow' || effect === 'simulate',
      effect,
      approval,
      quotaRemaining: {
        tenant: quotaResult.tenant.remaining,
        user: quotaResult.user.remaining,
      },
      rateLimited,
      reasons,
      auditId: this.options.registry.createAuditId(),
      warnings,
    };

    this.auditLog.append({
      id: decision.auditId,
      timestamp: Date.now(),
      call,
      decision: {
        allowed: decision.allowed,
        effect: decision.effect,
        reasons: decision.reasons,
        approvalRequired: decision.approval.required,
      },
    });

    return decision;
  }
}
