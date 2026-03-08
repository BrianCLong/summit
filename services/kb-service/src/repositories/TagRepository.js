"use strict";
/**
 * Tag Repository
 * Data access layer for KB tags
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagRepository = exports.TagRepository = void 0;
const uuid_1 = require("uuid");
const connection_js_1 = require("../db/connection.js");
function mapRowToTag(row) {
    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description ?? undefined,
        color: row.color ?? undefined,
        category: row.category ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
class TagRepository {
    async findById(id) {
        const result = await (0, connection_js_1.query)('SELECT * FROM kb_tags WHERE id = $1', [id]);
        return result.rows[0] ? mapRowToTag(result.rows[0]) : null;
    }
    async findBySlug(slug) {
        const result = await (0, connection_js_1.query)('SELECT * FROM kb_tags WHERE slug = $1', [slug]);
        return result.rows[0] ? mapRowToTag(result.rows[0]) : null;
    }
    async findAll(limit = 100, offset = 0, category) {
        let countQuery = 'SELECT COUNT(*) FROM kb_tags';
        let dataQuery = 'SELECT * FROM kb_tags';
        const params = [];
        if (category) {
            countQuery += ' WHERE category = $1';
            dataQuery += ' WHERE category = $1';
            params.push(category);
        }
        dataQuery += ` ORDER BY category, name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
        const [countResult, dataResult] = await Promise.all([
            (0, connection_js_1.query)(countQuery, category ? [category] : []),
            (0, connection_js_1.query)(dataQuery, params),
        ]);
        const total = parseInt(countResult.rows[0].count, 10);
        return {
            data: dataResult.rows.map(mapRowToTag),
            total,
            limit,
            offset,
            hasMore: offset + dataResult.rows.length < total,
        };
    }
    async findByIds(ids) {
        if (ids.length === 0)
            return [];
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
        const result = await (0, connection_js_1.query)(`SELECT * FROM kb_tags WHERE id IN (${placeholders})`, ids);
        return result.rows.map(mapRowToTag);
    }
    async create(input) {
        const id = (0, uuid_1.v4)();
        const result = await (0, connection_js_1.query)(`INSERT INTO kb_tags (id, name, slug, description, color, category)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`, [id, input.name, input.slug, input.description, input.color, input.category]);
        return mapRowToTag(result.rows[0]);
    }
    async update(id, input) {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        if (input.name !== undefined) {
            fields.push(`name = $${paramIndex++}`);
            values.push(input.name);
        }
        if (input.slug !== undefined) {
            fields.push(`slug = $${paramIndex++}`);
            values.push(input.slug);
        }
        if (input.description !== undefined) {
            fields.push(`description = $${paramIndex++}`);
            values.push(input.description);
        }
        if (input.color !== undefined) {
            fields.push(`color = $${paramIndex++}`);
            values.push(input.color);
        }
        if (input.category !== undefined) {
            fields.push(`category = $${paramIndex++}`);
            values.push(input.category);
        }
        if (fields.length === 0) {
            return this.findById(id);
        }
        values.push(id);
        const result = await (0, connection_js_1.query)(`UPDATE kb_tags SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`, values);
        return result.rows[0] ? mapRowToTag(result.rows[0]) : null;
    }
    async delete(id) {
        const result = await (0, connection_js_1.query)('DELETE FROM kb_tags WHERE id = $1', [id]);
        return (result.rowCount ?? 0) > 0;
    }
    async getArticleTags(articleId) {
        const result = await (0, connection_js_1.query)(`SELECT t.* FROM kb_tags t
       JOIN kb_article_tags at ON t.id = at.tag_id
       WHERE at.article_id = $1
       ORDER BY t.name`, [articleId]);
        return result.rows.map(mapRowToTag);
    }
    async setArticleTags(articleId, tagIds) {
        await (0, connection_js_1.transaction)(async (client) => {
            // Remove existing tags
            await client.query('DELETE FROM kb_article_tags WHERE article_id = $1', [articleId]);
            // Add new tags
            if (tagIds.length > 0) {
                const values = tagIds.map((tagId, i) => `($1, $${i + 2})`).join(',');
                await client.query(`INSERT INTO kb_article_tags (article_id, tag_id) VALUES ${values}`, [articleId, ...tagIds]);
            }
        });
    }
}
exports.TagRepository = TagRepository;
exports.tagRepository = new TagRepository();
