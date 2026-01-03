import path from 'path';

import { AgentActionGateway, AgentActionRequest, GatewayResult, KillSwitch } from './agentActionGateway';
import { AuditLogger } from './audit';
import { ContentBoundary } from './contentBoundary';
import { EvidenceStore, RunSummary } from './evidence';
import { PrincipalChain } from './identity';
import { BasicPolicyEngine, PolicyConfig, PolicyDecision, PolicyEngine } from './policy';
import { ToolDefinition } from './tools';
import { WorkflowSpec } from './workflowSpec';

export interface ToolBusOptions {
  baseArtifactsDir: string;
  boundary: ContentBoundary;
  policyConfig: PolicyConfig;
  policyEngine?: PolicyEngine;
  dryRun: boolean;
  labMode: boolean;
  timeoutMs?: number;
  principal: PrincipalChain;
  correlationId: string;
  environment?: string;
  attributionMode?: 'lenient' | 'strict';
  requireHuman?: boolean;
  killSwitch?: KillSwitch;
}

export class ToolBus {
  private registry: Record<string, ToolDefinition> = {};

  private readonly policy: PolicyEngine;

  private readonly gateway: AgentActionGateway;

  constructor(private readonly options: ToolBusOptions) {
    this.policy = options.policyEngine ?? new BasicPolicyEngine(options.policyConfig);
    const audit = new AuditLogger(path.join(options.baseArtifactsDir, 'runs', options.correlationId), options.boundary);
    this.gateway = new AgentActionGateway({
      policyEngine: this.policy,
      boundary: options.boundary,
      auditLogger: audit,
      killSwitch: options.killSwitch ?? KillSwitch.fromEnv(),
      attributionMode: options.attributionMode,
      requireHuman: options.requireHuman,
      maxOutputLength: options.policyConfig.dataEgress?.maxOutputLength,
      labMode: options.labMode,
    });
  }

  register(tool: ToolDefinition) {
    this.registry[tool.name] = tool;
  }

  listTools() {
    return Object.values(this.registry).map((tool) => ({ name: tool.name, version: tool.version, description: tool.description }));
  }

  async execute(
    toolName: string,
    inputs: Record<string, unknown>,
    evidence: EvidenceStore,
    stepName: string,
  ): Promise<{ decision: PolicyDecision; artifactId?: string; status: GatewayResult['status']; message: string }> {
    const tool = this.registry[toolName];
    if (!tool) {
      return { decision: { allowed: false, reason: 'Unknown tool', policyVersion: '1.0.0' }, status: 'denied', message: 'Tool not registered' };
    }

    const target = typeof inputs.url === 'string' ? inputs.url : typeof inputs.domain === 'string' ? inputs.domain : undefined;
    const action: AgentActionRequest = {
      tool: tool.name,
      action: stepName,
      inputs,
      target,
      principal: this.options.principal,
      correlationId: this.options.correlationId,
      environment: this.options.environment,
    };

    const result = await this.gateway.guardAndExecute(
      action,
      (decision) => {
        return tool.execute(inputs, {
          labMode: this.options.labMode,
          dryRun: this.options.dryRun,
          boundary: this.options.boundary,
          evidenceRoot: evidence.runPath,
          policyDecision: decision,
          timeoutMs: this.options.timeoutMs ?? this.options.policyConfig.defaultTimeoutMs ?? 5000,
        });
      },
      evidence,
    );

    return { decision: result.decision, artifactId: result.artifactId, status: result.status, message: result.message };
  }
}

export interface WorkflowRunOptions {
  workflow: WorkflowSpec;
  workflowPath: string;
  bus: ToolBus;
  evidence: EvidenceStore;
  targets?: string[];
}

export const runWorkflow = async (options: WorkflowRunOptions): Promise<RunSummary> => {
  const { workflow, bus, evidence, workflowPath, targets } = options;
  evidence.init();
  const startedAt = new Date().toISOString();
  const stepsSummary: RunSummary['steps'] = [];

  const runTargets = targets && targets.length > 0 ? targets : [''];

  for (const target of runTargets) {
    for (const step of workflow.steps) {
      const inputs = { ...(step.inputs ?? {}) } as Record<string, unknown>;
      if (target) {
        if (inputs.url === '{{target}}') {
          inputs.url = target;
        }
        if (inputs.domain === '{{target}}') {
          inputs.domain = target;
        }
        if (!inputs.url && !inputs.domain) {
          inputs.target = target;
        }
      }

      const result = await bus.execute(step.tool, inputs, evidence, step.name);
      stepsSummary.push({
        name: target ? `${step.name} (${target})` : step.name,
        tool: step.tool,
        status: result.status,
        message: result.message,
        evidenceId: result.artifactId,
      });
    }
  }

  const finishedAt = new Date().toISOString();
  const summary: RunSummary = {
    runId: path.basename(evidence.runPath),
    workflow: workflowPath,
    startedAt,
    finishedAt,
    steps: stepsSummary,
    objectives: workflow.objectives,
    expect: workflow.expect,
    policyVersion: '1.0.0',
  };
  evidence.writeRunSummary(summary);
  const reportLines = [
    `# Agent Lab Run Report`,
    `- Workflow: ${workflow.name}`,
    `- Run ID: ${summary.runId}`,
    `- Started: ${startedAt}`,
    `- Finished: ${finishedAt}`,
    '',
    '## Steps',
    ...stepsSummary.map((s) => `- [${s.status}] ${s.name} via ${s.tool} (evidence ${s.evidenceId ?? 'n/a'}): ${s.message}`),
  ];
  evidence.writeReport(reportLines.join('\n'));
  return summary;
};

export const createDefaultBus = (
  workflow: WorkflowSpec,
  runId: string,
  boundary: ContentBoundary,
  artifactsDir: string,
  tools: ToolDefinition[],
  dryRun: boolean,
  labMode: boolean,
) => {
  const policyConfig: PolicyConfig = {
    allowedTools: workflow.policy?.allowedTools ?? tools.map((t) => t.name),
    targetAllowlist: workflow.policy?.targetAllowlist ?? ['example.com', 'example.org', 'localhost'],
    commandAllowlist: workflow.policy?.commandAllowlist,
    defaultTimeoutMs: workflow.policy?.defaultTimeoutMs ?? 5000,
    rateLimit: { maxCalls: 50, intervalMs: 60000 },
    dataEgress: { maxOutputLength: 2000, redactSecrets: true },
    deniedTools: workflow.policy?.denylist,
    environmentRestrictions: workflow.policy?.environmentRestrictions,
  };
  const bus = new ToolBus({
    baseArtifactsDir: artifactsDir,
    boundary,
    policyConfig,
    dryRun,
    labMode,
    principal: {
      agent: { id: workflow.name, displayName: 'agent-lab', source: 'workflow' },
      runtime: { id: runId, sessionId: runId, hostname: process.env.HOSTNAME },
      request: { correlationId: runId, workflowRunId: runId },
    },
    correlationId: runId,
    environment: process.env.AGENT_LAB_ENV ?? 'dev',
    attributionMode: workflow.policy?.attributionMode ?? 'strict',
    requireHuman: workflow.policy?.requireHuman === true,
  });
  tools.forEach((tool) => bus.register(tool));
  const evidence = new EvidenceStore(path.join(artifactsDir, 'runs'), boundary, runId);
  return { bus, evidence };
};
