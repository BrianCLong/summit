import { AgentLoop } from '../../src/agent/loop';
import { MemoryStore } from '../../src/agent/memory/store';
import { ProvenanceLedger } from '../../src/provenance/ledger';
import { Pool } from 'pg';
import { config } from '../../src/config';
import { createServer } from 'http';
import { initSocket, getIO } from '../../src/server/realtime/socket';
import Client from 'socket.io-client';
import { generateMockJwt, setupNockJwks } from '../test-utils';

describe('AgentLoop', () => {
  let pool: Pool;
  let httpServer: any;
  let clientSocket: any;
  let mockJwt: string;

  beforeAll((done) => {
    pool = new Pool(config.postgres);
    httpServer = createServer();
    initSocket(httpServer);
    httpServer.listen(() => {
      const port = (httpServer.address() as any).port;
      clientSocket = Client(`http://localhost:${port}`);
      mockJwt = generateMockJwt({ tenantId: 'tenant-a', actor: 'admin' });
      setupNockJwks();
      clientSocket.on('connect', done);
    });
  });

  afterAll(async () => {
    getIO().close();
    clientSocket.close();
    await pool.end();
  });

  it('should run a multi-step task and return the correct answer', (done) => {
    const agentLoop = new AgentLoop('tenant-a', 'admin', 'My computer is on fire', [], [], 'test-purpose');

    clientSocket.on('agent-event', (event: any) => {
      if (event.type === 'final-answer') {
        expect(event.data.answer).toBe('I have created a ticket for you. The ID is 789.');
        done();
      }
    });

    agentLoop.start();
  }, 10000); // 10 second timeout
});
