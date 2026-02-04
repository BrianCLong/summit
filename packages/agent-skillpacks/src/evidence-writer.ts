import fs from 'node:fs/promises';
import path from 'node:path';
import { ToolLoadingReport } from './types.js';

const stableSortTools = (report: ToolLoadingReport): ToolLoadingReport => ({
  ...report,
  tools: [...report.tools].sort((a, b) =>
    `${a.serverName}:${a.toolName}`.localeCompare(`${b.serverName}:${b.toolName}`)
  ),
});

const formatToolLine = (tool: ToolLoadingReport['tools'][number]): string => {
  const status = tool.decision.allowed ? 'allowed' : 'blocked';
  const waiver = tool.decision.waiverId ? ` (waiver ${tool.decision.waiverId})` : '';
  return `- ${tool.serverName}:${tool.toolName} → ${status}${waiver} · ${tool.tokenEstimate} tokens`;
};

export const writeToolLoadingEvidence = async (options: {
  report: ToolLoadingReport;
  outputDir?: string;
}): Promise<{ jsonPath: string; markdownPath: string }> => {
  const outputDir = options.outputDir ?? 'artifacts';
  const jsonPath = path.join(outputDir, 'tool-loading-report.json');
  const markdownPath = path.join(outputDir, 'tool-loading-report.md');
  const report = stableSortTools(options.report);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));

  const lines = [
    `# Tool Loading Report`,
    ``,
    `**Skillpack:** ${report.skillpack.name}`,
    `**Shard:** ${report.shard.shard}`,
    `**Environment:** ${report.policy.environment}`,
    `**Generated:** ${report.generatedAt}`,
    ``,
    `## Reasons`,
    ...report.shard.reasons.map((reason) => `- ${reason}`),
    ``,
    `## Tools`,
    ...report.tools.map(formatToolLine),
    ``,
    `## Totals`,
    `- Tools considered: ${report.totals.toolsConsidered}`,
    `- Tools injected: ${report.totals.toolsInjected}`,
    `- Estimated tokens: ${report.totals.estimatedTokens}`,
    ``,
    `## Policy`,
    `- Break-glass used: ${report.policy.breakGlassUsed ? 'yes' : 'no'}`,
  ];

  await fs.writeFile(markdownPath, `${lines.join('\n')}\n`);

  return { jsonPath, markdownPath };
};
