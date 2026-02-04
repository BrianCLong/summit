import fs from 'fs/promises';
import path from 'path';
import { type ToolLoadingReport } from './types';

export async function writeEvidence(
  report: ToolLoadingReport,
  outputDir: string,
): Promise<{ jsonPath: string; markdownPath: string }> {
  await fs.mkdir(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, 'tool-loading-report.json');
  const markdownPath = path.join(outputDir, 'tool-loading-report.md');
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
  await fs.writeFile(markdownPath, renderMarkdown(report), 'utf-8');
  return { jsonPath, markdownPath };
}

export function renderMarkdown(report: ToolLoadingReport): string {
  return [
    `# Tool Loading Report`,
    ``,
    `- Generated: ${report.generatedAt}`,
    `- Skillpack: ${report.skillpack}`,
    `- Shard: ${report.shard}`,
    `- Plan Step: ${report.planStepId}`,
    `- Plan Summary: ${report.planStepSummary}`,
    `- Expected Utility: ${report.expectedUtility}`,
    `- Alternatives: ${report.alternativesConsidered.join(', ')}`,
    ``,
    `## Shard Reasoning`,
    ...report.shardReasoning.map((reason) => `- ${reason}`),
    ``,
    `## Tools`,
    `| Tool | Mode | Tokens | Policy |`,
    `| --- | --- | --- | --- |`,
    ...report.tools.map(
      (tool) =>
        `| ${tool.toolName} | ${tool.mode} | ${tool.tokenEstimate} | ${tool.policyReason} |`,
    ),
    ``,
    `## Totals`,
    `- Tools considered: ${report.totals.toolsConsidered}`,
    `- Tools injected: ${report.totals.toolsInjected}`,
    `- Tools denied: ${report.totals.toolsDenied}`,
    `- Estimated tokens: ${report.totals.tokensEstimated}`,
    ``,
    `## Governed Exceptions`,
    ...(report.governedExceptions.length > 0
      ? report.governedExceptions.map((exception) => `- ${exception}`)
      : ['- None']),
    ``,
    `## Auto-prune Suggestions`,
    ...(report.autoPruneSuggestions.length > 0
      ? report.autoPruneSuggestions.map((suggestion) => `- ${suggestion}`)
      : ['- Deferred pending runtime telemetry.']),
    ``,
  ].join('\n');
}
