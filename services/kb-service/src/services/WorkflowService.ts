/**
 * Workflow Service
 * Business logic for content review and publishing workflow
 */

import { articleRepository } from '../repositories/ArticleRepository.js';
import { reviewRepository } from '../repositories/ReviewRepository.js';
import { contentService } from './ContentService.js';
import type {
  Article,
  ArticleWithVersion,
  Version,
  WorkflowState,
  CreateArticleInput,
  UpdateArticleInput,
  CreateVersionInput,
  SubmitForReviewInput,
  ReviewInput,
  PublishInput,
  ReviewDecision,
  ContentStatus,
} from '../types/index.js';

export interface WorkflowError {
  code: string;
  message: string;
}

export class WorkflowService {
  /**
   * Create a new article with initial draft version
   */
  async createArticle(input: CreateArticleInput): Promise<ArticleWithVersion> {
    const processed = contentService.processContent(input.content);
    return articleRepository.create(input, processed.contentHtml);
  }

  /**
   * Update article metadata (not content)
   */
  async updateArticle(
    articleId: string,
    input: UpdateArticleInput,
    editorId: string
  ): Promise<Article | null> {
    const article = await articleRepository.findById(articleId);
    if (!article) {
      throw new Error('Article not found');
    }

    // Only owner or admin can update metadata
    if (article.ownerId !== editorId) {
      throw new Error('Only the article owner can update metadata');
    }

    return articleRepository.update(articleId, input);
  }

  /**
   * Create a new version of an article (for content updates)
   */
  async createVersion(input: CreateVersionInput): Promise<Version> {
    const article = await articleRepository.findById(input.articleId);
    if (!article) {
      throw new Error('Article not found');
    }

    const processed = contentService.processContent(input.content);
    return articleRepository.createVersion(input, processed.contentHtml);
  }

  /**
   * Submit a version for review
   */
  async submitForReview(input: SubmitForReviewInput): Promise<WorkflowState> {
    const version = await articleRepository.getVersion(input.versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    if (version.status !== 'draft') {
      throw new Error('Only draft versions can be submitted for review');
    }

    // Request reviews from specified reviewers
    await reviewRepository.requestReview(input.versionId, input.reviewerIds);

    const state = await reviewRepository.getWorkflowState(input.versionId);
    if (!state) {
      throw new Error('Failed to get workflow state');
    }

    return state;
  }

  /**
   * Submit a review decision
   */
  async submitReview(input: ReviewInput): Promise<WorkflowState> {
    const version = await articleRepository.getVersion(input.versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    if (version.status !== 'pending_review') {
      throw new Error('Version is not pending review');
    }

    // Submit the review
    await reviewRepository.submitReview(
      input.versionId,
      input.reviewerId,
      input.decision,
      input.comments
    );

    // If rejected, update version status
    if (input.decision === 'rejected') {
      await articleRepository.updateVersionStatus(input.versionId, 'draft');
    } else if (input.decision === 'needs_revision') {
      await articleRepository.updateVersionStatus(input.versionId, 'draft');
    } else if (input.decision === 'approved') {
      // Check if all reviews are complete
      const state = await reviewRepository.getWorkflowState(input.versionId);
      if (state && state.canPublish) {
        await articleRepository.updateVersionStatus(input.versionId, 'approved');
      }
    }

    const state = await reviewRepository.getWorkflowState(input.versionId);
    if (!state) {
      throw new Error('Failed to get workflow state');
    }

    return state;
  }

  /**
   * Publish an approved version
   */
  async publish(input: PublishInput): Promise<ArticleWithVersion> {
    const version = await articleRepository.getVersion(input.versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    const state = await reviewRepository.getWorkflowState(input.versionId);
    if (!state || !state.canPublish) {
      throw new Error('Version cannot be published - requires approval');
    }

    // Update version status to published
    const publishedAt = input.effectiveDate || new Date();
    await articleRepository.updateVersionStatus(
      input.versionId,
      'published',
      publishedAt
    );

    // Update article's effective date if provided
    if (input.effectiveDate) {
      await articleRepository.update(version.articleId, {
        effectiveDate: input.effectiveDate,
      });
    }

    const article = await articleRepository.findWithVersion(version.articleId);
    if (!article) {
      throw new Error('Failed to get published article');
    }

    return article;
  }

  /**
   * Archive an article
   */
  async archive(articleId: string, archiverId: string): Promise<Article> {
    const article = await articleRepository.findById(articleId);
    if (!article) {
      throw new Error('Article not found');
    }

    if (article.ownerId !== archiverId) {
      throw new Error('Only the article owner can archive');
    }

    if (article.currentVersionId) {
      await articleRepository.updateVersionStatus(
        article.currentVersionId,
        'archived'
      );
    }

    const updated = await articleRepository.findById(articleId);
    if (!updated) {
      throw new Error('Failed to archive article');
    }

    return updated;
  }

  /**
   * Deprecate an article (mark as outdated but keep visible)
   */
  async deprecate(
    articleId: string,
    deprecaterId: string,
    replacementSlug?: string
  ): Promise<Article> {
    const article = await articleRepository.findById(articleId);
    if (!article) {
      throw new Error('Article not found');
    }

    if (article.ownerId !== deprecaterId) {
      throw new Error('Only the article owner can deprecate');
    }

    if (article.currentVersionId) {
      await articleRepository.updateVersionStatus(
        article.currentVersionId,
        'deprecated'
      );
    }

    const updated = await articleRepository.findById(articleId);
    if (!updated) {
      throw new Error('Failed to deprecate article');
    }

    return updated;
  }

  /**
   * Get workflow state for a version
   */
  async getWorkflowState(versionId: string): Promise<WorkflowState | null> {
    return reviewRepository.getWorkflowState(versionId);
  }

  /**
   * Get pending reviews for a reviewer
   */
  async getPendingReviews(reviewerId: string): Promise<
    Array<{
      versionId: string;
      articleId: string;
      articleTitle: string;
      versionNumber: number;
      authorId: string;
      requestedAt: Date;
    }>
  > {
    const pending = await reviewRepository.getPendingReviewsForReviewer(reviewerId);
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
  async cancelReviewRequests(versionId: string, requesterId: string): Promise<void> {
    const version = await articleRepository.getVersion(versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    const article = await articleRepository.findById(version.articleId);
    if (!article || article.ownerId !== requesterId) {
      throw new Error('Only the article owner can cancel review requests');
    }

    await reviewRepository.cancelPendingReviews(versionId);
    await articleRepository.updateVersionStatus(versionId, 'draft');
  }

  /**
   * Direct publish (bypass review for authorized users)
   * Use with caution - typically for emergency updates
   */
  async directPublish(
    versionId: string,
    publisherId: string,
    reason: string
  ): Promise<ArticleWithVersion> {
    const version = await articleRepository.getVersion(versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    // Update directly to published
    await articleRepository.updateVersionStatus(
      versionId,
      'published',
      new Date()
    );

    const article = await articleRepository.findWithVersion(version.articleId);
    if (!article) {
      throw new Error('Failed to publish article');
    }

    return article;
  }
}

export const workflowService = new WorkflowService();
