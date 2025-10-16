import { createHash } from 'crypto';
import { promises as fs } from 'fs';

export async function buildSnapshot({
  runbookPath,
  plugins = [],
  contracts = [],
}: {
  runbookPath: string;
  plugins?: string[];
  contracts?: string[];
}) {
  // Minimal: concatenate bytes deterministically and hash; in prod, tarball + Vault Transit sign.
  const parts = [runbookPath, ...plugins, ...contracts];
  const chunks: Buffer[] = [];
  for (const p of parts) {
    try {
      chunks.push(await fs.readFile(p));
    } catch {
      /* ignore missing */
    }
  }
  const bytes = Buffer.concat(chunks);
  const digest = 'sha256:' + createHash('sha256').update(bytes).digest('hex');
  const signature = 'unsigned';
  const outFile = `/tmp/rb_${Date.now()}.bin`;
  await fs.writeFile(outFile, bytes);
  return { file: outFile, digest, signature };
}
