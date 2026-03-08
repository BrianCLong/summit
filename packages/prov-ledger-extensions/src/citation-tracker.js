"use strict";
/**
 * Citation Tracking for AI Copilot
 *
 * Tracks citations and evidence references in AI-generated content.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CitationTracker = void 0;
// -----------------------------------------------------------------------------
// Citation Tracker
// -----------------------------------------------------------------------------
class CitationTracker {
    responses = new Map();
    /**
     * Create a new cited response
     */
    createResponse(query, answer, metadata) {
        const responseId = this.generateId();
        const response = {
            responseId,
            query,
            answer,
            citations: [],
            referencedEntities: [],
            referencedDocuments: [],
            confidence: 0,
            citationCoverage: 0,
            metadata,
        };
        this.responses.set(responseId, response);
        return responseId;
    }
    /**
     * Add a citation to a response
     */
    addCitation(responseId, citation) {
        const response = this.responses.get(responseId);
        if (!response) {
            throw new Error(`Response ${responseId} not found`);
        }
        const citationId = this.generateId();
        const fullCitation = {
            ...citation,
            id: citationId,
        };
        response.citations.push(fullCitation);
        // Update referenced lists
        if (citation.type === 'entity' && !response.referencedEntities.includes(citation.referenceId)) {
            response.referencedEntities.push(citation.referenceId);
        }
        if (citation.type === 'document' && !response.referencedDocuments.includes(citation.referenceId)) {
            response.referencedDocuments.push(citation.referenceId);
        }
        // Recalculate metrics
        this.recalculateMetrics(response);
        return citationId;
    }
    /**
     * Get a response by ID
     */
    getResponse(responseId) {
        return this.responses.get(responseId);
    }
    /**
     * Evaluate citation quality
     */
    evaluateCitationQuality(responseId) {
        const response = this.responses.get(responseId);
        if (!response) {
            throw new Error(`Response ${responseId} not found`);
        }
        const issues = [];
        // Check for sentences without citations
        const sentences = this.splitIntoSentences(response.answer);
        for (const sentence of sentences) {
            const hasCitation = response.citations.some((c) => c.position.start >= sentence.start && c.position.end <= sentence.end);
            if (!hasCitation && this.isFactualClaim(sentence.text)) {
                issues.push({
                    type: 'missing_citation',
                    description: `Factual claim without citation: "${sentence.text.substring(0, 50)}..."`,
                    position: { start: sentence.start, end: sentence.end },
                    severity: 'medium',
                });
            }
        }
        // Check for low confidence citations
        for (const citation of response.citations) {
            if (citation.confidence < 0.5) {
                issues.push({
                    type: 'low_confidence',
                    description: `Low confidence citation (${citation.confidence.toFixed(2)}): ${citation.citationText.substring(0, 50)}`,
                    position: citation.position,
                    severity: citation.confidence < 0.3 ? 'high' : 'medium',
                });
            }
        }
        return {
            citationCount: response.citations.length,
            coverage: response.citationCoverage,
            averageConfidence: response.confidence,
            averageRelevance: response.citations.length > 0
                ? response.citations.reduce((sum, c) => sum + c.relevance, 0) / response.citations.length
                : 0,
            issues,
        };
    }
    /**
     * Generate citation report for investigation
     */
    generateInvestigationReport(investigationId) {
        const responses = Array.from(this.responses.values())
            .filter((r) => r.metadata.investigationId === investigationId);
        const entityCitationCounts = new Map();
        const documentCitationCounts = new Map();
        let totalCitations = 0;
        let totalConfidence = 0;
        for (const response of responses) {
            totalCitations += response.citations.length;
            totalConfidence += response.confidence * response.citations.length;
            for (const entityId of response.referencedEntities) {
                entityCitationCounts.set(entityId, (entityCitationCounts.get(entityId) || 0) + 1);
            }
            for (const docId of response.referencedDocuments) {
                documentCitationCounts.set(docId, (documentCitationCounts.get(docId) || 0) + 1);
            }
        }
        return {
            investigationId,
            responseCount: responses.length,
            totalCitations,
            averageConfidence: totalCitations > 0 ? totalConfidence / totalCitations : 0,
            topEntities: Array.from(entityCitationCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([id, count]) => ({ entityId: id, citationCount: count })),
            topDocuments: Array.from(documentCitationCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([id, count]) => ({ documentId: id, citationCount: count })),
            responses: responses.map((r) => ({
                responseId: r.responseId,
                query: r.query,
                citationCount: r.citations.length,
                confidence: r.confidence,
                generatedAt: r.metadata.generatedAt,
            })),
        };
    }
    /**
     * Recalculate response metrics
     */
    recalculateMetrics(response) {
        if (response.citations.length === 0) {
            response.confidence = 0;
            response.citationCoverage = 0;
            return;
        }
        // Calculate average confidence
        response.confidence = response.citations.reduce((sum, c) => sum + c.confidence, 0) / response.citations.length;
        // Calculate coverage (simplified - % of answer covered by citations)
        const answerLength = response.answer.length;
        let coveredLength = 0;
        const ranges = [];
        for (const citation of response.citations) {
            ranges.push(citation.position);
        }
        // Merge overlapping ranges
        ranges.sort((a, b) => a.start - b.start);
        const merged = [];
        for (const range of ranges) {
            if (merged.length === 0 || merged[merged.length - 1].end < range.start) {
                merged.push({ ...range });
            }
            else {
                merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, range.end);
            }
        }
        for (const range of merged) {
            coveredLength += range.end - range.start;
        }
        response.citationCoverage = answerLength > 0 ? coveredLength / answerLength : 0;
    }
    /**
     * Split text into sentences
     */
    splitIntoSentences(text) {
        const sentences = [];
        const regex = /[^.!?]+[.!?]+/g;
        let match;
        let lastIndex = 0;
        while ((match = regex.exec(text)) !== null) {
            sentences.push({
                text: match[0].trim(),
                start: match.index,
                end: match.index + match[0].length,
            });
            lastIndex = regex.lastIndex;
        }
        // Handle text after last sentence
        if (lastIndex < text.length) {
            const remaining = text.substring(lastIndex).trim();
            if (remaining.length > 0) {
                sentences.push({
                    text: remaining,
                    start: lastIndex,
                    end: text.length,
                });
            }
        }
        return sentences;
    }
    /**
     * Check if text is a factual claim
     */
    isFactualClaim(text) {
        // Simplified heuristic - in production, use NLP
        const factualIndicators = [
            /is\s+/i,
            /was\s+/i,
            /are\s+/i,
            /were\s+/i,
            /has\s+/i,
            /have\s+/i,
            /\d+/,
            /according\s+to/i,
            /shows?\s+that/i,
            /indicates?\s+that/i,
        ];
        const opinionIndicators = [
            /i\s+think/i,
            /i\s+believe/i,
            /might\s+be/i,
            /could\s+be/i,
            /may\s+be/i,
            /seems?\s+to/i,
        ];
        const hasFactualIndicator = factualIndicators.some((r) => r.test(text));
        const hasOpinionIndicator = opinionIndicators.some((r) => r.test(text));
        return hasFactualIndicator && !hasOpinionIndicator;
    }
    generateId() {
        return `cit_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.CitationTracker = CitationTracker;
