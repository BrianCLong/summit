// Minimal collector: append NDJSON lines to docs/ops/tta/log.ndjson (CI or dev preview only)
const fs = require('fs');
const path = require('path');
exports.handle = async (req, res) => {
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const safe = { ev: body.ev, ts: Date.now(), attrs: body.attrs };
    fs.mkdirSync('docs/ops/tta', { recursive: true });
    fs.appendFileSync('docs/ops/tta/log.ndjson', JSON.stringify(safe) + '\n');
    res.writeHead(204).end();
  } catch {
    res.writeHead(204).end();
  }
};
