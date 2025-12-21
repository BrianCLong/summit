import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import tar from 'tar-stream';
import { buildBundle } from '../../src/bundle';

test('writes gzip bundle with manifest and policy', async () => {
  const outPath = path.join(process.cwd(), 'policy.gz');
  await buildBundle('package x\nallow=true', outPath, { packageName: 'x' });
  expect(fs.existsSync(outPath)).toBe(true);

  const entries: Record<string, string> = {};
  const gunzip = zlib.createGunzip();
  const extract = tar.extract();
  await new Promise<void>((resolve, reject) => {
    extract.on('entry', (header, stream, next) => {
      const chunks: Buffer[] = [];
      stream.on('data', (d) => chunks.push(d));
      stream.on('end', () => {
        entries[header.name] = Buffer.concat(chunks).toString('utf8');
        next();
      });
      stream.on('error', reject);
    });
    extract.on('finish', resolve);
    fs.createReadStream(outPath).pipe(gunzip).pipe(extract).on('error', reject);
  });

  expect(entries['policy.rego']).toContain('allow');
  const manifest = JSON.parse(entries['.manifest']);
  expect(manifest.metadata.package).toBe('x');
});
