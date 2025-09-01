import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
const ALLOWED = ['text/plain', 'application/json'];
const LIMIT = 5 * 1024 * 1024; // 5MB
const VAULT = path.join(process.cwd(), 'uploads', 'evidence');
export function store(id, name, mime, data) {
    if (!ALLOWED.includes(mime))
        throw new Error('mime_not_allowed');
    if (data.length > LIMIT)
        throw new Error('too_large');
    if (!fs.existsSync(VAULT))
        fs.mkdirSync(VAULT, { recursive: true });
    const file = path.join(VAULT, id);
    fs.writeFileSync(file, data);
    const sha256 = createHash('sha256').update(data).digest('hex');
    return { id, name, mime, sha256, size: data.length };
}
export function retrieve(id) {
    return fs.readFileSync(path.join(VAULT, id));
}
//# sourceMappingURL=EvidenceVault.js.map