"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataProfiler = void 0;
const logger_js_1 = require("../utils/logger.js");
const SEMANTIC_PATTERNS = {
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    phone: /^\+?[\d\s\-()]{10,}$/,
    ssn: /^\d{3}-\d{2}-\d{4}$/,
    credit_card: /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/,
    ip_address: /^(?:\d{1,3}\.){3}\d{1,3}$/,
    url: /^https?:\/\/[^\s]+$/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    date_iso: /^\d{4}-\d{2}-\d{2}$/,
    datetime_iso: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
};
const PII_TYPES = ['email', 'phone', 'ssn', 'credit_card'];
/**
 * Data Profiler
 * Analyzes data sources to extract metadata, quality metrics, and relationships
 */
class DataProfiler {
    config;
    profiles = new Map();
    constructor(config = {}) {
        this.config = {
            sampleSize: config.sampleSize ?? 10000,
            detectPii: config.detectPii ?? true,
            inferRelationships: config.inferRelationships ?? true,
        };
    }
    /**
     * Profile a discovered data source
     */
    async profile(source, data) {
        logger_js_1.logger.info('Profiling data source', { sourceId: source.id, name: source.name });
        const startTime = Date.now();
        // Sample data if too large
        const sampleData = data.length > this.config.sampleSize
            ? this.sampleRows(data, this.config.sampleSize)
            : data;
        // Extract header row
        const headers = sampleData[0];
        const rows = sampleData.slice(1);
        // Profile each column
        const columns = headers.map((header, index) => {
            const columnData = rows.map(row => row[index]);
            return this.profileColumn(header, columnData);
        });
        // Infer relationships between columns
        const relationships = this.config.inferRelationships
            ? this.inferRelationships(columns, headers)
            : [];
        // Calculate overall quality score
        const overallQuality = this.calculateOverallQuality(columns);
        const profile = {
            sourceId: source.id,
            tableName: source.metadata?.tableName,
            rowCount: rows.length,
            columnCount: columns.length,
            columns,
            relationships,
            overallQuality,
            profiledAt: new Date(),
        };
        this.profiles.set(source.id, profile);
        logger_js_1.logger.info('Profiling complete', {
            sourceId: source.id,
            duration: Date.now() - startTime,
            quality: overallQuality,
        });
        return profile;
    }
    /**
     * Profile a single column
     */
    profileColumn(name, data) {
        const nonNull = data.filter(v => v !== null && v !== undefined && v !== '');
        const uniqueValues = new Set(nonNull.map(String));
        // Detect data type
        const dataType = this.inferDataType(nonNull);
        // Detect semantic type
        const semanticType = this.detectSemanticType(nonNull);
        // Check for PII
        const piiDetected = this.config.detectPii && PII_TYPES.includes(semanticType || '');
        // Detect patterns
        const patterns = this.detectPatterns(nonNull);
        // Calculate quality scores
        const qualityScores = this.calculateColumnQuality(data, nonNull, uniqueValues);
        return {
            name,
            dataType,
            nullable: nonNull.length < data.length,
            uniqueCount: uniqueValues.size,
            nullCount: data.length - nonNull.length,
            sampleValues: nonNull.slice(0, 5),
            patterns,
            semanticType,
            piiDetected,
            qualityScores,
        };
    }
    /**
     * Infer data type from values
     */
    inferDataType(values) {
        if (values.length === 0)
            return 'unknown';
        const sample = values.slice(0, 100);
        const types = sample.map(v => {
            if (typeof v === 'number')
                return 'number';
            if (typeof v === 'boolean')
                return 'boolean';
            if (v instanceof Date)
                return 'date';
            if (typeof v === 'string') {
                if (!isNaN(Number(v)) && v.trim() !== '')
                    return 'number';
                if (SEMANTIC_PATTERNS.date_iso.test(v))
                    return 'date';
                if (SEMANTIC_PATTERNS.datetime_iso.test(v))
                    return 'datetime';
                return 'string';
            }
            if (Array.isArray(v))
                return 'array';
            if (typeof v === 'object')
                return 'object';
            return 'unknown';
        });
        // Return most common type
        const typeCounts = types.reduce((acc, t) => {
            acc[t] = (acc[t] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(typeCounts)
            .sort((a, b) => b[1] - a[1])[0][0];
    }
    /**
     * Detect semantic type (email, phone, etc.)
     */
    detectSemanticType(values) {
        if (values.length === 0)
            return undefined;
        const stringValues = values
            .filter(v => typeof v === 'string')
            .slice(0, 100);
        if (stringValues.length === 0)
            return undefined;
        for (const [type, pattern] of Object.entries(SEMANTIC_PATTERNS)) {
            const matches = stringValues.filter(v => pattern.test(v)).length;
            if (matches / stringValues.length > 0.8) {
                return type;
            }
        }
        return undefined;
    }
    /**
     * Detect value patterns
     */
    detectPatterns(values) {
        const patterns = [];
        const stringValues = values
            .filter(v => typeof v === 'string')
            .slice(0, 100);
        if (stringValues.length === 0)
            return patterns;
        // Detect common prefixes
        const prefixes = new Map();
        for (const v of stringValues) {
            const prefix = v.substring(0, 3);
            prefixes.set(prefix, (prefixes.get(prefix) || 0) + 1);
        }
        for (const [prefix, count] of prefixes) {
            if (count / stringValues.length > 0.5) {
                patterns.push(`prefix:${prefix}`);
            }
        }
        // Detect length patterns
        const lengths = stringValues.map(v => v.length);
        const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
        const allSameLength = lengths.every(l => l === lengths[0]);
        if (allSameLength) {
            patterns.push(`fixed_length:${lengths[0]}`);
        }
        return patterns;
    }
    /**
     * Calculate quality scores for a column
     */
    calculateColumnQuality(data, nonNull, uniqueValues) {
        const total = data.length;
        const nonNullCount = nonNull.length;
        const uniqueCount = uniqueValues.size;
        return {
            completeness: total > 0 ? nonNullCount / total : 0,
            accuracy: 0.9, // Would need reference data to calculate
            consistency: this.calculateConsistency(nonNull),
            timeliness: 1.0, // Assume current data
            validity: this.calculateValidity(nonNull),
            uniqueness: nonNullCount > 0 ? uniqueCount / nonNullCount : 0,
        };
    }
    /**
     * Calculate consistency score
     */
    calculateConsistency(values) {
        if (values.length === 0)
            return 1;
        // Check type consistency
        const types = values.map(v => typeof v);
        const primaryType = types.reduce((acc, t) => {
            acc[t] = (acc[t] || 0) + 1;
            return acc;
        }, {});
        const maxTypeCount = Math.max(...Object.values(primaryType));
        return maxTypeCount / types.length;
    }
    /**
     * Calculate validity score
     */
    calculateValidity(values) {
        if (values.length === 0)
            return 1;
        // Check for common invalid patterns
        let invalidCount = 0;
        for (const v of values) {
            if (typeof v === 'string') {
                if (v.trim() === '' || v === 'N/A' || v === 'null' || v === 'undefined') {
                    invalidCount++;
                }
            }
        }
        return 1 - (invalidCount / values.length);
    }
    /**
     * Infer relationships between columns
     */
    inferRelationships(columns, headers) {
        const relationships = [];
        // Look for foreign key patterns (column names ending with _id)
        for (let i = 0; i < columns.length; i++) {
            const col = columns[i];
            const header = headers[i].toLowerCase();
            if (header.endsWith('_id') && col.dataType === 'number') {
                const targetTable = header.replace(/_id$/, '');
                relationships.push({
                    sourceColumn: headers[i],
                    targetTable,
                    targetColumn: 'id',
                    relationshipType: 'inferred',
                    confidence: 0.7,
                });
            }
        }
        // Look for semantic relationships (email -> user, etc.)
        for (let i = 0; i < columns.length; i++) {
            const col = columns[i];
            if (col.semanticType === 'email') {
                relationships.push({
                    sourceColumn: headers[i],
                    targetTable: 'users',
                    targetColumn: 'email',
                    relationshipType: 'semantic',
                    confidence: 0.6,
                });
            }
        }
        return relationships;
    }
    /**
     * Calculate overall quality score
     */
    calculateOverallQuality(columns) {
        if (columns.length === 0)
            return 0;
        const weights = {
            completeness: 0.25,
            accuracy: 0.20,
            consistency: 0.20,
            timeliness: 0.10,
            validity: 0.15,
            uniqueness: 0.10,
        };
        let totalScore = 0;
        for (const col of columns) {
            let colScore = 0;
            for (const [dim, weight] of Object.entries(weights)) {
                colScore += (col.qualityScores[dim] || 0) * weight;
            }
            totalScore += colScore;
        }
        return totalScore / columns.length;
    }
    /**
     * Sample rows from data
     */
    sampleRows(data, sampleSize) {
        if (data.length <= sampleSize)
            return data;
        // Keep header row
        const header = data[0];
        const rows = data.slice(1);
        // Random sampling
        const sampled = rows
            .map((row, index) => ({ row, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .slice(0, sampleSize - 1)
            .map(({ row }) => row);
        return [header, ...sampled];
    }
    /**
     * Get profile for a source
     */
    getProfile(sourceId) {
        return this.profiles.get(sourceId);
    }
    /**
     * Get all profiles
     */
    getAllProfiles() {
        return Array.from(this.profiles.values());
    }
    /**
     * Generate profile report
     */
    generateReport(profile) {
        const lines = [
            `# Data Profile Report`,
            ``,
            `**Source ID**: ${profile.sourceId}`,
            `**Table**: ${profile.tableName || 'N/A'}`,
            `**Rows**: ${profile.rowCount.toLocaleString()}`,
            `**Columns**: ${profile.columnCount}`,
            `**Overall Quality**: ${(profile.overallQuality * 100).toFixed(1)}%`,
            `**Profiled At**: ${profile.profiledAt.toISOString()}`,
            ``,
            `## Column Details`,
            ``,
        ];
        for (const col of profile.columns) {
            lines.push(`### ${col.name}`);
            lines.push(`- **Type**: ${col.dataType}${col.semanticType ? ` (${col.semanticType})` : ''}`);
            lines.push(`- **Nullable**: ${col.nullable}`);
            lines.push(`- **Unique Values**: ${col.uniqueCount.toLocaleString()}`);
            lines.push(`- **Null Count**: ${col.nullCount.toLocaleString()}`);
            if (col.piiDetected) {
                lines.push(`- **PII Detected**: Yes`);
            }
            lines.push(`- **Quality**: Completeness ${(col.qualityScores.completeness * 100).toFixed(0)}%, ` +
                `Validity ${(col.qualityScores.validity * 100).toFixed(0)}%`);
            lines.push(``);
        }
        if (profile.relationships.length > 0) {
            lines.push(`## Relationships`);
            lines.push(``);
            for (const rel of profile.relationships) {
                lines.push(`- ${rel.sourceColumn} → ${rel.targetTable}.${rel.targetColumn} ` +
                    `(${rel.relationshipType}, confidence: ${(rel.confidence * 100).toFixed(0)}%)`);
            }
        }
        return lines.join('\n');
    }
}
exports.DataProfiler = DataProfiler;
