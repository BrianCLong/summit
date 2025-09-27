import { createReadStream, promises as fsPromises } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const { access, stat } = fsPromises;
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const distDir = join(__dirname, 'dist');
const defaultFile = 'index.html';
const healthPath = '/health';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const port = Number.parseInt(process.env.PORT ?? '3000', 10);

function resolvePath(urlPath) {
  const safePath = urlPath.split('?')[0].split('#')[0];
  const normalized = safePath.startsWith('/') ? safePath.slice(1) : safePath;
  return join(distDir, normalized || defaultFile);
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function serveFile(filePath, res) {
  const ext = extname(filePath);
  const contentType = mimeTypes[ext] ?? 'application/octet-stream';
  const stats = await stat(filePath);

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stats.size,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  });

  createReadStream(filePath).pipe(res);
}

const server = createServer(async (req, res) => {
  if (!req.url || req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  if (req.url === healthPath) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: basename(distDir) }));
    return;
  }

  let candidate = resolvePath(req.url);
  if (!(await fileExists(candidate))) {
    candidate = join(distDir, defaultFile);
  } else {
    const candidateStats = await stat(candidate);
    if (candidateStats.isDirectory()) {
      candidate = join(distDir, defaultFile);
    }
  }

  try {
    await serveFile(candidate, res);
  } catch (err) {
    console.error('Failed to serve asset', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`client static server listening on ${port}`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
