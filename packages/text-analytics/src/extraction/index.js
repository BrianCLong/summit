"use strict";
/**
 * Information extraction
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
exports.InformationExtractor = void 0;
class InformationExtractor {
    /**
     * Extract keyphrases
     */
    extractKeyphrases(text, topK = 10) {
        const phrases = [];
        // Extract noun phrases (simplified)
        const nounPhrases = this.extractNounPhrases(text);
        // Calculate scores based on frequency and position
        const scored = nounPhrases.map((phrase, idx) => ({
            text: phrase.text,
            score: phrase.frequency * (1 - idx * 0.01),
            start: phrase.start,
            end: phrase.end,
            frequency: phrase.frequency,
        }));
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, topK);
    }
    /**
     * Extract quotes and attributions
     */
    extractQuotes(text) {
        const quotes = [];
        const quotePattern = /"([^"]+)"/g;
        let match;
        while ((match = quotePattern.exec(text)) !== null) {
            const speaker = this.findSpeaker(text, match.index);
            quotes.push({
                quote: match[1],
                speaker,
                position: {
                    start: match.index,
                    end: match.index + match[0].length,
                },
            });
        }
        return quotes;
    }
    /**
     * Extract citations
     */
    extractCitations(text) {
        const citations = [];
        // Extract common citation formats
        const patterns = [
            /\[(\d+)\]/g, // [1]
            /\(([^)]+,\s*\d{4})\)/g, // (Author, 2020)
        ];
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                citations.push({
                    citation: match[1],
                    type: 'inline',
                    position: {
                        start: match.index,
                        end: match.index + match[0].length,
                    },
                });
            }
        }
        return citations;
    }
    /**
     * Extract tables and lists
     */
    extractStructures(text) {
        return {
            tables: [],
            lists: [],
        };
    }
    /**
     * Extract noun phrases
     */
    extractNounPhrases(text) {
        const phrases = new Map();
        // Simplified noun phrase extraction
        const pattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const phrase = match[0];
            const existing = phrases.get(phrase);
            if (existing) {
                existing.count++;
            }
            else {
                phrases.set(phrase, {
                    start: match.index,
                    end: match.index + phrase.length,
                    count: 1,
                });
            }
        }
        return Array.from(phrases.entries()).map(([text, data]) => ({
            text,
            start: data.start,
            end: data.end,
            frequency: data.count,
        }));
    }
    /**
     * Find speaker for quote
     */
    findSpeaker(text, quotePosition) {
        // Look for name before quote
        const before = text.substring(Math.max(0, quotePosition - 50), quotePosition);
        const nameMatch = before.match(/([A-Z][a-z]+\s+[A-Z][a-z]+)\s+said$/);
        return nameMatch ? nameMatch[1] : undefined;
    }
}
exports.InformationExtractor = InformationExtractor;
__exportStar(require("./resume-parser"), exports);
__exportStar(require("./form-extraction"), exports);
