import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DagGraph } from './graph.js';
import { formatOrchestratorEvidenceId } from './evidence_id.js';
import { EdgePolicyGate, EdgePolicyDecision } from './policy_gate.js';
import { AgentExecutorRegistry, DagWorkflow } from './schema.js';

export interface OrchestratorRunArtifacts {
  report: {
    evidence_id: string;
    workflow_id: string;
    status: 'success';
    execution_order: string[];
    outputs: Array<{
      node_id: string;
      agent: string;
      output: string;
    }>;
    policy_blocks: Array<{
      edge: string;
      code?: string;
      reason?: string;
    }>;
  };
  metrics: {
    evidence_id: string;
    node_count: number;
    edge_count: number;
    policy_block_count: number;
    report_sha256: string;
    execution_order_sha256: string;
  };
  stamp: {
    evidence_id: string;
    artifact_files: string[];
    report_sha256: string;
    metrics_sha256: string;
    deterministic: true;
  };
}

export interface OrchestratorExecutionResult {
  evidenceId: string;
  outputs: Record<string, string>;
  artifacts: OrchestratorRunArtifacts;
  reportHash: string;
}

export interface OrchestratorEngineOptions {
  enabled?: boolean;
  featureFlagName?: string;
  policyGate?: EdgePolicyGate;
  evidenceSequence?: number;
  outputDir?: string;
  writeArtifacts?: boolean;
}

export class DagPolicyError extends Error {
  readonly edge: string;
  readonly code?: string;

  constructor(message: string, edge: string, code?: string) {
    super(message);
    this.name = 'DagPolicyError';
    this.edge = edge;
    this.code = code;
  }
}

export class OrchestratorEngine {
  private readonly featureFlagName: string;
  private readonly policyGate: EdgePolicyGate;
  private readonly writeArtifacts: boolean;
  private readonly outputDir: string;
  private readonly evidenceSequence: number;
  private readonly enabled: boolean;

  constructor(options: OrchestratorEngineOptions = {}) {
    this.featureFlagName = options.featureFlagName ?? 'SUMMIT_ORCHESTRATOR_V1';
    this.policyGate = options.policyGate ?? new EdgePolicyGate();
    this.writeArtifacts = options.writeArtifacts ?? true;
    this.outputDir = options.outputDir ?? path.join(process.cwd(), 'artifacts');
    this.evidenceSequence = options.evidenceSequence ?? 1;
    this.enabled = options.enabled ?? process.env[this.featureFlagName] === 'true';
  }

  async execute(
    workflow: DagWorkflow,
    executors: AgentExecutorRegistry,
  ): Promise<OrchestratorExecutionResult> {
    if (!this.enabled) {
      throw new Error(
        `orchestrator disabled: set ${this.featureFlagName}=true to enable execution`,
      );
    }

    const graph = new DagGraph(workflow);
    graph.assertAcyclic();

    const evidenceId = formatOrchestratorEvidenceId(this.evidenceSequence);
    const executionOrder = graph.topologicalOrder();
    const outputs: Record<string, string> = {};

    for (const node of executionOrder) {
      const incoming = graph.getIncomingEdges(node.id);

      for (const edge of incoming) {
        const fromNode = graph.getNode(edge.from);
        const decision = this.policyGate.evaluate({ edge, fromNode, toNode: node });
        this.assertPolicyDecision(edge, decision);
      }

      const upstream = incoming.map((edge) => ({
        from: edge.from,
        output: outputs[edge.from] ?? '',
      }));

      const executor = executors[node.agent];
      if (!executor) {
        throw new Error(`no executor registered for agent '${node.agent}'`);
      }

      const output = await executor({ node, upstream });
      outputs[node.id] = output;
    }

    const report: OrchestratorRunArtifacts['report'] = {
      evidence_id: evidenceId,
      workflow_id: workflow.id,
      status: 'success',
      execution_order: executionOrder.map((node) => node.id),
      outputs: executionOrder.map((node) => ({
        node_id: node.id,
        agent: node.agent,
        output: outputs[node.id] ?? '',
      })),
      policy_blocks: [],
    };

    const reportHash = sha256(stableStringify(report));
    const metrics: OrchestratorRunArtifacts['metrics'] = {
      evidence_id: evidenceId,
      node_count: workflow.nodes.length,
      edge_count: workflow.edges.length,
      policy_block_count: 0,
      report_sha256: reportHash,
      execution_order_sha256: sha256(report.execution_order.join(',')),
    };

    const metricsHash = sha256(stableStringify(metrics));
    const stamp: OrchestratorRunArtifacts['stamp'] = {
      evidence_id: evidenceId,
      artifact_files: ['metrics.json', 'report.json', 'stamp.json'],
      report_sha256: reportHash,
      metrics_sha256: metricsHash,
      deterministic: true,
    };

    const artifacts: OrchestratorRunArtifacts = {
      report,
      metrics,
      stamp,
    };

    if (this.writeArtifacts) {
      await writeDeterministicArtifacts(this.outputDir, artifacts);
    }

    return {
      evidenceId,
      outputs,
      artifacts,
      reportHash,
    };
  }

  private assertPolicyDecision(edge: { from: string; to: string; tool?: string }, decision: EdgePolicyDecision): void {
    if (!decision.allowed) {
      const edgeLabel = `${edge.from}->${edge.to}:${edge.tool ?? ''}`;
      throw new DagPolicyError(
        decision.reason ?? `policy blocked edge ${edgeLabel}`,
        edgeLabel,
        decision.code,
      );
    }
  }
}

export async function writeDeterministicArtifacts(
  outDir: string,
  artifacts: OrchestratorRunArtifacts,
): Promise<void> {
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'report.json'), stableStringify(artifacts.report), 'utf8');
  await fs.writeFile(path.join(outDir, 'metrics.json'), stableStringify(artifacts.metrics), 'utf8');
  await fs.writeFile(path.join(outDir, 'stamp.json'), stableStringify(artifacts.stamp), 'utf8');
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value, sortKeys, 2) + '\n';
}

function sortKeys(_key: string, value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const sorted: Record<string, unknown> = {};
  const source = value as Record<string, unknown>;
  for (const key of Object.keys(source).sort((a, b) => a.localeCompare(b))) {
    sorted[key] = source[key];
  }
  return sorted;
}

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
