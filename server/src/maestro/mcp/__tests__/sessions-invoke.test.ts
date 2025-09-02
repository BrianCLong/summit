import express from 'express';
import request from 'supertest';
import sessionsRouter, { requireScope } from '../sessions-api.js';
import invokeRouter from '../invoke-api.js';

// Mock conductor MCP client
jest.unstable_mockModule('../../../conductor/mcp/client.js', () => ({
  mcpClient: { executeTool: jest.fn(async (_server: string, tool: string, _args: any, scopes: string[]) => {
    if (!scopes?.includes('mcp:invoke')) throw new Error('Insufficient scopes for tool');
    return { ok: true, tool };
  }) },
  mcpRegistry: {},
  initializeMCPClient: jest.fn(),
}));

describe('MCP sessions + invoke', () => {
  const app = express();
  app.use('/api/maestro/v1', sessionsRouter);
  app.use('/api/maestro/v1', invokeRouter);

  it('creates and uses a session token', async () => {
    // Create session with scope
    const create = await request(app)
      .post('/api/maestro/v1/runs/r1/mcp/sessions')
      .send({ scopes: ['mcp:invoke'] })
      .expect(201);
    const token = create.body.token as string;

    // Invoke with token
    const res = await request(app)
      .post('/api/maestro/v1/runs/r1/mcp/invoke')
      .set('Authorization', `Bearer ${token}`)
      .send({ server: 'graphops', tool: 'cypher.query', args: { q: 'RETURN 1' } })
      .expect(200);
    expect(res.body).toHaveProperty('result.ok', true);
  });

  it('denies invoke without scope', async () => {
    const create = await request(app)
      .post('/api/maestro/v1/runs/r1/mcp/sessions')
      .send({ scopes: ['foo'] })
      .expect(201);
    const token = create.body.token as string;

    await request(app)
      .post('/api/maestro/v1/runs/r1/mcp/invoke')
      .set('Authorization', `Bearer ${token}`)
      .send({ server: 'graphops', tool: 'cypher.query', args: { q: 'RETURN 1' } })
      .expect(403);
  });
});
