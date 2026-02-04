import path from 'path';
import fs from 'fs/promises';
import { renderMarkdown, writeEvidence } from '../src/evidence-writer';
import { type ToolLoadingReport } from '../src/types';

const report: ToolLoadingReport = {
  generatedAt: '2026-01-20T00:00:00.000Z',
  skillpack: 'ui-preview',
  shard: 'default',
  planStepId: 'step-1',
  planStepSummary: 'Preview UI',
  expectedUtility: 'Validate UI',
  alternativesConsidered: ['manual'],
  taskContext: {
    taskType: 'implement',
    governanceMode: 'pr',
    repoFocus: 'frontend',
    contextBudget: 4000,
    remainingBudget: 2000,
  },
  shardReasoning: ['default shard selected'],
  tools: [
    {
      toolName: 'mcp.playwright.screenshot',
      mode: 'distilled',
      tokenEstimate: 120,
      policyReason: 'allowlisted',
    },
  ],
  totals: {
    toolsConsidered: 1,
    toolsInjected: 1,
    tokensEstimated: 120,
    toolsDenied: 0,
  },
  autoPruneSuggestions: [],
  governedExceptions: [],
};

test('renderMarkdown creates stable output', () => {
  expect(renderMarkdown(report)).toMatchSnapshot();
});

test('writeEvidence writes JSON and markdown', async () => {
  const outputDir = path.join(__dirname, 'artifacts');
  await fs.rm(outputDir, { recursive: true, force: true });
  const result = await writeEvidence(report, outputDir);
  const json = await fs.readFile(result.jsonPath, 'utf-8');
  const md = await fs.readFile(result.markdownPath, 'utf-8');
  expect(JSON.parse(json)).toEqual(report);
  expect(md).toContain('Tool Loading Report');
});
