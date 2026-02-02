import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { createServer } from 'http';
import { io as createClient, type Socket as ClientSocket } from 'socket.io-client';
import { createCollaborationHub } from '../collaborationHub.js';

jest.unmock('socket.io');
jest.unmock('ws');

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
  let io: import('socket.io').Server;
  let port: number;

  beforeAll(async () => {
    const { Server } = await import('socket.io');
    httpServer = createServer();
    io = new Server(httpServer, {
      cors: { origin: '*' },
    });
    createCollaborationHub(io, { presenceThrottleMs: 5 });
    await new Promise<void>((resolve) => {
      httpServer.listen(0, '127.0.0.1', () => {
        port = (httpServer.address() as { port: number }).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    io.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it('broadcasts presence updates to channel members', async () => {
    const baseUrl = `http://127.0.0.1:${port}`;
    const connectClient = async () => {
      const client = createClient(`${baseUrl}/collaboration`, {
        transports: ['websocket', 'polling'],
        forceNew: true,
        reconnection: false,
        timeout: 5000,
      });
      try {
        await waitForEvent(client, 'connect');
        return client;
      } catch (err) {
        client.close();
        throw err;
      }
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
      clientA.close();
      clientB.close();
    }
  });
});
