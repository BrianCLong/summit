import http from 'http';
import ioClient from 'socket.io-client';
import { initRealtime } from '../src/realtime/collab';
import { runCypher } from '../src/graph/neo4j';

jest.mock('../src/graph/neo4j', () => ({
  runCypher: jest.fn(async () => []),
}));

describe('realtime collaboration basics', () => {
  let server: http.Server;
  let url: string;
  let io: any;

  beforeAll(async () => {
    server = http.createServer();
    io = await initRealtime(server);
    await new Promise<void>((resolve) => {
      server.listen(() => {
        const address = server.address() as any;
        url = `http://localhost:${address.port}/ws`;
        resolve();
      });
    });
  });

  afterAll((done) => {
    io.close();
    server.close(done);
  });

  it('shares presence and cursor updates', (done) => {
    const c1 = ioClient(url, {
      auth: { tenantId: 't1', userId: 'u1' },
      transports: ['websocket'],
    });
    const c2 = ioClient(url, {
      auth: { tenantId: 't1', userId: 'u2' },
      transports: ['websocket'],
    });

    c1.on('presence:join', (payload) => {
      if (payload.userId === 'u2') {
        c2.emit('cursor:move', { investigationId: 'i1', x: 5, y: 6 });
      }
    });

    c1.on('cursor:move', (payload) => {
      try {
        expect(payload.userId).toBe('u2');
        expect(payload.x).toBe(5);
        expect(payload.y).toBe(6);
        c1.close();
        c2.close();
        done();
      } catch (err) {
        done(err);
      }
    });

    c1.emit('join', { investigationId: 'i1' });
    c2.emit('join', { investigationId: 'i1' });
  });

  it('synchronizes graph state updates and persists on commit', async () => {
    (runCypher as jest.Mock).mockClear();
    process.env.NEO4J_URI = 'bolt://localhost';
    process.env.NEO4J_USER = 'neo4j';
    process.env.NEO4J_PASSWORD = 'secret';

    const graphId = 'g-1';

    const c1 = ioClient(url, {
      auth: { tenantId: 't1', userId: 'primary' },
      transports: ['websocket'],
    });
    const c2 = ioClient(url, {
      auth: { tenantId: 't1', userId: 'secondary' },
      transports: ['websocket'],
    });

    await new Promise((resolve) => c1.on('connect', resolve));
    await new Promise((resolve) => c2.on('connect', resolve));

    c1.emit('join', { investigationId: 'investigation-1', graphId });
    c2.emit('join', { investigationId: 'investigation-1', graphId });

    const stateReceived = new Promise<any>((resolve) => {
      c1.on('graph:state', (payload: any) => {
        if (
          payload.graphId === graphId &&
          Array.isArray(payload.state?.nodes) &&
          payload.state.nodes.some((node: any) => node.id === 'node-1')
        ) {
          resolve(payload);
        }
      });
    });

    c2.emit('graph:update', {
      graphId,
      investigationId: 'investigation-1',
      ops: [
        {
          type: 'node:add',
          node: { id: 'node-1', label: 'Realtime Node', x: 40, y: 60, size: 14, color: '#fff' },
        },
      ],
      state: {
        nodes: [
          {
            id: 'node-1',
            label: 'Realtime Node',
            type: 'entity',
            x: 40,
            y: 60,
            size: 14,
            color: '#2563eb',
            risk: 0,
            confidence: 0.8,
          },
        ],
        edges: [],
      },
    });

    const payload: any = await stateReceived;
    expect(payload.state.nodes.some((node: any) => node.id === 'node-1')).toBe(true);

    const commitBroadcast = new Promise((resolve) => {
      c2.on('graph:commit:broadcast', (commitPayload: any) => {
        if (commitPayload.graphId === graphId) {
          resolve(commitPayload);
        }
      });
    });

    c1.emit('graph:commit', { graphId, investigationId: 'investigation-1' });
    await commitBroadcast;

    expect((runCypher as jest.Mock).mock.calls.length).toBeGreaterThan(0);

    c1.close();
    c2.close();
    delete process.env.NEO4J_URI;
    delete process.env.NEO4J_USER;
    delete process.env.NEO4J_PASSWORD;
  });
});
