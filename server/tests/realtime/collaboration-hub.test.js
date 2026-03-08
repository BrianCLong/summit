"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const socket_io_client_1 = require("socket.io-client");
const collaborationHub_1 = require("../../src/realtime/collaborationHub");
const waitForEvent = (socket, event, timeoutMs = 5000) => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
        reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);
    socket.once(event, (payload) => {
        clearTimeout(timeout);
        resolve(payload);
    });
});
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
describeIf('CollaborationHub realtime flows', () => {
    let httpServer;
    let ioServer;
    let port;
    const connectClient = async () => {
        const socket = (0, socket_io_client_1.io)(`http://127.0.0.1:${port}/collaboration`, {
            transports: ['websocket'],
            autoConnect: true,
        });
        await new Promise((resolve) => {
            socket.on('connect', () => resolve());
        });
        return socket;
    };
    const disconnectClient = async (socket) => {
        await new Promise((resolve) => {
            socket.on('disconnect', () => resolve());
            socket.disconnect();
        });
    };
    const joinWorkspace = async (socket, workspaceId, user) => {
        const joined = waitForEvent(socket, 'workspace:joined');
        socket.emit('workspace:join', {
            workspaceId,
            userId: user.id,
            userName: user.name,
        });
        return joined;
    };
    (0, globals_1.beforeEach)(async () => {
        httpServer = (0, http_1.createServer)();
        ioServer = new socket_io_1.Server(httpServer, { serveClient: false });
        (0, collaborationHub_1.createCollaborationHub)(ioServer, { activityLimit: 20 });
        await new Promise((resolve) => {
            httpServer.listen(0, '127.0.0.1', () => {
                port = httpServer.address().port;
                resolve();
            });
        });
    });
    (0, globals_1.afterEach)(async () => {
        ioServer.close();
        await new Promise((resolve) => httpServer.close(() => resolve()));
    });
    (0, globals_1.it)('shares workspace membership and activity feed', async () => {
        const workspaceId = 'ws-shared';
        const clientA = await connectClient();
        const snapshot = await joinWorkspace(clientA, workspaceId, {
            id: 'user-a',
            name: 'Analyst A',
        });
        (0, globals_1.expect)(snapshot.members).toHaveLength(1);
        const presenceJoined = waitForEvent(clientA, 'presence:joined');
        const clientB = await connectClient();
        await joinWorkspace(clientB, workspaceId, { id: 'user-b', name: 'Analyst B' });
        const presence = await presenceJoined;
        (0, globals_1.expect)(presence.userId).toBe('user-b');
        const activity = await waitForEvent(clientA, 'workspace:activity');
        (0, globals_1.expect)(activity.length).toBeGreaterThanOrEqual(1);
        await disconnectClient(clientA);
        await disconnectClient(clientB);
    });
    (0, globals_1.it)('broadcasts live cursors and team chat updates', async () => {
        const workspaceId = 'ws-cursors';
        const clientA = await connectClient();
        const clientB = await connectClient();
        await joinWorkspace(clientA, workspaceId, { id: 'user-a', name: 'Analyst A' });
        await joinWorkspace(clientB, workspaceId, { id: 'user-b', name: 'Analyst B' });
        const cursorUpdate = waitForEvent(clientA, 'presence:update');
        clientB.emit('presence:update', {
            workspaceId,
            userId: 'user-b',
            cursor: { x: 25, y: 30 },
        });
        const cursor = await cursorUpdate;
        (0, globals_1.expect)(cursor.cursor).toEqual({ x: 25, y: 30 });
        const chatReceived = waitForEvent(clientA, 'chat:message');
        clientB.emit('chat:message', {
            workspaceId,
            userId: 'user-b',
            message: 'Team ready for collaborative triage',
        });
        const chat = await chatReceived;
        (0, globals_1.expect)(chat.message).toContain('collaborative');
        (0, globals_1.expect)(chat.userId).toBe('user-b');
        await disconnectClient(clientA);
        await disconnectClient(clientB);
    });
    (0, globals_1.it)('synchronizes annotations and resolves conflicting edits', async () => {
        const workspaceId = 'ws-edits';
        const clientA = await connectClient();
        const clientB = await connectClient();
        await joinWorkspace(clientA, workspaceId, { id: 'user-a', name: 'Analyst A' });
        await joinWorkspace(clientB, workspaceId, { id: 'user-b', name: 'Analyst B' });
        const annotationUpdate = waitForEvent(clientA, 'annotation:updated');
        clientB.emit('annotation:add', {
            workspaceId,
            userId: 'user-b',
            targetId: 'intel-123',
            body: 'Add a shared annotation',
        });
        const annotation = await annotationUpdate;
        (0, globals_1.expect)(annotation.action).toBe('add');
        const firstEditApplied = waitForEvent(clientA, 'edit:applied');
        clientA.emit('edit:submit', {
            workspaceId,
            entityId: 'entity-1',
            userId: 'user-a',
            version: 0,
            changes: { title: 'Initial finding' },
        });
        const initialEdit = await firstEditApplied;
        (0, globals_1.expect)(initialEdit.version).toBe(1);
        const conflictNotice = waitForEvent(clientB, 'edit:conflict');
        const resolvedEditApplied = waitForEvent(clientA, 'edit:applied');
        clientB.emit('edit:submit', {
            workspaceId,
            entityId: 'entity-1',
            userId: 'user-b',
            version: 0,
            changes: { summary: 'Concurrent change' },
        });
        const conflict = await conflictNotice;
        const resolved = await resolvedEditApplied;
        (0, globals_1.expect)(conflict.resolvedVersion).toBeGreaterThan(1);
        (0, globals_1.expect)(resolved.version).toBe(conflict.resolvedVersion);
        await disconnectClient(clientA);
        await disconnectClient(clientB);
    });
    (0, globals_1.it)('manages presence channels with cursor updates', async () => {
        const workspaceId = 'ws-presence';
        const channel = 'tri-pane';
        const clientA = await connectClient();
        const clientB = await connectClient();
        const snapshot = waitForEvent(clientA, 'presence:channel:snapshot');
        clientA.emit('presence:channel:join', {
            workspaceId,
            channel,
            userId: 'user-a',
            userName: 'Analyst A',
        });
        const initialSnapshot = await snapshot;
        (0, globals_1.expect)(initialSnapshot.members).toHaveLength(1);
        const joined = waitForEvent(clientA, 'presence:channel:joined');
        clientB.emit('presence:channel:join', {
            workspaceId,
            channel,
            userId: 'user-b',
            userName: 'Analyst B',
        });
        const joinedPayload = await joined;
        (0, globals_1.expect)(joinedPayload.userId).toBe('user-b');
        const update = waitForEvent(clientA, 'presence:channel:update');
        clientB.emit('presence:channel:update', {
            workspaceId,
            channel,
            cursor: { x: 42, y: 84 },
            selection: JSON.stringify({ pane: 'graph', id: 'entity-7' }),
        });
        const updatePayload = await update;
        (0, globals_1.expect)(updatePayload.cursor).toEqual({ x: 42, y: 84 });
        await disconnectClient(clientA);
        await disconnectClient(clientB);
    });
});
