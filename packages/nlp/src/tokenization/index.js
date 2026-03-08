"use strict";
/**
 * Tokenization and sentence segmentation
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
exports.tokenization = exports.Tokenizer = void 0;
class Tokenizer {
    options;
    constructor(options = {}) {
        this.options = options;
    }
    /**
     * Tokenize text into words
     */
    tokenize(text) {
        const tokens = [];
        // Word boundary tokenization with special handling
        const pattern = this.buildTokenPattern();
        const matches = text.matchAll(pattern);
        for (const match of matches) {
            if (match[0] && match.index !== undefined) {
                tokens.push({
                    text: match[0],
                    start: match.index,
                    end: match.index + match[0].length,
                });
            }
        }
        return tokens;
    }
    /**
     * Tokenize into sentences
     */
    sentenceTokenize(text) {
        const sentences = [];
        // Sentence boundary detection
        const sentencePattern = /[^.!?]+[.!?]+/g;
        const matches = text.matchAll(sentencePattern);
        for (const match of matches) {
            if (match[0] && match.index !== undefined) {
                const sentenceText = match[0].trim();
                const tokens = this.tokenize(sentenceText);
                sentences.push({
                    text: sentenceText,
                    start: match.index,
                    end: match.index + match[0].length,
                    tokens,
                });
            }
        }
        // Handle text without sentence terminators
        if (sentences.length === 0 && text.trim()) {
            const tokens = this.tokenize(text);
            sentences.push({
                text: text.trim(),
                start: 0,
                end: text.length,
                tokens,
            });
        }
        return sentences;
    }
    /**
     * Build tokenization pattern based on options
     */
    buildTokenPattern() {
        let pattern = '';
        if (this.options.preserveUrls) {
            pattern += '|https?://\\S+';
        }
        if (this.options.preserveEmails) {
            pattern += '|[\\w.-]+@[\\w.-]+\\.\\w+';
        }
        if (this.options.preserveMentions) {
            pattern += '|@\\w+';
        }
        if (this.options.preserveHashtags) {
            pattern += '|#\\w+';
        }
        // Default word tokenization
        pattern += '|\\w+';
        // Remove leading pipe
        pattern = pattern.substring(1);
        return new RegExp(pattern, 'gi');
    }
    /**
     * Tokenize and preserve positions
     */
    tokenizeWithPositions(text) {
        return this.tokenize(text).map((token) => ({
            token: token.text,
            start: token.start,
            end: token.end,
        }));
    }
}
exports.Tokenizer = Tokenizer;
/**
 * Quick tokenization utilities
 */
exports.tokenization = {
    /**
     * Simple word tokenization
     */
    words(text) {
        return text.match(/\w+/g) || [];
    },
    /**
     * Simple sentence tokenization
     */
    sentences(text) {
        return text.match(/[^.!?]+[.!?]+/g) || [text];
    },
    /**
     * N-gram generation
     */
    ngrams(tokens, n) {
        const ngrams = [];
        for (let i = 0; i <= tokens.length - n; i++) {
            ngrams.push(tokens.slice(i, i + n));
        }
        return ngrams;
    },
    /**
     * Character n-grams
     */
    charNgrams(text, n) {
        const ngrams = [];
        for (let i = 0; i <= text.length - n; i++) {
            ngrams.push(text.substring(i, i + n));
        }
        return ngrams;
    },
};
__exportStar(require("./advanced"), exports);
