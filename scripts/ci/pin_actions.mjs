
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const ALIASES = {
    'anchore/syft-action': 'anchore/sbom-action',
    'anchore/grype-action': 'anchore/scan-action',
    'slsa-framework/slsa-verifier-action': 'slsa-framework/slsa-verifier'
};

const shaCache = new Map();

async function resolveSha(action, ref) {
    let repo = action.split('/').slice(0, 2).join('/');
    if (ALIASES[repo]) repo = ALIASES[repo];

    const key = `${repo}@${ref}`;
    if (shaCache.has(key)) return shaCache.get(key);
    try {
        const url = `https://github.com/${repo}.git`;
        const output = execSync(`git ls-remote ${url} ${ref}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        const match = output.match(/^([a-f0-9]{40})\t/);
        if (match) {
            shaCache.set(key, match[1]);
            return match[1];
        }
    } catch (e) { }
    return null;
}

async function run() {
    const workflowDir = '.github/workflows';
    const files = readdirSync(workflowDir, { recursive: true })
        .filter(f => typeof f === 'string' && (f.endsWith('.yml') || f.endsWith('.yaml')))
        .map(f => join(workflowDir, f));

    for (const filePath of files) {
        let content = readFileSync(filePath, 'utf8');
        let lines = content.split('\n');
        let modified = false;

        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(/uses:\s*([^\s@]+)@([^\s#]+)/);
            if (match && !lines[i].includes('./') && !lines[i].includes('.github/')) {
                const action = match[1], ref = match[2];
                if (!/^[a-f0-9]{40}$/.test(ref)) {
                    const sha = await resolveSha(action, ref);
                    if (sha) {
                        lines[i] = lines[i].replace(`${action}@${ref}`, `${action}@${sha} # ${ref}`);
                        modified = true;
                    }
                }
            }
        }
        if (modified) {
            writeFileSync(filePath, lines.join('\n'));
            console.log(`✅ Fixed pinning in ${filePath}`);
        }
    }
}
run();
