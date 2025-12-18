/**
 * Contradiction Detection Engine
 * Analyzes claims for logical, temporal, and factual contradictions
 */

import { Pool } from 'pg';

export enum ContradictionType {
  TEMPORAL_CONFLICT = 'TEMPORAL_CONFLICT',
  FACTUAL_CONFLICT = 'FACTUAL_CONFLICT',
  ENTITY_CONFLICT = 'ENTITY_CONFLICT',
  CAUSAL_CONFLICT = 'CAUSAL_CONFLICT',
  SOURCE_CONFLICT = 'SOURCE_CONFLICT',
  LOGICAL_INCONSISTENCY = 'LOGICAL_INCONSISTENCY',
}

export interface ContradictionEdge {
  sourceClaimId: string;
  targetClaimId: string;
  type: ContradictionType;
  confidence: number;
  explanation: string;
  conflictingFields: string[];
}

export interface ContradictionNode {
  claimId: string;
  claimHash: string;
  claimSummary: Record<string, any>;
  contradictionCount: number;
}

export interface ContradictionGraph {
  nodes: ContradictionNode[];
  edges: ContradictionEdge[];
  summary: {
    totalClaims: number;
    totalContradictions: number;
    criticalContradictions: number;
    byType: Record<string, number>;
    graphCoherenceScore: number;
  };
}

interface Claim {
  id: string;
  content: Record<string, any>;
  hash: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export class ContradictionDetector {
  constructor(private pool: Pool) {}

  /**
   * Detect contradictions between a set of claims
   */
  async detectContradictions(
    claimIds: string[],
    options: {
      minConfidence?: number;
      contradictionTypes?: ContradictionType[];
    } = {},
  ): Promise<ContradictionGraph> {
    const minConfidence = options.minConfidence ?? 0.5;
    const allowedTypes = options.contradictionTypes;

    // Fetch claims
    const claims = await this.fetchClaims(claimIds);

    const nodes: ContradictionNode[] = [];
    const edges: ContradictionEdge[] = [];
    const contradictionCounts: Map<string, number> = new Map();

    // Compare all pairs
    for (let i = 0; i < claims.length; i++) {
      for (let j = i + 1; j < claims.length; j++) {
        const contradictions = await this.checkPairContradictions(
          claims[i],
          claims[j],
        );

        for (const contradiction of contradictions) {
          if (contradiction.confidence < minConfidence) continue;
          if (allowedTypes && !allowedTypes.includes(contradiction.type)) continue;

          edges.push(contradiction);
          contradictionCounts.set(
            claims[i].id,
            (contradictionCounts.get(claims[i].id) || 0) + 1,
          );
          contradictionCounts.set(
            claims[j].id,
            (contradictionCounts.get(claims[j].id) || 0) + 1,
          );
        }
      }
    }

    // Build nodes
    for (const claim of claims) {
      nodes.push({
        claimId: claim.id,
        claimHash: claim.hash,
        claimSummary: this.summarizeClaim(claim),
        contradictionCount: contradictionCounts.get(claim.id) || 0,
      });
    }

    // Calculate summary
    const byType: Record<string, number> = {};
    let criticalCount = 0;

    for (const edge of edges) {
      byType[edge.type] = (byType[edge.type] || 0) + 1;
      if (edge.confidence >= 0.9) criticalCount++;
    }

    // Graph coherence score: 1 - (contradictions / possible_pairs)
    const possiblePairs = (claims.length * (claims.length - 1)) / 2;
    const coherenceScore = possiblePairs > 0
      ? 1 - (edges.length / possiblePairs)
      : 1;

    return {
      nodes,
      edges,
      summary: {
        totalClaims: claims.length,
        totalContradictions: edges.length,
        criticalContradictions: criticalCount,
        byType,
        graphCoherenceScore: Math.max(0, coherenceScore),
      },
    };
  }

  /**
   * Check for contradictions between two specific claims
   */
  async checkPairContradictions(
    claimA: Claim,
    claimB: Claim,
  ): Promise<ContradictionEdge[]> {
    const contradictions: ContradictionEdge[] = [];

    // 1. Check temporal contradictions
    const temporalConflict = this.checkTemporalConflict(claimA, claimB);
    if (temporalConflict) contradictions.push(temporalConflict);

    // 2. Check factual contradictions
    const factualConflicts = this.checkFactualConflicts(claimA, claimB);
    contradictions.push(...factualConflicts);

    // 3. Check entity contradictions
    const entityConflicts = this.checkEntityConflicts(claimA, claimB);
    contradictions.push(...entityConflicts);

    // 4. Check source conflicts (same source, different claims)
    const sourceConflict = this.checkSourceConflict(claimA, claimB);
    if (sourceConflict) contradictions.push(sourceConflict);

    return contradictions;
  }

  private async fetchClaims(claimIds: string[]): Promise<Claim[]> {
    if (claimIds.length === 0) return [];

    const result = await this.pool.query(
      `SELECT id, content, hash, created_at, metadata
       FROM claims
       WHERE id = ANY($1)`,
      [claimIds],
    );

    return result.rows;
  }

  private summarizeClaim(claim: Claim): Record<string, any> {
    const content = claim.content;
    const summary: Record<string, any> = {};

    // Extract key fields for summary
    if (content.subject) summary.subject = content.subject;
    if (content.predicate) summary.predicate = content.predicate;
    if (content.object) summary.object = content.object;
    if (content.timestamp) summary.timestamp = content.timestamp;
    if (content.location) summary.location = content.location;
    if (content.source) summary.source = content.source;

    // If no structured fields, take first few keys
    if (Object.keys(summary).length === 0) {
      const keys = Object.keys(content).slice(0, 5);
      for (const key of keys) {
        summary[key] = content[key];
      }
    }

    return summary;
  }

  private checkTemporalConflict(
    claimA: Claim,
    claimB: Claim,
  ): ContradictionEdge | null {
    const contentA = claimA.content;
    const contentB = claimB.content;

    // Check if both claims have temporal information
    const timeA = contentA.timestamp || contentA.time || contentA.date;
    const timeB = contentB.timestamp || contentB.time || contentB.date;

    if (!timeA || !timeB) return null;

    // Check if claims are about the same entity/event
    const sameSubject = this.haveSameSubject(contentA, contentB);
    if (!sameSubject) return null;

    // Check for temporal impossibilities
    // e.g., same entity in two places at the same time
    const locationA = contentA.location || contentA.place;
    const locationB = contentB.location || contentB.place;

    if (locationA && locationB && locationA !== locationB) {
      const timeADate = new Date(timeA);
      const timeBDate = new Date(timeB);

      // If times are within a threshold (e.g., 1 hour), it's a conflict
      const timeDiff = Math.abs(timeADate.getTime() - timeBDate.getTime());
      const oneHour = 3600000;

      if (timeDiff < oneHour) {
        return {
          sourceClaimId: claimA.id,
          targetClaimId: claimB.id,
          type: ContradictionType.TEMPORAL_CONFLICT,
          confidence: Math.max(0.5, 1 - (timeDiff / oneHour)),
          explanation: `Entity cannot be at "${locationA}" and "${locationB}" within ${Math.round(timeDiff / 60000)} minutes`,
          conflictingFields: ['location', 'timestamp'],
        };
      }
    }

    return null;
  }

  private checkFactualConflicts(
    claimA: Claim,
    claimB: Claim,
  ): ContradictionEdge[] {
    const conflicts: ContradictionEdge[] = [];
    const contentA = claimA.content;
    const contentB = claimB.content;

    // Check for direct factual contradictions
    // (same subject+predicate, different object)
    if (contentA.subject && contentB.subject && contentA.predicate && contentB.predicate) {
      if (
        this.normalize(contentA.subject) === this.normalize(contentB.subject) &&
        this.normalize(contentA.predicate) === this.normalize(contentB.predicate)
      ) {
        if (contentA.object !== contentB.object) {
          conflicts.push({
            sourceClaimId: claimA.id,
            targetClaimId: claimB.id,
            type: ContradictionType.FACTUAL_CONFLICT,
            confidence: 0.85,
            explanation: `Conflicting claims about ${contentA.subject}: "${contentA.object}" vs "${contentB.object}"`,
            conflictingFields: ['object'],
          });
        }
      }
    }

    // Check for boolean contradictions
    const boolFields = this.findBooleanFields(contentA, contentB);
    for (const field of boolFields) {
      if (contentA[field] === !contentB[field]) {
        conflicts.push({
          sourceClaimId: claimA.id,
          targetClaimId: claimB.id,
          type: ContradictionType.FACTUAL_CONFLICT,
          confidence: 0.95,
          explanation: `Direct contradiction on field "${field}": ${contentA[field]} vs ${contentB[field]}`,
          conflictingFields: [field],
        });
      }
    }

    return conflicts;
  }

  private checkEntityConflicts(
    claimA: Claim,
    claimB: Claim,
  ): ContradictionEdge[] {
    const conflicts: ContradictionEdge[] = [];
    const contentA = claimA.content;
    const contentB = claimB.content;

    // Check if claims reference the same entity with conflicting attributes
    const entityIdA = contentA.entityId || contentA.entity_id || contentA.id;
    const entityIdB = contentB.entityId || contentB.entity_id || contentB.id;

    if (!entityIdA || !entityIdB || entityIdA !== entityIdB) return conflicts;

    // Same entity, check for attribute conflicts
    const attributeFields = ['status', 'state', 'type', 'category', 'role', 'affiliation'];

    for (const field of attributeFields) {
      if (
        contentA[field] !== undefined &&
        contentB[field] !== undefined &&
        contentA[field] !== contentB[field]
      ) {
        conflicts.push({
          sourceClaimId: claimA.id,
          targetClaimId: claimB.id,
          type: ContradictionType.ENTITY_CONFLICT,
          confidence: 0.8,
          explanation: `Entity ${entityIdA} has conflicting ${field}: "${contentA[field]}" vs "${contentB[field]}"`,
          conflictingFields: [field],
        });
      }
    }

    return conflicts;
  }

  private checkSourceConflict(
    claimA: Claim,
    claimB: Claim,
  ): ContradictionEdge | null {
    const sourceA = claimA.content.source || claimA.metadata?.source;
    const sourceB = claimB.content.source || claimB.metadata?.source;

    if (!sourceA || !sourceB || sourceA !== sourceB) return null;

    // Same source making contradictory claims
    // Check if the claims contradict each other
    const conflicts = this.checkFactualConflicts(claimA, claimB);

    if (conflicts.length > 0) {
      return {
        sourceClaimId: claimA.id,
        targetClaimId: claimB.id,
        type: ContradictionType.SOURCE_CONFLICT,
        confidence: 0.9,
        explanation: `Same source "${sourceA}" makes contradictory claims`,
        conflictingFields: ['source', ...conflicts.flatMap((c) => c.conflictingFields)],
      };
    }

    return null;
  }

  private haveSameSubject(contentA: Record<string, any>, contentB: Record<string, any>): boolean {
    const subjectFields = ['subject', 'entity', 'entityId', 'entity_id', 'target', 'person', 'organization'];

    for (const field of subjectFields) {
      if (contentA[field] && contentB[field]) {
        if (this.normalize(contentA[field]) === this.normalize(contentB[field])) {
          return true;
        }
      }
    }

    return false;
  }

  private normalize(value: any): string {
    if (typeof value === 'string') {
      return value.toLowerCase().trim();
    }
    return String(value);
  }

  private findBooleanFields(
    contentA: Record<string, any>,
    contentB: Record<string, any>,
  ): string[] {
    const fields: string[] = [];

    for (const key of Object.keys(contentA)) {
      if (
        typeof contentA[key] === 'boolean' &&
        typeof contentB[key] === 'boolean'
      ) {
        fields.push(key);
      }
    }

    return fields;
  }
}

export default ContradictionDetector;
