"use strict";
/**
 * Article Controller
 * Handles article CRUD and workflow operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.articleController = exports.ArticleController = void 0;
const zod_1 = require("zod");
const index_js_1 = require("../repositories/index.js");
const index_js_2 = require("../services/index.js");
const index_js_3 = require("../types/index.js");
// Request validation schemas
const ListQuerySchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    offset: zod_1.z.coerce.number().int().min(0).default(0),
    contentType: zod_1.z.nativeEnum(index_js_3.ContentType).optional(),
    classification: zod_1.z.nativeEnum(index_js_3.ClassificationLevel).optional(),
    status: zod_1.z.nativeEnum(index_js_3.ContentStatus).optional(),
    tag: zod_1.z.string().uuid().optional(),
    audience: zod_1.z.string().uuid().optional(),
    search: zod_1.z.string().max(500).optional(),
});
class ArticleController {
    /**
     * List articles with filtering and pagination
     */
    async list(req, res, next) {
        try {
            const query = ListQuerySchema.parse(req.query);
            const userRole = req.headers['x-user-role'];
            const result = await index_js_1.articleRepository.search({
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
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get article by ID or slug
     */
    async get(req, res, next) {
        try {
            const { id } = req.params;
            // Try UUID first, then slug
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            const article = isUuid
                ? await index_js_1.articleRepository.findWithVersion(id)
                : await index_js_1.articleRepository.findBySlug(id).then(async (a) => a ? index_js_1.articleRepository.findWithVersion(a.id) : null);
            if (!article) {
                res.status(404).json({ error: 'Article not found' });
                return;
            }
            res.json(article);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Create a new article
     */
    async create(req, res, next) {
        try {
            const input = index_js_3.CreateArticleInputSchema.parse(req.body);
            const article = await index_js_2.workflowService.createArticle(input);
            res.status(201).json(article);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Update article metadata
     */
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const input = index_js_3.UpdateArticleInputSchema.parse(req.body);
            const editorId = req.headers['x-user-id'];
            if (!editorId) {
                res.status(401).json({ error: 'User ID required' });
                return;
            }
            const article = await index_js_2.workflowService.updateArticle(id, input, editorId);
            if (!article) {
                res.status(404).json({ error: 'Article not found' });
                return;
            }
            res.json(article);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Delete article
     */
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const deleted = await index_js_1.articleRepository.delete(id);
            if (!deleted) {
                res.status(404).json({ error: 'Article not found' });
                return;
            }
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get article versions
     */
    async getVersions(req, res, next) {
        try {
            const { id } = req.params;
            const versions = await index_js_1.articleRepository.getVersions(id);
            res.json({ versions });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Create a new version
     */
    async createVersion(req, res, next) {
        try {
            const { id } = req.params;
            const body = { ...req.body, articleId: id };
            const input = index_js_3.CreateVersionInputSchema.parse(body);
            const version = await index_js_2.workflowService.createVersion(input);
            res.status(201).json(version);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Submit version for review
     */
    async submitForReview(req, res, next) {
        try {
            const { versionId } = req.params;
            const body = { ...req.body, versionId };
            const input = index_js_3.SubmitForReviewInputSchema.parse(body);
            const state = await index_js_2.workflowService.submitForReview(input);
            res.json(state);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Submit review decision
     */
    async submitReview(req, res, next) {
        try {
            const { versionId } = req.params;
            const body = { ...req.body, versionId };
            const input = index_js_3.ReviewInputSchema.parse(body);
            const state = await index_js_2.workflowService.submitReview(input);
            res.json(state);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Publish approved version
     */
    async publish(req, res, next) {
        try {
            const { versionId } = req.params;
            const body = { ...req.body, versionId };
            const input = index_js_3.PublishInputSchema.parse(body);
            const article = await index_js_2.workflowService.publish(input);
            res.json(article);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get workflow state for a version
     */
    async getWorkflowState(req, res, next) {
        try {
            const { versionId } = req.params;
            const state = await index_js_2.workflowService.getWorkflowState(versionId);
            if (!state) {
                res.status(404).json({ error: 'Version not found' });
                return;
            }
            res.json(state);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Archive article
     */
    async archive(req, res, next) {
        try {
            const { id } = req.params;
            const archiverId = req.headers['x-user-id'];
            if (!archiverId) {
                res.status(401).json({ error: 'User ID required' });
                return;
            }
            const article = await index_js_2.workflowService.archive(id, archiverId);
            res.json(article);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get pending reviews for current user
     */
    async getPendingReviews(req, res, next) {
        try {
            const reviewerId = req.headers['x-user-id'];
            if (!reviewerId) {
                res.status(401).json({ error: 'User ID required' });
                return;
            }
            const pending = await index_js_2.workflowService.getPendingReviews(reviewerId);
            res.json({ reviews: pending });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ArticleController = ArticleController;
exports.articleController = new ArticleController();
