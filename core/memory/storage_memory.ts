import { MemoryBroker } from "./broker";
import { MemoryRecord, MemoryScope } from "./types";
import { canRead, canWrite } from "./policy";
import { randomUUID } from "crypto";

export class InMemoryMemoryBroker implements MemoryBroker {
  private records: MemoryRecord[] = [];

  remember(recordData: Omit<MemoryRecord, "id" | "createdAt">): Promise<MemoryRecord> {
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
    return Promise.resolve(record);
  }

  recall(scope: MemoryScope): Promise<MemoryRecord[]> {
    const records = this.records.filter((record) => {
      const decision = canRead(scope, record);
      return decision.allow;
    });

    return Promise.resolve(records);
  }

  update(id: string, updates: Partial<MemoryRecord>): Promise<MemoryRecord> {
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
    return Promise.resolve(updatedRecord);
  }

  forget(id: string): Promise<void> {
    const index = this.records.findIndex((r) => r.id === id);
    if (index !== -1) {
      this.records.splice(index, 1);
    }

    return Promise.resolve();
  }

  export(userId: string, contextSpace: string): Promise<string> {
    const userRecords = this.records.filter(
      (r) => r.userId === userId && r.contextSpace === contextSpace
    );
    return Promise.resolve(JSON.stringify(userRecords)); // In real impl, this would be encrypted
  }

  // Helper for tests to see all records regardless of policy
  __getAllRecords(): MemoryRecord[] {
    return [...this.records];
  }
}
