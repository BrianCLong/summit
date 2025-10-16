import { mkdtemp, rm, stat } from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { CrystalSessionOrchestrator } from '../session-orchestrator';
import { WorktreeEngine } from '../worktree-engine';
import { SLOMetrics } from '../slo-metrics';
import { PanelType, AttachmentType } from '../types';

describe('CrystalSessionOrchestrator', () => {
  let repoDir: string;
  let orchestrator: CrystalSessionOrchestrator;

  beforeEach(async () => {
    repoDir = await mkdtemp(path.join(os.tmpdir(), 'crystal-test-'));
    orchestrator = new CrystalSessionOrchestrator({
      worktreeEngine: new WorktreeEngine(repoDir),
      metrics: new SLOMetrics(),
    });
  });

  afterEach(async () => {
    await rm(repoDir, { recursive: true, force: true });
  });

  it('creates a session with isolated worktree and default panels', async () => {
    const session = await orchestrator.createSession({
      name: 'Crystal Demo',
      projectPath: '.',
      purposeTags: ['demo'],
      attachments: [
        {
          type: AttachmentType.TEXT,
          name: 'readme.txt',
          size: 12,
          contentType: 'text/plain',
          purpose: 'demo',
        },
      ],
      runScripts: [
        {
          name: 'unit-tests',
          command: 'npm test',
        },
      ],
    });

    expect(session.panels.some((panel) => panel.type === PanelType.DIFF)).toBe(
      true,
    );
    expect(session.agents).toHaveLength(2);
    const worktreeStat = await stat(session.worktree.worktreePath);
    expect(worktreeStat.isDirectory()).toBe(true);
  });

  it('streams run logs via subscription', async () => {
    const session = await orchestrator.createSession({
      name: 'Streaming Demo',
      projectPath: '.',
      runScripts: [
        {
          name: 'build',
          command: 'npm install && npm run build',
        },
      ],
    });

    const runPromise = orchestrator.startRun({
      sessionId: session.id,
      runDefinitionId: session.runScripts[0].id,
    });

    const activeSession = orchestrator.getSession(session.id)!;
    const runId = activeSession.runs[0].id;
    const received: string[] = [];
    orchestrator.subscribeToRunLogs(session.id, runId, (event) => {
      received.push(event.entry.message);
    });

    const run = await runPromise;
    expect(run.logs.length).toBeGreaterThan(0);
    expect(received.length).toBeGreaterThan(0);
  });

  it('records assistant responses via adapter registry', async () => {
    const session = await orchestrator.createSession({
      name: 'Adapter Demo',
      projectPath: '.',
    });

    const message = await orchestrator.recordMessage({
      sessionId: session.id,
      agentId: session.agents[0].id,
      role: 'user',
      content: 'Write a function to compute factorial',
    });

    expect(message.role).toBe('assistant');
    expect(message.content).toContain('factorial');
  });
});
