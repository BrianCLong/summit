"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const socket_io_client_1 = __importDefault(require("socket.io-client"));
const socket_js_1 = require("../src/realtime/socket.js");
const globals_1 = require("@jest/globals");
globals_1.jest.mock('../src/lib/auth.js', () => ({
    verifyToken: globals_1.jest.fn(async (token) => {
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
(0, globals_1.describe)('presence websocket', () => {
    let server;
    let url;
    let io;
    (0, globals_1.beforeAll)((done) => {
        server = http_1.default.createServer();
        io = (0, socket_js_1.initSocket)(server);
        server.listen(() => {
            const address = server.address();
            url = `http://localhost:${address.port}/realtime`;
            done();
        });
    });
    (0, globals_1.afterAll)((done) => {
        io.close();
        server.close(done);
    });
    (0, globals_1.it)('broadcasts presence to workspace', (done) => {
        const clientA = (0, socket_io_client_1.default)(url, {
            auth: { token: 't1' },
            transports: ['websocket'],
        });
        clientA.emit('investigation:join', { investigationId: 'ws1' });
        clientA.once('presence:update', (payloadA) => {
            // payload is { investigationId, presence }
            (0, globals_1.expect)(payloadA.presence).toHaveLength(1);
            const clientB = (0, socket_io_client_1.default)(url, {
                auth: { token: 't2' },
                transports: ['websocket'],
            });
            clientB.emit('investigation:join', { investigationId: 'ws1' });
            clientA.once('presence:update', (payloadB) => {
                (0, globals_1.expect)(payloadB.presence).toHaveLength(2);
                clientA.close();
                clientB.close();
                done();
            });
        });
    });
});
