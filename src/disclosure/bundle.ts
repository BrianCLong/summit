import { createHash } from 'crypto';
import { createWriteStream } from 'fs';
import archiver from 'archiver';

export interface BundleArtifact {
  name: string;
  path: string;
  sha256?: string;
}

export interface BundleParams {
  artifacts: BundleArtifact[];
  claimSet: any;
  merkleRoot: string;
  attestations: any[];
}

export interface BundleResult {
  path: string;
  sha256: string;
}

export async function makeBundle({
  artifacts,
  claimSet,
  merkleRoot,
  attestations,
}: BundleParams): Promise<BundleResult> {
  const outPath = `/tmp/bundle_${Date.now()}.zip`;
  const out = createWriteStream(outPath);
  const zip = archiver('zip');

  zip.pipe(out);

  const manifest = {
    version: '1',
    merkleRoot,
    claimSetSummary: {
      id: claimSet.id,
      count: (claimSet.claims || []).length,
    },
    attestations,
  };

  zip.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
  zip.append(JSON.stringify(claimSet, null, 2), { name: 'claimset.json' });

  for (const artifact of artifacts) {
    zip.file(artifact.path, { name: `artifacts/${artifact.name}` });
  }

  await zip.finalize();

  const sha256 = await calculateFileHash(outPath);
  const worm =
    (process.env.AUDIT_WORM_ENABLED || 'false').toLowerCase() === 'true';
  const bucket = process.env.AUDIT_BUCKET;

  if (worm && bucket) {
    const key = `disclosures/${new Date().toISOString().slice(0, 10)}/${sha256}.zip`;
    const fs = await import('fs/promises');
    const buf = await fs.readFile(outPath);
    const { putLocked } = await import('../audit/worm.js');
    const uri = await putLocked(bucket, key, buf);
    return { path: uri, sha256 };
  }

  return { path: outPath, sha256 };
}

function calculateFileHash(filePath: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const hash = createHash('sha256');
    const fs = require('fs');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (data: Buffer) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

export default makeBundle;
