"use strict";
/**
 * Workflow Service
 * Business logic for content review and publishing workflow
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowService = exports.WorkflowService = void 0;
const ArticleRepository_js_1 = require("../repositories/ArticleRepository.js");
const ReviewRepository_js_1 = require("../repositories/ReviewRepository.js");
const ContentService_js_1 = require("./ContentService.js");
class WorkflowService {
    /**
     * Create a new article with initial draft version
     */
    async createArticle(input) {
        const processed = ContentService_js_1.contentService.processContent(input.content);
        return ArticleRepository_js_1.articleRepository.create(input, processed.contentHtml);
    }
    /**
     * Update article metadata (not content)
     */
    async updateArticle(articleId, input, editorId) {
        const article = await ArticleRepository_js_1.articleRepository.findById(articleId);
        if (!article) {
            throw new Error('Article not found');
        }
        // Only owner or admin can update metadata
        if (article.ownerId !== editorId) {
            throw new Error('Only the article owner can update metadata');
        }
        return ArticleRepository_js_1.articleRepository.update(articleId, input);
    }
    /**
     * Create a new version of an article (for content updates)
     */
    async createVersion(input) {
        const article = await ArticleRepository_js_1.articleRepository.findById(input.articleId);
        if (!article) {
            throw new Error('Article not found');
        }
        const processed = ContentService_js_1.contentService.processContent(input.content);
        return ArticleRepository_js_1.articleRepository.createVersion(input, processed.contentHtml);
    }
    /**
     * Submit a version for review
     */
    async submitForReview(input) {
        const version = await ArticleRepository_js_1.articleRepository.getVersion(input.versionId);
        if (!version) {
            throw new Error('Version not found');
        }
        if (version.status !== 'draft') {
            throw new Error('Only draft versions can be submitted for review');
        }
        // Request reviews from specified reviewers
        await ReviewRepository_js_1.reviewRepository.requestReview(input.versionId, input.reviewerIds);
        const state = await ReviewRepository_js_1.reviewRepository.getWorkflowState(input.versionId);
        if (!state) {
            throw new Error('Failed to get workflow state');
        }
        return state;
    }
    /**
     * Submit a review decision
     */
    async submitReview(input) {
        const version = await ArticleRepository_js_1.articleRepository.getVersion(input.versionId);
        if (!version) {
            throw new Error('Version not found');
        }
        if (version.status !== 'pending_review') {
            throw new Error('Version is not pending review');
        }
        // Submit the review
        await ReviewRepository_js_1.reviewRepository.submitReview(input.versionId, input.reviewerId, input.decision, input.comments);
        // If rejected, update version status
        if (input.decision === 'rejected') {
            await ArticleRepository_js_1.articleRepository.updateVersionStatus(input.versionId, 'draft');
        }
        else if (input.decision === 'needs_revision') {
            await ArticleRepository_js_1.articleRepository.updateVersionStatus(input.versionId, 'draft');
        }
        else if (input.decision === 'approved') {
            // Check if all reviews are complete
            const state = await ReviewRepository_js_1.reviewRepository.getWorkflowState(input.versionId);
            if (state && state.canPublish) {
                await ArticleRepository_js_1.articleRepository.updateVersionStatus(input.versionId, 'approved');
            }
        }
        const state = await ReviewRepository_js_1.reviewRepository.getWorkflowState(input.versionId);
        if (!state) {
            throw new Error('Failed to get workflow state');
        }
        return state;
    }
    /**
     * Publish an approved version
     */
    async publish(input) {
        const version = await ArticleRepository_js_1.articleRepository.getVersion(input.versionId);
        if (!version) {
            throw new Error('Version not found');
        }
        const state = await ReviewRepository_js_1.reviewRepository.getWorkflowState(input.versionId);
        if (!state || !state.canPublish) {
            throw new Error('Version cannot be published - requires approval');
        }
        // Update version status to published
        const publishedAt = input.effectiveDate || new Date();
        await ArticleRepository_js_1.articleRepository.updateVersionStatus(input.versionId, 'published', publishedAt);
        // Update article's effective date if provided
        if (input.effectiveDate) {
            await ArticleRepository_js_1.articleRepository.update(version.articleId, {
                effectiveDate: input.effectiveDate,
            });
        }
        const article = await ArticleRepository_js_1.articleRepository.findWithVersion(version.articleId);
        if (!article) {
            throw new Error('Failed to get published article');
        }
        return article;
    }
    /**
     * Archive an article
     */
    async archive(articleId, archiverId) {
        const article = await ArticleRepository_js_1.articleRepository.findById(articleId);
        if (!article) {
            throw new Error('Article not found');
        }
        if (article.ownerId !== archiverId) {
            throw new Error('Only the article owner can archive');
        }
        if (article.currentVersionId) {
            await ArticleRepository_js_1.articleRepository.updateVersionStatus(article.currentVersionId, 'archived');
        }
        const updated = await ArticleRepository_js_1.articleRepository.findById(articleId);
        if (!updated) {
            throw new Error('Failed to archive article');
        }
        return updated;
    }
    /**
     * Deprecate an article (mark as outdated but keep visible)
     */
    async deprecate(articleId, deprecaterId, replacementSlug) {
        const article = await ArticleRepository_js_1.articleRepository.findById(articleId);
        if (!article) {
            throw new Error('Article not found');
        }
        if (article.ownerId !== deprecaterId) {
            throw new Error('Only the article owner can deprecate');
        }
        if (article.currentVersionId) {
            await ArticleRepository_js_1.articleRepository.updateVersionStatus(article.currentVersionId, 'deprecated');
        }
        const updated = await ArticleRepository_js_1.articleRepository.findById(articleId);
        if (!updated) {
            throw new Error('Failed to deprecate article');
        }
        return updated;
    }
    /**
     * Get workflow state for a version
     */
    async getWorkflowState(versionId) {
        return ReviewRepository_js_1.reviewRepository.getWorkflowState(versionId);
    }
    /**
     * Get pending reviews for a reviewer
     */
    async getPendingReviews(reviewerId) {
        const pending = await ReviewRepository_js_1.reviewRepository.getPendingReviewsForReviewer(reviewerId);
        return pending.map((p) => ({
            versionId: p.version_id,
            articleId: p.article_id,
            articleTitle: p.article_title,
            versionNumber: p.version_number,
            authorId: p.author_id,
            requestedAt: p.requested_at,
        }));
    }
    /**
     * Cancel pending review requests for a version
     */
    async cancelReviewRequests(versionId, requesterId) {
        const version = await ArticleRepository_js_1.articleRepository.getVersion(versionId);
        if (!version) {
            throw new Error('Version not found');
        }
        const article = await ArticleRepository_js_1.articleRepository.findById(version.articleId);
        if (!article || article.ownerId !== requesterId) {
            throw new Error('Only the article owner can cancel review requests');
        }
        await ReviewRepository_js_1.reviewRepository.cancelPendingReviews(versionId);
        await ArticleRepository_js_1.articleRepository.updateVersionStatus(versionId, 'draft');
    }
    /**
     * Direct publish (bypass review for authorized users)
     * Use with caution - typically for emergency updates
     */
    async directPublish(versionId, publisherId, reason) {
        const version = await ArticleRepository_js_1.articleRepository.getVersion(versionId);
        if (!version) {
            throw new Error('Version not found');
        }
        // Update directly to published
        await ArticleRepository_js_1.articleRepository.updateVersionStatus(versionId, 'published', new Date());
        const article = await ArticleRepository_js_1.articleRepository.findWithVersion(version.articleId);
        if (!article) {
            throw new Error('Failed to publish article');
        }
        return article;
    }
}
exports.WorkflowService = WorkflowService;
exports.workflowService = new WorkflowService();
