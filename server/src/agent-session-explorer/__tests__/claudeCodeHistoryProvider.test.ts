import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ClaudeCodeHistoryProvider } from '../providers/claudeCodeHistoryProvider.js';

describe('ClaudeCodeHistoryProvider', () => {
  const createFixture = () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-history-'));
    const projectDir = path.join(root, 'project-alpha');
    fs.mkdirSync(projectDir, { recursive: true });
    const sessionPath = path.join(projectDir, 'session-123.jsonl');
    fs.writeFileSync(
      sessionPath,
      [
        JSON.stringify({
          id: 'msg-1',
          role: 'user',
          text: 'build me an api',
          ts: '2024-01-01T00:00:00Z',
        }),
        JSON.stringify({
          id: 'msg-2',
          role: 'assistant',
          content: 'sure, preparing plan',
          tool_calls: [
            {
              name: 'shell',
              input: 'ls',
              output: 'src',
              status: 'completed',
              started_at: '2024-01-01T00:00:10Z',
              ended_at: '2024-01-01T00:00:12Z',
            },
          ],
        }),
        '{"id":"broken",
      ].join('\n'),
    );
    return { root, sessionPath };
  };

  it('parses sessions and supports search and project filtering', async () => {
    const { root } = createFixture();
    const provider = new ClaudeCodeHistoryProvider({ rootPath: root });

    const list = await provider.listSessions({ q: 'api' });
    expect(list.sessions).toHaveLength(1);
    expect(list.sessions[0]).toMatchObject({
      id: 'session-123',
      projectName: 'project-alpha',
      resumeCommand: 'claude --resume session-123',
    });

    const detail = await provider.getSessionDetail('session-123');
    expect(detail?.messages).toHaveLength(2);
    expect(detail?.summary.title.toLowerCase()).toContain('build me an api');
    expect(detail?.messages[1].toolCalls?.[0]).toMatchObject({
      name: 'shell',
      input: 'ls',
      output: 'src',
      status: 'completed',
    });

    const projects = await provider.getProjects();
    expect(projects).toEqual([{ projectName: 'project-alpha', count: 1 }]);
  });
});
