import * as http from 'http';
import { URL } from 'url';

// Create a simple HTTP server that mimics Express API for testing purposes
export async function createTestApp() {
  // In-memory storage for flows
  const flows: Record<string, { id: string; kind: string; state: 'queued' | 'running' | 'complete' }> = {};
  let seq = 0;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const path = url.pathname;
    const method = req.method || '';

    // Enable CORS and set content type
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        let parsedBody: any = {};
        if (body && (req.headers['content-type'] || '').includes('application/json')) {
          parsedBody = JSON.parse(body);
        }

        // Handle POST /api/flows
        if (method === 'POST' && path === '/api/flows') {
          const id = `f_${++seq}`;
          const kind = parsedBody?.kind ?? 'maestro';
          const rec = { id, kind, state: 'queued' as const };
          flows[id] = rec;
          
          res.writeHead(202);
          res.end(JSON.stringify(rec));
          return;
        }

        // Handle POST /__tick
        if (method === 'POST' && path === '/__tick') {
          for (const id in flows) {
            const rec = flows[id];
            if (rec.state === 'queued') rec.state = 'running';
            else if (rec.state === 'running') rec.state = 'complete';
          }
          res.writeHead(204);
          res.end();
          return;
        }

        // Handle GET /api/flows/:id
        if (method === 'GET' && path.startsWith('/api/flows/')) {
          const id = path.split('/').pop() || ''; // Get the last part which should be the ID
          const rec = flows[id];
          
          if (!rec) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'not_found' }));
            return;
          }
          
          res.writeHead(200);
          res.end(JSON.stringify(rec));
          return;
        }

        // Handle GET /__health
        if (method === 'GET' && path === '/__health') {
          res.writeHead(200);
          res.end(JSON.stringify({ status: 'ok' }));
          return;
        }

        // 404 for other routes
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'not found' }));
      } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
  });

  return server;
}