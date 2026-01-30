import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { writeToolLoadingEvidence } from '../src/evidence-writer.js';
import { ToolLoadingReport } from '../src/types.js';

describe('evidence writer', () => {
  it('writes stable evidence outputs', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skillpack-evidence-'));
    const report: ToolLoadingReport = {
      skillpack: { name: 'ui-preview', path: '.summit/skillpacks/ui-preview' },
      shard: { shard: 'default', reasons: ['Default shard selected.'] },
      context: { taskType: 'review', governanceMode: 'pr' },
      tools: [
        {
          toolName: 'screenshot',
          serverName: 'playwright',
          mode: 'distilled',
          tokenEstimate: 12,
          decision: {
            toolName: 'screenshot',
            allowed: true,
            reason: 'Explicitly allowlisted by policy.',
          },
          justification: {
            expectedUtility: 'UI verification',
            tokenCost: 12,
            alternatives: ['Manual review'],
            planStepRef: 'skillpack:ui-preview:default',
          },
        },
      ],
      totals: { toolsConsidered: 1, toolsInjected: 1, estimatedTokens: 12 },
      policy: { environment: 'pr', breakGlassUsed: false },
      generatedAt: '2026-01-14T00:00:00Z',
    };

    const { jsonPath, markdownPath } = await writeToolLoadingEvidence({
      report,
      outputDir: tempDir,
    });

    const json = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));
    const markdown = await fs.readFile(markdownPath, 'utf-8');

    expect(json).toMatchSnapshot();
    expect(markdown).toMatchSnapshot();
  });
});
