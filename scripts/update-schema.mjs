import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';

const API = process.env.VITE_API_URL || 'http://localhost:4000/graphql';
const OUT = 'client/schema.graphql';

function sh(cmd, args) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
    p.on('exit', (code) => (code === 0 ? res() : rej(new Error(cmd + ' failed'))));
  });
}

console.log(`🔄 Fetching schema from ${API} → ${OUT}`);
await sh('npx', ['--yes', 'graphql-schema-cli@^3.1.0', 'print', API, '--write', OUT]);
await fs.utimes(OUT, new Date(), new Date());
console.log('✅ Schema snapshot updated.');

