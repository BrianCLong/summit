
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const DEFAULT_RETENTION = 14;
const MAX_RETENTION = 90;
function run() {
    const files = readdirSync('.github/workflows').filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
    files.forEach(file => {
        const filePath = join('.github/workflows', file);
        let lines = readFileSync(filePath, 'utf8').split('\n');
        let modified = false;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('uses: actions/upload-artifact')) {
                let usesLine = lines[i];
                let stepIndent = usesLine.match(/^(\s*)/)[0];
                let j = i + 1, hasWith = false, hasRetention = false, withIdx = -1;
                while (j < lines.length) {
                    let nextL = lines[j].trim();
                    if (nextL.startsWith('- ') || (nextL !== '' && !lines[j].startsWith(stepIndent) && !nextL.startsWith('#'))) break;
                    if (nextL.startsWith('with:')) { hasWith = true; withIdx = j; }
                    if (nextL.startsWith('retention-days:')) {
                        hasRetention = true;
                        const match = lines[j].match(/retention-days:\s*(\d+)/);
                        if (match && parseInt(match[1]) > MAX_RETENTION) { lines[j] = lines[j].replace(match[1], MAX_RETENTION.toString()); modified = true; }
                    }
                    j++;
                }
                if (!hasRetention) {
                    if (hasWith) {
                        const withIndent = lines[withIdx].match(/^(\s*)/)[0];
                        lines.splice(withIdx + 1, 0, `${withIndent}  retention-days: ${DEFAULT_RETENTION}`);
                    } else {
                        // Correctly align 'with:' with 'uses:'
                        lines.splice(i + 1, 0, `${stepIndent}with:`, `${stepIndent}  retention-days: ${DEFAULT_RETENTION}`);
                    }
                    modified = true;
                }
            }
        }
        if (modified) { writeFileSync(filePath, lines.join('\n')); console.log(`✅ Fixed retention in ${file}`); }
    });
}
run();
