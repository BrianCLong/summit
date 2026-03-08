"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const socket_io_1 = require("socket.io");
const http_1 = require("http");
const socket_io_client_1 = require("socket.io-client");
const dashboard_js_1 = require("../../src/realtime/dashboard.js");
const DashboardSimulationService_js_1 = require("../../src/services/DashboardSimulationService.js");
const NO_NETWORK_LISTEN = process.env.NO_NETWORK_LISTEN === 'true';
const describeIf = NO_NETWORK_LISTEN ? globals_1.describe.skip : globals_1.describe;
describeIf('Dashboard WebSocket', () => {
    let io;
    let server;
    let clientSocket;
    const PORT = 4321;
    (0, globals_1.beforeAll)((done) => {
        server = (0, http_1.createServer)();
        io = new socket_io_1.Server(server);
        // Setup dashboard namespace
        const ns = io.of('/realtime');
        ns.on('connection', (socket) => {
            (0, dashboard_js_1.registerDashboardHandlers)(ns, socket);
            // Manually trigger simulation for test
            DashboardSimulationService_js_1.dashboardSimulation['io'] = io;
        });
        server.listen(PORT, () => {
            done();
        });
    });
    (0, globals_1.afterAll)((done) => {
        io.close();
        server.close();
        done();
    });
    (0, globals_1.beforeEach)((done) => {
        clientSocket = (0, socket_io_client_1.io)(`http://localhost:${PORT}/realtime`);
        clientSocket.on('connect', done);
    });
    (0, globals_1.afterEach)(() => {
        if (clientSocket.connected) {
            clientSocket.disconnect();
        }
        DashboardSimulationService_js_1.dashboardSimulation.stop();
    });
    test('should allow joining dashboard room', (done) => {
        clientSocket.emit('dashboard:join');
        clientSocket.on('dashboard:state', (data) => {
            (0, globals_1.expect)(data.connected).toBe(true);
            (0, globals_1.expect)(data.message).toBe('Joined dashboard stream');
            done();
        });
    });
    test('should receive metrics updates', (done) => {
        clientSocket.emit('dashboard:join');
        // Force simulation update
        DashboardSimulationService_js_1.dashboardSimulation['runSimulation']();
        // We access the interval inside runSimulation via private property access simulation,
        // but better to just wait for the event since runSimulation starts an interval
        // Overwrite interval time to be fast
        const originalSetInterval = global.setInterval;
        // We can't easily mock setInterval inside the module without jest.mock or similar.
        // However, we can just call the method and expect it to emit.
        clientSocket.on('dashboard:metrics', (data) => {
            (0, globals_1.expect)(data).toHaveProperty('network');
            (0, globals_1.expect)(data).toHaveProperty('investigations');
            (0, globals_1.expect)(data.network).toHaveProperty('totalNodes');
            done();
        });
    }, 10000);
});
