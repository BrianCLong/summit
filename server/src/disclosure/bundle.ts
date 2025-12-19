import { createHash } from 'crypto';
import { createWriteStream } from 'fs';
import archiver from 'archiver';

type BundleFormat = 'zip' | 'tar';

export async function makeBundle({
  artifacts,
  claimSet,
  merkleRoot,
  attestations,
  format = 'zip',
  checksums,
}: {
  artifacts: { name: string; path: string; sha256?: string }[];
  claimSet: any;
  merkleRoot: string;
  attestations: any[];
  format?: BundleFormat;
  checksums?: Record<string, string>;
}) {
  const ext = format === 'tar' ? 'tar.gz' : 'zip';
  const outPath = `/tmp/bundle_${Date.now()}.${ext}`;
  const out = createWriteStream(outPath);
  const archive =
    format === 'tar'
      ? archiver('tar', { gzip: true, gzipOptions: { level: 9 } })
      : archiver('zip', { zlib: { level: 9 } });

  archive.pipe(out);

  const manifest = {
    version: '1',
    merkleRoot,
    claimSetSummary: {
      id: claimSet.id,
      count: (claimSet.claims || []).length,
    },
    attestations,
  };

  archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
  archive.append(JSON.stringify(claimSet, null, 2), { name: 'claimset.json' });

  if (checksums && Object.keys(checksums).length > 0) {
    archive.append(JSON.stringify(checksums, null, 2), {
      name: 'checksums.json',
    });
  }

  for (const artifact of artifacts) {
    archive.file(artifact.path, { name: `artifacts/${artifact.name}` });
  }

  await archive.finalize();

  const sha256 = await sha(outPath);
  // WORM storage disabled - worm.ts module is commented out
  // const worm =
  //   (process.env.AUDIT_WORM_ENABLED || 'false').toLowerCase() === 'true';
  // const bucket = process.env.AUDIT_BUCKET;

  // if (worm && bucket) {
  //   const key = `disclosures/${new Date().toISOString().slice(0, 10)}/${sha256}.zip`;
  //   const fs = await import('fs/promises');
  //   const buf = await fs.readFile(outPath);
  //   const { putLocked } = await import('../audit/worm.js');
  //   const uri = await putLocked(bucket, key, buf as any);
  //   return { path: uri, sha256 };
  // }

  return { path: outPath, sha256, format };
}

function sha(p: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = require('fs').createReadStream(p);

    stream.on('data', (data: any) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}
