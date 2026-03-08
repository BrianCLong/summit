import http from 'http';
import ioClient from 'socket.io-client';
import { initRealtime } from '../src/realtime/collab';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const describeIf =
  process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

describeIf('realtime collaboration basics', () => {
  let server: http.Server;
  let url: string;
  let io: any;

  beforeAll(async () => {
    server = http.createServer();
    io = await initRealtime(server);
    await new Promise<void>((resolve) => {
      server.listen(() => {
        const address = server.address() as any;
        url = `http://localhost:${address.port}`;
        resolve();
      });
    });
  });

  afterAll((done) => {
    io.close();
    server.close(done);
  });

  it('shares presence and cursor updates', async () => {
    const c1 = ioClient(url, {
      auth: { tenantId: 't1', userId: 'u1' },
      path: '/ws',
      transports: ['websocket'],
    });
    const c2 = ioClient(url, {
      auth: { tenantId: 't1', userId: 'u2' },
      path: '/ws',
      transports: ['websocket'],
    });

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        c1.close();
        c2.close();
        reject(new Error('cursor:move timeout'));
      }, 5000);

      const onError = (err: unknown) => {
        clearTimeout(timer);
        c1.close();
        c2.close();
        reject(err instanceof Error ? err : new Error(String(err)));
      };

      let joined = false;

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
          clearTimeout(timer);
          c1.close();
          c2.close();
          resolve();
        } catch (err) {
          onError(err);
        }
      });

      c1.on('connect_error', onError);
      c2.on('connect_error', onError);

      const maybeJoin = () => {
        if (joined) return;
        joined = true;
        c1.emit('join', { investigationId: 'i1' });
        c2.emit('join', { investigationId: 'i1' });
      };

      if (c1.connected && c2.connected) {
        maybeJoin();
      } else {
        c1.on('connect', maybeJoin);
        c2.on('connect', maybeJoin);
      }
    });
  }, 10000);
});
