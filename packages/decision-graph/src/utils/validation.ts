/**
 * Validation utilities for decision graph objects
 */

import { z } from 'zod';
import {
  ClaimSchema,
  DecisionSchema,
  EvidenceSchema,
  EntitySchema,
  type Claim,
  type Decision,
  type Evidence,
  type Entity,
} from '../schema/index.js';
import { generateHash } from './hash.js';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
  warnings?: string[];
}

/**
 * Validate and parse an entity
 */
export function validateEntity(data: unknown): ValidationResult<Entity> {
  const result = EntitySchema.safeParse(data);
  if (!result.success) {
    return { success: false, errors: result.error };
  }
  return { success: true, data: result.data };
}

/**
 * Validate and parse a claim, verifying hash integrity
 */
export function validateClaim(data: unknown): ValidationResult<Claim> {
  const result = ClaimSchema.safeParse(data);
  if (!result.success) {
    return { success: false, errors: result.error };
  }

  const claim = result.data;
  const warnings: string[] = [];

  // Verify hash integrity
  const expectedHash = generateHash({
    entity_id: claim.entity_id,
    claim_type: claim.claim_type,
    assertion: claim.assertion,
    created_at: claim.created_at,
  });

  if (claim.hash !== expectedHash) {
    warnings.push('Claim hash does not match content - possible tampering');
  }

  // Check confidence consistency
  const confidenceLevelRanges: Record<string, [number, number]> = {
    low: [0, 0.5],
    medium: [0.5, 0.75],
    high: [0.75, 0.9],
    very_high: [0.9, 0.99],
    certain: [0.99, 1],
  };

  const [min, max] = confidenceLevelRanges[claim.confidence_level] || [0, 1];
  if (claim.confidence_score < min || claim.confidence_score > max) {
    warnings.push(
      `Confidence score ${claim.confidence_score} does not match level ${claim.confidence_level}`,
    );
  }

  return {
    success: true,
    data: claim,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate and parse evidence, verifying content hash
 */
export function validateEvidence(data: unknown): ValidationResult<Evidence> {
  const result = EvidenceSchema.safeParse(data);
  if (!result.success) {
    return { success: false, errors: result.error };
  }

  const evidence = result.data;
  const warnings: string[] = [];

  // Check freshness
  const freshnessDate = new Date(evidence.freshness_date);
  const now = new Date();
  const ageInDays = (now.getTime() - freshnessDate.getTime()) / (1000 * 60 * 60 * 24);

  if (ageInDays > 365) {
    warnings.push(`Evidence is ${Math.floor(ageInDays)} days old - may be stale`);
  }

  // Check expiry
  if (evidence.expiry_date) {
    const expiryDate = new Date(evidence.expiry_date);
    if (expiryDate < now) {
      warnings.push('Evidence has expired');
    }
  }

  // Check reliability threshold
  if (evidence.reliability_score < 0.5) {
    warnings.push('Evidence has low reliability score');
  }

  return {
    success: true,
    data: evidence,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate and parse a decision, verifying completeness
 */
export function validateDecision(data: unknown): ValidationResult<Decision> {
  const result = DecisionSchema.safeParse(data);
  if (!result.success) {
    return { success: false, errors: result.error };
  }

  const decision = result.data;
  const warnings: string[] = [];

  // Verify hash integrity
  const expectedHash = generateHash({
    question: decision.question,
    selected_option_id: decision.selected_option_id,
    rationale: decision.rationale,
    created_at: decision.created_at,
  });

  if (decision.hash !== expectedHash) {
    warnings.push('Decision hash does not match content - possible tampering');
  }

  // Check for minimum evidence
  if (decision.evidence_ids.length === 0) {
    warnings.push('Decision has no supporting evidence');
  }

  // Check for minimum claims
  if (decision.claim_ids.length === 0) {
    warnings.push('Decision has no supporting claims');
  }

  // Check approval chain completeness
  if (decision.status === 'approved') {
    const hasApproval = decision.approval_chain.some(a => a.status === 'approved');
    if (!hasApproval) {
      warnings.push('Decision marked as approved but no approvals in chain');
    }
  }

  // Check option selection
  if (decision.selected_option_id) {
    const selectedOption = decision.options.find(
      o => o.id === decision.selected_option_id,
    );
    if (!selectedOption) {
      warnings.push('Selected option ID does not match any option');
    }
  }

  return {
    success: true,
    data: decision,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate a complete decision graph (decision + claims + evidence)
 */
export function validateDecisionGraph(
  decision: Decision,
  claims: Claim[],
  evidence: Evidence[],
): ValidationResult<{
  decision: Decision;
  claims: Claim[];
  evidence: Evidence[];
}> {
  const warnings: string[] = [];

  // Verify all claim references exist
  const claimIds = new Set(claims.map(c => c.id));
  for (const claimId of decision.claim_ids) {
    if (!claimIds.has(claimId)) {
      warnings.push(`Referenced claim ${claimId} not found in provided claims`);
    }
  }

  // Verify all evidence references exist
  const evidenceIds = new Set(evidence.map(e => e.id));
  for (const evidenceId of decision.evidence_ids) {
    if (!evidenceIds.has(evidenceId)) {
      warnings.push(`Referenced evidence ${evidenceId} not found in provided evidence`);
    }
  }

  // Verify claim-evidence links
  for (const claim of claims) {
    for (const evidenceId of claim.evidence_ids) {
      if (!evidenceIds.has(evidenceId)) {
        warnings.push(
          `Claim ${claim.id} references evidence ${evidenceId} not in provided evidence`,
        );
      }
    }
  }

  return {
    success: true,
    data: { decision, claims, evidence },
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
