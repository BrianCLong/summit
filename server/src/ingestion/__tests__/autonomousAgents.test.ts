import path from 'node:path';
import { parseAutonomousAgentsMarkdown, normalizeTitle } from '../processors/autonomousAgents.js';

describe('Autonomous Agents markdown parsing', () => {
  it('parses paper entries with dates, tags, and ids', async () => {
    const fixturesRoot = path.join(process.cwd(), 'fixtures');
    const filePath = path.join(fixturesRoot, 'autonomous_agents/sample.md');

    const records = await parseAutonomousAgentsMarkdown(filePath, 'test-commit', fixturesRoot);

    expect(records).toHaveLength(2);
    const [first, second] = records;

    expect(first.paperTitle).toBe('Cooperative Agents Learn Together');
    expect(first.paperUrl).toBe('https://arxiv.org/abs/2512.12345');
    expect(first.publishedOrListedDate).toBe('2025-12-15');
    expect(first.summaryBullets).toEqual([
      'Presents a curriculum for emergent planning in multiagent settings.',
      'Reports improved evaluation stability.',
    ]);
    expect(first.externalIds.arxivId).toBe('2512.12345');
    expect(first.tags).toEqual(
      expect.arrayContaining(['autonomous-agents', 'planning', 'multi-agent', 'evaluation']),
    );

    expect(second.paperTitle).toBe('Workflow Composition Benchmark');
    expect(second.externalIds.doi).toBe('10.1000/workflow-bench');
    expect(second.tags).toEqual(
      expect.arrayContaining(['autonomous-agents', 'workflow', 'safety', 'benchmark']),
    );
    expect(second.normalizedTitle).toBe(normalizeTitle(second.paperTitle));
  });
});
