"use strict";
/**
 * Deployment Configuration Registry
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deploymentRegistry = exports.DeploymentRegistry = void 0;
const connection_js_1 = require("../db/connection.js");
const id_js_1 = require("../utils/id.js");
const logger_js_1 = require("../utils/logger.js");
const errors_js_1 = require("../utils/errors.js");
// ============================================================================
// Row Transformation
// ============================================================================
function rowToDeploymentConfig(row) {
    return {
        id: row.id,
        modelVersionId: row.model_version_id,
        environment: row.environment,
        mode: row.mode,
        trafficPercentage: parseFloat(row.traffic_percentage),
        policyProfileId: row.policy_profile_id || undefined,
        scaling: row.scaling,
        healthCheck: row.health_check,
        circuitBreaker: row.circuit_breaker,
        rolloutStrategy: row.rollout_strategy,
        isActive: row.is_active,
        activatedAt: row.activated_at || undefined,
        activatedBy: row.activated_by || undefined,
        deactivatedAt: row.deactivated_at || undefined,
        deactivatedBy: row.deactivated_by || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by,
    };
}
class DeploymentRegistry {
    async createDeploymentConfig(input, client) {
        const id = (0, id_js_1.generateId)();
        const now = new Date();
        // Check for duplicate deployment config
        const existing = await this.getDeploymentConfigForEnvironment(input.modelVersionId, input.environment, client);
        if (existing) {
            throw new errors_js_1.ConflictError(`Deployment config already exists for model version '${input.modelVersionId}' in environment '${input.environment}'`);
        }
        const query = `
      INSERT INTO model_hub_deployment_configs (
        id, model_version_id, environment, mode, traffic_percentage,
        policy_profile_id, scaling, health_check, circuit_breaker,
        rollout_strategy, is_active, created_at, updated_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
        const params = [
            id,
            input.modelVersionId,
            input.environment,
            input.mode || 'active',
            input.trafficPercentage || 0,
            input.policyProfileId || null,
            input.scaling || {},
            input.healthCheck || {},
            input.circuitBreaker || {},
            input.rolloutStrategy || {},
            input.isActive || false,
            now,
            now,
            input.createdBy,
        ];
        const result = await connection_js_1.db.query(query, params, client);
        const config = rowToDeploymentConfig(result.rows[0]);
        logger_js_1.logger.info({
            message: 'Deployment config created',
            deploymentConfigId: config.id,
            modelVersionId: config.modelVersionId,
            environment: config.environment,
        });
        return config;
    }
    async getDeploymentConfig(id, client) {
        const query = 'SELECT * FROM model_hub_deployment_configs WHERE id = $1';
        const result = await connection_js_1.db.query(query, [id], client);
        if (result.rows.length === 0) {
            throw new errors_js_1.NotFoundError('DeploymentConfig', id);
        }
        return rowToDeploymentConfig(result.rows[0]);
    }
    async getDeploymentConfigForEnvironment(modelVersionId, environment, client) {
        const query = `
      SELECT * FROM model_hub_deployment_configs
      WHERE model_version_id = $1 AND environment = $2
    `;
        const result = await connection_js_1.db.query(query, [modelVersionId, environment], client);
        if (result.rows.length === 0) {
            return null;
        }
        return rowToDeploymentConfig(result.rows[0]);
    }
    async listDeploymentConfigs(options = {}) {
        const conditions = [];
        const params = [];
        let paramIndex = 1;
        if (options.modelVersionId) {
            conditions.push(`model_version_id = $${paramIndex++}`);
            params.push(options.modelVersionId);
        }
        if (options.environment) {
            conditions.push(`environment = $${paramIndex++}`);
            params.push(options.environment);
        }
        if (options.mode) {
            conditions.push(`mode = $${paramIndex++}`);
            params.push(options.mode);
        }
        if (options.isActive !== undefined) {
            conditions.push(`is_active = $${paramIndex++}`);
            params.push(options.isActive);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const limit = options.limit || 50;
        const offset = options.offset || 0;
        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM model_hub_deployment_configs ${whereClause}`;
        const countResult = await connection_js_1.db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].total);
        // Get paginated results
        const query = `
      SELECT * FROM model_hub_deployment_configs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
        const result = await connection_js_1.db.query(query, [...params, limit, offset]);
        const configs = result.rows.map(rowToDeploymentConfig);
        return { configs, total };
    }
    async updateDeploymentConfig(id, input, client) {
        // Verify config exists
        await this.getDeploymentConfig(id, client);
        const updates = [];
        const params = [];
        let paramIndex = 1;
        if (input.mode !== undefined) {
            updates.push(`mode = $${paramIndex++}`);
            params.push(input.mode);
        }
        if (input.trafficPercentage !== undefined) {
            updates.push(`traffic_percentage = $${paramIndex++}`);
            params.push(input.trafficPercentage);
        }
        if (input.policyProfileId !== undefined) {
            updates.push(`policy_profile_id = $${paramIndex++}`);
            params.push(input.policyProfileId);
        }
        if (input.scaling !== undefined) {
            updates.push(`scaling = $${paramIndex++}`);
            params.push(input.scaling);
        }
        if (input.healthCheck !== undefined) {
            updates.push(`health_check = $${paramIndex++}`);
            params.push(input.healthCheck);
        }
        if (input.circuitBreaker !== undefined) {
            updates.push(`circuit_breaker = $${paramIndex++}`);
            params.push(input.circuitBreaker);
        }
        if (input.rolloutStrategy !== undefined) {
            updates.push(`rollout_strategy = $${paramIndex++}`);
            params.push(input.rolloutStrategy);
        }
        if (input.isActive !== undefined) {
            updates.push(`is_active = $${paramIndex++}`);
            params.push(input.isActive);
        }
        updates.push(`updated_at = $${paramIndex++}`);
        params.push(new Date());
        params.push(id);
        const query = `
      UPDATE model_hub_deployment_configs
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
        const result = await connection_js_1.db.query(query, params, client);
        const config = rowToDeploymentConfig(result.rows[0]);
        logger_js_1.logger.info({
            message: 'Deployment config updated',
            deploymentConfigId: config.id,
            environment: config.environment,
        });
        return config;
    }
    async activateDeployment(id, activatedBy, client) {
        const config = await this.getDeploymentConfig(id, client);
        // Deactivate other deployments for the same model version in the same environment
        await connection_js_1.db.query(`
      UPDATE model_hub_deployment_configs
      SET is_active = false, deactivated_at = $1, deactivated_by = $2, updated_at = $1
      WHERE model_version_id = $3 AND environment = $4 AND is_active = true AND id != $5
    `, [new Date(), activatedBy, config.modelVersionId, config.environment, id], client);
        const query = `
      UPDATE model_hub_deployment_configs
      SET is_active = true, activated_at = $1, activated_by = $2, updated_at = $1
      WHERE id = $3
      RETURNING *
    `;
        const now = new Date();
        const result = await connection_js_1.db.query(query, [now, activatedBy, id], client);
        const updatedConfig = rowToDeploymentConfig(result.rows[0]);
        logger_js_1.logger.info({
            message: 'Deployment activated',
            deploymentConfigId: updatedConfig.id,
            modelVersionId: updatedConfig.modelVersionId,
            environment: updatedConfig.environment,
            activatedBy,
        });
        return updatedConfig;
    }
    async deactivateDeployment(id, deactivatedBy, client) {
        const query = `
      UPDATE model_hub_deployment_configs
      SET is_active = false, deactivated_at = $1, deactivated_by = $2, updated_at = $1
      WHERE id = $3
      RETURNING *
    `;
        const now = new Date();
        const result = await connection_js_1.db.query(query, [now, deactivatedBy, id], client);
        if (result.rows.length === 0) {
            throw new errors_js_1.NotFoundError('DeploymentConfig', id);
        }
        const config = rowToDeploymentConfig(result.rows[0]);
        logger_js_1.logger.info({
            message: 'Deployment deactivated',
            deploymentConfigId: config.id,
            modelVersionId: config.modelVersionId,
            environment: config.environment,
            deactivatedBy,
        });
        return config;
    }
    async updateTrafficPercentage(id, trafficPercentage, client) {
        if (trafficPercentage < 0 || trafficPercentage > 100) {
            throw new errors_js_1.ValidationError('Traffic percentage must be between 0 and 100');
        }
        const query = `
      UPDATE model_hub_deployment_configs
      SET traffic_percentage = $1, updated_at = $2
      WHERE id = $3
      RETURNING *
    `;
        const result = await connection_js_1.db.query(query, [trafficPercentage, new Date(), id], client);
        if (result.rows.length === 0) {
            throw new errors_js_1.NotFoundError('DeploymentConfig', id);
        }
        const config = rowToDeploymentConfig(result.rows[0]);
        logger_js_1.logger.info({
            message: 'Deployment traffic updated',
            deploymentConfigId: config.id,
            trafficPercentage,
        });
        return config;
    }
    async deleteDeploymentConfig(id, client) {
        // Verify config exists
        await this.getDeploymentConfig(id, client);
        const query = 'DELETE FROM model_hub_deployment_configs WHERE id = $1';
        await connection_js_1.db.query(query, [id], client);
        logger_js_1.logger.info({
            message: 'Deployment config deleted',
            deploymentConfigId: id,
        });
    }
    async getActiveDeployments(environment, client) {
        const query = `
      SELECT * FROM model_hub_deployment_configs
      WHERE environment = $1 AND is_active = true
      ORDER BY traffic_percentage DESC
    `;
        const result = await connection_js_1.db.query(query, [environment], client);
        return result.rows.map(rowToDeploymentConfig);
    }
}
exports.DeploymentRegistry = DeploymentRegistry;
// Export singleton instance
exports.deploymentRegistry = new DeploymentRegistry();
