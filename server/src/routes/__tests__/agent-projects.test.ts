import express from 'express';
import request from 'supertest';
import { AgentSessionExplorerService } from '../../agent-session-explorer/service.js';
import { AgentSessionProvider } from '../../agent-session-explorer/types.js';

class MockProvider implements AgentSessionProvider {
  async listSessions() {
    return { sessions: [] };
  }

  async getSessionDetail() {
    return null;
  }

  async getProjects() {
    return [{ projectName: 'alpha', count: 2 }];
  }

  watchSession() {
    return { close: () => undefined };
  }
}

describe('agent projects API', () => {
  beforeAll(() => {
    process.env.AGENT_SESSION_EXPLORER_ENABLED = 'true';
  });

  it('returns project counts', async () => {
    const provider = new MockProvider();
    const service = new AgentSessionExplorerService({ mock: provider });
    const { buildAgentProjectsRouter } = await import('../agent-projects.js');
    const app = express();
    app.use('/api/agent-projects', buildAgentProjectsRouter(service));

    const response = await request(app)
      .get('/api/agent-projects?provider=mock')
      .set('Authorization', 'Bearer test');

    expect(response.status).toBe(200);
    expect(response.body.projects).toEqual([{ projectName: 'alpha', count: 2 }]);
  });
});

