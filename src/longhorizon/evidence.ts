import path from 'path';
import { promises as fs } from 'fs';
import { ensureDir, stableStringify } from './utils';
import { CandidateRecord, EvaluationRecord, RunConfig } from './types';
import { GraphEdge, GraphNode } from './intelgraph';
import { ToolCallLog } from './switchboard';

export interface EvidenceBundleInput {
  config: RunConfig;
  candidates: CandidateRecord[];
  evaluations: EvaluationRecord[];
  toolCalls: ToolCallLog[];
  archiveSummary: Array<{ key: string; candidateId: string }>;
  intelGraph: { nodes: GraphNode[]; edges: GraphEdge[] };
}

export async function writeEvidenceBundle(
  baseDir: string,
  runId: string,
  input: EvidenceBundleInput,
): Promise<string> {
  const runDir = path.join(baseDir, runId);
  await ensureDir(runDir);

  const reportJson = {
    runId,
    config: input.config,
    candidates: input.candidates,
    evaluations: input.evaluations,
    toolCalls: input.toolCalls,
    archive: input.archiveSummary,
    intelGraph: input.intelGraph,
  };

  const reportPath = path.join(runDir, 'run-report.json');
  await fs.writeFile(reportPath, stableStringify(reportJson));

  const markdownPath = path.join(runDir, 'run-report.md');
  const markdown = renderMarkdownReport(reportJson);
  await fs.writeFile(markdownPath, markdown);

  return runDir;
}

function renderMarkdownReport(report: {
  runId: string;
  config: RunConfig;
  candidates: CandidateRecord[];
  evaluations: EvaluationRecord[];
  toolCalls: ToolCallLog[];
  archive: Array<{ key: string; candidateId: string }>;
  intelGraph: { nodes: GraphNode[]; edges: GraphEdge[] };
}): string {
  return [
    `# LongHorizon Run Report`,
    ``,
    `Run ID: ${report.runId}`,
    `Tenant: ${report.config.tenantId}`,
    ``,
    `IntelGraph nodes: ${report.intelGraph.nodes.length}`,
    `IntelGraph edges: ${report.intelGraph.edges.length}`,
    ``,
    `## Task`,
    report.config.taskPrompt,
    ``,
    `## Archive Summary`,
    ...report.archive.map((entry) => `- ${entry.key}: ${entry.candidateId}`),
    ``,
    `## Evaluations`,
    ...report.evaluations.map(
      (evaluation) =>
        `- ${evaluation.id}: score=${evaluation.score} passed=${evaluation.passed}`,
    ),
    ``,
    `## Tool Calls`,
    ...report.toolCalls.map(
      (call) =>
        `- ${call.toolName} (${call.permissionTier}) at ${call.timestamp}`,
    ),
  ].join('\n');
}
