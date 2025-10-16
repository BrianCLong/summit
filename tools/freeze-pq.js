#!/usr/bin/env node
const fs = require('fs');
const crypto = require('crypto');
const queries = {
  tenant:
    'query($tenantId:ID!){ tenantCoherence(tenantId:$tenantId){ score status updatedAt } }',
  publish:
    'mutation($input:PublishCoherenceSignalInput!){ publishCoherenceSignal(input:$input) }',
};
const out = {};
for (const k in queries)
  out[crypto.createHash('sha256').update(queries[k]).digest('hex')] =
    queries[k];
fs.mkdirSync('.maestro', { recursive: true });
fs.writeFileSync(
  '.maestro/persisted-queries.json',
  JSON.stringify(out, null, 2),
);
console.log('Persisted queries written:', Object.keys(out));
