const http = require('http');
const { URL } = require('url');
const { SchemaRegistry } = require('./schemaRegistry');

const registry = new SchemaRegistry();

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error('payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(new Error(`invalid JSON payload: ${error.message}`));
      }
    });
    req.on('error', reject);
  });
}

function sendJSON(res, status, payload, durationMs) {
  if (durationMs != null) {
    res.setHeader('Server-Timing', `total;dur=${durationMs}`);
  }
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function notFound(res, durationMs) {
  sendJSON(res, 404, { error: 'not_found' }, durationMs);
}

const server = http.createServer(async (req, res) => {
  const start = Date.now();
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const segments = url.pathname.split('/').filter(Boolean);

    if (req.method === 'GET' && url.pathname === '/healthz') {
      sendJSON(res, 200, { status: 'ok', uptime: process.uptime() }, Date.now() - start);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/schemas') {
      const subjects = registry.listSubjects();
      sendJSON(res, 200, { subjects }, Date.now() - start);
      return;
    }

    if (segments[0] === 'schemas' && segments.length >= 2) {
      const subject = decodeURIComponent(segments[1]);

      if (req.method === 'GET' && segments.length === 2) {
        const record = registry.getSubject(subject);
        if (!record) {
          notFound(res, Date.now() - start);
          return;
        }
        sendJSON(res, 200, { subject, versions: record.versions }, Date.now() - start);
        return;
      }

      if (req.method === 'GET' && segments[2] === 'versions' && segments.length === 3) {
        const latest = registry.getLatestVersion(subject);
        if (!latest) {
          notFound(res, Date.now() - start);
          return;
        }
        sendJSON(res, 200, { subject, latest }, Date.now() - start);
        return;
      }

      if (req.method === 'GET' && segments[2] === 'versions' && segments.length === 4) {
        const version = decodeURIComponent(segments[3]);
        const entry = registry.getVersion(subject, version);
        if (!entry) {
          notFound(res, Date.now() - start);
          return;
        }
        sendJSON(res, 200, { subject, version: entry }, Date.now() - start);
        return;
      }

      if (req.method === 'POST' && segments[2] === 'versions' && segments.length === 3) {
        const body = await parseBody(req);
        const entry = registry.registerVersion(subject, body);
        sendJSON(res, 201, entry, Date.now() - start);
        return;
      }

      if (req.method === 'POST' && segments[2] === 'validate') {
        const body = await parseBody(req);
        const result = registry.validate(subject, body);
        sendJSON(res, 200, { subject, ...result }, Date.now() - start);
        return;
      }
    }

    notFound(res, Date.now() - start);
  } catch (error) {
    sendJSON(res, 400, { error: error.message }, Date.now() - start);
  }
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`Schema registry listening on ${port}`);
  });
}

module.exports = { server, registry };
