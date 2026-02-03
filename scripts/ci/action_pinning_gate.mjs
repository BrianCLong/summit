
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function auditActionPinning(targetDir = process.cwd(), opts = {}) {
    const WORKFLOWS_DIR = join(targetDir, '.github/workflows');
    if (!existsSync(WORKFLOWS_DIR)) return true;
    const files = readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
    let violations = [];
    files.forEach(file => {
        try {
            const content = readFileSync(join(WORKFLOWS_DIR, file), 'utf8');
            content.split('\n').forEach((line, i) => {
                const trim = line.trim();
                if (trim.startsWith('uses:') && trim.includes('@') && !trim.includes('./') && !trim.includes('.github/')) {
                    const ref = trim.split('@')[1].split(' ')[0].trim();
                    if (!/^[a-f0-9]{40}$/.test(ref)) violations.push({ file, line: i + 1, action: trim });
                }
            });
        } catch (e) { }
    });
    if (violations.length > 0) {
        console.error('❌ Action Pinning Violations:');
        violations.forEach(v => console.error(`   - [${v.file}:${v.line}] ${v.action}`));
        return false;
    }
    return true;
}
