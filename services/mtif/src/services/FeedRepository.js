"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLLECTION_DEFAULT_ID = exports.FeedRepository = void 0;
const node_crypto_1 = require("node:crypto");
const StixValidator_js_1 = require("./StixValidator.js");
class FeedRepository {
    collections = new Map();
    constructor(initialCollections) {
        initialCollections?.forEach((collection) => {
            this.collections.set(collection.id, { ...collection, objects: [] });
        });
    }
    upsertCollection(collection) {
        const existing = this.collections.get(collection.id);
        if (existing) {
            existing.title = collection.title;
            existing.description = collection.description;
            existing.alias = collection.alias;
            existing.can_read = collection.can_read;
            existing.can_write = collection.can_write;
            return;
        }
        this.collections.set(collection.id, { ...collection, objects: [] });
    }
    listCollections() {
        return Array.from(this.collections.values()).map(({ objects: _objects, ...rest }) => rest);
    }
    ingestBundle(collectionId, bundle) {
        if (!this.collections.has(collectionId)) {
            this.upsertCollection({
                id: collectionId,
                alias: 'mtif-llm-threats',
                title: 'Model Threat Intelligence Feed',
                description: 'STIX 2.1 bundle of LLM threat intelligence artifacts',
                can_read: true,
                can_write: true
            });
        }
        StixValidator_js_1.stixValidator.validateBundle(bundle);
        const state = this.collections.get(collectionId);
        if (!state) {
            throw new Error(`Collection ${collectionId} not found after creation`);
        }
        for (const object of bundle.objects) {
            const modified = object.modified ?? object.created;
            state.objects.push({
                object,
                modified,
                id: `${object.type}::${object.id}`
            });
        }
        state.objects.sort((a, b) => {
            if (a.modified === b.modified) {
                return a.id.localeCompare(b.id);
            }
            return a.modified.localeCompare(b.modified);
        });
    }
    getObjects(collectionId, options = {}) {
        const state = this.collections.get(collectionId);
        if (!state) {
            throw new Error(`Collection ${collectionId} not found`);
        }
        const limit = Math.max(1, Math.min(options.limit ?? 10, 1000));
        let startIndex = 0;
        if (options.next) {
            try {
                const decoded = JSON.parse(Buffer.from(options.next, 'base64url').toString('utf-8'));
                if (decoded.token !== state.id) {
                    throw new Error('Next token does not match collection');
                }
                startIndex = decoded.index;
            }
            catch (error) {
                throw new Error(`Invalid pagination token: ${error.message}`);
            }
        }
        let filtered = state.objects;
        if (options.added_after) {
            filtered = filtered.filter((entry) => entry.modified > options.added_after);
        }
        if (options.match) {
            filtered = filtered.filter(({ object }) => {
                return Object.entries(options.match).every(([key, value]) => {
                    const objectValue = object[key];
                    if (Array.isArray(objectValue)) {
                        return objectValue.includes(value);
                    }
                    return objectValue === value;
                });
            });
        }
        const slice = filtered.slice(startIndex, startIndex + limit).map((entry) => entry.object);
        const more = startIndex + limit < filtered.length;
        return {
            objects: slice,
            more,
            next: more
                ? Buffer.from(JSON.stringify({ index: startIndex + limit, token: state.id }), 'utf-8').toString('base64url')
                : undefined
        };
    }
    exportBundle(collectionId, objectIds) {
        const state = this.collections.get(collectionId);
        if (!state) {
            throw new Error(`Collection ${collectionId} not found`);
        }
        const objects = state.objects
            .filter(({ object }) => objectIds.includes(object.id))
            .map(({ object }) => object);
        const bundle = {
            id: `bundle--${(0, node_crypto_1.randomUUID)()}`,
            spec_version: '2.1',
            type: 'bundle',
            objects
        };
        StixValidator_js_1.stixValidator.validateBundle(bundle);
        return bundle;
    }
}
exports.FeedRepository = FeedRepository;
exports.COLLECTION_DEFAULT_ID = 'collection--mtif-llm-threats';
