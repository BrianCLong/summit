"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityResolutionService = void 0;
const store_js_1 = require("../store.js");
const uuid_1 = require("uuid");
class EntityResolutionService {
    store;
    constructor() {
        this.store = new store_js_1.GraphStore();
    }
    /**
     * Resolves an incoming entity to a canonical Global ID.
     * Strategies:
     * 1. Exact Match: Look up by (tenantId, entityType, sourceRefs.externalId)
     * 2. Alias Match: Look up by known aliases (e.g. email for Actors)
     * 3. Create New: If no match, generate new Global ID
     */
    async resolve(tenantId, entityType, externalId, source, hints = {}) {
        // 1. Try to find existing node by source reference
        // We need a specialized query for this.
        // Ideally, we maintain a separate index or look inside the JSON blob.
        // For MVP performance, we might assume a property 'externalIds' or strict 'sourceRefs' search.
        // Let's assume we query by a custom index-friendly property `externalId_{source}` if practical,
        // or just search the JSON. To scale, we'd promote externalId to a property or use an index.
        // Efficient approach: MERGE on specific property if source is canonical (like 'maestro').
        // General approach: Search.
        // Mock implementation of search logic:
        // MATCH (n) WHERE n.tenantId = $tenantId AND any(ref IN n.sourceRefs WHERE ref.provider = $source AND ref.externalId = $id)
        // Since we don't have that helper in Store yet, we'll simulate logic:
        // Strategy: Deterministic UUIDv5 based on source+id if it's a stable source?
        // No, we want cross-source merging (GitHub User <-> Slack User).
        // Heuristic: Email
        if (entityType === 'Actor' && hints.email) {
            // Try finding by email
            const existing = await this.store.findNodeByAttribute(tenantId, 'email', hints.email);
            if (existing) {
                return { globalId: existing.globalId, isNew: false, confidence: 0.9 };
            }
        }
        // Try finding by name if no email
        if (hints.name) {
            const existing = await this.store.findNodeByAttribute(tenantId, 'name', hints.name);
            if (existing) {
                // Name is weaker evidence
                return { globalId: existing.globalId, isNew: false, confidence: 0.7 };
            }
        }
        // Default: Generate a new ID if not found
        return {
            globalId: (0, uuid_1.v4)(),
            isNew: true,
            confidence: 1.0
        };
    }
}
exports.EntityResolutionService = EntityResolutionService;
