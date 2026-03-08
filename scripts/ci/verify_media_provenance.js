"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Media provenance gate enforcement (Media Authenticity & Provenance)
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_child_process_1 = require("node:child_process");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const MEDIA_EXTENSIONS = new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.svg',
    '.tif',
    '.tiff',
    '.mp4',
    '.mov',
    '.webm',
    '.mkv',
]);
const ASSET_ROOTS = [
    'public/',
    'apps/web/public/',
    'client/public/',
    'web/public/',
    'website/public/',
    'docs/marketing/',
    'website/src/app/(marketing)/',
];
function parseArgs() {
    const args = process.argv.slice(2);
    const result = {};
    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        if (arg === '--base') {
            result.baseRef = args[i + 1];
            i += 1;
        }
        if (arg === '--head') {
            result.headRef = args[i + 1];
            i += 1;
        }
    }
    return result;
}
function gitRefExists(ref) {
    try {
        (0, node_child_process_1.execSync)(`git rev-parse --verify ${ref}`, { stdio: 'ignore' });
        return true;
    }
    catch (error) {
        return false;
    }
}
function resolveBaseRef(cliBase) {
    if (cliBase) {
        return cliBase;
    }
    const envBase = process.env.GITHUB_BASE_REF;
    if (envBase) {
        const candidate = `origin/${envBase}`;
        if (gitRefExists(candidate)) {
            return candidate;
        }
    }
    if (gitRefExists('origin/main')) {
        return 'origin/main';
    }
    return 'HEAD~1';
}
function listChangedFiles(baseRef, headRef) {
    const output = (0, node_child_process_1.execSync)(`git diff --name-only --diff-filter=AM ${baseRef}...${headRef}`, { encoding: 'utf8' });
    return output
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line);
}
function isMediaAsset(filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    const extension = node_path_1.default.extname(normalized).toLowerCase();
    if (!MEDIA_EXTENSIONS.has(extension)) {
        return false;
    }
    return ASSET_ROOTS.some((root) => normalized.startsWith(root));
}
function hashFile(filePath) {
    const hash = node_crypto_1.default.createHash('sha256');
    const data = node_fs_1.default.readFileSync(filePath);
    hash.update(data);
    return hash.digest('hex');
}
function loadJson(filePath) {
    return JSON.parse(node_fs_1.default.readFileSync(filePath, 'utf8'));
}
function validateEvidence(mediaPath, evidenceDir) {
    const failures = [];
    const reportPath = node_path_1.default.join(evidenceDir, 'report.json');
    const metricsPath = node_path_1.default.join(evidenceDir, 'metrics.json');
    const stampPath = node_path_1.default.join(evidenceDir, 'stamp.json');
    if (!node_fs_1.default.existsSync(reportPath)) {
        failures.push({
            file: mediaPath,
            message: `Missing report.json at ${node_path_1.default.relative(process.cwd(), reportPath)}`,
        });
    }
    if (!node_fs_1.default.existsSync(metricsPath)) {
        failures.push({
            file: mediaPath,
            message: `Missing metrics.json at ${node_path_1.default.relative(process.cwd(), metricsPath)}`,
        });
    }
    if (!node_fs_1.default.existsSync(stampPath)) {
        failures.push({
            file: mediaPath,
            message: `Missing stamp.json at ${node_path_1.default.relative(process.cwd(), stampPath)}`,
        });
    }
    if (failures.length > 0) {
        return failures;
    }
    const report = loadJson(reportPath);
    const metrics = loadJson(metricsPath);
    const stamp = loadJson(stampPath);
    const expectedHash = hashFile(mediaPath);
    if (report.media?.sha256 !== expectedHash) {
        failures.push({
            file: mediaPath,
            message: 'report.json sha256 does not match asset hash',
        });
    }
    if (!report.schemaVersion) {
        failures.push({
            file: mediaPath,
            message: 'report.json missing schemaVersion',
        });
    }
    if (report.input?.path !== node_path_1.default.relative(process.cwd(), mediaPath)) {
        failures.push({
            file: mediaPath,
            message: 'report.json input.path does not match asset path',
        });
    }
    if (metrics.generatedAt) {
        failures.push({
            file: mediaPath,
            message: 'metrics.json must not include generatedAt (deterministic output)',
        });
    }
    if (report.generatedAt) {
        failures.push({
            file: mediaPath,
            message: 'report.json must not include generatedAt (deterministic output)',
        });
    }
    if (!stamp.generatedAt) {
        failures.push({
            file: mediaPath,
            message: 'stamp.json must include generatedAt timestamp',
        });
    }
    return failures;
}
function main() {
    const args = parseArgs();
    const baseRef = resolveBaseRef(args.baseRef);
    const headRef = args.headRef ?? 'HEAD';
    const changedFiles = listChangedFiles(baseRef, headRef);
    const mediaFiles = changedFiles.filter(isMediaAsset);
    if (mediaFiles.length === 0) {
        console.log('Media provenance gate: no marketing/public media assets changed.');
        return;
    }
    const failures = [];
    for (const file of mediaFiles) {
        const evidenceDir = node_path_1.default.join(process.cwd(), 'evidence', 'media', file);
        failures.push(...validateEvidence(file, evidenceDir));
    }
    if (failures.length > 0) {
        console.error('Media provenance gate failed.');
        failures.forEach((failure) => {
            console.error(`- ${failure.file}: ${failure.message}`);
        });
        process.exit(1);
    }
    console.log('Media provenance gate passed.');
}
main();
