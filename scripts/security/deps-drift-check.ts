import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const EVIDENCE_BASE_DIR = path.join(ROOT_DIR, 'evidence/deps');

console.log('🔍 Checking for Dependency Drift...');

// 1. Find latest evidence pack
if (!fs.existsSync(EVIDENCE_BASE_DIR)) {
    console.error('❌ No evidence packs found. Run "pnpm security:deps-report" to baseline.');
    process.exit(1);
}

const packs = fs.readdirSync(EVIDENCE_BASE_DIR)
    .filter(f => fs.statSync(path.join(EVIDENCE_BASE_DIR, f)).isDirectory())
    .sort()
    .reverse();

if (packs.length === 0) {
    console.error('❌ No evidence packs found.');
    process.exit(1);
}

const latestPack = packs[0];
const latestStatePath = path.join(EVIDENCE_BASE_DIR, latestPack, 'state.json');

if (!fs.existsSync(latestStatePath)) {
    console.error(`❌ Corrupt evidence pack: ${latestPack} missing state.json`);
    process.exit(1);
}

const baselineState = JSON.parse(fs.readFileSync(latestStatePath, 'utf8'));

// 2. Compute current state
const computeHash = (filepath) => {
    if (!fs.existsSync(filepath)) return null;
    return execSync(`shasum -a 256 ${filepath} | cut -d' ' -f1`, { encoding: 'utf8' }).trim();
};

const currentState = {
    'package.json': computeHash(path.join(ROOT_DIR, 'package.json')),
    'pnpm-lock.yaml': computeHash(path.join(ROOT_DIR, 'pnpm-lock.yaml')),
    'pnpm-workspace.yaml': computeHash(path.join(ROOT_DIR, 'pnpm-workspace.yaml')),
};

// 3. Compare
let drift = false;
for (const [file, hash] of Object.entries(baselineState)) {
    if (currentState[file] !== hash) {
        console.error(`⚠️  Drift detected: ${file} has changed since ${latestPack}`);
        drift = true;
    }
}

if (drift) {
    console.error('\n❌ Dependency surface changed without evidence.');
    console.error('👉 Run "pnpm security:deps-report" to verify and snapshot the new state.');
    process.exit(1);
}

console.log(`✅ No drift detected (compared to ${latestPack}).`);
