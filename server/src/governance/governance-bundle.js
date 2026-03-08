"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultGovernanceSources = void 0;
exports.generateGovernanceBundle = generateGovernanceBundle;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const archiver_1 = __importDefault(require("archiver"));
exports.defaultGovernanceSources = {
    auditLogPaths: [
        path_1.default.resolve('logs/audit-events.jsonl'),
        path_1.default.resolve('server/logs/audit-events.jsonl'),
    ],
    policyLogPaths: [
        path_1.default.resolve('logs/policy-decisions.jsonl'),
        path_1.default.resolve('logs/governance.jsonl'),
    ],
    sbomPaths: [
        path_1.default.resolve('sbom-mc-v0.4.5.json'),
        path_1.default.resolve('security/sbom/quality-gates-sbom.json'),
    ],
    provenancePaths: [
        path_1.default.resolve('provenance/export-manifest.json'),
        path_1.default.resolve('provenance/bundle-summary.md'),
        path_1.default.resolve('provenance/model.md'),
    ],
};
const MAX_EVENTS = 5000;
async function generateGovernanceBundle(options) {
    const start = new Date(options.startTime);
    const end = new Date(options.endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new Error('invalid_time_window');
    }
    const sources = {
        auditLogPaths: options.auditLogPaths ?? exports.defaultGovernanceSources.auditLogPaths,
        policyLogPaths: options.policyLogPaths ?? exports.defaultGovernanceSources.policyLogPaths,
        sbomPaths: options.sbomPaths ?? exports.defaultGovernanceSources.sbomPaths,
        provenancePaths: options.provenancePaths ?? exports.defaultGovernanceSources.provenancePaths,
    };
    const workspace = await fs_1.promises.mkdtemp(path_1.default.join(options.outputRoot ?? os_1.default.tmpdir(), 'governance-bundle-'));
    const bundleId = (0, crypto_1.randomUUID)();
    const bundleDir = path_1.default.join(workspace, bundleId);
    await fs_1.promises.mkdir(bundleDir, { recursive: true });
    const manifestEntries = [];
    const warnings = [];
    const counts = {
        auditEvents: 0,
        policyDecisions: 0,
        sbomRefs: 0,
        provenanceRefs: 0,
    };
    const audit = await collectJsonlSlice({
        label: 'audit',
        candidates: sources.auditLogPaths,
        start,
        end,
        destination: path_1.default.join(bundleDir, 'audit-events.json'),
    });
    manifestEntries.push(audit.entry);
    warnings.push(...audit.warnings);
    counts.auditEvents = audit.entry.count ?? 0;
    const policy = await collectJsonlSlice({
        label: 'policy',
        candidates: sources.policyLogPaths,
        start,
        end,
        destination: path_1.default.join(bundleDir, 'policy-decisions.json'),
    });
    manifestEntries.push(policy.entry);
    warnings.push(...policy.warnings);
    counts.policyDecisions = policy.entry.count ?? 0;
    const sbom = await copyReferences({
        label: 'sbom',
        candidates: sources.sbomPaths,
        destination: path_1.default.join(bundleDir, 'sbom'),
    });
    manifestEntries.push(...sbom.entries);
    warnings.push(...sbom.warnings);
    counts.sbomRefs = sbom.entries.length;
    const provenance = await copyReferences({
        label: 'provenance',
        candidates: sources.provenancePaths,
        destination: path_1.default.join(bundleDir, 'provenance'),
    });
    manifestEntries.push(...provenance.entries);
    warnings.push(...provenance.warnings);
    counts.provenanceRefs = provenance.entries.length;
    const manifest = {
        id: bundleId,
        tenantId: options.tenantId,
        window: { start: start.toISOString(), end: end.toISOString() },
        generatedAt: new Date().toISOString(),
        warnings,
        counts,
        files: manifestEntries,
    };
    const manifestPath = path_1.default.join(bundleDir, 'manifest.json');
    await fs_1.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    const manifestHash = await hashFile(manifestPath);
    manifestEntries.push({
        path: 'manifest.json',
        sha256: manifestHash,
        type: 'manifest',
    });
    const checksumsPath = path_1.default.join(bundleDir, 'checksums.txt');
    await writeChecksums(checksumsPath, manifestEntries);
    const checksumHash = await hashFile(checksumsPath);
    manifestEntries.push({
        path: 'checksums.txt',
        sha256: checksumHash,
        type: 'checksums',
    });
    const tarPath = path_1.default.join(workspace, `${bundleId}.tar.gz`);
    await createTarball(bundleDir, tarPath);
    const tarHash = await hashFile(tarPath);
    return {
        id: bundleId,
        tarPath,
        sha256: tarHash,
        manifestPath,
        checksumsPath,
        counts,
        warnings,
        workspace,
        files: manifestEntries,
    };
}
async function collectJsonlSlice({ label, candidates, start, end, destination, }) {
    const warnings = [];
    const source = await firstExistingPath(candidates);
    let records = [];
    if (source) {
        const content = await fs_1.promises.readFile(source, 'utf8');
        const lines = content
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
        for (const line of lines) {
            try {
                const parsed = JSON.parse(line);
                const ts = resolveTimestamp(parsed);
                if (ts && ts >= start.getTime() && ts <= end.getTime()) {
                    records.push(parsed);
                }
            }
            catch (error) {
                warnings.push(`${label}:invalid_line`);
            }
        }
        if (records.length > MAX_EVENTS) {
            records = records.slice(0, MAX_EVENTS);
            warnings.push(`${label}:truncated`);
        }
    }
    else {
        warnings.push(`${label}:source_missing`);
    }
    await fs_1.promises.writeFile(destination, JSON.stringify({
        source,
        window: { start: start.toISOString(), end: end.toISOString() },
        count: records.length,
        events: records,
        warnings,
    }, null, 2), 'utf8');
    const hash = await hashFile(destination);
    return {
        entry: {
            path: path_1.default.relative(path_1.default.dirname(destination), destination),
            sha256: hash,
            type: label,
            count: records.length,
            source,
            warnings,
        },
        warnings,
    };
}
async function copyReferences({ label, candidates, destination, }) {
    await fs_1.promises.mkdir(destination, { recursive: true });
    const entries = [];
    const warnings = [];
    for (const candidate of candidates) {
        const exists = await pathExists(candidate);
        if (!exists) {
            continue;
        }
        const target = path_1.default.join(destination, path_1.default.basename(candidate));
        await fs_1.promises.copyFile(candidate, target);
        const sha256 = await hashFile(target);
        entries.push({
            path: path_1.default.relative(path_1.default.dirname(destination), target),
            sha256,
            type: label,
            source: candidate,
        });
    }
    if (entries.length === 0) {
        warnings.push(`${label}:source_missing`);
    }
    return { entries, warnings };
}
async function writeChecksums(filePath, entries) {
    const lines = entries.map((entry) => `${entry.sha256}  ${entry.path.replace(/\\/g, '/')}`);
    await fs_1.promises.writeFile(filePath, lines.join('\n'), 'utf8');
}
async function firstExistingPath(pathsToCheck) {
    for (const candidate of pathsToCheck) {
        if (await pathExists(candidate)) {
            return candidate;
        }
    }
    return null;
}
async function pathExists(target) {
    try {
        await fs_1.promises.access(target);
        return true;
    }
    catch {
        return false;
    }
}
function resolveTimestamp(record) {
    const candidate = record?.timestamp || record?.created_at || record?.createdAt || record?.ts;
    if (!candidate)
        return null;
    const date = new Date(candidate);
    return Number.isNaN(date.getTime()) ? null : date.getTime();
}
async function hashFile(target) {
    return new Promise((resolve, reject) => {
        const hash = (0, crypto_1.createHash)('sha256');
        const stream = (0, fs_1.createReadStream)(target);
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}
async function createTarball(sourceDir, tarPath) {
    return new Promise((resolve, reject) => {
        const archive = (0, archiver_1.default)('tar', { gzip: true, gzipOptions: { level: 9 } });
        const writable = (0, fs_1.createWriteStream)(tarPath);
        writable.on('close', () => resolve());
        writable.on('error', reject);
        archive.on('error', reject);
        archive.pipe(writable);
        archive.directory(sourceDir, false);
        archive.finalize().catch(reject);
    });
}
