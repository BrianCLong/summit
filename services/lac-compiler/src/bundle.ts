import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import tar from 'tar-stream';

export type BundleOptions = {
  packageName?: string;
  revision?: string;
  roots?: string[];
  data?: Record<string, unknown>;
};

export async function buildBundle(rego: string, outPath: string, options: BundleOptions = {}) {
  if (!rego.trim()) throw new Error('empty_rego');

  const pack = tar.pack();
  const manifest = {
    revision: options.revision ?? `rev-${Date.now()}`,
    roots: options.roots ?? [''],
    metadata: { package: options.packageName ?? 'policy' },
  };

  pack.entry({ name: '.manifest' }, JSON.stringify(manifest));
  pack.entry({ name: 'policy.rego' }, rego);
  if (options.data) pack.entry({ name: 'data.json' }, JSON.stringify(options.data));
  pack.finalize();

  const gz = zlib.createGzip();
  const tmpDir = path.join(process.cwd(), '.lac-bundle');
  fs.mkdirSync(tmpDir, { recursive: true });
  await new Promise<void>((resolve, reject) => {
    const stream = pack.pipe(gz).pipe(fs.createWriteStream(outPath));
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
  return outPath;
}
