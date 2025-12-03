/**
 * Context Fusion Engine
 * Merges and deduplicates evidence from multiple sources
 */

import { v4 as uuidv4 } from 'uuid';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import {
  EvidenceChunk,
  ContextSource,
  FusedContext,
  CitationSource,
} from '../types/index.js';

const tracer = trace.getTracer('graphrag-context-fusion');

export interface FusionConfig {
  maxTokens: number;
  deduplicationThreshold: number;
  conflictResolutionStrategy: 'newest' | 'highest_confidence' | 'merge';
  preserveCitations: boolean;
}

export interface ConflictInfo {
  sourceA: string;
  sourceB: string;
  conflict: string;
  resolution: string;
  confidence: number;
}

export class ContextFusion {
  private config: FusionConfig;

  constructor(config: Partial<FusionConfig> = {}) {
    this.config = {
      maxTokens: config.maxTokens ?? 4000,
      deduplicationThreshold: config.deduplicationThreshold ?? 0.85,
      conflictResolutionStrategy: config.conflictResolutionStrategy ?? 'highest_confidence',
      preserveCitations: config.preserveCitations ?? true,
    };
  }

  /**
   * Fuse evidence from multiple sources into unified context
   */
  async fuse(
    graphEvidence: EvidenceChunk[],
    documentEvidence: EvidenceChunk[],
    temporalEvidence: EvidenceChunk[] = [],
  ): Promise<FusedContext> {
    return tracer.startActiveSpan('context_fusion', async (span) => {
      try {
        span.setAttribute('graph.count', graphEvidence.length);
        span.setAttribute('document.count', documentEvidence.length);
        span.setAttribute('temporal.count', temporalEvidence.length);

        // Convert to context sources
        const sources: ContextSource[] = [
          ...graphEvidence.map((e) => this.toContextSource(e, 'graph')),
          ...documentEvidence.map((e) => this.toContextSource(e, 'document')),
          ...temporalEvidence.map((e) => this.toContextSource(e, 'temporal')),
        ];

        // Sort by relevance
        sources.sort((a, b) => b.relevance - a.relevance);

        // Deduplicate similar content
        const deduplicated = this.deduplicate(sources);
        span.setAttribute('deduplicated.count', deduplicated.length);

        // Detect and resolve conflicts
        const { resolved, conflicts } = this.resolveConflicts(deduplicated);

        // Compress to fit token budget
        const { compressed, compressionRatio } = this.compress(
          resolved,
          this.config.maxTokens,
        );

        // Build fused content
        const fusedContent = this.buildFusedContent(compressed);

        const result: FusedContext = {
          id: uuidv4(),
          sources: compressed,
          fusedContent,
          conflictsResolved: conflicts,
          totalTokens: this.estimateTokens(fusedContent),
          compressionRatio,
        };

        span.setAttribute('fused.tokens', result.totalTokens);
        span.setAttribute('conflicts.count', conflicts.length);
        span.setStatus({ code: SpanStatusCode.OK });

        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Convert evidence chunk to context source
   */
  private toContextSource(
    chunk: EvidenceChunk,
    type: 'graph' | 'document' | 'temporal' | 'external',
  ): ContextSource {
    return {
      type,
      content: chunk.content,
      relevance: chunk.relevanceScore,
      citations: chunk.citations,
      metadata: {
        chunkId: chunk.id,
        graphPaths: chunk.graphPaths?.length || 0,
        temporalContext: chunk.temporalContext,
      },
    };
  }

  /**
   * Deduplicate similar content
   */
  private deduplicate(sources: ContextSource[]): ContextSource[] {
    const deduplicated: ContextSource[] = [];
    const seen = new Set<string>();

    for (const source of sources) {
      const signature = this.contentSignature(source.content);

      // Check for near-duplicates
      let isDuplicate = false;
      for (const existing of deduplicated) {
        const similarity = this.computeSimilarity(
          source.content,
          existing.content,
        );

        if (similarity >= this.config.deduplicationThreshold) {
          isDuplicate = true;

          // Merge citations if preserving
          if (this.config.preserveCitations) {
            existing.citations.push(...source.citations);
          }

          // Keep higher relevance
          existing.relevance = Math.max(existing.relevance, source.relevance);
          break;
        }
      }

      if (!isDuplicate && !seen.has(signature)) {
        deduplicated.push(source);
        seen.add(signature);
      }
    }

    return deduplicated;
  }

  /**
   * Resolve conflicts between sources
   */
  private resolveConflicts(sources: ContextSource[]): {
    resolved: ContextSource[];
    conflicts: ConflictInfo[];
  } {
    const conflicts: ConflictInfo[] = [];
    const resolved: ContextSource[] = [...sources];

    // Group by entity mentions
    const entityMentions = new Map<string, ContextSource[]>();

    for (const source of sources) {
      const entities = this.extractEntityMentions(source.content);
      for (const entity of entities) {
        const existing = entityMentions.get(entity) || [];
        existing.push(source);
        entityMentions.set(entity, existing);
      }
    }

    // Check for conflicting information about same entities
    for (const [entity, mentionSources] of entityMentions.entries()) {
      if (mentionSources.length < 2) continue;

      // Compare pairs for conflicts
      for (let i = 0; i < mentionSources.length - 1; i++) {
        for (let j = i + 1; j < mentionSources.length; j++) {
          const conflict = this.detectConflict(
            entity,
            mentionSources[i],
            mentionSources[j],
          );

          if (conflict) {
            const resolution = this.resolveConflict(
              mentionSources[i],
              mentionSources[j],
            );

            conflicts.push({
              sourceA: mentionSources[i].content.slice(0, 100),
              sourceB: mentionSources[j].content.slice(0, 100),
              conflict: conflict.description,
              resolution: resolution.action,
              confidence: resolution.confidence,
            });

            // Apply resolution
            if (resolution.remove) {
              const removeIndex = resolved.indexOf(resolution.remove);
              if (removeIndex > -1) {
                resolved.splice(removeIndex, 1);
              }
            }
          }
        }
      }
    }

    return { resolved, conflicts };
  }

  /**
   * Detect conflict between two sources about an entity
   */
  private detectConflict(
    entity: string,
    sourceA: ContextSource,
    sourceB: ContextSource,
  ): { description: string } | null {
    // Extract statements about the entity
    const statementsA = this.extractStatements(sourceA.content, entity);
    const statementsB = this.extractStatements(sourceB.content, entity);

    // Check for contradictory statements
    for (const stmtA of statementsA) {
      for (const stmtB of statementsB) {
        if (this.areContradictory(stmtA, stmtB)) {
          return {
            description: `Conflicting information about ${entity}: "${stmtA}" vs "${stmtB}"`,
          };
        }
      }
    }

    return null;
  }

  /**
   * Resolve a conflict based on strategy
   */
  private resolveConflict(
    sourceA: ContextSource,
    sourceB: ContextSource,
  ): { action: string; confidence: number; remove?: ContextSource } {
    switch (this.config.conflictResolutionStrategy) {
      case 'highest_confidence':
        if (sourceA.relevance > sourceB.relevance) {
          return {
            action: `Kept higher confidence source (${sourceA.relevance.toFixed(2)} > ${sourceB.relevance.toFixed(2)})`,
            confidence: sourceA.relevance,
            remove: sourceB,
          };
        } else {
          return {
            action: `Kept higher confidence source (${sourceB.relevance.toFixed(2)} > ${sourceA.relevance.toFixed(2)})`,
            confidence: sourceB.relevance,
            remove: sourceA,
          };
        }

      case 'newest':
        // Assume first source is newer (would use timestamps in real implementation)
        return {
          action: 'Kept most recent source',
          confidence: Math.max(sourceA.relevance, sourceB.relevance),
          remove: sourceB,
        };

      case 'merge':
      default:
        return {
          action: 'Preserved both sources with conflict annotation',
          confidence: (sourceA.relevance + sourceB.relevance) / 2,
        };
    }
  }

  /**
   * Compress sources to fit token budget
   */
  private compress(
    sources: ContextSource[],
    maxTokens: number,
  ): { compressed: ContextSource[]; compressionRatio: number } {
    const originalTokens = sources.reduce(
      (sum, s) => sum + this.estimateTokens(s.content),
      0,
    );

    if (originalTokens <= maxTokens) {
      return { compressed: sources, compressionRatio: 1 };
    }

    const compressed: ContextSource[] = [];
    let currentTokens = 0;
    const tokenBudgetPerSource = Math.floor(maxTokens / sources.length);

    for (const source of sources) {
      const sourceTokens = this.estimateTokens(source.content);

      if (currentTokens + sourceTokens <= maxTokens) {
        compressed.push(source);
        currentTokens += sourceTokens;
      } else if (currentTokens < maxTokens) {
        // Truncate content to fit remaining budget
        const remainingTokens = maxTokens - currentTokens;
        const truncatedContent = this.truncateToTokens(
          source.content,
          remainingTokens,
        );

        compressed.push({
          ...source,
          content: truncatedContent + '...',
        });
        break;
      }
    }

    const compressedTokens = compressed.reduce(
      (sum, s) => sum + this.estimateTokens(s.content),
      0,
    );

    return {
      compressed,
      compressionRatio: compressedTokens / originalTokens,
    };
  }

  /**
   * Build fused content from sources
   */
  private buildFusedContent(sources: ContextSource[]): string {
    const sections: string[] = [];

    // Group by type
    const byType = new Map<string, ContextSource[]>();
    for (const source of sources) {
      const existing = byType.get(source.type) || [];
      existing.push(source);
      byType.set(source.type, existing);
    }

    // Build sections
    if (byType.has('graph')) {
      sections.push('## Graph Evidence');
      for (const source of byType.get('graph')!) {
        sections.push(source.content);
      }
    }

    if (byType.has('document')) {
      sections.push('\n## Document Evidence');
      for (const source of byType.get('document')!) {
        const citationRefs = source.citations
          .map((c) => c.documentTitle || c.documentId)
          .slice(0, 3)
          .join(', ');
        sections.push(`[Sources: ${citationRefs}]`);
        sections.push(source.content);
      }
    }

    if (byType.has('temporal')) {
      sections.push('\n## Temporal Evidence');
      for (const source of byType.get('temporal')!) {
        sections.push(source.content);
      }
    }

    return sections.join('\n');
  }

  /**
   * Compute content signature for deduplication
   */
  private contentSignature(content: string): string {
    // Simple hash based on normalized content
    const normalized = content.toLowerCase().replace(/\s+/g, ' ').trim();
    let hash = 0;
    for (let i = 0; i < Math.min(normalized.length, 200); i++) {
      hash = (hash << 5) - hash + normalized.charCodeAt(i);
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * Compute Jaccard similarity between texts
   */
  private computeSimilarity(textA: string, textB: string): number {
    const wordsA = new Set(textA.toLowerCase().split(/\s+/));
    const wordsB = new Set(textB.toLowerCase().split(/\s+/));

    const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);

    return intersection.size / union.size;
  }

  /**
   * Extract entity mentions from text
   */
  private extractEntityMentions(text: string): string[] {
    const entities: string[] = [];

    // Capitalized words (potential named entities)
    const capitalized = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    entities.push(...capitalized);

    return [...new Set(entities)];
  }

  /**
   * Extract statements about an entity
   */
  private extractStatements(text: string, entity: string): string[] {
    const sentences = text.split(/[.!?]+/);
    return sentences
      .filter((s) => s.toLowerCase().includes(entity.toLowerCase()))
      .map((s) => s.trim())
      .filter((s) => s.length > 10);
  }

  /**
   * Check if two statements are contradictory
   */
  private areContradictory(stmtA: string, stmtB: string): boolean {
    // Simple negation detection
    const negationWords = ['not', 'never', 'no', "didn't", "wasn't", "isn't", 'denied'];
    const aHasNegation = negationWords.some((w) =>
      stmtA.toLowerCase().includes(w),
    );
    const bHasNegation = negationWords.some((w) =>
      stmtB.toLowerCase().includes(w),
    );

    // If one has negation and other doesn't, and they're similar, likely contradictory
    if (aHasNegation !== bHasNegation) {
      const similarity = this.computeSimilarity(
        stmtA.replace(/not|never|no/gi, ''),
        stmtB.replace(/not|never|no/gi, ''),
      );
      return similarity > 0.6;
    }

    return false;
  }

  /**
   * Estimate tokens in text
   */
  private estimateTokens(text: string): number {
    // Approximate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Truncate text to fit token budget
   */
  private truncateToTokens(text: string, maxTokens: number): string {
    const maxChars = maxTokens * 4;
    if (text.length <= maxChars) return text;

    // Try to break at sentence boundary
    const truncated = text.slice(0, maxChars);
    const lastPeriod = truncated.lastIndexOf('.');
    if (lastPeriod > maxChars * 0.5) {
      return truncated.slice(0, lastPeriod + 1);
    }

    return truncated;
  }
}
