import http from 'http';
import ioClient from 'socket.io-client';
import { initSocket } from '../src/realtime/socket';
import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';

jest.mock('../src/lib/auth.js', () => ({
  verifyToken: jest.fn(async (token: string) => {
    if (token === 't1') {
      return {
        id: '1',
        email: 'u1@example.com',
        username: 'u1',
        role: 'ADMIN',
      };
    }
    if (token === 't2') {
      return {
        id: '2',
        email: 'u2@example.com',
        username: 'u2',
        role: 'ADMIN',
      };
    }
    throw new Error('Invalid token');
  }),
}));

describe('presence websocket', () => {
  let server: http.Server;
  let url: string;
  let io: any;

  beforeAll((done) => {
    server = http.createServer();
    io = initSocket(server);
    server.listen(() => {
      const address = server.address() as any;
      url = `http://localhost:${address.port}/realtime`;
      done();
    });
  });

  afterAll((done) => {
    io.close();
    server.close(done);
  });

  it('broadcasts presence to workspace', (done) => {
    const clientA = ioClient(url, {
      auth: { token: 't1' },
      transports: ['websocket'],
    });
    clientA.emit('investigation:join', { investigationId: 'ws1' });
    clientA.once('presence:update', (payloadA: any) => {
      // payload is { investigationId, presence }
      expect(payloadA.presence).toHaveLength(1);
      const clientB = ioClient(url, {
        auth: { token: 't2' },
        transports: ['websocket'],
      });
      clientB.emit('investigation:join', { investigationId: 'ws1' });
      clientA.once('presence:update', (payloadB: any) => {
        expect(payloadB.presence).toHaveLength(2);
        clientA.close();
        clientB.close();
        done();
      });
    });
  });
});
