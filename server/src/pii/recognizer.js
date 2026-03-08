"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HybridEntityRecognizer = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_perf_hooks_1 = require("node:perf_hooks");
const patterns_js_1 = require("./patterns.js");
const buildContext = (value, start, end, request) => {
    const padding = 48;
    const beforeStart = Math.max(0, start - padding);
    const afterEnd = Math.min(value.length, end + padding);
    return {
        text: value,
        before: value.slice(beforeStart, start),
        after: value.slice(end, afterEnd),
        schemaField: request?.schemaField?.fieldName,
        schemaDescription: request?.schemaField?.description,
        schemaPath: request?.schema?.fields
            ? [request.schema.name, request.schemaField?.fieldName ?? '']
            : undefined,
        recordId: request?.recordId,
        tableName: request?.tableName,
        additionalMetadata: request?.additionalContext,
    };
};
const withGlobalFlag = (regex) => {
    const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
    return new RegExp(regex.source, flags);
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
class HybridEntityRecognizer {
    patterns;
    mlDetectors = [];
    constructor(patterns = patterns_js_1.defaultPatternLibrary) {
        this.patterns = [...patterns];
    }
    registerPattern(pattern) {
        this.patterns.push(pattern);
    }
    registerMLDetector(detector) {
        this.mlDetectors.push(detector);
    }
    async recognize(request, options = {}) {
        const value = request.value ?? '';
        const startTime = node_perf_hooks_1.performance.now();
        const entities = [];
        let evaluatedPatterns = 0;
        let matchedPatterns = 0;
        const patternsToUse = [...this.patterns, ...(options.customPatterns ?? [])];
        for (const pattern of patternsToUse) {
            evaluatedPatterns += 1;
            const regex = withGlobalFlag(pattern.regex);
            let match;
            while ((match = regex.exec(value)) !== null) {
                const start = match.index;
                const end = start + match[0].length;
                const context = buildContext(value, start, end, request);
                const detectors = [`pattern:${pattern.id}`];
                const baseScore = pattern.confidence;
                const schemaBoost = request.schemaField?.piiHints?.includes(pattern.type)
                    ? 0.1
                    : 0;
                const optionBoost = options.signalBoost?.[pattern.type] ?? 0;
                const labelBoost = this.getLabelBoost(context);
                const rawScore = clamp(baseScore + schemaBoost + optionBoost + labelBoost, 0, 1);
                if (options.minimumConfidence && rawScore < options.minimumConfidence) {
                    continue;
                }
                matchedPatterns += 1;
                entities.push({
                    id: node_crypto_1.default.randomUUID(),
                    type: pattern.type,
                    value: match[0],
                    start,
                    end,
                    detectors,
                    confidence: rawScore,
                    context,
                    rawScore,
                    metadata: {
                        patternId: pattern.id,
                        groups: match.slice(1),
                    },
                });
            }
        }
        let mlDecisions = 0;
        if (this.mlDetectors.length > 0) {
            const context = buildContext(value, 0, value.length, request);
            for (const detector of this.mlDetectors) {
                const results = await detector.detect(value, context);
                for (const result of results) {
                    const entity = {
                        id: node_crypto_1.default.randomUUID(),
                        type: result.type,
                        value: result.value,
                        start: value.indexOf(result.value),
                        end: value.indexOf(result.value) + result.value.length,
                        detectors: [`ml:${detector.id}`],
                        confidence: clamp(result.confidence, 0, 1),
                        context,
                        rawScore: clamp(result.rawScore, 0, 1),
                        metadata: result.metadata,
                    };
                    if (!options.minimumConfidence ||
                        entity.confidence >= options.minimumConfidence) {
                        entities.push(entity);
                        mlDecisions += 1;
                    }
                }
            }
        }
        const durationMs = node_perf_hooks_1.performance.now() - startTime;
        return {
            entities,
            stats: {
                evaluatedPatterns,
                matchedPatterns,
                mlDecisions,
                durationMs,
            },
        };
    }
    getLabelBoost(context) {
        const normalized = `${context.schemaField ?? ''} ${context.schemaDescription ?? ''}`.toLowerCase();
        const boosts = {
            name: 0.05,
            address: 0.08,
            phone: 0.07,
            email: 0.08,
            ssn: 0.1,
            passport: 0.08,
            license: 0.07,
            patient: 0.08,
            medical: 0.05,
            card: 0.08,
            bank: 0.07,
            geo: 0.05,
        };
        let boost = 0;
        for (const [token, value] of Object.entries(boosts)) {
            if (normalized.includes(token)) {
                boost += value;
            }
        }
        return clamp(boost, 0, 0.2);
    }
}
exports.HybridEntityRecognizer = HybridEntityRecognizer;
