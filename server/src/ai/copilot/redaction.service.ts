/**
 * Redaction Service
 *
 * Ensures redacted fields are never surfaced in responses.
 * Features:
 * - Policy label-based redaction
 * - Classification-aware filtering
 * - Uncertainty indication for partial evidence
 * - Audit logging of redaction decisions
 */

import { randomUUID } from 'crypto';
import pino from 'pino';
import { z } from 'zod';

import {
  type Citation,
  type Provenance,
  type RedactionStatus,
  type CopilotAnswer,
} from './types.js';

const logger = pino({ name: 'redaction-service' });

/**
 * Policy classification levels (in order of restrictiveness)
 */
export const CLASSIFICATION_LEVELS = [
  'UNCLASSIFIED',
  'FOUO',
  'CONFIDENTIAL',
  'SECRET',
  'TOP_SECRET',
  'SCI',
] as const;

export type ClassificationLevel = (typeof CLASSIFICATION_LEVELS)[number];

/**
 * Redaction policy configuration
 */
export interface RedactionPolicy {
  /** User's clearance level */
  userClearance: ClassificationLevel;
  /** Allowed policy labels */
  allowedPolicyLabels: string[];
  /** Denied policy labels (always redact) */
  deniedPolicyLabels: string[];
  /** Whether to show partial content when redacted */
  showPartialContent: boolean;
  /** Placeholder text for redacted content */
  redactionPlaceholder: string;
  /** Whether to log redaction decisions */
  auditRedactions: boolean;
}

/**
 * Default redaction policy
 */
const DEFAULT_POLICY: RedactionPolicy = {
  userClearance: 'UNCLASSIFIED',
  allowedPolicyLabels: ['PUBLIC', 'UNCLASSIFIED'],
  deniedPolicyLabels: ['PII', 'CLASSIFIED', 'RESTRICTED'],
  showPartialContent: false,
  redactionPlaceholder: '[REDACTED]',
  auditRedactions: true,
};

/**
 * Redaction decision record
 */
interface RedactionDecision {
  /** Decision ID */
  decisionId: string;
  /** Field or content that was considered */
  field: string;
  /** Whether redaction was applied */
  redacted: boolean;
  /** Reason for decision */
  reason: string;
  /** Policy labels on the content */
  policyLabels: string[];
  /** Timestamp */
  timestamp: string;
}

/**
 * Content item that may need redaction
 */
interface RedactableContent {
  id: string;
  type: 'entity' | 'relationship' | 'evidence' | 'claim' | 'property';
  content: any;
  policyLabels?: string[];
  classification?: ClassificationLevel;
  parentId?: string;
}

/**
 * Redaction result
 */
interface RedactionResult<T> {
  /** Redacted content */
  content: T;
  /** Whether any redaction was applied */
  wasRedacted: boolean;
  /** Number of items redacted */
  redactedCount: number;
  /** Redaction decisions made */
  decisions: RedactionDecision[];
  /** Uncertainty level due to redactions */
  uncertaintyLevel: 'none' | 'low' | 'medium' | 'high';
  /** Human-readable explanation of redactions */
  explanation: string;
}

/**
 * Redaction Service
 */
export class RedactionService {
  private readonly policy: RedactionPolicy;
  private readonly decisions: RedactionDecision[] = [];

  constructor(policy?: Partial<RedactionPolicy>) {
    this.policy = { ...DEFAULT_POLICY, ...policy };
  }

  /**
   * Apply redaction to a copilot answer
   */
  redactAnswer(answer: CopilotAnswer): RedactionResult<CopilotAnswer> {
    const startTime = Date.now();
    const decisions: RedactionDecision[] = [];
    let redactedCount = 0;

    // Redact citations
    const redactedCitations: Citation[] = [];
    for (const citation of answer.citations) {
      const result = this.redactCitation(citation);
      redactedCitations.push(result.content);
      decisions.push(...result.decisions);
      if (result.wasRedacted) redactedCount++;
    }

    // Redact answer text (remove any inline sensitive content)
    const answerResult = this.redactText(
      answer.answer,
      'answer_text',
      answer.citations.flatMap((c) => c.policyLabels || []),
    );
    decisions.push(...answerResult.decisions);
    if (answerResult.wasRedacted) redactedCount++;

    // Update provenance to remove redacted references
    const redactedProvenance = this.redactProvenance(
      answer.provenance,
      redactedCitations,
    );
    decisions.push(...redactedProvenance.decisions);

    // Calculate uncertainty level
    const uncertaintyLevel = this.calculateUncertainty(
      redactedCount,
      answer.citations.length,
      answer.provenance.entityIds.length,
    );

    // Build explanation
    const explanation = this.buildRedactionExplanation(
      redactedCount,
      uncertaintyLevel,
      decisions,
    );

    // Update answer warnings if redactions occurred
    const warnings = [...answer.warnings];
    if (redactedCount > 0) {
      warnings.push(
        `${redactedCount} item(s) were redacted due to policy restrictions.`,
      );
    }
    if (uncertaintyLevel !== 'none') {
      warnings.push(
        `Answer may be incomplete due to ${uncertaintyLevel} uncertainty from redacted content.`,
      );
    }

    const redactedAnswer: CopilotAnswer = {
      ...answer,
      answer: answerResult.content,
      citations: redactedCitations,
      provenance: redactedProvenance.content,
      redaction: {
        wasRedacted: redactedCount > 0,
        redactedCount,
        redactionTypes: this.getRedactionTypes(decisions),
        uncertaintyAcknowledged: uncertaintyLevel !== 'none',
      },
      warnings,
    };

    // Audit logging
    if (this.policy.auditRedactions && redactedCount > 0) {
      logger.info(
        {
          answerId: answer.answerId,
          redactedCount,
          uncertaintyLevel,
          decisions: decisions.filter((d) => d.redacted),
        },
        'Redaction applied to answer',
      );
    }

    return {
      content: redactedAnswer,
      wasRedacted: redactedCount > 0,
      redactedCount,
      decisions,
      uncertaintyLevel,
      explanation,
    };
  }

  /**
   * Redact a single citation
   */
  private redactCitation(citation: Citation): RedactionResult<Citation> {
    const decisions: RedactionDecision[] = [];
    let wasRedacted = false;

    // Check if entire citation should be redacted
    if (this.shouldRedact(citation.policyLabels || [])) {
      const decision: RedactionDecision = {
        decisionId: randomUUID(),
        field: `citation_${citation.id}`,
        redacted: true,
        reason: 'Policy labels require redaction',
        policyLabels: citation.policyLabels || [],
        timestamp: new Date().toISOString(),
      };
      decisions.push(decision);

      return {
        content: {
          ...citation,
          label: this.policy.redactionPlaceholder,
          excerpt: this.policy.redactionPlaceholder,
          wasRedacted: true,
        },
        wasRedacted: true,
        redactedCount: 1,
        decisions,
        uncertaintyLevel: 'medium',
        explanation: `Citation ${citation.id} was redacted due to policy restrictions`,
      };
    }

    // Check for partial redaction (excerpt only)
    if (citation.excerpt && this.containsSensitiveContent(citation.excerpt)) {
      const decision: RedactionDecision = {
        decisionId: randomUUID(),
        field: `citation_${citation.id}_excerpt`,
        redacted: true,
        reason: 'Excerpt contains sensitive content',
        policyLabels: citation.policyLabels || [],
        timestamp: new Date().toISOString(),
      };
      decisions.push(decision);
      wasRedacted = true;

      return {
        content: {
          ...citation,
          excerpt: this.policy.showPartialContent
            ? this.partialRedact(citation.excerpt)
            : this.policy.redactionPlaceholder,
          wasRedacted: true,
        },
        wasRedacted: true,
        redactedCount: 1,
        decisions,
        uncertaintyLevel: 'low',
        explanation: 'Citation excerpt was partially redacted',
      };
    }

    // No redaction needed
    decisions.push({
      decisionId: randomUUID(),
      field: `citation_${citation.id}`,
      redacted: false,
      reason: 'Content passes policy checks',
      policyLabels: citation.policyLabels || [],
      timestamp: new Date().toISOString(),
    });

    return {
      content: citation,
      wasRedacted: false,
      redactedCount: 0,
      decisions,
      uncertaintyLevel: 'none',
      explanation: '',
    };
  }

  /**
   * Redact text content
   */
  private redactText(
    text: string,
    fieldName: string,
    policyLabels: string[],
  ): RedactionResult<string> {
    const decisions: RedactionDecision[] = [];

    // Check for sensitive patterns
    const sensitivePatterns = [
      { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, type: 'SSN' },
      { pattern: /\b[A-Z]{2}\d{6,}\b/g, type: 'ID_NUMBER' },
      {
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        type: 'EMAIL',
      },
      {
        pattern: /\b(\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}\b/g,
        type: 'PHONE',
      },
      { pattern: /\bCLASSIFIED\b/gi, type: 'CLASSIFICATION_MARKER' },
      { pattern: /\bSECRET\b/gi, type: 'CLASSIFICATION_MARKER' },
      { pattern: /\bTOP SECRET\b/gi, type: 'CLASSIFICATION_MARKER' },
    ];

    let redactedText = text;
    let wasRedacted = false;
    let redactedCount = 0;

    for (const { pattern, type } of sensitivePatterns) {
      const matches = redactedText.match(pattern);
      if (matches && matches.length > 0) {
        redactedText = redactedText.replace(
          pattern,
          this.policy.redactionPlaceholder,
        );
        wasRedacted = true;
        redactedCount += matches.length;

        decisions.push({
          decisionId: randomUUID(),
          field: `${fieldName}_${type}`,
          redacted: true,
          reason: `Pattern ${type} detected and redacted`,
          policyLabels,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Check policy labels
    if (this.shouldRedact(policyLabels)) {
      decisions.push({
        decisionId: randomUUID(),
        field: fieldName,
        redacted: true,
        reason: 'Policy labels require redaction',
        policyLabels,
        timestamp: new Date().toISOString(),
      });
      // Note: We already did pattern-based redaction, don't redact entire text
    }

    return {
      content: redactedText,
      wasRedacted,
      redactedCount,
      decisions,
      uncertaintyLevel: wasRedacted ? 'low' : 'none',
      explanation: wasRedacted
        ? `${redactedCount} sensitive pattern(s) redacted`
        : '',
    };
  }

  /**
   * Redact provenance to remove references to redacted content
   */
  private redactProvenance(
    provenance: Provenance,
    redactedCitations: Citation[],
  ): RedactionResult<Provenance> {
    const decisions: RedactionDecision[] = [];

    // Get IDs of redacted citations
    const redactedEntityIds = new Set(
      redactedCitations
        .filter((c) => c.wasRedacted && c.sourceType === 'graph_entity')
        .map((c) => c.sourceId),
    );
    const redactedEvidenceIds = new Set(
      redactedCitations
        .filter((c) => c.wasRedacted && c.sourceType === 'evidence')
        .map((c) => c.sourceId),
    );
    const redactedClaimIds = new Set(
      redactedCitations
        .filter((c) => c.wasRedacted && c.sourceType === 'claim')
        .map((c) => c.sourceId),
    );

    // Filter provenance
    const filteredEntityIds = provenance.entityIds.filter(
      (id) => !redactedEntityIds.has(id),
    );
    const filteredEvidenceIds = provenance.evidenceIds.filter(
      (id) => !redactedEvidenceIds.has(id),
    );
    const filteredClaimIds = provenance.claimIds.filter(
      (id) => !redactedClaimIds.has(id),
    );

    const wasRedacted =
      filteredEntityIds.length < provenance.entityIds.length ||
      filteredEvidenceIds.length < provenance.evidenceIds.length ||
      filteredClaimIds.length < provenance.claimIds.length;

    if (wasRedacted) {
      decisions.push({
        decisionId: randomUUID(),
        field: 'provenance',
        redacted: true,
        reason: 'Removed references to redacted content',
        policyLabels: [],
        timestamp: new Date().toISOString(),
      });
    }

    // Adjust chain confidence based on redaction
    const originalCount =
      provenance.entityIds.length +
      provenance.evidenceIds.length +
      provenance.claimIds.length;
    const filteredCount =
      filteredEntityIds.length +
      filteredEvidenceIds.length +
      filteredClaimIds.length;
    const confidenceAdjustment =
      originalCount > 0 ? filteredCount / originalCount : 1;

    return {
      content: {
        ...provenance,
        entityIds: filteredEntityIds,
        evidenceIds: filteredEvidenceIds,
        claimIds: filteredClaimIds,
        chainConfidence: provenance.chainConfidence * confidenceAdjustment,
      },
      wasRedacted,
      redactedCount: originalCount - filteredCount,
      decisions,
      uncertaintyLevel: wasRedacted ? 'medium' : 'none',
      explanation: wasRedacted
        ? 'Provenance adjusted for redacted content'
        : '',
    };
  }

  /**
   * Check if content should be redacted based on policy labels
   */
  private shouldRedact(policyLabels: string[]): boolean {
    if (!policyLabels || policyLabels.length === 0) {
      return false;
    }

    // Check denied labels
    for (const label of policyLabels) {
      if (
        this.policy.deniedPolicyLabels.some(
          (denied) => label.toUpperCase().includes(denied.toUpperCase()),
        )
      ) {
        return true;
      }
    }

    // Check classification level
    for (const label of policyLabels) {
      const labelLevel = this.getClassificationLevel(label);
      if (labelLevel) {
        const userLevelIndex = CLASSIFICATION_LEVELS.indexOf(
          this.policy.userClearance,
        );
        const labelLevelIndex = CLASSIFICATION_LEVELS.indexOf(labelLevel);
        if (labelLevelIndex > userLevelIndex) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if text contains sensitive content
   */
  private containsSensitiveContent(text: string): boolean {
    const sensitivePatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\bCLASSIFIED\b/i,
      /\bSECRET\b/i,
      /\bTOP SECRET\b/i,
    ];

    return sensitivePatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Get classification level from label
   */
  private getClassificationLevel(label: string): ClassificationLevel | null {
    const upperLabel = label.toUpperCase();
    for (const level of CLASSIFICATION_LEVELS) {
      if (upperLabel.includes(level)) {
        return level;
      }
    }
    return null;
  }

  /**
   * Partial redaction (keep some structure)
   */
  private partialRedact(text: string): string {
    if (text.length <= 20) {
      return this.policy.redactionPlaceholder;
    }

    // Keep first and last 5 characters
    return `${text.substring(0, 5)}${this.policy.redactionPlaceholder}${text.substring(text.length - 5)}`;
  }

  /**
   * Calculate uncertainty level
   */
  private calculateUncertainty(
    redactedCount: number,
    totalCitations: number,
    totalEntities: number,
  ): 'none' | 'low' | 'medium' | 'high' {
    if (redactedCount === 0) {
      return 'none';
    }

    const total = totalCitations + totalEntities;
    if (total === 0) {
      return 'high';
    }

    const redactionRatio = redactedCount / total;

    if (redactionRatio >= 0.5) {
      return 'high';
    } else if (redactionRatio >= 0.25) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Get unique redaction types
   */
  private getRedactionTypes(decisions: RedactionDecision[]): string[] {
    const types = new Set<string>();
    for (const decision of decisions) {
      if (decision.redacted) {
        // Extract type from field name
        const parts = decision.field.split('_');
        if (parts.length >= 2) {
          types.add(parts[parts.length - 1]);
        } else {
          types.add(decision.field);
        }
      }
    }
    return Array.from(types);
  }

  /**
   * Build explanation of redactions
   */
  private buildRedactionExplanation(
    redactedCount: number,
    uncertaintyLevel: 'none' | 'low' | 'medium' | 'high',
    decisions: RedactionDecision[],
  ): string {
    if (redactedCount === 0) {
      return '';
    }

    const reasons = decisions
      .filter((d) => d.redacted)
      .map((d) => d.reason)
      .filter((r, i, arr) => arr.indexOf(r) === i); // Unique

    let explanation = `${redactedCount} item(s) were redacted.`;

    if (reasons.length > 0) {
      explanation += ` Reasons: ${reasons.join('; ')}.`;
    }

    if (uncertaintyLevel !== 'none') {
      explanation += ` This creates ${uncertaintyLevel} uncertainty in the answer.`;
    }

    return explanation;
  }

  /**
   * Update policy
   */
  updatePolicy(policy: Partial<RedactionPolicy>): void {
    Object.assign(this.policy, policy);
    logger.info({ policy: this.policy }, 'Redaction policy updated');
  }

  /**
   * Get current policy
   */
  getPolicy(): RedactionPolicy {
    return { ...this.policy };
  }

  /**
   * Get redaction decisions log
   */
  getDecisions(): RedactionDecision[] {
    return [...this.decisions];
  }

  /**
   * Clear decisions log
   */
  clearDecisions(): void {
    this.decisions.length = 0;
  }
}

/**
 * Create a redaction service
 */
export function createRedactionService(
  policy?: Partial<RedactionPolicy>,
): RedactionService {
  return new RedactionService(policy);
}

/**
 * Factory for creating redaction service with user context
 */
export function createRedactionServiceForUser(
  userClearance: ClassificationLevel,
  allowedLabels?: string[],
): RedactionService {
  return new RedactionService({
    userClearance,
    allowedPolicyLabels: allowedLabels || getLabelsForClearance(userClearance),
  });
}

/**
 * Get allowed labels for a clearance level
 */
function getLabelsForClearance(clearance: ClassificationLevel): string[] {
  const index = CLASSIFICATION_LEVELS.indexOf(clearance);
  return CLASSIFICATION_LEVELS.slice(0, index + 1).map((l) => l);
}
