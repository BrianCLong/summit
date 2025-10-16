import { spawn } from 'child_process';
export async function runLocal(prompt: string) {
  return new Promise<string>((res, rej) => {
    const p = spawn('./llama', ['-p', prompt, '-n', '512']);
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.on('close', (c) => (c ? rej(new Error('local model failed')) : res(out)));
  });
}
