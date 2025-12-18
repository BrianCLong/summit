import { createServer, Server as HttpServer } from 'http';
import type { AddressInfo } from 'net';
import { Server } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createCollaborationHub } from '../../src/realtime/collaborationHub';

type WorkspaceUser = { id: string; name: string };

type AwaitedEvent<T> = Promise<T>;

const waitForEvent = <T>(
  socket: ClientSocket,
  event: string,
): AwaitedEvent<T> =>
  new Promise((resolve) => {
    socket.once(event, (payload: T) => resolve(payload));
  });

describe('CollaborationHub realtime flows', () => {
  let httpServer: HttpServer;
  let ioServer: Server;
  let port: number;

  const connectClient = async (): Promise<ClientSocket> => {
    const socket = Client(`http://localhost:${port}/collaboration`, {
      transports: ['websocket'],
      autoConnect: true,
    });

    await new Promise<void>((resolve) => {
      socket.on('connect', () => resolve());
    });

    return socket;
  };

  const disconnectClient = async (socket: ClientSocket): Promise<void> => {
    await new Promise<void>((resolve) => {
      socket.on('disconnect', () => resolve());
      socket.disconnect();
    });
  };

  const joinWorkspace = async (
    socket: ClientSocket,
    workspaceId: string,
    user: WorkspaceUser,
  ) => {
    const joined = waitForEvent<{
      workspaceId: string;
      members: any[];
    }>(socket, 'workspace:joined');
    socket.emit('workspace:join', {
      workspaceId,
      userId: user.id,
      userName: user.name,
    });
    return joined;
  };

  beforeEach(async () => {
    httpServer = createServer();
    ioServer = new Server(httpServer, { serveClient: false });
    createCollaborationHub(ioServer, { activityLimit: 20 });

    await new Promise<void>((resolve) => {
      httpServer.listen(() => {
        port = (httpServer.address() as AddressInfo).port;
        resolve();
      });
    });
  });

  afterEach(async () => {
    ioServer.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it('shares workspace membership and activity feed', async () => {
    const workspaceId = 'ws-shared';
    const clientA = await connectClient();
    const snapshot = await joinWorkspace(clientA, workspaceId, {
      id: 'user-a',
      name: 'Analyst A',
    });
    expect(snapshot.members).toHaveLength(1);

    const presenceJoined = waitForEvent<{ userId: string }>(
      clientA,
      'presence:joined',
    );

    const clientB = await connectClient();
    await joinWorkspace(clientB, workspaceId, { id: 'user-b', name: 'Analyst B' });
    const presence = await presenceJoined;
    expect(presence.userId).toBe('user-b');

    const activity = await waitForEvent<any[]>(clientA, 'workspace:activity');
    expect(activity.length).toBeGreaterThanOrEqual(1);

    await disconnectClient(clientA);
    await disconnectClient(clientB);
  });

  it('broadcasts live cursors and team chat updates', async () => {
    const workspaceId = 'ws-cursors';
    const clientA = await connectClient();
    const clientB = await connectClient();
    await joinWorkspace(clientA, workspaceId, { id: 'user-a', name: 'Analyst A' });
    await joinWorkspace(clientB, workspaceId, { id: 'user-b', name: 'Analyst B' });

    const cursorUpdate = waitForEvent<{
      cursor: { x: number; y: number };
      userId: string;
    }>(clientA, 'presence:update');
    clientB.emit('presence:update', {
      workspaceId,
      userId: 'user-b',
      cursor: { x: 25, y: 30 },
    });
    const cursor = await cursorUpdate;
    expect(cursor.cursor).toEqual({ x: 25, y: 30 });

    const chatReceived = waitForEvent<{ message: string; userId: string }>(
      clientA,
      'chat:message',
    );
    clientB.emit('chat:message', {
      workspaceId,
      userId: 'user-b',
      message: 'Team ready for collaborative triage',
    });
    const chat = await chatReceived;
    expect(chat.message).toContain('collaborative');
    expect(chat.userId).toBe('user-b');

    await disconnectClient(clientA);
    await disconnectClient(clientB);
  });

  it('synchronizes annotations and resolves conflicting edits', async () => {
    const workspaceId = 'ws-edits';
    const clientA = await connectClient();
    const clientB = await connectClient();
    await joinWorkspace(clientA, workspaceId, { id: 'user-a', name: 'Analyst A' });
    await joinWorkspace(clientB, workspaceId, { id: 'user-b', name: 'Analyst B' });

    const annotationUpdate = waitForEvent<{ annotationId: string; action: string }>(
      clientA,
      'annotation:updated',
    );
    clientB.emit('annotation:add', {
      workspaceId,
      userId: 'user-b',
      targetId: 'intel-123',
      body: 'Add a shared annotation',
    });
    const annotation = await annotationUpdate;
    expect(annotation.action).toBe('add');

    const firstEditApplied = waitForEvent<{ version: number }>(
      clientA,
      'edit:applied',
    );
    clientA.emit('edit:submit', {
      workspaceId,
      entityId: 'entity-1',
      userId: 'user-a',
      version: 0,
      changes: { title: 'Initial finding' },
    });
    const initialEdit = await firstEditApplied;
    expect(initialEdit.version).toBe(1);

    const conflictNotice = waitForEvent<{ resolvedVersion: number }>(
      clientB,
      'edit:conflict',
    );
    const resolvedEditApplied = waitForEvent<{ version: number }>(
      clientA,
      'edit:applied',
    );
    clientB.emit('edit:submit', {
      workspaceId,
      entityId: 'entity-1',
      userId: 'user-b',
      version: 0,
      changes: { summary: 'Concurrent change' },
    });

    const conflict = await conflictNotice;
    const resolved = await resolvedEditApplied;
    expect(conflict.resolvedVersion).toBeGreaterThan(1);
    expect(resolved.version).toBe(conflict.resolvedVersion);

    await disconnectClient(clientA);
    await disconnectClient(clientB);
  });
});
