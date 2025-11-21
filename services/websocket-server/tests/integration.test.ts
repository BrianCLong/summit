/**
 * WebSocket Server Integration Tests
 */

import { io, Socket } from 'socket.io-client';
import jwt from 'jsonwebtoken';

const WS_URL = process.env.WS_URL || 'http://localhost:9001';
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-min-32-chars-long';

function createTestToken(userId: string, tenantId = 'test-tenant'): string {
  return jwt.sign(
    {
      sub: userId,
      userId,
      tenantId,
      roles: ['user'],
      permissions: ['read', 'write'],
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    },
    JWT_SECRET
  );
}

describe('WebSocket Server Integration Tests', () => {
  let client1: Socket;
  let client2: Socket;

  beforeAll(() => {
    // Wait for server to be ready
    return new Promise((resolve) => setTimeout(resolve, 2000));
  });

  afterEach(() => {
    if (client1?.connected) client1.disconnect();
    if (client2?.connected) client2.disconnect();
  });

  describe('Authentication', () => {
    it('should connect with valid token', (done) => {
      const token = createTestToken('user1');

      client1 = io(WS_URL, {
        auth: { token, tenantId: 'test-tenant' },
      });

      client1.on('connect', () => {
        expect(client1.connected).toBe(true);
        done();
      });

      client1.on('connect_error', (error) => {
        done(error);
      });
    }, 10000);

    it('should reject connection without token', (done) => {
      client1 = io(WS_URL, {
        auth: {},
      });

      client1.on('connect', () => {
        done(new Error('Should not connect without token'));
      });

      client1.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication');
        done();
      });
    }, 10000);
  });

  describe('Connection Events', () => {
    it('should receive connection:established event', (done) => {
      const token = createTestToken('user1');

      client1 = io(WS_URL, {
        auth: { token, tenantId: 'test-tenant' },
      });

      client1.on('connection:established', (data) => {
        expect(data.connectionId).toBeDefined();
        expect(data.tenantId).toBe('test-tenant');
        done();
      });
    }, 10000);
  });

  describe('Room Management', () => {
    beforeEach((done) => {
      const token = createTestToken('user1');
      client1 = io(WS_URL, {
        auth: { token, tenantId: 'test-tenant' },
      });
      client1.on('connect', () => done());
    });

    it('should join a room successfully', (done) => {
      client1.emit('room:join', { room: 'test-room' }, (response: any) => {
        expect(response.success).toBe(true);
        done();
      });
    }, 10000);

    it('should leave a room successfully', (done) => {
      client1.emit('room:join', { room: 'test-room' }, (joinResponse: any) => {
        expect(joinResponse.success).toBe(true);

        client1.emit('room:leave', { room: 'test-room' }, (leaveResponse: any) => {
          expect(leaveResponse.success).toBe(true);
          done();
        });
      });
    }, 10000);

    it('should receive room:joined event', (done) => {
      client1.on('room:joined', (data) => {
        expect(data.room).toBe('test-tenant:test-room');
        done();
      });

      client1.emit('room:join', { room: 'test-room' });
    }, 10000);
  });

  describe('Messaging', () => {
    beforeEach((done) => {
      const token1 = createTestToken('user1');
      const token2 = createTestToken('user2');

      client1 = io(WS_URL, {
        auth: { token: token1, tenantId: 'test-tenant' },
      });

      client2 = io(WS_URL, {
        auth: { token: token2, tenantId: 'test-tenant' },
      });

      let connected = 0;
      const checkReady = () => {
        connected++;
        if (connected === 2) done();
      };

      client1.on('connect', checkReady);
      client2.on('connect', checkReady);
    });

    it('should send and receive messages in a room', (done) => {
      const testPayload = { type: 'test', message: 'Hello, world!' };

      // Both clients join the room
      client1.emit('room:join', { room: 'test-room' });
      client2.emit('room:join', { room: 'test-room' });

      // Client 2 listens for messages
      client2.on('room:message', (message: any) => {
        expect(message.payload).toEqual(testPayload);
        expect(message.from).toBe('user1');
        done();
      });

      // Wait for joins to complete, then send message
      setTimeout(() => {
        client1.emit('room:send', {
          room: 'test-room',
          payload: testPayload,
        });
      }, 1000);
    }, 15000);

    it('should support persistent messages', (done) => {
      const testPayload = { type: 'test', message: 'Persistent message' };

      client1.emit('room:join', { room: 'test-room' });

      setTimeout(() => {
        client1.emit(
          'room:send',
          {
            room: 'test-room',
            payload: testPayload,
            persistent: true,
          },
          (response: any) => {
            expect(response.success).toBe(true);
            expect(response.messageId).toBeDefined();
            done();
          }
        );
      }, 1000);
    }, 15000);
  });

  describe('Presence', () => {
    beforeEach((done) => {
      const token = createTestToken('user1');
      client1 = io(WS_URL, {
        auth: { token, tenantId: 'test-tenant' },
      });
      client1.on('connect', () => done());
    });

    it('should update presence status', (done) => {
      client1.emit('room:join', { room: 'test-room' });

      client1.on('presence:update', (data) => {
        expect(data.room).toBe('test-tenant:test-room');
        expect(data.presence).toBeInstanceOf(Array);

        if (data.presence.some((p: any) => p.userId === 'user1')) {
          done();
        }
      });
    }, 10000);

    it('should broadcast presence changes', (done) => {
      const token2 = createTestToken('user2');
      client2 = io(WS_URL, {
        auth: { token: token2, tenantId: 'test-tenant' },
      });

      client2.on('connect', () => {
        client1.emit('room:join', { room: 'test-room' });
        client2.emit('room:join', { room: 'test-room' });

        setTimeout(() => {
          client2.on('presence:update', (data) => {
            const user1Presence = data.presence.find((p: any) => p.userId === 'user1');
            if (user1Presence && user1Presence.status === 'away') {
              done();
            }
          });

          client1.emit('presence:status', { status: 'away' });
        }, 1000);
      });
    }, 15000);
  });

  describe('Health Checks', () => {
    it('should respond to health endpoint', async () => {
      const response = await fetch(`${WS_URL}/health`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(data.status);
    });

    it('should respond to ready endpoint', async () => {
      const response = await fetch(`${WS_URL}/health/ready`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.ready).toBeDefined();
    });

    it('should respond to live endpoint', async () => {
      const response = await fetch(`${WS_URL}/health/live`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.alive).toBe(true);
    });

    it('should expose metrics', async () => {
      const response = await fetch(`${WS_URL}/metrics`);
      expect(response.ok).toBe(true);

      const text = await response.text();
      expect(text).toContain('websocket_active_connections');
    });
  });
});
