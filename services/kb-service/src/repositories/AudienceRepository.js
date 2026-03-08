"use strict";
/**
 * Audience Repository
 * Data access layer for KB audiences (role-based content access)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.audienceRepository = exports.AudienceRepository = void 0;
const uuid_1 = require("uuid");
const connection_js_1 = require("../db/connection.js");
function mapRowToAudience(row) {
    return {
        id: row.id,
        name: row.name,
        roles: row.roles,
        description: row.description ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
class AudienceRepository {
    async findById(id) {
        const result = await (0, connection_js_1.query)('SELECT * FROM kb_audiences WHERE id = $1', [id]);
        return result.rows[0] ? mapRowToAudience(result.rows[0]) : null;
    }
    async findByName(name) {
        const result = await (0, connection_js_1.query)('SELECT * FROM kb_audiences WHERE name = $1', [name]);
        return result.rows[0] ? mapRowToAudience(result.rows[0]) : null;
    }
    async findAll(limit = 100, offset = 0) {
        const [countResult, dataResult] = await Promise.all([
            (0, connection_js_1.query)('SELECT COUNT(*) FROM kb_audiences'),
            (0, connection_js_1.query)('SELECT * FROM kb_audiences ORDER BY name LIMIT $1 OFFSET $2', [limit, offset]),
        ]);
        const total = parseInt(countResult.rows[0].count, 10);
        return {
            data: dataResult.rows.map(mapRowToAudience),
            total,
            limit,
            offset,
            hasMore: offset + dataResult.rows.length < total,
        };
    }
    async findByRole(role) {
        const result = await (0, connection_js_1.query)(`SELECT * FROM kb_audiences WHERE $1 = ANY(roles) OR 'all' = ANY(roles) ORDER BY name`, [role]);
        return result.rows.map(mapRowToAudience);
    }
    async findByIds(ids) {
        if (ids.length === 0)
            return [];
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
        const result = await (0, connection_js_1.query)(`SELECT * FROM kb_audiences WHERE id IN (${placeholders})`, ids);
        return result.rows.map(mapRowToAudience);
    }
    async create(input) {
        const id = (0, uuid_1.v4)();
        const result = await (0, connection_js_1.query)(`INSERT INTO kb_audiences (id, name, roles, description)
       VALUES ($1, $2, $3::audience_role[], $4)
       RETURNING *`, [id, input.name, input.roles, input.description]);
        return mapRowToAudience(result.rows[0]);
    }
    async update(id, input) {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        if (input.name !== undefined) {
            fields.push(`name = $${paramIndex++}`);
            values.push(input.name);
        }
        if (input.roles !== undefined) {
            fields.push(`roles = $${paramIndex++}::audience_role[]`);
            values.push(input.roles);
        }
        if (input.description !== undefined) {
            fields.push(`description = $${paramIndex++}`);
            values.push(input.description);
        }
        if (fields.length === 0) {
            return this.findById(id);
        }
        values.push(id);
        const result = await (0, connection_js_1.query)(`UPDATE kb_audiences SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`, values);
        return result.rows[0] ? mapRowToAudience(result.rows[0]) : null;
    }
    async delete(id) {
        const result = await (0, connection_js_1.query)('DELETE FROM kb_audiences WHERE id = $1', [id]);
        return (result.rowCount ?? 0) > 0;
    }
    async getArticleAudiences(articleId) {
        const result = await (0, connection_js_1.query)(`SELECT a.* FROM kb_audiences a
       JOIN kb_article_audiences aa ON a.id = aa.audience_id
       WHERE aa.article_id = $1
       ORDER BY a.name`, [articleId]);
        return result.rows.map(mapRowToAudience);
    }
    async setArticleAudiences(articleId, audienceIds) {
        await (0, connection_js_1.transaction)(async (client) => {
            // Remove existing audiences
            await client.query('DELETE FROM kb_article_audiences WHERE article_id = $1', [articleId]);
            // Add new audiences
            if (audienceIds.length > 0) {
                const values = audienceIds.map((id, i) => `($1, $${i + 2})`).join(',');
                await client.query(`INSERT INTO kb_article_audiences (article_id, audience_id) VALUES ${values}`, [articleId, ...audienceIds]);
            }
        });
    }
    async canUserAccessArticle(articleId, userRole) {
        const result = await (0, connection_js_1.query)(`SELECT EXISTS(
        SELECT 1 FROM kb_article_audiences aa
        JOIN kb_audiences a ON aa.audience_id = a.id
        WHERE aa.article_id = $1
          AND ($2 = ANY(a.roles) OR 'all' = ANY(a.roles))
      ) AS can_access`, [articleId, userRole]);
        return result.rows[0]?.can_access ?? false;
    }
}
exports.AudienceRepository = AudienceRepository;
exports.audienceRepository = new AudienceRepository();
