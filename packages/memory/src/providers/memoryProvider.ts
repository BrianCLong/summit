import { MemoryAddInput, MemoryMetadata, MemoryRecord, MemorySearchInput, MemorySearchResult } from '../types.js';

export interface MemoryProvider {
  addMemory(input: MemoryAddInput): Promise<MemoryRecord>;
  searchMemories(input: MemorySearchInput): Promise<MemorySearchResult[]>;
  listMemories(tenantId: string, userId: string, scope?: string, projectId?: string, limit?: number): Promise<MemoryRecord[]>;
  forgetMemory(tenantId: string, userId: string, memoryId: string): Promise<boolean>;
  upsertProfileFact(
    tenantId: string,
    userId: string,
    scope: 'user' | 'project',
    projectId: string | undefined,
    content: string,
    metadata?: MemoryMetadata
  ): Promise<MemoryRecord>;
}

export type ProviderInitializer = () => MemoryProvider;
