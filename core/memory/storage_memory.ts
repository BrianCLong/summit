<<<<<<< HEAD
import { MemoryBroker } from "./broker";
import { MemoryRecord, MemoryScope } from "./types";
import { canRead, canWrite } from "./policy";
import { randomUUID } from "crypto";

export class InMemoryMemoryBroker implements MemoryBroker {
  private records: MemoryRecord[] = [];

  async remember(
    recordData: Omit<MemoryRecord, "id" | "createdAt">
  ): Promise<MemoryRecord> {
    const decision = canWrite(recordData);
    if (!decision.allow) {
      throw new Error(`Write denied: ${decision.reason}`);
    }

    const record: MemoryRecord = {
      ...recordData,
      id: randomUUID(),
      createdAt: Date.now(),
    };

    this.records.push(record);
    return record;
  }

  async recall(scope: MemoryScope): Promise<MemoryRecord[]> {
    return this.records.filter((record) => {
      const decision = canRead(scope, record);
      return decision.allow;
    });
  }

  async update(id: string, updates: Partial<MemoryRecord>): Promise<MemoryRecord> {
    const index = this.records.findIndex((r) => r.id === id);
    if (index === -1) {
      throw new Error(`Record ${id} not found`);
    }

    const updatedRecord = {
      ...this.records[index],
      ...updates,
      id: this.records[index].id, // Ensure ID doesn't change
      userId: this.records[index].userId, // Ensure userId doesn't change via update
    };

    this.records[index] = updatedRecord;
    return updatedRecord;
  }

  async forget(id: string): Promise<void> {
    const index = this.records.findIndex((r) => r.id === id);
    if (index !== -1) {
      this.records.splice(index, 1);
    }
  }

  async export(userId: string, contextSpace: string): Promise<string> {
    const userRecords = this.records.filter(
      (r) => r.userId === userId && r.contextSpace === contextSpace
    );
    return JSON.stringify(userRecords); // In real impl, this would be encrypted
  }

  // Helper for tests to see all records regardless of policy
  __getAllRecords(): MemoryRecord[] {
    return [...this.records];
  }
=======
import { IMemoryStorage } from './broker';
import { MemoryRecord, MemoryScope } from './types';

export class InMemoryMemoryStorage implements IMemoryStorage {
  private records: Map<string, MemoryRecord> = new Map();

  async save(record: MemoryRecord): Promise<void> {
    this.records.set(record.id, record);
  }

  async get(id: string): Promise<MemoryRecord | null> {
    return this.records.get(id) || null;
  }

  async search(scope: MemoryScope): Promise<MemoryRecord[]> {
    return Array.from(this.records.values()).filter(r =>
      r.purpose === scope.purpose &&
      r.contextSpace === scope.contextSpace
    );
  }

  async delete(id: string): Promise<void> {
    this.records.delete(id);
  }

  async list(userId: string, scope?: Partial<MemoryScope>): Promise<MemoryRecord[]> {
    return Array.from(this.records.values()).filter(r => {
      if (r.userId !== userId) return false;
      if (scope?.purpose && r.purpose !== scope.purpose) return false;
      if (scope?.contextSpace && r.contextSpace !== scope.contextSpace) return false;
      return true;
    });
  }
>>>>>>> origin/main
}
