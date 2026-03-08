"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryApiController = void 0;
/**
 * Controller for User Memory API (DSAR-grade controls).
 * Provides endpoints for users to view, edit, delete, and export their memories.
 */
class MemoryApiController {
    broker;
    constructor(broker) {
        this.broker = broker;
    }
    /**
     * GET /v1/memory?contextSpace=&purpose=
     */
    async listMemories(userId, contextSpace, purpose) {
        // In a real API, we would enforce that userId matches the requester.
        return await this.broker.recall({ userId, contextSpace, purpose });
    }
    /**
     * PATCH /v1/memory/{id}
     */
    async updateMemory(id, updates) {
        const updated = await this.broker.update(id, updates);
        return { id, success: true, updated: updated.id };
    }
    /**
     * DELETE /v1/memory/{id}
     */
    async deleteMemory(id) {
        await this.broker.forget(id);
        return { id, success: true, deleted: true };
    }
    /**
     * POST /v1/memory/export
     */
    async exportMemories(userId, contextSpace) {
        const bundle = await this.broker.export(userId, contextSpace);
        return {
            userId,
            contextSpace,
            bundle,
            format: "json",
            timestamp: Date.now(),
        };
    }
}
exports.MemoryApiController = MemoryApiController;
