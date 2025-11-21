/**
 * Comprehensive LLM Audit Logging System
 *
 * Features:
 * - Full request/response logging
 * - Database persistence (PostgreSQL)
 * - Compliance tagging (GDPR, HIPAA, SOC2)
 * - Retention policies with auto-cleanup
 * - Query interface for investigations
 * - Export capabilities for audits
 * - Cryptographic integrity verification
 */

import { Logger } from '../observability/logger.js';
import { Metrics } from '../observability/metrics.js';
import crypto from 'crypto';

const logger = new Logger('LLMAuditLogger');
const metrics = new Metrics();

export interface AuditEntry {
  id: string;
  timestamp: Date;

  // Request context
  userId: string;
  tenantId?: string;
  sessionId?: string;
  conversationId?: string;

  // Model information
  modelProvider: string;
  modelName: string;
  modelVersion?: string;

  // Request details
  requestType: 'completion' | 'chat' | 'embedding' | 'moderation';
  promptHash: string;
  promptLength: number;
  promptTokens?: number;
  containsPII: boolean;
  piiTypes?: string[];

  // Response details
  responseHash?: string;
  responseLength?: number;
  responseTokens?: number;
  completionTime?: number;

  // Security details
  moderationResult?: string;
  guardrailsApplied: string[];
  riskScore: number;
  blocked: boolean;
  blockReason?: string;

  // Metadata
  clientIp?: string;
  userAgent?: string;
  apiVersion?: string;
  metadata?: Record<string, unknown>;

  // Integrity
  integrityHash: string;
  previousEntryHash?: string;
}

export interface AuditQuery {
  userId?: string;
  tenantId?: string;
  startDate?: Date;
  endDate?: Date;
  modelProvider?: string;
  modelName?: string;
  blocked?: boolean;
  containsPII?: boolean;
  minRiskScore?: number;
  limit?: number;
  offset?: number;
}

export interface AuditStats {
  totalRequests: number;
  blockedRequests: number;
  piiDetections: number;
  avgRiskScore: number;
  avgCompletionTime: number;
  requestsByModel: Record<string, number>;
  requestsByUser: Record<string, number>;
}

export interface RetentionPolicy {
  name: string;
  conditions: {
    containsPII?: boolean;
    minRiskScore?: number;
    tenantId?: string;
  };
  retentionDays: number;
}

/**
 * LLM Audit Logger with Database Persistence
 */
export class LLMAuditLogger {
  private entries: Map<string, AuditEntry> = new Map();
  private lastEntryHash: string | null = null;
  private retentionPolicies: RetentionPolicy[] = [];
  private dbPool: unknown = null; // Would be pg.Pool in production

  constructor() {
    // Initialize default retention policies
    this.retentionPolicies = [
      {
        name: 'pii-data',
        conditions: { containsPII: true },
        retentionDays: 30,
      },
      {
        name: 'high-risk',
        conditions: { minRiskScore: 0.7 },
        retentionDays: 90,
      },
      {
        name: 'default',
        conditions: {},
        retentionDays: 365,
      },
    ];

    // Start cleanup job
    setInterval(() => this.runRetentionCleanup(), 3600000); // Every hour

    logger.info('LLM Audit Logger initialized');
  }

  /**
   * Log an LLM request
   */
  async logRequest(params: {
    userId: string;
    tenantId?: string;
    sessionId?: string;
    conversationId?: string;
    modelProvider: string;
    modelName: string;
    modelVersion?: string;
    requestType: AuditEntry['requestType'];
    prompt: string;
    promptTokens?: number;
    containsPII: boolean;
    piiTypes?: string[];
    clientIp?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    const id = crypto.randomUUID();
    const timestamp = new Date();

    const entry: AuditEntry = {
      id,
      timestamp,
      userId: params.userId,
      tenantId: params.tenantId,
      sessionId: params.sessionId,
      conversationId: params.conversationId,
      modelProvider: params.modelProvider,
      modelName: params.modelName,
      modelVersion: params.modelVersion,
      requestType: params.requestType,
      promptHash: this.hashContent(params.prompt),
      promptLength: params.prompt.length,
      promptTokens: params.promptTokens,
      containsPII: params.containsPII,
      piiTypes: params.piiTypes,
      clientIp: params.clientIp,
      userAgent: params.userAgent,
      metadata: params.metadata,
      guardrailsApplied: [],
      riskScore: 0,
      blocked: false,
      integrityHash: '', // Will be set below
    };

    // Calculate integrity hash (chain to previous entry)
    entry.previousEntryHash = this.lastEntryHash || undefined;
    entry.integrityHash = this.calculateIntegrityHash(entry);
    this.lastEntryHash = entry.integrityHash;

    // Store entry
    this.entries.set(id, entry);

    // Persist to database
    await this.persistEntry(entry);

    // Emit metrics
    metrics.counter('llm_audit_requests_logged', {
      provider: params.modelProvider,
      model: params.modelName,
      hasPII: String(params.containsPII),
    });

    logger.debug('Audit entry created', {
      id,
      userId: params.userId,
      model: params.modelName,
    });

    return id;
  }

  /**
   * Update audit entry with response details
   */
  async logResponse(params: {
    auditId: string;
    response: string;
    responseTokens?: number;
    completionTime: number;
    moderationResult?: string;
    guardrailsApplied?: string[];
    riskScore?: number;
    blocked?: boolean;
    blockReason?: string;
  }): Promise<void> {
    const entry = this.entries.get(params.auditId);
    if (!entry) {
      logger.warn('Audit entry not found for response', { auditId: params.auditId });
      return;
    }

    // Update entry
    entry.responseHash = this.hashContent(params.response);
    entry.responseLength = params.response.length;
    entry.responseTokens = params.responseTokens;
    entry.completionTime = params.completionTime;
    entry.moderationResult = params.moderationResult;
    entry.guardrailsApplied = params.guardrailsApplied || [];
    entry.riskScore = params.riskScore || 0;
    entry.blocked = params.blocked || false;
    entry.blockReason = params.blockReason;

    // Recalculate integrity hash
    entry.integrityHash = this.calculateIntegrityHash(entry);

    // Persist update
    await this.updateEntry(entry);

    // Emit metrics
    metrics.histogram('llm_audit_completion_time_ms', params.completionTime, {
      model: entry.modelName,
    });

    if (params.blocked) {
      metrics.counter('llm_audit_blocked_requests', {
        reason: params.blockReason || 'unknown',
      });
    }
  }

  /**
   * Query audit entries
   */
  async query(query: AuditQuery): Promise<AuditEntry[]> {
    const results: AuditEntry[] = [];

    for (const entry of this.entries.values()) {
      if (this.matchesQuery(entry, query)) {
        results.push(entry);
      }
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;

    return results.slice(offset, offset + limit);
  }

  /**
   * Get audit entry by ID
   */
  async getEntry(id: string): Promise<AuditEntry | null> {
    return this.entries.get(id) || null;
  }

  /**
   * Get audit statistics
   */
  async getStats(query?: AuditQuery): Promise<AuditStats> {
    const entries = query ? await this.query({ ...query, limit: 10000 }) : Array.from(this.entries.values());

    const stats: AuditStats = {
      totalRequests: entries.length,
      blockedRequests: 0,
      piiDetections: 0,
      avgRiskScore: 0,
      avgCompletionTime: 0,
      requestsByModel: {},
      requestsByUser: {},
    };

    let totalRiskScore = 0;
    let totalCompletionTime = 0;
    let completionCount = 0;

    for (const entry of entries) {
      if (entry.blocked) stats.blockedRequests++;
      if (entry.containsPII) stats.piiDetections++;
      totalRiskScore += entry.riskScore;

      if (entry.completionTime) {
        totalCompletionTime += entry.completionTime;
        completionCount++;
      }

      const modelKey = `${entry.modelProvider}/${entry.modelName}`;
      stats.requestsByModel[modelKey] = (stats.requestsByModel[modelKey] || 0) + 1;
      stats.requestsByUser[entry.userId] = (stats.requestsByUser[entry.userId] || 0) + 1;
    }

    stats.avgRiskScore = entries.length > 0 ? totalRiskScore / entries.length : 0;
    stats.avgCompletionTime = completionCount > 0 ? totalCompletionTime / completionCount : 0;

    return stats;
  }

  /**
   * Export audit entries for compliance reports
   */
  async export(query: AuditQuery, format: 'json' | 'csv'): Promise<string> {
    const entries = await this.query({ ...query, limit: 100000 });

    if (format === 'csv') {
      return this.toCSV(entries);
    }

    return JSON.stringify(entries, null, 2);
  }

  /**
   * Verify integrity of audit chain
   */
  async verifyIntegrity(startId?: string): Promise<{
    valid: boolean;
    invalidEntries: string[];
    checkedCount: number;
  }> {
    const invalidEntries: string[] = [];
    let checkedCount = 0;

    const entries = Array.from(this.entries.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    let previousHash: string | null = null;

    for (const entry of entries) {
      checkedCount++;

      // Verify previous hash chain
      if (previousHash && entry.previousEntryHash !== previousHash) {
        invalidEntries.push(entry.id);
        logger.error('Integrity chain broken', {
          entryId: entry.id,
          expectedPrevious: previousHash,
          actualPrevious: entry.previousEntryHash,
        });
      }

      // Verify entry integrity hash
      const calculatedHash = this.calculateIntegrityHash({
        ...entry,
        integrityHash: '', // Exclude from calculation
      });

      if (calculatedHash !== entry.integrityHash) {
        invalidEntries.push(entry.id);
        logger.error('Integrity hash mismatch', {
          entryId: entry.id,
          expected: calculatedHash,
          actual: entry.integrityHash,
        });
      }

      previousHash = entry.integrityHash;
    }

    return {
      valid: invalidEntries.length === 0,
      invalidEntries,
      checkedCount,
    };
  }

  /**
   * Delete user data (GDPR compliance)
   */
  async deleteUserData(userId: string): Promise<number> {
    let deletedCount = 0;

    for (const [id, entry] of this.entries.entries()) {
      if (entry.userId === userId) {
        this.entries.delete(id);
        deletedCount++;
      }
    }

    // Also delete from database
    await this.deleteFromDatabase({ userId });

    logger.info('User audit data deleted', { userId, count: deletedCount });
    metrics.counter('llm_audit_user_data_deleted', { count: String(deletedCount) });

    return deletedCount;
  }

  /**
   * Add retention policy
   */
  addRetentionPolicy(policy: RetentionPolicy): void {
    this.retentionPolicies.push(policy);
    logger.info('Retention policy added', { name: policy.name });
  }

  /**
   * Run retention cleanup
   */
  private async runRetentionCleanup(): Promise<void> {
    const now = Date.now();
    let deletedCount = 0;

    for (const [id, entry] of this.entries.entries()) {
      const policy = this.getApplicablePolicy(entry);
      const retentionMs = policy.retentionDays * 24 * 60 * 60 * 1000;
      const entryAge = now - entry.timestamp.getTime();

      if (entryAge > retentionMs) {
        this.entries.delete(id);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      logger.info('Retention cleanup completed', { deleted: deletedCount });
      metrics.counter('llm_audit_retention_cleanup', { count: String(deletedCount) });
    }
  }

  private getApplicablePolicy(entry: AuditEntry): RetentionPolicy {
    for (const policy of this.retentionPolicies) {
      const { conditions } = policy;

      if (conditions.containsPII !== undefined && conditions.containsPII !== entry.containsPII) {
        continue;
      }

      if (conditions.minRiskScore !== undefined && entry.riskScore < conditions.minRiskScore) {
        continue;
      }

      if (conditions.tenantId !== undefined && conditions.tenantId !== entry.tenantId) {
        continue;
      }

      return policy;
    }

    // Return default if no policy matches
    return this.retentionPolicies[this.retentionPolicies.length - 1];
  }

  private hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private calculateIntegrityHash(entry: Omit<AuditEntry, 'integrityHash'> & { integrityHash?: string }): string {
    const data = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp,
      userId: entry.userId,
      promptHash: entry.promptHash,
      responseHash: entry.responseHash,
      riskScore: entry.riskScore,
      blocked: entry.blocked,
      previousEntryHash: entry.previousEntryHash,
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private matchesQuery(entry: AuditEntry, query: AuditQuery): boolean {
    if (query.userId && entry.userId !== query.userId) return false;
    if (query.tenantId && entry.tenantId !== query.tenantId) return false;
    if (query.startDate && entry.timestamp < query.startDate) return false;
    if (query.endDate && entry.timestamp > query.endDate) return false;
    if (query.modelProvider && entry.modelProvider !== query.modelProvider) return false;
    if (query.modelName && entry.modelName !== query.modelName) return false;
    if (query.blocked !== undefined && entry.blocked !== query.blocked) return false;
    if (query.containsPII !== undefined && entry.containsPII !== query.containsPII) return false;
    if (query.minRiskScore !== undefined && entry.riskScore < query.minRiskScore) return false;

    return true;
  }

  private async persistEntry(entry: AuditEntry): Promise<void> {
    // In production, this would insert into PostgreSQL
    // For now, we just log
    logger.debug('Persisting audit entry', { id: entry.id });

    // Example SQL:
    // INSERT INTO llm_audit_log (id, timestamp, user_id, tenant_id, ...)
    // VALUES ($1, $2, $3, $4, ...)
  }

  private async updateEntry(entry: AuditEntry): Promise<void> {
    // In production, this would update PostgreSQL
    logger.debug('Updating audit entry', { id: entry.id });

    // Example SQL:
    // UPDATE llm_audit_log SET response_hash = $1, completion_time = $2, ...
    // WHERE id = $3
  }

  private async deleteFromDatabase(criteria: { userId?: string; tenantId?: string }): Promise<void> {
    // In production, this would delete from PostgreSQL
    logger.debug('Deleting from database', criteria);

    // Example SQL:
    // DELETE FROM llm_audit_log WHERE user_id = $1
  }

  private toCSV(entries: AuditEntry[]): string {
    const headers = [
      'id', 'timestamp', 'userId', 'tenantId', 'modelProvider', 'modelName',
      'requestType', 'promptLength', 'responseLength', 'completionTime',
      'containsPII', 'riskScore', 'blocked', 'blockReason',
    ];

    const rows = entries.map((entry) => [
      entry.id,
      entry.timestamp.toISOString(),
      entry.userId,
      entry.tenantId || '',
      entry.modelProvider,
      entry.modelName,
      entry.requestType,
      entry.promptLength,
      entry.responseLength || '',
      entry.completionTime || '',
      entry.containsPII,
      entry.riskScore,
      entry.blocked,
      entry.blockReason || '',
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }
}

// Export singleton
export const llmAuditLogger = new LLMAuditLogger();
