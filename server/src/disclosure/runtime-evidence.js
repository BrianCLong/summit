"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtimeEvidenceService = void 0;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const fs_2 = require("fs");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const archiver_1 = __importDefault(require("archiver"));
const DEFAULT_AUDIT_PATHS = [
    'logs/audit-events.jsonl',
    'logs/audit.jsonl',
    'server/logs/audit-events.jsonl',
    'audit-events.jsonl',
];
const DEFAULT_POLICY_PATHS = [
    'logs/policy-decisions.jsonl',
    'logs/governance.jsonl',
    'logs/policy/decisions.jsonl',
];
const DEFAULT_SBOM_PATHS = [
    'sbom-mc-v0.4.5.json',
    'release/sbom.json',
    'release/sbom-latest.json',
];
const DEFAULT_PROVENANCE_PATHS = [
    'provenance/export-manifest.json',
    'provenance/bundle-summary.md',
    'prov-ledger/manifest.json',
];
async function resolveDeployedVersion() {
    const envVersion = process.env.DEPLOYED_VERSION ||
        process.env.RELEASE_VERSION ||
        process.env.BUILD_VERSION;
    if (envVersion)
        return envVersion;
    try {
        const pkgPath = path_1.default.resolve('package.json');
        const pkg = JSON.parse(String(await fs_1.promises.readFile(pkgPath, 'utf8')));
        return typeof pkg.version === 'string' ? pkg.version : undefined;
    }
    catch (error) {
        return undefined;
    }
}
function parseDate(input) {
    if (!input)
        return undefined;
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) {
        throw new Error('invalid_date');
    }
    return date;
}
function findTimestamp(value) {
    if (!value || typeof value !== 'object')
        return undefined;
    const record = value;
    const candidates = [
        record.timestamp,
        record.ts,
        record.created_at,
        record.createdAt,
        record.occurred_at,
    ];
    for (const candidate of candidates) {
        if (!candidate)
            continue;
        const date = new Date(candidate);
        const ms = date.getTime();
        if (!Number.isNaN(ms))
            return ms;
    }
    return undefined;
}
function matchesTenant(entry, tenantId) {
    if (!tenantId)
        return true;
    if (!entry || typeof entry !== 'object')
        return false;
    const record = entry;
    const candidates = [record.tenantId, record.tenant_id, record.tenant];
    return candidates.some((value) => value && value === tenantId);
}
async function ensureDir(dir) {
    await fs_1.promises.mkdir(dir, { recursive: true });
}
async function collectJsonlSlice({ sources, destination, startTime, endTime, tenantId, }) {
    const warnings = [];
    let count = 0;
    await fs_1.promises.writeFile(destination, '');
    for (const source of sources) {
        const absolute = path_1.default.resolve(source);
        const exists = await fs_1.promises
            .access(absolute)
            .then(() => true)
            .catch(() => false);
        if (!exists) {
            warnings.push(`missing:${source}`);
            continue;
        }
        const content = String(await fs_1.promises.readFile(absolute, 'utf8'));
        const lines = content
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
        const filtered = [];
        for (const line of lines) {
            try {
                const parsed = JSON.parse(line);
                const ts = findTimestamp(parsed);
                if (startTime && (!ts || ts < startTime.getTime()))
                    continue;
                if (endTime && (!ts || ts > endTime.getTime()))
                    continue;
                if (!matchesTenant(parsed, tenantId))
                    continue;
                filtered.push(JSON.stringify(parsed));
                count += 1;
            }
            catch (error) {
                warnings.push(`parse_error:${source}`);
            }
        }
        if (filtered.length > 0) {
            await fs_1.promises.appendFile(destination, filtered.join('\n') + '\n');
        }
    }
    return { count, warnings };
}
async function copyArtifacts(sources, destinationDir) {
    const copied = [];
    const warnings = [];
    for (const source of sources) {
        const absolute = path_1.default.resolve(source);
        const exists = await fs_1.promises
            .access(absolute)
            .then(() => true)
            .catch(() => false);
        if (!exists) {
            warnings.push(`missing:${source}`);
            continue;
        }
        const target = path_1.default.join(destinationDir, path_1.default.basename(source));
        await fs_1.promises.copyFile(absolute, target);
        copied.push(target);
    }
    return { copied, warnings };
}
async function sha256(filePath) {
    const hash = (0, crypto_1.createHash)('sha256');
    const buffer = await fs_1.promises.readFile(filePath);
    hash.update(buffer);
    return hash.digest('hex');
}
class RuntimeEvidenceService {
    bundles = new Map();
    ttlMs = 1000 * 60 * 15; // 15 minutes
    async createBundle(options) {
        const startTime = parseDate(options.startTime);
        const endTime = parseDate(options.endTime);
        const tenantId = options.tenantId;
        const deployedVersion = options.deployedVersion || (await resolveDeployedVersion());
        const workingDir = path_1.default.join(os_1.default.tmpdir(), 'runtime-evidence', (0, crypto_1.randomUUID)().replace(/-/g, ''));
        const artifactsDir = path_1.default.join(workingDir, 'artifacts');
        await ensureDir(artifactsDir);
        const warnings = [];
        const auditDest = path_1.default.join(artifactsDir, 'audit-events.jsonl');
        const auditResult = await collectJsonlSlice({
            sources: options.auditPaths ?? DEFAULT_AUDIT_PATHS,
            destination: auditDest,
            startTime,
            endTime,
            tenantId,
        });
        warnings.push(...auditResult.warnings);
        const policyDest = path_1.default.join(artifactsDir, 'policy-decisions.jsonl');
        const policyResult = await collectJsonlSlice({
            sources: options.policyPaths ?? DEFAULT_POLICY_PATHS,
            destination: policyDest,
            startTime,
            endTime,
            tenantId,
        });
        warnings.push(...policyResult.warnings);
        const sbomDir = path_1.default.join(artifactsDir, 'sbom');
        await ensureDir(sbomDir);
        const sbomResult = await copyArtifacts(options.sbomPaths ?? DEFAULT_SBOM_PATHS, sbomDir);
        warnings.push(...sbomResult.warnings);
        const provenanceDir = path_1.default.join(artifactsDir, 'provenance');
        await ensureDir(provenanceDir);
        const provenanceResult = await copyArtifacts(options.provenancePaths ?? DEFAULT_PROVENANCE_PATHS, provenanceDir);
        warnings.push(...provenanceResult.warnings);
        const manifest = {
            tenantId,
            startTime: startTime?.toISOString(),
            endTime: endTime?.toISOString(),
            counts: {
                auditEvents: auditResult.count,
                policyDecisions: policyResult.count,
                sbomRefs: sbomResult.copied.length,
                provenanceRefs: provenanceResult.copied.length,
            },
            sources: {
                audit: options.auditPaths ?? DEFAULT_AUDIT_PATHS,
                policy: options.policyPaths ?? DEFAULT_POLICY_PATHS,
                sbom: options.sbomPaths ?? DEFAULT_SBOM_PATHS,
                provenance: options.provenancePaths ?? DEFAULT_PROVENANCE_PATHS,
            },
            warnings,
            generatedAt: new Date().toISOString(),
            deployedVersion,
        };
        const manifestPath = path_1.default.join(workingDir, 'manifest.json');
        await fs_1.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
        const filesForChecksums = [
            auditDest,
            policyDest,
            ...sbomResult.copied,
            ...provenanceResult.copied,
            manifestPath,
        ];
        const checksumLines = [];
        for (const filePath of filesForChecksums) {
            const exists = await fs_1.promises
                .access(filePath)
                .then(() => true)
                .catch(() => false);
            if (!exists)
                continue;
            const hash = await sha256(filePath);
            checksumLines.push(`${hash}  ${path_1.default.relative(workingDir, filePath)}`);
        }
        const checksumsPath = path_1.default.join(workingDir, 'checksums.txt');
        await fs_1.promises.writeFile(checksumsPath, checksumLines.join('\n'));
        const bundlePath = path_1.default.join(workingDir, `runtime-evidence-${Date.now()}.tar.gz`);
        await this.writeTarball({
            files: [
                manifestPath,
                checksumsPath,
                auditDest,
                policyDest,
                ...sbomResult.copied,
                ...provenanceResult.copied,
            ],
            output: bundlePath,
            workingDir,
        });
        const sha256Hash = await sha256(bundlePath);
        const bundle = {
            id: (0, crypto_1.randomUUID)(),
            tenantId,
            bundlePath,
            manifestPath,
            checksumsPath,
            sha256: sha256Hash,
            deployedVersion,
            warnings,
            counts: manifest.counts,
            expiresAt: new Date(Date.now() + this.ttlMs).toISOString(),
        };
        this.cleanupExpired();
        this.bundles.set(bundle.id, bundle);
        return bundle;
    }
    getBundle(bundleId) {
        this.cleanupExpired();
        return this.bundles.get(bundleId);
    }
    cleanupExpired() {
        const now = Date.now();
        for (const [id, bundle] of this.bundles.entries()) {
            if (new Date(bundle.expiresAt).getTime() < now) {
                this.bundles.delete(id);
                const workingDir = path_1.default.dirname(bundle.bundlePath);
                fs_1.promises.rm(workingDir, { recursive: true, force: true }).catch(() => undefined);
            }
        }
    }
    async writeTarball({ files, output, workingDir, }) {
        await ensureDir(path_1.default.dirname(output));
        await new Promise((resolve, reject) => {
            const stream = (0, fs_2.createWriteStream)(output);
            const archive = (0, archiver_1.default)('tar', { gzip: true, gzipOptions: { level: 9 } });
            archive.on('error', reject);
            stream.on('close', () => resolve());
            archive.pipe(stream);
            for (const file of files) {
                archive.file(file, { name: path_1.default.relative(workingDir, file) });
            }
            archive.finalize();
        });
    }
}
exports.runtimeEvidenceService = new RuntimeEvidenceService();
