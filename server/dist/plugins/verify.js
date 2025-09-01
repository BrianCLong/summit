import fs from 'fs';
import { createHash } from 'crypto';
export async function verifySignature(manifest, filePath) {
    if (!manifest.signature || !manifest.sbomDigest) {
        throw new Error('unsigned plugin');
    }
    const buf = fs.readFileSync(filePath);
    const digest = createHash('sha256').update(buf).digest('hex');
    if (digest !== manifest.sbomDigest) {
        throw new Error('sbom mismatch');
    }
}
//# sourceMappingURL=verify.js.map