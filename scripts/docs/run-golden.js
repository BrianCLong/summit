const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    s.isDirectory() ? walk(p) : /\.mdx?$/.test(f) && files.push(p);
  }
})('docs');
const blockRx =
  /```bash\s+test\s+exec(?:\s+timeout=(\d+))?(?:\s+env=(\w+))?[\r\n]+([\s\S]*?)```/g;
const BASE_ENV = { BASE_URL: 'http://localhost:4010' };
async function run(cmd, env, timeout) {
  return new Promise((res, reject) => {
    const p = spawn('bash', ['-euo', 'pipefail', '-c', cmd], {
      env: { ...process.env, ...env },
    });
    let out = '';
    let err = '';
    const to = setTimeout(
      () => {
        p.kill('SIGKILL');
        reject(new Error('timeout'));
      },
      (timeout || 120) * 1000,
    );
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => {
      clearTimeout(to);
      code === 0 ? res(out) : reject(new Error(err || `exit ${code}`));
    });
  });
}
(async () => {
  let failed = 0;
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(blockRx)) {
      const timeout = Number(m[1] || '120');
      const env = m[2] === 'mock' ? BASE_ENV : {};
      try {
        await run(m[3], env, timeout);
        console.log('PASS', f);
      } catch (e) {
        console.error('FAIL', f, e.message);
        failed++;
      }
    }
  }
  process.exit(failed ? 1 : 0);
})();
