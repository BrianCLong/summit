const http = require('http');
const url = require('url');
const {
  httpMiddleware,
  startSpan,
  log,
  recordRetry,
  recordCacheHit,
  setQueueDepth,
  setSaturation,
  exportPrometheus,
} = require('./obs-sdk.cjs');

const port = process.env.PORT || 3100;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const handler = httpMiddleware(async (req, res) => {
  const { pathname, query } = url.parse(req.url, true);
  if (pathname === '/metrics') {
    const body = exportPrometheus();
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(body);
    return;
  }

  if (pathname === '/cache') {
    recordCacheHit();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'cache-hit' }));
    return;
  }

  await startSpan('route.dispatch', { route: pathname }, async () => {
    if (pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (pathname === '/maybe-error') {
      const shouldFail = query && query.fail === '1';
      if (shouldFail) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', detail: 'synthetic failure' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', detail: 'no failure' }));
      return;
    }

    if (pathname === '/work') {
      const retries = Number(query && query.retries) || 0;
      for (let i = 0; i < retries; i += 1) {
        recordRetry();
      }
      await startSpan('work.db', { model: 'demo' }, async () => delay(30));
      await startSpan('work.external-call', { upstream: 'payments' }, async () => delay(20));
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'created' }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'not-found' }));
  });
});

const server = http.createServer(handler);

setInterval(() => {
  setQueueDepth('ingest', Math.floor(Math.random() * 5));
  setSaturation('worker_pool', Math.random());
}, 5000);

server.listen(port, () => {
  log('info', 'demo.server.started', { port });
});
