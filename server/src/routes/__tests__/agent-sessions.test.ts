import express from 'express';
import request from 'supertest';
import { AgentSessionExplorerService } from '../../agent-session-explorer/service.js';
import { AgentSessionProvider, SessionDetail } from '../../agent-session-explorer/types.js';

class MockProvider implements AgentSessionProvider {
  constructor(private readonly sessions: SessionDetail[]) {}
  public triggers: Record<string, () => void> = {};

  async listSessions() {
    return { sessions: this.sessions.map((s) => s.summary) };
  }

  async getSessionDetail(sessionId: string) {
    return this.sessions.find((s) => s.summary.id === sessionId) || null;
  }

  async getProjects() {
    return [{ projectName: 'default', count: this.sessions.length }];
  }

  watchSession(sessionId: string, onChange: () => void) {
    this.triggers[sessionId] = onChange;
    return { close: () => delete this.triggers[sessionId] };
  }
}

describe('agent sessions API', () => {
  beforeAll(() => {
    process.env.AGENT_SESSION_EXPLORER_ENABLED = 'true';
  });

  const session: SessionDetail = {
    summary: {
      id: 'abc',
      provider: 'mock',
      projectName: 'demo',
      title: 'Example session',
      startedAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:10Z',
      messageCount: 1,
      resumeCommand: 'claude --resume abc',
    },
    messages: [
      {
        id: 'm1',
        role: 'user',
        ts: '2024-01-01T00:00:00Z',
        contentText: 'hello',
      },
    ],
  };

  const buildApp = async () => {
    const provider = new MockProvider([session]);
    const service = new AgentSessionExplorerService({ mock: provider });
    const { buildAgentSessionsRouter } = await import('../agent-sessions.js');
    const app = express();
    app.use('/api/agent-sessions', buildAgentSessionsRouter(service));
    return { app, provider };
  };

  it('lists sessions and returns details', async () => {
    const { app } = await buildApp();
    const listResponse = await request(app)
      .get('/api/agent-sessions?provider=mock')
      .set('Authorization', 'Bearer test');

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.sessions[0].id).toBe('abc');

    const detailResponse = await request(app)
      .get('/api/agent-sessions/mock/abc')
      .set('Authorization', 'Bearer test');
    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.summary.title).toBe('Example session');
  });

  it('streams updates via SSE', async () => {
    const { app, provider } = await buildApp();

    const responsePromise = request(app)
      .get('/api/agent-sessions/mock/abc/stream')
      .set('Authorization', 'Bearer test')
      .buffer()
      .parse((res, callback) => {
        let data = '';
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
          if (data.includes('session.reloaded') && data.split('session.reloaded').length > 2) {
            callback(null, data);
          }
        });
        setTimeout(() => callback(null, data), 200);
      });

    setTimeout(() => provider.triggers['abc']?.(), 25);
    const response = await responsePromise;

    expect(response.text).toContain('session.reloaded');
  });
});
