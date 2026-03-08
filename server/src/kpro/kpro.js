"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgePurgeReindexOrchestrator = void 0;
// @ts-nocheck
const crypto_1 = __importDefault(require("crypto"));
class KnowledgePurgeReindexOrchestrator {
    vectorStores;
    chunkStore;
    chunking;
    caches;
    audit;
    constructor(options) {
        if (!options.vectorStores.length) {
            throw new Error('At least one vector store adapter is required');
        }
        this.vectorStores = options.vectorStores;
        this.chunkStore = options.chunkStore;
        this.chunking = options.chunkingStrategy;
        this.caches = options.cacheInvalidators ?? [];
        this.audit = options.auditLog;
    }
    async purge(request) {
        const startedAt = new Date().toISOString();
        const ids = Array.from(new Set(request.forget.map((f) => f.id)));
        const chunkIndex = new Map();
        for (const id of ids) {
            const chunks = await this.chunkStore.listChunks(id);
            if (chunks.length) {
                chunkIndex.set(id, chunks);
            }
        }
        await this.audit.append({
            runId: request.runId,
            type: 'forget.received',
            payload: {
                ids,
                triggeredBy: request.triggeredBy,
                issuedAt: request.issuedAt,
            },
        });
        const purgeProofs = [];
        const beforeSnapshots = await Promise.all(this.vectorStores.map((vs) => vs.snapshot()));
        await this.chunkStore.deleteByDocumentIds(ids);
        await Promise.all(this.caches.map((cache) => cache.invalidate(ids)));
        for (const store of this.vectorStores) {
            const vectorIds = expandVectorIds(ids, chunkIndex);
            await this.audit.append({
                runId: request.runId,
                type: 'vector.delete',
                payload: { adapter: store.name, ids: vectorIds },
            });
            await store.removeByIds(vectorIds);
            const afterSnapshot = await store.snapshot();
            const before = beforeSnapshots.find((s) => s.adapter === store.name);
            if (!before)
                throw new Error(`Missing snapshot for adapter ${store.name}`);
            const diff = computeDiff(before, afterSnapshot);
            const absence = await store.fetchByIds(vectorIds);
            if (absence.length) {
                throw new Error(`Adapter ${store.name} still returns purged vectors`);
            }
            purgeProofs.push({
                adapter: store.name,
                absence: vectorIds.map((id) => ({ id, present: false })),
                diff,
            });
        }
        const impacted = await this.chunkStore.getImpactedDocuments(ids);
        const reindexed = [];
        for (const doc of impacted) {
            const rebuilt = await this.rechunkAndEmbed(doc);
            const nextVersion = doc.version + 1;
            const normalizedChunks = rebuilt.chunks.map((chunk) => ({
                ...chunk,
                version: nextVersion,
            }));
            await this.chunkStore.replaceChunks(doc.id, normalizedChunks);
            const chunkPayload = normalizedChunks.map((chunk) => ({ ...chunk }));
            const documentPayload = { ...doc, version: nextVersion };
            await this.audit.append({
                runId: request.runId,
                type: 'chunk.replace',
                payload: {
                    documentId: doc.id,
                    chunkCount: normalizedChunks.length,
                    version: nextVersion,
                    checksum: checksumChunks(normalizedChunks),
                    chunks: chunkPayload,
                    document: documentPayload,
                },
            });
            for (const store of this.vectorStores) {
                const documents = normalizedChunks.map((chunk) => ({
                    id: `${doc.id}:${chunk.id}`,
                    values: chunk.embedding,
                    metadata: {
                        documentId: doc.id,
                        version: chunk.version,
                        text: chunk.text,
                    },
                }));
                await store.upsert(documents);
                await this.audit.append({
                    runId: request.runId,
                    type: 'vector.upsert',
                    payload: {
                        adapter: store.name,
                        documentId: doc.id,
                        documents,
                    },
                });
            }
            reindexed.push(doc.id);
        }
        const completedAt = new Date().toISOString();
        await this.audit.append({
            runId: request.runId,
            type: 'purge.completed',
            payload: { ids, proofs: purgeProofs, reindexed },
            timestamp: completedAt,
        });
        return {
            runId: request.runId,
            proofs: purgeProofs,
            purgedIds: ids,
            reindexedDocuments: reindexed,
            startedAt,
            completedAt,
        };
    }
    async replay(runId, context) {
        const events = await this.audit.readAll();
        const filtered = events.filter((event) => event.runId === runId);
        filtered.sort((a, b) => a.sequence - b.sequence);
        for (const event of filtered) {
            switch (event.type) {
                case 'vector.delete':
                    await context.applyVectorDelete(event.payload.adapter, event.payload.ids);
                    break;
                case 'vector.upsert':
                    await context.applyVectorUpsert(event.payload.adapter, (event.payload.documents ?? []).map((doc) => ({
                        ...doc,
                    })));
                    break;
                case 'chunk.replace':
                    await context.applyChunkReplace(event.payload.documentId, (event.payload.chunks ?? []).map((chunk) => ({
                        ...chunk,
                    })), event.payload.document);
                    break;
                default:
                    break;
            }
        }
    }
    async rechunkAndEmbed(document) {
        const chunks = await this.chunking.chunk(document);
        return { documentId: document.id, chunks };
    }
}
exports.KnowledgePurgeReindexOrchestrator = KnowledgePurgeReindexOrchestrator;
function computeDiff(before, after) {
    const beforeSet = new Set(before.ids);
    const afterSet = new Set(after.ids);
    const removed = Array.from(beforeSet).filter((id) => !afterSet.has(id));
    const added = Array.from(afterSet).filter((id) => !beforeSet.has(id));
    removed.sort();
    added.sort();
    return {
        beforeRevision: before.revision,
        afterRevision: after.revision,
        removed,
        added,
    };
}
function checksumChunks(chunks) {
    const hash = crypto_1.default.createHash('sha1');
    for (const chunk of chunks) {
        hash.update(chunk.id);
        hash.update(chunk.text);
        hash.update(chunk.embedding.join(','));
    }
    return hash.digest('hex');
}
function expandVectorIds(ids, chunkIndex) {
    const vectorIds = new Set();
    for (const id of ids) {
        const chunks = chunkIndex.get(id);
        if (!chunks || chunks.length === 0) {
            vectorIds.add(id);
            continue;
        }
        for (const chunk of chunks) {
            vectorIds.add(`${id}:${chunk.id}`);
        }
    }
    return Array.from(vectorIds);
}
