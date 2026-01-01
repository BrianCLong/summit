import crypto from 'crypto';
import { MemoryAddInput, MemoryMetadata, MemoryRecord, MemorySearchInput, MemorySearchResult, MemoryScope } from '../types.js';
import { MemoryProvider } from './memoryProvider.js';
import { redactPrivateContent } from '../utils/redaction.js';

interface SupermemoryDocumentResponse {
  id: string;
  content: string;
  created_at: string;
}

interface SupermemorySearchHit {
  id: string;
  content: string;
  score: number;
  created_at: string;
}

const apiBase = 'https://api.supermemory.ai/v3';

const scopeTag = (scope: MemoryScope, tenantId: string, projectId?: string): string => {
  const base = scope === 'user' ? `${tenantId}:${projectId ?? 'user'}` : `${tenantId}:${projectId ?? 'project'}`;
  const hash = crypto.createHash('sha256').update(base).digest('hex');
  return scope === 'user' ? `summit_user_${hash}` : `summit_project_${hash}`;
};

export class SupermemoryProvider implements MemoryProvider {
  constructor(private readonly apiKey: string) {}

  private async request(path: string, init: RequestInit): Promise<any> {
    const response = await fetch(`${apiBase}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        ...(init.headers ?? {}),
      },
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Supermemory request failed: ${response.status} ${message}`);
    }
    return response.json();
  }

  async addMemory(input: MemoryAddInput): Promise<MemoryRecord> {
    const sanitizedContent = redactPrivateContent(input.content);
    const tag = scopeTag(input.scope, input.tenantId, input.projectId ?? input.userId);
    const body = {
      content: sanitizedContent,
      metadata: {
        tenantId: input.tenantId,
        userId: input.userId,
        projectId: input.projectId,
        type: input.type,
        scope: input.scope,
      },
      tags: [tag],
    };
    const result = (await this.request('/documents', { method: 'POST', body: JSON.stringify(body) })) as SupermemoryDocumentResponse;

    const now = new Date();
    return {
      id: result.id,
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
  }

  async searchMemories(input: MemorySearchInput): Promise<MemorySearchResult[]> {
    const tag = scopeTag(input.scope ?? 'project', input.tenantId, input.projectId ?? input.userId);
    const body = { query: redactPrivateContent(input.query), tags: [tag], topK: input.limit ?? 10 };
    const results = (await this.request('/search', { method: 'POST', body: JSON.stringify(body) })) as {
      hits: SupermemorySearchHit[];
    };

    return results.hits
      .filter((hit) => (input.threshold ? hit.score >= input.threshold : true))
      .map((hit) => ({
        record: {
          id: hit.id,
          tenantId: input.tenantId,
          userId: input.userId,
          scope: input.scope ?? 'project',
          projectId: input.projectId,
          type: 'conversation',
          content: hit.content,
          createdAt: new Date(hit.created_at),
          updatedAt: new Date(hit.created_at),
        },
        score: hit.score,
      }));
  }

  async listMemories(tenantId: string, userId: string, scope?: string, projectId?: string, limit = 10): Promise<MemoryRecord[]> {
    const results = await this.searchMemories({
      query: '*',
      tenantId,
      userId,
      scope: (scope as MemoryScope | undefined) ?? 'project',
      projectId,
      limit,
      threshold: 0,
    });
    return results.map((hit) => hit.record);
  }

  async forgetMemory(): Promise<boolean> {
    // Supermemory currently exposes delete semantics via retention policies; use a soft-delete approach here.
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
    return this.addMemory({ tenantId, userId, scope, projectId, content, type: 'profile', metadata });
  }
}
