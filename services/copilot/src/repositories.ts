/**
 * Copilot Repositories
 *
 * Implementations for:
 * - DraftQueryRepository: Stores draft queries for preview → execute flow
 * - CopilotAuditLog: Immutable audit trail of all copilot operations
 *
 * Both have in-memory implementations for development/testing
 * and can be extended with database-backed implementations.
 */

import type {
  CopilotDraftQuery,
  DraftQueryRepository,
  CopilotAuditLog,
  CopilotAuditRecord,
} from './types.js';

// =============================================================================
// In-Memory Draft Query Repository
// =============================================================================

/**
 * In-memory implementation of DraftQueryRepository.
 * Suitable for development and testing.
 * For production, use a database-backed implementation.
 */
export class InMemoryDraftQueryRepository implements DraftQueryRepository {
  private drafts: Map<string, CopilotDraftQuery> = new Map();
  private userDraftIndex: Map<string, Set<string>> = new Map();
  private maxDraftsPerUser: number;

  constructor(maxDraftsPerUser = 100) {
    this.maxDraftsPerUser = maxDraftsPerUser;
  }

  async save(draft: CopilotDraftQuery): Promise<void> {
    // Store the draft
    this.drafts.set(draft.id, draft);

    // Update user index
    const userId = draft.createdBy;
    if (!this.userDraftIndex.has(userId)) {
      this.userDraftIndex.set(userId, new Set());
    }
    const userDrafts = this.userDraftIndex.get(userId)!;
    userDrafts.add(draft.id);

    // Enforce per-user limit by removing oldest drafts
    if (userDrafts.size > this.maxDraftsPerUser) {
      const draftsToRemove = await this.getOldestDraftsForUser(
        userId,
        userDrafts.size - this.maxDraftsPerUser,
      );
      for (const oldDraft of draftsToRemove) {
        this.drafts.delete(oldDraft.id);
        userDrafts.delete(oldDraft.id);
      }
    }
  }

  async getById(id: string): Promise<CopilotDraftQuery | null> {
    return this.drafts.get(id) || null;
  }

  async deleteById(id: string): Promise<boolean> {
    const draft = this.drafts.get(id);
    if (!draft) return false;

    this.drafts.delete(id);

    // Update user index
    const userDrafts = this.userDraftIndex.get(draft.createdBy);
    if (userDrafts) {
      userDrafts.delete(id);
    }

    return true;
  }

  async getByUserId(userId: string, limit = 10): Promise<CopilotDraftQuery[]> {
    const draftIds = this.userDraftIndex.get(userId);
    if (!draftIds || draftIds.size === 0) return [];

    const drafts: CopilotDraftQuery[] = [];
    for (const id of draftIds) {
      const draft = this.drafts.get(id);
      if (draft) drafts.push(draft);
    }

    // Sort by creation date descending and limit
    return drafts
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async deleteExpired(): Promise<number> {
    const now = Date.now();
    let deletedCount = 0;

    for (const [id, draft] of this.drafts) {
      if (draft.expiresAt && new Date(draft.expiresAt).getTime() < now) {
        await this.deleteById(id);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  private async getOldestDraftsForUser(
    userId: string,
    count: number,
  ): Promise<CopilotDraftQuery[]> {
    const allDrafts = await this.getByUserId(userId, Infinity);
    return allDrafts
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, count);
  }

  // For testing
  clear(): void {
    this.drafts.clear();
    this.userDraftIndex.clear();
  }

  size(): number {
    return this.drafts.size;
  }
}

// =============================================================================
// In-Memory Audit Log
// =============================================================================

/**
 * In-memory implementation of CopilotAuditLog.
 * Suitable for development and testing.
 * For production, use a database-backed implementation with proper retention.
 */
export class InMemoryAuditLog implements CopilotAuditLog {
  private records: CopilotAuditRecord[] = [];
  private userIndex: Map<string, CopilotAuditRecord[]> = new Map();
  private draftIndex: Map<string, CopilotAuditRecord[]> = new Map();
  private maxRecords: number;

  constructor(maxRecords = 10000) {
    this.maxRecords = maxRecords;
  }

  async append(record: CopilotAuditRecord): Promise<void> {
    // Add to main list
    this.records.push(record);

    // Update user index
    if (!this.userIndex.has(record.userId)) {
      this.userIndex.set(record.userId, []);
    }
    this.userIndex.get(record.userId)!.push(record);

    // Update draft index
    if (record.draftId) {
      if (!this.draftIndex.has(record.draftId)) {
        this.draftIndex.set(record.draftId, []);
      }
      this.draftIndex.get(record.draftId)!.push(record);
    }

    // Enforce max records by removing oldest
    if (this.records.length > this.maxRecords) {
      const removed = this.records.shift();
      if (removed) {
        // Clean up indexes (simplified - production would need better cleanup)
        const userRecords = this.userIndex.get(removed.userId);
        if (userRecords) {
          const idx = userRecords.indexOf(removed);
          if (idx >= 0) userRecords.splice(idx, 1);
        }
      }
    }
  }

  async getByUserId(userId: string, limit = 100): Promise<CopilotAuditRecord[]> {
    const records = this.userIndex.get(userId) || [];
    return records
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async getByDraftId(draftId: string): Promise<CopilotAuditRecord[]> {
    const records = this.draftIndex.get(draftId) || [];
    return records
      .slice()
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // Additional query methods

  async getByAction(
    action: CopilotAuditRecord['action'],
    limit = 100,
  ): Promise<CopilotAuditRecord[]> {
    return this.records
      .filter((r) => r.action === action)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async getByTenantId(tenantId: string, limit = 100): Promise<CopilotAuditRecord[]> {
    return this.records
      .filter((r) => r.tenantId === tenantId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async getRecent(limit = 100): Promise<CopilotAuditRecord[]> {
    return this.records
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  // For testing
  clear(): void {
    this.records = [];
    this.userIndex.clear();
    this.draftIndex.clear();
  }

  size(): number {
    return this.records.length;
  }

  getAll(): CopilotAuditRecord[] {
    return this.records.slice();
  }
}

// =============================================================================
// Database-Backed Repository Stubs (for future implementation)
// =============================================================================

/**
 * PostgreSQL-backed draft query repository.
 * TODO: Implement with actual database calls.
 */
export class PostgresDraftQueryRepository implements DraftQueryRepository {
  constructor(
    private connectionString: string,
    private tableName = 'copilot_drafts',
  ) {}

  async save(draft: CopilotDraftQuery): Promise<void> {
    // TODO: Implement PostgreSQL INSERT/UPSERT
    throw new Error('PostgresDraftQueryRepository not implemented');
  }

  async getById(id: string): Promise<CopilotDraftQuery | null> {
    // TODO: Implement PostgreSQL SELECT
    throw new Error('PostgresDraftQueryRepository not implemented');
  }

  async deleteById(id: string): Promise<boolean> {
    // TODO: Implement PostgreSQL DELETE
    throw new Error('PostgresDraftQueryRepository not implemented');
  }

  async getByUserId(userId: string, limit?: number): Promise<CopilotDraftQuery[]> {
    // TODO: Implement PostgreSQL SELECT with user filter
    throw new Error('PostgresDraftQueryRepository not implemented');
  }

  async deleteExpired(): Promise<number> {
    // TODO: Implement PostgreSQL DELETE WHERE expires_at < NOW()
    throw new Error('PostgresDraftQueryRepository not implemented');
  }
}

/**
 * PostgreSQL-backed audit log.
 * TODO: Implement with actual database calls.
 */
export class PostgresAuditLog implements CopilotAuditLog {
  constructor(
    private connectionString: string,
    private tableName = 'copilot_audit_log',
  ) {}

  async append(record: CopilotAuditRecord): Promise<void> {
    // TODO: Implement PostgreSQL INSERT
    throw new Error('PostgresAuditLog not implemented');
  }

  async getByUserId(userId: string, limit?: number): Promise<CopilotAuditRecord[]> {
    // TODO: Implement PostgreSQL SELECT
    throw new Error('PostgresAuditLog not implemented');
  }

  async getByDraftId(draftId: string): Promise<CopilotAuditRecord[]> {
    // TODO: Implement PostgreSQL SELECT
    throw new Error('PostgresAuditLog not implemented');
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

export type RepositoryType = 'memory' | 'postgres';

export function createDraftQueryRepository(
  type: RepositoryType = 'memory',
  options?: { connectionString?: string; maxDraftsPerUser?: number },
): DraftQueryRepository {
  switch (type) {
    case 'memory':
      return new InMemoryDraftQueryRepository(options?.maxDraftsPerUser);
    case 'postgres':
      if (!options?.connectionString) {
        throw new Error('Connection string required for PostgreSQL repository');
      }
      return new PostgresDraftQueryRepository(options.connectionString);
    default:
      return new InMemoryDraftQueryRepository();
  }
}

export function createAuditLog(
  type: RepositoryType = 'memory',
  options?: { connectionString?: string; maxRecords?: number },
): CopilotAuditLog {
  switch (type) {
    case 'memory':
      return new InMemoryAuditLog(options?.maxRecords);
    case 'postgres':
      if (!options?.connectionString) {
        throw new Error('Connection string required for PostgreSQL audit log');
      }
      return new PostgresAuditLog(options.connectionString);
    default:
      return new InMemoryAuditLog();
  }
}
