import fs from 'fs';

const staging = JSON.parse(fs.readFileSync('env/staging.json', 'utf8'));
const prod = JSON.parse(fs.readFileSync('env/prod.json', 'utf8'));

const ALLOWED_DIFFS = ['replicas'];

function diff(a, b, path = '') {
  let diffs = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const p = path ? `${path}.${k}` : k;
    if (ALLOWED_DIFFS.includes(p)) continue;
    if (typeof a[k] === 'object' && typeof b[k] === 'object') {
      diffs = diffs.concat(diff(a[k], b[k], p));
    } else if (a[k] !== b[k]) {
      diffs.push(p);
    }
  }
  return diffs;
}

const diffs = diff(staging, prod);
if (diffs.length) {
  console.error('❌ Env parity violation:', diffs);
  process.exit(1);
}
console.log('✅ Env parity validated');
