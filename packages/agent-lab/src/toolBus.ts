import path from 'path';

import { ContentBoundary } from './contentBoundary.js';
import { EvidenceStore, RunSummary } from './evidence.js';
import { BasicPolicyEngine, PolicyConfig, PolicyDecision, PolicyEngine } from './policy.js';
import { ToolDefinition } from './tools.js';
import { WorkflowSpec } from './workflowSpec.js';

export interface ToolBusOptions {
  baseArtifactsDir: string;
  boundary: ContentBoundary;
  policyConfig: PolicyConfig;
  policyEngine?: PolicyEngine;
  dryRun: boolean;
  labMode: boolean;
  timeoutMs?: number;
}

export class ToolBus {
  private registry: Record<string, ToolDefinition> = {};

  private readonly policy: PolicyEngine;

  constructor(private readonly options: ToolBusOptions) {
    this.policy = options.policyEngine ?? new BasicPolicyEngine(options.policyConfig);
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
  ): Promise<{ decision: PolicyDecision; artifactId?: string; status: 'allowed' | 'denied' | 'error'; message: string }> {
    const tool = this.registry[toolName];
    if (!tool) {
      return { decision: { allowed: false, reason: 'Unknown tool', policyVersion: '1.0.0' }, status: 'denied', message: 'Tool not registered' };
    }

    const target = typeof inputs.url === 'string' ? inputs.url : typeof inputs.domain === 'string' ? inputs.domain : undefined;
    const decision = this.policy.evaluate({ tool: toolName, target, labMode: this.options.labMode });
    if (!decision.allowed) {
      const artifact = evidence.record(stepName, tool.name, tool.version, inputs, { denied: true }, decision, decision.reason);
      return { decision, artifactId: artifact.id, status: 'denied', message: decision.reason };
    }

    try {
      const result = await tool.execute(inputs, {
        labMode: this.options.labMode,
        dryRun: this.options.dryRun,
        boundary: this.options.boundary,
        evidenceRoot: evidence.runPath,
        policyDecision: decision,
        timeoutMs: this.options.timeoutMs ?? this.options.policyConfig.defaultTimeoutMs ?? 5000,
      });
      const artifact = evidence.record(stepName, tool.name, tool.version, inputs, result.output, decision, result.notes);
      return { decision, artifactId: artifact.id, status: 'allowed', message: 'Completed' };
    } catch (err: any) {
      const artifact = evidence.record(stepName, tool.name, tool.version, inputs, { error: err?.message ?? String(err) }, decision);
      return { decision, artifactId: artifact.id, status: 'error', message: err?.message ?? String(err) };
    }
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
    allowedTools: tools.map((t) => t.name),
    targetAllowlist: workflow.policy?.targetAllowlist ?? ['example.com', 'example.org', 'localhost'],
    commandAllowlist: workflow.policy?.commandAllowlist,
    defaultTimeoutMs: workflow.policy?.defaultTimeoutMs ?? 5000,
    rateLimit: { maxCalls: 50, intervalMs: 60000 },
  };
  const bus = new ToolBus({
    baseArtifactsDir: artifactsDir,
    boundary,
    policyConfig,
    dryRun,
    labMode,
  });
  tools.forEach((tool) => bus.register(tool));
  const evidence = new EvidenceStore(path.join(artifactsDir, 'runs'), boundary, runId);
  return { bus, evidence };
};
