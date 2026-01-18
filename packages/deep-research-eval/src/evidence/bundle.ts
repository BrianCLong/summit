import { createHash } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import type { AdaptiveRubric, ScoringResult } from '../rubric/types.js';
import type { TaskDefinition } from '../taskpack/schema.js';
import type { ClaimResult, FactCheckSummary } from '../factcheck/verdict_schema.js';

export interface EvidenceBundleInput {
  runId: string;
  task: TaskDefinition;
  reportId: string;
  reportText: string;
  rubric: AdaptiveRubric;
  scoring: ScoringResult;
  factChecks: ClaimResult[];
  factSummary: FactCheckSummary;
  policyViolations: string[];
  claimGraph: {
    nodes: { id: string; label: string; type: 'claim' | 'evidence' }[];
    edges: { from: string; to: string; type: 'supports' | 'contradicts' }[];
  };
}

export interface EvidenceBundleOutput {
  bundlePath: string;
  manifestPath: string;
  jsonPath: string;
  htmlPath: string;
}

const hashContent = (content: string): string => {
  return createHash('sha256').update(content).digest('hex');
};

const renderHtml = (input: EvidenceBundleInput): string => {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Deep Research Eval - ${input.reportId}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; }
    h1, h2 { color: #1f2937; }
    .score { font-weight: bold; }
    pre { background: #f3f4f6; padding: 12px; border-radius: 6px; }
  </style>
</head>
<body>
  <h1>Deep Research Evaluation</h1>
  <p><strong>Run ID:</strong> ${input.runId}</p>
  <p><strong>Task:</strong> ${input.task.id} - ${input.task.topic}</p>
  <p class="score">Score: ${input.scoring.totalScore.toFixed(2)} / ${input.scoring.maxScore.toFixed(2)}</p>
  <h2>Fact Check Summary</h2>
  <p>Coverage: ${(input.factSummary.coverageRatio * 100).toFixed(1)}%</p>
  <p>Contradictions: ${input.factSummary.contradictions}</p>
  <h2>Policy Violations</h2>
  <pre>${input.policyViolations.join('\n') || 'None detected.'}</pre>
  <h2>Report</h2>
  <pre>${input.reportText}</pre>
</body>
</html>`;
};

export const writeEvidenceBundle = async (
  baseDir: string,
  input: EvidenceBundleInput,
): Promise<EvidenceBundleOutput> => {
  const bundlePath = join(baseDir, input.runId, input.task.id);
  await mkdir(bundlePath, { recursive: true });

  const jsonPayload = JSON.stringify({
    runId: input.runId,
    reportId: input.reportId,
    task: input.task,
    rubric: input.rubric,
    scoring: input.scoring,
    factChecks: input.factChecks,
    factSummary: input.factSummary,
    policyViolations: input.policyViolations,
    claimGraph: input.claimGraph,
  }, null, 2);

  const htmlPayload = renderHtml(input);

  const jsonPath = join(bundlePath, 'bundle.json');
  const htmlPath = join(bundlePath, 'report.html');
  await writeFile(jsonPath, jsonPayload, 'utf-8');
  await writeFile(htmlPath, htmlPayload, 'utf-8');

  const manifest = {
    runId: input.runId,
    taskId: input.task.id,
    reportId: input.reportId,
    files: {
      'bundle.json': hashContent(jsonPayload),
      'report.html': hashContent(htmlPayload),
    },
  };

  const manifestPath = join(bundlePath, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  return {
    bundlePath,
    manifestPath,
    jsonPath,
    htmlPath,
  };
};
