/**
 * Citation Enforcer - Mandatory citation validation for GraphRAG responses
 *
 * MVP-4-GA P0 Fix: GraphRAG Hallucination Guardrails
 *
 * This module enforces that all factual claims in GraphRAG responses
 * are backed by citations to source entities or evidence.
 *
 * Features:
 * - Citation density scoring (claims vs citations ratio)
 * - Dangling citation detection
 * - Confidence adjustment based on citation quality
 * - User-facing warnings for low-confidence responses
 *
 * @module CitationEnforcer
 */

import { z } from 'zod/v4';
import logger from '../../utils/logger.js';

const serviceLogger = logger.child({ name: 'CitationEnforcer' });

// Types
export interface Citation {
  id: string;
  type: 'entity' | 'evidence' | 'relationship' | 'claim';
  sourceId: string;
  text?: string;
  snippetHash?: string;
  confidence: number;
}

export interface EvidenceSnippet {
  id: string;
  sourceId: string;
  text: string;
  hash: string;
  metadata?: Record<string, unknown>;
}

export interface CitationValidationResult {
  isValid: boolean;
  validCitations: Citation[];
  invalidCitations: Citation[];
  danglingCitations: Citation[];
  citationDensity: number;
  claimCount: number;
  citationCount: number;
  confidenceAdjustment: number;
  warnings: string[];
  errors: string[];
}

export interface CitationEnforcerConfig {
  minCitationDensity: number;       // Minimum citations per claim (default: 0.3)
  requireCitationsForFacts: boolean; // Require citations for factual statements
  blockUncitedResponses: boolean;    // Hard block responses without citations
  maxConfidenceWithoutCitation: number; // Max confidence when no citations
  warnBelowDensity: number;          // Warn when density below this threshold
}

const DEFAULT_CONFIG: CitationEnforcerConfig = {
  minCitationDensity: 0.3,
  requireCitationsForFacts: true,
  blockUncitedResponses: false,
  maxConfidenceWithoutCitation: 0.4,
  warnBelowDensity: 0.5,
};

// Patterns for detecting factual claims
const FACTUAL_CLAIM_PATTERNS = [
  /\b(?:is|are|was|were)\s+(?:a|an|the)\s+\w+/gi,           // "X is a Y"
  /\b(?:in|on|at)\s+(?:\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/gi, // Dates
  /\$[\d,]+(?:\.\d{2})?/g,                                    // Dollar amounts
  /\b\d+(?:\.\d+)?%/g,                                        // Percentages
  /\b(?:located|based|headquartered)\s+(?:in|at)/gi,        // Location claims
  /\b(?:works?|worked)\s+(?:for|at|with)/gi,                // Employment claims
  /\b(?:owns?|owned)\s+/gi,                                   // Ownership claims
  /\b(?:married|divorced|related)\s+to/gi,                   // Relationship claims
  /\b(?:founded|established|created)\s+/gi,                  // Foundation claims
  /\b(?:between|from)\s+\d+\s+(?:and|to)\s+\d+/gi,          // Numeric ranges
];

// Citation format patterns
const CITATION_PATTERNS = [
  /\[entity:([^\]]+)\]/g,       // [entity:ID]
  /\[evidence:([^\]]+)\]/g,     // [evidence:ID]
  /\[source:([^\]]+)\]/g,       // [source:ID]
  /\[ref:([^\]]+)\]/g,          // [ref:ID]
  /\[claim:([^\]]+)\]/g,        // [claim:ID]
];

/**
 * Citation Enforcer Service
 *
 * Validates and enforces citation requirements for GraphRAG responses.
 */
export class CitationEnforcer {
  private config: CitationEnforcerConfig;

  constructor(config: Partial<CitationEnforcerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate citations in a response against available context
   */
  validateCitations(params: {
    answerText: string;
    citations: Citation[];
    availableEntityIds: string[];
    availableEvidenceIds: string[];
    evidenceSnippets?: EvidenceSnippet[];
  }): CitationValidationResult {
    const {
      answerText,
      citations,
      availableEntityIds,
      availableEvidenceIds,
      evidenceSnippets = [],
    } = params;

    const validCitations: Citation[] = [];
    const invalidCitations: Citation[] = [];
    const danglingCitations: Citation[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    // Build lookup sets for O(1) validation
    const entityIdSet = new Set(availableEntityIds);
    const evidenceIdSet = new Set(availableEvidenceIds);
    const evidenceHashMap = new Map(
      evidenceSnippets.map(e => [e.hash, e])
    );

    // Validate each citation
    for (const citation of citations) {
      const isValid = this.validateSingleCitation(
        citation,
        entityIdSet,
        evidenceIdSet,
        evidenceHashMap
      );

      if (isValid) {
        validCitations.push(citation);
      } else {
        invalidCitations.push(citation);
      }
    }

    // Extract inline citations from text
    const inlineCitations = this.extractInlineCitations(answerText);
    for (const inlineCitation of inlineCitations) {
      const existsInContext =
        entityIdSet.has(inlineCitation.sourceId) ||
        evidenceIdSet.has(inlineCitation.sourceId);

      if (!existsInContext) {
        danglingCitations.push(inlineCitation);
        warnings.push(
          `Citation [${inlineCitation.type}:${inlineCitation.sourceId}] references unknown source`
        );
      }
    }

    // Count factual claims in the answer
    const claimCount = this.countFactualClaims(answerText);
    const citationCount = validCitations.length + inlineCitations.length;

    // Calculate citation density
    const citationDensity =
      claimCount > 0 ? citationCount / claimCount : citationCount > 0 ? 1 : 0;

    // Determine confidence adjustment based on citation quality
    let confidenceAdjustment = 0;

    if (citationCount === 0) {
      confidenceAdjustment = -0.3;
      if (this.config.requireCitationsForFacts && claimCount > 0) {
        errors.push('Response contains factual claims without citations');
      }
    } else if (citationDensity < this.config.minCitationDensity) {
      confidenceAdjustment = -0.2;
      warnings.push(
        `Low citation density: ${(citationDensity * 100).toFixed(1)}% (minimum: ${(this.config.minCitationDensity * 100).toFixed(1)}%)`
      );
    } else if (citationDensity >= 0.7) {
      confidenceAdjustment = 0.1; // Boost for well-cited responses
    }

    if (invalidCitations.length > 0) {
      confidenceAdjustment -= 0.1;
      warnings.push(
        `${invalidCitations.length} citation(s) could not be validated`
      );
    }

    if (danglingCitations.length > 0) {
      confidenceAdjustment -= 0.15;
      warnings.push(
        `${danglingCitations.length} citation(s) reference sources not in context`
      );
    }

    // Determine overall validity
    const isValid =
      !this.config.blockUncitedResponses ||
      citationCount > 0 ||
      claimCount === 0;

    if (!isValid) {
      errors.push('Response blocked: No citations provided for factual claims');
    }

    serviceLogger.debug('Citation validation complete', {
      claimCount,
      citationCount,
      validCount: validCitations.length,
      invalidCount: invalidCitations.length,
      danglingCount: danglingCitations.length,
      density: citationDensity,
      confidenceAdjustment,
    });

    return {
      isValid,
      validCitations,
      invalidCitations,
      danglingCitations,
      citationDensity,
      claimCount,
      citationCount,
      confidenceAdjustment,
      warnings,
      errors,
    };
  }

  /**
   * Validate a single citation against available context
   */
  private validateSingleCitation(
    citation: Citation,
    entityIds: Set<string>,
    evidenceIds: Set<string>,
    evidenceHashes: Map<string, EvidenceSnippet>
  ): boolean {
    switch (citation.type) {
      case 'entity':
        return entityIds.has(citation.sourceId);

      case 'evidence':
        if (citation.snippetHash) {
          return evidenceHashes.has(citation.snippetHash);
        }
        return evidenceIds.has(citation.sourceId);

      case 'relationship':
        // Relationships reference two entities
        return entityIds.has(citation.sourceId);

      case 'claim':
        // Claims should be traceable to evidence
        return evidenceIds.has(citation.sourceId);

      default:
        return false;
    }
  }

  /**
   * Extract inline citations from response text
   */
  extractInlineCitations(text: string): Citation[] {
    const citations: Citation[] = [];

    for (const pattern of CITATION_PATTERNS) {
      let match;
      pattern.lastIndex = 0; // Reset regex state
      while ((match = pattern.exec(text)) !== null) {
        const typeMatch = pattern.source.match(/\[(\w+):/);
        const type = typeMatch
          ? (typeMatch[1] as Citation['type'])
          : 'evidence';

        citations.push({
          id: `inline-${citations.length}`,
          type,
          sourceId: match[1],
          confidence: 1.0,
        });
      }
    }

    return citations;
  }

  /**
   * Count factual claims in text
   */
  countFactualClaims(text: string): number {
    let count = 0;

    for (const pattern of FACTUAL_CLAIM_PATTERNS) {
      pattern.lastIndex = 0; // Reset regex state
      const matches = text.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }

    // Also count sentences that appear to make assertions
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    for (const sentence of sentences) {
      const trimmed = sentence.trim().toLowerCase();

      // Simple heuristic: statements starting with pronouns or names
      if (
        /^(?:he|she|they|it|the|[A-Z][a-z]+)\s/.test(sentence.trim()) &&
        !/^(?:however|although|if|when|where|what|why|how)/i.test(trimmed)
      ) {
        count++;
      }
    }

    // Deduplicate overlapping matches (rough estimate)
    return Math.ceil(count * 0.7);
  }

  /**
   * Add citation markers to response text where missing
   */
  suggestCitations(params: {
    answerText: string;
    availableEntities: Array<{ id: string; label: string; type: string }>;
    availableEvidence: Array<{ id: string; text: string }>;
  }): {
    annotatedText: string;
    suggestedCitations: Citation[];
  } {
    const { answerText, availableEntities, availableEvidence } = params;
    let annotatedText = answerText;
    const suggestedCitations: Citation[] = [];

    // Build lookup maps
    const entityByLabel = new Map(
      availableEntities.map(e => [e.label.toLowerCase(), e])
    );

    // Find entity mentions and suggest citations
    for (const entity of availableEntities) {
      const labelPattern = new RegExp(
        `\\b${this.escapeRegex(entity.label)}\\b`,
        'gi'
      );

      if (labelPattern.test(answerText)) {
        // Check if already cited
        const citationPattern = new RegExp(
          `\\[entity:${entity.id}\\]`,
          'g'
        );

        if (!citationPattern.test(answerText)) {
          suggestedCitations.push({
            id: `suggested-${suggestedCitations.length}`,
            type: 'entity',
            sourceId: entity.id,
            text: entity.label,
            confidence: 0.8,
          });

          // Add citation after first mention
          annotatedText = annotatedText.replace(
            labelPattern,
            `$& [entity:${entity.id}]`
          );
        }
      }
    }

    return {
      annotatedText,
      suggestedCitations,
    };
  }

  /**
   * Format citations for display
   */
  formatCitationsForDisplay(citations: Citation[]): string {
    if (citations.length === 0) {
      return '';
    }

    const grouped = new Map<Citation['type'], Citation[]>();
    for (const citation of citations) {
      if (!grouped.has(citation.type)) {
        grouped.set(citation.type, []);
      }
      grouped.get(citation.type)!.push(citation);
    }

    const parts: string[] = [];

    if (grouped.has('entity')) {
      parts.push(`Entities: ${grouped.get('entity')!.map(c => c.sourceId).join(', ')}`);
    }
    if (grouped.has('evidence')) {
      parts.push(`Evidence: ${grouped.get('evidence')!.map(c => c.sourceId).join(', ')}`);
    }
    if (grouped.has('claim')) {
      parts.push(`Claims: ${grouped.get('claim')!.map(c => c.sourceId).join(', ')}`);
    }

    return parts.join(' | ');
  }

  /**
   * Generate user-facing warning message based on validation result
   */
  generateWarningMessage(result: CitationValidationResult): string | null {
    if (result.errors.length > 0) {
      return `⚠️ ${result.errors[0]}`;
    }

    if (result.citationCount === 0 && result.claimCount > 0) {
      return '⚠️ This response contains assertions without source citations. Please verify independently.';
    }

    if (result.citationDensity < this.config.warnBelowDensity) {
      return `ℹ️ This response has limited citations (${(result.citationDensity * 100).toFixed(0)}%). Some claims may be unverified.`;
    }

    if (result.danglingCitations.length > 0) {
      return `ℹ️ ${result.danglingCitations.length} citation(s) could not be verified against the knowledge graph.`;
    }

    return null;
  }

  /**
   * Adjust confidence score based on citation quality
   */
  adjustConfidence(
    originalConfidence: number,
    validationResult: CitationValidationResult
  ): number {
    let adjusted = originalConfidence + validationResult.confidenceAdjustment;

    // Apply maximum confidence cap for uncited responses
    if (validationResult.citationCount === 0) {
      adjusted = Math.min(adjusted, this.config.maxConfidenceWithoutCitation);
    }

    // Clamp to valid range
    return Math.max(0, Math.min(1, adjusted));
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// Export singleton instance with default config
export const citationEnforcer = new CitationEnforcer();

// Export factory for custom configs
export function createCitationEnforcer(
  config: Partial<CitationEnforcerConfig>
): CitationEnforcer {
  return new CitationEnforcer(config);
}

export default CitationEnforcer;
