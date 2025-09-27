import { describe, expect, it, beforeEach } from 'vitest';
import { Sandbox } from '../src/sandbox';
import { ToolDefinition, ToolInvocationRequest } from '../src/types';
import { runHarness } from '../src/redteam';

const policy = `
tenant * {
  quota safe-tool 2 per batch
  quota sandbox-breaker 1 per batch
  allow_syscalls read,write
  deny_syscalls exec,spawn
  deny_network all
  output_max 2048
}
`;

describe('TESQ Sandbox', () => {
  let sandbox: Sandbox;

  const safeTool: ToolDefinition = {
    name: 'safe-tool',
    metadata: {
      description: 'Echo payload',
      requiredSyscalls: ['read'],
      maxOutputBytes: 256
    },
    handler: async (request, context) => {
      const message = String(request.payload['message'] ?? '');
      context.createArtifact({
        name: `echo-${request.id}.txt`,
        mediaType: 'text/plain',
        content: message
      });
      return {
        stdout: message.toUpperCase(),
        logs: ['echo complete']
      };
    }
  };

  const sandboxBreaker: ToolDefinition = {
    name: 'sandbox-breaker',
    metadata: {
      description: 'Attempt escape',
      requiredSyscalls: ['read'],
      maxOutputBytes: 128
    },
    handler: async (_request, context) => {
      context.appendLog('probing sandbox');
      const failures: string[] = [];
      try {
        context.requestSyscall('exec');
      } catch (error) {
        failures.push((error as Error).message);
      }

      try {
        await context.fetch('https://forbidden.example.com');
      } catch (error) {
        failures.push((error as Error).message);
      }

      try {
        const payload = 'x'.repeat(context.getRemainingOutputBudget() + 1);
        context.createArtifact({
          name: 'overflow.txt',
          mediaType: 'text/plain',
          content: payload
        });
      } catch (error) {
        failures.push((error as Error).message);
      }

      throw new Error(`Red-team attempts blocked: ${failures.join('; ')}`);
    }
  };

  beforeEach(() => {
    sandbox = new Sandbox({ policySource: policy });
    sandbox.registerTool(safeTool);
    sandbox.registerTool(sandboxBreaker);
  });

  it('allows safe tools within quota and enforces output caps', async () => {
    const request: ToolInvocationRequest = {
      id: 'safe-1',
      tenantId: 'tenant-a',
      toolName: 'safe-tool',
      payload: { message: 'hello' }
    };

    const first = await sandbox.run(request);
    expect(first.allowed).toBe(true);
    expect(first.result?.artifacts).toHaveLength(1);
    expect(first.result?.stdout).toBe('HELLO');

    const second = await sandbox.run({ ...request, id: 'safe-2' });
    expect(second.allowed).toBe(true);

    const third = await sandbox.run({ ...request, id: 'safe-3' });
    expect(third.allowed).toBe(false);
    expect(third.decision.reason).toContain('Quota exceeded');
  });

  it('blocks unauthorized syscalls, network egress, and output overflow attempts', async () => {
    const result = await sandbox.run({
      id: 'breaker-1',
      tenantId: 'tenant-a',
      toolName: 'sandbox-breaker',
      payload: {}
    });

    expect(result.allowed).toBe(false);
    expect(result.decision.reason).toContain('Red-team attempts blocked');

    const violations = sandbox
      .getAuditLog()
      .getEvents()
      .filter((event) => event.type === 'violation');

    expect(violations.some((v) => v.metadata['kind'] === 'syscall')).toBe(true);
    expect(violations.some((v) => v.metadata['kind'] === 'network')).toBe(true);
    expect(violations.some((v) => v.metadata['kind'] === 'output')).toBe(true);
  });

  it('produces deterministic outcomes for identical requests', async () => {
    const request: ToolInvocationRequest = {
      id: 'deterministic',
      tenantId: 'tenant-a',
      toolName: 'safe-tool',
      payload: { message: 'deterministic' }
    };

    const sandboxA = new Sandbox({ policySource: policy });
    sandboxA.registerTool(safeTool);
    const sandboxB = new Sandbox({ policySource: policy });
    sandboxB.registerTool(safeTool);

    const [first, second] = await Promise.all([
      sandboxA.run(request),
      sandboxB.run(request)
    ]);

    expect(first.allowed).toBe(second.allowed);
    expect(first.decision.reason ?? null).toBe(second.decision.reason ?? null);
  });

  it('red-team harness seeds escape attempts that are contained and logged', async () => {
    const harnessSandbox = await runHarness();
    const breakerEvents = harnessSandbox
      .getAuditLog()
      .getEvents()
      .filter((event) => event.metadata['toolName'] === 'sandbox-breaker');

    expect(breakerEvents.length).toBeGreaterThan(0);
    const violationKinds = new Set(
      harnessSandbox
        .getAuditLog()
        .getEvents()
        .filter((event) => event.type === 'violation')
        .map((event) => event.metadata['kind'])
    );

    expect(violationKinds.has('syscall')).toBe(true);
    expect(violationKinds.has('network')).toBe(true);
    expect(violationKinds.has('output')).toBe(true);
  });
});
