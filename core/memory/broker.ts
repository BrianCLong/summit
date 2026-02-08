import { MemoryRecord, MemoryScope, Purpose } from './types';
import { canRead, canWrite } from './policy';
import { redact } from '../privacy/redact';
import { RedactionClass } from '../privacy/classification';

export interface ToolManifest {
  id: string;
  allowed_context_spaces: string[];
  redaction_classes: RedactionClass[];
}

export interface IMemoryStorage {
  save(record: MemoryRecord): Promise<void>;
  get(id: string): Promise<MemoryRecord | null>;
  search(scope: MemoryScope): Promise<MemoryRecord[]>;
  delete(id: string): Promise<void>;
  list(userId: string, scope?: Partial<MemoryScope>): Promise<MemoryRecord[]>;
}

export class MemoryBroker {
  constructor(private storage: IMemoryStorage) {}

  async remember(record: Omit<MemoryRecord, 'createdAt'>): Promise<string> {
    const fullRecord: MemoryRecord = {
      ...record,
      createdAt: Date.now(),
    };

    const decision = canWrite(fullRecord);
    if (!decision.allow) {
      throw new Error(`Memory write denied: ${decision.reason}`);
    }

    await this.storage.save(fullRecord);
    return fullRecord.id;
  }

  async retrieve(id: string, requestScope: MemoryScope): Promise<MemoryRecord | null> {
    const record = await this.storage.get(id);
    if (!record) return null;

    const decision = canRead(requestScope, record);
    if (!decision.allow) {
      console.warn(`Memory read denied for ${id}: ${decision.reason}`);
      return null;
    }

    return record;
  }

  async search(requestScope: MemoryScope): Promise<MemoryRecord[]> {
    const records = await this.storage.search(requestScope);
    // Double-check with policy evaluator
    return records.filter(r => canRead(requestScope, r).allow);
  }

  /**
   * Safe egress for tool calls.
   * Enforces tool-specific context isolation and applies redaction.
   */
  async toolEgress(toolId: string, requestScope: MemoryScope, manifest: ToolManifest[]): Promise<string[]> {
    const tool = manifest.find(t => t.id === toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} is not registered in manifest. Egress denied by default.`);
    }

    // 1. Enforce Tool-specific Context Isolation
    if (!tool.allowed_context_spaces.includes(requestScope.contextSpace)) {
      console.error(`Tool ${toolId} attempted to access unauthorized context: ${requestScope.contextSpace}`);
      return [];
    }

    // 2. Retrieve memories (matching tool's allowed scope)
    const records = await this.search(requestScope);

    // 3. Apply Redaction
    return records.map(r => redact(r.content, tool.redaction_classes));
  }
}
