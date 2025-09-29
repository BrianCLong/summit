import { defineTask } from '@summit/maestro-sdk';
import fs from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';
import { sha256 } from '../util/hash.js';

interface In { files: string[]; outPath: string }
interface ManifestEntry { path: string; sha256: string }

export default defineTask<In, { bundle: string; manifest: ManifestEntry[] }> ({
  async execute(_ctx, { payload }){
    const manifest: ManifestEntry[] = payload.files.map(p => ({ path: p, sha256: sha256(fs.readFileSync(p)) }));
    const out = fs.createWriteStream(payload.outPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(out);
    for (const f of payload.files) archive.file(f, { name: path.basename(f) });
    archive.append(JSON.stringify({ generatedAt: new Date().toISOString(), files: manifest }, null, 2), { name: 'manifest.json' });
    await archive.finalize();
    return { payload: { bundle: payload.outPath, manifest } };
  }
});
