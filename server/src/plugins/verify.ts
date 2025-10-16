import { execFile } from 'node:child_process';

export async function verifyCosign(
  ref: string,
  opts?: { key?: string; annotations?: Record<string, string> },
) {
  const isDev = (process.env.NODE_ENV || 'development') !== 'production';
  if ((process.env.COSIGN_DISABLED || '').toLowerCase() === 'true' || isDev)
    return true;
  const key = opts?.key || process.env.COSIGN_PUBLIC_KEY;
  const args = ['verify'];
  if (key) args.push('-key', key);
  if (opts?.annotations) {
    for (const [k, v] of Object.entries(opts.annotations)) {
      args.push('-a', `${k}=${v}`);
    }
  }
  args.push(ref);
  try {
    await new Promise<void>((res, rej) =>
      execFile('cosign', args, (e) => (e ? rej(e) : res())),
    );
    return true;
  } catch {
    return false;
  }
}
