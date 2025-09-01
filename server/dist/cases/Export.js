import fs from 'fs';
import path from 'path';
export function exportCase(c, dir) {
    const manifest = c.evidence.map(e => ({ id: e.id, sha256: e.sha256 }));
    const out = {
        id: c.id,
        title: c.title,
        status: c.status,
        timeline: [],
        evidence: manifest
    };
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${c.id}.json`), JSON.stringify(out, null, 2));
    // TODO: generate PDF report
}
//# sourceMappingURL=Export.js.map