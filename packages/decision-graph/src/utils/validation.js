"use strict";
/**
 * Validation utilities for decision graph objects
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEntity = validateEntity;
exports.validateClaim = validateClaim;
exports.validateEvidence = validateEvidence;
exports.validateDecision = validateDecision;
exports.validateDecisionGraph = validateDecisionGraph;
const index_js_1 = require("../schema/index.js");
const hash_js_1 = require("./hash.js");
/**
 * Validate and parse an entity
 */
function validateEntity(data) {
    const result = index_js_1.EntitySchema.safeParse(data);
    if (!result.success) {
        return { success: false, errors: result.error };
    }
    return { success: true, data: result.data };
}
/**
 * Validate and parse a claim, verifying hash integrity
 */
function validateClaim(data) {
    const result = index_js_1.ClaimSchema.safeParse(data);
    if (!result.success) {
        return { success: false, errors: result.error };
    }
    const claim = result.data;
    const warnings = [];
    // Verify hash integrity
    const expectedHash = (0, hash_js_1.generateHash)({
        entity_id: claim.entity_id,
        claim_type: claim.claim_type,
        assertion: claim.assertion,
        created_at: claim.created_at,
    });
    if (claim.hash !== expectedHash) {
        warnings.push('Claim hash does not match content - possible tampering');
    }
    // Check confidence consistency
    const confidenceLevelRanges = {
        low: [0, 0.5],
        medium: [0.5, 0.75],
        high: [0.75, 0.9],
        very_high: [0.9, 0.99],
        certain: [0.99, 1],
    };
    const [min, max] = confidenceLevelRanges[claim.confidence_level] || [0, 1];
    if (claim.confidence_score < min || claim.confidence_score > max) {
        warnings.push(`Confidence score ${claim.confidence_score} does not match level ${claim.confidence_level}`);
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
function validateEvidence(data) {
    const result = index_js_1.EvidenceSchema.safeParse(data);
    if (!result.success) {
        return { success: false, errors: result.error };
    }
    const evidence = result.data;
    const warnings = [];
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
function validateDecision(data) {
    const result = index_js_1.DecisionSchema.safeParse(data);
    if (!result.success) {
        return { success: false, errors: result.error };
    }
    const decision = result.data;
    const warnings = [];
    // Verify hash integrity
    const expectedHash = (0, hash_js_1.generateHash)({
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
        const selectedOption = decision.options.find(o => o.id === decision.selected_option_id);
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
function validateDecisionGraph(decision, claims, evidence) {
    const warnings = [];
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
                warnings.push(`Claim ${claim.id} references evidence ${evidenceId} not in provided evidence`);
            }
        }
    }
    return {
        success: true,
        data: { decision, claims, evidence },
        warnings: warnings.length > 0 ? warnings : undefined,
    };
}
