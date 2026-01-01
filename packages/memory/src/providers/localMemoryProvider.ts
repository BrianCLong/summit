import { MemoryAddInput, MemoryRecord, MemorySearchInput, MemorySearchResult, MemoryType, MemoryMetadata } from '../types.js';
import { MemoryProvider } from './memoryProvider.js';
import { applyRecencyBoost, cosineSimilarity, embedText } from '../utils/embedding.js';
import { redactPrivateContent } from '../utils/redaction.js';

const DEFAULT_THRESHOLD = 0.2;
const DEFAULT_LIMIT = 10;

export class LocalMemoryProvider implements MemoryProvider {
  private records: MemoryRecord[] = [];
  private embeddings = new Map<string, Map<string, number>>();

  private generateId(): string {
    return `mem-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  async addMemory(input: MemoryAddInput): Promise<MemoryRecord> {
    const now = new Date();
    const id = input.id ?? this.generateId();
    const sanitizedContent = redactPrivateContent(input.content);
    const record: MemoryRecord = {
      id,
      tenantId: input.tenantId,
      userId: input.userId,
      scope: input.scope,
      projectId: input.projectId,
      type: input.type,
      content: sanitizedContent,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    };
    this.records.push(record);
    this.embeddings.set(record.id, embedText(sanitizedContent));
    return record;
  }

  async searchMemories(input: MemorySearchInput): Promise<MemorySearchResult[]> {
    const queryEmbedding = embedText(redactPrivateContent(input.query));
    const threshold = input.threshold ?? DEFAULT_THRESHOLD;
    const limit = input.limit ?? DEFAULT_LIMIT;

    const filtered = this.records.filter((record) => {
      if (record.tenantId !== input.tenantId || record.userId !== input.userId) return false;
      if (input.scope && record.scope !== input.scope) return false;
      if (input.projectId && record.projectId !== input.projectId) return false;
      return true;
    });

    const scored = filtered
      .map((record) => {
        const embedding = this.embeddings.get(record.id) ?? embedText(record.content);
        const score = cosineSimilarity(queryEmbedding, embedding);
        return { record, score: applyRecencyBoost(score, record) };
      })
      .filter((result) => result.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored;
  }

  async listMemories(
    tenantId: string,
    userId: string,
    scope?: string,
    projectId?: string,
    limit: number = DEFAULT_LIMIT
  ): Promise<MemoryRecord[]> {
    return this.records
      .filter((record) => {
        if (record.tenantId !== tenantId || record.userId !== userId) return false;
        if (scope && record.scope !== scope) return false;
        if (projectId && record.projectId !== projectId) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async forgetMemory(tenantId: string, userId: string, memoryId: string): Promise<boolean> {
    const index = this.records.findIndex(
      (record) => record.id === memoryId && record.tenantId === tenantId && record.userId === userId
    );
    if (index === -1) return false;
    this.records.splice(index, 1);
    this.embeddings.delete(memoryId);
    return true;
  }

  async upsertProfileFact(
    tenantId: string,
    userId: string,
    scope: 'user' | 'project',
    projectId: string | undefined,
    content: string,
    metadata?: MemoryMetadata
  ): Promise<MemoryRecord> {
    const existing = this.records.find(
      (record) =>
        record.tenantId === tenantId &&
        record.userId === userId &&
        record.scope === scope &&
        record.projectId === projectId &&
        (record.type === 'profile' || record.type === 'preference') &&
        record.content === content
    );

    if (existing) {
      existing.updatedAt = new Date();
      existing.metadata = { ...existing.metadata, ...metadata };
      this.embeddings.set(existing.id, embedText(existing.content));
      return existing;
    }

    return this.addMemory({
      tenantId,
      userId,
      scope,
      projectId,
      type: 'profile' as MemoryType,
      content,
      metadata,
    });
  }
}
