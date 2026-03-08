"use strict";
/**
 * Article Repository
 * Data access layer for KB articles and versions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.articleRepository = exports.ArticleRepository = void 0;
const uuid_1 = require("uuid");
const connection_js_1 = require("../db/connection.js");
const TagRepository_js_1 = require("./TagRepository.js");
const AudienceRepository_js_1 = require("./AudienceRepository.js");
function mapRowToArticle(row) {
    return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        contentType: row.content_type,
        classification: row.classification,
        effectiveDate: row.effective_date,
        expirationDate: row.expiration_date,
        ownerId: row.owner_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        currentVersionId: row.current_version_id,
    };
}
function mapRowToVersion(row) {
    return {
        id: row.id,
        articleId: row.article_id,
        versionNumber: row.version_number,
        content: row.content,
        contentHtml: row.content_html,
        summary: row.summary ?? undefined,
        changeNotes: row.change_notes ?? undefined,
        authorId: row.author_id,
        status: row.status,
        createdAt: row.created_at,
        publishedAt: row.published_at,
    };
}
class ArticleRepository {
    async findById(id) {
        const result = await (0, connection_js_1.query)('SELECT * FROM kb_articles WHERE id = $1', [id]);
        if (!result.rows[0])
            return null;
        const article = mapRowToArticle(result.rows[0]);
        article.tags = await TagRepository_js_1.tagRepository.getArticleTags(id);
        article.audiences = await AudienceRepository_js_1.audienceRepository.getArticleAudiences(id);
        return article;
    }
    async findBySlug(slug) {
        const result = await (0, connection_js_1.query)('SELECT * FROM kb_articles WHERE slug = $1', [slug]);
        if (!result.rows[0])
            return null;
        const article = mapRowToArticle(result.rows[0]);
        article.tags = await TagRepository_js_1.tagRepository.getArticleTags(article.id);
        article.audiences = await AudienceRepository_js_1.audienceRepository.getArticleAudiences(article.id);
        return article;
    }
    async findWithVersion(id) {
        const article = await this.findById(id);
        if (!article)
            return null;
        let currentVersion = null;
        if (article.currentVersionId) {
            currentVersion = await this.getVersion(article.currentVersionId);
        }
        return { ...article, currentVersion };
    }
    async search(options) {
        const conditions = [];
        const params = [];
        let paramIndex = 1;
        if (options.contentType) {
            conditions.push(`a.content_type = $${paramIndex++}::content_type`);
            params.push(options.contentType);
        }
        if (options.classification) {
            conditions.push(`a.classification = $${paramIndex++}::classification_level`);
            params.push(options.classification);
        }
        if (options.status) {
            conditions.push(`v.status = $${paramIndex++}::content_status`);
            params.push(options.status);
        }
        if (options.ownerId) {
            conditions.push(`a.owner_id = $${paramIndex++}`);
            params.push(options.ownerId);
        }
        if (options.tagIds && options.tagIds.length > 0) {
            const tagPlaceholders = options.tagIds.map(() => `$${paramIndex++}`).join(',');
            conditions.push(`EXISTS (
        SELECT 1 FROM kb_article_tags at
        WHERE at.article_id = a.id AND at.tag_id IN (${tagPlaceholders})
      )`);
            params.push(...options.tagIds);
        }
        if (options.audienceId) {
            conditions.push(`EXISTS (
        SELECT 1 FROM kb_article_audiences aa
        WHERE aa.article_id = a.id AND aa.audience_id = $${paramIndex++}
      )`);
            params.push(options.audienceId);
        }
        if (options.userRole) {
            conditions.push(`EXISTS (
        SELECT 1 FROM kb_article_audiences aa
        JOIN kb_audiences aud ON aa.audience_id = aud.id
        WHERE aa.article_id = a.id
          AND ($${paramIndex++} = ANY(aud.roles) OR 'all' = ANY(aud.roles))
      )`);
            params.push(options.userRole);
        }
        if (options.searchQuery) {
            conditions.push(`(
        a.search_vector @@ plainto_tsquery('english', $${paramIndex++})
        OR a.title ILIKE $${paramIndex++}
        OR v.content ILIKE $${paramIndex++}
      )`);
            const searchTerm = `%${options.searchQuery}%`;
            params.push(options.searchQuery, searchTerm, searchTerm);
        }
        if (!options.includeExpired) {
            conditions.push(`(a.expiration_date IS NULL OR a.expiration_date > NOW())`);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const countQuery = `
      SELECT COUNT(DISTINCT a.id)
      FROM kb_articles a
      LEFT JOIN kb_versions v ON a.current_version_id = v.id
      ${whereClause}
    `;
        const limit = options.limit || 20;
        const offset = options.offset || 0;
        const dataQuery = `
      SELECT
        a.*,
        v.id as version_id,
        v.version_number,
        v.content,
        v.content_html,
        v.summary as version_summary,
        v.change_notes,
        v.author_id as version_author_id,
        v.status as version_status,
        v.created_at as version_created_at,
        v.published_at
      FROM kb_articles a
      LEFT JOIN kb_versions v ON a.current_version_id = v.id
      ${whereClause}
      ORDER BY a.updated_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
        params.push(limit, offset);
        const [countResult, dataResult] = await Promise.all([
            (0, connection_js_1.query)(countQuery, params.slice(0, -2)),
            (0, connection_js_1.query)(dataQuery, params),
        ]);
        const total = parseInt(countResult.rows[0].count, 10);
        const articles = await Promise.all(dataResult.rows.map(async (row) => {
            const article = mapRowToArticle(row);
            article.tags = await TagRepository_js_1.tagRepository.getArticleTags(article.id);
            article.audiences = await AudienceRepository_js_1.audienceRepository.getArticleAudiences(article.id);
            let currentVersion = null;
            if (row.version_id) {
                currentVersion = {
                    id: row.version_id,
                    articleId: article.id,
                    versionNumber: row.version_number,
                    content: row.content,
                    contentHtml: row.content_html,
                    summary: row.version_summary ?? undefined,
                    changeNotes: row.change_notes ?? undefined,
                    authorId: row.version_author_id,
                    status: row.version_status,
                    createdAt: row.version_created_at,
                    publishedAt: row.published_at ?? null,
                };
            }
            return { ...article, currentVersion };
        }));
        return {
            data: articles,
            total,
            limit,
            offset,
            hasMore: offset + articles.length < total,
        };
    }
    async create(input, contentHtml) {
        return (0, connection_js_1.transaction)(async (client) => {
            const articleId = (0, uuid_1.v4)();
            const versionId = (0, uuid_1.v4)();
            // Create article
            await client.query(`INSERT INTO kb_articles (
          id, slug, title, content_type, classification,
          effective_date, expiration_date, owner_id
        ) VALUES ($1, $2, $3, $4::content_type, $5::classification_level, $6, $7, $8)`, [
                articleId,
                input.slug,
                input.title,
                input.contentType,
                input.classification,
                input.effectiveDate,
                input.expirationDate,
                input.ownerId,
            ]);
            // Create initial version
            await client.query(`INSERT INTO kb_versions (
          id, article_id, version_number, content, content_html,
          summary, author_id, status
        ) VALUES ($1, $2, 1, $3, $4, $5, $6, 'draft')`, [versionId, articleId, input.content, contentHtml, input.summary, input.ownerId]);
            // Update article with current version
            await client.query('UPDATE kb_articles SET current_version_id = $1 WHERE id = $2', [versionId, articleId]);
            // Add tags
            if (input.tagIds && input.tagIds.length > 0) {
                const tagValues = input.tagIds.map((_, i) => `($1, $${i + 2})`).join(',');
                await client.query(`INSERT INTO kb_article_tags (article_id, tag_id) VALUES ${tagValues}`, [articleId, ...input.tagIds]);
            }
            // Add audiences
            if (input.audienceIds && input.audienceIds.length > 0) {
                const audValues = input.audienceIds.map((_, i) => `($1, $${i + 2})`).join(',');
                await client.query(`INSERT INTO kb_article_audiences (article_id, audience_id) VALUES ${audValues}`, [articleId, ...input.audienceIds]);
            }
            // Return the created article with version
            const article = await this.findWithVersion(articleId);
            if (!article) {
                throw new Error('Failed to create article');
            }
            return article;
        });
    }
    async update(id, input) {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        if (input.slug !== undefined) {
            fields.push(`slug = $${paramIndex++}`);
            values.push(input.slug);
        }
        if (input.title !== undefined) {
            fields.push(`title = $${paramIndex++}`);
            values.push(input.title);
        }
        if (input.contentType !== undefined) {
            fields.push(`content_type = $${paramIndex++}::content_type`);
            values.push(input.contentType);
        }
        if (input.classification !== undefined) {
            fields.push(`classification = $${paramIndex++}::classification_level`);
            values.push(input.classification);
        }
        if (input.effectiveDate !== undefined) {
            fields.push(`effective_date = $${paramIndex++}`);
            values.push(input.effectiveDate);
        }
        if (input.expirationDate !== undefined) {
            fields.push(`expiration_date = $${paramIndex++}`);
            values.push(input.expirationDate);
        }
        if (fields.length === 0 && !input.tagIds && !input.audienceIds) {
            return this.findById(id);
        }
        await (0, connection_js_1.transaction)(async (client) => {
            if (fields.length > 0) {
                values.push(id);
                await client.query(`UPDATE kb_articles SET ${fields.join(', ')} WHERE id = $${paramIndex}`, values);
            }
            if (input.tagIds) {
                await client.query('DELETE FROM kb_article_tags WHERE article_id = $1', [id]);
                if (input.tagIds.length > 0) {
                    const tagValues = input.tagIds.map((_, i) => `($1, $${i + 2})`).join(',');
                    await client.query(`INSERT INTO kb_article_tags (article_id, tag_id) VALUES ${tagValues}`, [id, ...input.tagIds]);
                }
            }
            if (input.audienceIds) {
                await client.query('DELETE FROM kb_article_audiences WHERE article_id = $1', [id]);
                if (input.audienceIds.length > 0) {
                    const audValues = input.audienceIds.map((_, i) => `($1, $${i + 2})`).join(',');
                    await client.query(`INSERT INTO kb_article_audiences (article_id, audience_id) VALUES ${audValues}`, [id, ...input.audienceIds]);
                }
            }
        });
        return this.findById(id);
    }
    async delete(id) {
        const result = await (0, connection_js_1.query)('DELETE FROM kb_articles WHERE id = $1', [id]);
        return (result.rowCount ?? 0) > 0;
    }
    // Version methods
    async getVersion(versionId) {
        const result = await (0, connection_js_1.query)('SELECT * FROM kb_versions WHERE id = $1', [versionId]);
        return result.rows[0] ? mapRowToVersion(result.rows[0]) : null;
    }
    async getVersions(articleId) {
        const result = await (0, connection_js_1.query)('SELECT * FROM kb_versions WHERE article_id = $1 ORDER BY version_number DESC', [articleId]);
        return result.rows.map(mapRowToVersion);
    }
    async createVersion(input, contentHtml) {
        return (0, connection_js_1.transaction)(async (client) => {
            // Get next version number
            const maxResult = await client.query('SELECT COALESCE(MAX(version_number), 0) as max FROM kb_versions WHERE article_id = $1', [input.articleId]);
            const nextVersion = maxResult.rows[0].max + 1;
            const versionId = (0, uuid_1.v4)();
            const result = await client.query(`INSERT INTO kb_versions (
          id, article_id, version_number, content, content_html,
          summary, change_notes, author_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')
        RETURNING *`, [
                versionId,
                input.articleId,
                nextVersion,
                input.content,
                contentHtml,
                input.summary,
                input.changeNotes,
                input.authorId,
            ]);
            // Update article's current version
            await client.query('UPDATE kb_articles SET current_version_id = $1 WHERE id = $2', [versionId, input.articleId]);
            return mapRowToVersion(result.rows[0]);
        });
    }
    async updateVersionStatus(versionId, status, publishedAt) {
        const result = await (0, connection_js_1.query)(`UPDATE kb_versions
       SET status = $1::content_status, published_at = $2
       WHERE id = $3
       RETURNING *`, [status, publishedAt ?? null, versionId]);
        return result.rows[0] ? mapRowToVersion(result.rows[0]) : null;
    }
    async getPublishedArticles(userRole, limit = 20, offset = 0) {
        return this.search({
            status: 'published',
            userRole,
            includeExpired: false,
            limit,
            offset,
        });
    }
}
exports.ArticleRepository = ArticleRepository;
exports.articleRepository = new ArticleRepository();
