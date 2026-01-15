import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as createClient, type Socket as ClientSocket } from 'socket.io-client';
import { createCollaborationHub } from '../collaborationHub.js';

const waitForEvent = <T>(socket: ClientSocket, event: string) =>
  new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Timed out waiting for ${event}`)),
      5000,
    );
    socket.once(event, (payload: T) => {
      clearTimeout(timeout);
      resolve(payload);
    });
});

const NO_NETWORK_LISTEN = process.env.NO_NETWORK_LISTEN === 'true';
const describeIf = NO_NETWORK_LISTEN ? describe.skip : describe;

describeIf('CollaborationHub presence channels', () => {
  let httpServer: ReturnType<typeof createServer>;
  let io: Server;
  let port: number;

  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer, {
      cors: { origin: '*' },
    });
    createCollaborationHub(io, { presenceThrottleMs: 5 });
    httpServer.listen(() => {
      port = (httpServer.address() as { port: number }).port;
      done();
    });
  });

  afterAll((done) => {
    io.close();
    httpServer.close(done);
  });

  it('broadcasts presence updates to channel members', async () => {
    const url = `http://localhost:${port}/collaboration`;
    const connectClient = async () => {
      const client = createClient(url, { transports: ['websocket'] });
      await waitForEvent(client, 'connect');
      return client;
    };

    const clientA = await connectClient();
    const clientB = await connectClient();

    try {
      clientA.emit('presence:channel:join', {
        workspaceId: 'tri-pane',
        channel: 'tri-pane',
        userId: 'user-a',
        userName: 'Analyst A',
      });
      clientB.emit('presence:channel:join', {
        workspaceId: 'tri-pane',
        channel: 'tri-pane',
        userId: 'user-b',
        userName: 'Analyst B',
      });

      await waitForEvent(clientA, 'presence:channel:snapshot');
      await waitForEvent(clientB, 'presence:channel:snapshot');

      const updatePromise = waitForEvent<{
        userId: string;
        cursor: { x: number; y: number };
      }>(clientB, 'presence:channel:update');

      clientA.emit('presence:channel:update', {
        workspaceId: 'tri-pane',
        channel: 'tri-pane',
        cursor: { x: 120, y: 240 },
      });

      const update = await updatePromise;
      expect(update.userId).toBe('user-a');
      expect(update.cursor).toEqual({ x: 120, y: 240 });
    } finally {
      clientA.disconnect();
      clientB.disconnect();
    }
  });
});
