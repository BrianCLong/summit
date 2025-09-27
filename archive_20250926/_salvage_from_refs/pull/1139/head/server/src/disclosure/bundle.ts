import { createHash }
async function fsProm(p:string){ const fs = await import('fs/promises'); return fs.readFile(p); } from 'crypto';
import { createWriteStream }
async function fsProm(p:string){ const fs = await import('fs/promises'); return fs.readFile(p); } from 'fs';
import archiver from 'archiver';

export async function makeBundle({ artifacts, claimSet, merkleRoot, attestations }
async function fsProm(p:string){ const fs = await import('fs/promises'); return fs.readFile(p); }:{
  artifacts: { name: string; path: string; sha256?: string }
async function fsProm(p:string){ const fs = await import('fs/promises'); return fs.readFile(p); }[];
  claimSet: any; merkleRoot: string; attestations: any[];
}
async function fsProm(p:string){ const fs = await import('fs/promises'); return fs.readFile(p); }) {
  const outPath = `/tmp/bundle_${Date.now()}
async function fsProm(p:string){ const fs = await import('fs/promises'); return fs.readFile(p); }.zip`;
  const out = createWriteStream(outPath);
  const zip = archiver('zip');
  zip.pipe(out);
  const manifest = { version: '1', merkleRoot, claimSetSummary: { id: claimSet.id, count: (claimSet.claims || []).length }
async function fsProm(p:string){ const fs = await import('fs/promises'); return fs.readFile(p); }, attestations }
async function fsProm(p:string){ const fs = await import('fs/promises'); return fs.readFile(p); };
  zip.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' }
async function fsProm(p:string){ const fs = await import('fs/promises'); return fs.readFile(p); });
  zip.append(JSON.stringify(claimSet, null, 2), { name: 'claimset.json' }
async function fsProm(p:string){ const fs = await import('fs/promises'); return fs.readFile(p); });
  for (const a of artifacts) zip.file(a.path, { name: `artifacts/${a.name}
async function fsProm(p:string){ const fs = await import('fs/promises'); return fs.readFile(p); }` }
async function fsProm(p:string){ const fs = await import('fs/promises'); return fs.readFile(p); });
  await zip.finalize();
  const sha256 = await sha(outPath);
  const worm = (process.env.AUDIT_WORM_ENABLED || 'false').toLowerCase() === 'true';
  const bucket = process.env.AUDIT_BUCKET;
  if (worm && bucket) {
    const key = `disclosures/${new Date().toISOString().slice(0,10)}
async function fsProm(p:string){ const fs = await import('fs/promises'); return fs.readFile(p); }/${sha256}
async function fsProm(p:string){ const fs = await import('fs/promises'); return fs.readFile(p); }.zip`;
    const fs = await import('fs/promises');
    const buf = await fs.readFile(outPath);
    const { putLocked }
async function fsProm(p:string){ const fs = await import('fs/promises'); return fs.readFile(p); } = await import('../audit/worm.js');
    const uri = await putLocked(bucket, key, buf as any);
    return { path: uri, sha256 }
async function fsProm(p:string){ const fs = await import('fs/promises'); return fs.readFile(p); };
  }
async function fsProm(p:string){ const fs = await import('fs/promises'); return fs.readFile(p); }
  return { path: outPath, sha256 }
async function fsProm(p:string){ const fs = await import('fs/promises'); return fs.readFile(p); };
}
async function fsProm(p:string){ const fs = await import('fs/promises'); return fs.readFile(p); }

function sha(p: string) {
  return new Promise<string>((res, rej) => {
    const h = createHash('sha256');
    const s = require('fs').createReadStream(p);
    s.on('data', (d: any) => h.update(d));
    s.on('end', () => res(h.digest('hex')));
    s.on('error', rej);
  }
async function fsProm(p:string){ const fs = await import('fs/promises'); return fs.readFile(p); });
}
async function fsProm(p:string){ const fs = await import('fs/promises'); return fs.readFile(p); }

