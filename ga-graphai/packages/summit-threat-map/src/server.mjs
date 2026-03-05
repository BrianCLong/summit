import http from 'node:http';

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

export function createThreatMapServer(store) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');

    if (req.method === 'GET' && /\/tiles\/\d+\/\d+\/\d+\.mvt$/.test(url.pathname)) {
      const from = url.searchParams.get('from') ?? new Date(Date.now() - 3600000).toISOString();
      const to = url.searchParams.get('to') ?? new Date().toISOString();
      const bucket = url.searchParams.get('bucket') ?? '1m';
      const cells = await store.getTileCells({ from, to, bucket });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ type: 'mvt-json-stub', cells }));
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/cell/')) {
      const h3 = url.pathname.split('/')[2];
      const from = url.searchParams.get('from') ?? new Date(Date.now() - 86400000).toISOString();
      const to = url.searchParams.get('to') ?? new Date().toISOString();
      const limit = Number(url.searchParams.get('limit') ?? '100');
      const events = await store.getCellEvents({ h3, from, to, limit });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ h3, events }));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/ingest/shodan') {
      const body = await readJsonBody(req);
      await store.appendEvents(body.events ?? []);
      res.statusCode = 202;
      res.end(JSON.stringify({ accepted: body.events?.length ?? 0 }));
      return;
    }

    res.statusCode = 404;
    res.end('not found');
  });
}
