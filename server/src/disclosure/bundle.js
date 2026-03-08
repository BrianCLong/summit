"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeBundle = makeBundle;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const archiver_1 = __importDefault(require("archiver"));
async function makeBundle({ artifacts, claimSet, merkleRoot, attestations, format, checksums, }) {
    const outPath = `/tmp/bundle_${Date.now()}.zip`;
    const out = (0, fs_1.createWriteStream)(outPath);
    const zip = (0, archiver_1.default)('zip');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    return { path: outPath, sha256 };
}
function sha(p) {
    return new Promise((resolve, reject) => {
        const hash = (0, crypto_1.createHash)('sha256');
        const stream = require('fs').createReadStream(p);
        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}
