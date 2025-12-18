import http from 'http';
import ioClient from 'socket.io-client';
import { initRealtime } from '../src/realtime/collab';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

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
});
