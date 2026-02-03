import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { io as Client } from 'socket.io-client';
import { registerDashboardHandlers } from '../../src/realtime/dashboard.js';
import { dashboardSimulation } from '../../src/services/DashboardSimulationService.js';

const NO_NETWORK_LISTEN = process.env.NO_NETWORK_LISTEN === 'true';
const describeIf = NO_NETWORK_LISTEN ? describe.skip : describe;

describeIf('Dashboard WebSocket', () => {
  let io: any;
  let server: any;
  let clientSocket: any;
  const PORT = 4321;

  beforeAll((done) => {
    server = createServer();
    io = new Server(server);

    // Setup dashboard namespace
    const ns = io.of('/realtime');
    ns.on('connection', (socket: any) => {
      registerDashboardHandlers(ns as any, socket);

      // Manually trigger simulation for test
      dashboardSimulation['io'] = io;
    });

    server.listen(PORT, () => {
      done();
    });
  });

  afterAll((done) => {
    io.close();
    server.close();
    done();
  });

  beforeEach((done) => {
    clientSocket = Client(`http://localhost:${PORT}/realtime`);
    clientSocket.on('connect', done);
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
    dashboardSimulation.stop();
  });

  test('should allow joining dashboard room', (done) => {
    clientSocket.emit('dashboard:join');

    clientSocket.on('dashboard:state', (data: any) => {
      expect(data.connected).toBe(true);
      expect(data.message).toBe('Joined dashboard stream');
      done();
    });
  });

  test('should receive metrics updates', (done) => {
    clientSocket.emit('dashboard:join');

    // Force simulation update
    dashboardSimulation['runSimulation']();

    // We access the interval inside runSimulation via private property access simulation,
    // but better to just wait for the event since runSimulation starts an interval

    // Overwrite interval time to be fast
    const originalSetInterval = global.setInterval;

    // We can't easily mock setInterval inside the module without jest.mock or similar.
    // However, we can just call the method and expect it to emit.

    clientSocket.on('dashboard:metrics', (data: any) => {
      expect(data).toHaveProperty('network');
      expect(data).toHaveProperty('investigations');
      expect(data.network).toHaveProperty('totalNodes');
      done();
    });
  }, 10000);
});
