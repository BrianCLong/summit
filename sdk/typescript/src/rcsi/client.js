"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RCSIClient = void 0;
const proof_1 = require("./proof");
const defaultHeaders = {
    'Content-Type': 'application/json',
};
class RCSIClient {
    baseUrl;
    fetchImpl;
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/$/, '');
        this.fetchImpl = options.fetchImpl ?? fetch;
    }
    async addDocument(document) {
        await this.post('/documents', document);
    }
    async applyRedaction(event) {
        if (event.type === 'document') {
            await this.post('/redactions/document', {
                documentId: event.documentId,
                reason: event.reason,
            });
        }
        else {
            await this.post('/redactions/term', {
                term: event.term,
                documentId: event.documentId,
                reason: event.reason,
            });
        }
    }
    async selectiveReindex(documentIds) {
        await this.post('/reindex', { documentIds });
    }
    async reconcile() {
        return this.get('/reconcile');
    }
    async snapshot() {
        return this.get('/snapshot');
    }
    async getDocumentProof(documentId) {
        const proof = await this.get(`/proofs/doc/${encodeURIComponent(documentId)}`);
        return proof;
    }
    async getTermProof(term, documentId) {
        const proof = await this.get(`/proofs/term/${encodeURIComponent(term)}?documentId=${encodeURIComponent(documentId)}`);
        return proof;
    }
    async validateDocumentProof(documentId, snapshot) {
        const proof = await this.getDocumentProof(documentId);
        const snap = snapshot ?? (await this.snapshot());
        (0, proof_1.validateProof)(proof, snap);
    }
    async validateTermProof(term, documentId, snapshot) {
        const proof = await this.getTermProof(term, documentId);
        const snap = snapshot ?? (await this.snapshot());
        (0, proof_1.validateProof)(proof, snap);
    }
    async post(path, body) {
        const response = await this.fetchImpl(this.buildUrl(path), {
            method: 'POST',
            headers: defaultHeaders,
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            throw new Error(`request failed (${response.status}): ${await response.text()}`);
        }
    }
    async get(path) {
        const response = await this.fetchImpl(this.buildUrl(path));
        if (!response.ok) {
            throw new Error(`request failed (${response.status}): ${await response.text()}`);
        }
        return (await response.json());
    }
    buildUrl(path) {
        return `${this.baseUrl}${path}`;
    }
}
exports.RCSIClient = RCSIClient;
