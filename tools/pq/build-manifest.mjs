#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const dir = 'persisted';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.graphql'));
const manifest = {};
for (const f of files) {
  const query = fs.readFileSync(path.join(dir, f), 'utf8').trim();
  const sha = crypto.createHash('sha256').update(query).digest('hex');
  manifest[sha] = query;
}
fs.writeFileSync('persisted/manifest.json', JSON.stringify(manifest, null, 2));
console.log(`Wrote manifest for ${files.length} queries.`);
