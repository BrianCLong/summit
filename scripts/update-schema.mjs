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
// Prefer get-graphql-schema (widely available) to fetch SDL
try {
  await sh('npx', ['--yes', 'get-graphql-schema@^2.1.2', API, '>', OUT]);
} catch (e) {
  console.log('get-graphql-schema direct write not supported in this shell, trying node -e fallback...');
  // Fallback: capture stdout and write via node
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync('npx', ['--yes', 'get-graphql-schema@^2.1.2', API], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('get-graphql-schema failed');
  await fs.writeFile(OUT, r.stdout, 'utf8');
}
await fs.utimes(OUT, new Date(), new Date());
console.log('✅ Schema snapshot updated.');
