import path from 'path';
import fs from 'fs/promises';
import {
  discoverSkillpacks,
  invokeSkillpack,
  expandToolSchema,
  type McpConfig,
  type PolicyConfig,
  type SkillpackDefinition,
  type TaskContext,
  type ToolSchema,
} from '../src';

const fixtureRoot = path.join(__dirname, 'fixtures');
const evidenceDir = path.join(__dirname, 'artifacts');

const baseContext: TaskContext = {
  taskType: 'implement',
  governanceMode: 'pr',
  repoFocus: 'backend',
  contextBudget: 4000,
  remainingBudget: 2800,
};

const toolSchemas = new Map<string, ToolSchema>([
  [
    'mcp.playwright.screenshot',
    {
      name: 'mcp.playwright.screenshot',
      description: 'Capture a UI snapshot of the current page.',
      inputSchema: {
        type: 'object',
        properties: {
          selector: { type: 'string' },
        },
        required: ['selector'],
      },
      metadata: {
        safety: 'Requires UI test environment.',
        permissions: ['ui'],
      },
    },
  ],
]);

async function writeFixtureSkillpack(): Promise<SkillpackDefinition> {
  await fs.rm(fixtureRoot, { recursive: true, force: true });
  await fs.mkdir(path.join(fixtureRoot, 'ui-preview'), { recursive: true });
  await fs.writeFile(
    path.join(fixtureRoot, 'ui-preview', 'SKILL.md'),
    `---\nname: ui-preview\ndescription: UI preview shard\ntriggers:\n  - ui-preview\nshards:\n  default:\n    - preview\n  ci:\n    - ci\n---\n`,
    'utf-8',
  );
  const mcpConfig: McpConfig = {
    servers: [
      {
        name: 'playwright',
        includeTools: ['mcp.playwright.screenshot'],
        shards: {
          default: { includeTools: ['mcp.playwright.screenshot'] },
          ci: { includeTools: [] },
        },
      },
    ],
  };
  await fs.writeFile(
    path.join(fixtureRoot, 'ui-preview', 'mcp.json'),
    JSON.stringify(mcpConfig, null, 2),
    'utf-8',
  );
  return {
    name: 'ui-preview',
    description: 'UI preview shard',
    triggers: ['ui-preview'],
    shardHints: { default: ['preview'], ci: ['ci'] },
    directory: path.join(fixtureRoot, 'ui-preview'),
    skillMarkdownPath: path.join(fixtureRoot, 'ui-preview', 'SKILL.md'),
    mcpConfigPath: path.join(fixtureRoot, 'ui-preview', 'mcp.json'),
  };
}

async function setupFixtures(): Promise<SkillpackDefinition> {
  const skillpack = await writeFixtureSkillpack();
  return skillpack;
}

afterEach(async () => {
  await fs.rm(evidenceDir, { recursive: true, force: true });
});

test('discoverSkillpacks reads frontmatter and optional configs', async () => {
  await setupFixtures();
  const discovered = await discoverSkillpacks(fixtureRoot);
  expect(discovered).toHaveLength(1);
  expect(discovered[0].name).toBe('ui-preview');
  expect(discovered[0].mcpConfigPath).toContain('mcp.json');
});

test('invokeSkillpack injects distilled schemas and writes evidence', async () => {
  const skillpack = await setupFixtures();
  const injected: string[] = [];
  const policy: PolicyConfig = {
    allow: ['mcp.playwright.*'],
  };

  const result = await invokeSkillpack({
    skillpack,
    taskContext: baseContext,
    selection: {
      planStepId: 'step-1',
      planStepSummary: 'Preview UI changes',
      expectedUtility: 'Validate UI preview output',
      alternativesConsidered: ['manual inspection'],
    },
    skillpackMcpConfig: JSON.parse(
      await fs.readFile(skillpack.mcpConfigPath!, 'utf-8'),
    ) as McpConfig,
    policy,
    schemaCacheDir: path.join(evidenceDir, 'cache'),
    toolSchemasByName: toolSchemas,
    injectDistilled: (tools) => {
      tools.forEach((tool) => injected.push(tool.name));
    },
    evidenceDir,
  });

  expect(injected).toEqual(['mcp.playwright.screenshot']);
  expect(result.report.tools[0].mode).toBe('distilled');
  const markdown = await fs.readFile(
    path.join(evidenceDir, 'tool-loading-report.md'),
    'utf-8',
  );
  expect(markdown).toContain('Tool Loading Report');
});

test('expandToolSchema returns full schema when cached', async () => {
  const skillpack = await setupFixtures();
  const cacheDir = path.join(evidenceDir, 'cache');
  const policy: PolicyConfig = { allow: ['mcp.playwright.*'] };

  await invokeSkillpack({
    skillpack,
    taskContext: baseContext,
    selection: {
      planStepId: 'step-2',
      planStepSummary: 'Capture UI snapshot',
      expectedUtility: 'Confirm UI state',
      alternativesConsidered: ['none'],
    },
    skillpackMcpConfig: JSON.parse(
      await fs.readFile(skillpack.mcpConfigPath!, 'utf-8'),
    ) as McpConfig,
    policy,
    schemaCacheDir: cacheDir,
    toolSchemasByName: toolSchemas,
    injectDistilled: () => undefined,
    evidenceDir,
  });

  const injected: string[] = [];
  const result = await expandToolSchema(
    'mcp.playwright.screenshot',
    cacheDir,
    policy,
    baseContext,
    (tool) => {
      injected.push(tool.name);
    },
  );
  expect(result.mode).toBe('full');
  expect(injected).toEqual(['mcp.playwright.screenshot']);
});
