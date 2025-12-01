/**
 * MissionTraceability - Full audit trail for all automated actions
 * Provides tamper-evident logging with hash-chain integrity
 */

import { randomUUID, createHash } from 'crypto';
import {
  MissionAuditEntry,
  Recommendation,
  CommanderDecision,
  OperatorFeedback,
} from './types.js';

type EventType = MissionAuditEntry['eventType'];
type EventCategory = MissionAuditEntry['eventCategory'];
type ActorType = MissionAuditEntry['actor']['type'];

interface AuditInput {
  missionId: string;
  eventType: EventType;
  eventCategory: EventCategory;
  actor: {
    type: ActorType;
    id: string;
    name?: string;
    role?: string;
  };
  action: string;
  resourceType: string;
  resourceId: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  recommendationId?: string;
  decisionId?: string;
  feedbackId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Service for maintaining mission traceability with tamper-evident audit logs
 */
export class MissionTraceability {
  private entries: Map<string, MissionAuditEntry> = new Map();
  private missionChains: Map<string, string[]> = new Map(); // missionId -> entry IDs in order
  private lastHashByMission: Map<string, string> = new Map();

  /**
   * Record an audit entry with hash-chain integrity
   */
  record(input: AuditInput, traceId?: string, spanId?: string): MissionAuditEntry {
    const previousHash = this.lastHashByMission.get(input.missionId);

    // Compute changes if before/after state provided
    const changes = this.computeChanges(input.beforeState, input.afterState);

    const entry: MissionAuditEntry = {
      id: randomUUID(),
      missionId: input.missionId,
      timestamp: new Date().toISOString(),

      eventType: input.eventType,
      eventCategory: input.eventCategory,

      actor: input.actor,

      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,

      beforeState: input.beforeState,
      afterState: input.afterState,
      changes,

      recommendationId: input.recommendationId,
      decisionId: input.decisionId,
      feedbackId: input.feedbackId,

      previousHash,
      hash: '', // Will be computed

      traceId: traceId || randomUUID(),
      spanId: spanId || randomUUID(),
      metadata: input.metadata,
    };

    // Compute hash for tamper evidence
    entry.hash = this.computeHash(entry);

    // Store entry
    this.entries.set(entry.id, entry);

    // Update chain
    const chain = this.missionChains.get(input.missionId) || [];
    chain.push(entry.id);
    this.missionChains.set(input.missionId, chain);
    this.lastHashByMission.set(input.missionId, entry.hash);

    return entry;
  }

  /**
   * Record a recommendation event
   */
  recordRecommendation(
    recommendation: Recommendation,
    modelName = 'collaboration-model'
  ): MissionAuditEntry {
    return this.record(
      {
        missionId: recommendation.missionId,
        eventType: 'recommendation',
        eventCategory: 'ai_action',
        actor: {
          type: 'ai',
          id: modelName,
          name: `AI Model v${recommendation.modelVersion}`,
          role: 'recommender',
        },
        action: recommendation.action,
        resourceType: 'recommendation',
        resourceId: recommendation.id,
        afterState: {
          confidence: recommendation.confidence,
          riskLevel: recommendation.riskLevel,
          requiresApproval: recommendation.requiresApproval,
        },
        recommendationId: recommendation.id,
        metadata: {
          actionType: recommendation.actionType,
          confidenceBand: recommendation.confidenceBand,
          outcomeCount: recommendation.outcomes.length,
          riskFactorCount: recommendation.riskFactors.length,
        },
      },
      recommendation.traceId,
      recommendation.spanId
    );
  }

  /**
   * Record a commander decision event
   */
  recordDecision(decision: CommanderDecision): MissionAuditEntry {
    const isOverride = decision.outcome === 'modified';

    return this.record(
      {
        missionId: decision.missionId,
        eventType: isOverride ? 'override' : 'decision',
        eventCategory: 'human_action',
        actor: {
          type: 'human',
          id: decision.commanderId,
          role: decision.commanderRole,
        },
        action: `${decision.outcome}_recommendation`,
        resourceType: 'decision',
        resourceId: decision.id,
        beforeState: decision.originalAction
          ? { action: decision.originalAction }
          : undefined,
        afterState: decision.modifiedAction
          ? { action: decision.modifiedAction, parameters: decision.modifiedParameters }
          : { outcome: decision.outcome },
        recommendationId: decision.recommendationId,
        decisionId: decision.id,
        metadata: {
          reason: decision.reason,
          authority: decision.authority,
          executionSuccess: decision.executionResult?.success,
        },
      },
      decision.traceId,
      decision.spanId
    );
  }

  /**
   * Record execution event
   */
  recordExecution(
    decision: CommanderDecision,
    result: { success: boolean; output?: unknown; error?: string }
  ): MissionAuditEntry {
    return this.record(
      {
        missionId: decision.missionId,
        eventType: 'execution',
        eventCategory: 'system_action',
        actor: {
          type: 'system',
          id: 'execution-engine',
          name: 'Action Executor',
        },
        action: decision.modifiedAction || decision.originalAction || 'unknown',
        resourceType: 'execution',
        resourceId: decision.id,
        afterState: {
          success: result.success,
          output: result.output,
          error: result.error,
        },
        decisionId: decision.id,
        recommendationId: decision.recommendationId,
      },
      decision.traceId
    );
  }

  /**
   * Record feedback event
   */
  recordFeedback(feedback: OperatorFeedback): MissionAuditEntry {
    return this.record(
      {
        missionId: feedback.missionId,
        eventType: 'feedback',
        eventCategory: 'human_action',
        actor: {
          type: 'human',
          id: feedback.operatorId,
          role: feedback.operatorRole,
        },
        action: 'submit_feedback',
        resourceType: 'feedback',
        resourceId: feedback.id,
        afterState: {
          sentiment: feedback.sentiment,
          rating: feedback.rating,
          wasCorrect: feedback.wasCorrect,
        },
        recommendationId: feedback.recommendationId,
        decisionId: feedback.decisionId,
        feedbackId: feedback.id,
        metadata: {
          tags: feedback.tags,
          hasCorrectionData: !!feedback.correctAction,
        },
      },
      feedback.traceId
    );
  }

  /**
   * Get entry by ID
   */
  getEntry(id: string): MissionAuditEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * Get full audit trail for a mission
   */
  getMissionTrail(missionId: string): MissionAuditEntry[] {
    const chain = this.missionChains.get(missionId) || [];
    return chain.map((id) => this.entries.get(id)!).filter(Boolean);
  }

  /**
   * Get trail for a specific recommendation
   */
  getRecommendationTrail(recommendationId: string): MissionAuditEntry[] {
    return Array.from(this.entries.values()).filter(
      (e) => e.recommendationId === recommendationId
    );
  }

  /**
   * Verify hash-chain integrity for a mission
   */
  verifyIntegrity(missionId: string): {
    valid: boolean;
    brokenAt?: string;
    details: string;
  } {
    const trail = this.getMissionTrail(missionId);

    if (trail.length === 0) {
      return { valid: true, details: 'No entries to verify' };
    }

    for (let i = 0; i < trail.length; i++) {
      const entry = trail[i];

      // Verify hash
      const computedHash = this.computeHash(entry);
      if (computedHash !== entry.hash) {
        return {
          valid: false,
          brokenAt: entry.id,
          details: `Entry ${entry.id}: hash mismatch (tampering detected)`,
        };
      }

      // Verify chain link (except first entry)
      if (i > 0) {
        const previousEntry = trail[i - 1];
        if (entry.previousHash !== previousEntry.hash) {
          return {
            valid: false,
            brokenAt: entry.id,
            details: `Entry ${entry.id}: chain broken (previousHash mismatch)`,
          };
        }
      }
    }

    return {
      valid: true,
      details: `Verified ${trail.length} entries, chain intact`,
    };
  }

  /**
   * Search audit trail
   */
  search(criteria: {
    missionId?: string;
    eventType?: EventType;
    eventCategory?: EventCategory;
    actorId?: string;
    actorType?: ActorType;
    fromTime?: string;
    toTime?: string;
    action?: string;
  }): MissionAuditEntry[] {
    return Array.from(this.entries.values()).filter((entry) => {
      if (criteria.missionId && entry.missionId !== criteria.missionId) return false;
      if (criteria.eventType && entry.eventType !== criteria.eventType) return false;
      if (criteria.eventCategory && entry.eventCategory !== criteria.eventCategory)
        return false;
      if (criteria.actorId && entry.actor.id !== criteria.actorId) return false;
      if (criteria.actorType && entry.actor.type !== criteria.actorType) return false;
      if (criteria.fromTime && entry.timestamp < criteria.fromTime) return false;
      if (criteria.toTime && entry.timestamp > criteria.toTime) return false;
      if (criteria.action && !entry.action.includes(criteria.action)) return false;
      return true;
    });
  }

  /**
   * Get statistics for a mission
   */
  getMissionStats(missionId: string): {
    totalEntries: number;
    byEventType: Record<EventType, number>;
    byActorType: Record<ActorType, number>;
    aiActions: number;
    humanActions: number;
    overrides: number;
    integrityStatus: string;
  } {
    const trail = this.getMissionTrail(missionId);

    const byEventType: Record<EventType, number> = {
      recommendation: 0,
      decision: 0,
      execution: 0,
      feedback: 0,
      override: 0,
      escalation: 0,
    };

    const byActorType: Record<ActorType, number> = {
      ai: 0,
      human: 0,
      system: 0,
    };

    for (const entry of trail) {
      byEventType[entry.eventType]++;
      byActorType[entry.actor.type]++;
    }

    const integrity = this.verifyIntegrity(missionId);

    return {
      totalEntries: trail.length,
      byEventType,
      byActorType,
      aiActions: byActorType.ai,
      humanActions: byActorType.human,
      overrides: byEventType.override,
      integrityStatus: integrity.valid ? 'valid' : 'compromised',
    };
  }

  /**
   * Export audit trail
   */
  exportTrail(
    missionId: string,
    format: 'json' | 'csv' = 'json'
  ): string {
    const trail = this.getMissionTrail(missionId);

    if (format === 'csv') {
      const headers = [
        'id',
        'timestamp',
        'eventType',
        'eventCategory',
        'actorType',
        'actorId',
        'action',
        'resourceType',
        'resourceId',
        'hash',
      ];
      const rows = trail.map((e) =>
        [
          e.id,
          e.timestamp,
          e.eventType,
          e.eventCategory,
          e.actor.type,
          e.actor.id,
          e.action,
          e.resourceType,
          e.resourceId,
          e.hash,
        ].join(',')
      );
      return [headers.join(','), ...rows].join('\n');
    }

    return JSON.stringify(trail, null, 2);
  }

  /**
   * Compute SHA-256 hash for an entry
   */
  private computeHash(entry: MissionAuditEntry): string {
    const data = JSON.stringify({
      id: entry.id,
      missionId: entry.missionId,
      timestamp: entry.timestamp,
      eventType: entry.eventType,
      eventCategory: entry.eventCategory,
      actor: entry.actor,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      changes: entry.changes,
      previousHash: entry.previousHash,
    });

    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Compute changes between before and after states
   */
  private computeChanges(
    before?: Record<string, unknown>,
    after?: Record<string, unknown>
  ): Record<string, { old: unknown; new: unknown }> | undefined {
    if (!before && !after) return undefined;

    const changes: Record<string, { old: unknown; new: unknown }> = {};
    const allKeys = new Set([
      ...Object.keys(before || {}),
      ...Object.keys(after || {}),
    ]);

    for (const key of allKeys) {
      const oldVal = before?.[key];
      const newVal = after?.[key];

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes[key] = { old: oldVal, new: newVal };
      }
    }

    return Object.keys(changes).length > 0 ? changes : undefined;
  }
}
