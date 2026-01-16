import fs from 'node:fs/promises';
import path from 'node:path';
import type { ConformanceReport, ProviderReport } from '../types.js';

const formatBoolean = (value: boolean): string => (value ? '✅' : '❌');

const providerRow = (provider: ProviderReport): string => {
  return [
    provider.id,
    provider.configured ? 'configured' : 'skipped',
    formatBoolean(provider.capabilities.toolCalls),
    formatBoolean(provider.capabilities.jsonMode),
    formatBoolean(provider.capabilities.streaming),
    provider.capabilities.maxTokensProbe?.observedWordCount ?? 'n/a',
    provider.capabilities.rateLimit?.detected ? 'detected' : 'none',
  ].join(' | ');
};

export const writeMarkdownReport = async (
  report: ConformanceReport,
  outputDir: string,
): Promise<string> => {
  const filePath = path.join(outputDir, 'capabilities.md');
  const lines: string[] = [];

  lines.push(`# Provider Conformance Report`);
  lines.push('');
  lines.push(`Run ID: ${report.runId}`);
  lines.push(`Timestamp: ${report.timestamp}`);
  lines.push('');
  lines.push(
    'Provider | Status | Tool Calls | JSON Mode | Streaming | Max Tokens Probe | Rate Limit',
  );
  lines.push(
    '--- | --- | --- | --- | --- | --- | ---',
  );

  for (const provider of report.providers) {
    lines.push(providerRow(provider));
  }

  lines.push('');

  await fs.writeFile(filePath, lines.join('\n'));
  return filePath;
};
