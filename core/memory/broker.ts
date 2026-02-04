import { MemoryRecord, MemoryScope } from "./types";

export interface MemoryBroker {
  /**
   * Stores a new memory record.
   */
  remember(record: Omit<MemoryRecord, "id" | "createdAt">): Promise<MemoryRecord>;

  /**
   * Retrieves memories matching the given scope.
   */
  recall(scope: MemoryScope): Promise<MemoryRecord[]>;

  /**
   * Updates an existing memory record.
   */
  update(id: string, updates: Partial<MemoryRecord>): Promise<MemoryRecord>;

  /**
   * Forgets a specific memory record by ID.
   */
  forget(id: string): Promise<void>;

  /**
   * Exports all memories for a user within a context space.
   */
  export(userId: string, contextSpace: string): Promise<string>; // Returns encrypted bundle
}
