import { createWriteStream, promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { request } from 'undici';
import { extract } from 'tar';
import { spawn } from 'node:child_process';

export type FetchOptions = { url: string; cosignPath?: string };

function sh(
  cmd: string,
  args: string[],
  input?: string,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '',
      stderr = '';
    p.stdout.on('data', (d) => (stdout += d.toString()));
    p.stderr.on('data', (d) => (stderr += d.toString()));
    p.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
    if (input) p.stdin.end(input);
  });
}

export async function fetchAttestation(url: string): Promise<string> {
  const { body, statusCode } = await request(url, { method: 'GET' });
  if (statusCode !== 200) throw new Error(`HTTP ${statusCode}`);
  let data = '';
  for await (const chunk of body as any) data += chunk.toString('utf8');
  return data;
}

export async function fetchAndVerify({
  url,
  cosignPath = 'cosign',
}: FetchOptions): Promise<string> {
  const tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), 'policy-pack-'));
  const tarPath = path.join(tmpdir, 'pack.tar');
  const { body, headers, statusCode } = await request(url, { method: 'GET' });
  if (statusCode !== 200) throw new Error(`HTTP ${statusCode}`);
  const digestHeader = headers['digest'];
  const bundleHeader = headers['x-cosign-bundle'];
  if (!digestHeader) throw new Error('missing verification headers');

  const file = createWriteStream(tarPath);
  await new Promise<void>((res, rej) => {
    body.pipe(file);
    body.on('error', rej);
    file.on('finish', () => res());
  });

  // Verify SHA-256
  const { stdout: shaOut } = await sh('sha256sum', [tarPath]);
  const sha = shaOut.trim().split(' ')[0];
  const expected = String(digestHeader).replace('sha-256=', '').trim();
  if (sha !== expected)
    throw new Error(`digest mismatch: ${sha} != ${expected}`);

  // Verify cosign bundle (offline)
  process.env.COSIGN_EXPERIMENTAL = '1';
  const attUrl = url.endsWith('/attestation') ? url : `${url}/attestation`;
  const bundle = bundleHeader
    ? String(bundleHeader)
    : await fetchAttestation(attUrl);
  const { code, stderr } = await sh(
    cosignPath,
    ['verify-blob', '--bundle', '-', tarPath],
    bundle,
  );
  if (code !== 0) throw new Error(`cosign verify failed: ${stderr}`);

  // Extract to a directory and return path
  const extractDir = path.join(tmpdir, 'unpacked');
  await fs.mkdir(extractDir, { recursive: true });
  await extract({ file: tarPath, cwd: extractDir });
  return extractDir;
}

// Example usage when run directly
if (process.env.NODE_ENV !== 'test' && process.argv[2]) {
  fetchAndVerify({ url: process.argv[2] })
    .then((dir) => console.log('verified pack at:', dir))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
