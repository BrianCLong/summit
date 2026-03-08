"use strict";
/**
 * Text preprocessing pipeline
 * Handles text cleaning, normalization, and preparation for NLP tasks
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
exports.preprocessing = exports.TextPreprocessor = void 0;
class TextPreprocessor {
    options;
    constructor(options = {}) {
        this.options = {
            lowercase: options.lowercase ?? true,
            removeStopwords: options.removeStopwords ?? false,
            removePunctuation: options.removePunctuation ?? false,
            removeNumbers: options.removeNumbers ?? false,
            removeUrls: options.removeUrls ?? true,
            removeEmails: options.removeEmails ?? true,
            removeHtml: options.removeHtml ?? true,
            normalizeUnicode: options.normalizeUnicode ?? true,
            spellCheck: options.spellCheck ?? false,
            lemmatize: options.lemmatize ?? false,
            stem: options.stem ?? false,
            minTokenLength: options.minTokenLength ?? 2,
            maxTokenLength: options.maxTokenLength ?? 50,
            customStopwords: options.customStopwords ?? [],
            customPreprocessors: options.customPreprocessors ?? [],
        };
    }
    /**
     * Preprocess text according to configured options
     */
    preprocess(text) {
        let processed = text;
        // Apply custom preprocessors first
        for (const preprocessor of this.options.customPreprocessors) {
            processed = preprocessor(processed);
        }
        // Remove HTML tags
        if (this.options.removeHtml) {
            processed = this.removeHtml(processed);
        }
        // Remove URLs
        if (this.options.removeUrls) {
            processed = this.removeUrls(processed);
        }
        // Remove emails
        if (this.options.removeEmails) {
            processed = this.removeEmails(processed);
        }
        // Normalize unicode
        if (this.options.normalizeUnicode) {
            processed = this.normalizeUnicode(processed);
        }
        // Lowercase
        if (this.options.lowercase) {
            processed = processed.toLowerCase();
        }
        // Remove numbers
        if (this.options.removeNumbers) {
            processed = processed.replace(/\d+/g, '');
        }
        // Remove punctuation
        if (this.options.removePunctuation) {
            processed = processed.replace(/[^\w\s]|_/g, '');
        }
        // Normalize whitespace
        processed = processed.replace(/\s+/g, ' ').trim();
        return processed;
    }
    /**
     * Remove HTML tags and entities
     */
    removeHtml(text) {
        return text
            .replace(/<[^>]*>/g, '') // Remove tags
            .replace(/&nbsp;/g, ' ') // Replace nbsp
            .replace(/&[a-z]+;/gi, ''); // Remove entities
    }
    /**
     * Remove URLs
     */
    removeUrls(text) {
        return text.replace(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi, '');
    }
    /**
     * Remove email addresses
     */
    removeEmails(text) {
        return text.replace(/[\w.-]+@[\w.-]+\.\w+/gi, '');
    }
    /**
     * Normalize unicode characters
     */
    normalizeUnicode(text) {
        return text.normalize('NFKC');
    }
    /**
     * Clean and prepare text with noise removal
     */
    clean(text) {
        let cleaned = text;
        // Remove control characters
        cleaned = cleaned.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
        // Remove excessive whitespace
        cleaned = cleaned.replace(/\s+/g, ' ');
        // Remove leading/trailing whitespace
        cleaned = cleaned.trim();
        return cleaned;
    }
    /**
     * Create preprocessing pipeline for batch processing
     */
    pipeline() {
        return (text) => this.preprocess(text);
    }
}
exports.TextPreprocessor = TextPreprocessor;
/**
 * Quick preprocessing utilities
 */
exports.preprocessing = {
    /**
     * Remove stopwords from text
     */
    removeStopwords(text, language = 'en') {
        // This is a simplified implementation
        // In production, use a library like 'stopword'
        const stopwords = new Set([
            'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
            'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
            'to', 'was', 'will', 'with', 'this', 'but', 'they', 'have', 'had',
        ]);
        return text
            .split(/\s+/)
            .filter((word) => !stopwords.has(word.toLowerCase()))
            .join(' ');
    },
    /**
     * Remove punctuation
     */
    removePunctuation(text) {
        return text.replace(/[^\w\s]|_/g, '');
    },
    /**
     * Normalize whitespace
     */
    normalizeWhitespace(text) {
        return text.replace(/\s+/g, ' ').trim();
    },
};
__exportStar(require("./pipeline"), exports);
