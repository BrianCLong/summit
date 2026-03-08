"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryChunkStore = exports.SimpleTextChunkingStrategy = void 0;
const crypto_1 = __importDefault(require("crypto"));
class SimpleTextChunkingStrategy {
    embedding;
    constructor(embedding) {
        this.embedding = embedding;
    }
    tokenize(text) {
        const sentences = text
            .split(/(?<=[.!?])\s+/)
            .map((s) => s.trim())
            .filter(Boolean);
        if (sentences.length === 0)
            return [text];
        const chunks = [];
        let current = '';
        for (const sentence of sentences) {
            if ((current + ' ' + sentence).trim().length > 400) {
                if (current)
                    chunks.push(current.trim());
                current = sentence;
            }
            else {
                current = `${current} ${sentence}`.trim();
            }
        }
        if (current)
            chunks.push(current.trim());
        return chunks;
    }
    async chunk(document) {
        const texts = this.tokenize(document.text);
        const chunks = [];
        let index = 0;
        for (const text of texts) {
            const embedding = await this.embedding(text);
            chunks.push({
                id: crypto_1.default
                    .createHash('sha1')
                    .update(`${document.id}:${index}:${text}`)
                    .digest('hex'),
                documentId: document.id,
                text,
                embedding,
                version: document.version,
            });
            index++;
        }
        return chunks;
    }
}
exports.SimpleTextChunkingStrategy = SimpleTextChunkingStrategy;
class InMemoryChunkStore {
    documents = new Map();
    chunks = new Map();
    registerDocument(document, chunks) {
        this.documents.set(document.id, document);
        this.chunks.set(document.id, chunks);
    }
    linkDocuments(documentId, relatedIds) {
        const doc = this.documents.get(documentId);
        if (!doc)
            throw new Error(`Document ${documentId} not registered`);
        doc.relatedIds = Array.from(new Set([...(doc.relatedIds ?? []), ...relatedIds]));
        this.documents.set(documentId, doc);
    }
    async deleteByDocumentIds(ids) {
        let removed = 0;
        for (const id of ids) {
            if (this.documents.delete(id)) {
                removed++;
            }
            this.chunks.delete(id);
        }
        return removed;
    }
    async getImpactedDocuments(removedIds) {
        const impacted = [];
        for (const doc of this.documents.values()) {
            if (!doc.relatedIds || doc.relatedIds.length === 0)
                continue;
            if (doc.relatedIds.some((id) => removedIds.includes(id))) {
                impacted.push({ ...doc });
            }
        }
        return impacted;
    }
    async replaceChunks(documentId, chunks) {
        if (!this.documents.has(documentId)) {
            throw new Error(`Document ${documentId} not found`);
        }
        this.chunks.set(documentId, chunks.map((c) => ({ ...c })));
        const doc = this.documents.get(documentId);
        this.documents.set(documentId, { ...doc, version: doc.version + 1 });
    }
    async listChunks(documentId) {
        return (this.chunks.get(documentId) ?? []).map((c) => ({ ...c }));
    }
}
exports.InMemoryChunkStore = InMemoryChunkStore;
