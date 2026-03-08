"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const socket_io_client_1 = __importDefault(require("socket.io-client"));
const collab_js_1 = require("../src/realtime/collab.js");
const globals_1 = require("@jest/globals");
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
describeIf('realtime collaboration basics', () => {
    let server;
    let url;
    let io;
    (0, globals_1.beforeAll)(async () => {
        server = http_1.default.createServer();
        io = await (0, collab_js_1.initRealtime)(server);
        await new Promise((resolve) => {
            server.listen(() => {
                const address = server.address();
                url = `http://localhost:${address.port}`;
                resolve();
            });
        });
    });
    (0, globals_1.afterAll)((done) => {
        io.close();
        server.close(done);
    });
    (0, globals_1.it)('shares presence and cursor updates', async () => {
        const c1 = (0, socket_io_client_1.default)(url, {
            auth: { tenantId: 't1', userId: 'u1' },
            path: '/ws',
            transports: ['websocket'],
        });
        const c2 = (0, socket_io_client_1.default)(url, {
            auth: { tenantId: 't1', userId: 'u2' },
            path: '/ws',
            transports: ['websocket'],
        });
        await new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                c1.close();
                c2.close();
                reject(new Error('cursor:move timeout'));
            }, 5000);
            const onError = (err) => {
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
                    (0, globals_1.expect)(payload.userId).toBe('u2');
                    (0, globals_1.expect)(payload.x).toBe(5);
                    (0, globals_1.expect)(payload.y).toBe(6);
                    clearTimeout(timer);
                    c1.close();
                    c2.close();
                    resolve();
                }
                catch (err) {
                    onError(err);
                }
            });
            c1.on('connect_error', onError);
            c2.on('connect_error', onError);
            const maybeJoin = () => {
                if (joined)
                    return;
                joined = true;
                c1.emit('join', { investigationId: 'i1' });
                c2.emit('join', { investigationId: 'i1' });
            };
            if (c1.connected && c2.connected) {
                maybeJoin();
            }
            else {
                c1.on('connect', maybeJoin);
                c2.on('connect', maybeJoin);
            }
        });
    }, 10000);
});
