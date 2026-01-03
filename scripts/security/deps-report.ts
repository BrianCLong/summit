import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const EVIDENCE_BASE_DIR = path.join(ROOT_DIR, 'evidence/deps');

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const REPORT_DIR = path.join(EVIDENCE_BASE_DIR, timestamp);

// Ensure directories exist
if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
}

console.log(`🛡️  Generating Security Dependency Report at: ${REPORT_DIR}`);

// 1. Capture Environment
console.log('   Captured Environment...');
const envData = {
    node: process.version,
    pnpm: execSync('pnpm -v', { encoding: 'utf8' }).trim(),
    os: process.platform,
    gitSha: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
    generatedAt: new Date().toISOString()
};
fs.writeFileSync(path.join(REPORT_DIR, 'environment.json'), JSON.stringify(envData, null, 2));

// 2. Capture Package/Lock State (Hashes)
console.log('   Hashing Lockfiles...');
const computeHash = (filepath) => {
    if (!fs.existsSync(filepath)) return null;
    return execSync(`shasum -a 256 ${filepath} | cut -d' ' -f1`, { encoding: 'utf8' }).trim();
};

const lockState = {
    'package.json': computeHash(path.join(ROOT_DIR, 'package.json')),
    'pnpm-lock.yaml': computeHash(path.join(ROOT_DIR, 'pnpm-lock.yaml')),
    'pnpm-workspace.yaml': computeHash(path.join(ROOT_DIR, 'pnpm-workspace.yaml')),
};
fs.writeFileSync(path.join(REPORT_DIR, 'state.json'), JSON.stringify(lockState, null, 2));

// 3. Best-Effort Audit (Non-blocking)
if (process.argv.includes('--fast')) {
    console.log('   (Skipping Audit in lazy mode)');
    fs.writeFileSync(path.join(REPORT_DIR, 'audit.json'), JSON.stringify({ skipped: true }));
} else {
    console.log('   Running Validation (Audit/Outdated)...');
    try {
        // Timeout after 5 minutes
        const auditOutput = execSync('pnpm audit --json --audit-level=moderate', {
            cwd: ROOT_DIR,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
            timeout: 300000
        });
        fs.writeFileSync(path.join(REPORT_DIR, 'audit.json'), auditOutput);
    } catch (e) {
        // pnpm audit exits with error code on vulnerabilities
        if (e.stdout) {
            fs.writeFileSync(path.join(REPORT_DIR, 'audit.json'), e.stdout);
            console.log('   (Audit found issues - captured in audit.json)');
        } else {
            const msg = e.code === 'ETIMEDOUT' ? 'Audit timed out' : e.message;
            fs.writeFileSync(path.join(REPORT_DIR, 'audit-error.log'), msg);
            console.log(`   (Audit failed: ${msg})`);
        }
    }
}

// 4. Outdated
try {
    const outdatedOutput = execSync('pnpm outdated --json', { cwd: ROOT_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    fs.writeFileSync(path.join(REPORT_DIR, 'outdated.json'), outdatedOutput);
} catch (e) {
    // pnpm outdated exit code 1 means outdated packages found
    if (e.stdout) {
        fs.writeFileSync(path.join(REPORT_DIR, 'outdated.json'), e.stdout);
    } else {
        console.log('   (Outdated check failed or empty)');
    }
}

// 5. Overrides Capture
try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
    const overrides = pkg.pnpm?.overrides || {};
    fs.writeFileSync(path.join(REPORT_DIR, 'overrides.json'), JSON.stringify(overrides, null, 2));
} catch (e) {
    console.log('   (Failed to capture overrides)');
}

// 6. Generate Human Index
const indexContent = `# Dependency Security Report
**Date:** ${envData.generatedAt}
**Commit:** ${envData.gitSha}

## Environment
- Node: ${envData.node}
- Pnpm: ${envData.pnpm}

## Artifacts
- [Audit (JSON)](./audit.json)
- [Outdated (JSON)](./outdated.json)
- [Overrides (JSON)](./overrides.json)
- [State Hashes](./state.json)

## Actions
Run \`pnpm audit --fix\` to address actionable vulnerabilities.
Check \`overrides.json\` for active security pins.
`;

fs.writeFileSync(path.join(REPORT_DIR, 'INDEX.md'), indexContent);

console.log('✅ Evidence Pack Generated.');
