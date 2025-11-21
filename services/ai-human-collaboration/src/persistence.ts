/**
 * Persistence Interface for AI-Human Collaboration Service
 * Enables pluggable storage backends (PostgreSQL, Redis, etc.)
 */

import {
  Recommendation,
  CommanderDecision,
  OperatorFeedback,
  MissionAuditEntry,
  CollaborationSession,
  TrainingBatch,
} from './types.js';

/**
 * Query options for pagination and filtering
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

/**
 * Filter criteria for recommendations
 */
export interface RecommendationFilter {
  missionId?: string;
  confidenceBand?: string;
  riskLevel?: string;
  requiresApproval?: boolean;
  expired?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
}

/**
 * Filter criteria for decisions
 */
export interface DecisionFilter {
  missionId?: string;
  recommendationId?: string;
  commanderId?: string;
  outcome?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

/**
 * Filter criteria for feedback
 */
export interface FeedbackFilter {
  missionId?: string;
  recommendationId?: string;
  operatorId?: string;
  sentiment?: string;
  wasCorrect?: boolean;
  minRating?: number;
  maxRating?: number;
}

/**
 * Filter criteria for audit entries
 */
export interface AuditFilter {
  missionId?: string;
  eventType?: string;
  eventCategory?: string;
  actorType?: string;
  actorId?: string;
  fromTime?: Date;
  toTime?: Date;
}

/**
 * Repository interface for Recommendations
 */
export interface RecommendationRepository {
  save(recommendation: Recommendation): Promise<Recommendation>;
  findById(id: string): Promise<Recommendation | null>;
  findByMissionId(missionId: string, options?: QueryOptions): Promise<Recommendation[]>;
  findPending(missionId: string): Promise<Recommendation[]>;
  find(filter: RecommendationFilter, options?: QueryOptions): Promise<Recommendation[]>;
  count(filter: RecommendationFilter): Promise<number>;
  delete(id: string): Promise<boolean>;
  deleteExpired(): Promise<number>;
}

/**
 * Repository interface for Decisions
 */
export interface DecisionRepository {
  save(decision: CommanderDecision): Promise<CommanderDecision>;
  findById(id: string): Promise<CommanderDecision | null>;
  findByRecommendationId(recommendationId: string): Promise<CommanderDecision[]>;
  findByMissionId(missionId: string, options?: QueryOptions): Promise<CommanderDecision[]>;
  find(filter: DecisionFilter, options?: QueryOptions): Promise<CommanderDecision[]>;
  count(filter: DecisionFilter): Promise<number>;
}

/**
 * Repository interface for Feedback
 */
export interface FeedbackRepository {
  save(feedback: OperatorFeedback): Promise<OperatorFeedback>;
  findById(id: string): Promise<OperatorFeedback | null>;
  findByRecommendationId(recommendationId: string): Promise<OperatorFeedback[]>;
  findByMissionId(missionId: string, options?: QueryOptions): Promise<OperatorFeedback[]>;
  findUnprocessed(options?: QueryOptions): Promise<OperatorFeedback[]>;
  find(filter: FeedbackFilter, options?: QueryOptions): Promise<OperatorFeedback[]>;
  count(filter: FeedbackFilter): Promise<number>;
  markProcessed(ids: string[], batchId: string): Promise<void>;
}

/**
 * Repository interface for Audit Entries
 */
export interface AuditRepository {
  save(entry: MissionAuditEntry): Promise<MissionAuditEntry>;
  findById(id: string): Promise<MissionAuditEntry | null>;
  findByMissionId(missionId: string, options?: QueryOptions): Promise<MissionAuditEntry[]>;
  find(filter: AuditFilter, options?: QueryOptions): Promise<MissionAuditEntry[]>;
  count(filter: AuditFilter): Promise<number>;
  getLastHash(missionId: string): Promise<string | null>;
}

/**
 * Repository interface for Sessions
 */
export interface SessionRepository {
  save(session: CollaborationSession): Promise<CollaborationSession>;
  findById(id: string): Promise<CollaborationSession | null>;
  findByMissionId(missionId: string): Promise<CollaborationSession | null>;
  findActive(): Promise<CollaborationSession[]>;
  update(id: string, updates: Partial<CollaborationSession>): Promise<CollaborationSession>;
}

/**
 * Repository interface for Training Batches
 */
export interface TrainingBatchRepository {
  save(batch: TrainingBatch): Promise<TrainingBatch>;
  findById(id: string): Promise<TrainingBatch | null>;
  findPending(): Promise<TrainingBatch[]>;
  update(id: string, updates: Partial<TrainingBatch>): Promise<TrainingBatch>;
}

/**
 * Combined persistence interface
 */
export interface CollaborationPersistence {
  recommendations: RecommendationRepository;
  decisions: DecisionRepository;
  feedback: FeedbackRepository;
  audit: AuditRepository;
  sessions: SessionRepository;
  trainingBatches: TrainingBatchRepository;

  // Transaction support
  transaction<T>(fn: () => Promise<T>): Promise<T>;

  // Health check
  healthCheck(): Promise<{ healthy: boolean; latencyMs: number }>;

  // Cleanup
  close(): Promise<void>;
}

/**
 * In-memory implementation for testing and development
 */
export class InMemoryPersistence implements CollaborationPersistence {
  private recommendationsStore = new Map<string, Recommendation>();
  private decisionsStore = new Map<string, CommanderDecision>();
  private feedbackStore = new Map<string, OperatorFeedback>();
  private auditStore = new Map<string, MissionAuditEntry>();
  private sessionsStore = new Map<string, CollaborationSession>();
  private batchesStore = new Map<string, TrainingBatch>();
  private processedFeedback = new Set<string>();

  recommendations: RecommendationRepository = {
    save: async (rec) => {
      this.recommendationsStore.set(rec.id, rec);
      return rec;
    },
    findById: async (id) => this.recommendationsStore.get(id) || null,
    findByMissionId: async (missionId) =>
      Array.from(this.recommendationsStore.values()).filter(
        (r) => r.missionId === missionId
      ),
    findPending: async (missionId) => {
      const now = new Date();
      return Array.from(this.recommendationsStore.values()).filter(
        (r) => r.missionId === missionId && new Date(r.expiresAt) > now && r.requiresApproval
      );
    },
    find: async (filter) => {
      return Array.from(this.recommendationsStore.values()).filter((r) => {
        if (filter.missionId && r.missionId !== filter.missionId) return false;
        if (filter.riskLevel && r.riskLevel !== filter.riskLevel) return false;
        if (filter.requiresApproval !== undefined && r.requiresApproval !== filter.requiresApproval) return false;
        return true;
      });
    },
    count: async (filter) => (await this.recommendations.find(filter)).length,
    delete: async (id) => this.recommendationsStore.delete(id),
    deleteExpired: async () => {
      const now = new Date();
      let count = 0;
      for (const [id, rec] of this.recommendationsStore) {
        if (new Date(rec.expiresAt) < now) {
          this.recommendationsStore.delete(id);
          count++;
        }
      }
      return count;
    },
  };

  decisions: DecisionRepository = {
    save: async (dec) => {
      this.decisionsStore.set(dec.id, dec);
      return dec;
    },
    findById: async (id) => this.decisionsStore.get(id) || null,
    findByRecommendationId: async (recId) =>
      Array.from(this.decisionsStore.values()).filter((d) => d.recommendationId === recId),
    findByMissionId: async (missionId) =>
      Array.from(this.decisionsStore.values()).filter((d) => d.missionId === missionId),
    find: async (filter) => {
      return Array.from(this.decisionsStore.values()).filter((d) => {
        if (filter.missionId && d.missionId !== filter.missionId) return false;
        if (filter.commanderId && d.commanderId !== filter.commanderId) return false;
        if (filter.outcome && d.outcome !== filter.outcome) return false;
        return true;
      });
    },
    count: async (filter) => (await this.decisions.find(filter)).length,
  };

  feedback: FeedbackRepository = {
    save: async (fb) => {
      this.feedbackStore.set(fb.id, fb);
      return fb;
    },
    findById: async (id) => this.feedbackStore.get(id) || null,
    findByRecommendationId: async (recId) =>
      Array.from(this.feedbackStore.values()).filter((f) => f.recommendationId === recId),
    findByMissionId: async (missionId) =>
      Array.from(this.feedbackStore.values()).filter((f) => f.missionId === missionId),
    findUnprocessed: async () =>
      Array.from(this.feedbackStore.values()).filter((f) => !this.processedFeedback.has(f.id)),
    find: async (filter) => {
      return Array.from(this.feedbackStore.values()).filter((f) => {
        if (filter.missionId && f.missionId !== filter.missionId) return false;
        if (filter.operatorId && f.operatorId !== filter.operatorId) return false;
        if (filter.sentiment && f.sentiment !== filter.sentiment) return false;
        if (filter.wasCorrect !== undefined && f.wasCorrect !== filter.wasCorrect) return false;
        return true;
      });
    },
    count: async (filter) => (await this.feedback.find(filter)).length,
    markProcessed: async (ids, _batchId) => {
      ids.forEach((id) => this.processedFeedback.add(id));
    },
  };

  audit: AuditRepository = {
    save: async (entry) => {
      this.auditStore.set(entry.id, entry);
      return entry;
    },
    findById: async (id) => this.auditStore.get(id) || null,
    findByMissionId: async (missionId) =>
      Array.from(this.auditStore.values())
        .filter((e) => e.missionId === missionId)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    find: async (filter) => {
      return Array.from(this.auditStore.values()).filter((e) => {
        if (filter.missionId && e.missionId !== filter.missionId) return false;
        if (filter.eventType && e.eventType !== filter.eventType) return false;
        if (filter.actorType && e.actor.type !== filter.actorType) return false;
        return true;
      });
    },
    count: async (filter) => (await this.audit.find(filter)).length,
    getLastHash: async (missionId) => {
      const entries = await this.audit.findByMissionId(missionId);
      return entries.length > 0 ? entries[entries.length - 1].hash : null;
    },
  };

  sessions: SessionRepository = {
    save: async (session) => {
      this.sessionsStore.set(session.id, session);
      return session;
    },
    findById: async (id) => this.sessionsStore.get(id) || null,
    findByMissionId: async (missionId) =>
      Array.from(this.sessionsStore.values()).find(
        (s) => s.missionId === missionId && s.status === 'active'
      ) || null,
    findActive: async () =>
      Array.from(this.sessionsStore.values()).filter((s) => s.status === 'active'),
    update: async (id, updates) => {
      const session = this.sessionsStore.get(id);
      if (!session) throw new Error(`Session not found: ${id}`);
      const updated = { ...session, ...updates };
      this.sessionsStore.set(id, updated);
      return updated;
    },
  };

  trainingBatches: TrainingBatchRepository = {
    save: async (batch) => {
      this.batchesStore.set(batch.id, batch);
      return batch;
    },
    findById: async (id) => this.batchesStore.get(id) || null,
    findPending: async () =>
      Array.from(this.batchesStore.values()).filter((b) => b.status === 'pending'),
    update: async (id, updates) => {
      const batch = this.batchesStore.get(id);
      if (!batch) throw new Error(`Batch not found: ${id}`);
      const updated = { ...batch, ...updates };
      this.batchesStore.set(id, updated);
      return updated;
    },
  };

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    // In-memory doesn't need real transactions
    return fn();
  }

  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number }> {
    const start = Date.now();
    return { healthy: true, latencyMs: Date.now() - start };
  }

  async close(): Promise<void> {
    this.recommendationsStore.clear();
    this.decisionsStore.clear();
    this.feedbackStore.clear();
    this.auditStore.clear();
    this.sessionsStore.clear();
    this.batchesStore.clear();
  }
}
