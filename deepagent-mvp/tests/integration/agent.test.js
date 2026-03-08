"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const loop_1 = require("../../src/agent/loop");
const pg_1 = require("pg");
const config_1 = require("../../src/config");
const http_1 = require("http");
const socket_1 = require("../../src/server/realtime/socket");
const socket_io_client_1 = __importDefault(require("socket.io-client"));
const test_utils_1 = require("../test-utils");
describe('AgentLoop', () => {
    let pool;
    let httpServer;
    let clientSocket;
    let mockJwt;
    beforeAll((done) => {
        pool = new pg_1.Pool(config_1.config.postgres);
        httpServer = (0, http_1.createServer)();
        (0, socket_1.initSocket)(httpServer);
        httpServer.listen(() => {
            const port = httpServer.address().port;
            clientSocket = (0, socket_io_client_1.default)(`http://localhost:${port}`);
            mockJwt = (0, test_utils_1.generateMockJwt)({ tenantId: 'tenant-a', actor: 'admin' });
            (0, test_utils_1.setupNockJwks)();
            clientSocket.on('connect', done);
        });
    });
    afterAll(async () => {
        (0, socket_1.getIO)().close();
        clientSocket.close();
        await pool.end();
    });
    it('should run a multi-step task and return the correct answer', (done) => {
        const agentLoop = new loop_1.AgentLoop('tenant-a', 'admin', 'My computer is on fire', [], [], 'test-purpose');
        clientSocket.on('agent-event', (event) => {
            if (event.type === 'final-answer') {
                expect(event.data.answer).toBe('I have created a ticket for you. The ID is 789.');
                done();
            }
        });
        agentLoop.start();
    }, 10000); // 10 second timeout
});
