import { startDashboard } from '../src/lib/switchboard-ui.js';
import axios from 'axios';
import http from 'http';

describe('Switchboard Dashboard', () => {
  let server: http.Server;
  const port = 3001;

  beforeAll(async () => {
    server = await startDashboard(port);
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  it('should respond with a 200 OK at the root URL', async () => {
    const response = await axios.get(`http://127.0.0.1:${port}`);
    expect(response.status).toBe(200);
    expect(response.data).toContain('Switchboard Local Dashboard');
    expect(response.data).toContain('127.0.0.1');
  });

  it('should respond with health data at /api/health', async () => {
    const response = await axios.get(`http://127.0.0.1:${port}/api/health`);
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('mcp_servers');
  });

  it('should respond with receipts data at /api/receipts', async () => {
    const response = await axios.get(`http://127.0.0.1:${port}/api/receipts`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
  });

  it('should respond with decisions data at /api/decisions', async () => {
    const response = await axios.get(`http://127.0.0.1:${port}/api/decisions`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
  });
});
