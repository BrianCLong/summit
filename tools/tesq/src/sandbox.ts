import { AuditLog } from './audit';
import { PolicyEngine } from './policy';
import { TenantQuotaManager } from './quota';
import {
  SandboxContext,
  SandboxRunResult,
  SandboxArtifact,
  TenantPolicy,
  ToolDefinition,
  ToolExecutionResult,
  ToolInvocationRequest
} from './types';

class GuardedSandboxContext implements SandboxContext {
  private readonly artifacts: SandboxArtifact[] = [];
  private readonly logs: string[] = [];
  private consumedBytes = 0;

  constructor(
    private readonly policy: TenantPolicy,
    private readonly auditLog: AuditLog,
    private readonly parentId: string
  ) {}

  requestSyscall(syscall: string): void {
    if (
      this.policy.deniedSyscalls.has(syscall) ||
      (!this.policy.allowAllSyscalls && !this.policy.allowedSyscalls.has(syscall))
    ) {
      this.auditLog.record(
        'violation',
        {
          kind: 'syscall',
          syscall,
          message: `Denied syscall ${syscall}`
        },
        this.parentId
      );
      throw new Error(`Syscall ${syscall} denied by policy`);
    }
    this.auditLog.record(
      'tool-execution',
      {
        stage: 'syscall',
        syscall
      },
      this.parentId
    );
  }

  async fetch(target: string): Promise<string> {
    let destination: string;
    try {
      const url = new URL(target);
      const port = url.port || (url.protocol === 'https:' ? '443' : '80');
      destination = `${url.hostname}:${port}`;
    } catch (error) {
      throw new Error(`Invalid URL ${target}: ${(error as Error).message}`);
    }

    if (this.policy.deniedAllNetwork) {
      this.auditLog.record(
        'violation',
        {
          kind: 'network',
          destination,
          message: 'Network egress denied by policy'
        },
        this.parentId
      );
      throw new Error('Network egress denied by policy');
    }

    if (!this.policy.allowAllNetwork) {
      const hostAllowed = this.policy.allowedNetworkDestinations.has(destination);
      const hostnameAllowed = this.policy.allowedNetworkDestinations.has(destination.split(':')[0]);
      if (!hostAllowed && !hostnameAllowed) {
        this.auditLog.record(
          'violation',
          {
            kind: 'network',
            destination,
            message: 'Network destination not allowlisted'
          },
          this.parentId
        );
        throw new Error(`Network destination ${destination} not allowlisted`);
      }
    }

    this.auditLog.record(
      'tool-execution',
      {
        stage: 'network-egress',
        destination
      },
      this.parentId
    );

    return `Egress to ${destination} suppressed in sandbox`;
  }

  createArtifact(artifact: SandboxArtifact): void {
    const size = Buffer.byteLength(artifact.content, 'utf8');
    this.ensureBudget(size, `artifact ${artifact.name}`);
    this.artifacts.push(artifact);
    this.consumedBytes += size;
    this.auditLog.record(
      'artifact',
      {
        name: artifact.name,
        mediaType: artifact.mediaType,
        size
      },
      this.parentId
    );
  }

  appendLog(message: string): void {
    this.logs.push(message);
  }

  getRemainingOutputBudget(): number {
    return Math.max(this.policy.outputMaxBytes - this.consumedBytes, 0);
  }

  getArtifacts(): SandboxArtifact[] {
    return [...this.artifacts];
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  getConsumedBytes(): number {
    return this.consumedBytes;
  }

  ensureBudget(size: number, context: string) {
    if (this.consumedBytes + size > this.policy.outputMaxBytes) {
      this.auditLog.record(
        'violation',
        {
          kind: 'output',
          context,
          message: 'Output budget exceeded'
        },
        this.parentId
      );
      throw new Error('Output budget exceeded');
    }
  }
}

function normalizeResult(
  rawResult: ToolExecutionResult | undefined,
  context: GuardedSandboxContext,
  policy: TenantPolicy,
  auditLog: AuditLog,
  toolEventId: string
): ToolExecutionResult {
  const result: ToolExecutionResult = {
    stdout: rawResult?.stdout,
    artifacts: [],
    logs: []
  };

  let remaining = policy.outputMaxBytes - context.getConsumedBytes();

  if (rawResult?.stdout) {
    const size = Buffer.byteLength(rawResult.stdout, 'utf8');
    if (size > remaining) {
      auditLog.record(
        'violation',
        {
          kind: 'output',
          context: 'stdout',
          message: 'Output budget exceeded'
        },
        toolEventId
      );
      throw new Error('Output budget exceeded');
    }
    remaining -= size;
    result.stdout = rawResult.stdout;
  }

  const combinedArtifacts: SandboxArtifact[] = [];
  for (const artifact of context.getArtifacts()) {
    combinedArtifacts.push(artifact);
  }

  if (rawResult?.artifacts) {
    for (const artifact of rawResult.artifacts) {
      const size = Buffer.byteLength(artifact.content, 'utf8');
      if (size > remaining) {
        auditLog.record(
          'violation',
          {
            kind: 'output',
            context: `artifact ${artifact.name}`,
            message: 'Output budget exceeded'
          },
          toolEventId
        );
        throw new Error('Output budget exceeded');
      }
      remaining -= size;
      combinedArtifacts.push(artifact);
      auditLog.record(
        'artifact',
        {
          name: artifact.name,
          mediaType: artifact.mediaType,
          size
        },
        toolEventId
      );
    }
  }

  result.artifacts = combinedArtifacts;
  result.logs = [...(rawResult?.logs ?? []), ...context.getLogs()];
  return result;
}

export interface SandboxOptions {
  policySource: string;
  auditLog?: AuditLog;
  quotaManager?: TenantQuotaManager;
}

export class Sandbox {
  private readonly tools: Map<string, ToolDefinition> = new Map();
  private readonly auditLog: AuditLog;
  private readonly quotaManager: TenantQuotaManager;
  private readonly policyEngine: PolicyEngine;

  constructor(options: SandboxOptions) {
    this.auditLog = options.auditLog ?? new AuditLog();
    this.quotaManager = options.quotaManager ?? new TenantQuotaManager();
    this.policyEngine = new PolicyEngine(options.policySource, this.quotaManager);
  }

  public registerTool(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  public getAuditLog(): AuditLog {
    return this.auditLog;
  }

  public async run(request: ToolInvocationRequest): Promise<SandboxRunResult> {
    const requestEvent = this.auditLog.record('request', {
      requestId: request.id,
      tenantId: request.tenantId,
      toolName: request.toolName
    });

    const tool = this.tools.get(request.toolName);
    const policy = this.policyEngine.getPolicyForTenant(request.tenantId);

    if (!tool) {
      this.auditLog.record(
        'violation',
        {
          kind: 'tool',
          message: `Tool ${request.toolName} is not registered`
        },
        requestEvent.id
      );
      return {
        allowed: false,
        decision: {
          allowed: false,
          reason: `Tool ${request.toolName} is not registered`,
          policy
        }
      };
    }

    const decision = this.policyEngine.evaluate(request, tool, this.quotaManager);
    if (!decision.allowed) {
      this.auditLog.record(
        'violation',
        {
          kind: 'policy',
          reason: decision.reason
        },
        requestEvent.id
      );
      return {
        allowed: false,
        decision
      };
    }

    const toolEvent = this.auditLog.record(
      'tool-execution',
      {
        stage: 'start',
        toolName: tool.name
      },
      requestEvent.id
    );

    const context = new GuardedSandboxContext(decision.policy, this.auditLog, toolEvent.id);

    try {
      const rawResult = await tool.handler(request, context);
      const result = normalizeResult(rawResult, context, decision.policy, this.auditLog, toolEvent.id);
      this.auditLog.record(
        'tool-execution',
        {
          stage: 'finish',
          toolName: tool.name
        },
        toolEvent.id
      );
      return {
        allowed: true,
        result,
        decision
      };
    } catch (error) {
      this.auditLog.record(
        'violation',
        {
          kind: 'runtime',
          message: (error as Error).message
        },
        toolEvent.id
      );
      return {
        allowed: false,
        decision: {
          allowed: false,
          reason: (error as Error).message,
          policy: decision.policy
        }
      };
    }
  }
}
