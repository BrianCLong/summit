"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const socket_io_client_1 = __importDefault(require("socket.io-client"));
const globals_1 = require("@jest/globals");
globals_1.jest.mock('../src/lib/auth.js', () => ({
    verifyToken: globals_1.jest.fn(),
}));
(0, globals_1.describe)('WebSocket JWT auth with RBAC', () => {
    let server;
    let url;
    let io;
    let initSocket;
    let overrideVerifyToken;
    const verifyTokenMock = globals_1.jest.fn(async (token) => {
        if (token === 'admin-token') {
            return { id: '1', email: 'a@example.com', role: 'ADMIN' };
        }
        if (token === 'viewer-token') {
            return { id: '2', email: 'v@example.com', role: 'VIEWER' };
        }
        throw new Error('Invalid token');
    });
    (0, globals_1.beforeAll)(async () => {
        process.env.REDIS_URL = '';
        process.env.REDIS_HOST = '';
        process.env.REDIS_PORT = '';
        // @ts-ignore tsconfig does not enable allowImportingTsExtensions for tests
        const socketModule = await Promise.resolve().then(() => __importStar(require('../src/realtime/socket.ts')));
        initSocket = socketModule.initSocket;
        overrideVerifyToken = socketModule.overrideVerifyToken;
        overrideVerifyToken(verifyTokenMock);
        server = http_1.default.createServer();
        io = initSocket(server);
        await new Promise((resolve) => {
            server.listen(() => {
                const address = server.address();
                url = `http://localhost:${address.port}/realtime`;
                resolve();
            });
        });
    });
    (0, globals_1.afterAll)((done) => {
        overrideVerifyToken();
        io.close();
        server.close(done);
    });
    (0, globals_1.it)('rejects unauthorized sockets', (done) => {
        const client = (0, socket_io_client_1.default)(url, {
            auth: { token: 'bad-token' },
            transports: ['websocket'],
        });
        client.on('connect_error', (err) => {
            (0, globals_1.expect)(err.message).toBe('Unauthorized');
            client.close();
            done();
        });
    });
    (0, globals_1.it)('enforces RBAC for edit events', (done) => {
        const client = (0, socket_io_client_1.default)(url, {
            auth: { token: 'viewer-token' },
            transports: ['websocket'],
        });
        client.on('connect', () => {
            client.emit('investigation:join', { investigationId: 'g1' });
        });
        client.on('investigation:state', () => {
            client.emit('entity_update', {
                graphId: 'g1',
                entityId: 'e1',
                changes: {},
            });
        });
        client.on('investigation:error', (payload) => {
            (0, globals_1.expect)(payload.code).toBe('FORBIDDEN');
            client.close();
            done();
        });
        client.on('error', (msg) => {
            if (msg === 'Forbidden') {
                client.close();
                done();
            }
        });
    });
});
