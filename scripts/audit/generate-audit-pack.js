"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const child_process_1 = require("child_process");
const js_yaml_1 = __importDefault(require("js-yaml"));
const ROOT = path_1.default.resolve(__dirname, '..', '..');
const OUTPUT_BASE = path_1.default.join(ROOT, 'audit-packs');
const CONTROL_MAP = path_1.default.join(ROOT, 'audit', 'control-map.yaml');
const EVIDENCE_REGISTRY = path_1.default.join(ROOT, 'audit', 'evidence-registry.yaml');
const EXCEPTIONS = path_1.default.join(ROOT, 'audit', 'exceptions.yaml');
const ADDITIONAL_DOCS = [
    path_1.default.join(ROOT, 'docs', 'audit', 'CONTROL-MAP.md'),
    path_1.default.join(ROOT, 'docs', 'audit', 'EVIDENCE.md'),
    path_1.default.join(ROOT, 'docs', 'audit', 'EXCEPTIONS.md'),
    path_1.default.join(ROOT, 'docs', 'audit', 'AGENT-GOVERNANCE.md'),
    path_1.default.join(ROOT, 'docs', 'audit', 'AUDIT-QUERIES.md'),
];
function loadYaml(file) {
    const raw = fs_1.default.readFileSync(file, 'utf-8');
    return js_yaml_1.default.load(raw);
}
function sha256(file) {
    const hash = crypto_1.default.createHash('sha256');
    hash.update(fs_1.default.readFileSync(file));
    return hash.digest('hex');
}
function timestampFolder() {
    const iso = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    return path_1.default.join(OUTPUT_BASE, iso);
}
function ensureDir(dir) {
    fs_1.default.mkdirSync(dir, { recursive: true });
}
function copyIfExists(source, targetDir, artifacts) {
    if (!fs_1.default.existsSync(source))
        return;
    const target = path_1.default.join(targetDir, path_1.default.basename(source));
    fs_1.default.cpSync(source, target, { recursive: true });
    artifacts.push({ source: path_1.default.relative(ROOT, source), target: path_1.default.relative(ROOT, target), hash: sha256(source) });
}
function gitHistory(limit = 25) {
    try {
        return (0, child_process_1.execSync)(`git log -n ${limit} --pretty=format:%h|%ad|%an|%s --date=iso`, { cwd: ROOT }).toString();
    }
    catch (error) {
        return 'git log unavailable';
    }
}
function gatherEvidenceCopies(evidence, outputDir, artifacts) {
    evidence.forEach((entry) => {
        const candidate = path_1.default.join(ROOT, entry.artifact_path);
        if (fs_1.default.existsSync(candidate)) {
            const destination = path_1.default.join(outputDir, path_1.default.basename(candidate));
            fs_1.default.cpSync(candidate, destination, { recursive: true });
            const hash = fs_1.default.statSync(candidate).isFile() ? sha256(candidate) : 'directory';
            artifacts.push({
                evidence_id: entry.id,
                source: path_1.default.relative(ROOT, candidate),
                target: path_1.default.relative(ROOT, destination),
                hash,
                integrity: entry.integrity,
            });
        }
    });
}
function main() {
    const outDir = timestampFolder();
    ensureDir(outDir);
    const controlMap = loadYaml(CONTROL_MAP);
    const evidenceRegistry = loadYaml(EVIDENCE_REGISTRY);
    const exceptions = loadYaml(EXCEPTIONS);
    const artifacts = [];
    [CONTROL_MAP, EVIDENCE_REGISTRY, EXCEPTIONS, ...ADDITIONAL_DOCS].forEach((file) => copyIfExists(file, outDir, artifacts));
    gatherEvidenceCopies(evidenceRegistry.evidence, outDir, artifacts);
    const manifest = {
        generatedAt: new Date().toISOString(),
        outputDir: path_1.default.relative(ROOT, outDir),
        controls: controlMap.controls,
        evidenceRegistry: evidenceRegistry.evidence,
        exceptions: exceptions.exceptions,
        changeHistory: gitHistory(30).split('\n'),
        artifacts,
    };
    fs_1.default.writeFileSync(path_1.default.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(`Audit pack generated at ${path_1.default.relative(ROOT, outDir)}`);
}
if (require.main === module) {
    main();
}
