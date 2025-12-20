import { createHash, createHmac } from 'crypto';
const SECRET = process.env.PROVENANCE_SECRET || 'dev-secret';
export function createProvenanceRecord(data, algorithm = 'SHA-256', version = '1', timestamp = new Date().toISOString()) {
    const hash = createHash('sha256').update(data).digest('hex');
    const signature = createHmac('sha256', SECRET)
        .update(`${hash}|${algorithm}|${version}|${timestamp}`)
        .digest('hex');
    return { inputHash: hash, algorithm, version, timestamp, signature };
}
//# sourceMappingURL=provenance.js.map