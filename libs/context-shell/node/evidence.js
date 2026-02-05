import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import path from 'path';
export function createEvidenceWriter(options) {
    const evidenceDir = path.resolve(options.root, 'evidence', 'context-shell');
    const fileName = options.fileName ?? 'context-shell-events.jsonl';
    const outputPath = path.join(evidenceDir, fileName);
    return {
        async write(event) {
            await fs.mkdir(evidenceDir, { recursive: true });
            const payload = `${JSON.stringify(event)}\n`;
            await fs.appendFile(outputPath, payload, 'utf8');
        },
    };
}
export function hashPayload(payload) {
    return createHash('sha256').update(payload).digest('hex');
}
//# sourceMappingURL=evidence.js.map