import { MemoryProvider } from './providers/memoryProvider.js';
import { LocalMemoryProvider } from './providers/localMemoryProvider.js';
import { SupermemoryProvider } from './providers/supermemoryProvider.js';
import { MemoryAddInput, MemoryMetadata, MemoryRecord, MemorySearchInput, MemorySearchResult, MemoryType } from './types.js';
import { redactPrivateContent } from './utils/redaction.js';

export class MemoryService {
  private provider: MemoryProvider;

  constructor(provider?: MemoryProvider) {
    if (provider) {
      this.provider = provider;
      return;
    }
    const selected = process.env.MEMORY_PROVIDER ?? 'local';
    if (selected === 'supermemory') {
      const apiKey = process.env.SUPERMEMORY_API_KEY;
      if (!apiKey) {
        throw new Error('SUPERMEMORY_API_KEY is required when MEMORY_PROVIDER=supermemory');
      }
      this.provider = new SupermemoryProvider(apiKey);
    } else {
      this.provider = new LocalMemoryProvider();
    }
  }

  async addMemory(input: MemoryAddInput): Promise<MemoryRecord> {
    return this.provider.addMemory({ ...input, content: redactPrivateContent(input.content) });
  }

  async searchMemories(input: MemorySearchInput): Promise<MemorySearchResult[]> {
    return this.provider.searchMemories(input);
  }

  async listMemories(
    tenantId: string,
    userId: string,
    scope?: string,
    projectId?: string,
    limit?: number
  ): Promise<MemoryRecord[]> {
    return this.provider.listMemories(tenantId, userId, scope, projectId, limit);
  }

  async forgetMemory(tenantId: string, userId: string, memoryId: string): Promise<boolean> {
    return this.provider.forgetMemory(tenantId, userId, memoryId);
  }

  async upsertProfileFact(
    tenantId: string,
    userId: string,
    scope: 'user' | 'project',
    projectId: string | undefined,
    content: string,
    metadata?: MemoryMetadata
  ): Promise<MemoryRecord> {
    return this.provider.upsertProfileFact(tenantId, userId, scope, projectId, redactPrivateContent(content), metadata);
  }
}

export const createMemoryService = (provider?: MemoryProvider): MemoryService => new MemoryService(provider);
