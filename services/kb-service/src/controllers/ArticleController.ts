/**
 * Article Controller
 * Handles article CRUD and workflow operations
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { articleRepository } from '../repositories/index.js';
import { workflowService } from '../services/index.js';
import {
  CreateArticleInputSchema,
  UpdateArticleInputSchema,
  CreateVersionInputSchema,
  SubmitForReviewInputSchema,
  ReviewInputSchema,
  PublishInputSchema,
  ContentType,
  ContentStatus,
  ClassificationLevel,
  AudienceRole,
} from '../types/index.js';

// Request validation schemas
const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  contentType: z.nativeEnum(ContentType).optional(),
  classification: z.nativeEnum(ClassificationLevel).optional(),
  status: z.nativeEnum(ContentStatus).optional(),
  tag: z.string().uuid().optional(),
  audience: z.string().uuid().optional(),
  search: z.string().max(500).optional(),
});

export class ArticleController {
  /**
   * List articles with filtering and pagination
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = ListQuerySchema.parse(req.query);
      const userRole = req.headers['x-user-role'] as AudienceRole | undefined;

      const result = await articleRepository.search({
        contentType: query.contentType,
        classification: query.classification,
        status: query.status,
        tagIds: query.tag ? [query.tag] : undefined,
        audienceId: query.audience,
        userRole,
        searchQuery: query.search,
        limit: query.limit,
        offset: query.offset,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get article by ID or slug
   */
  async get(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      // Try UUID first, then slug
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      const article = isUuid
        ? await articleRepository.findWithVersion(id)
        : await articleRepository.findBySlug(id).then(async (a) =>
            a ? articleRepository.findWithVersion(a.id) : null
          );

      if (!article) {
        res.status(404).json({ error: 'Article not found' });
        return;
      }

      res.json(article);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new article
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = CreateArticleInputSchema.parse(req.body);
      const article = await workflowService.createArticle(input);
      res.status(201).json(article);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update article metadata
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const input = UpdateArticleInputSchema.parse(req.body);
      const editorId = req.headers['x-user-id'] as string;

      if (!editorId) {
        res.status(401).json({ error: 'User ID required' });
        return;
      }

      const article = await workflowService.updateArticle(id, input, editorId);
      if (!article) {
        res.status(404).json({ error: 'Article not found' });
        return;
      }

      res.json(article);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete article
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await articleRepository.delete(id);

      if (!deleted) {
        res.status(404).json({ error: 'Article not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get article versions
   */
  async getVersions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const versions = await articleRepository.getVersions(id);
      res.json({ versions });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new version
   */
  async createVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const body = { ...req.body, articleId: id };
      const input = CreateVersionInputSchema.parse(body);

      const version = await workflowService.createVersion(input);
      res.status(201).json(version);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Submit version for review
   */
  async submitForReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { versionId } = req.params;
      const body = { ...req.body, versionId };
      const input = SubmitForReviewInputSchema.parse(body);

      const state = await workflowService.submitForReview(input);
      res.json(state);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Submit review decision
   */
  async submitReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { versionId } = req.params;
      const body = { ...req.body, versionId };
      const input = ReviewInputSchema.parse(body);

      const state = await workflowService.submitReview(input);
      res.json(state);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Publish approved version
   */
  async publish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { versionId } = req.params;
      const body = { ...req.body, versionId };
      const input = PublishInputSchema.parse(body);

      const article = await workflowService.publish(input);
      res.json(article);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get workflow state for a version
   */
  async getWorkflowState(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { versionId } = req.params;
      const state = await workflowService.getWorkflowState(versionId);

      if (!state) {
        res.status(404).json({ error: 'Version not found' });
        return;
      }

      res.json(state);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Archive article
   */
  async archive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const archiverId = req.headers['x-user-id'] as string;

      if (!archiverId) {
        res.status(401).json({ error: 'User ID required' });
        return;
      }

      const article = await workflowService.archive(id, archiverId);
      res.json(article);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending reviews for current user
   */
  async getPendingReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviewerId = req.headers['x-user-id'] as string;

      if (!reviewerId) {
        res.status(401).json({ error: 'User ID required' });
        return;
      }

      const pending = await workflowService.getPendingReviews(reviewerId);
      res.json({ reviews: pending });
    } catch (error) {
      next(error);
    }
  }
}

export const articleController = new ArticleController();
