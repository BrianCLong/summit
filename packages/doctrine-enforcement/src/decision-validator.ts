import { DecisionProposal, ValidationIssue, ValidationResult } from './types.js';

const CONFIDENCE_MIN = 0;
const CONFIDENCE_MAX = 1;

export class DecisionValidator {
  static validate(proposal: DecisionProposal): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (proposal.id !== undefined && !proposal.id.trim()) {
      issues.push({ field: 'id', message: 'Decision identifiers cannot be blank when provided.' });
    }

    if (!proposal.summary?.trim()) {
      issues.push({ field: 'summary', message: 'Summary is required for traceability.' });
    }

    if (!proposal.evidence || proposal.evidence.length === 0) {
      issues.push({ field: 'evidence', message: 'At least one evidence ID must be provided.' });
    } else {
      const normalizedIds = proposal.evidence.map((item) => item.id?.trim()).filter(Boolean) as string[];
      if (normalizedIds.length !== proposal.evidence.length) {
        issues.push({ field: 'evidence', message: 'All evidence entries require stable IDs.' });
      }
      const uniqueIds = new Set(normalizedIds);
      if (uniqueIds.size !== normalizedIds.length) {
        issues.push({ field: 'evidence', message: 'Evidence IDs must be unique within a proposal.' });
      }
    }

    if (!Number.isFinite(proposal.confidence)) {
      issues.push({ field: 'confidence', message: 'Confidence must be a finite numeric value.' });
    } else if (proposal.confidence < CONFIDENCE_MIN || proposal.confidence > CONFIDENCE_MAX) {
      issues.push({
        field: 'confidence',
        message: `Confidence must be normalized between ${CONFIDENCE_MIN} and ${CONFIDENCE_MAX}.`,
      });
    }

    if (!proposal.authority?.actor?.trim() || !proposal.authority?.role?.trim()) {
      issues.push({ field: 'authority', message: 'Authority context must include actor and role.' });
    }

    if (proposal.createdAt && Number.isNaN(proposal.createdAt.getTime())) {
      issues.push({ field: 'createdAt', message: 'Created timestamp must be a valid date.' });
    }

    return { ok: issues.length === 0, issues };
  }
}
