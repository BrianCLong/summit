"use strict";
// @ts-nocheck
/**
 * Copilot Integration Service
 * Provides KB content for AI Copilot retrieval
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.copilotIntegrationService = exports.CopilotIntegrationService = void 0;
const ArticleRepository_js_1 = require("../repositories/ArticleRepository.js");
const ContentService_js_1 = require("./ContentService.js");
class CopilotIntegrationService {
    baseUrl;
    constructor() {
        this.baseUrl = process.env.KB_BASE_URL || 'https://intelgraph.example.com/kb';
    }
    /**
     * Query KB for Copilot retrieval
     * Returns sanctioned, published content only
     */
    async queryForCopilot(query) {
        const { query: searchQuery, userRole, contentTypes, includeDeprecated, limit, } = query;
        // Search published content only
        const results = await ArticleRepository_js_1.articleRepository.search({
            searchQuery,
            status: includeDeprecated ? undefined : 'published',
            userRole,
            contentType: contentTypes?.[0], // Search supports single type
            includeExpired: false,
            limit: limit * 2, // Fetch more for scoring
        });
        // Filter by content types if multiple specified
        let articles = results.data;
        if (contentTypes && contentTypes.length > 1) {
            articles = articles.filter((a) => contentTypes.includes(a.contentType));
        }
        // Score and rank results
        const scoredResults = articles.map((article) => {
            const score = this.calculateRelevanceScore(article, searchQuery);
            const excerpt = this.generateExcerpt(article, searchQuery);
            const citationUrl = this.generateCitationUrl(article);
            return {
                article,
                relevanceScore: score,
                excerpt,
                citationUrl,
            };
        });
        // Sort by relevance and limit
        scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
        const topResults = scoredResults.slice(0, limit);
        return {
            results: topResults,
            totalMatches: results.total,
        };
    }
    /**
     * Get a single article formatted for Copilot context
     */
    async getDocumentForCopilot(articleId, userRole) {
        const article = await ArticleRepository_js_1.articleRepository.findWithVersion(articleId);
        if (!article || !article.currentVersion) {
            return null;
        }
        // Check if published
        if (article.currentVersion.status !== 'published') {
            return null;
        }
        return {
            id: article.id,
            title: article.title,
            slug: article.slug,
            contentType: article.contentType,
            content: article.currentVersion.content,
            excerpt: ContentService_js_1.contentService.extractExcerpt(article.currentVersion.content),
            url: this.generateCitationUrl(article),
            lastUpdated: article.updatedAt,
            tags: article.tags?.map((t) => t.name) || [],
        };
    }
    /**
     * Get all published documents for corpus building
     * Used for initial Copilot index population
     */
    async getPublishedCorpus(userRole, batchSize = 100) {
        let offset = 0;
        let hasMore = true;
        while (hasMore) {
            const results = await ArticleRepository_js_1.articleRepository.search({
                status: 'published',
                userRole,
                includeExpired: false,
                limit: batchSize,
                offset,
            });
            const documents = results.data
                .filter((a) => a.currentVersion)
                .map((article) => ({
                id: article.id,
                title: article.title,
                slug: article.slug,
                contentType: article.contentType,
                content: article.currentVersion.content,
                excerpt: ContentService_js_1.contentService.extractExcerpt(article.currentVersion.content),
                url: this.generateCitationUrl(article),
                lastUpdated: article.updatedAt,
                tags: article.tags?.map((t) => t.name) || [],
            }));
            yield documents;
            offset += batchSize;
            hasMore = results.hasMore;
        }
    }
    /**
     * Get recently updated documents for incremental sync
     */
    async getRecentlyUpdated(since, userRole) {
        // This would need a custom query in ArticleRepository
        // For now, we'll fetch all and filter
        const results = await ArticleRepository_js_1.articleRepository.search({
            status: 'published',
            userRole,
            includeExpired: false,
            limit: 1000,
        });
        return results.data
            .filter((a) => a.currentVersion && a.updatedAt > since)
            .map((article) => ({
            id: article.id,
            title: article.title,
            slug: article.slug,
            contentType: article.contentType,
            content: article.currentVersion.content,
            excerpt: ContentService_js_1.contentService.extractExcerpt(article.currentVersion.content),
            url: this.generateCitationUrl(article),
            lastUpdated: article.updatedAt,
            tags: article.tags?.map((t) => t.name) || [],
        }));
    }
    /**
     * Calculate relevance score for search ranking
     */
    calculateRelevanceScore(article, query) {
        let score = 0;
        const queryLower = query.toLowerCase();
        const queryTerms = queryLower.split(/\s+/);
        // Title match (highest weight)
        const titleLower = article.title.toLowerCase();
        if (titleLower === queryLower) {
            score += 100;
        }
        else if (titleLower.includes(queryLower)) {
            score += 50;
        }
        else {
            for (const term of queryTerms) {
                if (titleLower.includes(term)) {
                    score += 10;
                }
            }
        }
        // Content match
        if (article.currentVersion) {
            const contentLower = article.currentVersion.content.toLowerCase();
            for (const term of queryTerms) {
                const matches = (contentLower.match(new RegExp(term, 'g')) || []).length;
                score += Math.min(matches * 2, 20); // Cap content match contribution
            }
        }
        // Tag match
        if (article.tags) {
            for (const tag of article.tags) {
                const tagLower = tag.name.toLowerCase();
                if (queryTerms.some((term) => tagLower.includes(term))) {
                    score += 15;
                }
            }
        }
        // Recency boost (newer content scores slightly higher)
        const daysSinceUpdate = Math.floor((Date.now() - article.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
        score += Math.max(0, 10 - daysSinceUpdate / 30);
        // Content type relevance
        if (article.contentType === 'playbook' || article.contentType === 'sop') {
            score += 5; // Prefer actionable content
        }
        return Math.round(score * 100) / 100;
    }
    /**
     * Generate excerpt highlighting query matches
     */
    generateExcerpt(article, query) {
        if (!article.currentVersion) {
            return article.title;
        }
        const content = article.currentVersion.content;
        const queryTerms = query.toLowerCase().split(/\s+/);
        // Find the first occurrence of any query term
        let bestStart = 0;
        let bestScore = 0;
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase();
            let lineScore = 0;
            for (const term of queryTerms) {
                if (line.includes(term)) {
                    lineScore += 1;
                }
            }
            if (lineScore > bestScore) {
                bestScore = lineScore;
                bestStart = i;
            }
        }
        // Extract context around the best match
        const contextLines = lines.slice(bestStart, bestStart + 3).join(' ');
        return ContentService_js_1.contentService.extractExcerpt(contextLines, 300);
    }
    /**
     * Generate citation URL for an article
     */
    generateCitationUrl(article) {
        return `${this.baseUrl}/${article.slug}`;
    }
    /**
     * Validate that content is appropriate for Copilot
     * Ensures only sanctioned content is returned
     */
    validateForCopilot(article) {
        // Must have a published version
        if (!article.currentVersion || article.currentVersion.status !== 'published') {
            return false;
        }
        // Must not be expired
        if (article.expirationDate && article.expirationDate < new Date()) {
            return false;
        }
        // Must be within effective date range
        if (article.effectiveDate && article.effectiveDate > new Date()) {
            return false;
        }
        return true;
    }
}
exports.CopilotIntegrationService = CopilotIntegrationService;
exports.copilotIntegrationService = new CopilotIntegrationService();
