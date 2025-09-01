import { createHash } from 'crypto';
import fs from 'fs';
export function verifyWeights(path, expectedSha256) {
    const buf = fs.readFileSync(path);
    const sha = createHash('sha256').update(buf).digest('hex');
    if (sha !== expectedSha256) {
        throw new Error('weights_checksum_mismatch');
    }
    return JSON.parse(buf.toString());
}
//# sourceMappingURL=WeightsVerifier.js.map