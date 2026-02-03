import { createHash } from 'crypto';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface Match {
    rfpId: string;
    vendorId: string;
    score: number;
}

// Mock data generation for MWS
const match: Match = {
    rfpId: 'rfp-123',
    vendorId: 'vendor-456',
    score: 95.5
};

const artifact = {
    match,
    recommendation: 'AWARD',
    justification: 'Highest score and compliance verified.'
};

// Stable stringify manually to ensure determinism (sorting keys)
function stableStringify(obj: any): string {
    if (typeof obj !== 'object' || obj === null) {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return '[' + obj.map(stableStringify).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

const content = stableStringify(artifact);
const hash = createHash('sha256').update(content).digest('hex');

const output = {
    meta: {
        generatedAt: new Date().toISOString(),
        version: '1.0'
    },
    artifact,
    signature: {
        hash,
        algo: 'sha256'
    }
};

const outDir = 'artifacts/factgov';
mkdirSync(outDir, { recursive: true });
const outfile = join(outDir, `award_${hash}.json`);
writeFileSync(outfile, JSON.stringify(output, null, 2));
console.log(`Generated artifact: ${outfile}`);
