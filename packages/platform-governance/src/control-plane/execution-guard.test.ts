import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AuditLog } from './audit.js';
import { ExecutionGuard } from './execution-guard.js';
import { QuotaManager } from './quota.js';
import { SandboxValidator } from './sandbox.js';
import { SafeTool, redactSecrets } from './safe-tool.js';
import { ToolRegistry, createDefaultRoles } from './tool-registry.js';
import { ToolDefinition } from './types.js';

const defaultTool = (overrides: Partial<ToolDefinition> = {}): ToolDefinition => ({
  id: 'case-writer',
  name: 'Case Writer',
  description: 'Writes case notes',
  owner: 'ops-team',
  scopes: ['read', 'write'],
  domains: ['cases'],
  environments: ['staging', 'prod'],
  rateLimit: { maxCalls: 5, intervalSeconds: 60 },
  highBlastRadius: false,
  approvalRequired: true,
  supportsDryRun: true,
  idempotent: true,
  ...overrides,
});

const registryWithDefaults = (): ToolRegistry => {
  const registry = new ToolRegistry();
  for (const role of createDefaultRoles()) {
    registry.registerRole(role);
  }
  registry.registerTool(defaultTool());
  return registry;
};

const createQuotas = () =>
  new QuotaManager({
    tenant: { maxCalls: 10, intervalSeconds: 60 },
    user: { maxCalls: 5, intervalSeconds: 60 },
  });

const baseCall = {
  toolId: 'case-writer',
  actorId: 'agent-1',
  role: 'support_copilot' as const,
  tenantId: 'tenant-1',
  userId: 'user-1',
  environment: 'staging',
  domain: 'cases',
};

describe('ExecutionGuard', () => {
  it('allows permitted reads without approvals', () => {
    const registry = registryWithDefaults();
    const guard = new ExecutionGuard({ registry, quotas: createQuotas() });
    const decision = guard.evaluate({ ...baseCall, action: 'read', approved: true });

    expect(decision.allowed).toBe(true);
    expect(decision.effect).toBe('allow');
    expect(decision.reasons).toHaveLength(0);
  });

  it('requires approval for high-blast writes', () => {
    const registry = registryWithDefaults();
    registry.registerTool(defaultTool({ id: 'ops-writer', name: 'Ops Writer', highBlastRadius: true }));
    const guard = new ExecutionGuard({ registry, quotas: createQuotas() });

    const decision = guard.evaluate({ ...baseCall, toolId: 'ops-writer', action: 'write', approved: false });
    expect(decision.effect).toBe('pending_approval');
    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toContain('Approval required for this action');
  });

  it('denies when rate limit is exceeded', () => {
    const registry = registryWithDefaults();
    registry.registerTool(defaultTool({ id: 'limited-tool', rateLimit: { maxCalls: 1, intervalSeconds: 60 } }));
    const guard = new ExecutionGuard({ registry, quotas: createQuotas() });

    const first = guard.evaluate({ ...baseCall, toolId: 'limited-tool', action: 'read', approved: true });
    const second = guard.evaluate({ ...baseCall, toolId: 'limited-tool', action: 'read', approved: true });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    expect(second.rateLimited).toBe(true);
    expect(second.reasons).toContain('Rate limit exceeded');
  });

  it('enforces sandbox scanning on write payloads', () => {
    const registry = registryWithDefaults();
    const sandbox = new SandboxValidator({
      allowedCommands: ['Case Writer'],
      maxCpuSeconds: 10,
      maxMemoryMb: 256,
      maxDurationMs: 1000,
    });
    const guard = new ExecutionGuard({ registry, quotas: createQuotas(), sandbox });

    const decision = guard.evaluate({
      ...baseCall,
      action: 'write',
      approved: true,
      payload: { secret_key: 'abc123' },
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasons.some((r) => r.includes('Payload contains potential secret material'))).toBe(true);
  });

  it('supports idempotency keys for replay protection without double counting quota', () => {
    const registry = registryWithDefaults();
    const guard = new ExecutionGuard({ registry, quotas: createQuotas() });

    const key = 'fixed-idempotency-key';
    const first = guard.evaluate({ ...baseCall, action: 'read', approved: true, idempotencyKey: key });
    const remainingAfterFirst = first.quotaRemaining;
    const second = guard.evaluate({ ...baseCall, action: 'read', approved: true, idempotencyKey: key });

    expect(second.allowed).toBe(true);
    expect(second.effect).toBe('allow');
    expect(second.quotaRemaining).toEqual(remainingAfterFirst);
  });

  it('provides safe tools with dry-run redaction', async () => {
    const tool = new SafeTool(
      'case-writer',
      z.object({ caseId: z.string(), secret: z.string() }),
      async (input) => ({ message: `updated ${input.caseId}`, secret: input.secret }),
      redactSecrets,
    );

    const result = await tool.run({ caseId: 'c-1', secret: 'do-not-leak' }, { dryRun: true });
    expect(result.redacted.secret).toBe('[REDACTED]');
  });

  it('records audit log entries for every evaluation', () => {
    const registry = registryWithDefaults();
    const auditLog = new AuditLog();
    const guard = new ExecutionGuard({ registry, quotas: createQuotas(), auditLog });
    guard.evaluate({ ...baseCall, action: 'read', approved: true });

    const latest = auditLog.latest(1)[0];
    expect(latest.decision.effect).toBe('allow');
    expect(latest.call.toolId).toBe('case-writer');
  });
});
