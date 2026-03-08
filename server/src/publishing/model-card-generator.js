"use strict";
/**
 * Model Card Generator
 *
 * Generates model cards that document data lineage, transforms,
 * and characteristics for proof-carrying publishing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelCardGenerator = void 0;
exports.createModelCardFromExport = createModelCardFromExport;
exports.calculateQualityMetrics = calculateQualityMetrics;
exports.mergeModelCards = mergeModelCards;
const crypto_1 = require("crypto");
class ModelCardGenerator {
    transforms = [];
    sources = [];
    /**
     * Create a new model card builder
     */
    static create(id, name, description, createdBy) {
        const generator = new ModelCardGenerator();
        generator['id'] = id;
        generator['name'] = name;
        generator['description'] = description;
        generator['createdBy'] = createdBy;
        generator['createdAt'] = new Date().toISOString();
        return generator;
    }
    id;
    name;
    description;
    createdBy;
    createdAt;
    schema;
    recordCount;
    dataSensitivity = 'internal';
    qualityMetrics;
    /**
     * Add a data source
     */
    addSource(source) {
        this.sources.push(source);
        return this;
    }
    /**
     * Add multiple sources
     */
    addSources(sources) {
        this.sources.push(...sources);
        return this;
    }
    /**
     * Record a transformation
     */
    addTransform(input, inputData) {
        const inputHash = inputData
            ? (0, crypto_1.createHash)('sha256').update(inputData).digest('hex')
            : '';
        const transform = {
            id: `transform-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            type: input.type,
            timestamp: new Date().toISOString(),
            inputHash,
            outputHash: '', // Will be set when output is available
            parameters: input.parameters,
            operator: input.operator,
            justification: input.justification,
        };
        this.transforms.push(transform);
        return this;
    }
    /**
     * Update the output hash of the most recent transform
     */
    setLastTransformOutput(outputData) {
        if (this.transforms.length === 0) {
            throw new Error('No transforms to update');
        }
        const lastTransform = this.transforms[this.transforms.length - 1];
        lastTransform.outputHash = (0, crypto_1.createHash)('sha256')
            .update(outputData)
            .digest('hex');
        return this;
    }
    /**
     * Set data schema
     */
    setSchema(schema) {
        this.schema = schema;
        return this;
    }
    /**
     * Set record count
     */
    setRecordCount(count) {
        this.recordCount = count;
        return this;
    }
    /**
     * Set data sensitivity level
     */
    setSensitivity(level) {
        this.dataSensitivity = level;
        return this;
    }
    /**
     * Set quality metrics
     */
    setQualityMetrics(metrics) {
        this.qualityMetrics = metrics;
        return this;
    }
    /**
     * Build the model card
     */
    build() {
        return {
            id: this.id,
            version: '1.0',
            name: this.name,
            description: this.description,
            sources: this.sources,
            transforms: this.transforms,
            schema: this.schema,
            recordCount: this.recordCount,
            dataSensitivity: this.dataSensitivity,
            qualityMetrics: this.qualityMetrics,
            createdAt: this.createdAt,
            createdBy: this.createdBy,
            lastModified: new Date().toISOString(),
        };
    }
    /**
     * Validate transform chain integrity
     */
    validateTransformChain() {
        const errors = [];
        if (this.transforms.length === 0) {
            return { valid: true, errors: [] };
        }
        // Check that each transform has both input and output hashes
        for (let i = 0; i < this.transforms.length; i++) {
            const transform = this.transforms[i];
            if (!transform.inputHash && i > 0) {
                errors.push(`Transform ${i} (${transform.id}) missing input hash`);
            }
            if (!transform.outputHash) {
                errors.push(`Transform ${i} (${transform.id}) missing output hash`);
            }
            // Check chain continuity - output of previous should match input of next
            if (i > 0 && transform.inputHash) {
                const prevTransform = this.transforms[i - 1];
                if (prevTransform.outputHash !== transform.inputHash) {
                    errors.push(`Transform chain broken between ${prevTransform.id} and ${transform.id}`);
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
}
exports.ModelCardGenerator = ModelCardGenerator;
/**
 * Helper to create model card from export data
 */
function createModelCardFromExport(exportId, exportData) {
    const generator = ModelCardGenerator.create(`model-card-${exportId}`, exportData.name, exportData.description, exportData.user);
    // Add sources
    generator.addSources(exportData.sources);
    // Add transforms if provided
    if (exportData.transforms) {
        for (const transform of exportData.transforms) {
            generator.addTransform(transform);
        }
    }
    // Set optional fields
    if (exportData.sensitivity) {
        generator.setSensitivity(exportData.sensitivity);
    }
    if (exportData.schema) {
        generator.setSchema(exportData.schema);
    }
    if (exportData.recordCount !== undefined) {
        generator.setRecordCount(exportData.recordCount);
    }
    return generator.build();
}
/**
 * Calculate quality metrics from data
 */
function calculateQualityMetrics(data) {
    const metrics = {};
    // Completeness: percentage of records with all required fields
    if (data.totalRecords > 0) {
        metrics.completeness = data.completeRecords / data.totalRecords;
    }
    // Accuracy: percentage of validated records
    if (data.validatedRecords !== undefined && data.totalRecords > 0) {
        metrics.accuracy = data.validatedRecords / data.totalRecords;
    }
    // Consistency: percentage of records that pass consistency checks
    if (data.consistentRecords !== undefined && data.totalRecords > 0) {
        metrics.consistency = data.consistentRecords / data.totalRecords;
    }
    // Timeliness: decay factor based on age (fresher data = higher score)
    if (data.dataAge !== undefined) {
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        metrics.timeliness = Math.max(0, 1 - data.dataAge / maxAge);
    }
    return metrics;
}
/**
 * Merge multiple model cards (e.g., when combining datasets)
 */
function mergeModelCards(cards, mergedName, mergedBy) {
    if (cards.length === 0) {
        throw new Error('Cannot merge empty model card array');
    }
    const generator = ModelCardGenerator.create(`merged-${Date.now()}`, mergedName, `Merged from ${cards.length} model cards`, mergedBy);
    // Collect all sources
    const allSources = [];
    for (const card of cards) {
        allSources.push(...card.sources);
    }
    generator.addSources(allSources);
    // Collect all transforms
    for (const card of cards) {
        for (const transform of card.transforms) {
            generator.addTransform({
                type: transform.type,
                parameters: transform.parameters,
                operator: transform.operator,
                justification: transform.justification,
            });
        }
    }
    // Use highest sensitivity level
    const sensitivities = [
        'public',
        'internal',
        'confidential',
        'restricted',
    ];
    const maxSensitivity = cards
        .map(c => c.dataSensitivity)
        .reduce((max, curr) => {
        const maxIdx = sensitivities.indexOf(max);
        const currIdx = sensitivities.indexOf(curr);
        return currIdx > maxIdx ? curr : max;
    });
    generator.setSensitivity(maxSensitivity);
    // Sum record counts
    const totalRecords = cards.reduce((sum, card) => sum + (card.recordCount || 0), 0);
    if (totalRecords > 0) {
        generator.setRecordCount(totalRecords);
    }
    // Average quality metrics
    const avgMetrics = {};
    const metricsCount = cards.filter(c => c.qualityMetrics).length;
    if (metricsCount > 0) {
        const sum = {
            completeness: 0,
            accuracy: 0,
            consistency: 0,
            timeliness: 0,
        };
        for (const card of cards) {
            if (card.qualityMetrics) {
                sum.completeness += card.qualityMetrics.completeness || 0;
                sum.accuracy += card.qualityMetrics.accuracy || 0;
                sum.consistency += card.qualityMetrics.consistency || 0;
                sum.timeliness += card.qualityMetrics.timeliness || 0;
            }
        }
        avgMetrics.completeness = sum.completeness / metricsCount;
        avgMetrics.accuracy = sum.accuracy / metricsCount;
        avgMetrics.consistency = sum.consistency / metricsCount;
        avgMetrics.timeliness = sum.timeliness / metricsCount;
        generator.setQualityMetrics(avgMetrics);
    }
    return generator.build();
}
