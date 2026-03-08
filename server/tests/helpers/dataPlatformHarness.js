"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDataPlatformHarness = exports.loadFixtureText = exports.DataPlatformHarness = exports.deterministicEmbed = void 0;
const crypto_1 = __importDefault(require("crypto"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const chunkStore_js_1 = require("../../src/kpro/chunk/chunkStore.js");
const deterministicEmbed = async (text) => {
    const normalized = text.toLowerCase();
    const terms = ['power', 'sensor', 'deployment', 'maintenance', 'ai'];
    const counts = terms.map((term) => (normalized.match(new RegExp(term, 'g')) || []).length);
    const lengthComponent = Math.max(1, Math.round(text.length / 25));
    const hash = crypto_1.default.createHash('sha1').update(text).digest('hex');
    const hashComponent = parseInt(hash.slice(0, 8), 16) % 997;
    return [...counts, lengthComponent, hashComponent];
};
exports.deterministicEmbed = deterministicEmbed;
class InMemoryVectorStore {
    name = 'memory';
    vectors = new Map();
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
        const revision = crypto_1.default
            .createHash('sha1')
            .update(ids.join('|'))
            .digest('hex');
        return { adapter: this.name, ids, revision };
    }
    queryByEmbedding(embedding, topK) {
        const scored = Array.from(this.vectors.values()).map((doc) => ({
            doc,
            score: cosineSimilarity(doc.values, embedding),
        }));
        scored.sort((a, b) => {
            if (b.score === a.score)
                return a.doc.id.localeCompare(b.doc.id);
            return b.score - a.score;
        });
        return scored.slice(0, topK).map(({ doc, score }) => ({
            vectorId: doc.id,
            chunkId: String(doc.metadata?.chunkId ?? ''),
            text: String(doc.metadata?.text ?? ''),
            score,
        }));
    }
}
const cosineSimilarity = (a, b) => {
    const minLength = Math.min(a.length, b.length);
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < minLength; i++) {
        dot += a[i] * b[i];
        magA += a[i] ** 2;
        magB += b[i] ** 2;
    }
    if (magA === 0 || magB === 0)
        return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
};
class DataPlatformHarness {
    chunkStore;
    vectorStore;
    chunking;
    constructor(embeddingFn = exports.deterministicEmbed) {
        this.chunkStore = new chunkStore_js_1.InMemoryChunkStore();
        this.vectorStore = new InMemoryVectorStore();
        this.chunking = new chunkStore_js_1.SimpleTextChunkingStrategy(embeddingFn);
    }
    async ingestDocument(id, text) {
        const document = { id, text, version: 1 };
        const chunks = await this.chunking.chunk(document);
        this.chunkStore.registerDocument(document, chunks);
        await this.vectorStore.upsert(chunks.map((chunk) => ({
            id: `${document.id}:${chunk.id}`,
            values: chunk.embedding,
            metadata: {
                documentId: document.id,
                chunkId: chunk.id,
                text: chunk.text,
            },
        })));
        return { document, chunks };
    }
    async retrieve(question, topK = 3) {
        const embedding = await (0, exports.deterministicEmbed)(question);
        const matches = this.vectorStore.queryByEmbedding(embedding, topK);
        return { matches, chunkIds: matches.map((m) => m.chunkId) };
    }
    async ragAnswer(question, retrieval) {
        const evidence = retrieval.matches
            .map((match) => `${match.text} [${match.chunkId}]`)
            .join(' ');
        return {
            answer: `${question} → ${evidence}`,
            citations: retrieval.matches.map((match) => ({
                chunkId: match.chunkId,
                text: match.text,
            })),
        };
    }
}
exports.DataPlatformHarness = DataPlatformHarness;
const loadFixtureText = async (relativePath) => {
    const resolved = path_1.default.resolve(process.cwd(), 'tests', relativePath);
    return promises_1.default.readFile(resolved, 'utf-8');
};
exports.loadFixtureText = loadFixtureText;
const createDataPlatformHarness = () => new DataPlatformHarness();
exports.createDataPlatformHarness = createDataPlatformHarness;
