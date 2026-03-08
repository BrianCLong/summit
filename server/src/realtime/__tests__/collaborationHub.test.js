"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const socket_io_client_1 = require("socket.io-client");
const collaborationHub_js_1 = require("../collaborationHub.js");
const waitForEvent = (socket, event) => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), 5000);
    socket.once(event, (payload) => {
        clearTimeout(timeout);
        resolve(payload);
    });
});
const NO_NETWORK_LISTEN = process.env.NO_NETWORK_LISTEN === 'true';
const describeIf = NO_NETWORK_LISTEN ? globals_1.describe.skip : globals_1.describe;
describeIf('CollaborationHub presence channels', () => {
    let httpServer;
    let io;
    let port;
    (0, globals_1.beforeAll)((done) => {
        httpServer = (0, http_1.createServer)();
        io = new socket_io_1.Server(httpServer, {
            cors: { origin: '*' },
        });
        (0, collaborationHub_js_1.createCollaborationHub)(io, { presenceThrottleMs: 5 });
        httpServer.listen(() => {
            port = httpServer.address().port;
            done();
        });
    });
    (0, globals_1.afterAll)((done) => {
        io.close();
        httpServer.close(done);
    });
    (0, globals_1.it)('broadcasts presence updates to channel members', async () => {
        const url = `http://localhost:${port}/collaboration`;
        const connectClient = async () => {
            const client = (0, socket_io_client_1.io)(url, { transports: ['websocket'] });
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
            const updatePromise = waitForEvent(clientB, 'presence:channel:update');
            clientA.emit('presence:channel:update', {
                workspaceId: 'tri-pane',
                channel: 'tri-pane',
                cursor: { x: 120, y: 240 },
            });
            const update = await updatePromise;
            (0, globals_1.expect)(update.userId).toBe('user-a');
            (0, globals_1.expect)(update.cursor).toEqual({ x: 120, y: 240 });
        }
        finally {
            clientA.disconnect();
            clientB.disconnect();
        }
    });
});
