import http from 'http';

const port = Number(process.env.PORT || 3000);

const jsonResponse = (res, body, status = 200) => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
};

const server = http.createServer((req, res) => {
  if (!req.url) {
    jsonResponse(res, { status: 'error', message: 'No URL provided' }, 400);
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    jsonResponse(res, { status: 'ok', service: 'maestro' });
    return;
  }

  if (req.method === 'GET' && req.url === '/api/health') {
    jsonResponse(res, {
      status: 'ok',
      latencyMs: 42,
      dependencies: { graphql: 'ok', database: 'mock' },
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/api/buildhub/health') {
    jsonResponse(res, { status: 'ok', buildHub: 'mock' });
    return;
  }

  if (req.method === 'POST' && req.url === '/graphql') {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      let response = {
        data: {
          __schema: {
            types: [{ name: 'Query' }, { name: 'Mutation' }],
          },
        },
      };

      try {
        const body = JSON.parse(
          Buffer.concat(chunks).toString('utf-8') || '{}',
        );
        if (body.query && body.query.includes('IntrospectionQuery')) {
          response = {
            data: {
              __schema: {
                queryType: { name: 'Query' },
                mutationType: { name: 'Mutation' },
                types: [{ name: 'Query' }, { name: 'Mutation' }],
              },
            },
          };
        }
      } catch (error) {
        // ignore parsing error and fall back to default response
      }

      jsonResponse(res, response);
    });
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    });
    res.end();
    return;
  }

  jsonResponse(res, { status: 'not-found', path: req.url }, 404);
});

server.listen(port, () => {
  console.log(`Mock Maestro server listening on http://127.0.0.1:${port}`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
