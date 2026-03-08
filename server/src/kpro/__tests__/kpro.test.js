"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("fs/promises"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const kpro_js_1 = require("../kpro.js");
const chunkStore_js_1 = require("../chunk/chunkStore.js");
const auditLog_js_1 = require("../audit/auditLog.js");
const cacheInvalidator_js_1 = require("../cache/cacheInvalidator.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('KnowledgePurgeReindexOrchestrator', () => {
    const embed = async (text) => {
        const hash = crypto_1.default.createHash('sha1').update(text).digest('hex');
        const sum = text
            .split('')
            .reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return [text.length, sum % 997, parseInt(hash.slice(0, 8), 16) % 1000];
    };
    class InMemoryVectorStore {
        name;
        vectors = new Map();
        constructor(name) {
            this.name = name;
        }
        async removeByIds(ids) {
            const removed = [];
            for (const id of ids) {
                if (this.vectors.delete(id)) {
                    removed.push(id);
                }
            }
            return { removed };
        }
        async fetchByIds(ids) {
            return ids
                .map((id) => this.vectors.get(id))
                .filter((doc) => Boolean(doc))
                .map((doc) => ({ ...doc, metadata: { ...doc.metadata } }));
        }
        async upsert(documents) {
            for (const doc of documents) {
                this.vectors.set(doc.id, { ...doc, metadata: { ...doc.metadata } });
            }
        }
        async snapshot() {
            const ids = Array.from(this.vectors.keys()).sort();
            return {
                adapter: this.name,
                ids,
                revision: crypto_1.default.createHash('sha1').update(ids.join('|')).digest('hex'),
            };
        }
    }
    const setupAuditLog = async () => {
        const dir = await promises_1.default.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'kpro-test-'));
        const file = path_1.default.join(dir, 'audit.log');
        return { audit: new auditLog_js_1.JsonlAuditLog(file), dir };
    };
    (0, globals_1.it)('purges forgotten entities, rebuilds context, and replays deterministically', async () => {
        const chunkStore = new chunkStore_js_1.InMemoryChunkStore();
        const chunking = new chunkStore_js_1.SimpleTextChunkingStrategy(embed);
        const docA = {
            id: 'docA',
            text: 'Alpha intelligence dossier referencing obsolete threat actor.',
            version: 1,
        };
        const docB = {
            id: 'docB',
            text: 'Beta field notes citing docA for context integrity.',
            version: 1,
            relatedIds: ['docA'],
        };
        const chunksA = await chunking.chunk(docA);
        const chunksB = await chunking.chunk(docB);
        chunkStore.registerDocument(docA, chunksA);
        chunkStore.registerDocument(docB, chunksB);
        chunkStore.linkDocuments('docB', ['docA']);
        const { audit, dir } = await setupAuditLog();
        const cacheStore = new Map();
        const cache = new cacheInvalidator_js_1.InMemoryCacheInvalidator(cacheStore);
        const vectorStore = new InMemoryVectorStore('primary');
        await vectorStore.upsert(chunksA.map((chunk) => ({
            id: `docA:${chunk.id}`,
            values: chunk.embedding,
            metadata: { documentId: chunk.documentId, text: chunk.text },
        })));
        await vectorStore.upsert(chunksB.map((chunk) => ({
            id: `docB:${chunk.id}`,
            values: chunk.embedding,
            metadata: { documentId: chunk.documentId, text: chunk.text },
        })));
        cacheStore.set('docA', { cached: true });
        cacheStore.set('docB', { cached: true });
        const orchestrator = new kpro_js_1.KnowledgePurgeReindexOrchestrator({
            vectorStores: [vectorStore],
            chunkStore,
            chunkingStrategy: chunking,
            cacheInvalidators: [cache],
            auditLog: audit,
        });
        const forget = {
            runId: 'run-1',
            triggeredBy: 'compliance',
            issuedAt: new Date().toISOString(),
            forget: [{ id: 'docA', type: 'document', reason: 'RTBF request' }],
        };
        const summary = await orchestrator.purge(forget);
        const removedVectorIds = chunksA.map((chunk) => `docA:${chunk.id}`);
        (0, globals_1.expect)(summary.purgedIds).toEqual(['docA']);
        (0, globals_1.expect)(summary.proofs).toHaveLength(1);
        const proof = summary.proofs[0];
        (0, globals_1.expect)(proof.absence.map((a) => a.id).sort()).toEqual(removedVectorIds.sort());
        (0, globals_1.expect)(proof.absence.every((a) => a.present === false)).toBe(true);
        (0, globals_1.expect)(proof.diff.removed.sort()).toEqual(removedVectorIds.sort());
        (0, globals_1.expect)(proof.diff.added).toHaveLength(0);
        const fetched = await vectorStore.fetchByIds(removedVectorIds);
        (0, globals_1.expect)(fetched).toHaveLength(0);
        (0, globals_1.expect)(cacheStore.has('docA')).toBe(false);
        const finalSnapshot = await vectorStore.snapshot();
        const finalChunksB = await chunkStore.listChunks('docB');
        const replayVector = new InMemoryVectorStore('primary');
        const replayChunkStore = new chunkStore_js_1.InMemoryChunkStore();
        const replayContext = {
            applyVectorDelete: async (adapter, ids) => {
                if (adapter !== replayVector.name)
                    return;
                await replayVector.removeByIds(ids);
            },
            applyVectorUpsert: async (adapter, docs) => {
                if (adapter !== replayVector.name)
                    return;
                await replayVector.upsert(docs);
            },
            applyChunkReplace: async (documentId, chunks, document) => {
                const doc = document ?? {
                    id: documentId,
                    text: chunks.map((chunk) => chunk.text).join(' '),
                    version: chunks[0]?.version ?? 1,
                };
                replayChunkStore.registerDocument(doc, chunks);
            },
        };
        await orchestrator.replay('run-1', replayContext);
        const replaySnapshot = await replayVector.snapshot();
        (0, globals_1.expect)(replaySnapshot).toEqual(finalSnapshot);
        const replayChunksB = await replayChunkStore.listChunks('docB');
        (0, globals_1.expect)(replayChunksB).toEqual(finalChunksB);
        await promises_1.default.rm(dir, { recursive: true, force: true });
    });
});
