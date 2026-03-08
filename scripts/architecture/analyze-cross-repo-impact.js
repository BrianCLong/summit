"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const js_yaml_1 = __importDefault(require("js-yaml"));
const currentRepoName = process.env.CROSS_REPO_THIS_REPO ?? 'intelgraph-platform';
const __dirname = path_1.default.dirname(new URL(import.meta.url).pathname);
const repoRoot = path_1.default.resolve(path_1.default.join(__dirname, '..', '..'));
function loadCrossRepoMap() {
    const mapPath = path_1.default.join(repoRoot, 'governance', 'cross-repo-map.yml');
    if (!fs_1.default.existsSync(mapPath)) {
        throw new Error('Missing governance/cross-repo-map.yml');
    }
    const file = fs_1.default.readFileSync(mapPath, 'utf8');
    const parsed = js_yaml_1.default.load(file);
    if (!Array.isArray(parsed)) {
        throw new Error('cross-repo-map.yml must be a YAML list');
    }
    return parsed;
}
function loadExportedInterfaces() {
    const manifestPath = path_1.default.join(repoRoot, 'governance', 'exported-interfaces.json');
    if (!fs_1.default.existsSync(manifestPath)) {
        return [];
    }
    const parsed = JSON.parse(fs_1.default.readFileSync(manifestPath, 'utf8'));
    return parsed.publicInterfaces ?? [];
}
function runGit(command) {
    try {
        return (0, child_process_1.execSync)(`git ${command}`, { cwd: repoRoot, encoding: 'utf8' }).trim();
    }
    catch (error) {
        return '';
    }
}
function getChangedFiles(baseRef) {
    const base = baseRef ?? 'origin/main';
    const diffCommands = [
        `diff --name-only ${base}...HEAD`,
        'diff --name-only',
    ];
    for (const cmd of diffCommands) {
        const result = runGit(cmd);
        if (result) {
            return result.split('\n').filter(Boolean);
        }
    }
    return [];
}
function inferSurfaceType(filePath) {
    if (filePath.includes('graphql') || filePath.includes('openapi') || filePath.includes('services/api')) {
        return 'API';
    }
    if (filePath.includes('schema') || filePath.includes('contract') || filePath.includes('policy')) {
        return 'schema';
    }
    if (filePath.includes('packages/') || filePath.includes('lib/') || filePath.includes('sdk/')) {
        return 'library';
    }
    return 'docs';
}
function isPotentiallyBreaking(filePath) {
    const lower = filePath.toLowerCase();
    return lower.includes('schema') || lower.includes('openapi') || lower.includes('graphql');
}
function findMatchingInterfaces(changedFiles, interfaces) {
    return interfaces.filter((entry) => changedFiles.some((file) => file.startsWith(entry.path) || file === entry.path));
}
function analyzeImpacts(changedFiles, map, interfaces) {
    const impacted = [];
    const matchingInterfaces = findMatchingInterfaces(changedFiles, interfaces);
    const inferredTypes = new Set(changedFiles.map(inferSurfaceType).map((type) => type.toLowerCase()));
    const dependents = map.filter((entry) => entry.dependencies?.some((dep) => dep.target_repo === currentRepoName));
    for (const dependent of dependents) {
        const relevantDeps = dependent.dependencies?.filter((dep) => dep.target_repo === currentRepoName) ?? [];
        for (const dep of relevantDeps) {
            const affectedSurfaces = matchingInterfaces.filter((iface) => iface.type.toLowerCase() === dep.dependency_type.toLowerCase());
            const inferredMatch = inferredTypes.has(dep.dependency_type.toLowerCase());
            const surfaceHint = affectedSurfaces.map((iface) => iface.name).join(', ');
            const risk = affectedSurfaces.length > 0 || inferredMatch || dep.dependency_type === 'API'
                ? 'high'
                : 'medium';
            const notes = [];
            if (affectedSurfaces.length === 0) {
                notes.push('No declared public interface touched; treat as advisory.');
            }
            if (inferredMatch && affectedSurfaces.length === 0) {
                notes.push(`Heuristic match: files suggest ${dep.dependency_type} surface changed.`);
            }
            const breakingHints = changedFiles.filter(isPotentiallyBreaking);
            if (breakingHints.length > 0 && dep.dependency_type !== 'library') {
                notes.push(`Potential breaking change detected in ${breakingHints.join(', ')}`);
            }
            if (surfaceHint) {
                notes.push(`Interfaces impacted: ${surfaceHint}`);
            }
            notes.push(`Suggested action: bump according to ${dep.versioning_strategy} in ${dependent.repo_name}.`);
            impacted.push({
                repo: dependent.repo_name,
                dependencyType: dep.dependency_type,
                versioningStrategy: dep.versioning_strategy,
                risk,
                notes,
            });
        }
    }
    return impacted;
}
function formatOutput(changedFiles, impacts, baseRef) {
    const lines = [];
    lines.push('Cross-repo impact analysis');
    lines.push(`Base ref: ${baseRef ?? 'origin/main'}`);
    lines.push('');
    lines.push('Changed files:');
    lines.push(changedFiles.length > 0 ? changedFiles.map((f) => `- ${f}`).join('\n') : '- None detected');
    lines.push('');
    if (impacts.length === 0) {
        lines.push('No dependent repos flagged from cross-repo map.');
        return lines.join('\n');
    }
    lines.push('Impacted repos:');
    for (const impact of impacts) {
        lines.push(`- ${impact.repo} (type: ${impact.dependencyType}, risk: ${impact.risk})`);
        for (const note of impact.notes) {
            lines.push(`  - ${note}`);
        }
    }
    return lines.join('\n');
}
function main() {
    const baseArg = process.argv.find((arg) => arg.startsWith('--base-ref='));
    const baseRef = baseArg ? baseArg.split('=')[1] : undefined;
    const map = loadCrossRepoMap();
    const interfaces = loadExportedInterfaces();
    const changedFiles = getChangedFiles(baseRef);
    const impacts = analyzeImpacts(changedFiles, map, interfaces);
    const output = formatOutput(changedFiles, impacts, baseRef);
    console.log(output);
}
main();
