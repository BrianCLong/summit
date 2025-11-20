/**
 * Knowledge Base Service
 * Manages self-service documentation, articles, FAQs, and tutorials
 */

import { Pool, PoolClient } from 'pg';
import { Logger } from 'pino';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import {
  KBArticle,
  KBArticleVersion,
  KBFAQ,
  KBTutorial,
  CreateArticleInput,
  UpdateArticleInput,
  SearchArticlesInput,
  ArticleAnalytics,
  KBMetrics
} from './types';

export class KnowledgeBaseService {
  private pool: Pool;
  private logger: Logger;

  constructor(pool: Pool, logger: Logger) {
    this.pool = pool;
    this.logger = logger.child({ service: 'KnowledgeBaseService' });
  }

  /**
   * Create a new knowledge base article
   */
  async createArticle(input: CreateArticleInput): Promise<KBArticle> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Generate slug from title
      const slug = this.generateSlug(input.title);

      // Sanitize content
      const sanitizedContent = this.sanitizeContent(input.content);

      const result = await client.query(
        `INSERT INTO kb_articles (
          tenant_id, title, slug, content, excerpt, category, subcategory,
          tags, author_id, is_public, is_internal, meta_description, keywords
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          input.tenantId,
          input.title,
          slug,
          sanitizedContent,
          input.excerpt,
          input.category,
          input.subcategory,
          input.tags || [],
          input.authorId,
          input.isPublic || false,
          input.isInternal || false,
          input.metaDescription,
          input.keywords || []
        ]
      );

      const article = this.mapRowToArticle(result.rows[0]);

      // Create initial version
      await client.query(
        `INSERT INTO kb_article_versions (article_id, version, title, content, changed_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [article.id, 1, input.title, sanitizedContent, input.authorId]
      );

      await client.query('COMMIT');

      this.logger.info({ articleId: article.id, slug }, 'Article created');

      return article;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error({ error, input }, 'Failed to create article');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing article
   */
  async updateArticle(
    articleId: string,
    updates: UpdateArticleInput,
    userId?: string,
    changeNote?: string
  ): Promise<KBArticle> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get current article
      const currentResult = await client.query(
        'SELECT * FROM kb_articles WHERE id = $1',
        [articleId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('Article not found');
      }

      const current = this.mapRowToArticle(currentResult.rows[0]);
      const contentChanged = updates.content && updates.content !== current.content;

      // Build update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.title !== undefined) {
        updateFields.push(`title = $${paramIndex++}`);
        values.push(updates.title);

        // Update slug if title changed
        updateFields.push(`slug = $${paramIndex++}`);
        values.push(this.generateSlug(updates.title));
      }

      if (updates.content !== undefined) {
        const sanitizedContent = this.sanitizeContent(updates.content);
        updateFields.push(`content = $${paramIndex++}`);
        values.push(sanitizedContent);

        // Increment version if content changed
        if (contentChanged) {
          updateFields.push(`version = version + 1`);
        }
      }

      if (updates.excerpt !== undefined) {
        updateFields.push(`excerpt = $${paramIndex++}`);
        values.push(updates.excerpt);
      }

      if (updates.category !== undefined) {
        updateFields.push(`category = $${paramIndex++}`);
        values.push(updates.category);
      }

      if (updates.subcategory !== undefined) {
        updateFields.push(`subcategory = $${paramIndex++}`);
        values.push(updates.subcategory);
      }

      if (updates.tags !== undefined) {
        updateFields.push(`tags = $${paramIndex++}`);
        values.push(updates.tags);
      }

      if (updates.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        values.push(updates.status);

        // Set published_at if publishing
        if (updates.status === 'published' && current.status !== 'published') {
          updateFields.push(`published_at = NOW()`);
        }
      }

      if (updates.isPublic !== undefined) {
        updateFields.push(`is_public = $${paramIndex++}`);
        values.push(updates.isPublic);
      }

      if (updates.isInternal !== undefined) {
        updateFields.push(`is_internal = $${paramIndex++}`);
        values.push(updates.isInternal);
      }

      if (updates.metaDescription !== undefined) {
        updateFields.push(`meta_description = $${paramIndex++}`);
        values.push(updates.metaDescription);
      }

      if (updates.keywords !== undefined) {
        updateFields.push(`keywords = $${paramIndex++}`);
        values.push(updates.keywords);
      }

      updateFields.push(`updated_at = NOW()`);

      values.push(articleId);

      const result = await client.query(
        `UPDATE kb_articles SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      const updated = this.mapRowToArticle(result.rows[0]);

      // Create new version if content changed
      if (contentChanged) {
        await client.query(
          `INSERT INTO kb_article_versions (article_id, version, title, content, changed_by, change_note)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [articleId, updated.version, updated.title, updated.content, userId, changeNote]
        );
      }

      await client.query('COMMIT');

      this.logger.info({ articleId, updates }, 'Article updated');

      return updated;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error({ error, articleId, updates }, 'Failed to update article');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Search articles with full-text search
   */
  async searchArticles(input: SearchArticlesInput): Promise<KBArticle[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.tenantId) {
      conditions.push(`tenant_id = $${paramIndex++}`);
      values.push(input.tenantId);
    }

    if (input.query) {
      conditions.push(`to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', $${paramIndex++})`);
      values.push(input.query);
    }

    if (input.category) {
      conditions.push(`category = $${paramIndex++}`);
      values.push(input.category);
    }

    if (input.tags && input.tags.length > 0) {
      conditions.push(`tags && $${paramIndex++}`);
      values.push(input.tags);
    }

    if (input.status && input.status.length > 0) {
      conditions.push(`status = ANY($${paramIndex++})`);
      values.push(input.status);
    }

    if (input.isPublic !== undefined) {
      conditions.push(`is_public = $${paramIndex++}`);
      values.push(input.isPublic);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const limit = input.limit || 50;
    const offset = input.offset || 0;

    const query = `
      SELECT * FROM kb_articles
      ${whereClause}
      ORDER BY published_at DESC NULLS LAST, created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    values.push(limit, offset);

    const result = await this.pool.query(query, values);
    return result.rows.map(row => this.mapRowToArticle(row));
  }

  /**
   * Get article by ID
   */
  async getArticleById(articleId: string): Promise<KBArticle | null> {
    const result = await this.pool.query(
      'SELECT * FROM kb_articles WHERE id = $1',
      [articleId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToArticle(result.rows[0]);
  }

  /**
   * Get article by slug
   */
  async getArticleBySlug(slug: string, tenantId: string): Promise<KBArticle | null> {
    const result = await this.pool.query(
      'SELECT * FROM kb_articles WHERE slug = $1 AND tenant_id = $2',
      [slug, tenantId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToArticle(result.rows[0]);
  }

  /**
   * Increment article view count
   */
  async incrementViewCount(articleId: string): Promise<void> {
    await this.pool.query(
      'UPDATE kb_articles SET view_count = view_count + 1 WHERE id = $1',
      [articleId]
    );
  }

  /**
   * Record article helpfulness feedback
   */
  async recordFeedback(articleId: string, isHelpful: boolean): Promise<void> {
    const field = isHelpful ? 'helpful_count' : 'not_helpful_count';
    await this.pool.query(
      `UPDATE kb_articles SET ${field} = ${field} + 1 WHERE id = $1`,
      [articleId]
    );
  }

  /**
   * Get article versions
   */
  async getArticleVersions(articleId: string): Promise<KBArticleVersion[]> {
    const result = await this.pool.query(
      'SELECT * FROM kb_article_versions WHERE article_id = $1 ORDER BY version DESC',
      [articleId]
    );

    return result.rows.map(row => this.mapRowToArticleVersion(row));
  }

  /**
   * Create FAQ
   */
  async createFAQ(
    tenantId: string,
    question: string,
    answer: string,
    category?: string,
    isFeatured = false
  ): Promise<KBFAQ> {
    const result = await this.pool.query(
      `INSERT INTO kb_faqs (tenant_id, question, answer, category, is_featured)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [tenantId, question, answer, category, isFeatured]
    );

    return this.mapRowToFAQ(result.rows[0]);
  }

  /**
   * Get FAQs by category
   */
  async getFAQsByCategory(tenantId: string, category?: string): Promise<KBFAQ[]> {
    let query = 'SELECT * FROM kb_faqs WHERE tenant_id = $1';
    const values: any[] = [tenantId];

    if (category) {
      query += ' AND category = $2';
      values.push(category);
    }

    query += ' ORDER BY order_index, created_at DESC';

    const result = await this.pool.query(query, values);
    return result.rows.map(row => this.mapRowToFAQ(row));
  }

  /**
   * Create tutorial
   */
  async createTutorial(
    tenantId: string,
    title: string,
    description: string,
    content?: string,
    videoUrl?: string,
    difficulty?: 'beginner' | 'intermediate' | 'advanced'
  ): Promise<KBTutorial> {
    const result = await this.pool.query(
      `INSERT INTO kb_tutorials (tenant_id, title, description, content, video_url, difficulty)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [tenantId, title, description, content, videoUrl, difficulty]
    );

    return this.mapRowToTutorial(result.rows[0]);
  }

  /**
   * Get tutorials
   */
  async getTutorials(tenantId: string, category?: string): Promise<KBTutorial[]> {
    let query = 'SELECT * FROM kb_tutorials WHERE tenant_id = $1';
    const values: any[] = [tenantId];

    if (category) {
      query += ' AND category = $2';
      values.push(category);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.pool.query(query, values);
    return result.rows.map(row => this.mapRowToTutorial(row));
  }

  /**
   * Get knowledge base metrics
   */
  async getMetrics(tenantId: string): Promise<KBMetrics> {
    const statsResult = await this.pool.query(
      `SELECT
        COUNT(*) as total_articles,
        COUNT(*) FILTER (WHERE status = 'published') as published_articles,
        SUM(view_count) as total_views,
        AVG(CASE
          WHEN helpful_count + not_helpful_count > 0
          THEN helpful_count::float / (helpful_count + not_helpful_count)
          ELSE 0
        END) as avg_helpfulness_ratio
      FROM kb_articles
      WHERE tenant_id = $1`,
      [tenantId]
    );

    const topArticlesResult = await this.pool.query(
      `SELECT id, title, view_count,
        CASE
          WHEN helpful_count + not_helpful_count > 0
          THEN helpful_count::float / (helpful_count + not_helpful_count)
          ELSE 0
        END as helpfulness_ratio
      FROM kb_articles
      WHERE tenant_id = $1 AND status = 'published'
      ORDER BY view_count DESC
      LIMIT 10`,
      [tenantId]
    );

    const categoriesResult = await this.pool.query(
      `SELECT category, COUNT(*) as article_count, SUM(view_count) as view_count
      FROM kb_articles
      WHERE tenant_id = $1 AND status = 'published' AND category IS NOT NULL
      GROUP BY category
      ORDER BY view_count DESC
      LIMIT 10`,
      [tenantId]
    );

    const stats = statsResult.rows[0];

    return {
      totalArticles: parseInt(stats.total_articles) || 0,
      publishedArticles: parseInt(stats.published_articles) || 0,
      totalViews: parseInt(stats.total_views) || 0,
      averageHelpfulnessRatio: parseFloat(stats.avg_helpfulness_ratio) || 0,
      topArticles: topArticlesResult.rows.map(row => ({
        id: row.id,
        title: row.title,
        viewCount: parseInt(row.view_count) || 0,
        helpfulnessRatio: parseFloat(row.helpfulness_ratio) || 0
      })),
      popularCategories: categoriesResult.rows.map(row => ({
        category: row.category,
        articleCount: parseInt(row.article_count) || 0,
        viewCount: parseInt(row.view_count) || 0
      }))
    };
  }

  /**
   * Generate URL-friendly slug from title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 200);
  }

  /**
   * Sanitize HTML content
   */
  private sanitizeContent(content: string): string {
    return sanitizeHtml(content, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'video', 'iframe']),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        '*': ['class', 'id'],
        'img': ['src', 'alt', 'width', 'height'],
        'video': ['src', 'controls', 'width', 'height'],
        'iframe': ['src', 'width', 'height', 'frameborder', 'allowfullscreen']
      },
      allowedIframeHostnames: ['www.youtube.com', 'player.vimeo.com']
    });
  }

  /**
   * Map database row to KBArticle
   */
  private mapRowToArticle(row: any): KBArticle {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      title: row.title,
      slug: row.slug,
      content: row.content,
      excerpt: row.excerpt,
      category: row.category,
      subcategory: row.subcategory,
      tags: row.tags,
      authorId: row.author_id,
      status: row.status,
      version: row.version,
      metaDescription: row.meta_description,
      keywords: row.keywords,
      viewCount: row.view_count,
      helpfulCount: row.helpful_count,
      notHelpfulCount: row.not_helpful_count,
      isPublic: row.is_public,
      isInternal: row.is_internal,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Map database row to KBArticleVersion
   */
  private mapRowToArticleVersion(row: any): KBArticleVersion {
    return {
      id: row.id,
      articleId: row.article_id,
      version: row.version,
      title: row.title,
      content: row.content,
      changedBy: row.changed_by,
      changeNote: row.change_note,
      createdAt: row.created_at
    };
  }

  /**
   * Map database row to KBFAQ
   */
  private mapRowToFAQ(row: any): KBFAQ {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      question: row.question,
      answer: row.answer,
      category: row.category,
      orderIndex: row.order_index,
      isFeatured: row.is_featured,
      viewCount: row.view_count,
      helpfulCount: row.helpful_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Map database row to KBTutorial
   */
  private mapRowToTutorial(row: any): KBTutorial {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      title: row.title,
      description: row.description,
      difficulty: row.difficulty,
      estimatedDuration: row.estimated_duration,
      content: row.content,
      videoUrl: row.video_url,
      category: row.category,
      tags: row.tags,
      prerequisites: row.prerequisites,
      learningOutcomes: row.learning_outcomes,
      viewCount: row.view_count,
      completionCount: row.completion_count,
      rating: row.rating ? parseFloat(row.rating) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
