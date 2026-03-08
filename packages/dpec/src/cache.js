"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeterministicPromptExecutionCache = void 0;
const hash_js_1 = require("./hash.js");
const DEFAULT_MAX_ENTRIES = 256;
function normalizeArtifact(artifact) {
    if (artifact instanceof Uint8Array) {
        return Buffer.from(artifact);
    }
    if (typeof artifact === 'string') {
        return Buffer.from(artifact, 'utf8');
    }
    if (Buffer.isBuffer(artifact)) {
        return Buffer.from(artifact);
    }
    return Buffer.from((0, hash_js_1.stableStringify)(artifact));
}
function canonicalKey(components) {
    return (0, hash_js_1.stableStringify)({
        modelHash: components.modelHash,
        tokenizerHash: components.tokenizerHash,
        params: components.params,
        toolsGraphHash: components.toolsGraphHash,
        promptHash: components.promptHash
    });
}
function computeKey(components) {
    return (0, hash_js_1.sha256)(canonicalKey(components));
}
function nowISO(clock) {
    return new Date(clock()).toISOString();
}
class DeterministicPromptExecutionCache {
    entries = new Map();
    traces = [];
    hitProofs = [];
    evictionLog = [];
    options;
    accessCounter = 0;
    sequence = 0;
    constructor(options = {}) {
        this.options = {
            maxEntries: options.maxEntries ?? DEFAULT_MAX_ENTRIES,
            clock: options.clock ?? (() => Date.now())
        };
    }
    async resolve(components, fetcher) {
        const key = computeKey(components);
        const canonical = canonicalKey(components);
        const existing = this.entries.get(key);
        if (existing) {
            existing.hits += 1;
            existing.lastAccessedAt = nowISO(this.options.clock);
            existing.accessCounter = ++this.accessCounter;
            const entryManifest = this.toManifestEntry(existing);
            const proof = this.buildHitProof(entryManifest);
            this.hitProofs.push(proof);
            return {
                type: 'hit',
                artifact: Buffer.from(existing.artifact),
                proof,
                entry: entryManifest
            };
        }
        const fetched = await Promise.resolve(fetcher(components));
        const normalized = normalizeArtifact(fetched.artifact);
        const metadataDigest = (0, hash_js_1.canonicalDigest)(fetched.metadata ?? {});
        const artifactDigest = (0, hash_js_1.sha256)(normalized);
        const timestamp = nowISO(this.options.clock);
        const entry = {
            key,
            canonicalKey: canonical,
            components: {
                modelHash: components.modelHash,
                tokenizerHash: components.tokenizerHash,
                params: structuredClone(components.params),
                toolsGraphHash: components.toolsGraphHash,
                promptHash: components.promptHash
            },
            artifact: Buffer.from(normalized),
            metadataDigest,
            artifactDigest,
            insertedAt: timestamp,
            lastAccessedAt: timestamp,
            hits: 1,
            sequence: ++this.sequence,
            accessCounter: ++this.accessCounter
        };
        this.entries.set(key, entry);
        const trace = this.recordTrace(entry, fetched.artifact, fetched.metadata ?? {});
        const evictionProofs = this.evictIfNeeded();
        const manifestEntry = this.toManifestEntry(entry);
        return {
            type: 'miss',
            artifact: Buffer.from(entry.artifact),
            trace,
            entry: manifestEntry,
            evictionProofs
        };
    }
    getTraces() {
        return this.traces.map((trace) => ({
            ...trace,
            input: {
                modelHash: trace.input.modelHash,
                tokenizerHash: trace.input.tokenizerHash,
                params: structuredClone(trace.input.params),
                toolsGraphHash: trace.input.toolsGraphHash,
                promptHash: trace.input.promptHash
            }
        }));
    }
    getAuditLog() {
        return {
            hits: this.hitProofs.map((proof) => ({ ...proof })),
            misses: this.getTraces(),
            evictions: this.evictionLog.map((proof) => ({
                ...proof,
                victim: { ...proof.victim },
                survivors: proof.survivors.map((survivor) => ({ ...survivor }))
            }))
        };
    }
    generateManifest() {
        const entries = Array.from(this.entries.values()).map((entry) => this.toManifestEntry(entry));
        entries.sort((a, b) => a.key.localeCompare(b.key));
        const digest = (0, hash_js_1.sha256)(Buffer.from((0, hash_js_1.stableStringify)(entries)));
        return {
            createdAt: nowISO(this.options.clock),
            digest,
            entries
        };
    }
    toManifestEntry(entry) {
        return {
            key: entry.key,
            canonicalKey: entry.canonicalKey,
            artifactDigest: entry.artifactDigest,
            insertedAt: entry.insertedAt,
            lastAccessedAt: entry.lastAccessedAt,
            hits: entry.hits,
            sequence: entry.sequence,
            accessCounter: entry.accessCounter,
            metadataDigest: entry.metadataDigest
        };
    }
    buildHitProof(entry) {
        const manifestDigest = this.computeManifestDigestSnapshot();
        const timestamp = nowISO(this.options.clock);
        const payload = {
            type: 'hit',
            key: entry.key,
            artifactDigest: entry.artifactDigest,
            manifestDigest,
            hits: entry.hits,
            sequence: entry.sequence,
            timestamp
        };
        return {
            ...payload,
            eventDigest: (0, hash_js_1.sha256)(Buffer.from((0, hash_js_1.stableStringify)(payload)))
        };
    }
    computeManifestDigestSnapshot() {
        const entries = Array.from(this.entries.values())
            .map((entry) => this.toManifestEntry(entry))
            .sort((a, b) => a.key.localeCompare(b.key));
        return (0, hash_js_1.sha256)(Buffer.from((0, hash_js_1.stableStringify)(entries)));
    }
    recordTrace(entry, artifact, metadata) {
        const artifactBuffer = normalizeArtifact(artifact);
        const input = {
            modelHash: entry.components.modelHash,
            tokenizerHash: entry.components.tokenizerHash,
            params: structuredClone(entry.components.params),
            toolsGraphHash: entry.components.toolsGraphHash,
            promptHash: entry.components.promptHash
        };
        const payload = {
            type: 'miss-fill',
            key: entry.key,
            canonicalKey: entry.canonicalKey,
            input,
            artifactDigest: (0, hash_js_1.sha256)(artifactBuffer),
            artifactBase64: artifactBuffer.toString('base64'),
            metadataDigest: (0, hash_js_1.canonicalDigest)(metadata),
            timestamp: nowISO(this.options.clock)
        };
        const trace = {
            ...payload,
            eventDigest: (0, hash_js_1.sha256)(Buffer.from((0, hash_js_1.stableStringify)(payload)))
        };
        this.traces.push(trace);
        return trace;
    }
    evictIfNeeded() {
        const proofs = [];
        while (this.entries.size > this.options.maxEntries) {
            const victim = this.selectEvictionCandidate();
            if (!victim) {
                break;
            }
            const survivors = Array.from(this.entries.values())
                .filter((entry) => entry.key !== victim.key)
                .map((entry) => ({ key: entry.key, accessCounter: entry.accessCounter }))
                .sort((a, b) => a.accessCounter - b.accessCounter);
            const payload = {
                type: 'eviction',
                algorithm: 'LRU',
                timestamp: nowISO(this.options.clock),
                victim: this.toManifestEntry(victim),
                survivors
            };
            const proof = {
                ...payload,
                eventDigest: (0, hash_js_1.sha256)(Buffer.from((0, hash_js_1.stableStringify)(payload)))
            };
            this.entries.delete(victim.key);
            proofs.push(proof);
            this.evictionLog.push(proof);
        }
        return proofs;
    }
    selectEvictionCandidate() {
        let candidate;
        for (const entry of this.entries.values()) {
            if (!candidate || entry.accessCounter < candidate.accessCounter) {
                candidate = entry;
            }
        }
        return candidate;
    }
    static verifyManifest(manifest, reference) {
        const sortedEntries = [...manifest.entries].sort((a, b) => a.key.localeCompare(b.key));
        const digest = (0, hash_js_1.sha256)(Buffer.from((0, hash_js_1.stableStringify)(sortedEntries)));
        if (digest !== manifest.digest) {
            return false;
        }
        if (!reference) {
            return true;
        }
        const refSorted = [...reference].sort((a, b) => a.key.localeCompare(b.key));
        return (0, hash_js_1.stableStringify)(refSorted) === (0, hash_js_1.stableStringify)(sortedEntries);
    }
    static verifyHitProof(proof, manifest) {
        if (proof.type !== 'hit') {
            return false;
        }
        if (manifest.digest !== proof.manifestDigest) {
            return false;
        }
        const payload = {
            type: proof.type,
            key: proof.key,
            artifactDigest: proof.artifactDigest,
            manifestDigest: proof.manifestDigest,
            hits: proof.hits,
            sequence: proof.sequence,
            timestamp: proof.timestamp
        };
        const canonical = (0, hash_js_1.stableStringify)(payload);
        if ((0, hash_js_1.sha256)(Buffer.from(canonical)) !== proof.eventDigest) {
            return false;
        }
        const entry = manifest.entries.find((item) => item.key === proof.key);
        if (!entry) {
            return false;
        }
        return (entry.artifactDigest === proof.artifactDigest &&
            entry.hits === proof.hits &&
            entry.sequence === proof.sequence);
    }
    static verifyMissFillTrace(trace) {
        if (trace.type !== 'miss-fill') {
            return false;
        }
        const recomputedKey = computeKey(trace.input);
        if (recomputedKey !== trace.key) {
            return false;
        }
        if (canonicalKey(trace.input) !== trace.canonicalKey) {
            return false;
        }
        const artifactBuffer = Buffer.from(trace.artifactBase64, 'base64');
        if ((0, hash_js_1.sha256)(artifactBuffer) !== trace.artifactDigest) {
            return false;
        }
        const payload = {
            type: trace.type,
            key: trace.key,
            canonicalKey: trace.canonicalKey,
            input: trace.input,
            artifactDigest: trace.artifactDigest,
            artifactBase64: trace.artifactBase64,
            metadataDigest: trace.metadataDigest,
            timestamp: trace.timestamp
        };
        const canonical = (0, hash_js_1.stableStringify)(payload);
        return (0, hash_js_1.sha256)(Buffer.from(canonical)) === trace.eventDigest;
    }
    static verifyEvictionProof(proof) {
        if (proof.type !== 'eviction' || proof.algorithm !== 'LRU') {
            return false;
        }
        const payload = {
            type: proof.type,
            algorithm: proof.algorithm,
            timestamp: proof.timestamp,
            victim: proof.victim,
            survivors: proof.survivors
        };
        const canonical = (0, hash_js_1.stableStringify)(payload);
        if ((0, hash_js_1.sha256)(Buffer.from(canonical)) !== proof.eventDigest) {
            return false;
        }
        for (const survivor of proof.survivors) {
            if (survivor.accessCounter <= proof.victim.accessCounter) {
                return false;
            }
        }
        return true;
    }
    static async replayTrace(trace, fetcher) {
        const key = computeKey(trace.input);
        if (key !== trace.key) {
            return false;
        }
        const result = await Promise.resolve(fetcher(trace.input));
        const artifactBuffer = normalizeArtifact(result.artifact);
        const digest = (0, hash_js_1.sha256)(artifactBuffer);
        return digest === trace.artifactDigest;
    }
}
exports.DeterministicPromptExecutionCache = DeterministicPromptExecutionCache;
