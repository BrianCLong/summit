/**
 * Entity Resolution (ER) Types
 * Explainable, provenance-aware entity resolution pipeline
 */

import { CanonicalEntityBase, CanonicalEntityType } from '../core/base';

export interface ERCandidate {
  entityA: CanonicalEntityBase;
  entityB: CanonicalEntityBase;
  blockingKey: string;                 // How pair was generated
  generationMethod: 'phonetic' | 'exact' | 'lsh' | 'network' | 'manual';
}

export interface ERFeatureScore {
  feature: string;                     // e.g., "name_jaro_winkler"
  score: number;                       // 0.0-1.0
  weight: number;                      // Contribution to final score
  explanation: string;                 // Human-readable
  evidence?: Record<string, any>;      // Raw comparison data
}

export interface ERMatchScore {
  candidateId: string;
  entityAId: string;
  entityBId: string;
  overallScore: number;                // Weighted aggregate
  method: 'deterministic' | 'probabilistic' | 'ml_supervised' | 'hybrid';
  features: ERFeatureScore[];
  confidence: number;                  // Meta-confidence in score
  riskScore: number;                   // Risk of false positive
  modelVersion: string;
  timestamp: Date;
}

export interface ERDecision {
  id: string;
  matchScore: ERMatchScore;
  decision: 'MERGE' | 'NO_MERGE' | 'DEFER' | 'SPLIT';
  decisionMethod: 'auto' | 'manual' | 'bulk';
  decidedBy?: string;                  // User ID if manual
  decidedAt: Date;
  notes?: string;
  reviewRequired: boolean;
  entityType: CanonicalEntityType;

  // Provenance
  audit: {
    traceId: string;
    reviewedBy?: string[];
    approvedBy?: string;
    dissent?: string;                  // Minority opinion
  };
}

export interface ERReviewQueueItem {
  id: string;
  matchScore: ERMatchScore;
  status: 'PENDING' | 'IN_REVIEW' | 'DECIDED' | 'ESCALATED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedTo?: string;
  dueAt?: Date;
  createdAt: Date;

  // UI helpers
  entityASnapshot: Partial<CanonicalEntityBase>;
  entityBSnapshot: Partial<CanonicalEntityBase>;
  conflictingAttributes: string[];
  sharedRelationships: number;
}

export interface ResolutionCluster {
  id: string;                          // Canonical entity ID
  tenantId: string;
  entityIds: string[];                 // All entities in cluster
  canonicalEntity: CanonicalEntityBase; // Master/golden record

  // Resolution metadata
  resolution: {
    method: 'deterministic' | 'probabilistic' | 'ml_supervised' | 'hybrid';
    algorithm: string;
    features: string[];
    threshold: number;
    confidence: number;
  };

  // Evidence
  evidence: Array<{
    type: 'name_match' | 'identifier_match' | 'address_match' | 'network_pattern';
    strength: number;
    details: Record<string, any>;
  }>;

  // Conflict resolution
  conflicts: Array<{
    attribute: string;
    values: Array<{
      entityId: string;
      value: any;
      confidence: number;
    }>;
    resolution: 'use_highest_confidence' | 'manual' | 'merge_array';
    resolvedValue: any;
  }>;

  // Audit
  audit: {
    createdAt: Date;
    lastUpdated: Date;
    reviewedBy?: string;
    approvedBy?: string;
    version: number;
    revertible: boolean;
    revertedFrom?: string;             // Previous cluster ID if split
  };
}

export interface ERThresholds {
  entityType: CanonicalEntityType;
  autoMergeThreshold: number;          // >= this: auto-merge
  manualReviewThreshold: number;       // Between this and auto: review
  rejectThreshold: number;             // <= this: no match

  // GA precision requirements
  targetPrecision: number;             // e.g., 0.90 for PERSON
  currentPrecision: number;
  sampleSize: number;
  lastCalibrated: Date;
}

export interface ERPrecisionMetrics {
  entityType: CanonicalEntityType;
  totalDecisions: number;
  mergeDecisions: number;
  noMergeDecisions: number;
  uncertainDecisions: number;
  precision: number;
  avgMergeConfidence: number;
  avgRiskScore: number;
  reviewsRequired: number;
  modelVersion: string;
  lastUpdated: Date;
}
