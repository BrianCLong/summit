const fs = require('fs');
const crypto = require('crypto');

function loadOps() {
  try {
    const art = fs.readFileSync('artifacts/graphql-ops.json', 'utf8');
    return JSON.parse(art);
  } catch {
    return [];
  }
}

const ops = loadOps();
const hashes = ops.map((q) => crypto.createHash('sha256').update(q).digest('hex'));
fs.writeFileSync(0, JSON.stringify(hashes, null, 2));

