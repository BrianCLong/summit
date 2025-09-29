import http from 'http';
import { AddressInfo } from 'net';
import ioClient from 'socket.io-client';
import { Server } from 'socket.io';
import { initSocket } from '../src/realtime/socket';

jest.mock('../src/lib/auth.js', () => ({
  verifyToken: jest.fn(async (token: string) => {
    if (token === 't1') {
      return { id: '1', email: 'u1@example.com', username: 'u1', role: 'ADMIN' };
    }
    if (token === 't2') {
      return { id: '2', email: 'u2@example.com', username: 'u2', role: 'ADMIN' };
    }
    throw new Error('Invalid token');
  }),
}));

describe('graph mutation websocket', () => {
  let server: http.Server;
  let url: string;
  let io: Server;

  beforeAll((done) => {
    server = http.createServer();
    io = initSocket(server);
    server.listen(() => {
      const address = server.address() as AddressInfo;
      url = `http://localhost:${address.port}/realtime`;
      done();
    });
  });

  afterAll((done) => {
    io.close();
    server.close(done);
  });

  it('broadcasts mutations without echoing to sender', (done) => {
    const clientA = ioClient(url, {
      auth: { token: 't1' },
      transports: ['websocket'],
    });
    const clientB = ioClient(url, {
      auth: { token: 't2' },
      transports: ['websocket'],
    });

    let receivedByA = false;

    clientA.on('graph:mutated', () => {
      receivedByA = true;
    });

    clientB.on('graph:mutated', (msg: { entityId: string }) => {
      expect(msg.entityId).toBe('e1');
      setTimeout(() => {
        expect(receivedByA).toBe(false);
        clientA.close();
        clientB.close();
        done();
      }, 50);
    });

    clientA.emit('graph:join', { graphId: 'g1' });
    clientB.emit('graph:join', { graphId: 'g1' });

    clientA.emit('graph:mutate', {
      graphId: 'g1',
      entityId: 'e1',
      changes: { label: 'n1' },
    });
  });
});
