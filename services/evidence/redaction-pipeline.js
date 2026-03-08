"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedactionPipeline = exports.RedactionProvenanceLedger = exports.FileSystemDerivativeStore = exports.InMemoryEvidenceStore = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
class InMemoryEvidenceStore {
    records = new Map();
    add(record) {
        this.records.set(record.id, record);
    }
    async get(id) {
        return this.records.get(id);
    }
}
exports.InMemoryEvidenceStore = InMemoryEvidenceStore;
class FileSystemDerivativeStore {
    basePath;
    derivatives = new Map();
    instructionVersions = new Map();
    constructor(basePath) {
        this.basePath = basePath;
    }
    findByInstructionsHash(evidenceId, instructionsHash) {
        for (const artifact of this.derivatives.values()) {
            if (artifact.evidenceId === evidenceId && artifact.instructionsHash === instructionsHash) {
                return artifact;
            }
        }
        return undefined;
    }
    nextVersion(evidenceId, instructionsHash) {
        const versionMap = this.instructionVersions.get(evidenceId) ?? new Map();
        if (versionMap.has(instructionsHash)) {
            return versionMap.get(instructionsHash);
        }
        const next = versionMap.size + 1;
        versionMap.set(instructionsHash, next);
        this.instructionVersions.set(evidenceId, versionMap);
        return next;
    }
    async save(artifact) {
        this.derivatives.set(artifact.artifactId, artifact);
        await promises_1.default.mkdir(node_path_1.default.dirname(artifact.storagePath), { recursive: true });
        await promises_1.default.writeFile(artifact.storagePath, JSON.stringify(artifact, null, 2), 'utf8');
    }
    getById(artifactId) {
        return this.derivatives.get(artifactId);
    }
}
exports.FileSystemDerivativeStore = FileSystemDerivativeStore;
class RedactionProvenanceLedger {
    ledger = new Map();
    record(entry) {
        this.ledger.set(entry.derivativeId, entry);
    }
    get(derivativeId) {
        return this.ledger.get(derivativeId);
    }
}
exports.RedactionProvenanceLedger = RedactionProvenanceLedger;
const ALLOWED_ROLES = new Set(['admin', 'analyst', 'compliance', 'auditor']);
class RedactionPipeline {
    opts;
    constructor(opts) {
        this.opts = opts;
    }
    async applyRedaction(request) {
        this.ensureEnabled();
        this.ensureAuthorized(request.actor.role);
        const evidence = await this.opts.evidenceStore.get(request.evidenceId);
        if (!evidence) {
            throw new Error(`Evidence ${request.evidenceId} not found`);
        }
        const normalizedInstructions = normalizeInstructions(request.instructions);
        const instructionsHash = hashObject(normalizedInstructions);
        const existing = this.opts.derivativeStore.findByInstructionsHash(request.evidenceId, instructionsHash);
        if (existing) {
            const provenance = this.opts.provenanceLedger.get(existing.artifactId);
            if (provenance) {
                return { artifact: existing, provenance };
            }
        }
        const version = this.opts.derivativeStore.nextVersion(request.evidenceId, instructionsHash);
        const now = (this.opts.clock ?? (() => new Date()))().toISOString();
        const artifactId = hashObject({
            evidenceId: evidence.id,
            instructionsHash,
            version,
        }).slice(0, 32);
        const originalContent = evidence.content.toString('utf8');
        const { redactedContent, snippets } = applyTextRedactions(originalContent, normalizedInstructions.textSpans);
        const boxOverlays = normalizedInstructions.boundingBoxes.map((box) => ({ ...box, hash: hashObject(box) }));
        const overlay = buildOverlay({
            artifactId,
            baseEvidenceId: evidence.id,
            instructionsVersion: version,
            reasonCode: request.reasonCode,
            generatedAt: now,
            snippets,
            boxes: boxOverlays,
        });
        const storagePath = node_path_1.default.join(this.resolveBasePath(), evidence.id, `${artifactId}.json`);
        const artifact = {
            artifactId,
            evidenceId: evidence.id,
            version,
            instructionsHash,
            cacheKey: `${artifactId}:${instructionsHash}`,
            createdAt: now,
            originalChecksum: hashBuffer(evidence.content),
            reasonCode: request.reasonCode,
            redactedBy: request.actor.id,
            redactedByRole: request.actor.role,
            redactedContent,
            snippetHashes: [...snippets.map((s) => s.hash), ...boxOverlays.map((b) => b.hash)],
            overlay,
            storagePath,
        };
        await this.opts.derivativeStore.save(artifact);
        const provenance = {
            derivativeId: artifact.artifactId,
            evidenceId: artifact.evidenceId,
            redactedBy: request.actor.id,
            role: request.actor.role,
            reasonCode: request.reasonCode,
            instructionsVersion: version,
            instructionsHash,
            timestamp: now,
        };
        this.opts.provenanceLedger.record(provenance);
        return { artifact, provenance };
    }
    ensureEnabled() {
        const flag = this.opts.featureFlag ?? process.env.REDACTION_PIPELINE;
        if (flag !== '1') {
            throw new Error('Redaction pipeline disabled (set REDACTION_PIPELINE=1 to enable)');
        }
    }
    ensureAuthorized(role) {
        if (!ALLOWED_ROLES.has(role)) {
            throw new Error(`Role ${role} is not permitted to perform redactions`);
        }
    }
    resolveBasePath() {
        const base = this.opts.derivativeStore instanceof FileSystemDerivativeStore
            ? this.opts.derivativeStore.basePath
            : node_path_1.default.join(process.cwd(), 'derivatives');
        return node_path_1.default.resolve(base);
    }
}
exports.RedactionPipeline = RedactionPipeline;
function applyTextRedactions(content, spans) {
    const normalized = spans
        .map((span) => ({
        start: Math.max(0, span.start),
        end: Math.min(content.length, span.end),
        label: span.label,
    }))
        .filter((span) => span.end > span.start)
        .sort((a, b) => a.start - b.start);
    let cursor = 0;
    const parts = [];
    const snippets = [];
    for (const span of normalized) {
        if (span.start > cursor) {
            parts.push(content.slice(cursor, span.start));
        }
        const snippet = content.slice(span.start, span.end);
        const replacement = '█'.repeat(span.end - span.start);
        parts.push(replacement);
        snippets.push({
            ...span,
            snippet,
            replacement,
            hash: hashObject({ snippet, start: span.start, end: span.end, label: span.label }),
        });
        cursor = span.end;
    }
    if (cursor < content.length) {
        parts.push(content.slice(cursor));
    }
    return { redactedContent: parts.join(''), snippets };
}
function hashObject(obj) {
    return node_crypto_1.default.createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}
function hashBuffer(buf) {
    return node_crypto_1.default.createHash('sha256').update(buf).digest('hex');
}
function normalizeInstructions(instructions) {
    const textSpans = [...instructions.textSpans].sort((a, b) => a.start - b.start || a.end - b.end);
    const boundingBoxes = [...instructions.boundingBoxes].sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x);
    return { boundingBoxes, textSpans };
}
function buildOverlay(input) {
    const pageMap = new Map();
    for (const box of input.boxes) {
        const list = pageMap.get(box.page) ?? [];
        list.push(box);
        pageMap.set(box.page, list);
    }
    return {
        artifactId: input.artifactId,
        baseEvidenceId: input.baseEvidenceId,
        instructionsVersion: input.instructionsVersion,
        reasonCode: input.reasonCode,
        generatedAt: input.generatedAt,
        overlays: {
            pages: Array.from(pageMap.entries()).map(([page, boxes]) => ({ page, boxes })),
            textSpans: input.snippets,
        },
    };
}
