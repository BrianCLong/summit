#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function sha256(s){ return crypto.createHash('sha256').update(s).digest('hex'); }
function norm(q){ return String(q||'').replace(/\s+/g,' ').trim(); }

const srcDir = process.argv[2] || 'client/src/queries';
const out = process.argv[3] || 'services/api/persisted/queries.json';

const map = {};
if (fs.existsSync(srcDir)){
  for (const f of fs.readdirSync(srcDir)){
    if (!f.endsWith('.graphql')) continue;
    const raw = fs.readFileSync(path.join(srcDir,f),'utf8');
    const m = raw.match(/\b(query|mutation)\s+([A-Za-z0-9_]+)/);
    const opName = m?.[2];
    if (!opName) continue;
    map[opName] = sha256(norm(raw));
  }
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(map, null, 2));
console.log('Persisted map written:', out);

