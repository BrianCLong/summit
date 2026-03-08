"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaseBundleService = void 0;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const os_1 = require("os");
const archiver_1 = __importDefault(require("archiver"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const FixtureCaseBundleStore_js_1 = require("./FixtureCaseBundleStore.js");
const bundleLogger = logger_js_1.default.child({ name: 'CaseBundleService' });
const DEFAULT_INCLUDE = {
    evidence: true,
    graph: true,
    notes: true,
};
class CaseBundleService {
    store;
    constructor(store = new FixtureCaseBundleStore_js_1.FixtureCaseBundleStore()) {
        this.store = store;
    }
    async exportCases(caseIds, options = {}) {
        if (!caseIds || caseIds.length === 0) {
            throw new Error('case_ids_required');
        }
        const include = this.resolveInclude(options.include);
        const bundlePath = options.targetDir
            ? options.targetDir
            : await fs_1.promises.mkdtemp(path_1.default.join((0, os_1.tmpdir)(), 'case-bundle-'));
        await fs_1.promises.mkdir(bundlePath, { recursive: true });
        const cases = await this.store.getCases(caseIds);
        if (cases.length !== caseIds.length) {
            const missing = caseIds.filter((id) => !cases.find((c) => c.id === id));
            throw new Error(`missing_cases:${missing.join(',')}`);
        }
        const evidence = include.evidence ? await this.store.getEvidence(caseIds) : [];
        const notes = include.notes ? await this.store.getNotes(caseIds) : [];
        const graph = include.graph
            ? await this.store.getGraphSubset(caseIds)
            : { nodes: [], edges: [] };
        const generatedAt = options.generatedAt || new Date().toISOString();
        const manifestBase = {
            version: 'case-bundle-v1',
            generatedAt,
            cases: [],
            evidence: [],
            notes: [],
            graph: { nodes: [], edges: [] },
        };
        for (const caseRecord of this.sortById(cases)) {
            const artifactPath = `cases/${caseRecord.id}.json`;
            const hash = await this.writeOrderedJson(bundlePath, artifactPath, caseRecord);
            manifestBase.cases.push({
                id: caseRecord.id,
                path: artifactPath,
                hash,
                type: 'case',
            });
        }
        for (const evidenceRecord of this.sortById(evidence)) {
            const artifactPath = `evidence/${evidenceRecord.id}.json`;
            const hash = await this.writeOrderedJson(bundlePath, artifactPath, evidenceRecord);
            manifestBase.evidence.push({
                id: evidenceRecord.id,
                caseId: evidenceRecord.caseId,
                type: evidenceRecord.type,
                path: artifactPath,
                hash,
            });
        }
        for (const note of this.sortById(notes)) {
            const artifactPath = `notes/${note.id}.json`;
            const hash = await this.writeOrderedJson(bundlePath, artifactPath, note);
            manifestBase.notes.push({
                id: note.id,
                caseId: note.caseId,
                path: artifactPath,
                hash,
                type: 'note',
            });
        }
        for (const node of this.sortById(graph.nodes)) {
            const artifactPath = `graph/nodes/${node.id}.json`;
            const hash = await this.writeOrderedJson(bundlePath, artifactPath, node);
            manifestBase.graph.nodes.push({
                id: node.id,
                caseId: node.caseId,
                path: artifactPath,
                hash,
                type: node.type,
                label: node.label,
            });
        }
        for (const edge of this.sortById(graph.edges)) {
            const artifactPath = `graph/edges/${edge.id}.json`;
            const hash = await this.writeOrderedJson(bundlePath, artifactPath, edge);
            manifestBase.graph.edges.push({
                id: edge.id,
                path: artifactPath,
                hash,
                type: edge.label,
            });
        }
        const manifestWithoutHash = this.orderValue(manifestBase);
        const bundleHash = this.hashValue(this.manifestHashInput(manifestBase));
        const manifest = this.orderValue({
            ...manifestWithoutHash,
            bundleHash,
        });
        const manifestPath = path_1.default.join(bundlePath, 'manifest.json');
        await fs_1.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
        let archivePath;
        if (options.format === 'zip') {
            archivePath = await this.createArchive(bundlePath);
        }
        bundleLogger.info({ bundlePath, archivePath, caseCount: cases.length }, 'Generated case bundle');
        return { bundlePath, archivePath, manifest };
    }
    async importBundle(bundlePath, options = {}) {
        const include = this.resolveInclude(options.include);
        const workingDir = await this.ensureDirectory(bundlePath);
        const manifestPath = path_1.default.join(workingDir, 'manifest.json');
        const manifestRaw = await fs_1.promises.readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestRaw);
        const { bundleHash } = manifest;
        const manifestForHash = this.manifestHashInput({
            version: manifest.version,
            generatedAt: manifest.generatedAt,
            cases: manifest.cases,
            evidence: manifest.evidence,
            notes: manifest.notes,
            graph: manifest.graph,
        });
        const recalculatedHash = this.hashValue(manifestForHash);
        if (bundleHash && recalculatedHash !== bundleHash) {
            throw new Error('bundle_hash_mismatch');
        }
        const mappingReport = {
            generatedAt: new Date().toISOString(),
            sourceBundleHash: bundleHash || recalculatedHash,
            mapping: {
                cases: [],
                evidence: [],
                notes: [],
                graphNodes: [],
                graphEdges: [],
            },
            warnings: [],
            skipped: [],
        };
        const caseEntries = await this.verifyAndLoadEntries(workingDir, manifest.cases, 'case');
        const evidenceEntries = await this.verifyAndLoadEntries(workingDir, manifest.evidence, 'evidence');
        const noteEntries = await this.verifyAndLoadEntries(workingDir, manifest.notes, 'note');
        const nodeEntries = await this.verifyAndLoadEntries(workingDir, manifest.graph.nodes, 'graph-node');
        const edgeEntries = await this.verifyAndLoadEntries(workingDir, manifest.graph.edges, 'graph-edge');
        const idMap = new Map();
        for (const entry of caseEntries) {
            const newId = this.generateNewId(entry.parsed.id, options);
            idMap.set(entry.parsed.id, newId);
            mappingReport.mapping.cases.push({
                oldId: entry.parsed.id,
                newId,
                type: 'case',
            });
        }
        if (!include.evidence) {
            mappingReport.skipped.push('evidence');
            mappingReport.warnings.push('evidence import disabled by include flag');
        }
        else {
            for (const entry of evidenceEntries) {
                const newId = this.generateNewId(entry.parsed.id, options);
                mappingReport.mapping.evidence.push({
                    oldId: entry.parsed.id,
                    newId,
                    type: 'evidence',
                    caseId: entry.parsed.caseId,
                });
            }
        }
        if (!include.notes) {
            mappingReport.skipped.push('notes');
            mappingReport.warnings.push('notes import disabled by include flag');
        }
        else {
            for (const entry of noteEntries) {
                const newId = this.generateNewId(entry.parsed.id, options);
                mappingReport.mapping.notes.push({
                    oldId: entry.parsed.id,
                    newId,
                    type: 'note',
                    caseId: entry.parsed.caseId,
                });
            }
        }
        if (!include.graph) {
            mappingReport.skipped.push('graph');
            mappingReport.warnings.push('graph import disabled by include flag');
        }
        else {
            for (const entry of nodeEntries) {
                const newId = this.generateNewId(entry.parsed.id, options);
                idMap.set(entry.parsed.id, newId);
                mappingReport.mapping.graphNodes.push({
                    oldId: entry.parsed.id,
                    newId,
                    type: 'graph-node',
                    caseId: entry.parsed.caseId,
                });
            }
            for (const entry of edgeEntries) {
                const newId = this.generateNewId(entry.parsed.id, options);
                const edge = entry.parsed;
                const mappedFrom = idMap.get(edge.from) || edge.from;
                const mappedTo = idMap.get(edge.to) || edge.to;
                mappingReport.mapping.graphEdges.push({
                    oldId: entry.parsed.id,
                    newId,
                    type: 'graph-edge',
                    caseId: `${mappedFrom}->${mappedTo}`,
                });
            }
        }
        const mappingPath = path_1.default.join(workingDir, 'import-mapping.json');
        await fs_1.promises.writeFile(mappingPath, JSON.stringify(this.orderValue(mappingReport), null, 2));
        return {
            manifest,
            bundlePath: workingDir,
            mapping: mappingReport,
            mappingPath,
        };
    }
    async ensureDirectory(bundlePath) {
        const stats = await fs_1.promises.stat(bundlePath);
        if (stats.isDirectory())
            return bundlePath;
        if (bundlePath.endsWith('.zip')) {
            const extractDir = await fs_1.promises.mkdtemp(path_1.default.join((0, os_1.tmpdir)(), 'case-bundle-import-'));
            const zip = new adm_zip_1.default(bundlePath);
            zip.extractAllTo(extractDir, true);
            return extractDir;
        }
        throw new Error('unsupported_bundle_format');
    }
    async createArchive(bundlePath) {
        const archivePath = `${bundlePath}.zip`;
        const output = (0, fs_1.createWriteStream)(archivePath);
        const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
        const done = new Promise((resolve, reject) => {
            output.on('close', () => resolve());
            archive.on('error', (err) => reject(err));
        });
        archive.pipe(output);
        archive.directory(bundlePath, false);
        archive.finalize();
        await done;
        return archivePath;
    }
    async writeOrderedJson(baseDir, relativePath, payload) {
        const ordered = this.orderValue(payload);
        const serialized = JSON.stringify(ordered, null, 2);
        const target = path_1.default.join(baseDir, relativePath);
        await fs_1.promises.mkdir(path_1.default.dirname(target), { recursive: true });
        await fs_1.promises.writeFile(target, serialized);
        return this.hashString(serialized);
    }
    async verifyAndLoadEntries(baseDir, entries, kind) {
        const orderedEntries = this.sortById(entries);
        const loaded = [];
        for (const entry of orderedEntries) {
            const absolutePath = path_1.default.join(baseDir, entry.path);
            const fileContent = await fs_1.promises.readFile(absolutePath, 'utf-8');
            const computedHash = this.hashString(fileContent);
            if (computedHash !== entry.hash) {
                throw new Error(`integrity_mismatch:${kind}:${entry.id}`);
            }
            loaded.push({ manifest: entry, parsed: JSON.parse(fileContent) });
        }
        return loaded;
    }
    manifestHashInput(manifest) {
        return this.orderValue({
            ...manifest,
            generatedAt: '__normalized__',
        });
    }
    resolveInclude(include) {
        return {
            evidence: include?.evidence ?? DEFAULT_INCLUDE.evidence,
            graph: include?.graph ?? DEFAULT_INCLUDE.graph,
            notes: include?.notes ?? DEFAULT_INCLUDE.notes,
        };
    }
    hashString(value) {
        return (0, crypto_1.createHash)('sha256').update(value).digest('hex');
    }
    hashValue(value) {
        return this.hashString(this.stableStringify(value));
    }
    stableStringify(value) {
        return JSON.stringify(this.orderValue(value));
    }
    orderValue(value) {
        if (Array.isArray(value)) {
            return value.map((v) => this.orderValue(v));
        }
        if (value && typeof value === 'object') {
            const sorted = {};
            for (const key of Object.keys(value).sort()) {
                sorted[key] = this.orderValue(value[key]);
            }
            return sorted;
        }
        return value;
    }
    sortById(items) {
        return [...items].sort((a, b) => a.id.localeCompare(b.id));
    }
    generateNewId(sourceId, options) {
        if (options.preserveIds) {
            return options.namespace ? `${options.namespace}:${sourceId}` : sourceId;
        }
        if (options.namespace) {
            return `${options.namespace}:${sourceId}`;
        }
        return (0, crypto_1.randomUUID)();
    }
}
exports.CaseBundleService = CaseBundleService;
