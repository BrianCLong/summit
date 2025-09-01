import fs from 'fs';
import { createHash } from 'crypto';
export function sha256File(p) {
    const data = fs.readFileSync(p);
    const h = createHash('sha256');
    h.update(data);
    return h.digest('hex');
}
//# sourceMappingURL=EvidenceHasher.js.map