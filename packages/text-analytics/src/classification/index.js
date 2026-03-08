"use strict";
/**
 * Text classification
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextClassifier = void 0;
class TextClassifier {
    model = new Map();
    /**
     * Multi-class classification
     */
    classify(text, labels) {
        const scores = labels.map((label) => ({
            label,
            confidence: this.calculateScore(text, label),
        }));
        scores.sort((a, b) => b.confidence - a.confidence);
        return {
            label: scores[0].label,
            confidence: scores[0].confidence,
            allLabels: scores,
        };
    }
    /**
     * Multi-label classification
     */
    classifyMultiLabel(text, labels, threshold = 0.5) {
        const result = this.classify(text, labels);
        return result.allLabels.filter((l) => l.confidence >= threshold).map((l) => l.label);
    }
    /**
     * Intent classification
     */
    classifyIntent(text) {
        const intents = ['question', 'statement', 'command', 'exclamation'];
        return this.classify(text, intents);
    }
    /**
     * Zero-shot classification
     */
    zeroShot(text, candidateLabels) {
        // Simplified zero-shot classification
        return this.classify(text, candidateLabels);
    }
    /**
     * Train classifier
     */
    train(examples) {
        for (const example of examples) {
            const words = example.text.toLowerCase().match(/\b\w+\b/g) || [];
            const existing = this.model.get(example.label) || [];
            this.model.set(example.label, [...existing, ...words]);
        }
    }
    /**
     * Calculate classification score
     */
    calculateScore(text, label) {
        const words = new Set(text.toLowerCase().match(/\b\w+\b/g) || []);
        const labelWords = this.model.get(label) || [];
        if (labelWords.length === 0) {
            return Math.random() * 0.5;
        }
        const matches = labelWords.filter((w) => words.has(w)).length;
        return Math.min(matches / labelWords.length, 1.0);
    }
}
exports.TextClassifier = TextClassifier;
__exportStar(require("./spam-detection"), exports);
__exportStar(require("./toxicity"), exports);
