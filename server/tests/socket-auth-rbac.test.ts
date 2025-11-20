import http from 'http';
import ioClient from 'socket.io-client';

jest.mock('../src/lib/auth.js', () => ({
  verifyToken: jest.fn(),
}));

describe('WebSocket JWT auth with RBAC', () => {
  let server: http.Server;
  let url: string;
  let io: any;
  let initSocket: typeof import('../src/realtime/socket').initSocket;
  let overrideVerifyToken: typeof import('../src/realtime/socket').overrideVerifyToken;
  const verifyTokenMock = jest.fn(async (token: string) => {
    if (token === 'admin-token') {
      return { id: '1', email: 'a@example.com', role: 'ADMIN' } as any;
    }
    if (token === 'viewer-token') {
      return { id: '2', email: 'v@example.com', role: 'VIEWER' } as any;
    }
    throw new Error('Invalid token');
  });

  beforeAll(async () => {
    process.env.REDIS_URL = '';
    process.env.REDIS_HOST = '';
    process.env.REDIS_PORT = '';
    // @ts-ignore tsconfig does not enable allowImportingTsExtensions for tests
    const socketModule = await import('../src/realtime/socket.ts');
    initSocket = socketModule.initSocket;
    overrideVerifyToken = socketModule.overrideVerifyToken;
    overrideVerifyToken(verifyTokenMock);
    server = http.createServer();
    io = initSocket(server);
    await new Promise<void>((resolve) => {
      server.listen(() => {
        const address = server.address() as any;
        url = `http://localhost:${address.port}/realtime`;
        resolve();
      });
    });
  });

  afterAll((done) => {
    overrideVerifyToken();
    io.close();
    server.close(done);
  });

  it('rejects unauthorized sockets', (done) => {
    const client = ioClient(url, {
      auth: { token: 'bad-token' },
      transports: ['websocket'],
    });
    client.on('connect_error', (err) => {
      expect(err.message).toBe('Unauthorized');
      client.close();
      done();
    });
  });

  it('enforces RBAC for edit events', (done) => {
    const client = ioClient(url, {
      auth: { token: 'viewer-token' },
      transports: ['websocket'],
    });
    client.on('connect', () => {
      client.emit('investigation:join', { investigationId: 'g1' });
    });
    client.on('investigation:state', () => {
      client.emit('entity_update', {
        graphId: 'g1',
        entityId: 'e1',
        changes: {},
      });
    });
    client.on('investigation:error', (payload) => {
      expect(payload.code).toBe('FORBIDDEN');
      client.close();
      done();
    });
    client.on('error', (msg) => {
      if (msg === 'Forbidden') {
        client.close();
        done();
      }
    });
  });
});
