const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../../docs-site/build');
http
  .createServer((req, res) => {
    const fp = path.join(root, req.url === '/' ? 'index.html' : req.url);
    if (!fp.startsWith(root)) return res.writeHead(403).end('Forbidden');
    fs.readFile(fp, (e, b) =>
      e ? res.writeHead(404).end('Not found') : res.end(b),
    );
  })
  .listen(8080, () => console.log('Offline docs at http://localhost:8080'));
