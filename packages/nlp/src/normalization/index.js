"use strict";
/**
 * Text normalization utilities
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
exports.unicode = exports.caseFolding = exports.TextNormalizer = void 0;
class TextNormalizer {
    options;
    constructor(options = {}) {
        this.options = {
            unicodeNormalization: options.unicodeNormalization ?? 'NFKC',
            caseFolding: options.caseFolding ?? true,
            accentRemoval: options.accentRemoval ?? false,
            numberNormalization: options.numberNormalization ?? false,
            whitespaceNormalization: options.whitespaceNormalization ?? true,
        };
    }
    /**
     * Normalize text according to configured options
     */
    normalize(text) {
        let normalized = text;
        // Unicode normalization
        if (this.options.unicodeNormalization) {
            normalized = normalized.normalize(this.options.unicodeNormalization);
        }
        // Case folding
        if (this.options.caseFolding) {
            normalized = normalized.toLowerCase();
        }
        // Remove accents
        if (this.options.accentRemoval) {
            normalized = this.removeAccents(normalized);
        }
        // Normalize numbers
        if (this.options.numberNormalization) {
            normalized = this.normalizeNumbers(normalized);
        }
        // Normalize whitespace
        if (this.options.whitespaceNormalization) {
            normalized = this.normalizeWhitespace(normalized);
        }
        return normalized;
    }
    /**
     * Remove accent marks from characters
     */
    removeAccents(text) {
        return text
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }
    /**
     * Normalize numbers to standard format
     */
    normalizeNumbers(text) {
        return text.replace(/\d+/g, (match) => {
            const num = parseInt(match, 10);
            return isNaN(num) ? match : num.toString();
        });
    }
    /**
     * Normalize whitespace
     */
    normalizeWhitespace(text) {
        return text
            .replace(/\s+/g, ' ')
            .replace(/^\s+|\s+$/g, '');
    }
}
exports.TextNormalizer = TextNormalizer;
/**
 * Case folding utilities
 */
exports.caseFolding = {
    /**
     * Convert to lowercase
     */
    toLowerCase(text) {
        return text.toLowerCase();
    },
    /**
     * Convert to uppercase
     */
    toUpperCase(text) {
        return text.toUpperCase();
    },
    /**
     * Title case conversion
     */
    toTitleCase(text) {
        return text.replace(/\w\S*/g, (word) => {
            return word.charAt(0).toUpperCase() + word.substring(1).toLowerCase();
        });
    },
    /**
     * Sentence case conversion
     */
    toSentenceCase(text) {
        return text.charAt(0).toUpperCase() + text.substring(1).toLowerCase();
    },
};
/**
 * Unicode normalization forms
 */
exports.unicode = {
    /**
     * Canonical Decomposition
     */
    NFD(text) {
        return text.normalize('NFD');
    },
    /**
     * Canonical Composition
     */
    NFC(text) {
        return text.normalize('NFC');
    },
    /**
     * Compatibility Decomposition
     */
    NFKD(text) {
        return text.normalize('NFKD');
    },
    /**
     * Compatibility Composition
     */
    NFKC(text) {
        return text.normalize('NFKC');
    },
};
__exportStar(require("./advanced"), exports);
