"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configService = exports.ConfigService = void 0;
const index_js_1 = require("../db/index.js");
const logger_js_1 = require("../utils/logger.js");
const log = logger_js_1.logger.child({ module: 'ConfigService' });
/**
 * Validates a config value against its declared type.
 */
function validateValueType(value, valueType) {
    switch (valueType) {
        case 'boolean':
            return typeof value === 'boolean';
        case 'integer':
            return Number.isInteger(value);
        case 'float':
            return typeof value === 'number' && !Number.isNaN(value);
        case 'string':
            return typeof value === 'string';
        case 'json':
            return value !== undefined;
        default:
            return false;
    }
}
/**
 * Coerces a config value to its declared type.
 */
function coerceValue(value, valueType) {
    if (value === null || value === undefined)
        return value;
    switch (valueType) {
        case 'boolean':
            if (typeof value === 'boolean')
                return value;
            if (typeof value === 'string') {
                return value.toLowerCase() === 'true' || value === '1';
            }
            return Boolean(value);
        case 'integer':
            if (Number.isInteger(value))
                return value;
            const intVal = parseInt(String(value), 10);
            return Number.isNaN(intVal) ? 0 : intVal;
        case 'float':
            if (typeof value === 'number')
                return value;
            const floatVal = parseFloat(String(value));
            return Number.isNaN(floatVal) ? 0 : floatVal;
        case 'string':
            return String(value);
        case 'json':
        default:
            return value;
    }
}
class ConfigService {
    /**
     * Get a configuration value with hierarchy resolution.
     * Resolution order: user > tenant > environment > global
     */
    async getConfig(key, context, defaultValue) {
        const { value, item } = await index_js_1.configRepository.resolveValue(key, context);
        if (value === undefined) {
            log.debug({ key, context, default: defaultValue }, 'Config not found, returning default');
            return defaultValue;
        }
        // Coerce to declared type if item exists
        const coercedValue = item
            ? coerceValue(value, item.valueType)
            : value;
        return coercedValue;
    }
    /**
     * Get multiple configuration values at once.
     */
    async getConfigs(keys, context) {
        const results = {};
        await Promise.all(keys.map(async (key) => {
            results[key] = await this.getConfig(key, context);
        }));
        return results;
    }
    /**
     * Set a configuration value.
     */
    async setConfig(input, auditContext) {
        // Validate value type
        if (!validateValueType(input.value, input.valueType)) {
            throw new Error(`Value ${JSON.stringify(input.value)} is not a valid ${input.valueType}`);
        }
        // Check for governance-protected configs
        const existing = await this.getExistingConfig(input);
        if (existing?.isGovernanceProtected && !input.isGovernanceProtected) {
            throw new Error('Cannot remove governance protection from protected config');
        }
        const item = await index_js_1.configRepository.create(input, auditContext.userId);
        // Log audit entry
        await index_js_1.auditRepository.log('config', item.id, existing ? 'update' : 'create', auditContext, existing ? existing.value : undefined, item.value);
        log.info({ key: item.key, level: item.level, tenantId: item.tenantId }, 'Config set');
        return item;
    }
    /**
     * Update a configuration value by ID.
     */
    async updateConfig(id, input, auditContext) {
        const existing = await index_js_1.configRepository.findById(id);
        if (!existing) {
            return null;
        }
        if (existing.isGovernanceProtected && input.isGovernanceProtected === false) {
            throw new Error('Cannot remove governance protection from protected config');
        }
        const updated = await index_js_1.configRepository.update(id, input, auditContext.userId);
        if (!updated)
            return null;
        await index_js_1.auditRepository.log('config', id, 'update', auditContext, existing.value, updated.value);
        log.info({ key: updated.key, id }, 'Config updated');
        return updated;
    }
    /**
     * Delete a configuration value.
     */
    async deleteConfig(id, auditContext) {
        const existing = await index_js_1.configRepository.findById(id);
        if (!existing) {
            return false;
        }
        if (existing.isGovernanceProtected) {
            throw new Error('Cannot delete governance-protected config');
        }
        const deleted = await index_js_1.configRepository.delete(id);
        if (deleted) {
            await index_js_1.auditRepository.log('config', id, 'delete', auditContext, existing.value, undefined);
            log.info({ key: existing.key, id }, 'Config deleted');
        }
        return deleted;
    }
    /**
     * List all configs for a tenant.
     */
    async listConfigs(tenantId, options) {
        return index_js_1.configRepository.listByTenant(tenantId, options);
    }
    /**
     * Get a specific config by ID.
     */
    async getConfigById(id) {
        return index_js_1.configRepository.findById(id);
    }
    /**
     * Bulk set configuration values.
     */
    async bulkSetConfigs(items, auditContext) {
        // Validate all values
        for (const item of items) {
            if (!validateValueType(item.value, item.valueType)) {
                throw new Error(`Value for key '${item.key}' is not a valid ${item.valueType}`);
            }
        }
        const results = await index_js_1.configRepository.bulkUpsert(items, auditContext.userId);
        // Log audit entries
        for (const result of results) {
            await index_js_1.auditRepository.log('config', result.id, result.version === 1 ? 'create' : 'update', auditContext, undefined, result.value);
        }
        log.info({ count: results.length }, 'Bulk config set');
        return results;
    }
    /**
     * Get the raw config item (not just value) for a key and context.
     */
    async getConfigItem(key, context) {
        const { item } = await index_js_1.configRepository.resolveValue(key, context);
        return item;
    }
    /**
     * Check if a config exists at any level for the given context.
     */
    async hasConfig(key, context) {
        const { item } = await index_js_1.configRepository.resolveValue(key, context);
        return item !== null;
    }
    /**
     * Get existing config matching the input criteria.
     */
    async getExistingConfig(input) {
        const items = await index_js_1.configRepository.findByKeyAndContext(input.key, {
            environment: input.environment ?? undefined,
            tenantId: input.tenantId ?? undefined,
            userId: input.userId ?? undefined,
        });
        // Find exact match
        return items.find((item) => item.level === input.level &&
            item.environment === input.environment &&
            item.tenantId === input.tenantId &&
            item.userId === input.userId) ?? null;
    }
}
exports.ConfigService = ConfigService;
exports.configService = new ConfigService();
