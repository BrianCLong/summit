import { spawn } from 'child_process';
export async function opaEval(input: any) {
  return new Promise<string>((res, rej) => {
    const p = spawn('opa', ['eval', '-f', 'values', '-I', '-d', 'policy/'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    p.stdin.write(JSON.stringify(input));
    p.stdin.end();
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (c) => (c ? rej(new Error(err || 'opa failed')) : res(out)));
  });
}
