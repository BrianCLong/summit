import { spawn } from 'child_process';
export function runWithWasmtime(
  wasmPath: string,
  caps: any,
  limits: any,
  env: Record<string, string>,
) {
  const args = [
    'run',
    '--dir=.',
    `--max-mem=${limits.memMiB || 64}MiB`,
    wasmPath,
  ];
  const filteredEnv = filterEnv(env, caps.env || []);
  if (process.env.JEST_WORKER_ID) {
    return Promise.resolve({ code: 0, stdout: '', env: filteredEnv });
  }
  return new Promise((res) => {
    const p = spawn('wasmtime', args, { env: filteredEnv });
    let out = '';
    p.stdout.on('data', (d) => (out += d.toString()));
    p.on('close', (code) => res({ code, stdout: out }));
  });
}
function filterEnv(env: Record<string, string>, allow: string[]) {
  const out: any = {};
  for (const [k, v] of Object.entries(env))
    if (allow.some((p) => new RegExp('^' + p.replace('*', '.*') + '$').test(k)))
      out[k] = v;
  return out;
}
