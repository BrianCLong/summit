"use strict";
/**
 * Context Fusion Engine
 * Merges and deduplicates evidence from multiple sources
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextFusion = void 0;
const uuid_1 = require("uuid");
const api_1 = require("@opentelemetry/api");
const tracer = api_1.trace.getTracer('graphrag-context-fusion');
class ContextFusion {
    config;
    constructor(config = {}) {
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
    async fuse(graphEvidence, documentEvidence, temporalEvidence = []) {
        return tracer.startActiveSpan('context_fusion', async (span) => {
            try {
                span.setAttribute('graph.count', graphEvidence.length);
                span.setAttribute('document.count', documentEvidence.length);
                span.setAttribute('temporal.count', temporalEvidence.length);
                // Convert to context sources
                const sources = [
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
                const { compressed, compressionRatio } = this.compress(resolved, this.config.maxTokens);
                // Build fused content
                const fusedContent = this.buildFusedContent(compressed);
                const result = {
                    id: (0, uuid_1.v4)(),
                    sources: compressed,
                    fusedContent,
                    conflictsResolved: conflicts,
                    totalTokens: this.estimateTokens(fusedContent),
                    compressionRatio,
                };
                span.setAttribute('fused.tokens', result.totalTokens);
                span.setAttribute('conflicts.count', conflicts.length);
                span.setStatus({ code: api_1.SpanStatusCode.OK });
                return result;
            }
            catch (error) {
                span.setStatus({
                    code: api_1.SpanStatusCode.ERROR,
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    /**
     * Convert evidence chunk to context source
     */
    toContextSource(chunk, type) {
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
    deduplicate(sources) {
        const deduplicated = [];
        const seen = new Set();
        for (const source of sources) {
            const signature = this.contentSignature(source.content);
            // Check for near-duplicates
            let isDuplicate = false;
            for (const existing of deduplicated) {
                const similarity = this.computeSimilarity(source.content, existing.content);
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
    resolveConflicts(sources) {
        const conflicts = [];
        const resolved = [...sources];
        // Group by entity mentions
        const entityMentions = new Map();
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
            if (mentionSources.length < 2)
                continue;
            // Compare pairs for conflicts
            for (let i = 0; i < mentionSources.length - 1; i++) {
                for (let j = i + 1; j < mentionSources.length; j++) {
                    const conflict = this.detectConflict(entity, mentionSources[i], mentionSources[j]);
                    if (conflict) {
                        const resolution = this.resolveConflict(mentionSources[i], mentionSources[j]);
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
    detectConflict(entity, sourceA, sourceB) {
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
    resolveConflict(sourceA, sourceB) {
        switch (this.config.conflictResolutionStrategy) {
            case 'highest_confidence':
                if (sourceA.relevance > sourceB.relevance) {
                    return {
                        action: `Kept higher confidence source (${sourceA.relevance.toFixed(2)} > ${sourceB.relevance.toFixed(2)})`,
                        confidence: sourceA.relevance,
                        remove: sourceB,
                    };
                }
                else {
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
    compress(sources, maxTokens) {
        const originalTokens = sources.reduce((sum, s) => sum + this.estimateTokens(s.content), 0);
        if (originalTokens <= maxTokens) {
            return { compressed: sources, compressionRatio: 1 };
        }
        const compressed = [];
        let currentTokens = 0;
        const tokenBudgetPerSource = Math.floor(maxTokens / sources.length);
        for (const source of sources) {
            const sourceTokens = this.estimateTokens(source.content);
            if (currentTokens + sourceTokens <= maxTokens) {
                compressed.push(source);
                currentTokens += sourceTokens;
            }
            else if (currentTokens < maxTokens) {
                // Truncate content to fit remaining budget
                const remainingTokens = maxTokens - currentTokens;
                const truncatedContent = this.truncateToTokens(source.content, remainingTokens);
                compressed.push({
                    ...source,
                    content: truncatedContent + '...',
                });
                break;
            }
        }
        const compressedTokens = compressed.reduce((sum, s) => sum + this.estimateTokens(s.content), 0);
        return {
            compressed,
            compressionRatio: compressedTokens / originalTokens,
        };
    }
    /**
     * Build fused content from sources
     */
    buildFusedContent(sources) {
        const sections = [];
        // Group by type
        const byType = new Map();
        for (const source of sources) {
            const existing = byType.get(source.type) || [];
            existing.push(source);
            byType.set(source.type, existing);
        }
        // Build sections
        if (byType.has('graph')) {
            sections.push('## Graph Evidence');
            for (const source of byType.get('graph')) {
                sections.push(source.content);
            }
        }
        if (byType.has('document')) {
            sections.push('\n## Document Evidence');
            for (const source of byType.get('document')) {
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
            for (const source of byType.get('temporal')) {
                sections.push(source.content);
            }
        }
        return sections.join('\n');
    }
    /**
     * Compute content signature for deduplication
     */
    contentSignature(content) {
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
    computeSimilarity(textA, textB) {
        const wordsA = new Set(textA.toLowerCase().split(/\s+/));
        const wordsB = new Set(textB.toLowerCase().split(/\s+/));
        const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
        const union = new Set([...wordsA, ...wordsB]);
        return intersection.size / union.size;
    }
    /**
     * Extract entity mentions from text
     */
    extractEntityMentions(text) {
        const entities = [];
        // Capitalized words (potential named entities)
        const capitalized = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
        entities.push(...capitalized);
        return [...new Set(entities)];
    }
    /**
     * Extract statements about an entity
     */
    extractStatements(text, entity) {
        const sentences = text.split(/[.!?]+/);
        return sentences
            .filter((s) => s.toLowerCase().includes(entity.toLowerCase()))
            .map((s) => s.trim())
            .filter((s) => s.length > 10);
    }
    /**
     * Check if two statements are contradictory
     */
    areContradictory(stmtA, stmtB) {
        // Simple negation detection
        const negationWords = ['not', 'never', 'no', "didn't", "wasn't", "isn't", 'denied'];
        const aHasNegation = negationWords.some((w) => stmtA.toLowerCase().includes(w));
        const bHasNegation = negationWords.some((w) => stmtB.toLowerCase().includes(w));
        // If one has negation and other doesn't, and they're similar, likely contradictory
        if (aHasNegation !== bHasNegation) {
            const similarity = this.computeSimilarity(stmtA.replace(/not|never|no/gi, ''), stmtB.replace(/not|never|no/gi, ''));
            return similarity > 0.6;
        }
        return false;
    }
    /**
     * Estimate tokens in text
     */
    estimateTokens(text) {
        // Approximate: ~4 characters per token
        return Math.ceil(text.length / 4);
    }
    /**
     * Truncate text to fit token budget
     */
    truncateToTokens(text, maxTokens) {
        const maxChars = maxTokens * 4;
        if (text.length <= maxChars)
            return text;
        // Try to break at sentence boundary
        const truncated = text.slice(0, maxChars);
        const lastPeriod = truncated.lastIndexOf('.');
        if (lastPeriod > maxChars * 0.5) {
            return truncated.slice(0, lastPeriod + 1);
        }
        return truncated;
    }
}
exports.ContextFusion = ContextFusion;
