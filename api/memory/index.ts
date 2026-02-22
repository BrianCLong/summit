import { MemoryBroker } from "../../core/memory/broker";
import { Purpose, MemoryRecord } from "../../core/memory/types";

/**
 * Controller for User Memory API (DSAR-grade controls).
 * Provides endpoints for users to view, edit, delete, and export their memories.
 */
export class MemoryApiController {
  constructor(private broker: MemoryBroker) {}

  /**
   * GET /v1/memory?contextSpace=&purpose=
   */
  async listMemories(userId: string, contextSpace: string, purpose: Purpose) {
    // In a real API, we would enforce that userId matches the requester.
    return await this.broker.recall({ userId, contextSpace, purpose });
  }

  /**
   * PATCH /v1/memory/{id}
   */
  async updateMemory(id: string, updates: Partial<MemoryRecord>) {
    const updated = await this.broker.update(id, updates);
    return { id, success: true, updated: updated.id };
  }

  /**
   * DELETE /v1/memory/{id}
   */
  async deleteMemory(id: string) {
    await this.broker.forget(id);
    return { id, success: true, deleted: true };
  }

  /**
   * POST /v1/memory/export
   */
  async exportMemories(userId: string, contextSpace: string) {
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
