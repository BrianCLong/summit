import { startDashboard } from '../src/lib/switchboard-ui';
import http, { Server } from 'http';

describe('Switchboard UI', () => {
  let server: Server;

  afterEach((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  it('should start the server and respond to root path', async () => {
    server = await startDashboard(3001);

    return new Promise<void>((resolve, reject) => {
      http.get('http://127.0.0.1:3001', (res) => {
        expect(res.statusCode).toBe(200);
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          expect(data).toContain('Switchboard Local Dashboard');
          expect(data).toContain('WARNING: This is a read-only local dashboard');
          resolve();
        });
      }).on('error', reject);
    });
  });

  it('should bind to 127.0.0.1', async () => {
    server = await startDashboard(3002);
    const address = server.address() as any;
    expect(address.address).toBe('127.0.0.1');
  });
});
