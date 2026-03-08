"use strict";
/**
 * Data transformation engine
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataTransformer = void 0;
class DataTransformer {
    config;
    logger;
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
    }
    /**
     * Transform data according to configured transformations
     */
    async transform(data) {
        if (!this.config || !this.config.transformations || this.config.transformations.length === 0) {
            return data;
        }
        let transformedData = [...data];
        // Apply transformations in order
        const sortedTransformations = [...this.config.transformations].sort((a, b) => a.order - b.order);
        for (const transformation of sortedTransformations) {
            this.logger.debug(`Applying transformation: ${transformation.name}`);
            transformedData = await this.applyTransformation(transformedData, transformation);
        }
        return transformedData;
    }
    async applyTransformation(data, transformation) {
        switch (transformation.type) {
            case 'map':
                return this.applyMapping(data, transformation.config);
            case 'filter':
                return this.applyFilter(data, transformation.config);
            case 'aggregate':
                return this.applyAggregation(data, transformation.config);
            case 'join':
                return this.applyJoin(data, transformation.config);
            case 'flatten':
                return this.applyFlatten(data, transformation.config);
            case 'normalize':
                return this.applyNormalization(data, transformation.config);
            case 'typecast':
                return this.applyTypeCasting(data, transformation.config);
            case 'custom':
                return this.applyCustom(data, transformation.config);
            default:
                this.logger.warn(`Unknown transformation type: ${transformation.type}`);
                return data;
        }
    }
    applyMapping(data, config) {
        const fieldMapping = config.fieldMapping || {};
        return data.map(record => {
            const mapped = {};
            for (const [targetField, sourceField] of Object.entries(fieldMapping)) {
                if (typeof sourceField === 'string') {
                    mapped[targetField] = this.getNestedValue(record, sourceField);
                }
                else if (typeof sourceField === 'function') {
                    mapped[targetField] = sourceField(record);
                }
            }
            // Include unmapped fields if configured
            if (config.includeUnmapped) {
                for (const [key, value] of Object.entries(record)) {
                    if (!Object.values(fieldMapping).includes(key)) {
                        mapped[key] = value;
                    }
                }
            }
            return mapped;
        });
    }
    applyFilter(data, config) {
        const filterFn = config.filterFunction || (() => true);
        return data.filter(filterFn);
    }
    applyAggregation(data, config) {
        const groupBy = config.groupBy || [];
        const aggregations = config.aggregations || {};
        if (groupBy.length === 0) {
            return data;
        }
        const groups = new Map();
        // Group records
        for (const record of data) {
            const key = groupBy.map((field) => record[field]).join('|');
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(record);
        }
        // Apply aggregations
        const results = [];
        for (const [key, records] of groups.entries()) {
            const result = {};
            // Add group by fields
            groupBy.forEach((field, idx) => {
                result[field] = records[0][field];
            });
            // Apply aggregation functions
            for (const [field, aggType] of Object.entries(aggregations)) {
                const values = records.map(r => r[field]).filter(v => v != null);
                switch (aggType) {
                    case 'sum':
                        result[`${field}_sum`] = values.reduce((sum, val) => sum + Number(val), 0);
                        break;
                    case 'avg':
                        result[`${field}_avg`] = values.reduce((sum, val) => sum + Number(val), 0) / values.length;
                        break;
                    case 'count':
                        result[`${field}_count`] = values.length;
                        break;
                    case 'min':
                        result[`${field}_min`] = Math.min(...values.map(Number));
                        break;
                    case 'max':
                        result[`${field}_max`] = Math.max(...values.map(Number));
                        break;
                }
            }
            results.push(result);
        }
        return results;
    }
    applyJoin(data, config) {
        // Placeholder for join implementation
        // Would implement various join types (inner, left, right, full outer)
        return data;
    }
    applyFlatten(data, config) {
        const nestedField = config.nestedField;
        return data.flatMap(record => {
            const nestedValue = this.getNestedValue(record, nestedField);
            if (Array.isArray(nestedValue)) {
                return nestedValue.map(item => ({
                    ...record,
                    [nestedField]: item
                }));
            }
            return record;
        });
    }
    applyNormalization(data, config) {
        const dateFields = config.dateFields || [];
        const stringFields = config.stringFields || [];
        const numericFields = config.numericFields || [];
        return data.map(record => {
            const normalized = { ...record };
            // Normalize date fields
            for (const field of dateFields) {
                if (normalized[field]) {
                    normalized[field] = new Date(normalized[field]).toISOString();
                }
            }
            // Normalize string fields
            for (const field of stringFields) {
                if (typeof normalized[field] === 'string') {
                    normalized[field] = normalized[field].trim().toLowerCase();
                }
            }
            // Normalize numeric fields
            for (const field of numericFields) {
                if (normalized[field] != null) {
                    normalized[field] = Number(normalized[field]);
                }
            }
            return normalized;
        });
    }
    applyTypeCasting(data, config) {
        const typeMapping = config.typeMapping || {};
        return data.map(record => {
            const casted = { ...record };
            for (const [field, targetType] of Object.entries(typeMapping)) {
                if (casted[field] == null) {
                    continue;
                }
                switch (targetType) {
                    case 'string':
                        casted[field] = String(casted[field]);
                        break;
                    case 'number':
                        casted[field] = Number(casted[field]);
                        break;
                    case 'boolean':
                        casted[field] = Boolean(casted[field]);
                        break;
                    case 'date':
                        casted[field] = new Date(casted[field]);
                        break;
                }
            }
            return casted;
        });
    }
    applyCustom(data, config) {
        const customFn = config.transformFunction;
        if (typeof customFn === 'function') {
            return data.map(customFn);
        }
        return data;
    }
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, prop) => current?.[prop], obj);
    }
}
exports.DataTransformer = DataTransformer;
