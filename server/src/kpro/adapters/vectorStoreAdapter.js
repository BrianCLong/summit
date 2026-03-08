"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeaviateVectorStoreAdapter = exports.PineconeVectorStoreAdapter = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const crypto_1 = __importDefault(require("crypto"));
const defaultFetch = typeof fetch !== 'undefined'
    ? fetch.bind(globalThis)
    : node_fetch_1.default;
class PineconeVectorStoreAdapter {
    name = 'pinecone';
    fetch;
    baseUrl;
    namespace;
    apiKey;
    constructor(options) {
        if (!options.indexHost) {
            throw new Error('Pinecone indexHost is required');
        }
        if (!options.apiKey) {
            throw new Error('Pinecone apiKey is required');
        }
        this.apiKey = options.apiKey;
        this.namespace = options.namespace;
        this.baseUrl = `https://${options.indexHost}`.replace(/\/$/, '');
        this.fetch = options.fetch ?? defaultFetch;
    }
    headers() {
        return {
            'Content-Type': 'application/json',
            'Api-Key': this.apiKey,
        };
    }
    async removeByIds(ids) {
        if (!ids.length) {
            return { removed: [] };
        }
        const res = await this.fetch(`${this.baseUrl}/vectors/delete`, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify({ ids, namespace: this.namespace }),
        });
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`Pinecone delete failed: ${res.status} ${body}`);
        }
        return { removed: ids.slice() };
    }
    async fetchByIds(ids) {
        if (!ids.length)
            return [];
        const res = await this.fetch(`${this.baseUrl}/vectors/fetch`, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify({ ids, namespace: this.namespace }),
        });
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`Pinecone fetch failed: ${res.status} ${body}`);
        }
        const data = await res.json();
        const vectors = data.vectors ?? {};
        return Object.keys(vectors).map((id) => ({
            id,
            values: vectors[id].values ?? [],
            metadata: vectors[id].metadata ?? {},
            namespace: this.namespace,
        }));
    }
    async upsert(documents) {
        if (!documents.length)
            return;
        const res = await this.fetch(`${this.baseUrl}/vectors/upsert`, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify({
                namespace: this.namespace,
                vectors: documents.map((doc) => ({
                    id: doc.id,
                    values: doc.values,
                    metadata: doc.metadata ?? {},
                })),
            }),
        });
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`Pinecone upsert failed: ${res.status} ${body}`);
        }
    }
    async snapshot() {
        const ids = [];
        let next;
        do {
            const payload = {
                namespace: this.namespace,
                pagination: { limit: 1000 },
            };
            if (next)
                payload.pagination.next = next;
            const res = await this.fetch(`${this.baseUrl}/vectors/list`, {
                method: 'POST',
                headers: this.headers(),
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const body = await res.text();
                throw new Error(`Pinecone list failed: ${res.status} ${body}`);
            }
            const data = await res.json();
            ids.push(...(data.vectors ?? []).map((v) => v.id));
            next = data.pagination?.next;
        } while (next);
        ids.sort();
        return {
            adapter: this.name,
            ids,
            revision: crypto_1.default.createHash('sha1').update(ids.join('|')).digest('hex'),
        };
    }
}
exports.PineconeVectorStoreAdapter = PineconeVectorStoreAdapter;
class WeaviateVectorStoreAdapter {
    name = 'weaviate';
    fetch;
    baseUrl;
    className;
    apiKey;
    constructor(options) {
        if (!options.host) {
            throw new Error('Weaviate host is required');
        }
        if (!options.className) {
            throw new Error('Weaviate className is required');
        }
        this.baseUrl = `${options.scheme || 'https'}://${options.host}`.replace(/\/$/, '');
        this.className = options.className;
        this.apiKey = options.apiKey;
        this.fetch = options.fetch ?? defaultFetch;
    }
    headers() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.apiKey)
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        return headers;
    }
    async removeByIds(ids) {
        const removed = [];
        for (const id of ids) {
            const res = await this.fetch(`${this.baseUrl}/v1/objects/${this.className}/${id}`, {
                method: 'DELETE',
                headers: this.headers(),
            });
            if (!res.ok && res.status !== 404) {
                const body = await res.text();
                throw new Error(`Weaviate delete failed: ${res.status} ${body}`);
            }
            removed.push(id);
        }
        return { removed };
    }
    async fetchByIds(ids) {
        const docs = [];
        for (const id of ids) {
            const res = await this.fetch(`${this.baseUrl}/v1/objects/${this.className}/${id}`, {
                method: 'GET',
                headers: this.headers(),
            });
            if (res.status === 404)
                continue;
            if (!res.ok) {
                const body = await res.text();
                throw new Error(`Weaviate fetch failed: ${res.status} ${body}`);
            }
            const data = await res.json();
            docs.push({
                id,
                values: data.vector ?? [],
                metadata: data.properties ?? {},
            });
        }
        return docs;
    }
    async upsert(documents) {
        if (!documents.length)
            return;
        const res = await this.fetch(`${this.baseUrl}/v1/batch/objects`, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify({
                objects: documents.map((doc) => ({
                    class: this.className,
                    id: doc.id,
                    properties: doc.metadata ?? {},
                    vector: doc.values,
                })),
            }),
        });
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`Weaviate upsert failed: ${res.status} ${body}`);
        }
    }
    async snapshot() {
        const ids = [];
        let after;
        do {
            const res = await this.fetch(`${this.baseUrl}/v1/graphql`, {
                method: 'POST',
                headers: this.headers(),
                body: JSON.stringify({
                    query: `{
            Get {
              ${this.className}(
                limit: 1000
                after: ${after ? `"${after}"` : 'null'}
              ) {
                _additional {
                  id
                  vectorWeights
                }
              }
            }
          }`,
                }),
            });
            if (!res.ok) {
                const body = await res.text();
                throw new Error(`Weaviate snapshot failed: ${res.status} ${body}`);
            }
            const data = await res.json();
            const batch = data?.data?.Get?.[this.className] ?? [];
            if (!Array.isArray(batch) || !batch.length) {
                after = undefined;
                break;
            }
            ids.push(...batch.map((item) => item._additional?.id).filter(Boolean));
            after = batch[batch.length - 1]?._additional?.id;
        } while (after);
        ids.sort();
        return {
            adapter: this.name,
            ids,
            revision: crypto_1.default.createHash('sha1').update(ids.join('|')).digest('hex'),
        };
    }
}
exports.WeaviateVectorStoreAdapter = WeaviateVectorStoreAdapter;
