"use strict";
/**
 * Relationship extraction from text
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
exports.RelationshipExtractor = void 0;
class RelationshipExtractor {
    /**
     * Extract subject-verb-object triples
     */
    extractSVO(text) {
        const relationships = [];
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        sentences.forEach((sentence, idx) => {
            const triple = this.parseSVO(sentence);
            if (triple) {
                relationships.push({
                    ...triple,
                    sentenceIndex: idx,
                    start: 0,
                    end: sentence.length,
                });
            }
        });
        return relationships;
    }
    /**
     * Extract dependencies
     */
    extractDependencies(text) {
        // Simplified dependency parsing
        // In production, use a proper dependency parser
        return [];
    }
    /**
     * Extract semantic roles
     */
    extractSemanticRoles(sentence) {
        // Simplified semantic role labeling
        // In production, use a proper SRL model
        return [];
    }
    /**
     * Extract temporal relations
     */
    extractTemporalRelations(text) {
        // Simplified temporal relation extraction
        return [];
    }
    /**
     * Extract causal relations
     */
    extractCausalRelations(text) {
        const relations = [];
        // Look for causal markers
        const causalPattern = /(.+?)\s+(?:because|due to|caused by|leads to|results in)\s+(.+?)(?:\.|$)/gi;
        let match;
        while ((match = causalPattern.exec(text)) !== null) {
            relations.push({
                cause: match[1].trim(),
                effect: match[2].trim(),
                confidence: 0.8,
            });
        }
        return relations;
    }
    /**
     * Parse SVO triple from sentence
     */
    parseSVO(sentence) {
        // Very simplified SVO parsing
        const words = sentence.match(/\b\w+\b/g) || [];
        if (words.length < 3) {
            return null;
        }
        return {
            subject: words[0],
            predicate: words[1],
            object: words[2],
            confidence: 0.6,
        };
    }
}
exports.RelationshipExtractor = RelationshipExtractor;
__exportStar(require("./event-extraction"), exports);
__exportStar(require("./cooccurrence"), exports);
