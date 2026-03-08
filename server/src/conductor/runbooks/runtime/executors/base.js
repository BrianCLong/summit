"use strict";
/**
 * Base Step Executor
 *
 * Abstract base class for step executors with common functionality.
 *
 * @module runbooks/runtime/executors/base
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoOpExecutor = exports.BaseStepExecutor = void 0;
const uuid_1 = require("uuid");
const crypto_1 = require("crypto");
/**
 * Abstract base class for step executors
 */
class BaseStepExecutor {
    /**
     * Create a successful result
     */
    success(output, options) {
        return {
            success: true,
            output,
            evidence: options?.evidence || [],
            citations: options?.citations || [],
            proofs: options?.proofs || [],
            kpis: options?.kpis || {},
            metadata: options?.metadata,
        };
    }
    /**
     * Create a failure result
     */
    failure(errorMessage) {
        return {
            success: false,
            output: {},
            errorMessage,
        };
    }
    /**
     * Create evidence
     */
    createEvidence(type, data, citations = [], metadata) {
        return {
            id: `evidence-${(0, uuid_1.v4)()}`,
            type,
            data,
            citations,
            proofs: [],
            collectedAt: new Date(),
            metadata,
        };
    }
    /**
     * Create citation
     */
    createCitation(source, url, author, metadata) {
        const citation = {
            id: `citation-${(0, uuid_1.v4)()}`,
            source,
            url,
            author,
            timestamp: new Date(),
            accessedAt: new Date(),
            metadata,
        };
        // Compute hash
        citation.hash = this.computeCitationHash(citation);
        return citation;
    }
    /**
     * Create cryptographic proof
     */
    createProof(data) {
        const hash = (0, crypto_1.createHash)('sha256').update(JSON.stringify(data)).digest('hex');
        return {
            algorithm: 'sha256',
            signature: hash,
            timestamp: new Date(),
        };
    }
    /**
     * Get config value with type safety
     */
    getConfig(ctx, key, defaultValue) {
        const value = ctx.step.config[key];
        return value !== undefined ? value : defaultValue;
    }
    /**
     * Get input value
     */
    getInput(ctx, key, defaultValue) {
        const value = ctx.input[key];
        return value !== undefined ? value : defaultValue;
    }
    /**
     * Get output from previous step
     */
    getPreviousOutput(ctx, stepId, key, defaultValue) {
        const stepOutput = ctx.previousStepOutputs[stepId];
        if (!stepOutput || typeof stepOutput !== 'object') {
            return defaultValue;
        }
        const value = stepOutput[key];
        return value !== undefined ? value : defaultValue;
    }
    /**
     * Find output from any previous step by key
     */
    findPreviousOutput(ctx, key) {
        for (const stepOutput of Object.values(ctx.previousStepOutputs)) {
            if (stepOutput && typeof stepOutput === 'object') {
                const value = stepOutput[key];
                if (value !== undefined) {
                    return value;
                }
            }
        }
        return undefined;
    }
    /**
     * Compute hash for citation
     */
    computeCitationHash(citation) {
        const data = JSON.stringify({
            source: citation.source,
            url: citation.url,
            author: citation.author,
            timestamp: citation.timestamp.toISOString(),
        });
        return (0, crypto_1.createHash)('sha256').update(data).digest('hex');
    }
}
exports.BaseStepExecutor = BaseStepExecutor;
/**
 * No-op executor for testing
 */
class NoOpExecutor extends BaseStepExecutor {
    actionType;
    constructor(actionType) {
        super();
        this.actionType = actionType;
    }
    async execute(ctx) {
        return this.success({ message: `NoOp executor for ${this.actionType}` }, {
            kpis: { executedAt: Date.now() },
        });
    }
}
exports.NoOpExecutor = NoOpExecutor;
