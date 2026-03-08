"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const yaml_1 = __importDefault(require("yaml"));
const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
const __dirname = node_path_1.default.dirname(__filename);
const repoRoot = node_path_1.default.resolve(__dirname, '..');
const artifactDir = node_path_1.default.join(repoRoot, 'artifacts');
const artifactPath = node_path_1.default.join(artifactDir, 'ga-gate-report.json');
const SKIP_DIRECTORIES = new Set([
    'node_modules',
    '.git',
    '.turbo',
    'dist',
    'build',
    'coverage',
    'artifacts',
    '.next',
    '.cache',
    'tmp',
    'venv',
]);
async function loadConfig() {
    const configPath = node_path_1.default.join(repoRoot, 'release', 'ga-gate.yaml');
    const raw = await node_fs_1.promises.readFile(configPath, 'utf8');
    const parsed = yaml_1.default.parse(raw);
    return parsed;
}
function formatStatus(status) {
    switch (status) {
        case 'pass':
            return 'PASS';
        case 'fail':
            return 'FAIL';
        case 'manual':
            return 'MANUAL';
        default:
            return status.toUpperCase();
    }
}
function isCIContext() {
    return process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
}
async function checkStaticStrict(tsconfigPath) {
    const fullPath = node_path_1.default.join(repoRoot, tsconfigPath);
    try {
        const content = await node_fs_1.promises.readFile(fullPath, 'utf8');
        const parsed = JSON.parse(content);
        const strictEnabled = parsed?.compilerOptions?.strict === true;
        return {
            id: 'typescript_strict',
            status: strictEnabled ? 'pass' : 'fail',
            details: strictEnabled
                ? 'TypeScript strict mode is enabled.'
                : 'TypeScript strict mode is not enabled in tsconfig.',
        };
    }
    catch (error) {
        return {
            id: 'typescript_strict',
            status: 'fail',
            details: `Failed to read tsconfig: ${error.message}`,
        };
    }
}
async function checkGithub(id, description) {
    const inCI = isCIContext();
    return {
        id,
        status: inCI ? 'pass' : 'fail',
        description,
        details: inCI
            ? 'Detected CI environment; assuming required workflows enforced.'
            : 'Not running in CI; cannot verify status checks.',
    };
}
async function hasAuditLogging(targetPath) {
    const absolute = node_path_1.default.join(repoRoot, targetPath);
    const queue = [absolute];
    while (queue.length > 0) {
        const current = queue.pop();
        if (!current)
            continue;
        const stats = await node_fs_1.promises.stat(current).catch(() => null);
        if (!stats)
            continue;
        if (stats.isDirectory()) {
            const entries = await node_fs_1.promises.readdir(current);
            for (const entry of entries) {
                if (SKIP_DIRECTORIES.has(entry))
                    continue;
                queue.push(node_path_1.default.join(current, entry));
            }
        }
        else {
            const lowerName = node_path_1.default.basename(current).toLowerCase();
            if (lowerName.includes('audit')) {
                return true;
            }
            const content = await node_fs_1.promises.readFile(current, 'utf8');
            if (/audit\s*log/i.test(content)) {
                return true;
            }
        }
    }
    return false;
}
async function checkCode(check) {
    if (!check.path) {
        return { id: check.id, status: 'fail', description: check.description, details: 'Missing path for code check.' };
    }
    const auditFound = await hasAuditLogging(check.path);
    return {
        id: check.id,
        status: auditFound ? 'pass' : 'fail',
        description: check.description,
        details: auditFound
            ? 'Audit logging constructs detected.'
            : `No audit logging references found under ${check.path}.`,
    };
}
async function checkFilesystem(check) {
    if (!check.paths || check.paths.length === 0) {
        return { id: check.id, status: 'fail', description: check.description, details: 'No paths provided for filesystem check.' };
    }
    const missing = [];
    for (const rel of check.paths) {
        const target = node_path_1.default.join(repoRoot, rel);
        try {
            await node_fs_1.promises.access(target);
        }
        catch (error) {
            missing.push(`${rel} (${error.message})`);
        }
    }
    return {
        id: check.id,
        status: missing.length === 0 ? 'pass' : 'fail',
        description: check.description,
        details: missing.length === 0 ? 'All required paths present.' : `Missing paths: ${missing.join(', ')}`,
    };
}
function hasTrackingReference(line) {
    return /#\d+/.test(line) || /tracking\s*issue/i.test(line) || /issue:\s*[A-Za-z0-9_-]+/.test(line);
}
async function walkFiles(startPaths, visitor) {
    const queue = startPaths.map((p) => node_path_1.default.join(repoRoot, p));
    while (queue.length > 0) {
        const current = queue.pop();
        if (!current)
            continue;
        const stats = await node_fs_1.promises.stat(current).catch(() => null);
        if (!stats)
            continue;
        if (stats.isDirectory()) {
            const base = node_path_1.default.basename(current);
            if (SKIP_DIRECTORIES.has(base)) {
                continue;
            }
            const entries = await node_fs_1.promises.readdir(current);
            for (const entry of entries) {
                queue.push(node_path_1.default.join(current, entry));
            }
        }
        else {
            await visitor(current);
        }
    }
}
async function checkPattern(check) {
    if (!check.paths || !check.pattern) {
        return { id: check.id, status: 'fail', description: check.description, details: 'Pattern or paths missing.' };
    }
    const pattern = new RegExp(check.pattern);
    const violations = [];
    await walkFiles(check.paths, async (filePath) => {
        if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && !filePath.endsWith('.js')) {
            return;
        }
        const content = await node_fs_1.promises.readFile(filePath, 'utf8').catch(() => '');
        if (!content)
            return;
        const lines = content.split(/\r?\n/);
        lines.forEach((line, index) => {
            if (pattern.test(line)) {
                if (check.require_issue_reference && !hasTrackingReference(line)) {
                    violations.push(`${node_path_1.default.relative(repoRoot, filePath)}:${index + 1}`);
                }
            }
        });
    });
    return {
        id: check.id,
        status: violations.length === 0 ? 'pass' : 'fail',
        description: check.description,
        details: violations.length === 0 ? 'No untracked @ts-ignore directives found.' : `Tracking issue missing at ${violations.join(', ')}`,
    };
}
async function evaluateCheck(check) {
    switch (check.type) {
        case 'github':
            return checkGithub(check.id, check.description);
        case 'static':
            return checkStaticStrict(check.path ?? '');
        case 'code':
            return checkCode(check);
        case 'filesystem':
            return checkFilesystem(check);
        case 'pattern':
            return checkPattern(check);
        case 'manual':
            return { id: check.id, status: 'manual', description: check.description, details: 'Manual verification required.' };
        default:
            return { id: check.id, status: 'fail', description: check.description, details: `Unsupported check type ${check.type}` };
    }
}
async function writeArtifact(results, gate) {
    await node_fs_1.promises.mkdir(artifactDir, { recursive: true });
    const payload = {
        gate,
        timestamp: new Date().toISOString(),
        overall: results.every((r) => r.status !== 'fail') ? 'pass' : 'fail',
        results,
    };
    await node_fs_1.promises.writeFile(artifactPath, JSON.stringify(payload, null, 2));
}
function printSummary(config, results) {
    console.log(`\nGA Gate: ${config.gate.name} v${config.gate.version}`);
    console.log('-------------------------------------------');
    results.forEach((result) => {
        const status = formatStatus(result.status);
        console.log(`${status.padEnd(7)} ${result.id}${result.description ? ` - ${result.description}` : ''}`);
        if (result.details) {
            console.log(`         ${result.details}`);
        }
    });
    const overallPass = results.every((r) => r.status !== 'fail');
    console.log('\nOverall:', overallPass ? 'PASS' : 'FAIL');
}
async function run() {
    const config = await loadConfig();
    const results = [];
    for (const check of config.checks) {
        const result = await evaluateCheck(check);
        results.push(result);
    }
    await writeArtifact(results, config.gate);
    printSummary(config, results);
    const hasFailure = results.some((r) => r.status === 'fail');
    if (hasFailure) {
        process.exitCode = 1;
    }
}
run().catch((error) => {
    console.error('GA gate execution failed:', error);
    process.exitCode = 1;
});
