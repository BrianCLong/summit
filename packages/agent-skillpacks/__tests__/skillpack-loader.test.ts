import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { cacheToolSchema, injectSkillpackTools } from '../src/skillpack-loader.js';

describe('skillpack loader', () => {
  it('injects distilled tools for selected shard', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skillpack-'));
    const skillDir = path.join(tempDir, 'ui-preview');
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, 'SKILL.md'),
      `---\nname: ui-preview\ndescription: UI tooling\ntriggers:\n  tasks: [review]\nshards: [default, deep]\n---\nDocs`
    );
    await fs.writeFile(
      path.join(skillDir, 'mcp.json'),
      JSON.stringify(
        {
          servers: {
            playwright: {
              includeTools: ['screenshot'],
              shards: {
                default: ['screenshot'],
                deep: ['screenshot', 'trace'],
              },
            },
          },
        },
        null,
        2
      )
    );

    await cacheToolSchema({
      cacheDir: path.join(tempDir, 'cache'),
      serverName: 'playwright',
      toolName: 'screenshot',
      schema: {
        name: 'screenshot',
        description: 'Capture UI screenshot',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string' },
          },
        },
      },
    });

    const { distilledTools, report } = await injectSkillpackTools({
      skillpackDir: skillDir,
      shardContext: { taskType: 'review', governanceMode: 'pr' },
      availableTools: { playwright: ['screenshot', 'trace'] },
      cacheDir: path.join(tempDir, 'cache'),
      policy: { allow: ['screenshot'], defaultBehavior: 'deny' },
    });

    expect(distilledTools).toHaveLength(1);
    expect(distilledTools[0].name).toBe('screenshot');
    expect(report.totals.toolsInjected).toBe(1);
  });
});
