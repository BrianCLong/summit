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
}
