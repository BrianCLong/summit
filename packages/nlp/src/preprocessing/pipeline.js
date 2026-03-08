"use strict";
/**
 * Preprocessing pipeline for batch text processing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreprocessingPipeline = void 0;
const index_1 = require("./index");
class PreprocessingPipeline {
    preprocessors = [];
    /**
     * Add a preprocessing step to the pipeline
     */
    addStep(name, fn) {
        this.preprocessors.push({ name, fn });
        return this;
    }
    /**
     * Add multiple preprocessing steps
     */
    addSteps(steps) {
        this.preprocessors.push(...steps);
        return this;
    }
    /**
     * Process a single text through the pipeline
     */
    process(text) {
        let processed = text;
        for (const step of this.preprocessors) {
            processed = step.fn(processed);
        }
        return processed;
    }
    /**
     * Process multiple texts in batch
     */
    processBatch(texts) {
        return texts.map((text) => this.process(text));
    }
    /**
     * Process texts in parallel (for large batches)
     */
    async processBatchParallel(texts, batchSize = 100) {
        const results = [];
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(async (text) => this.process(text)));
            results.push(...batchResults);
        }
        return results;
    }
    /**
     * Get pipeline step names
     */
    getSteps() {
        return this.preprocessors.map((p) => p.name);
    }
    /**
     * Clear all steps
     */
    clear() {
        this.preprocessors = [];
    }
    /**
     * Create a standard preprocessing pipeline
     */
    static createStandard(options = {}) {
        const pipeline = new PreprocessingPipeline();
        const preprocessor = new index_1.TextPreprocessor(options);
        return pipeline
            .addStep('html-removal', (text) => text.replace(/<[^>]*>/g, ''))
            .addStep('url-removal', (text) => text.replace(/https?:\/\/\S+/gi, ''))
            .addStep('email-removal', (text) => text.replace(/[\w.-]+@[\w.-]+\.\w+/gi, ''))
            .addStep('unicode-normalization', (text) => text.normalize('NFKC'))
            .addStep('lowercase', (text) => options.lowercase !== false ? text.toLowerCase() : text)
            .addStep('whitespace-normalization', (text) => text.replace(/\s+/g, ' ').trim());
    }
}
exports.PreprocessingPipeline = PreprocessingPipeline;
