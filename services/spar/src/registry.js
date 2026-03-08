"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SparRegistry = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("./utils");
const manifest_1 = require("./manifest");
class SparRegistry {
    storageDir;
    indexPath;
    index;
    constructor(storageDir) {
        this.storageDir = storageDir;
        fs_1.default.mkdirSync(storageDir, { recursive: true });
        this.indexPath = path_1.default.join(storageDir, 'index.json');
        this.index = this.loadIndex();
    }
    registerArtifact(input, signer) {
        const prepared = this.prepareInput(input);
        const canonical = this.canonicalPayload(prepared);
        const hash = (0, utils_1.computeHash)(canonical);
        const existingId = this.index.hashes[hash];
        if (existingId) {
            return this.getArtifact(existingId);
        }
        const templateEntries = this.index.templates[prepared.templateId] ?? [];
        const nextVersion = templateEntries.length > 0
            ? templateEntries[templateEntries.length - 1].version + 1
            : 1;
        const artifactId = `${prepared.templateId}:v${nextVersion}`;
        const createdAt = new Date().toISOString();
        const signature = signer.sign(hash);
        const artifact = {
            ...prepared,
            id: artifactId,
            version: nextVersion,
            hash,
            signerId: signer.id,
            signature,
            createdAt,
        };
        this.persistArtifact(artifact);
        const registryEntry = {
            version: nextVersion,
            id: artifactId,
            hash,
            createdAt,
        };
        this.index.templates[prepared.templateId] = [
            ...templateEntries,
            registryEntry,
        ];
        this.index.hashes[hash] = artifactId;
        this.saveIndex();
        return artifact;
    }
    getArtifact(artifactId) {
        const { templateId, version } = this.parseArtifactId(artifactId);
        const artifactPath = this.artifactPath(templateId, version);
        if (!fs_1.default.existsSync(artifactPath)) {
            throw new Error(`Artifact ${artifactId} not found`);
        }
        const raw = fs_1.default.readFileSync(artifactPath, 'utf-8');
        return JSON.parse(raw);
    }
    listArtifacts(templateId) {
        if (templateId) {
            return this.loadArtifactsForTemplate(templateId);
        }
        return Object.keys(this.index.templates).flatMap((id) => this.loadArtifactsForTemplate(id));
    }
    exportManifest(artifactId) {
        const artifact = this.getArtifact(artifactId);
        return {
            schemaVersion: '1.0.0',
            artifactId: artifact.id,
            templateId: artifact.templateId,
            version: artifact.version,
            hash: artifact.hash,
            signerId: artifact.signerId,
            signature: artifact.signature,
            createdAt: artifact.createdAt,
            promptTemplate: artifact.promptTemplate,
            inputs: artifact.inputs,
            toolTraces: artifact.toolTraces,
            output: artifact.output,
            policyTags: artifact.policyTags,
            metadata: artifact.metadata,
        };
    }
    verifyArtifact(artifactId, signer) {
        const artifact = this.getArtifact(artifactId);
        const canonical = this.canonicalPayload(artifact);
        const expectedHash = (0, utils_1.computeHash)(canonical);
        if (artifact.hash !== expectedHash) {
            return false;
        }
        return signer.verify(artifact.hash, artifact.signature);
    }
    diffArtifacts(firstId, secondId) {
        const first = this.getArtifact(firstId);
        const second = this.getArtifact(secondId);
        const firstCore = this.corePayload(first);
        const secondCore = this.corePayload(second);
        return diffCore(firstCore, secondCore);
    }
    replayManifest(manifest, signer) {
        const replayed = (0, manifest_1.replayManifest)(manifest, signer);
        const artifact = this.getArtifact(manifest.artifactId);
        const artifactCanonical = this.canonicalPayload(artifact);
        return (0, utils_1.stableStringify)(artifactCanonical) === replayed.canonical;
    }
    persistArtifact(artifact) {
        const artifactPath = this.artifactPath(artifact.templateId, artifact.version);
        if (fs_1.default.existsSync(artifactPath)) {
            const existing = fs_1.default.readFileSync(artifactPath, 'utf-8');
            if (existing !== JSON.stringify(artifact, null, 2)) {
                throw new Error(`Artifact at ${artifactPath} already exists with different content`);
            }
            return;
        }
        fs_1.default.mkdirSync(path_1.default.dirname(artifactPath), { recursive: true });
        fs_1.default.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
    }
    loadArtifactsForTemplate(templateId) {
        const entries = this.index.templates[templateId] ?? [];
        return entries.map((entry) => this.getArtifact(entry.id));
    }
    parseArtifactId(artifactId) {
        const [templateId, versionPart] = artifactId.split(':v');
        if (!templateId || !versionPart) {
            throw new Error(`Invalid artifact id ${artifactId}`);
        }
        const version = Number(versionPart);
        if (!Number.isInteger(version)) {
            throw new Error(`Invalid artifact version for id ${artifactId}`);
        }
        return { templateId, version };
    }
    artifactPath(templateId, version) {
        return path_1.default.join(this.storageDir, templateId, `v${version}.json`);
    }
    canonicalPayload(input) {
        return {
            promptTemplate: input.promptTemplate,
            inputs: input.inputs,
            toolTraces: input.toolTraces,
            output: input.output,
            metadata: input.metadata,
            policyTags: input.policyTags,
        };
    }
    corePayload(input) {
        return this.canonicalPayload(input);
    }
    prepareInput(input) {
        return {
            templateId: input.templateId,
            promptTemplate: input.promptTemplate,
            inputs: (0, utils_1.deepClone)(input.inputs),
            toolTraces: input.toolTraces.map((trace) => ({
                ...trace,
                input: (0, utils_1.deepClone)(trace.input),
                output: (0, utils_1.deepClone)(trace.output),
                meta: trace.meta ? (0, utils_1.deepClone)(trace.meta) : undefined,
            })),
            output: input.output,
            policyTags: (0, utils_1.normalisePolicyTags)(input.policyTags),
            metadata: {
                model: input.metadata.model,
                parameters: (0, utils_1.deepClone)(input.metadata.parameters),
                tools: (0, utils_1.normaliseTools)(input.metadata.tools.map((tool) => ({
                    ...tool,
                    parameters: tool.parameters
                        ? (0, utils_1.deepClone)(tool.parameters)
                        : undefined,
                }))),
            },
        };
    }
    loadIndex() {
        if (!fs_1.default.existsSync(this.indexPath)) {
            return { templates: {}, hashes: {} };
        }
        const raw = fs_1.default.readFileSync(this.indexPath, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
            templates: parsed.templates ?? {},
            hashes: parsed.hashes ?? {},
        };
    }
    saveIndex() {
        fs_1.default.writeFileSync(this.indexPath, JSON.stringify(this.index, null, 2));
    }
}
exports.SparRegistry = SparRegistry;
function diffCore(a, b, prefix = '') {
    const diffs = [];
    const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).sort();
    for (const key of keys) {
        const path = prefix ? `${prefix}.${key}` : key;
        const aValue = a[key];
        const bValue = b[key];
        if ((0, utils_1.deepEqual)(aValue, bValue)) {
            continue;
        }
        if (Array.isArray(aValue) && Array.isArray(bValue)) {
            const maxLength = Math.max(aValue.length, bValue.length);
            for (let index = 0; index < maxLength; index += 1) {
                const itemPath = `${path}[${index}]`;
                if (index >= aValue.length) {
                    diffs.push({
                        path: itemPath,
                        before: undefined,
                        after: bValue[index],
                    });
                    continue;
                }
                if (index >= bValue.length) {
                    diffs.push({
                        path: itemPath,
                        before: aValue[index],
                        after: undefined,
                    });
                    continue;
                }
                if (!(0, utils_1.deepEqual)(aValue[index], bValue[index])) {
                    if (typeof aValue[index] === 'object' &&
                        typeof bValue[index] === 'object') {
                        diffs.push(...diffCore(aValue[index], bValue[index], itemPath));
                    }
                    else {
                        diffs.push({
                            path: itemPath,
                            before: aValue[index],
                            after: bValue[index],
                        });
                    }
                }
            }
            continue;
        }
        if (typeof aValue === 'object' &&
            typeof bValue === 'object' &&
            aValue &&
            bValue) {
            diffs.push(...diffCore(aValue, bValue, path));
            continue;
        }
        diffs.push({ path, before: aValue, after: bValue });
    }
    return diffs;
}
