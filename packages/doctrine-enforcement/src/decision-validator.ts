import { DecisionProposal, ValidationIssue, ValidationResult } from './types.js';

const CONFIDENCE_MIN = 0;
const CONFIDENCE_MAX = 1;

export class DecisionValidator {
  static validate(proposal: DecisionProposal): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (!proposal.summary?.trim()) {
      issues.push({ field: 'summary', message: 'Summary is required for traceability.' });
    }

    if (!proposal.evidence || proposal.evidence.length === 0) {
      issues.push({ field: 'evidence', message: 'At least one evidence ID must be provided.' });
    } else {
      const missingIds = proposal.evidence.filter((item) => !item.id || !item.id.trim());
      if (missingIds.length > 0) {
        issues.push({ field: 'evidence', message: 'All evidence entries require stable IDs.' });
      }
    }

    if (proposal.confidence < CONFIDENCE_MIN || proposal.confidence > CONFIDENCE_MAX) {
      issues.push({
        field: 'confidence',
        message: `Confidence must be normalized between ${CONFIDENCE_MIN} and ${CONFIDENCE_MAX}.`,
      });
    }

    if (!proposal.authority?.actor?.trim() || !proposal.authority?.role?.trim()) {
      issues.push({ field: 'authority', message: 'Authority context must include actor and role.' });
    }

    return { ok: issues.length === 0, issues };
  }
}
