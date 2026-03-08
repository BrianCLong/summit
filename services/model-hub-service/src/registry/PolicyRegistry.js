"use strict";
/**
 * Policy Profile Registry - Manages policy profiles for models
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyRegistry = exports.PolicyRegistry = void 0;
const connection_js_1 = require("../db/connection.js");
const id_js_1 = require("../utils/id.js");
const logger_js_1 = require("../utils/logger.js");
const errors_js_1 = require("../utils/errors.js");
// ============================================================================
// Row Transformation
// ============================================================================
function rowToPolicyProfile(row) {
    return {
        id: row.id,
        name: row.name,
        description: row.description || undefined,
        rules: row.rules,
        dataClassifications: row.data_classifications,
        complianceFrameworks: row.compliance_frameworks,
        isDefault: row.is_default,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by,
    };
}
class PolicyRegistry {
    async createPolicyProfile(input, client) {
        const id = (0, id_js_1.generateId)();
        const now = new Date();
        // Check for duplicate name
        const existing = await this.getPolicyProfileByName(input.name, client);
        if (existing) {
            throw new errors_js_1.ConflictError(`Policy profile with name '${input.name}' already exists`);
        }
        // If setting as default, unset other defaults
        if (input.isDefault) {
            await this.clearDefaultPolicyProfile(client);
        }
        const query = `
      INSERT INTO model_hub_policy_profiles (
        id, name, description, rules, data_classifications,
        compliance_frameworks, is_default, is_active,
        created_at, updated_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
        const params = [
            id,
            input.name,
            input.description || null,
            input.rules,
            input.dataClassifications || ['unclassified'],
            input.complianceFrameworks || [],
            input.isDefault || false,
            input.isActive !== false,
            now,
            now,
            input.createdBy,
        ];
        const result = await connection_js_1.db.query(query, params, client);
        const profile = rowToPolicyProfile(result.rows[0]);
        logger_js_1.logger.info({
            message: 'Policy profile created',
            policyProfileId: profile.id,
            policyProfileName: profile.name,
        });
        return profile;
    }
    async getPolicyProfile(id, client) {
        const query = 'SELECT * FROM model_hub_policy_profiles WHERE id = $1';
        const result = await connection_js_1.db.query(query, [id], client);
        if (result.rows.length === 0) {
            throw new errors_js_1.NotFoundError('PolicyProfile', id);
        }
        return rowToPolicyProfile(result.rows[0]);
    }
    async getPolicyProfileByName(name, client) {
        const query = 'SELECT * FROM model_hub_policy_profiles WHERE name = $1';
        const result = await connection_js_1.db.query(query, [name], client);
        if (result.rows.length === 0) {
            return null;
        }
        return rowToPolicyProfile(result.rows[0]);
    }
    async getDefaultPolicyProfile(client) {
        const query = 'SELECT * FROM model_hub_policy_profiles WHERE is_default = true AND is_active = true';
        const result = await connection_js_1.db.query(query, [], client);
        if (result.rows.length === 0) {
            return null;
        }
        return rowToPolicyProfile(result.rows[0]);
    }
    async listPolicyProfiles(options = {}) {
        const conditions = [];
        const params = [];
        let paramIndex = 1;
        if (options.isActive !== undefined) {
            conditions.push(`is_active = $${paramIndex++}`);
            params.push(options.isActive);
        }
        if (options.isDefault !== undefined) {
            conditions.push(`is_default = $${paramIndex++}`);
            params.push(options.isDefault);
        }
        if (options.search) {
            conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
            params.push(`%${options.search}%`);
            paramIndex++;
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const limit = options.limit || 50;
        const offset = options.offset || 0;
        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM model_hub_policy_profiles ${whereClause}`;
        const countResult = await connection_js_1.db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].total);
        // Get paginated results
        const query = `
      SELECT * FROM model_hub_policy_profiles
      ${whereClause}
      ORDER BY is_default DESC, name ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
        const result = await connection_js_1.db.query(query, [...params, limit, offset]);
        const profiles = result.rows.map(rowToPolicyProfile);
        return { profiles, total };
    }
    async updatePolicyProfile(id, input, client) {
        // Verify profile exists
        await this.getPolicyProfile(id, client);
        const updates = [];
        const params = [];
        let paramIndex = 1;
        if (input.name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            params.push(input.name);
        }
        if (input.description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            params.push(input.description);
        }
        if (input.rules !== undefined) {
            updates.push(`rules = $${paramIndex++}`);
            params.push(input.rules);
        }
        if (input.dataClassifications !== undefined) {
            updates.push(`data_classifications = $${paramIndex++}`);
            params.push(input.dataClassifications);
        }
        if (input.complianceFrameworks !== undefined) {
            updates.push(`compliance_frameworks = $${paramIndex++}`);
            params.push(input.complianceFrameworks);
        }
        if (input.isDefault !== undefined) {
            // If setting as default, clear other defaults first
            if (input.isDefault) {
                await this.clearDefaultPolicyProfile(client);
            }
            updates.push(`is_default = $${paramIndex++}`);
            params.push(input.isDefault);
        }
        if (input.isActive !== undefined) {
            updates.push(`is_active = $${paramIndex++}`);
            params.push(input.isActive);
        }
        updates.push(`updated_at = $${paramIndex++}`);
        params.push(new Date());
        params.push(id);
        const query = `
      UPDATE model_hub_policy_profiles
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
        const result = await connection_js_1.db.query(query, params, client);
        const profile = rowToPolicyProfile(result.rows[0]);
        logger_js_1.logger.info({
            message: 'Policy profile updated',
            policyProfileId: profile.id,
            policyProfileName: profile.name,
        });
        return profile;
    }
    async deletePolicyProfile(id, client) {
        // Verify profile exists
        const profile = await this.getPolicyProfile(id, client);
        // Prevent deletion of default profile
        if (profile.isDefault) {
            throw new errors_js_1.ValidationError('Cannot delete the default policy profile');
        }
        const query = 'DELETE FROM model_hub_policy_profiles WHERE id = $1';
        await connection_js_1.db.query(query, [id], client);
        logger_js_1.logger.info({
            message: 'Policy profile deleted',
            policyProfileId: id,
        });
    }
    async clearDefaultPolicyProfile(client) {
        const query = `
      UPDATE model_hub_policy_profiles
      SET is_default = false, updated_at = $1
      WHERE is_default = true
    `;
        await connection_js_1.db.query(query, [new Date()], client);
    }
}
exports.PolicyRegistry = PolicyRegistry;
// Export singleton instance
exports.policyRegistry = new PolicyRegistry();
